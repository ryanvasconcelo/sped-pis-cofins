/**
 * retificacao-engine.js
 *
 * Motor de retificação de códigos de produto no SPED EFD.
 *
 * Fluxo:
 *   1. Parsear SPED → extrair 0200, C100 e C170
 *   2. Parsear NF-e XMLs → extrair chNFe → {nItem: cProd}
 *   3. Cruzar: para cada C100 com XML correspondente, mapear C170 items
 *   4. Gerar lista de correções e modificações no arquivo
 */

// ─── Parsers ──────────────────────────────────────────────────────────────────

/**
 * Parseia o arquivo SPED EFD e extrai:
 *   - rawLines: string[]
 *   - lineEnding: '\r\n' | '\n'
 *   - items0200: Map<codItem, {lineIdx, fields: string[]}>
 *   - c100List: Array de C100 com seus C170 filhos
 *   - meta: {companyName, cnpj, period}
 */
export function parseSpedForRetificacao(content) {
    const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
    const lines = content.split(/\r?\n/);
    const rawLines = [...lines];

    const items0200 = new Map();
    const c100List = [];
    let currentC100 = null;
    let companyName = '', cnpj = '', period = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const fields = line.split('|');
        const reg = fields[1];

        if (reg === '0000') {
            companyName = fields[8] || '';
            cnpj = fields[9] || '';
            period = `${fields[6] || ''} a ${fields[7] || ''}`;
        } else if (reg === '0200') {
            // |0200|COD_ITEM|DESCR_ITEM|COD_BARRA|...
            const codItem = (fields[2] || '').trim();
            if (codItem) {
                items0200.set(codItem, { lineIdx: i, fields: [...fields] });
            }
        } else if (reg === 'C100') {
            // |C100|IND_OPER|IND_EMIT|COD_PART|MOD|COD_SIT|SER|NUM_DOC|CHV_NFE|...
            const chvNFe = (fields[9] || '').trim();
            const nfNum  = (fields[8] || '').trim();
            const indOper = (fields[2] || '').trim();
            const indEmit = (fields[3] || '').trim();
            const codPart = (fields[4] || '').trim();
            currentC100 = {
                chvNFe, nfNum, indOper, indEmit, codPart,
                lineIdx: i,
                c170List: []
            };
            c100List.push(currentC100);
        } else if (reg === 'C170') {
            // |C170|NUM_ITEM|COD_ITEM|DESCR_COMPL|QTD|UNID|VL_ITEM|...
            if (currentC100) {
                const numItem = (fields[2] || '').trim();
                const codItem = (fields[3] || '').trim();
                const descr   = (fields[4] || '').trim();
                currentC100.c170List.push({ numItem, codItem, descr, lineIdx: i });
            }
        }
    }

    return {
        rawLines, lineEnding, items0200, c100List,
        meta: { companyName, cnpj, period }
    };
}

/**
 * Parseia o conteúdo XML de uma NF-e.
 * Retorna { chNFe, items: Map<nItem(string), {cProd, xProd, ncm}> } ou null.
 *
 * Usa getElementsByTagNameNS com wildcard para suportar documentos namespaced
 * (DOMParser application/xml não garante compatibilidade de querySelector com NS).
 */
export function parseNfeXml(xmlText) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');

        // Helper: pega elementos por nome local, em qualquer namespace
        const byTag = (root, tagName) => root.getElementsByTagNameNS('*', tagName);
        const firstByTag = (root, tagName) => byTag(root, tagName)[0] ?? null;
        const textOf = el => el ? el.textContent.trim() : '';

        // Verificar erro de parse (tag varia por browser)
        if (doc.documentElement?.tagName === 'parsererror') return null;
        if (firstByTag(doc, 'parsererror')) return null;

        // chNFe vem de protNFe > infProt > chNFe
        let chNFe = textOf(firstByTag(doc, 'chNFe'));

        // Fallback: extrair do atributo Id="NFe<44dígitos>" no infNFe
        if (!chNFe || chNFe.length !== 44) {
            const infEl = firstByTag(doc, 'infNFe');
            if (infEl) {
                const id = infEl.getAttribute('Id') || '';
                chNFe = id.replace(/^NFe/, '').trim();
            }
        }
        if (!chNFe || chNFe.length !== 44) return null;

        // Itens da NF: <det nItem="N"><prod><cProd>...</cProd>...
        const dets = byTag(doc, 'det');
        const items = new Map();
        for (const det of dets) {
            const nItem = det.getAttribute('nItem');
            if (!nItem) continue;
            const prod = firstByTag(det, 'prod');
            if (!prod) continue;
            const cProd = textOf(firstByTag(prod, 'cProd'));
            if (!cProd) continue;
            items.set(nItem, {
                cProd,
                xProd: textOf(firstByTag(prod, 'xProd')),
                ncm:   textOf(firstByTag(prod, 'NCM'))
            });
        }

        return { chNFe, items };
    } catch {
        return null;
    }
}

// ─── Matching ─────────────────────────────────────────────────────────────────

/**
 * Cruza dados do SPED com os XMLs e gera:
 *   - rows: linhas da tabela de retificação
 *   - c170Mods: modificações a aplicar nos C170
 *   - c0200Mods: modificações a aplicar nos 0200
 *   - stats
 */
