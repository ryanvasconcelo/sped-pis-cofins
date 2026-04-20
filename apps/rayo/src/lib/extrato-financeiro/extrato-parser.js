import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * extrato-parser.js
 *
 * Parser do Extrato Bancário (Bradesco / Itaú / genérico).
 *
 * Layouts suportados:
 *
 * Layout EXTRATO_BANCARIO:
 *   Colunas: Data | Descrição/Histórico | Débito | Crédito | Saldo
 *   Detectado por: colunas "histórico", "lançamento", "saldo", "crédito", "débito"
 *
 * Retorna:
 *   { lancamentos, layoutDetectado, contaNome, banco }
 *   lancamento: { id, data, dataStr, descricao, debito, credito }
 */

export async function parseExtratoBancario(buffer, filename = '') {
    if (filename.toLowerCase().endsWith('.pdf')) {
        return parsePdfExtrato(buffer);
    }

    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    if (sheetData.length < 2) throw new Error('Extrato bancário vazio.');

    // ─── 1. Detectar banco na meta-info ───────────────────────────────────────
    let banco = 'GENERICO';
    let contaNome = '';
    for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
        const rowStr = sheetData[i].join(' ').toLowerCase();
        if (rowStr.includes('bradesco')) { banco = 'BRADESCO'; contaNome = sheetData[i].join(' ').trim(); }
        if (rowStr.includes('itaú') || rowStr.includes('itau'))  { banco = 'ITAU'; contaNome = sheetData[i].join(' ').trim(); }
    }

    // ─── 2. Detectar linha de header ──────────────────────────────────────────
    let headerRowIndex = -1;
    let colData = -1, colDesc = -1, colDeb = -1, colCre = -1;

    for (let i = 0; i < Math.min(sheetData.length, 25); i++) {
        const row = sheetData[i];
        const rowLower = row.map(c => String(c).toLowerCase().trim());

        // Tenta encontrar as colunas chave
        const iData  = rowLower.findIndex(c => c.includes('data') || c.includes('dt '));
        const iDesc  = rowLower.findIndex(c => c.includes('histór') || c.includes('descri') || c.includes('lançamento') || c.includes('lancamento') || c.includes('memo'));
        const iDeb   = rowLower.findIndex(c => (c.includes('débit') || c.includes('debit')) && !c.includes('saldo'));
        const iCre   = rowLower.findIndex(c => (c.includes('crédit') || c.includes('credit')) && !c.includes('saldo'));

        if (iData >= 0 && iDesc >= 0 && (iDeb >= 0 || iCre >= 0)) {
            headerRowIndex = i;
            colData = iData;
            colDesc = iDesc;
            colDeb  = iDeb  >= 0 ? iDeb  : -1;
            colCre  = iCre  >= 0 ? iCre  : -1;
            break;
        }
    }

    // Fallback: tenta heurística se não achou header explícito
    if (headerRowIndex === -1) {
        for (let i = 0; i < Math.min(sheetData.length, 30); i++) {
            const row = sheetData[i];
            if (row.length >= 3 && looksLikeDate(row[0])) {
                // Extrato simples: col0=data, col1=descricao, col2=valor ou deb, col3=cred
                headerRowIndex = i - 1 < 0 ? i : i;
                colData = 0; colDesc = 1;
                colDeb  = row.length >= 4 ? 2 : -1;
                colCre  = row.length >= 4 ? 3 : -1;
                if (colDeb === -1 && colCre === -1) {
                    // São apenas data, descricao, valor — determinar deb/cred pelo sinal
                    colDeb = 2; colCre = -1;
                }
                break;
            }
        }
    }

    if (headerRowIndex === -1) headerRowIndex = 0;

    const dataRows = sheetData.slice(headerRowIndex + 1);
    const lancamentos = [];

    dataRows.forEach((row, idx) => {
        if (!row || row.every(c => c === '' || c === null || c === undefined)) return;

        const rawData = String(colData >= 0 ? row[colData] ?? '' : '').trim();
        const descricao = String(colDesc >= 0 ? row[colDesc] ?? '' : '').trim();
        if (!rawData || !descricao) return;

        // Ignorar linha de saldo/total/resumo
        const descLower = descricao.toLowerCase();
        if (descLower.includes('saldo') && (descLower.includes('anterior') || descLower.includes('final') || descLower.includes('total'))) return;
        if (descLower === 'saldo') return;

        // Parse data
        const dataStr = normalizarData(rawData);
        if (!dataStr) return; // linha não tem data válida

        let debito = 0, credito = 0;

        if (colDeb >= 0 && colCre >= 0) {
            debito  = parseMoeda(row[colDeb]);
            credito = parseMoeda(row[colCre]);
        } else if (colDeb >= 0) {
            // Coluna única de valor — sinal determina deb/cred
            const v = parseMoedaComSinal(row[colDeb]);
            if (v < 0) debito  = Math.abs(v);
            else       credito = v;
        }

        if (debito === 0 && credito === 0) return;

        lancamentos.push({
            id: `ext-${idx}`,
            data: parseDataParaComparacao(dataStr),
            dataStr,
            descricao,
            debito,
            credito,
            banco,
        });
    });

    return { lancamentos, layoutDetectado: 'EXTRATO_BANCARIO', contaNome, banco };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function looksLikeDate(val) {
    if (!val) return false;
    const s = String(val).trim();
    return /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(s) || /^\d{5,}$/.test(s); // Excel serial
}

/**
 * Normaliza datas em vários formatos para dd/MM/yyyy.
 */
