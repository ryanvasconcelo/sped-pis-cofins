import { extrairCategorias } from './categoria-detector';
import { parseDataParaComparacao } from './extrato-parser';

/**
 * extrato-reconciler.js
 *
 * Motor de conciliação dia-a-dia entre Extrato Bancário e Relatório Financeiro.
 */

function groupByDate(lancamentos) {
    const agrupado = {};
    for (const l of lancamentos) {
        if (!l.dataStr) continue;
        const dataComparacao = l.data || parseDataParaComparacao(l.dataStr);
        // Exibição amigável
        const dataDisplay = l.dataStr;
        
        if (!agrupado[dataComparacao]) {
            agrupado[dataComparacao] = {
                dataDisplay,
                debito: 0,
                credito: 0,
                lancamentos: []
            };
        }
        agrupado[dataComparacao].debito += Number(l.debito || 0);
        agrupado[dataComparacao].credito += Number(l.credito || 0);
        agrupado[dataComparacao].lancamentos.push(l);
    }
    return agrupado;
}

export function reconcileExtratoFinanceiro(extratoLancamentos, financeiroLancamentos) {
    const extratoByDay = groupByDate(extratoLancamentos);
    const financeiroByDay = groupByDate(financeiroLancamentos);

    // 2. Extrair categorias especiais do extrato
    const categorias = extrairCategorias(extratoLancamentos);

    // 3. Reconciliar dia a dia
    const resultadosPorDia = [];
    
    const todasAsDatasSet = new Set([
        ...Object.keys(extratoByDay),
        ...Object.keys(financeiroByDay)
    ]);
    const todasAsDatas = Array.from(todasAsDatasSet).sort();

    let totalDias = 0;
    let diasConciliados = 0;
    let diasDivergentes = 0;
    let diferencaDebito = 0;
    let diferencaCredito = 0;

    for (const data of todasAsDatas) {
        totalDias++;
        const e = extratoByDay[data] || { debito: 0, credito: 0, lancamentos: [], dataDisplay: formatDataIsoDisplay(data) };
        const f = financeiroByDay[data] || { debito: 0, credito: 0, lancamentos: [], dataDisplay: formatDataIsoDisplay(data) };

        const deltaDebito = Number((e.debito - f.debito).toFixed(2));
        const deltaCredito = Number((e.credito - f.credito).toFixed(2));
        
        const isConciliado = Math.abs(deltaDebito) <= 0.05 && Math.abs(deltaCredito) <= 0.05;
        const status = isConciliado ? 'CONCILIADO' : 'DIVERGENTE';
        
        if (isConciliado) diasConciliados++;
        else diasDivergentes++;

        diferencaDebito += deltaDebito;
        diferencaCredito += deltaCredito;

        resultadosPorDia.push({
            data,
            dataDisplay: e.dataDisplay || f.dataDisplay || data,
            extratoDebito: e.debito,
            extratoCredito: e.credito,
            financeiroDebito: f.debito,
            financeiroCredito: f.credito,
            deltaDebito,
            deltaCredito,
            status,
            extratoLancamentos: e.lancamentos,
            financeiroLancamentos: f.lancamentos,
        });
    }

    return {
        resultadosPorDia: resultadosPorDia.sort((a,b) => a.data.localeCompare(b.data)),
        categorias,
        contadores: {
            diasTotal: totalDias,
            diasConciliados,
            diasDivergentes,
            diferencaDebito,
            diferencaCredito
        }
    };
}

function formatDataIsoDisplay(iso) {
    if (!iso || iso.length !== 10) return iso;
    const parts = iso.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
}
