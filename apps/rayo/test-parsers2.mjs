import fs from 'fs';
import { parseRazaoBanco } from './src/lib/banco-razao/razao-banco-parser.js';
import { parseSaldoConta } from './src/lib/banco-razao/saldo-conta-parser.js';

const f1 = '/Users/ryanrichard/projecont/Rayo/temp/RAZAO - IA - BANCO BRADESCO CC_ 58070-8.txt.xlsx';
const f2 = '/Users/ryanrichard/projecont/Rayo/temp/RELATORIO DE CONCILIAÇÃO - BRADESCO EXCEL.xlsx';
const f3 = '/Users/ryanrichard/projecont/Rayo/temp/Extrato_Bradesco_Consolidado_580708.PDF';

async function test(file, name) {
    const b = new Uint8Array(fs.readFileSync(file)).buffer;
    console.log(`\n=== Testing ${name} ===`);
    try {
        const r1 = parseRazaoBanco(b);
        console.log('parseRazaoBanco ->', r1.layoutDetectado);
    } catch(e) { console.log('parseRazaoBanco error:', e.message); }
    
    try {
        const r2 = parseSaldoConta(b);
        console.log('parseSaldoConta ->', r2.layoutDetectado);
    } catch(e) { console.log('parseSaldoConta error:', e.message); }
}

async function run() {
    await test(f1, 'RAZAO');
    await test(f2, 'RELATORIO');
    await test(f3, 'EXTRATO_PDF');
}
run();
