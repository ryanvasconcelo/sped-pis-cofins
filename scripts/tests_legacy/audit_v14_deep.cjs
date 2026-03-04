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

const wb = XLSX.readFile('/Users/ryanrichard/projecont/Rayo/validacoes-icms/novo-output-1.4.xlsx');
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

// ── 1. Operações Especiais com ICMS > 0 ──
const cfopsEspeciais = ['5910', '5911', '5912', '5913', '5914', '5915', '5916', '5917', '5920', '5921', '5949',
    '1910', '1911', '1912', '1913', '1914', '1915', '1916', '1917', '1920', '1921', '1949',
    '2910', '2911', '2912', '2913', '2914', '2915', '2916', '2917', '2920', '2921', '2949'];
const opEspComIcms = data.filter(r => cfopsEspeciais.includes(String(r['CFOP'])) && parseBRL(r['ICMS Valor item']) > 0);
console.log('=== OPERAÇÕES ESPECIAIS COM ICMS > 0 ===');
opEspComIcms.forEach(r => {
    console.log(`  CFOP: ${r.CFOP} | NCM: ${r['Classificação']} | CST: ${r['CST ICMS']} (Antigo: ${r['CST Antigo']}) | Produto: ${r['Nome Produto']?.slice(0, 50)} | ICMS: ${r['ICMS Valor item']} | Base: ${r['ICMS Base item']}`);
});

// ── 2. CST 040→060 (Isento para ST — muito suspeito) ──
console.log('\n=== CST 040 → 060 (35 ocorrências — Isento virando ST) ===');
const isento_para_st = data.filter(r => r['CST Antigo'] === '040' && r['CST ICMS'] === '060');
isento_para_st.slice(0, 5).forEach(r => {
    console.log(`  NCM: ${r['Classificação']} | CFOP: ${r.CFOP} | Produto: ${r['Nome Produto']?.slice(0, 50)} | Base: ${r['ICMS Base item']} | ICMS: ${r['ICMS Valor item']}`);
});

// ── 3. CST 060→000 (ST para Normal — contra a Lei?) ──
console.log('\n=== CST 060 → 000 (12 ocorrências — ST virando Normal) ===');
const st_para_normal = data.filter(r => r['CST Antigo'] === '060' && r['CST ICMS'] === '000');
st_para_normal.slice(0, 5).forEach(r => {
    console.log(`  NCM: ${r['Classificação']} | CFOP: ${r.CFOP} | Produto: ${r['Nome Produto']?.slice(0, 50)} | Base: ${r['ICMS Base item']} | ICMS: ${r['ICMS Valor item']}`);
});

// ── 4. CST 061→090 (Monofásico para Outras — estranho) ──
console.log('\n=== CST 061 → 090 (4 ocorrências — Monofásico virando Outras) ===');
const mono_para_outras = data.filter(r => r['CST Antigo'] === '061' && r['CST ICMS'] === '090');
mono_para_outras.forEach(r => {
    console.log(`  NCM: ${r['Classificação']} | CFOP: ${r.CFOP} | Produto: ${r['Nome Produto']?.slice(0, 50)} | Base: ${r['ICMS Base item']} | ICMS: ${r['ICMS Valor item']}`);
});

// ── 5. CST 260→200 (dígito origem mudando? Por quê?) ──
console.log('\n=== CST 260 → 200 (13 ocorrências) ===');
const _260_200 = data.filter(r => r['CST Antigo'] === '260' && r['CST ICMS'] === '200');
_260_200.slice(0, 5).forEach(r => {
    console.log(`  NCM: ${r['Classificação']} | CFOP: ${r.CFOP} | Produto: ${r['Nome Produto']?.slice(0, 50)} | UF: ${r['UF Forn/Cliente']}`);
});

// ── 6. Interestaduais SC com 0% (deveria ser 7%) ──
console.log('\n=== SC com alíquota 0% (125 ocorrências) ===');
const scZero = data.filter(r => r['UF Forn/Cliente'] === 'SC' && String(r.CFOP).startsWith('2') && parseBRL(r['% ICMS NF']) === 0);
scZero.slice(0, 5).forEach(r => {
    console.log(`  NCM: ${r['Classificação']} | CFOP: ${r.CFOP} | CST: ${r['CST ICMS']} | Produto: ${r['Nome Produto']?.slice(0, 50)} | Base: ${r['ICMS Base item']}`);
});

// ── 7. SP com 0% (78 ocorrências) ──
console.log('\n=== SP com alíquota 0% (78 ocorrências) ===');
const spZero = data.filter(r => r['UF Forn/Cliente'] === 'SP' && String(r.CFOP).startsWith('2') && parseBRL(r['% ICMS NF']) === 0);
spZero.slice(0, 5).forEach(r => {
    console.log(`  NCM: ${r['Classificação']} | CFOP: ${r.CFOP} | CST: ${r['CST ICMS']} | Produto: ${r['Nome Produto']?.slice(0, 50)} | Base: ${r['ICMS Base item']}`);
});

// ── 8. PR com 0% (52 ocorrências) ──
console.log('\n=== PR com alíquota 0% (52 ocorrências) ===');
const prZero = data.filter(r => r['UF Forn/Cliente'] === 'PR' && String(r.CFOP).startsWith('2') && parseBRL(r['% ICMS NF']) === 0);
prZero.slice(0, 5).forEach(r => {
    console.log(`  NCM: ${r['Classificação']} | CFOP: ${r.CFOP} | CST: ${r['CST ICMS']} | Produto: ${r['Nome Produto']?.slice(0, 50)} | Base: ${r['ICMS Base item']}`);
});
