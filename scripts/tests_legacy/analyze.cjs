const XLSX = require('xlsx');

function analyzeFile(inputFile, outputFile) {
    console.log(`\n\n=== Analisando: ${inputFile} ===`);
    try {
        const wbIn = XLSX.readFile(inputFile);
        const wsIn = wbIn.Sheets[wbIn.SheetNames[0]];
        const dataIn = XLSX.utils.sheet_to_json(wsIn);

        const wbOut = XLSX.readFile(outputFile);
        const wsOut = wbOut.Sheets[wbOut.SheetNames[0]];
        const dataOut = XLSX.utils.sheet_to_json(wsOut);

        const modified = dataOut.filter(r => r['CST ICMS'] !== r['CST Antigo']);
        console.log(`\nForam encontradas ${modified.length} linhas com CST modificado.`);

        if (modified.length > 0) {
            console.log("\nTop 10 alterações:");
            modified.slice(0, 10).forEach((r, i) => {
                const descOrig = r['Nome Produto'] || r['Nome do Produto'] || r['Descrição'] || 'N/A';
                const baseOrig = r['ICMS Base item'] || '0,00';
                console.log(`\n[${i + 1}] NCM: ${r['Classificação']} | CFOP: ${r['CFOP']}`);
                console.log(`    Livrão  -> Descrição: ${descOrig} | CST: ${r['CST Antigo']} | Base: R$ ${baseOrig}`);
                console.log(`    e-Auditoria -> Descrição: ${r['Desc_eAuditoria']} | CST Injetado: ${r['CST ICMS']}`);
            });
        }
    } catch (err) {
        console.error("Erro ao analisar:", err.message);
    }
}

analyzeFile('/Users/ryanrichard/projecont/Rayo/validacoes-icms/input1.xlsx', '/Users/ryanrichard/projecont/Rayo/validacoes-icms/output-input1.xlsx');
analyzeFile('/Users/ryanrichard/projecont/Rayo/validacoes-icms/input2.xls', '/Users/ryanrichard/projecont/Rayo/validacoes-icms/output-input2.xls');
