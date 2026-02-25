/**
 * RAYO HUB — Motor de Auditoria ICMS
 * Análise Combinatória de CST baseada na Transcrição do Kickoff (Alisson/Analista).
 *
 * Guardrails SOP-IA: Este arquivo é CORE puro — sem imports de UI/React.
 * Toda lógica aqui é testável via vitest sem navegador.
 */

// ─── CFOPs de Exceção Contextual (Alerta Amarelo) ─────────────────────────────
// Kickoff: "Uso/consumo, comodato — identificar mas não dar erro vermelho"
const CFOP_EXCECAO_AMARELA = new Set(['1556', '2556', '1908', '2908', '1949', '2949']);

// ─── CFOPs de Devolução (Erro Vermelho — comentário do usuário: "vermelho") ────
const CFOP_DEVOLUCAO = new Set(['1201', '2201', '1202', '2202']);

/**
 * Análise Combinatória de CST — ignora o 1º dígito (Origem).
 * Kickoff: "O 1º dígito diz a origem. Pra gente não significa muita coisa."
 */
const compararCstCombinatorio = (natureza, cstOriginal, cstBase) => {
    // Extrai apenas os 2 últimos dígitos (raiz)
    const raizOriginal = String(cstOriginal).padStart(3, '0').slice(-2);
    const raizBase = String(cstBase).padStart(3, '0').slice(-2);

    if (raizOriginal === raizBase) {
        return { status: 'ok' };
    }

    // Kickoff: "00 e 20 são a mesma tribo. 00 tributado integralmente, 20 com redução."
    const grupoTributadoComercio = ['00', '20'];
    // Kickoff: "Indústria: 00, 10, 20, 30 e 70 participam do mesmo bolo combinatório."
    const grupoTributadoIndustria = ['00', '10', '20', '30', '70'];

    const grupoValido = (natureza === 'industria') ? grupoTributadoIndustria : grupoTributadoComercio;

    if (grupoValido.includes(raizOriginal) && grupoValido.includes(raizBase)) {
        return {
            status: 'alerta',
            detalhe: `Variação Combinatória: esperava a raiz ${raizBase}, recebida ${raizOriginal}. Ambas são do grupo Tributado (${natureza}), operação válida mas requer atenção.`
        };
    }

    return {
        status: 'erro',
        detalhe: `Divergência Crítica: a regra exige equivalência à raiz CST ${raizBase}, mas foi recebida a raiz ${raizOriginal}.`
    };
};

/**
 * Recalcula a Base de Cálculo do ICMS conforme fórmula legislativa:
 * Base = Valor Item − Descontos + Despesas Acessórias + Frete + Seguro
 * Aplica % de redução se a regra do e-Auditoria determinar.
 * Zera a base se o CST esperado for 60 (ST cobrado anteriormente).
 */
export const calcularBaseCerta = (linha, regra, cstRaizEsperado) => {
    // CST 60 = ICMS cobrado anteriormente por ST. Base ICMS própria = R$0,00
    if (cstRaizEsperado === '60') {
        return 0.00;
    }

    const vlItem = parseFloat(linha['Valor Total Item']) || 0;
    const desc = parseFloat(linha['Descontos']) || 0;
    const despAc = parseFloat(linha['Despesas Acessórias']) || 0;
    const frete = parseFloat(linha['Valor Frete']) || 0;
    // Seguro: coluna opcional — algumas empresas têm, outras não (comentário do usuário)
    const seguro = parseFloat(linha['Valor Seguro']) ||
        parseFloat(linha['Seguro']) ||
        parseFloat(linha['VL_SEG']) || 0;

    let baseIntegral = vlItem - desc + despAc + frete + seguro;

    // Redução de base de cálculo (ex: incentivo fiscal, importação com redução 33,33%)
    if (regra && regra['% RED. BASE DE CÁLCULO ICMS']) {
        const strRed = String(regra['% RED. BASE DE CÁLCULO ICMS']).replace(',', '.');
        const pctReducao = parseFloat(strRed) || 0;

        if (pctReducao > 0) {
            const multiplicador = (100 - pctReducao) / 100;
            baseIntegral = baseIntegral * multiplicador;
        }
    }

    return baseIntegral;
};

/**
 * Função principal de Auditoria — Motor ICMS
 *
 * @param {Array}  alterdataRows   - Array de linhas do Livrão Bruto (parseAlterdata)
 * @param {Array}  eAuditoriaRows  - Array de regras do e-Auditoria (parseEAuditoria)
 * @param {Object} perfil          - { natureza: 'comercio'|'industria', regime: string }
 * @returns {{ report: Array, correctedData: Array, ncmSemCobertura: Array }}
 */
