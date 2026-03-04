const XLSX = require('xlsx');
const wb = XLSX.readFile('/Users/ryanrichard/projecont/Rayo/validacoes-icms/novo-output-1.5.xlsx');
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
const cfopsEsp = ['1910', '1911', '1912', '1913', '1914', '1915', '1916', '1917', '1920', '1921', '1949',
    '2910', '2911', '2912', '2913', '2914', '2915', '2916', '2917', '2920', '2921', '2949'];
const nao90 = data.filter(r => cfopsEsp.includes(String(r.CFOP)) && !String(r['CST ICMS']).endsWith('90'));
const byCfop = {};
nao90.forEach(r => {
    const k = String(r.CFOP);
    byCfop[k] = (byCfop[k] || 0) + 1;
});
console.log('Op. Especiais com CST nao-90, por CFOP:');
Object.entries(byCfop).forEach(([k, v]) => console.log('  CFOP ' + k + ': ' + v + 'x'));

const { CFOP_OPERACOES_ESPECIAIS, CFOP_EXCECOES_CREDITO } = require('./src/lib/auditor/knowledge-base.js');
console.log('\nCFOP 1913 em CFOP_OPERACOES_ESPECIAIS?', CFOP_OPERACOES_ESPECIAIS.has('1913'));
console.log('CFOP 1913 em CFOP_EXCECOES_CREDITO?', CFOP_EXCECOES_CREDITO.has('1913'));

// Amostra das linhas
nao90.slice(0, 5).forEach(r => {
    console.log('  CFOP:', r.CFOP, '| NCM:', r['Classificacao'] || r['Classificação'], '| CST:', r['CST ICMS'], '| Antigo:', r['CST Antigo'], '| Produto:', String(r['Nome Produto'] || '').slice(0, 40));
});
