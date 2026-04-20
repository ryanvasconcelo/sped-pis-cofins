import fs from 'fs';
const content = fs.readFileSync('apps/rayo/src/lib/extrato-financeiro/extrato-parser.js', 'utf8');
const match = content.match(/export function normalizarData[\s\S]*?\n}/);
console.log(match[0]);