export const runAudit = (alterdataRows, eAuditoriaRows, perfil) => {
    const report = [];
    const ncmSemCobertura = new Map(); // NCMs não encontrados na base — auditoria manual obrigatória
    const correctedData = JSON.parse(JSON.stringify(alterdataRows)); // Deep copy — preserva o original

    // Índice O(1) do e-Auditoria por NCM limpo
    const baseMap = new Map();
    eAuditoriaRows.forEach(row => {
        const ncm = String(row['NCM']).replace(/\D/g, '');
        baseMap.set(ncm, row);
    });

    correctedData.forEach((row, index) => {
        const numLinha = index + 2; // +2 = cabeçalho na linha 1 do Excel

        const ncmBruto = row['Classificação'];
        if (!ncmBruto) return; // Linha vazia — pula

        const ncmLimpo = String(ncmBruto).replace(/\D/g, '');
        const cstOriginal = String(row['CST ICMS']).padStart(3, '0');
        const cfopOriginal = String(row['CFOP']).replace(/\D/g, '');
        const raizInformada = cstOriginal.slice(-2);

        // ── Resolve tipo de operação ──────────────────────────────────────────
        const isExcecaoAmarela = CFOP_EXCECAO_AMARELA.has(cfopOriginal);
        const isDevolucao = CFOP_DEVOLUCAO.has(cfopOriginal);

        const regra = baseMap.get(ncmLimpo);

        // ═══════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 0 — NCM não mapeado na base do e-Auditoria
        // Comentário usuário: "retornar aviso de alta severidade — precisa auditar manual"
        // ═══════════════════════════════════════════════════════════════════════
        if (!regra) {
            // Agrupa NCMs sem cobertura para exibição em seção separada na UI
            if (!ncmSemCobertura.has(ncmBruto)) {
                ncmSemCobertura.set(ncmBruto, { ncm: ncmBruto, linhas: [], descricao: row['Descrição'] || '' });
            }
            ncmSemCobertura.get(ncmBruto).linhas.push(numLinha);

            report.push({
                linha: numLinha,
                ncm: ncmBruto,
                cst: cstOriginal,
                cfop: cfopOriginal,
                severidade: 'erro', // Alta severidade — comentário do usuário
                motivo: 'NCM não auditado — Análise Manual Obrigatória',
                detalhe: 'Este NCM não retornou na base do e-Auditoria. A tributação não pode ser validada automaticamente. Auditoria manual é obrigatória antes do envio ao SPED.',
                correcaoAplicada: null
            });
            return;
        }

        const cstBase = String(regra['CST/CSOSN']).padStart(3, '0');
        const raizEsperada = cstBase.slice(-2);

        // ═══════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 1 — Matemática da Base de Cálculo
        // Fórmula: Valor − Desconto + Acessórias + Frete + Seguro (± tolerância R$0,05)
        // ═══════════════════════════════════════════════════════════════════════
        const bcMapeada = calcularBaseCerta(row, regra, raizEsperada);
        const bcInformada = parseFloat(row['ICMS Base item']) || 0;

        let erroMatematico = false;
        // Tolerância R$0,05 — arredondamento natural do ERP (comentário: "deixe claro no painel")
        if (Math.abs(bcMapeada - bcInformada) > 0.05) {
            erroMatematico = true;
            report.push({
                linha: numLinha,
                ncm: ncmBruto,
                cst: cstOriginal,
                cfop: cfopOriginal,
                severidade: 'erro',
                motivo: 'Erro Matemático na Base de Cálculo',
                detalhe: `Base calculada (ST/Reduções aplicadas): R$ ${bcMapeada.toFixed(2)} | Base informada: R$ ${bcInformada.toFixed(2)} | Diferença: R$ ${Math.abs(bcMapeada - bcInformada).toFixed(2)}.`,
                correcaoAplicada: null // preenchido abaixo se corrigido
            });
        }

        // ═══════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 2 — ST Invertido (NOVO — bidirecional)
        // Motor detecta quando Alterdata informa CST 60 mas a regra exige tributação
        // Kickoff: "CST 60 com base → ALERTA VERMELHO"
        // ═══════════════════════════════════════════════════════════════════════
        if (raizInformada === '60' && raizEsperada !== '60') {
            report.push({
                linha: numLinha,
                ncm: ncmBruto,
                cst: cstOriginal,
                cfop: cfopOriginal,
                esperado: cstBase,
                severidade: 'erro',
                motivo: 'ST Indevido — Tributação Irregular',
                detalhe: `CST informado é 0${raizInformada} (ST cobrado anteriormente), mas a regra do e-Auditoria indica tributação normal (CST ${cstBase}). Crédito de ICMS pode estar sendo sonegado ou base indevidamente zerada. Verificação urgente antes do SPED.`,
                correcaoAplicada: null
            });
        }

        // ═══════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 3 — CFOP × Natureza da Operação (NOVO — validação ativa)
        // Kickoff: "O CFOP da operação condiz com a natureza esperada para aquele produto?"
        // ═══════════════════════════════════════════════════════════════════════
        if (isDevolucao) {
            // Comentário do usuário: "devolução → vermelho"
            report.push({
                linha: numLinha,
                ncm: ncmBruto,
                cst: cstOriginal,
                cfop: cfopOriginal,
                severidade: 'erro',
                motivo: 'CFOP de Devolução — Verificação Obrigatória',
                detalhe: `CFOP ${cfopOriginal} é uma operação de devolução. Verifique se o ICMS da devolução está sendo corretamente creditado e se o CST ${cstOriginal} condiz com a operação original que está sendo devolvida.`,
                correcaoAplicada: null
            });
        }

        // ═══════════════════════════════════════════════════════════════════════
        // VALIDAÇÃO 4 — Análise Combinatória de CST
        // ═══════════════════════════════════════════════════════════════════════
        const resultadoCst = compararCstCombinatorio(perfil.natureza, cstOriginal, cstBase);

        if (resultadoCst.status !== 'ok') {
            if (isExcecaoAmarela) {
                // Uso/Consumo, Comodato, Outros — divergência é contextual, não erro
                // Kickoff: "Ele abaixa as armas e muda para Alerta Amarelo Excepcional"
                report.push({
                    linha: numLinha,
                    ncm: ncmBruto,
                    cst: cstOriginal,
                    cfop: cfopOriginal,
                    esperado: cstBase,
                    severidade: 'alerta',
                    motivo: 'Operação de Exceção (Uso/Consumo ou Comodato)',
                    detalhe: `CST ${cstOriginal} difere da regra (${cstBase}), mas o CFOP ${cfopOriginal} indica operação de exceção contextual. Análise humana necessária — o motor não corrige automaticamente estas linhas.`,
                    correcaoAplicada: null
                });
            } else {
                report.push({
                    linha: numLinha,
                    ncm: ncmBruto,
                    cst: cstOriginal,
                    cfop: cfopOriginal,
                    esperado: cstBase,
                    severidade: resultadoCst.status,
                    motivo: resultadoCst.status === 'erro'
                        ? 'CST divergente da Base Auditada (Erro Crítico)'
                        : 'Variação de CST Tributável (Atenção)',
                    detalhe: `CFOP ${cfopOriginal}: ${resultadoCst.detalhe}`,
                    correcaoAplicada: null
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // AUTO-CORREÇÃO DA PLANILHA — Só opera em faturamentos normais
        // Comentário do usuário: "Excel output deve manter o mesmo padrão do input"
        // Correções são registradas em correcaoAplicada para exibição no DASHBOARD
        // ═══════════════════════════════════════════════════════════════════════
        const podeCorrigir = !isExcecaoAmarela && !isDevolucao;

        if (podeCorrigir) {
            // Corrigir base matemática
            if (erroMatematico) {
                const valorAntes = row['ICMS Base item'];
                row['ICMS Base item'] = Number(bcMapeada.toFixed(2));
                // Atualiza o apontamento matemático com a informação de correção
                const apontamentoMatematico = report.findLast(r => r.linha === numLinha && r.motivo.includes('Matemático'));
                if (apontamentoMatematico) {
                    apontamentoMatematico.correcaoAplicada = {
                        campo: 'ICMS Base item',
                        valorAntes: valorAntes,
                        valorDepois: row['ICMS Base item']
                    };
                }
            }

            // Corrigir CST crítico — preserva o dígito de origem do Alterdata
            // Kickoff: "Mantém a origem (1ºdígito) + Raiz Base (2 últimos dígitos)"
            if (resultadoCst.status === 'erro') {
                const digitoOrigem = cstOriginal.charAt(0) || '0';
                const cstCorrigido = digitoOrigem + raizEsperada;
                const valorAntesCst = row['CST ICMS'];
                row['CST ICMS'] = cstCorrigido;
                // Atualiza o apontamento de CST com a informação de correção
                const apontamentoCst = report.findLast(r => r.linha === numLinha && r.motivo.includes('CST divergente'));
                if (apontamentoCst) {
                    apontamentoCst.correcaoAplicada = {
                        campo: 'CST ICMS',
                        valorAntes: valorAntesCst,
                        valorDepois: cstCorrigido
                    };
                }
            }
        }
    });

    return {
        report,
        correctedData,
        ncmSemCobertura: [...ncmSemCobertura.values()]
    };
};
