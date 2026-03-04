import fs from 'fs';
import * as XLSX from 'xlsx';
import { runAudit } from './src/lib/auditor/icms-auditor.js';

function start() {
    const inputPath = '/Users/ryanrichard/projecont/Rayo/validacoes-icms/input1.xlsx';

    // Ler Excel do Usuário
    const wb = XLSX.readFile(inputPath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const alterdataRows = XLSX.utils.sheet_to_json(ws);

    // Mockar Regras eAuditoria do primeiro item pra ver se o NaN ainda ocorre
    // Como não posso rodar o crawler aqui, vou simular o array do e-auditoria apenas com 1 regra para o NCM da linha 1
    const dummyEAuditoria = [
        {
            'NCM': '87149990',
            'Descrição do Produto': 'Bacia',
            'CST/CSOSN': '060',
            'Alíquota%': '20'
        }
    ];

    const perfil = { natureza: 'comercio', regime: 'normal' };

    console.log("Rodando Auditoria simulada...");
    const { report, correctedData } = runAudit(alterdataRows, dummyEAuditoria, perfil);

    const errors = correctedData.filter(r =>
        String(r['ICMS Base item']).includes('NaN') ||
        String(r['CST ICMS']).includes('NaN')
    );

    console.log(`Corrigimos ${correctedData.length} linhas e detectamos ${errors.length} NaNs nas bases.`);

    if (report.length > 0) {
        console.log("Amostra do report:");
        console.log(report.slice(0, 3));
    }
}

start();
