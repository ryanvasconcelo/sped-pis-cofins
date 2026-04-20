/**
 * categoria-detector.js
 *
 * Detecta categorias especiais de movimentações bancárias por substring,
 * adaptado para os padrões abreviados do Bradesco e Itaú.
 *
 * Categorias:
 *   - APLICACAO: APLIC, APL
 *   - RESGATE:   RESGATE, RES, RESG, RED
 *   - RENDIMENTO: RENDIMENTO, REND, RENDA
 *   - TARIFA:    TARIFA, TAR, TFA
 */

const CATEGORIA_RULES = [
    {
        key: 'aplicacao',
        label: 'Aplicação',
        icon: '📈',
        color: '#6366f1',
        bg: 'rgba(99,102,241,0.1)',
        patterns: ['aplic', 'apl '],
    },
    {
        key: 'resgate',
        label: 'Resgate',
        icon: '📉',
        color: '#0ea5e9',
        bg: 'rgba(14,165,233,0.1)',
        patterns: ['resgate', 'resg', 'red ', ' res '],
    },
    {
        key: 'rendimento',
        label: 'Rendimento',
        icon: '💰',
        color: '#22c55e',
        bg: 'rgba(34,197,94,0.1)',
        patterns: ['rendimento', 'renda', 'rend '],
    },
    {
        key: 'tarifa',
        label: 'Tarifa',
        icon: '🧾',
        color: '#f59e0b',
        bg: 'rgba(245,158,11,0.1)',
        patterns: ['tarifa', 'tfa', 'tar '],
    },
];

/**
 * Detecta a categoria de um lançamento pela descrição.
 * @param {string} descricao
 * @returns {string|null} chave da categoria ou null
 */
export function detectarCategoria(descricao) {
    if (!descricao) return null;
    const lower = ` ${descricao.toLowerCase()} `;
    for (const rule of CATEGORIA_RULES) {
        for (const pattern of rule.patterns) {
            if (lower.includes(pattern)) return rule.key;
        }
    }
    return null;
}

/**
 * Agrupa lançamentos por categoria.
 * @param {Array} lancamentos - lista de lançamentos com campo {descricao}
 * @returns {Object} { aplicacao: [...], resgate: [...], rendimento: [...], tarifa: [...] }
 */
export function extrairCategorias(lancamentos) {
    const resultado = {
        aplicacao: [],
        resgate: [],
        rendimento: [],
        tarifa: [],
    };

    for (const l of lancamentos) {
        const cat = detectarCategoria(l.descricao);
        if (cat && resultado[cat] !== undefined) {
            resultado[cat].push(l);
        }
    }

    return resultado;
}

/**
 * Retorna metadados visuais de cada categoria.
 */
export const CATEGORIA_META = Object.fromEntries(
    CATEGORIA_RULES.map(r => [r.key, { label: r.label, icon: r.icon, color: r.color, bg: r.bg }])
);

export { CATEGORIA_RULES };