export function normalizarData(val) {
    if (!val && val !== 0) return null;

    // Excel serial date
    if (typeof val === 'number' && val > 1000) {
        try {
            const d = XLSX.SSF.parse_date_code(val);
            if (d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
        } catch (_) { /* fallback */ }
    }

    const s = String(val).trim();
    if (!s) return null;

    // dd/mm/yyyy ou dd-mm-yyyy
    const m1 = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (m1) {
        const [, d, mo, y] = m1;
        const year = y.length === 2 ? `20${y}` : y;
        return `${d.padStart(2,'0')}/${mo.padStart(2,'0')}/${year}`;
    }

    // yyyy-mm-dd (ISO)
    const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m2) {
        return `${m2[3]}/${m2[2]}/${m2[1]}`;
    }

    // Se for só um número Excel
    const num = Number(s);
    if (!isNaN(num) && num > 1000) {
        try {
            const d = XLSX.SSF.parse_date_code(num);
            if (d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
        } catch (_) { /* noop */ }
    }

    return null;
}

/**
 * Converte dataStr dd/mm/yyyy para chave comparável "yyyy-mm-dd"
 */
export function parseDataParaComparacao(dataStr) {
    if (!dataStr) return '';
    const parts = dataStr.split('/');
    if (parts.length !== 3) return dataStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function parseMoeda(valor) {
    if (typeof valor === 'number') return Math.abs(valor);
    if (!valor || valor === '') return 0;
    const str = String(valor).replace(/[R$\s]/g, '');
    if (str.includes(',')) {
        return Math.abs(parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0);
    }
    return Math.abs(parseFloat(str) || 0);
}

function parseMoedaComSinal(valor) {
    if (typeof valor === 'number') return valor;
    if (!valor || valor === '') return 0;
    const str = String(valor).replace(/[R$\s]/g, '');
    const neg = str.startsWith('-');
    const abs = str.replace(/^-/, '');
    let v;
    if (abs.includes(',')) {
        v = parseFloat(abs.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
        v = parseFloat(abs) || 0;
    }
    return neg ? -v : v;
}

// ─── PDF Parser ─────────────────────────────────────────────────────────────

async function parsePdfExtrato(buffer) {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDocument = await loadingTask.promise;
    
    const lancamentos = [];
    let currentDate = null;
    let accumulatedDesc = [];
    
    // Ler páginas (limitar até 500 páginas por segurança)
    for(let i = 1; i <= Math.min(500, pdfDocument.numPages); i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extrair texto com coordenadas Y (eixo vertical)
        const items = textContent.items.map(item => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5]
        })).filter(item => item.str.trim().length > 0);
        
        // Ordenar por linha (Y) e depois coluna (X)
        items.sort((a,b) => {
            if (Math.abs(a.y - b.y) > 5) return b.y - a.y; // Ordem descendente no eixo Y
            return a.x - b.x;
        });
        
        // Agrupar itens da mesma linha separando por pipe
        let lastY = null;
        let lineStr = '';
        const lines = [];
        for(let item of items) {
             if (lastY !== null && Math.abs(item.y - lastY) > 5) {
                 lines.push(lineStr);
                 lineStr = item.str;
             } else {
                 lineStr += (lineStr ? ' | ' : '') + item.str;
             }
             lastY = item.y;
        }
        if (lineStr) lines.push(lineStr);
        
        // Fazer parsing de cada linha
        for (const line of lines) {
            // Busca data no início da linha (ex: "09/03/2026")
            const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
                currentDate = dateMatch[1];
            }
            
            const parts = line.split('|').map(s => s.trim());
            // Procura partes que pareçam um valor financeiro (ex: -1.000,00 ou 50,00)
            const currencyParts = parts.filter(p => /^-?[\d.]+,[\d]{2}$/.test(p));
            
            if (currencyParts.length >= 2) {
                // Em extratos PDF as duas últimas colunas numéricas costumam ser Valor e Saldo
                const valorStr = currencyParts[currencyParts.length - 2];
                const valor = parseMoedaComSinal(valorStr);
                
                // A descrição é todo o resto que não for data, nem valor, nem ID/código de barras grande
                const descParts = parts.filter(p => !/^-?[\d.]+,[\d]{2}$/.test(p) && !/^\d{2}\/\d{2}\/\d{4}$/.test(p) && !/^\d{4,}$/.test(p));
                let desc = descParts.join(' ');
                
                // Junta com descrições das linhas anteriores (se houver)
                if (accumulatedDesc.length > 0) {
                    desc = accumulatedDesc.join(' ') + ' ' + desc;
                    accumulatedDesc = [];
                }
                
                let debito = 0, credito = 0;
                if (valor < 0) debito = Math.abs(valor);
                else credito = valor;
                
                if (debito > 0 || credito > 0) {
                    lancamentos.push({
                         id: `ext-pdf-${lancamentos.length}`,
                         data: parseDataParaComparacao(currentDate),
                         dataStr: currentDate,
                         descricao: desc.trim(),
                         debito,
                         credito,
                         banco: 'GENERICO' // PDF parser genérico
                    });
                }
            } else if (parts.length > 0 && !dateMatch && currencyParts.length === 0) {
                // Linha de texto sem valor — guarda para ser descrição do próximo lançamento (rateio de descrição)
                const possibleDesc = parts.join(' ');
                const lower = possibleDesc.toLowerCase();
                // Ignorar cabeçalhos/rodapés chatos
                if (!lower.includes('saldo') && !lower.includes('página') && !lower.includes('extrato') && !lower.includes('agência') && possibleDesc.length > 2) {
                     accumulatedDesc.push(possibleDesc);
                }
            }
        }
    }
    
    if (lancamentos.length === 0) throw new Error("Nenhum lançamento detectado no PDF. Verifique se o layout é suportado.");
    
    return { lancamentos, layoutDetectado: 'EXTRATO_BANCARIO', contaNome: 'Extrato em PDF', banco: 'GENERICO' };
}
