import fs from 'fs';
import { parseRazaoBanco } from './src/lib/banco-razao/razao-banco-parser.js';
import { parseSaldoConta } from './src/lib/banco-razao/saldo-conta-parser.js';

const f1 = '/Users/ryanrichard/projecont/Rayo/temp/RAZAO - IA - BANCO BRADESCO CC_ 58070-8.txt.xlsx';
const f2 = '/Users/ryanrichard/projecont/Rayo/temp/RELATORIO DE CONCILIAÇÃO - BRADESCO EXCEL.xlsx';

const b1 = new Uint8Array(fs.readFileSync(f1)).buffer;
const b2 = new Uint8Array(fs.readFileSync(f2)).buffer;

const r1 = parseRazaoBanco(b1);
const r2 = parseSaldoConta(b2);

console.log('RAZÃO Sample:');
r1.lancamentos.slice(0, 5).forEach(l => console.log(`Doc: ${l.doc}, Trans: ${l.transacao}, Valor: ${l.valor}, Data: ${l.dataPgtoStr}`));

console.log('\nSALDO Sample:');
r2.lancamentos.slice(0, 5).forEach(l => console.log(`nrOrigem: ${l.nrOrigem}, Trans: ${l.nrTransacao}, Valor: ${l.cdML}, Data: ${l.dataStr}`));
