/**
 * useConciliacaoBancaria.js — Hook Universal
 *
 * Agora suporta 3 arquivos:
 * - Extrato Bancário (Validação Diária / Categorias)
 * - Relatório Financeiro (Ponto de partida)
 * - Razão Interno (Destino final)
 */

import { useState, useCallback, useMemo } from 'react';
import { parseRazaoBanco } from '../lib/banco-razao/razao-banco-parser';
import { parseSaldoConta } from '../lib/banco-razao/saldo-conta-parser';
import { parseExtratoBancario } from '../lib/extrato-financeiro/extrato-parser';
import { applyNettingRazao, applyNettingSaldoConta } from '../lib/banco-razao/netting-engine';
import { reconcileBanco, STATUS_BANCO } from '../lib/banco-razao/banco-reconciler';
import { reconcileExtratoFinanceiro } from '../lib/extrato-financeiro/extrato-reconciler';

function saldoToRazaoSchema(lancamentos) {
    return lancamentos.map(l => ({
        ...l,
        doc: l.nrOrigem,
        transacao: l.nrTransacao,
        nome: l.detalhes,
        dataPgtoStr: l.dataStr,
        debito: l.debito,
        credito: l.credito,
        valor: l.cdML,
    }));
}

function razaoToSaldoSchema(lancamentos) {
    return lancamentos.map(l => ({
        ...l,
        nrOrigem: l.doc,
        nrTransacao: l.transacao,
        cdML: l.valor,
        dataStr: l.dataPgtoStr,
    }));
}

