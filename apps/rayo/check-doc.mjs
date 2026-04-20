import fs from 'fs';
import * as XLSX from 'xlsx';

const f = '/Users/ryanrichard/projecont/Rayo/temp/RAZAO - IA - BANCO BRADESCO CC_ 58070-8.txt.xlsx';
const buffer = fs.readFileSync(f);
const wb = XLSX.read(buffer, { type: 'buffer' });
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

data.forEach((row, i) => {
    if (row.join('|').includes('17197')) {
        console.log(`Row ${i}:`, row);
    }
});
