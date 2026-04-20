import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const url = '/Users/ryanrichard/projecont/Rayo/temp/Extrato_Bradesco_Consolidado_580708.PDF';

function parseMoedaComSinal(valor) {
    if (!valor || valor === '') return 0;
    const str = String(valor).replace(/[R$\s]/g, '');
    const neg = str.startsWith('-');
    const abs = str.replace(/^-/, '');
    let v = parseFloat(abs.replace(/\./g, '').replace(',', '.')) || 0;
    return neg ? -v : v;
}

async function testPdf() {
  const data = new Uint8Array(fs.readFileSync(url));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  
  const lancamentos = [];
  let currentDate = null;
  let accumulatedDesc = [];
  
  for(let i=1; i<=Math.min(3, pdfDocument.numPages); i++) {
     const page = await pdfDocument.getPage(i);
     const textContent = await page.getTextContent();
     
     const items = textContent.items.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5]
     })).filter(i => i.str.trim().length > 0);
     
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
     if(lineStr) lines.push(lineStr);
     
     for (const line of lines) {
         const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})/);
         if (dateMatch) {
             currentDate = dateMatch[1];
         }
         
         const parts = line.split('|').map(s => s.trim());
         const currencyParts = parts.filter(p => /^-?[\d.]+,[\d]{2}$/.test(p));
         
         if (currencyParts.length >= 2) {
             const valorStr = currencyParts[currencyParts.length - 2];
             const saldoStr = currencyParts[currencyParts.length - 1]; // We don't need it, but it proves it's a value row
             
             const valor = parseMoedaComSinal(valorStr);
             
             const descParts = parts.filter(p => !/^-?[\d.]+,[\d]{2}$/.test(p) && !/^\d{2}\/\d{2}\/\d{4}$/.test(p) && !/^\d{4,}$/.test(p));
             let desc = descParts.join(' ');
             
             if (accumulatedDesc.length > 0) {
                 desc = accumulatedDesc.join(' ') + ' ' + desc;
                 accumulatedDesc = [];
             }
             
             if (valor !== 0) {
                 lancamentos.push({
                      data: currentDate,
                      descricao: desc.trim(),
                      debito: valor < 0 ? Math.abs(valor) : 0,
                      credito: valor > 0 ? valor : 0
                 });
             }
         } else if (parts.length > 0 && !dateMatch && currencyParts.length === 0) {
             const possibleDesc = parts.join(' ');
             if (!possibleDesc.toLowerCase().includes('saldo') && !possibleDesc.toLowerCase().includes('página') && possibleDesc.length > 2) {
                  accumulatedDesc.push(possibleDesc);
             }
         }
     }
  }
  
  console.log(lancamentos.slice(0, 15));
}

testPdf().catch(console.error);
