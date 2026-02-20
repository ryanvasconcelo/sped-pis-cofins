/**
 * SPED Writer — Gera o arquivo TXT revisado
 */

import { formatBRNumber } from './sped-parser';

export function generateModifiedSped(rawLines, modifications) {
    const lines = [...rawLines];

    modifications.forEach(mod => {
        const line = lines[mod.lineIndex];
        if (!line) return;

        const fields = line.split('|');

        if (mod.newCstPis !== undefined && mod.fieldPositions.CST_PIS) {
            fields[mod.fieldPositions.CST_PIS] = mod.newCstPis;
        }
        if (mod.newVlBcPis !== undefined && mod.fieldPositions.VL_BC_PIS) {
            fields[mod.fieldPositions.VL_BC_PIS] = formatBRNumber(mod.newVlBcPis, 2);
        }
        if (mod.newAliqPis !== undefined && mod.fieldPositions.ALIQ_PIS) {
            fields[mod.fieldPositions.ALIQ_PIS] = formatBRNumber(mod.newAliqPis, 4);
        }
        if (mod.newVlPis !== undefined && mod.fieldPositions.VL_PIS) {
            fields[mod.fieldPositions.VL_PIS] = formatBRNumber(mod.newVlPis, 2);
        }
        if (mod.newCstCofins !== undefined && mod.fieldPositions.CST_COFINS) {
            fields[mod.fieldPositions.CST_COFINS] = mod.newCstCofins;
        }
        if (mod.newVlBcCofins !== undefined && mod.fieldPositions.VL_BC_COFINS) {
            fields[mod.fieldPositions.VL_BC_COFINS] = formatBRNumber(mod.newVlBcCofins, 2);
        }
        if (mod.newAliqCofins !== undefined && mod.fieldPositions.ALIQ_COFINS) {
            fields[mod.fieldPositions.ALIQ_COFINS] = formatBRNumber(mod.newAliqCofins, 4);
        }
        if (mod.newVlCofins !== undefined && mod.fieldPositions.VL_COFINS) {
            fields[mod.fieldPositions.VL_COFINS] = formatBRNumber(mod.newVlCofins, 2);
        }

        lines[mod.lineIndex] = fields.join('|');
    });

    return lines.join('\n');
}

export function downloadFile(content, filename, type = 'text/plain') {
    const blob = new Blob([content], { type: `${type};charset=ISO-8859-1` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
