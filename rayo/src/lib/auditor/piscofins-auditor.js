import { cstGeraCredito } from '../../core/calculator';

/**
 * Motor de Auditoria Autônoma para PIS/COFINS
 * 
 * Cruza a lista de NCMs agrupados do SPED com as Regras extraídas do e-Auditoria.
 * Se a regra do e-Auditoria apontar que a operação permite creditamento (tributada),
 * aplica o CST 50 (Operação com Direito a Crédito) aos grupos correspondentes.
 * 
 * @param {Map} ncmGroups Map com os grupos de NCMs extraídos do SPED
 * @param {Array} eAuditoriaRules Array preenchido com as tabelas do Excel de Regras
 * @param {Object} perfil Empresa { atividade, regime, uf }
 * @returns {Map} Um novo Map de ncmGroups com os CSTs preenchidos
 */
export const aplicarAutoCorrecaoPisCofins = (ncmGroups, eAuditoriaRules, perfil) => {
    // 1. Criar dicionário de regras do e-Auditoria por NCM para busca O(1)
    // CUIDADO: O e-Auditoria pode usar pontos no NCM (ex: "1507.90.11") e o SPED sem ("15079011").
    const rulesByNcm = new Map();

    eAuditoriaRules.forEach(rule => {
        // Encontrar o campo NCM independentemente de ter ponto ou minúscula ("NCM", "ncm", "Ncm")
        const ncmKey = Object.keys(rule).find(k => String(k).toUpperCase().includes('NCM'));
        if (ncmKey && rule[ncmKey]) {
            const rawNcm = String(rule[ncmKey]).replace(/\D/g, ''); // Remove pontos e formatação
            if (rawNcm) {
                // Se houver múltiplas regras pro mesmo NCM, pegar a primeira (mais conservador)
                if (!rulesByNcm.has(rawNcm)) {
                    rulesByNcm.set(rawNcm, rule);
                }
            }
        }
    });

    // 2. Varrer os grupos do SPED e tentar aplicar CST 50 onde der crédito
    // O React lida com dados imutáveis, então faremos um novo Map() profundo.
    const newGroups = new Map();

    for (const [key, originalGroup] of ncmGroups.entries()) {
        const group = { ...originalGroup };
        let novoCstPis = group.novoCstPis;
        let novoCstCofins = group.novoCstCofins;
        let aliqPis = group.aliqPis;
        let aliqCofins = group.aliqCofins;

        // Se a chave for "SEM_NCM" ou menor que 8 dígitos, não há o que cruzar.
        const cleanNcm = String(key).replace(/\D/g, '');
        if (cleanNcm.length >= 8 && rulesByNcm.has(cleanNcm)) {
            const rule = rulesByNcm.get(cleanNcm);
            const keys = Object.keys(rule);

            // 3. Heurística para ler CST e Alíquota do portal (e-Auditoria)

            // Busca a coluna "CST PIS Entrada" ou similar
            const cstPisKey = keys.find(k => k.toUpperCase().includes('CST PIS') && !k.toUpperCase().includes('SAÍDA'));
            if (cstPisKey && rule[cstPisKey]) {
                novoCstPis = String(rule[cstPisKey]).trim().padStart(2, '0');
            }

            // Busca a coluna "CST COFINS Entrada" (se for separada) ou usa a mesma de PIS se for conjunta (ex: "CST PIS/COFINS ENTRADA")
            const cstCofinsKey = keys.find(k => k.toUpperCase().includes('CST COFINS') && !k.toUpperCase().includes('SAÍDA'));
            if (cstCofinsKey && rule[cstCofinsKey]) {
                novoCstCofins = String(rule[cstCofinsKey]).trim().padStart(2, '0');
            } else if (cstPisKey && cstPisKey.toUpperCase().includes('COFINS') && rule[cstPisKey]) {
                // Caso a coluna seja "CST PIS/COFINS ENTRADA"
                novoCstCofins = String(rule[cstPisKey]).trim().padStart(2, '0');
            }

            // Busca Alíquotas
            const aliqPisKey = keys.find(k => k.toUpperCase().includes('ALÍQUOTA PIS') && !k.toUpperCase().includes('SAÍDA'));
            if (aliqPisKey && rule[aliqPisKey] !== undefined && rule[aliqPisKey] !== null) {
                // e-Auditoria pode retornar string com vírgula, ex: "1,65"
                const aPisVal = String(rule[aliqPisKey]).replace(',', '.');
                if (!isNaN(parseFloat(aPisVal))) aliqPis = parseFloat(aPisVal);
            }

            const aliqCofinsKey = keys.find(k => k.toUpperCase().includes('ALÍQUOTA COFINS') && !k.toUpperCase().includes('SAÍDA'));
            if (aliqCofinsKey && rule[aliqCofinsKey] !== undefined && rule[aliqCofinsKey] !== null) {
                const aCofinsVal = String(rule[aliqCofinsKey]).replace(',', '.');
                if (!isNaN(parseFloat(aCofinsVal))) aliqCofins = parseFloat(aCofinsVal);
            }
        }

        // Se houve alteração, guardamos no novo grupo usando o padrão deimutabilidade
        newGroups.set(key, { ...group, novoCstPis, novoCstCofins, aliqPis, aliqCofins });
    }

    return newGroups;
};
