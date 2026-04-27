import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = './temp/Auditoria_Completa_1777298711484.xlsx';

function analyze() {
    console.log(`Lendo arquivo: ${filePath}`);
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    console.log(`Abas encontradas: ${workbook.SheetNames.join(', ')}`);
    
    // Análise do Resumo
    if (workbook.SheetNames.includes('Resumo Executivo')) {
        const sheet = workbook.Sheets['Resumo Executivo'];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        console.log('\n--- RESUMO EXECUTIVO ---');
        data.forEach(row => {
            if (row && row.length > 0) {
                console.log(row.join(' | '));
            }
        });
    }

    // Análise do Resultado da Conciliação
    if (workbook.SheetNames.includes('Conciliação Principal')) {
        const sheet = workbook.Sheets['Conciliação Principal'];
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log('\n--- RESULTADO CONCILIAÇÃO ---');
        console.log(`Colunas Conciliação Principal: ${Object.keys(data[0]).join(', ')}`);
        
        const counts = {};
        const exemplosDivergentes = [];
        const exemplosPendenciaBanco = [];
        const exemplosPendenciaRazao = [];

        data.forEach(row => {
            const status = row['Status'] || row['status'] || 'Indefinido';
            counts[status] = (counts[status] || 0) + 1;
            
            if (status.includes('Divergente')) {
                if (exemplosDivergentes.length < 5) exemplosDivergentes.push(row);
            }
            else if (status.includes('Consta no razão porém não consta no relatório Financeiro')) {
                if (exemplosPendenciaBanco.length < 10) exemplosPendenciaBanco.push(row);
            }
            else if (status.includes('Pendente no razão e consta no relatório financeiro')) {
                if (exemplosPendenciaRazao.length < 3) exemplosPendenciaRazao.push(row);
            }
        });

        console.log('Contagem de Status:', counts);
        
        console.log('\nExemplos de PENDÊNCIA BANCO (Consta no Razão, falta no Fin):');
        exemplosPendenciaBanco.forEach(e => console.log(`Data: ${e.Data}, Doc: ${e['Doc / Nº Origem']}, Valor: ${e['Valor Razão (A)']}, Hist: ${e['Nome / Descrição']}`));
        
        console.log('\nExemplos de PENDÊNCIA RAZÃO (Consta no Fin, falta no Razão):');
        exemplosPendenciaRazao.forEach(e => console.log(`Data: ${e.Data}, Doc: ${e['Doc / Nº Origem']}, Valor: ${e['Valor Saldo (B)']}, Hist: ${e['Nome / Descrição']}`));
        
        console.log('\nExemplos de DIVERGENTES:');
        exemplosDivergentes.forEach(e => console.log(`Data: ${e.Data}, Razão R$ ${e['Valor Razão']}, Fin R$ ${e['Valor Financeiro']}, Diff: ${e['Diferença']}`));
        
        console.log('\nExemplos de PENDÊNCIA RAZÃO:');
        exemplosPendenciaRazao.forEach(e => console.log(`Data: ${e.Data}, Fin R$ ${e['Valor Financeiro']}, Fin Hist: ${e['Histórico Financeiro']}`));
        
        console.log('\nExemplos de PENDÊNCIA BANCO:');
        exemplosPendenciaBanco.forEach(e => console.log(`Data: ${e.Data}, Razão R$ ${e['Valor Razão']}, Razão Hist: ${e['Histórico Razão']}`));
    }
    
    // Análise de Auditoria de Extrato
    if (workbook.SheetNames.includes('Auditoria Extrato Diária')) {
        const sheet = workbook.Sheets['Auditoria Extrato Diária'];
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log('\n--- AUDITORIA DE EXTRATO ---');
        console.log(`Colunas Auditoria Extrato: ${Object.keys(data[0]).join(', ')}`);
        
        const divergentDays = data.filter(d => d['Status'] !== 'Batido');
        console.log(`Dias com divergência Extrato x Financeiro: ${divergentDays.length}`);
        divergentDays.slice(0, 5).forEach(d => {
            console.log(JSON.stringify(d));
        });
    }
}

analyze();
