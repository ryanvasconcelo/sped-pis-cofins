/**
 * Calculator — Cálculos PIS/COFINS
 */

export const ALIQ_PIS_PADRAO = 1.65;
export const ALIQ_COFINS_PADRAO = 7.60;

// CSTs que geram crédito tributário (faixa 50-66)
const CST_CREDITO = ['50', '51', '52', '53', '54', '55', '56', '60', '61', '62', '63', '64', '65', '66'];

export function cstGeraCredito(cst) {
    return CST_CREDITO.includes(String(cst).padStart(2, '0'));
}

export function calcBaseCalculo(vlItem, vlDesc = 0) {
    return Math.max(0, vlItem - vlDesc);
}

export function calcPis(baseCalculo, aliqPis, cst) {
    if (!cstGeraCredito(cst)) return 0;
    return Math.round(baseCalculo * (aliqPis / 100) * 100) / 100;
}

export function calcCofins(baseCalculo, aliqCofins, cst) {
    if (!cstGeraCredito(cst)) return 0;
    return Math.round(baseCalculo * (aliqCofins / 100) * 100) / 100;
}

export function calcularContribuicoes({ vlItem, vlDesc = 0, cstPis, aliqPis, cstCofins, aliqCofins }) {
    const base = calcBaseCalculo(vlItem, vlDesc);
    return {
        baseCalculo: base,
        valorPis: calcPis(base, aliqPis, cstPis),
        valorCofins: calcCofins(base, aliqCofins, cstCofins)
    };
}
