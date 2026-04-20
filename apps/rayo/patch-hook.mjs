import fs from 'fs';

let content = fs.readFileSync('src/hooks/useConciliacaoBancaria.js', 'utf8');

// Replace the parsing loop to STRICTLY separate SAP and SIMPLIFICADO parsers
const oldLoop = `                // 1. Tenta Razão SAP ou Simplificado (são rigorosos e exigem colunas específicas)
                try {
                    const resA = parseRazaoBanco(b);
                    if (resA.layoutDetectado === 'SAP') {
                        parsedSap = resA;
                        nameSap = name;
                        isSap = true;
                    } else if (resA.layoutDetectado === 'SIMPLIFICADO') {
                        parsedSimp = resA;
                        nameSimp = name;
                        isSimp = true;
                    }
                } catch(e) {}

                if (!isSap && !isSimp) {
                     // 2. Tenta SaldoConta
                     try {
                         const resB = parseSaldoConta(b);
                         if (resB.layoutDetectado === 'SIMPLIFICADO') {
                             parsedSimp = resB;
                             nameSimp = name;
                             isSimp = true;
                         } else if (resB.layoutDetectado === 'SAP') {
                             parsedSap = resB;
                             nameSap = name;
                             isSap = true;
                         }
                     } catch(e) {}
                }`;

const newLoop = `                // 1. Tenta Razão SAP
                try {
                    const resA = parseRazaoBanco(b);
                    if (resA.layoutDetectado === 'SAP') {
                        parsedSap = resA;
                        nameSap = name;
                        isSap = true;
                    }
                } catch(e) {}

                if (!isSap) {
                     // 2. Tenta Relatório Financeiro (SIMPLIFICADO)
                     try {
                         const resB = parseSaldoConta(b);
                         if (resB.layoutDetectado === 'SIMPLIFICADO') {
                             parsedSimp = resB;
                             nameSimp = name;
                             isSimp = true;
                         }
                     } catch(e) {}
                }`;

content = content.replace(oldLoop, newLoop);

// Replace the FASE 2 logic
const oldFase2 = `            // === FASE 2: Netting Financeiro x Razão (Linha a Linha) ===
            // Normalizando os schemas como já existia antes
            const normRazao = parsedSap.layoutDetectado === 'SIMPLIFICADO' ? saldoToRazaoSchema(parsedSap.lancamentos) : parsedSap.lancamentos;
            const normSaldo = parsedSimp.layoutDetectado === 'SAP' ? razaoToSaldoSchema(parsedSimp.lancamentos) : parsedSimp.lancamentos;

            const nettingRazao = applyNettingRazao(normRazao);
            const nettingSaldo = applyNettingSaldoConta(normSaldo);`;

const newFase2 = `            // === FASE 2: Netting Financeiro x Razão (Linha a Linha) ===
            // Como agora exigimos que parsedSap venha do parser SAP e parsedSimp do parser Simplificado, 
            // os schemas já estão corretos.
            const normRazao = parsedSap.lancamentos;
            const normSaldo = parsedSimp.lancamentos;

            const nettingRazao = applyNettingRazao(normRazao);
            const nettingSaldo = applyNettingSaldoConta(normSaldo);`;

content = content.replace(oldFase2, newFase2);

fs.writeFileSync('src/hooks/useConciliacaoBancaria.js', content);
console.log('Patched hook');
