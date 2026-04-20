import fs from 'fs';
import * as XLSX from 'xlsx';
import { parseRazaoBanco } from './src/lib/banco-razao/razao-banco-parser.js';
import { parseSaldoConta } from './src/lib/banco-razao/saldo-conta-parser.js';

const files = [
    '/Users/ryanrichard/projecont/Rayo/temp/RAZAO - IA - BANCO BRADESCO CC_ 58070-8.txt.xlsx',
    '/Users/ryanrichard/projecont/Rayo/temp/RELATORIO DE CONCILIAÇÃO - BRADESCO EXCEL.xlsx'
];

files.forEach(f => {
    console.log(`\n--- Diagnostic: ${f} ---`);
    const buffer = fs.readFileSync(f);
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log("First 10 rows (raw):");
    data.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i}:`, row.map(c => String(c).substring(0, 20)).join(' | '));
    });

    try {
        const resA = parseRazaoBanco(buffer);
        console.log("parseRazaoBanco result:", resA.layoutDetectado, "Entries:", resA.lancamentos.length);
    } catch(e) { console.log("parseRazaoBanco error:", e.message); }

    try {
        const resB = parseSaldoConta(buffer);
        console.log("parseSaldoConta result:", resB.layoutDetectado, "Entries:", resB.lancamentos.length);
    } catch(e) { console.log("parseSaldoConta error:", e.message); }
});
