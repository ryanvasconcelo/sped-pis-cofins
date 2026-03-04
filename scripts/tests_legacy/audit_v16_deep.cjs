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

const wb = XLSX.readFile('/Users/ryanrichard/projecont/Rayo/validacoes-icms/novo-output-1.6.xlsx');
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const cfopsEsp = ['1910', '1911', '1912', '1913', '1914', '1915', '1916', '1917', '1920', '1921', '1949',
    '2910', '2911', '2949'];

// ── 1. AM→AM tributáveis com alíquota != 20% ──
console.log('=== AM→AM TRIBUTÁVEIS COM ALÍQUOTA != 20% ===');
const internos = data.filter(r => {
    const cfop = String(r.CFOP);
    return cfop.startsWith('1') && !cfopsEsp.includes(cfop) && !['1152', '1409'].includes(cfop);
});
const internosTrib = internos.filter(r => {
    const raiz = String(r['CST ICMS']).padStart(3, '0').slice(-2);
    return ['00', '20'].includes(raiz);
});
const nao20 = internosTrib.filter(r => parseBRL(r['% ICMS NF']) !== 20);
console.log(`Total internos tributáveis: ${internosTrib.length} | Diferente de 20%: ${nao20.length}`);
const byAliq = {};
nao20.forEach(r => {
    const aliq = r['% ICMS NF'] || '0';
    byAliq[aliq] = (byAliq[aliq] || 0) + 1;
});
Object.entries(byAliq).forEach(([k, v]) => console.log(`  Alíq ${k}: ${v}x`));
nao20.slice(0, 5).forEach(r => {
    console.log(`  CFOP:${r.CFOP} NCM:${r['Classificação']} CST:${r['CST ICMS']} Alíq:${r['% ICMS NF']} Base:${r['ICMS Base item']} ICMS:${r['ICMS Valor item']} Produto:${String(r['Nome Produto'] || '').slice(0, 40)}`);
});

// ── 2. Erros na fórmula ICMS = Base × Alíquota ──
console.log('\n=== ERROS FÓRMULA ICMS = Base × Alíquota (> R$1) ===');
const tributaveis = data.filter(r => {
    const raiz = String(r['CST ICMS']).padStart(3, '0').slice(-2);
    return ['00', '20'].includes(raiz) && parseBRL(r['ICMS Base item']) > 0;
});
const erros = [];
tributaveis.forEach(r => {
    const base = parseBRL(r['ICMS Base item']);
    const aliq = parseBRL(r['% ICMS NF']) / 100;
    const icms = parseBRL(r['ICMS Valor item']);
    const esperado = base * aliq;
    const diff = Math.abs(esperado - icms);
    if (diff > 1) {
        erros.push({ ...r, _diff: diff, _esperado: esperado });
    }
});
console.log(`Total tributáveis com base > 0: ${tributaveis.length} | Erros > R$1: ${erros.length}`);

// Agrupar por CFOP
const errByCfop = {};
erros.forEach(r => { errByCfop[r.CFOP] = (errByCfop[r.CFOP] || 0) + 1; });
console.log('Por CFOP:');
Object.entries(errByCfop).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  CFOP ${k}: ${v}x`));

console.log('\nAmostra dos 8 maiores erros:');
erros.sort((a, b) => b._diff - a._diff).slice(0, 8).forEach(r => {
    const base = parseBRL(r['ICMS Base item']);
    const aliq = parseBRL(r['% ICMS NF']);
    const icms = parseBRL(r['ICMS Valor item']);
    console.log(`  CFOP:${r.CFOP} NCM:${r['Classificação']} CST:${r['CST ICMS']}(Antigo:${r['CST Antigo']}) | Base:${r['ICMS Base item']} × Alíq:${aliq}% = Esperado:${r._esperado.toFixed(2)} | Informado:${icms} | Diff:R$${r._diff.toFixed(2)} | Produto:${String(r['Nome Produto'] || '').slice(0, 35)}`);
});
