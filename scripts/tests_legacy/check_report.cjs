const XLSX = require('xlsx');

function checkReport(outputFile) {
    try {
        const wb = XLSX.readFile(outputFile);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        // A linha do UI é diferente do index do array. Vamos puxar 2710.12.59 (Gasolina)
        const gasolinas = data.filter(r => r['Classificação'].includes('2710.12') || r['Classificação'].includes('2710.19'));

        console.log(`Encontrei ${gasolinas.length} combustíveis.`);
        if (gasolinas.length > 0) {
            console.log("\nAmostra do primeiro combustível no Excel final:");
            console.log(gasolinas[0]);
        }
    } catch (e) {
        console.error(e.message);
    }
}

checkReport('/Users/ryanrichard/projecont/Rayo/validacoes-icms/novo-output-1.3.xlsx');