export function useConciliacaoBancaria() {
    const [arquivo1, setArquivo1] = useState(null);
    const [arquivo2, setArquivo2] = useState(null);
    const [arquivo3, setArquivo3] = useState(null);
    
    const [status, setStatus] = useState('idle');
    const [erro, setErro] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [filtroStatus, setFiltroStatus] = useState('TODOS');
    const [buscaTexto, setBuscaTexto] = useState('');

    const processar = useCallback(async () => {
        // Pelo menos 2 arquivos são necessários (Financeiro e Razão) para a base. 
        // O extrato é complementar.
        const arquivosValidos = [arquivo1, arquivo2, arquivo3].filter(Boolean);
        if (arquivosValidos.length < 2) {
             setErro('Selecione pelo menos o Relatório Financeiro e o Razão Interno.');
             return;
        }

        setStatus('processing');
        setErro(null);

        try {
            const buffers = await Promise.all(arquivosValidos.map(f => f.arrayBuffer()));
            const names = arquivosValidos.map(f => f.name);

            let parsedSap = null;
            let parsedSimp = null;
            let parsedExt = null;

            let nameSap = '';
            let nameSimp = '';
            let nameExt = '';

            const allParsed = [];

            for (let i = 0; i < buffers.length; i++) {
                const b = buffers[i];
                const name = names[i];
                let detected = null;

                // 1. Tenta como Razão (SAP ou Simplificado)
                try {
                    const res = parseRazaoBanco(b);
                    if (res.layoutDetectado) {
                        detected = { ...res, name };
                    }
                } catch(e) {}

                // 2. Se não identificou, tenta como Saldo (SIMPLIFICADO ou SAP)
                if (!detected) {
                    try {
                        const res = parseSaldoConta(b);
                        if (res.layoutDetectado) {
                            detected = { ...res, name };
                        }
                    } catch(e) {}
                }

                // 3. Se ainda não, ou se for PDF, tenta como Extrato
                if (!detected || name.toLowerCase().endsWith('.pdf')) {
                    try {
                        const res = await parseExtratoBancario(b, name);
                        if (res.layoutDetectado === 'EXTRATO_BANCARIO') {
                            // Se já tínhamos detectado como algo antes (ex: excel), 
                            // o Extrato (que é mais específico p/ PDF) ganha.
                            detected = { ...res, name };
                        }
                    } catch(e) {}
                }

                if (detected) allParsed.push(detected);
            }

            // Organizar os resultados
            const sapFile = allParsed.find(p => p.layoutDetectado === 'SAP');
            const simpFile = allParsed.find(p => p.layoutDetectado === 'SIMPLIFICADO');
            const extratoFile = allParsed.find(p => p.layoutDetectado === 'EXTRATO_BANCARIO');

            if (!sapFile || !simpFile) {
                throw new Error('Para a conciliação completa, identifiquei apenas ' + allParsed.length + ' arquivos válidos. Precisamos de um Razão (SAP) e um Relatório Financeiro (Simplificado).');
            }

            // Normalização para o Schema Interno do Reconciliador
            const normalize = (lancamentos, layout) => {
                return lancamentos.map(l => ({
                    ...l,
                    // Garante que todos tenham os campos esperados pelo banco-reconciler e netting-engine
                    doc: String(l.doc || l.nrOrigem || '').trim(),
                    nrOrigem: String(l.nrOrigem || l.doc || '').trim(),
                    transacao: String(l.transacao || l.nrTransacao || '').trim(),
                    nrTransacao: String(l.nrTransacao || l.transacao || '').trim(),
                    dataStr: l.dataPgtoStr || l.dataStr || '',
                    dataPgtoStr: l.dataPgtoStr || l.dataStr || '',
                    valor: typeof l.valor === 'number' ? l.valor : (typeof l.cdML === 'number' ? l.cdML : (l.debito > 0 ? l.debito : -l.credito)),
                    cdML: typeof l.cdML === 'number' ? l.cdML : (typeof l.valor === 'number' ? l.valor : (l.debito > 0 ? l.debito : -l.credito)),
                    debito: Number(l.debito || 0),
                    credito: Number(l.credito || 0),
                    detalhes: l.detalhes || l.nome || '',
                    nome: l.nome || l.detalhes || ''
                }));
            };

            const razaoLancamentos = normalize(sapFile.lancamentos, 'SAP');
            const saldoLancamentos = normalize(simpFile.lancamentos, 'SIMPLIFICADO');
            let extratoLancamentos = extratoFile ? extratoFile.lancamentos : [];

            nameSap = sapFile.name;
            nameSimp = simpFile.name;
            nameExt = extratoFile ? extratoFile.name : '';


            // === FASE 1: Extrato x Financeiro (Diário) ===
            let analiseExtrato = null;
            if (extratoLancamentos.length > 0) {
                 // Converter o financeiro para o schema que o extrato-reconciler espera
                 const finSchema = saldoLancamentos.map(l => ({
                      id: l.id,
                      dataStr: l.dataPgtoStr || l.dataStr || '',
                      descricao: l.detalhes || l.nome || `Doc: ${l.nrOrigem}`,
                      debito: l.debito,
                      credito: l.credito,
                 }));
                 analiseExtrato = reconcileExtratoFinanceiro(extratoLancamentos, finSchema);
            }

            // === FASE 2: Netting Financeiro x Razão (Linha a Linha) ===
            const nettingRazao = applyNettingRazao(razaoLancamentos);
            const nettingSaldo = applyNettingSaldoConta(saldoLancamentos);

            const conciliacao = reconcileBanco(nettingRazao.ativos, nettingSaldo.ativos);

            setResultado({
                contaNome: simpFile.contaNome || sapFile.contaNome,
                saldoInicial: simpFile.saldoInicial || sapFile.saldoInicial,
                nomeArquivoRazao: nameSap,
                nomeArquivoSaldo: nameSimp,
                nomeArquivoExtrato: nameExt,
                
                // Dados Linha a Linha (Financeiro x Razão)
                nettingRazaoStats: nettingRazao.estatisticas,
                nettingSaldoStats: nettingSaldo.estatisticas,
                saldoAnulados: nettingSaldo.anulados,
                razaoAnulados: nettingRazao.anulados,
                ...conciliacao,

                // Dados Diários (Extrato x Financeiro)
                analiseExtrato
            });

            setStatus('done');
        } catch (err) {
            console.error('[useConciliacaoBancaria] Erro:', err);
            setErro(err.message || 'Erro ao processar arquivos.');
            setStatus('error');
        }
    }, [arquivo1, arquivo2, arquivo3]);

    const limpar = useCallback(() => {
        setArquivo1(null); setArquivo2(null); setArquivo3(null);
        setResultado(null); setStatus('idle'); setErro(null);
    }, []);

    const resultadosFiltrados = useMemo(() => {
        if (!resultado) return [];
        let lista = resultado.resultados || [];
        if (filtroStatus !== 'TODOS') lista = lista.filter(r => r.status === filtroStatus);
        if (buscaTexto.trim()) {
            const q = buscaTexto.toLowerCase();
            lista = lista.filter(r =>
                (r.razaoDoc && String(r.razaoDoc).toLowerCase().includes(q)) ||
                (r.razaoNome && String(r.razaoNome).toLowerCase().includes(q)) ||
                (r.saldoNrOrigem && String(r.saldoNrOrigem).toLowerCase().includes(q)) ||
                (r.saldoDetalhes && String(r.saldoDetalhes).toLowerCase().includes(q))
            );
        }
        return lista;
    }, [resultado, filtroStatus, buscaTexto]);

    return {
        arquivo1, arquivo2, arquivo3, 
        setArquivo1, setArquivo2, setArquivo3,
        status, erro, resultado, resultadosFiltrados,
        filtroStatus, setFiltroStatus, buscaTexto, setBuscaTexto,
        processar, limpar,
        pronto: [arquivo1, arquivo2, arquivo3].filter(Boolean).length >= 2,
        processing: status === 'processing'
    };
}
