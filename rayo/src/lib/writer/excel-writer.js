import XLSXStyle from 'xlsx-js-style';

/**
 * Gera um arquivo Excel (.xlsx) a partir do array corrigido pelo motor auditor.
 * Aplica fundo VERMELHO nas células que foram modificadas pela autocorreção.
 *
 * @param {Array} correctedData - O array de dados corrigido pelo Motor Auditor.
 * @param {string} filename - Nome do arquivo a ser salvo.
 * @param {Map<number, Set<string>>} modifiedCells - Mapa de rowIndex(0-based) → campos modificados.
 */
export const downloadCorrectedAlterdata = (correctedData, filename = 'Livrão_Auditado_Rayo.xlsx', modifiedCells = new Map()) => {
    if (!correctedData || correctedData.length === 0) return;

    const headers = Object.keys(correctedData[0]);

    // Construir worksheet manualmente para ter controle célula a célula
    const wsData = [
        // Linha de cabeçalho
        headers.map(h => ({
            v: h,
            s: {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } },
                alignment: { horizontal: 'center' }
            }
        })),
        // Linhas de dados
        ...correctedData.map((row, rowIdx) =>
            headers.map((col) => {
                const isModified = modifiedCells.has(rowIdx) && modifiedCells.get(rowIdx).has(col);
                const cellValue = row[col] ?? '';
                return {
                    v: cellValue,
                    t: typeof cellValue === 'number' ? 'n' : 's',
                    s: isModified
                        ? {
                            fill: { patternType: 'solid', fgColor: { rgb: 'FFCCCC' } },
                            font: { bold: true, color: { rgb: 'CC0000' } },
                            border: {
                                top: { style: 'thin', color: { rgb: 'CC0000' } },
                                bottom: { style: 'thin', color: { rgb: 'CC0000' } },
                                left: { style: 'thin', color: { rgb: 'CC0000' } },
                                right: { style: 'thin', color: { rgb: 'CC0000' } }
                            }
                        }
                        : {}
                };
            })
        )
    ];

    const ws = XLSXStyle.utils.aoa_to_sheet(wsData);

    // Ajuste automático de largura das colunas (aproximado)
    ws['!cols'] = headers.map(() => ({ wch: 20 }));

    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Entradas Auditadas');

    XLSXStyle.writeFile(wb, filename);
};
