import fs from 'fs';
import { parseExtratoBancario } from '../apps/rayo/src/lib/extrato-financeiro/extrato-parser.js';

async function run() {
    const filePath = './temp/Extrato_Bradesco_Consolidado_580708.PDF';
    const buffer = fs.readFileSync(filePath);
    try {
        const result = await parseExtratoBancario(buffer, 'Extrato.pdf');
        
        console.log(`Total de lançamentos: ${result.lancamentos.length}`);
        
        // Print first 5 items to see what was parsed
        console.log('\n--- Primeiros 10 lançamentos ---');
        console.log(result.lancamentos.slice(0, 10));
        
        // Let's filter items from 02/03/2026
        const items = result.lancamentos.filter(l => l.dataStr === '02/03/2026');
        console.log(`\n--- Lançamentos de 02/03/2026 (${items.length}) ---`);
        items.forEach(i => console.log(JSON.stringify(i)));

    } catch (e) {
        console.error("Erro", e);
    }
}

run();
