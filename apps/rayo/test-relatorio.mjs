import fs from 'fs';
import { parseRazaoBanco } from './src/lib/banco-razao/razao-banco-parser.js';
import { parseSaldoConta } from './src/lib/banco-razao/saldo-conta-parser.js';

const f2 = '/Users/ryanrichard/projecont/Rayo/temp/RELATORIO DE CONCILIAÇÃO - BRADESCO EXCEL.xlsx';
const b2 = new Uint8Array(fs.readFileSync(f2)).buffer;

const r1 = parseRazaoBanco(b2);
const r2 = parseSaldoConta(b2);

console.log('RELATORIO parsed by parseRazaoBanco:');
console.log(r1.lancamentos.slice(0, 3));

console.log('\nRELATORIO parsed by parseSaldoConta:');
console.log(r2.lancamentos.slice(0, 3));
