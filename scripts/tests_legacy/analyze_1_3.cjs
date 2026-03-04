const XLSX = require('xlsx');

function analyzeOutput(outputFile) {
    console.log(`\n=== Analisando Stats: ${outputFile} ===`);
    try {
        const wbOut = XLSX.readFile(outputFile);
        const wsOut = wbOut.Sheets[wbOut.SheetNames[0]];
        const dataOut = XLSX.utils.sheet_to_json(wsOut);

        const modded = dataOut.filter(r => r['CST ICMS'] !== r['CST Antigo'] || r['CST Antigo']);

        console.log(`Total de linhas com alterações detectadas/processadas: ${modded.length}`);

        // Quantos NaNs sobraram?
        const nans = dataOut.filter(r =>
            String(r['ICMS Base item']).includes('NaN') ||
            String(r['Alíquota ICMS'] || r['Aliquota ICMS']).includes('NaN') ||
            String(r['Valor ICMS'] || r['ICMS Valor']).includes('NaN')
        );
        console.log(`Linhas com NaN: ${nans.length}`);

        // Ver os primeiros 5 alertas
        console.log("\nPrimeiros 5 processamentos com CST Antigo diferente:");
        modded.filter(r => r['CST ICMS'] !== r['CST Antigo']).slice(0, 5).forEach((r, i) => {
            console.log(`[${i + 1}] NCM: ${r['Classificação']} | CST Antigo: ${r['CST Antigo']} -> CST Novo: ${r['CST ICMS']} | Base: ${r['ICMS Base item']} | Alíq: ${r['% ICMS NF']} | ICMS: ${r['ICMS Valor item']}`);
        });

    } catch (err) {
        console.error("Erro ao analisar:", err.message);
    }
}

analyzeOutput('/Users/ryanrichard/projecont/Rayo/validacoes-icms/novo-output-1.3.xlsx');
