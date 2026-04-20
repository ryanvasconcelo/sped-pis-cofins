import fs from 'fs';
import { parseRazaoBanco } from './src/lib/banco-razao/razao-banco-parser.js';

const f1 = '/Users/ryanrichard/projecont/Rayo/temp/RAZAO - IA - BANCO BRADESCO CC_ 58070-8.txt.xlsx';
const b = new Uint8Array(fs.readFileSync(f1)).buffer;

const r = parseRazaoBanco(b);
let total = 0;
r.lancamentos.forEach(l => total += Math.abs(l.valor));
console.log('Total Razao:', total);
