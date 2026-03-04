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
const wbOut = XLSX.readFile('/Users/ryanrichard/projecont/Rayo/validacoes-icms/novo-output-1.6.xlsx');
const dataIn = XLSX.utils.sheet_to_json(wbIn.Sheets[wbIn.SheetNames[0]]);
const dataOut = XLSX.utils.sheet_to_json(wbOut.Sheets[wbOut.SheetNames[0]]);

console.log('='.repeat(60));
console.log(' AUDITORIA CRUZADA v1.6 × REQUISITOS DO PROJETO');
console.log('='.repeat(60));
console.log(`Linhas Input: ${dataIn.length} | Output: ${dataOut.length}`);

// ══════════════════════════════════════════════════════════
// REQUISITO 1: NaN/Texto eliminados
// ══════════════════════════════════════════════════════════
let nanCount = 0, textErr = 0;
const numCols = ['ICMS Base item', '% ICMS NF', 'ICMS Valor item', 'Valor Total Item'];
dataOut.forEach((r, i) => {
    numCols.forEach(col => {
        const v = String(r[col] || '');
        if (v === 'NaN' || v === 'undefined' || v === 'null') nanCount++;
        if (r[col] !== undefined && r[col] !== '' && typeof r[col] === 'string' && !/^[\d.,\-\s]*$/.test(r[col])) textErr++;
    });
});
console.log(`\n[REQ] NaN/undefined: ${nanCount} ${nanCount === 0 ? '✅' : '❌'}`);
console.log(`[REQ] Texto em campos numéricos: ${textErr} ${textErr === 0 ? '✅' : '❌'}`);

// ══════════════════════════════════════════════════════════
// REQUISITO 2: Coluna CST Antigo presente
// ══════════════════════════════════════════════════════════
const temCstAntigo = dataOut[0] && 'CST Antigo' in dataOut[0];
console.log(`\n[REQ] Coluna "CST Antigo" presente: ${temCstAntigo ? '✅' : '❌'}`);

// ══════════════════════════════════════════════════════════
// REQUISITO 3: Coluna Descrição e-Auditoria presente
// ══════════════════════════════════════════════════════════
const temDescEAud = dataOut[0] && ('Descrição e-Auditoria' in dataOut[0] || 'Desc_eAuditoria' in dataOut[0]);
console.log(`[REQ] Coluna "Descrição e-Auditoria" presente: ${temDescEAud ? '✅' : '❌'}`);

// ══════════════════════════════════════════════════════════
// REQUISITO 4: Op. Especiais → CST X90 + zerado
// Reunião: "CST 90, zerar base, alíquota e ICMS"
// Exceções 1152 e 1409 NÃO são Op. Especiais
// ══════════════════════════════════════════════════════════
const cfopsEsp = ['1910', '1911', '1912', '1913', '1914', '1915', '1916', '1917', '1920', '1921', '1949',
    '2910', '2911', '2912', '2913', '2914', '2915', '2916', '2917', '2920', '2921', '2949'];
const opEsp = dataOut.filter(r => cfopsEsp.includes(String(r.CFOP)));
const opEspIcms = opEsp.filter(r => parseBRL(r['ICMS Valor item']) > 0);
const opEspBase = opEsp.filter(r => parseBRL(r['ICMS Base item']) > 0);
const opEspNao90 = opEsp.filter(r => !String(r['CST ICMS']).endsWith('90'));
console.log(`\n[REQ] Op. Especiais total: ${opEsp.length}`);
console.log(`  ICMS zerado: ${opEspIcms.length === 0 ? '✅' : '❌ ' + opEspIcms.length + ' com ICMS > 0'}`);
console.log(`  Base zerada: ${opEspBase.length === 0 ? '✅' : '❌ ' + opEspBase.length + ' com Base > 0'}`);
console.log(`  CST X90: ${opEspNao90.length === 0 ? '✅' : '⚠️ ' + opEspNao90.length + ' não terminam em 90'}`);
if (opEspNao90.length > 0) {
    const byCfop = {};
    opEspNao90.forEach(r => { byCfop[r.CFOP] = (byCfop[r.CFOP] || 0) + 1; });
    Object.entries(byCfop).forEach(([k, v]) => console.log(`    CFOP ${k}: ${v}x`));
}

// Exceções 1152 e 1409 NÃO foram alteradas pra X90?
const exc1152 = dataOut.filter(r => String(r.CFOP) === '1152');
const exc1409 = dataOut.filter(r => String(r.CFOP) === '1409');
const exc1152_90 = exc1152.filter(r => String(r['CST ICMS']).endsWith('90'));
const exc1409_90 = exc1409.filter(r => String(r['CST ICMS']).endsWith('90'));
console.log(`  [Exceção] CFOP 1152: ${exc1152.length} linhas, ${exc1152_90.length} viraram X90 ${exc1152_90.length === 0 ? '✅ Preservados' : '❌'}`);
console.log(`  [Exceção] CFOP 1409: ${exc1409.length} linhas, ${exc1409_90.length} viraram X90 ${exc1409_90.length === 0 ? '✅ Preservados' : '❌'}`);

// ══════════════════════════════════════════════════════════
// REQUISITO 5: Alíquotas interestaduais
// AM→AM: 20% | N/NE/CO→AM: 12% | S/SE→AM: 7% | Import: 4%
// ══════════════════════════════════════════════════════════
console.log('\n[REQ] Alíquotas Interestaduais:');
const norte_ne_co = ['AC', 'AL', 'AP', 'BA', 'CE', 'DF', 'GO', 'MA', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'RN', 'RO', 'RR', 'SE', 'TO'];
const sul_sudeste = ['ES', 'MG', 'PR', 'RS', 'SC', 'SP', 'RJ'];

