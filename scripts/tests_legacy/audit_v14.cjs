const XLSX = require('xlsx');

// ── Helpers ──
const parseBRL = (v) => {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    let s = String(v).replace(/[R$\s]/gi, '');
    if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',') && !s.includes('.')) {
        s = s.replace(',', '.');
    }
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
};

// ── Carregar planilhas ──
const wbIn = XLSX.readFile('/Users/ryanrichard/projecont/Rayo/validacoes-icms/input1.xlsx');
const wbOut = XLSX.readFile('/Users/ryanrichard/projecont/Rayo/validacoes-icms/novo-output-1.4.xlsx');
const dataIn = XLSX.utils.sheet_to_json(wbIn.Sheets[wbIn.SheetNames[0]]);
const dataOut = XLSX.utils.sheet_to_json(wbOut.Sheets[wbOut.SheetNames[0]]);

console.log(`Input:  ${dataIn.length} linhas`);
console.log(`Output: ${dataOut.length} linhas`);

// ── 1. NaN Check ──
let nanCount = 0;
const colsToCheck = ['ICMS Base item', '% ICMS NF', 'ICMS Valor item', 'Valor Total Item'];
dataOut.forEach((r, i) => {
    colsToCheck.forEach(col => {
        const v = String(r[col] || '');
        if (v === 'NaN' || v === 'undefined' || v === 'null') {
            nanCount++;
            if (nanCount <= 5) console.log(`  NaN em linha ${i + 2}, col "${col}": "${r[col]}"`);
        }
    });
});
console.log(`\n✅ Células NaN/undefined/null: ${nanCount}`);

// ── 2. CST Alterados ──
const cstAlterados = dataOut.filter(r => r['CST Antigo'] && r['CST ICMS'] !== r['CST Antigo'] && r['CST Antigo'] !== '');
console.log(`\n📊 Linhas com CST alterado: ${cstAlterados.length}`);

// Agrupar por tipo de alteração
const alteracoes = {};
cstAlterados.forEach(r => {
    const key = `${r['CST Antigo']} → ${r['CST ICMS']}`;
    alteracoes[key] = (alteracoes[key] || 0) + 1;
});
console.log('\nTop alterações de CST:');
Object.entries(alteracoes).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}x`);
});

// ── 3. Combustíveis (CFOP 1653) ──
const combustiveis = dataOut.filter(r => r['CFOP'] === '1653' || String(r['CFOP']) === '1653');
console.log(`\n⛽ Combustíveis (CFOP 1653): ${combustiveis.length}`);
const combProblemas = combustiveis.filter(r => {
    const base = parseBRL(r['ICMS Base item']);
    const aliq = parseBRL(r['% ICMS NF']);
    const icms = parseBRL(r['ICMS Valor item']);
    // Combustíveis monofásicos devem ter base 0 e ICMS 0
    return base > 0 || icms > 0;
});
console.log(`  Com base/ICMS > 0 (potencial erro): ${combProblemas.length}`);
if (combProblemas.length > 0) {
    combProblemas.slice(0, 3).forEach(r => {
        console.log(`    NCM: ${r['Classificação']} | CST: ${r['CST ICMS']} | Base: ${r['ICMS Base item']} | ICMS: ${r['ICMS Valor item']}`);
    });
}

// ── 4. Operações Especiais (CFOP 5910, 5911, 5949, etc.) ──
const cfopsEspeciais = ['5910', '5911', '5912', '5913', '5914', '5915', '5916', '5917', '5920', '5921', '5949',
    '1910', '1911', '1912', '1913', '1914', '1915', '1916', '1917', '1920', '1921', '1949',
    '2910', '2911', '2912', '2913', '2914', '2915', '2916', '2917', '2920', '2921', '2949'];
const opEspeciais = dataOut.filter(r => cfopsEspeciais.includes(String(r['CFOP'])));
console.log(`\n🔧 Operações Especiais: ${opEspeciais.length}`);
const opEspeciaisComIcms = opEspeciais.filter(r => parseBRL(r['ICMS Valor item']) > 0);
console.log(`  Com ICMS > 0 (potencial erro): ${opEspeciaisComIcms.length}`);

// ── 5. Interestaduais (CFOP 2xxx) ──
const interestaduais = dataOut.filter(r => String(r['CFOP']).startsWith('2'));
console.log(`\n🚛 Operações Interestaduais: ${interestaduais.length}`);
const interAliq = {};
interestaduais.forEach(r => {
    const uf = r['UF Forn/Cliente'] || 'N/D';
    const aliq = r['% ICMS NF'] || '0';
    const key = `UF ${uf} → Alíq ${aliq}%`;
    interAliq[key] = (interAliq[key] || 0) + 1;
});
Object.entries(interAliq).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}x`);
});

// ── 6. Descrição e-Auditoria preenchida ──
const comDescEAud = dataOut.filter(r => r['Descrição e-Auditoria'] && String(r['Descrição e-Auditoria']).trim() !== '');
console.log(`\n📝 Linhas com Descrição e-Auditoria preenchida: ${comDescEAud.length} de ${dataOut.length}`);

// ── 7. Erros de texto em campos numéricos ──
let textInNumeric = 0;
dataOut.forEach((r, i) => {
    ['ICMS Base item', '% ICMS NF', 'ICMS Valor item'].forEach(col => {
        const v = r[col];
        if (v !== undefined && v !== '' && typeof v === 'string' && !/^[\d.,\-\s]+$/.test(v) && v !== 'NaN') {
            textInNumeric++;
            if (textInNumeric <= 3) console.log(`  Texto em campo numérico L${i + 2} "${col}": "${v}"`);
        }
    });
});
console.log(`\n⚠️ Texto inesperado em campos numéricos: ${textInNumeric}`);

console.log('\n════════════════════════════════════════');
console.log('Análise concluída.');
