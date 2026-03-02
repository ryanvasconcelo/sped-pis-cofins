/**
 * SPED Parser — Lê e interpreta arquivos SPED EFD-Contribuições
 * Migrado para ES Modules para uso com React
 */

// === MAPEAMENTO DE CAMPOS ===

const FIELDS_0200 = {
    REG: 1, COD_ITEM: 2, DESCR_ITEM: 3, COD_BARRA: 4,
    COD_ANT: 5, UNID_INV: 6, TIPO_ITEM: 7, COD_NCM: 8,
    EX_IPI: 9, COD_GEN: 10, COD_LST: 11, ALIQ_ICMS: 12
};

const FIELDS_C170 = {
    REG: 2, NUM_ITEM: 3, COD_ITEM: 4, DESCR_COMPL: 5,
    QTD: 6, UNID: 7, VL_ITEM: 8, VL_DESC: 9,
    IND_MOV: 10, CST_ICMS: 11, CFOP: 12, COD_NAT: 13,
    VL_BC_ICMS: 14, ALIQ_ICMS: 15, VL_ICMS: 16,
    VL_BC_ICMS_ST: 17, ALIQ_ST: 18, VL_ICMS_ST: 19,
    IND_APUR: 20,
    CST_PIS: 21, VL_BC_PIS: 22, ALIQ_PIS_PCT: 23,
    QUANT_BC_PIS: 24, ALIQ_PIS_REAIS: 25, VL_PIS: 26,
    CST_COFINS: 27, VL_BC_COFINS: 28, ALIQ_COFINS_PCT: 29,
    QUANT_BC_COFINS: 30, ALIQ_COFINS_REAIS: 31, VL_COFINS: 32,
    COD_CTA: 33, VL_ABAT_NT: 34
};

const FIELDS_C191 = {
    REG: 1, CNPJ: 2, CST_PIS: 3, CFOP: 4,
    VL_ITEM: 5, VL_DESC: 6, VL_BC_PIS: 7, ALIQ_PIS: 8,
    QUANT_BC_PIS: 9, ALIQ_PIS_QUANT: 10, VL_PIS: 11, COD_CTA: 12
};

const FIELDS_C195 = {
    REG: 1, CNPJ: 2, CST_COFINS: 3, CFOP: 4,
    VL_ITEM: 5, VL_DESC: 6, VL_BC_COFINS: 7, ALIQ_COFINS: 8,
    QUANT_BC_COFINS: 9, ALIQ_COFINS_QUANT: 10, VL_COFINS: 11, COD_CTA: 12
};

// === UTILITIES ===

