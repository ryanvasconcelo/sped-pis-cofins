import * as XLSX from 'xlsx';

/**
 * saldo-conta-parser.js — Parser Universal Corrigido
 *
 * Índices validados diretamente contra os dados reais dos arquivos do cliente.
 *
 * Layout SAP (RAZAO - BANCO BRADESCO 58070 EXCEL.xlsx):
 *   0: #  | 1: Data de lançamento | 2: Nº transação | 3: Origem | 4: Nº origem
 *   5: Conta de contrapartida | 6: Detalhes | 7: C/D (ML) | 8: Saldo acumulado (MC)
 *   9: Débito (MC) | 10: Crédito (MC)
 *
 * Layout Simplificado (RELATORIO DE CONCILIAÇÃO EXCEL BRADESCO 58070.xlsx):
 *   Header na linha 1 (deslocado). Dados reais:
 *   0: Doc | 1: Nome | 2: Detalhes | 3: DataVcto | 4: DataPgto | 5: Debito | 6: Credito
 */

export function parseSaldoConta(buffer) {
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '' });

    if (sheetData.length < 2) throw new Error('Arquivo de Saldo vazio.');

    // 1. Detectar Layout
    let headerRowIndex = -1;
    let layoutType = null;

    for (let i = 0; i < Math.min(sheetData.length, 20); i++) {
        const rowStr = sheetData[i].join(' ').toLowerCase();
        if (rowStr.includes('nº origem') && rowStr.includes('nº transação')) {
            headerRowIndex = i;
            layoutType = 'SAP';
            break;
        }
        if (rowStr.includes('nome do fornecedor') || rowStr.includes('detalhes da linha') || rowStr.includes('data de pagamento') || rowStr.includes('data de vencimento')) {
            headerRowIndex = i;
            layoutType = 'SIMPLIFICADO';
            break;
        }
    }

    if (!layoutType) {
        throw new Error('Não foi possível identificar as colunas (Layout Desconhecido).');
    }
    if (headerRowIndex === -1) headerRowIndex = 0;

    const dataRows = sheetData.slice(headerRowIndex + 1);
    const lancamentos = [];
    let saldoInicial = 0;
    let contaNome = '';

    // Extrair nome da conta e saldo inicial
    for (let i = 0; i <= headerRowIndex; i++) {
        const row = sheetData[i] || [];
        const meaningful = row.filter(c => c !== '' && c !== null && c !== undefined);
        const combined = meaningful.join(' ');
        if (combined.includes('Saldo Inicial')) {
            const m = combined.match(/Saldo Inicial.*?(\d[\d.]*,\d{2})/i);
            if (m) saldoInicial = parseMoeda(m[1]);
        }
        if (meaningful.length >= 2) {
            const candidate = String(meaningful[0]) + ' ' + String(meaningful[1]);
            if ((candidate.includes('BANCO') || candidate.includes(':') || candidate.includes('.01.')) && !contaNome) {
                contaNome = candidate.trim();
            }
        }
    }

    // 2. Índices validados manualmente
    dataRows.forEach((row, idx) => {
        let nrOrigem, nrTransacao, detalhes, contaContrapartida, dataStr, debito, credito;

        if (layoutType === 'SAP') {
            nrOrigem = String(row[4] ?? '').trim();          // Nº origem
            nrTransacao = String(row[2] ?? '').trim();        // Nº transação
            detalhes = String(row[6] ?? '').trim();           // Detalhes
            contaContrapartida = String(row[5] ?? '').trim(); // Conta de contrapartida
            dataStr = normalizarData(row[1]) || '';            // Data de lançamento
            debito = parseMoeda(row[9]);                      // Débito (MC)
            credito = parseMoeda(row[10]);                    // Crédito (MC)

            // Fallback via C/D (ML) se coluna de débito/crédito estiver vazia
            if (debito === 0 && credito === 0) {
                const cdML = row[7];
                if (typeof cdML === 'number') {
                    if (cdML > 0) debito = Math.abs(cdML);
                    else credito = Math.abs(cdML);
                }
            }

            // Ignorar linha de saldo inicial (Origem = 'SI')
            if (String(row[3]).trim() === 'SI') return;

        } else {
            // SIMPLIFICADO: dados deslocados em relação ao header visual
            nrOrigem = String(row[0] ?? '').trim();           // Doc
            nrTransacao = null;
            detalhes = String(row[2] ?? '').trim();           // Detalhes da Linha
            contaContrapartida = '';
            dataStr = normalizarData(row[4]) || '';            // Data de Pagamento
            debito = parseMoeda(row[5]);                      // Débito
            credito = parseMoeda(row[6]);                     // Crédito
        }

        // Validar doc
        if (!nrOrigem) return;
        if (String(nrOrigem).toLowerCase().includes('doc')) return;

        if (debito === 0 && credito === 0) return;

        lancamentos.push({
            id: `saldo-${idx}`,
            nrOrigem,
            nrTransacao,
            detalhes,
            contaContrapartida,
            dataStr,
            debito,
            credito,
            cdML: debito > 0 ? debito : -credito,
            status: 'ATIVO',
            layout: layoutType
        });
    });

    return { contaNome, saldoInicial, lancamentos, layoutDetectado: layoutType };
}

function parseMoeda(valor) {
    if (typeof valor === 'number') return Math.abs(valor);
    if (!valor || valor === '') return 0;
    const str = String(valor).replace(/[R$\s]/g, '');
    if (str.includes(',')) {
        // Formato BR: 1.234,56
        return Math.abs(parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0);
    }
    // Formato EN: 1234.56
    return Math.abs(parseFloat(str) || 0);
}

function normalizarData(val) {
    if (!val && val !== 0) return null;
    if (typeof val === 'number' && val > 1000) {
        try {
            const d = XLSX.SSF.parse_date_code(val);
            if (d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
        } catch (_) {}
    }
    const s = String(val).trim();
    if (!s) return null;
    const m1 = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (m1) {
        const [, d, mo, y] = m1;
        const year = y.length === 2 ? `20${y}` : y;
        return `${d.padStart(2,'0')}/${mo.padStart(2,'0')}/${year}`;
    }
    const num = Number(s);
    if (!isNaN(num) && num > 1000) {
        try {
            const d = XLSX.SSF.parse_date_code(num);
            if (d) return `${String(d.d).padStart(2,'0')}/${String(d.m).padStart(2,'0')}/${d.y}`;
        } catch (_) {}
    }
    return s;
}
