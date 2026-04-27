import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

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

async function run() {
    const filePath = './temp/Extrato_Bradesco_Consolidado_580708.PDF';
    const buffer = fs.readFileSync(filePath);
    
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdfDocument = await loadingTask.promise;
    
    const lancamentos = [];
    let currentDate = null;
    let accumulatedDesc = [];
    
    for(let i = 1; i <= Math.min(500, pdfDocument.numPages); i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        
        const items = textContent.items.map(item => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5]
        })).filter(item => item.str.trim().length > 0);
        
        items.sort((a,b) => {
            if (Math.abs(a.y - b.y) > 5) return b.y - a.y;
            return a.x - b.x;
        });
        
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
        
        for (const line of lines) {
            const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
            if (dateMatch) {
                currentDate = dateMatch[1];
            }
            
            const parts = line.split('|').map(s => s.trim());
            const currencyParts = parts.filter(p => /^-?[\d.]+,[\d]{2}$/.test(p));
            
            if (currencyParts.length >= 2) {
                // Em extratos PDF as duas últimas colunas numéricas costumam ser Valor e Saldo
                const valorStr = currencyParts[currencyParts.length - 2];
                const valor = parseMoedaComSinal(valorStr);
                
                const descParts = parts.filter(p => !/^-?[\d.]+,[\d]{2}$/.test(p) && !/^\d{2}\/\d{2}\/\d{4}$/.test(p) && !/^\d{4,}$/.test(p));
                let desc = descParts.join(' ');
                
                if (accumulatedDesc.length > 0) {
                    desc = accumulatedDesc.join(' ') + ' ' + desc;
                    accumulatedDesc = [];
                }
                
                let debito = 0, credito = 0;
                if (valor < 0) debito = Math.abs(valor);
                else credito = valor;
                
                if (debito > 0 || credito > 0) {
                    lancamentos.push({
                         dataStr: currentDate,
                         descricao: desc.trim(),
                         debito,
                         credito,
                         valorStrOriginal: valorStr // Adding debug info
                    });
                }
            } else if (parts.length > 0 && !dateMatch && currencyParts.length === 0) {
                const possibleDesc = parts.join(' ');
                const lower = possibleDesc.toLowerCase();
                if (!lower.includes('saldo') && !lower.includes('página') && !lower.includes('extrato') && !lower.includes('agência') && possibleDesc.length > 2) {
                     accumulatedDesc.push(possibleDesc);
                }
            }
        }
    }
    
    console.log(`Total items parsed: ${lancamentos.length}`);
    const items = lancamentos.filter(l => l.dataStr === '02/03/2026');
    let totalDeb = 0;
    let totalCred = 0;
    items.forEach(i => {
        totalDeb += i.debito;
        totalCred += i.credito;
        if (i.credito > 0) {
            console.log(JSON.stringify(i));
        }
    });
    console.log(`\nItems for 02/03/2026: count=${items.length}, totalDebito=${totalDeb}, totalCredito=${totalCred}`);
}

run();
