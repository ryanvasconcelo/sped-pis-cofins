import * as XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('../novo-modulo/planilhas/EAUDITORIA ENTRADA - Relatório Regras Fiscais - Consulta por Produto NCM - 20-02-2026.xlsx');
const workbook = XLSX.read(buf);
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

const headerRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, range: 0 });
console.log(headerRows.slice(0, 10).map(row => row.join(' | ')));
