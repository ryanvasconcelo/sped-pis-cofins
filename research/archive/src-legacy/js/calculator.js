/**
 * Calculator — Cálculos de PIS e COFINS
 * 
 * Regime: Não-Cumulativo (Lucro Real)
 * Alíquotas padrão: PIS 1,65% | COFINS 7,60%
 * 
 * Fórmulas:
 *   Base de Cálculo = Valor do Item − Desconto
 *   Valor PIS = Base de Cálculo × Alíquota PIS / 100
 *   Valor COFINS = Base de Cálculo × Alíquota COFINS / 100
 */

const ALIQ_PIS_PADRAO = 1.65;
const ALIQ_COFINS_PADRAO = 7.60;

// CSTs que geram crédito de PIS/COFINS
const CST_COM_CREDITO = ['50', '51', '52', '53', '54', '55', '56', '60', '61', '62', '63', '64', '65', '66', '67'];

// CSTs sem crédito (mais comuns nos ERPs)
const CST_SEM_CREDITO = ['70', '71', '72', '73', '74', '75', '98', '99'];

/**
 * Verifica se um CST gera crédito
 * @param {string} cst — Código CST (2 dígitos)
 * @returns {boolean}
 */
function cstGeraCredito(cst) {
    return CST_COM_CREDITO.includes(cst);
}

/**
 * Calcula Base de Cálculo
 * @param {number} vlItem — Valor do item
 * @param {number} vlDesc — Valor do desconto
 * @returns {number}
 */
function calcBaseCalculo(vlItem, vlDesc = 0) {
    return Math.max(0, vlItem - vlDesc);
}

/**
 * Calcula valor do PIS
 * @param {number} baseCalc — Base de cálculo
 * @param {number} aliqPis — Alíquota PIS (%)
 * @param {string} cstPis — CST PIS
 * @returns {number}
 */
function calcPis(baseCalc, aliqPis, cstPis) {
    if (!cstGeraCredito(cstPis)) return 0;
    return roundTo(baseCalc * (aliqPis / 100), 2);
}

/**
 * Calcula valor do COFINS
 * @param {number} baseCalc — Base de cálculo
 * @param {number} aliqCofins — Alíquota COFINS (%)
 * @param {string} cstCofins — CST COFINS
 * @returns {number}
 */
function calcCofins(baseCalc, aliqCofins, cstCofins) {
    if (!cstGeraCredito(cstCofins)) return 0;
    return roundTo(baseCalc * (aliqCofins / 100), 2);
}

/**
 * Arredonda para N casas decimais
 */
function roundTo(num, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

/**
 * Calcula todos os valores para um registro
 * @param {Object} params
 * @returns {Object} Valores calculados
 */
function calcularContribuicoes({ vlItem, vlDesc, cstPis, aliqPis, cstCofins, aliqCofins }) {
    const baseCalculo = calcBaseCalculo(vlItem, vlDesc);
    const valorPis = calcPis(baseCalculo, aliqPis || ALIQ_PIS_PADRAO, cstPis);
    const valorCofins = calcCofins(baseCalculo, aliqCofins || ALIQ_COFINS_PADRAO, cstCofins);

    return {
        baseCalculo,
        valorPis,
        valorCofins,
        totalCredito: valorPis + valorCofins,
        aliqPisUsada: aliqPis || ALIQ_PIS_PADRAO,
        aliqCofinsUsada: aliqCofins || ALIQ_COFINS_PADRAO,
        pisGeraCredito: cstGeraCredito(cstPis),
        cofinsGeraCredito: cstGeraCredito(cstCofins)
    };
}