export function parseBRNumber(str) {
    if (!str || str.trim() === '') return 0;
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

export function formatBRNumber(num, decimals = 2) {
    if (num === 0 || num === null || num === undefined) return '0,00';
    return num.toFixed(decimals).replace('.', ',');
}

// === PARSER ===

export function parseSpedFile(content) {
    const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const rawLines = [...lines];

    const items = new Map();
    const contributions = [];
    let format = null;
    let hasC170 = false, hasC191 = false, hasC195 = false;
    let companyName = '', cnpj = '', period = '';
    let currentParentCodItem = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const fields = line.split('|');
        const reg = fields[1] || '';

        switch (reg) {
            case '0000':
                companyName = fields[8] || '';
                cnpj = fields[9] || '';
                period = `${fields[6] || ''} a ${fields[7] || ''}`;
                break;

            case '0200':
                items.set(fields[FIELDS_0200.COD_ITEM], {
                    code: fields[FIELDS_0200.COD_ITEM],
                    description: fields[FIELDS_0200.DESCR_ITEM],
                    ncm: fields[FIELDS_0200.COD_NCM],
                    barcode: fields[FIELDS_0200.COD_BARRA],
                    unit: fields[FIELDS_0200.UNID_INV],
                    lineIndex: i
                });
                break;

            case 'C170':
                hasC170 = true;
                contributions.push({
                    lineIndex: i, type: 'C170',
                    codItem: fields[FIELDS_C170.COD_ITEM],
                    cfop: fields[FIELDS_C170.CFOP],
                    vlItem: parseBRNumber(fields[FIELDS_C170.VL_ITEM]),
                    vlDesc: parseBRNumber(fields[FIELDS_C170.VL_DESC]),
                    cstPis: (fields[FIELDS_C170.CST_PIS] || '').trim(),
                    vlBcPis: parseBRNumber(fields[FIELDS_C170.VL_BC_PIS]),
                    aliqPis: parseBRNumber(fields[FIELDS_C170.ALIQ_PIS_PCT]),
                    vlPis: parseBRNumber(fields[FIELDS_C170.VL_PIS]),
                    cstCofins: (fields[FIELDS_C170.CST_COFINS] || '').trim(),
                    vlBcCofins: parseBRNumber(fields[FIELDS_C170.VL_BC_COFINS]),
                    aliqCofins: parseBRNumber(fields[FIELDS_C170.ALIQ_COFINS_PCT]),
                    vlCofins: parseBRNumber(fields[FIELDS_C170.VL_COFINS]),
                    fieldPositions: {
                        CST_PIS: FIELDS_C170.CST_PIS, VL_BC_PIS: FIELDS_C170.VL_BC_PIS,
                        ALIQ_PIS: FIELDS_C170.ALIQ_PIS_PCT, VL_PIS: FIELDS_C170.VL_PIS,
                        CST_COFINS: FIELDS_C170.CST_COFINS, VL_BC_COFINS: FIELDS_C170.VL_BC_COFINS,
                        ALIQ_COFINS: FIELDS_C170.ALIQ_COFINS_PCT, VL_COFINS: FIELDS_C170.VL_COFINS
                    }
                });
                break;

            case 'C180':
            case 'C190':
                currentParentCodItem = fields[5] || '';
                break;

            case 'C191':
                hasC191 = true;
                contributions.push({
                    lineIndex: i, type: 'C191',
                    codItem: currentParentCodItem,
                    cnpj: fields[FIELDS_C191.CNPJ] || '',
                    cfop: fields[FIELDS_C191.CFOP] || '',
                    vlItem: parseBRNumber(fields[FIELDS_C191.VL_ITEM]),
                    vlDesc: parseBRNumber(fields[FIELDS_C191.VL_DESC]),
                    cstPis: fields[FIELDS_C191.CST_PIS] || '',
                    vlBcPis: parseBRNumber(fields[FIELDS_C191.VL_BC_PIS]),
                    aliqPis: parseBRNumber(fields[FIELDS_C191.ALIQ_PIS]),
                    vlPis: parseBRNumber(fields[FIELDS_C191.VL_PIS]),
                    codCta: fields[FIELDS_C191.COD_CTA] || '',
                    fieldPositions: {
                        CST_PIS: FIELDS_C191.CST_PIS, VL_BC_PIS: FIELDS_C191.VL_BC_PIS,
                        ALIQ_PIS: FIELDS_C191.ALIQ_PIS, VL_PIS: FIELDS_C191.VL_PIS
                    }
                });
                break;

            case 'C195':
                hasC195 = true;
                contributions.push({
                    lineIndex: i, type: 'C195',
                    codItem: currentParentCodItem,
                    cnpj: fields[FIELDS_C195.CNPJ] || '',
                    cfop: fields[FIELDS_C195.CFOP] || '',
                    vlItem: parseBRNumber(fields[FIELDS_C195.VL_ITEM]),
                    vlDesc: parseBRNumber(fields[FIELDS_C195.VL_DESC]),
                    cstCofins: fields[FIELDS_C195.CST_COFINS] || '',
                    vlBcCofins: parseBRNumber(fields[FIELDS_C195.VL_BC_COFINS]),
                    aliqCofins: parseBRNumber(fields[FIELDS_C195.ALIQ_COFINS]),
                    vlCofins: parseBRNumber(fields[FIELDS_C195.VL_COFINS]),
                    codCta: fields[FIELDS_C195.COD_CTA] || '',
                    fieldPositions: {
                        CST_COFINS: FIELDS_C195.CST_COFINS, VL_BC_COFINS: FIELDS_C195.VL_BC_COFINS,
                        ALIQ_COFINS: FIELDS_C195.ALIQ_COFINS, VL_COFINS: FIELDS_C195.VL_COFINS
                    }
                });
                break;
        }
    }

    const countC170 = contributions.filter(c => c.type === 'C170').length;
    const countC191 = contributions.filter(c => c.type === 'C191').length;
    const countC195 = contributions.filter(c => c.type === 'C195').length;

    if (hasC170 && !hasC191 && !hasC195) format = 'C170';
    else if (!hasC170 && (hasC191 || hasC195)) format = 'C191_C195';
    else if (hasC170 && (hasC191 || hasC195)) format = 'MISTO';

    return {
        rawLines, items, contributions, format, lineEnding,
        meta: { companyName, cnpj, period },
        stats: { totalLines: lines.length, totalItems: items.size, totalC170: countC170, totalC191: countC191, totalC195: countC195 }
    };
}
