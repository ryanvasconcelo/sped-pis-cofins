import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const url = '/Users/ryanrichard/projecont/Rayo/temp/Extrato_Bradesco_Consolidado_580708.PDF';

async function testPdf() {
  const data = new Uint8Array(fs.readFileSync(url));
  const loadingTask = pdfjsLib.getDocument({ data, standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/' });
  const pdfDocument = await loadingTask.promise;
  console.log('Pages:', pdfDocument.numPages);
  
  for(let i=1; i<=Math.min(3, pdfDocument.numPages); i++) {
     const page = await pdfDocument.getPage(i);
     const textContent = await page.getTextContent();
     
     // Sorting by Y first, then X to get lines
     const items = textContent.items.map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5]
     })).filter(i => i.str.trim().length > 0);
     
     items.sort((a,b) => {
        if (Math.abs(a.y - b.y) > 5) return b.y - a.y;
        return a.x - b.x;
     });
     
     console.log(`\n--- PAGE ${i} ---`);
     let lastY = null;
     let line = '';
     for(let item of items) {
         if (lastY !== null && Math.abs(item.y - lastY) > 5) {
             console.log(line);
             line = item.str;
         } else {
             line += (line ? ' | ' : '') + item.str;
         }
         lastY = item.y;
     }
     console.log(line);
  }
}

testPdf().catch(console.error);