// Internos AM→AM (CFOP 1xxx exceto Op. Especiais)
const internos = dataOut.filter(r => {
    const cfop = String(r.CFOP);
    return cfop.startsWith('1') && !cfopsEsp.includes(cfop) && !['1152', '1409'].includes(cfop);
});
const internosTrib = internos.filter(r => {
    const raiz = String(r['CST ICMS']).padStart(3, '0').slice(-2);
    return ['00', '20'].includes(raiz);
});
const internos20 = internosTrib.filter(r => parseBRL(r['% ICMS NF']) === 20);
console.log(`  AM→AM (1xxx tributáveis): ${internosTrib.length} | Com 20%: ${internos20.length} ${internos20.length === internosTrib.length ? '✅' : '⚠️ ' + (internosTrib.length - internos20.length) + ' não são 20%'}`);

// CFOP 1152, 1409 — alíquota deve ser 20%
const cfop1152Trib = exc1152.filter(r => {
    const raiz = String(r['CST ICMS']).padStart(3, '0').slice(-2);
    return ['00', '20'].includes(raiz);
});
const cfop1152_20 = cfop1152Trib.filter(r => parseBRL(r['% ICMS NF']) === 20);
console.log(`  CFOP 1152 tributáveis: ${cfop1152Trib.length} | Com 20%: ${cfop1152_20.length} ${cfop1152_20.length === cfop1152Trib.length ? '✅' : '⚠️'}`);

// Interestaduais
const inter = dataOut.filter(r => String(r.CFOP).startsWith('2'));
const interTrib = inter.filter(r => {
    const raiz = String(r['CST ICMS']).padStart(3, '0').slice(-2);
    return ['00', '20'].includes(raiz);
});
console.log(`  Interestaduais tributáveis: ${interTrib.length}`);
const interByUf = {};
interTrib.forEach(r => {
    const uf = r['UF Forn/Cliente'] || 'N/D';
    const aliq = parseBRL(r['% ICMS NF']);
    const key = `${uf}→${aliq}%`;
    interByUf[key] = (interByUf[key] || 0) + 1;
});
Object.entries(interByUf).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`    ${k}: ${v}x`));

// Importações (CFOP 3xxx)
const imports = dataOut.filter(r => String(r.CFOP).startsWith('3'));
console.log(`  Importações (3xxx): ${imports.length}`);

// ══════════════════════════════════════════════════════════
// REQUISITO 6: ST conforme D.6108/22
// ══════════════════════════════════════════════════════════
const stAlterados = dataOut.filter(r => {
    const raizNova = String(r['CST ICMS']).padStart(3, '0').slice(-2);
    const raizAntiga = String(r['CST Antigo'] || '').padStart(3, '0').slice(-2);
    return raizNova === '60' && raizAntiga !== '60' && raizAntiga !== '61';
});
console.log(`\n[REQ] D.6108/22 ST aplicado: ${stAlterados.length} linhas convertidas para ST`);

// ══════════════════════════════════════════════════════════
// REQUISITO 7: Combustíveis monofásicos
// ══════════════════════════════════════════════════════════
const comb = dataOut.filter(r => String(r.CFOP) === '1653');
const combOk = comb.filter(r => parseBRL(r['ICMS Base item']) === 0 && parseBRL(r['ICMS Valor item']) === 0);
console.log(`\n[REQ] Combustíveis (1653): ${comb.length} total | Base=0 + ICMS=0: ${combOk.length} ${combOk.length === comb.length ? '✅' : '❌'}`);

// ══════════════════════════════════════════════════════════
// REQUISITO 8: Valor ICMS = Base × Alíquota (para tributáveis)
// ══════════════════════════════════════════════════════════
let formulaErros = 0;
const tributaveis = dataOut.filter(r => {
    const raiz = String(r['CST ICMS']).padStart(3, '0').slice(-2);
    return ['00', '20'].includes(raiz) && parseBRL(r['ICMS Base item']) > 0;
});
tributaveis.forEach(r => {
    const base = parseBRL(r['ICMS Base item']);
    const aliq = parseBRL(r['% ICMS NF']) / 100;
    const icms = parseBRL(r['ICMS Valor item']);
    const esperado = base * aliq;
    if (Math.abs(esperado - icms) > 1) { // tolerância R$1
        formulaErros++;
    }
});
console.log(`\n[REQ] Fórmula ICMS = Base × Alíq (tributáveis): ${tributaveis.length} verificados | Erros > R$1: ${formulaErros} ${formulaErros === 0 ? '✅' : '⚠️'}`);

// ══════════════════════════════════════════════════════════
// RESUMO
// ══════════════════════════════════════════════════════════
console.log('\n' + '='.repeat(60));
console.log(' RESUMO FINAL');
console.log('='.repeat(60));
const cstAlterados2 = dataOut.filter(r => r['CST Antigo'] && r['CST ICMS'] !== r['CST Antigo'] && r['CST Antigo'] !== '');
console.log(`CSTs alterados: ${cstAlterados2.length}`);
console.log(`CSTs mantidos: ${dataOut.length - cstAlterados2.length}`);

const alteracoes = {};
cstAlterados2.forEach(r => {
    const key = `${r['CST Antigo']} → ${r['CST ICMS']}`;
    alteracoes[key] = (alteracoes[key] || 0) + 1;
});
console.log('\nTop alterações:');
Object.entries(alteracoes).sort((a, b) => b[1] - a[1]).slice(0, 10).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}x`);
});
