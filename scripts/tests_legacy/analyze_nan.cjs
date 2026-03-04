const XLSX = require('xlsx');

function analyzeErrors(outputFile) {
    console.log(`\n\n=== Analisando Erros em: ${outputFile} ===`);
    try {
        const wbOut = XLSX.readFile(outputFile);
        const wsOut = wbOut.Sheets[wbOut.SheetNames[0]];
        const dataOut = XLSX.utils.sheet_to_json(wsOut);

        const nanRows = dataOut.filter(r =>
            String(r['ICMS Base item']).includes('NaN') ||
            String(r['Alíquota ICMS'] || r['Aliquota ICMS']).includes('NaN') ||
            String(r['Valor ICMS'] || r['ICMS Valor']).includes('NaN') ||
            Number.isNaN(Number(r['ICMS Base item'])) ||
            Number.isNaN(Number(r['Alíquota ICMS'])) ||
            Number.isNaN(Number(r['Valor ICMS'])) ||
            r['ICMS Base item'] === null ||
            r['Alíquota ICMS'] === null
        );

        console.log(`\nForam encontradas ${nanRows.length} linhas com possíveis NaN/Null.`);

        if (nanRows.length > 0) {
            console.log("\nTop 10 erros:");
            nanRows.slice(0, 10).forEach((r, i) => {
                const cstOut = r['CST ICMS'] || r['CST'];
                const cstAnt = r['CST Antigo'];
                console.log(`\n[${i + 1}] NCM: ${r['Classificação']} | CFOP: ${r['CFOP']} | Desc: ${r['Nome Produto']}`);
                console.log(`    CST Antigo: ${cstAnt} -> CST Novo: ${cstOut}`);
                console.log(`    Base: ${r['ICMS Base item']} | Alíq: ${r['% ICMS NF']} | ICMS: ${r['ICMS Valor item']}`);
                console.log(`    Desc e-Audi: ${r['Descrição e-Auditoria'] || r['Desc_eAuditoria']}`);
            });
        }

    } catch (err) {
        console.error("Erro ao analisar:", err.message);
    }
}

analyzeErrors('/Users/ryanrichard/projecont/Rayo/validacoes-icms/novo-output-1.2.xlsx');
