/**
 * SPED Writer — Reescreve o arquivo SPED com alterações nos CSTs e valores
 * 
 * Regra: Preserva 100% da estrutura original. Altera APENAS os campos
 * CST, Base de Cálculo, Alíquota e Valor de PIS/COFINS nos registros
 * C170, C191 ou C195.
 */

/**
 * Aplica alterações nos registros e gera o TXT final
 * @param {Array} rawLines — Linhas originais do SPED
 * @param {Array} modifications — Lista de modificações a aplicar
 * @returns {string} — Conteúdo do novo TXT
 */
function generateModifiedSped(rawLines, modifications) {
    // Clonar linhas para não alterar o original
    const outputLines = [...rawLines];

    for (const mod of modifications) {
        const lineIdx = mod.lineIndex;
        const originalLine = outputLines[lineIdx];

        if (!originalLine) {
            console.warn(`Linha ${lineIdx} não encontrada no arquivo original`);
            continue;
        }

        const fields = originalLine.split('|');
        const reg = fields[1];

        if (reg === 'C170') {
            applyC170Modifications(fields, mod);
        } else if (reg === 'C191') {
            applyC191Modifications(fields, mod);
        } else if (reg === 'C195') {
            applyC195Modifications(fields, mod);
        }

        // Reconstruir a linha
        outputLines[lineIdx] = fields.join('|');
    }

    return outputLines.join('\n');
}

/**
 * Aplica modificações em um registro C170
 */
function applyC170Modifications(fields, mod) {
    const fp = mod.fieldPositions;

    if (mod.newCstPis !== undefined && mod.newCstPis !== '') {
        fields[fp.CST_PIS] = mod.newCstPis;
    }
    if (mod.newVlBcPis !== undefined) {
        fields[fp.VL_BC_PIS] = formatBRNumber(mod.newVlBcPis);
    }
    if (mod.newAliqPis !== undefined) {
        fields[fp.ALIQ_PIS] = formatBRNumber(mod.newAliqPis, 2);
    }
    if (mod.newVlPis !== undefined) {
        fields[fp.VL_PIS] = formatBRNumber(mod.newVlPis);
    }
    if (mod.newCstCofins !== undefined && mod.newCstCofins !== '') {
        fields[fp.CST_COFINS] = mod.newCstCofins;
    }
    if (mod.newVlBcCofins !== undefined) {
        fields[fp.VL_BC_COFINS] = formatBRNumber(mod.newVlBcCofins);
    }
    if (mod.newAliqCofins !== undefined) {
        fields[fp.ALIQ_COFINS] = formatBRNumber(mod.newAliqCofins, 2);
    }
    if (mod.newVlCofins !== undefined) {
        fields[fp.VL_COFINS] = formatBRNumber(mod.newVlCofins);
    }
}

/**
 * Aplica modificações em um registro C191 (PIS)
 */
function applyC191Modifications(fields, mod) {
    const fp = mod.fieldPositions;

    if (mod.newCstPis !== undefined && mod.newCstPis !== '') {
        fields[fp.CST_PIS] = mod.newCstPis;
    }
    if (mod.newVlBcPis !== undefined) {
        fields[fp.VL_BC_PIS] = formatBRNumber(mod.newVlBcPis);
    }
    if (mod.newAliqPis !== undefined) {
        fields[fp.ALIQ_PIS] = formatBRNumber(mod.newAliqPis, 4);
    }
    if (mod.newVlPis !== undefined) {
        fields[fp.VL_PIS] = formatBRNumber(mod.newVlPis);
    }
}

/**
 * Aplica modificações em um registro C195 (COFINS)
 */
function applyC195Modifications(fields, mod) {
    const fp = mod.fieldPositions;

    if (mod.newCstCofins !== undefined && mod.newCstCofins !== '') {
        fields[fp.CST_COFINS] = mod.newCstCofins;
    }
    if (mod.newVlBcCofins !== undefined) {
        fields[fp.VL_BC_COFINS] = formatBRNumber(mod.newVlBcCofins);
    }
    if (mod.newAliqCofins !== undefined) {
        fields[fp.ALIQ_COFINS] = formatBRNumber(mod.newAliqCofins, 4);
    }
    if (mod.newVlCofins !== undefined) {
        fields[fp.VL_COFINS] = formatBRNumber(mod.newVlCofins);
    }
}
