import fs from 'fs';
import { parseRazaoBanco } from './src/lib/banco-razao/razao-banco-parser.js';
import { parseSaldoConta } from './src/lib/banco-razao/saldo-conta-parser.js';
import { applyNettingRazao, applyNettingSaldoConta } from './src/lib/banco-razao/netting-engine.js';
import { reconcileBanco } from './src/lib/banco-razao/banco-reconciler.js';

const f1 = '/Users/ryanrichard/projecont/Rayo/temp/RAZAO - IA - BANCO BRADESCO CC_ 58070-8.txt.xlsx';
const f2 = '/Users/ryanrichard/projecont/Rayo/temp/RELATORIO DE CONCILIAÇÃO - BRADESCO EXCEL.xlsx';

const b1 = new Uint8Array(fs.readFileSync(f1)).buffer;
const b2 = new Uint8Array(fs.readFileSync(f2)).buffer;

const parsedSap = parseRazaoBanco(b1);
const parsedSimp = parseSaldoConta(b2);

const normRazao = parsedSap.lancamentos;
const normSaldo = parsedSimp.lancamentos;

const nettingRazao = applyNettingRazao(normRazao);
const nettingSaldo = applyNettingSaldoConta(normSaldo);

const conciliacao = reconcileBanco(nettingRazao.ativos, nettingSaldo.ativos);

console.log('Resultados count:', conciliacao.resultados.length);
console.log('Conciliados:', conciliacao.contadores.conciliados);
console.log('Pendentes Razao:', conciliacao.contadores.pendentesRazao);
console.log('Pendentes Banco:', conciliacao.contadores.pendentesBanco);

// Show the first 2 PENDENTE_RAZAO
console.log('Primeiro Pendente Razao:', conciliacao.resultados.find(r => r.status === 'PENDENTE_RAZAO'));
