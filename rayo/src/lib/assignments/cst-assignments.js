/**
 * CST Assignments — Sistema de Atribuições Persistente
 *
 * Armazena chaves compostas de CST (PIS+COFINS) e suas atribuições a NCMs.
 * Persistência via localStorage, 100% client-side, sem backend.
 *
 * Schema:
 *   localStorage["rayo_cst_keys"]    → JSON array de CstKey
 *   localStorage["rayo_assignments"] → JSON array de Assignment
 *
 * CstKey: { id, label, cstPis, cstCofins, aliqPis, aliqCofins, createdAt }
 * Assignment: { cstKeyId, ncm, assignedAt }
 */

const KEY_CST_KEYS = 'rayo_cst_keys';
const KEY_ASSIGNMENTS = 'rayo_assignments';

// --- Helpers de leitura/escrita -------------------------------------------------

function readJson(key, fallback = []) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// --- CstKeys CRUD ---------------------------------------------------------------

export function getCstKeys() {
    return readJson(KEY_CST_KEYS, []);
}

/**
 * Cria ou atualiza uma chave CST composta.
 * Se `key.id` existir, faz update. Caso contrário, cria nova.
 */
export function saveCstKey({ id, label, cstPis, cstCofins, aliqPis = 0, aliqCofins = 0 }) {
    const keys = getCstKeys();
    if (id) {
        const idx = keys.findIndex(k => k.id === id);
        if (idx >= 0) {
            keys[idx] = { ...keys[idx], label, cstPis, cstCofins, aliqPis, aliqCofins };
            writeJson(KEY_CST_KEYS, keys);
            return keys[idx];
        }
    }
    const newKey = { id: generateId(), label, cstPis, cstCofins, aliqPis, aliqCofins, createdAt: new Date().toISOString() };
    keys.push(newKey);
    writeJson(KEY_CST_KEYS, keys);
    return newKey;
}

export function deleteCstKey(id) {
    const keys = getCstKeys().filter(k => k.id !== id);
    writeJson(KEY_CST_KEYS, keys);
    // Remove todas as atribuições que usavam essa chave
    const assignments = getAssignments().filter(a => a.cstKeyId !== id);
    writeJson(KEY_ASSIGNMENTS, assignments);
}

// --- Assignments CRUD -----------------------------------------------------------

export function getAssignments() {
    return readJson(KEY_ASSIGNMENTS, []);
}

/**
 * Retorna o cstKeyId atribuído a um NCM, ou null se não tiver.
 */
export function getAssignmentForNcm(ncm) {
    return getAssignments().find(a => a.ncm === ncm) || null;
}

/**
 * Atribui uma chave CST a um NCM.
 * Substitui qualquer atribuição anterior do mesmo NCM.
 */
export function assignNcm(cstKeyId, ncm) {
    const assignments = getAssignments().filter(a => a.ncm !== ncm);
    assignments.push({ cstKeyId, ncm, assignedAt: new Date().toISOString() });
    writeJson(KEY_ASSIGNMENTS, assignments);
}

export function unassignNcm(ncm) {
    const assignments = getAssignments().filter(a => a.ncm !== ncm);
    writeJson(KEY_ASSIGNMENTS, assignments);
}

/**
 * Bulk: Remove todas as atribuições e recomeça.
 */
export function clearAllAssignments() {
    writeJson(KEY_ASSIGNMENTS, []);
}

// --- Engine de Aplicação em Lote -----------------------------------------------

/**
 * Aplica as atribuições salvas a um Map de ncmGroups (imutável).
 * Retorna um NOVO Map com os CSTs e alíquotas preenchidos conforme as atribuições.
 *
 * @param {Map} ncmGroups - Map do useSpedFile
 * @param {Array} assignments - Array de Assignment
 * @param {Array} cstKeys - Array de CstKey
 * @returns {Map} Novo Map com CSTs aplicados
 */
export function applyAssignmentsToGroups(ncmGroups, assignments, cstKeys) {
    const keyById = new Map(cstKeys.map(k => [k.id, k]));
    const assignByNcm = new Map(assignments.map(a => [a.ncm, a.cstKeyId]));

    const newGroups = new Map();
    const appliedNcms = [];

    for (const [groupKey, group] of ncmGroups.entries()) {
        const ncm = group.ncm;
        const cstKeyId = assignByNcm.get(ncm);
        if (cstKeyId) {
            const cstKey = keyById.get(cstKeyId);
            if (cstKey) {
                newGroups.set(groupKey, {
                    ...group,
                    novoCstPis: cstKey.cstPis,
                    novoCstCofins: cstKey.cstCofins,
                    aliqPis: cstKey.aliqPis ?? group.aliqPis,
                    aliqCofins: cstKey.aliqCofins ?? group.aliqCofins
                });
                appliedNcms.push(ncm);
                continue;
            }
        }
        newGroups.set(groupKey, group);
    }
    return { newGroups, appliedNcms };
}

/**
 * Exporta atribuições como CSV para backup/compartilhamento.
 * Formato: ncm,label,cstPis,cstCofins,aliqPis,aliqCofins
 */
export function exportAssignmentsCsv(assignments, cstKeys) {
    const keyById = new Map(cstKeys.map(k => [k.id, k]));
    let csv = 'NCM,Label,CST PIS,CST COFINS,Aliq PIS,Aliq COFINS\n';
    assignments.forEach(a => {
        const key = keyById.get(a.cstKeyId);
        if (key) {
            csv += `${a.ncm},"${key.label}",${key.cstPis},${key.cstCofins},${key.aliqPis},${key.aliqCofins}\n`;
        }
    });
    return csv;
}
