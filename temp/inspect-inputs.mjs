import * as XLSX from 'xlsx';
import fs from 'fs';

function analyzeFile(filePath) {
    console.log(`\n--- Analisando: ${filePath} ---`);
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`Linhas totais: ${data.length}`);
    data.slice(0, 15).forEach((row, i) => console.log(`${i}: ${row.join(' | ')}`));
}

analyzeFile('./temp/RELATORIO EXCEL - IA.xlsx');
analyzeFile('./temp/RAZAO BRADESCO IA.xlsx');
