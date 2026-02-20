/**
 * NCM Grouper — Agrupa registros de contribuição por NCM
 * 
 * Para C170: cada registro tem codItem → lookup no 0200 → NCM
 * Para C191/C195: não tem codItem direto, agrupa por CNPJ+CFOP
 *   e tenta encontrar o NCM via C190 parent (que tem COD_NCM)
 * 
 * Fallback: se não encontrar NCM, agrupa como "SEM_NCM"
 */

import { ALIQ_PIS_PADRAO, ALIQ_COFINS_PADRAO } from './calculator';

/**
 * Agrupa os registros de contribuição por NCM
 * @returns {Map<string, NcmGroup>} Mapa de NCM → grupo
 */
export function groupByNCM(parsedData) {
    const groups = new Map();
    const { items, contributions } = parsedData;

    // === C170: lookup direto por codItem ===
    contributions
        .filter(c => c.type === 'C170')
        .forEach(c => {
            const item = items.get(c.codItem);
            const ncm = item?.ncm || 'SEM_NCM';
            const desc = `[${c.codItem}] ${item?.description || ''}`.trim();

            if (!groups.has(ncm)) {
                groups.set(ncm, createGroup(ncm, desc));
            }

            const group = groups.get(ncm);
            group.records.push({
                type: 'C170',
                lineIndex: c.lineIndex,
                codItem: c.codItem,
                description: desc,
                cnpj: '',
                cfop: c.cfop,
                vlItem: c.vlItem,
                vlDesc: c.vlDesc,
                cstPis: c.cstPis,
                vlBcPis: c.vlBcPis,
                aliqPis: c.aliqPis,
                vlPis: c.vlPis,
                cstCofins: c.cstCofins,
                vlBcCofins: c.vlBcCofins,
                aliqCofins: c.aliqCofins,
                vlCofins: c.vlCofins,
                fieldPositions: c.fieldPositions
            });

            group.totalBase += c.vlItem - (c.vlDesc || 0);
            group.productCount++;
        });

    // === C191+C195: emparelhar e buscar NCM via C190 parent ===
    const c191List = contributions.filter(c => c.type === 'C191');
    const c195List = contributions.filter(c => c.type === 'C195');

    // Tentar encontrar NCM via C190 parent
    // O C190 guarda NCM no campo 6 (COD_ITEM que é na verdade referência ao NCM)
    // Vamos usar uma abordagem pragmática: buscar o NCM nos items do 0200
    // que correspondem ao COD_ITEM do C190

    c191List.forEach((c191, idx) => {
        const c195 = c195List[idx] || null;

        let ncm = c191.codItem || 'SEM_NCM';
        let desc = c191.codItem
            ? `[${c191.codItem}] ${ncm !== 'SEM_NCM' ? ncm : ''}`.trim()
            : (c191.cnpj ? `[C191/C195] - CNPJ: ${c191.cnpj}` : `[Registro ${idx + 1}]`);

        const groupKey = ncm !== 'SEM_NCM' ? ncm : `${c191.cnpj}_${c191.cfop}`;

        if (!groups.has(groupKey)) {
            let titleDesc = desc;
            if (ncm !== 'SEM_NCM') {
                for (const [, item] of items) {
                    if (item.ncm === ncm && item.description) {
                        titleDesc = `[${c191.codItem}] ${item.description}`;
                        desc = titleDesc;
                        break;
                    }
                }
            }
            groups.set(groupKey, createGroup(groupKey, titleDesc));
        }

        const group = groups.get(groupKey);
        group.records.push({
            type: 'C191_C195',
            lineIndexPis: c191.lineIndex,
            lineIndexCofins: c195 ? c195.lineIndex : null,
            cnpj: c191.cnpj,
            cfop: c191.cfop,
            description: desc,
            vlItem: c191.vlItem,
            vlDesc: c191.vlDesc,
            cstPis: c191.cstPis,
            vlBcPis: c191.vlBcPis,
            aliqPis: c191.aliqPis,
            vlPis: c191.vlPis,
            cstCofins: c195 ? c195.cstCofins : '',
            vlBcCofins: c195 ? c195.vlBcCofins : 0,
            aliqCofins: c195 ? c195.aliqCofins : 0,
            vlCofins: c195 ? c195.vlCofins : 0,
            fieldPositionsPis: c191.fieldPositions,
            fieldPositionsCofins: c195 ? c195.fieldPositions : null
        });

        group.totalBase += c191.vlItem - (c191.vlDesc || 0);
        group.productCount++;
    });

    // Ordenar por totalBase decrescente
    const sorted = new Map(
        [...groups.entries()].sort((a, b) => b[1].totalBase - a[1].totalBase)
    );

    return sorted;
}

function createGroup(groupKey, description) {
    let ncm = groupKey;
    if (groupKey.length === 14 || groupKey.includes('_')) {
        ncm = 'SEM_NCM';
    }

    return {
        ncm,
        description,
        records: [],
        totalBase: 0,
        productCount: 0,
        // Valores editáveis (mesmo para todo o grupo)
        novoCstPis: '',
        novoCstCofins: '',
        aliqPis: ALIQ_PIS_PADRAO,
        aliqCofins: ALIQ_COFINS_PADRAO
    };
}

/**
 * Extrai NCMs únicos para download CSV
 */
export function extractUniqueNCMs(items) {
    const ncmMap = new Map();

    for (const [, item] of items) {
        if (!item.ncm || item.ncm === 'SEM_NCM') continue;

        if (!ncmMap.has(item.ncm)) {
            ncmMap.set(item.ncm, { ncm: item.ncm, count: 0, example: item.description });
        }
        ncmMap.get(item.ncm).count++;
    }

    return [...ncmMap.values()].sort((a, b) => a.ncm.localeCompare(b.ncm));
}

export function generateNCMsCsv(ncmList) {
    let txt = '';
    ncmList.forEach(n => {
        txt += `${n.ncm}\n`;
    });
    return txt;
}
