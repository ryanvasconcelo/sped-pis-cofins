import fs from 'fs';
import { parseRazaoBanco } from './src/lib/banco-razao/razao-banco-parser.js';
import { parseSaldoConta } from './src/lib/banco-razao/saldo-conta-parser.js';
import { applyNettingRazao, applyNettingSaldoConta } from './src/lib/banco-razao/netting-engine.js';
import { reconcileBanco } from './src/lib/banco-razao/banco-reconciler.js';

const f1 = '/Users/ryanrichard/projecont/Rayo/temp/RAZAO - IA - BANCO BRADESCO CC_ 58070-8.txt.xlsx';
const f2 = '/Users/ryanrichard/projecont/Rayo/temp/RELATORIO DE CONCILIAÇÃO - BRADESCO EXCEL.xlsx';

const b1 = fs.readFileSync(f1);
const b2 = fs.readFileSync(f2);

const parsedSap = parseRazaoBanco(b1);
const parsedSimp = parseSaldoConta(b2);

console.log(`Parsed SAP: ${parsedSap.lancamentos.length} entries`);
console.log(`Parsed SIMP: ${parsedSimp.lancamentos.length} entries`);

const nettingRazao = applyNettingRazao(parsedSap.lancamentos);
const nettingSaldo = applyNettingSaldoConta(parsedSimp.lancamentos);

console.log(`Ativos Razao: ${nettingRazao.ativos.length}`);
console.log(`Ativos Saldo: ${nettingSaldo.ativos.length}`);

const res = reconcileBanco(nettingRazao.ativos, nettingSaldo.ativos);

console.log(`Total Razao (A): ${res.totalRazao}`);
console.log(`Total Saldo (B): ${res.totalSaldo}`);
console.log(`Conciliados: ${res.contadores.conciliados}`);
console.log(`Pendentes Razao: ${res.contadores.pendentesRazao}`);
console.log(`Pendentes Banco: ${res.contadores.pendentesBanco}`);

if (res.totalRazao === 0) {
    console.log("BUG DETECTED: totalRazao is 0!");
    console.log("Sample Razao Entry:", nettingRazao.ativos[0]);
}
