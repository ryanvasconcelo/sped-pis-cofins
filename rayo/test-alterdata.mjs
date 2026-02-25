import * as XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('../novo-modulo/planilhas/ALTERDATA ENTRADAS.xlsx');
const workbook = XLSX.read(buf);
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

const headerRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, range: 0 });
console.log("ALTERDATA HEADERS:");
console.log(headerRows[0]);
