const XLSX = require('xlsx');

const parseBRL = (v) => {
    if (v === undefined || v === null || v === '') return 0;
    if (typeof v === 'number') return isNaN(v) ? 0 : v;
    let s = String(v).replace(/[R$\s]/gi, '');
    if (/^\d{1,3}(\.\d{3})*(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
};

const wbIn = XLSX.readFile('/Users/ryanrichard/projecont/Rayo/validacoes-icms/input1.xlsx');
const wbOut = XLSX.readFile('/Users/ryanrichard/projecont/Rayo/validacoes-icms/novo-output-1.5.xlsx');
const dataIn = XLSX.utils.sheet_to_json(wbIn.Sheets[wbIn.SheetNames[0]]);
const dataOut = XLSX.utils.sheet_to_json(wbOut.Sheets[wbOut.SheetNames[0]]);

console.log('═══════════════════════════════════════════════');
console.log('  ANÁLISE COMPLETA — OUTPUT v1.5 vs INPUT 1');
console.log('═══════════════════════════════════════════════');
console.log(`Input:  ${dataIn.length} linhas | Output: ${dataOut.length} linhas`);

// ── 1. NaN / undefined / null ──
let nanCount = 0;
['ICMS Base item', '% ICMS NF', 'ICMS Valor item', 'Valor Total Item'].forEach(col => {
    dataOut.forEach((r, i) => {
        const v = String(r[col] || '');
        if (v === 'NaN' || v === 'undefined' || v === 'null') {
            nanCount++;
            if (nanCount <= 5) console.log(`  ⚠ NaN L${i + 2} "${col}": "${r[col]}"`);
        }
    });
});
console.log(`\n1. NaN/undefined/null: ${nanCount} ${nanCount === 0 ? '✅' : '❌'}`);

// ── 2. Texto em campos numéricos ──
let textErr = 0;
dataOut.forEach((r, i) => {
    ['ICMS Base item', '% ICMS NF', 'ICMS Valor item'].forEach(col => {
        const v = r[col];
        if (v !== undefined && v !== '' && typeof v === 'string' && !/^[\d.,\-\s]+$/.test(v)) {
            textErr++;
            if (textErr <= 3) console.log(`  ⚠ Texto L${i + 2} "${col}": "${v}"`);
        }
    });
});
console.log(`2. Texto em campos numéricos: ${textErr} ${textErr === 0 ? '✅' : '❌'}`);

// ── 3. CST Alterados ──
const cstAlterados = dataOut.filter(r => r['CST Antigo'] && r['CST ICMS'] !== r['CST Antigo'] && r['CST Antigo'] !== '');
console.log(`\n3. CSTs alterados: ${cstAlterados.length}`);
const alteracoes = {};
cstAlterados.forEach(r => {
    const key = `${r['CST Antigo']} → ${r['CST ICMS']}`;
    alteracoes[key] = (alteracoes[key] || 0) + 1;
});
Object.entries(alteracoes).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => {
    console.log(`   ${k}: ${v}x`);
});

// ── 4. Combustíveis (CFOP 1653) ──
const comb = dataOut.filter(r => String(r.CFOP) === '1653');
const combErr = comb.filter(r => parseBRL(r['ICMS Base item']) > 0 || parseBRL(r['ICMS Valor item']) > 0);
console.log(`\n4. Combustíveis CFOP 1653: ${comb.length} total, ${combErr.length} com Base/ICMS > 0 ${combErr.length === 0 ? '✅' : '❌'}`);

// ── 5. Operações Especiais ──
const cfopsEsp = ['1910', '1911', '1912', '1913', '1914', '1915', '1916', '1917', '1920', '1921', '1949',
    '2910', '2911', '2912', '2913', '2914', '2915', '2916', '2917', '2920', '2921', '2949',
    '5910', '5911', '5912', '5949'];
const opEsp = dataOut.filter(r => cfopsEsp.includes(String(r.CFOP)));
const opEspIcms = opEsp.filter(r => parseBRL(r['ICMS Valor item']) > 0);
const opEspBase = opEsp.filter(r => parseBRL(r['ICMS Base item']) > 0);
const opEspAliq = opEsp.filter(r => parseBRL(r['% ICMS NF']) > 0);
console.log(`\n5. Op. Especiais: ${opEsp.length} total`);
console.log(`   Com ICMS Valor > 0: ${opEspIcms.length} ${opEspIcms.length === 0 ? '✅' : '❌'}`);
console.log(`   Com Base > 0: ${opEspBase.length} ${opEspBase.length === 0 ? '✅' : '❌'}`);
console.log(`   Com Alíquota > 0: ${opEspAliq.length} ${opEspAliq.length === 0 ? '✅' : '❌'}`);
if (opEspIcms.length > 0) {
    opEspIcms.forEach(r => console.log(`   ❌ CFOP:${r.CFOP} NCM:${r['Classificação']} CST:${r['CST ICMS']} ICMS:${r['ICMS Valor item']} Base:${r['ICMS Base item']}`));
}
// CST das Op Especiais deve terminar em 90
const opEspCstErrado = opEsp.filter(r => !String(r['CST ICMS']).endsWith('90'));
console.log(`   CST não termina em 90: ${opEspCstErrado.length} ${opEspCstErrado.length === 0 ? '✅' : '❌'}`);
if (opEspCstErrado.length > 0) {
    opEspCstErrado.slice(0, 3).forEach(r => console.log(`   ❌ CFOP:${r.CFOP} CST:${r['CST ICMS']} Antigo:${r['CST Antigo']} NCM:${r['Classificação']}`));
}

// ── 6. Interestaduais (CFOP 2xxx) ──
const inter = dataOut.filter(r => String(r.CFOP).startsWith('2'));
console.log(`\n6. Interestaduais: ${inter.length}`);
const interByUf = {};
inter.forEach(r => {
    const uf = r['UF Forn/Cliente'] || 'N/D';
    if (!interByUf[uf]) interByUf[uf] = { total: 0, aliquotas: {} };
    interByUf[uf].total++;
    const aliq = String(r['% ICMS NF'] || '0');
    interByUf[uf].aliquotas[aliq] = (interByUf[uf].aliquotas[aliq] || 0) + 1;
});
Object.entries(interByUf).sort((a, b) => b[1].total - a[1].total).forEach(([uf, d]) => {
    const alqs = Object.entries(d.aliquotas).map(([a, c]) => `${a}%:${c}`).join(', ');
    console.log(`   ${uf}: ${d.total} linhas → ${alqs}`);
});

// ── 7. Comparação v1.4 vs v1.5 ──
console.log('\n═══════════════════════════════════════════════');
console.log('  VERIFICAÇÃO DOS 3 BUGS CORRIGIDOS');
console.log('═══════════════════════════════════════════════');
console.log(`Bug 1 (Op. Especiais ICMS zerado): ${opEspIcms.length === 0 ? '✅ CORRIGIDO' : '❌ PERSISTE'}`);

const combST = dataOut.filter(r => String(r['Classificação']).startsWith('2710'));
// Não dá pra checar o report pelo XLSX, mas podemos ver se combustíveis mantiveram CST 061
const combMantido = combST.filter(r => r['CST ICMS'] === '061' && r['CST Antigo'] === '061');
console.log(`Bug 2 (Combustíveis 061 não alertam ST): ${combMantido.length > 0 ? '✅ CST 061 mantido em ' + combMantido.length + ' linhas' : '⚠ Nenhum combustível 061 encontrado'}`);

console.log(`Bug 3 (Validação alíquota operante): verificar no PDF se há divergências de alíquota reportadas`);

console.log('\n═══════════════════════════════════════════════');
console.log('  ANÁLISE CONCLUÍDA');
console.log('═══════════════════════════════════════════════');
