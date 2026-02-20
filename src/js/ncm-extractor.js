/**
 * NCM Extractor — Extrai NCMs únicos do registro 0200
 * Gera arquivo para download para consulta no e-Auditoria
 */

/**
 * Extrai NCMs únicos dos itens parseados
 * @param {Map} items — Mapa de itens do 0200
 * @returns {Array} Lista de NCMs únicos com descrições
 */
function extractUniqueNCMs(items) {
    const ncmMap = new Map();

    items.forEach((item) => {
        if (item.ncm && item.ncm.trim() !== '') {
            const ncm = item.ncm.trim();
            if (!ncmMap.has(ncm)) {
                ncmMap.set(ncm, {
                    ncm,
                    descriptions: [item.description],
                    productCodes: [item.code],
                    count: 1
                });
            } else {
                const existing = ncmMap.get(ncm);
                existing.count++;
                if (existing.descriptions.length < 3) {
                    existing.descriptions.push(item.description);
                }
                existing.productCodes.push(item.code);
            }
        }
    });

    // Ordenar por NCM
    return Array.from(ncmMap.values()).sort((a, b) => a.ncm.localeCompare(b.ncm));
}

/**
 * Gera conteúdo CSV com NCMs únicos
 * @param {Array} ncms — Lista de NCMs
 * @returns {string} Conteúdo CSV
 */
function generateNCMsCsv(ncms) {
    const header = 'NCM;Qtd Produtos;Exemplo de Produto';
    const rows = ncms.map(n =>
        `${n.ncm};${n.count};${n.descriptions[0] || ''}`
    );
    return [header, ...rows].join('\n');
}

/**
 * Gera conteúdo TXT simples com NCMs (um por linha)
 * Para input direto no e-Auditoria
 * @param {Array} ncms — Lista de NCMs
 * @returns {string} Conteúdo TXT
 */
function generateNCMsTxt(ncms) {
    return ncms.map(n => n.ncm).join('\n');
}

/**
 * Faz download de um arquivo de texto
 * @param {string} content — Conteúdo do arquivo
 * @param {string} filename — Nome do arquivo
 * @param {string} mimeType — Tipo MIME
 */
function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