export function buildRetificacao(spedData, xmlByChave) {
    const { c100List, items0200 } = spedData;
    const rows = [];

    for (const c100 of c100List) {
        if (!c100.c170List.length) continue;

        const xmlData = xmlByChave.get(c100.chvNFe);

        for (const c170 of c100.c170List) {
            if (!xmlData) {
                rows.push({
                    chvNFe:    c100.chvNFe,
                    nfNum:     c100.nfNum,
                    indOper:   c100.indOper,
                    codPart:   c100.codPart,
                    numItem:   c170.numItem,
                    codSped:   c170.codItem,
                    codNFe:    null,
                    descrSped: c170.descr,
                    descrNFe:  null,
                    status:    'sem_xml',
                    c170LineIdx: c170.lineIdx
                });
                continue;
            }

            const xmlItem = xmlData.items.get(c170.numItem);
            if (!xmlItem) {
                rows.push({
                    chvNFe:    c100.chvNFe,
                    nfNum:     c100.nfNum,
                    indOper:   c100.indOper,
                    codPart:   c100.codPart,
                    numItem:   c170.numItem,
                    codSped:   c170.codItem,
                    codNFe:    null,
                    descrSped: c170.descr,
                    descrNFe:  null,
                    status:    'item_nao_encontrado',
                    c170LineIdx: c170.lineIdx
                });
                continue;
            }

            const cProdXml = xmlItem.cProd;
            // Detectar cProd inválido: ERPs que usam CFOP como código de produto
            const cProdInvalido = /^CFOP/i.test(cProdXml);

            let status;
            if (cProdInvalido)                         status = 'cprod_invalido';
            else if (c170.codItem === cProdXml)        status = 'correto';
            else                                       status = 'a_corrigir';

            rows.push({
                chvNFe:    c100.chvNFe,
                nfNum:     c100.nfNum,
                indOper:   c100.indOper,
                codPart:   c100.codPart,
                numItem:   c170.numItem,
                codSped:   c170.codItem,
                codNFe:    cProdInvalido ? null : cProdXml,
                codNFeRaw: cProdXml,
                descrSped: c170.descr,
                descrNFe:  xmlItem.xProd,
                ncm:       xmlItem.ncm,
                status,
                c170LineIdx: c170.lineIdx
            });
        }
    }

    // ── Modificações C170 (apenas os que precisam correção) ──
    const c170Mods = rows
        .filter(r => r.status === 'a_corrigir')
        .map(r => ({ lineIdx: r.c170LineIdx, codSped: r.codSped, codNFe: r.codNFe }));

    // ── Modificações 0200 ──
    // Agrupar codSped → Set<codNFe> para detectar conflitos
    const codMap = new Map(); // codSped → Set<codNFe>
    for (const r of rows.filter(r => r.status === 'a_corrigir')) {
        if (!codMap.has(r.codSped)) codMap.set(r.codSped, new Set());
        codMap.get(r.codSped).add(r.codNFe);
    }

    const c0200Mods = [];
    for (const [codSped, nfeSet] of codMap) {
        const entry = items0200.get(codSped);
        if (!entry) continue; // sem entrada 0200 para este código

        if (nfeSet.size === 1) {
            const [codNFe] = nfeSet;
            // Se o código correto já existe em 0200, não precisamos renomear —
            // apenas o C170 vai apontar para a entrada existente
            const alreadyExists = items0200.has(codNFe);
            c0200Mods.push({
                lineIdx:  entry.lineIdx,
                codSped,
                codNFe,
                conflict: false,
                skip:     alreadyExists  // true = C170 será corrigido mas 0200 já existe
            });
        } else {
            // Conflito: mesmo código SPED mapeia para múltiplos cProd
            for (const codNFe of nfeSet) {
                c0200Mods.push({
                    lineIdx:  entry.lineIdx,
                    codSped,
                    codNFe,
                    conflict: true,
                    skip:     false
                });
            }
        }
    }

    const stats = {
        total:          rows.length,
        aCorrigir:      rows.filter(r => r.status === 'a_corrigir').length,
        corretos:       rows.filter(r => r.status === 'correto').length,
        semXml:         rows.filter(r => r.status === 'sem_xml').length,
        itemNaoEnc:     rows.filter(r => r.status === 'item_nao_encontrado').length,
        cProdInvalido:  rows.filter(r => r.status === 'cprod_invalido').length,
        conflitos:      c0200Mods.filter(m => m.conflict).length,
        nfsComXml:      [...new Set(rows.filter(r => r.status !== 'sem_xml').map(r => r.chvNFe))].length
    };

    return { rows, c170Mods, c0200Mods, stats };
}

// ─── Geração do SPED corrigido ────────────────────────────────────────────────

/**
 * Aplica as modificações nos C170 (campo COD_ITEM, field[3]).
 * Apenas C170 é modificado — 0200 e demais registros não são alterados.
 */
export function applyRetificacao(rawLines, lineEnding, c170Mods) {
    const lines = [...rawLines];

    for (const mod of c170Mods) {
        const fields = lines[mod.lineIdx].split('|');
        fields[3] = mod.codNFe;
        lines[mod.lineIdx] = fields.join('|');
    }

    return lines.join(lineEnding);
}

// ─── Encode / Download ────────────────────────────────────────────────────────

function encodeISO88591(str) {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        bytes[i] = code <= 0xff ? code : 0x3f;
    }
    return bytes;
}

export function downloadSpedTxt(content, filename) {
    const encoded = encodeISO88591(content);
    const blob = new Blob([encoded], { type: 'text/plain;charset=ISO-8859-1' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
