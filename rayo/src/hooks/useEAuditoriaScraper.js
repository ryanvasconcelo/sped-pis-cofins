/**
 * Hook: useEAuditoriaScraper
 *
 * Gerencia o fluxo de automação do e-Auditoria via servidor local (porta 3001).
 * Extrai NCMs únicos do Livrão e aciona o robô Puppeteer.
 *
 * Estados do stepper:
 *   idle → extracting → scraping → done | error
 */

import { useState, useCallback, useRef } from 'react';
import { SERVER_URL } from '../config';

export const SCRAPER_STATUS = {
    IDLE: 'IDLE',
    VERIFICANDO: 'verificando',   // Testando se o servidor está online
    EXTRAINDO: 'extracting',      // Extraindo NCMs únicos do Livrão
    BUSCANDO: 'scraping',         // Robô rodando no e-Auditoria
    CONCLUIDO: 'done',
    ERRO: 'error',
    OFFLINE: 'offline',           // Servidor não disponível — fallback manual
};

export function useEAuditoriaScraper() {
    const [status, setStatus] = useState(SCRAPER_STATUS.IDLE);
    const [progresso, setProgresso] = useState('');
    const [serverOnline, setServerOnline] = useState(null); // null = não verificado
    const abortControllerRef = useRef(null);

    /**
     * Verifica se o servidor local está rodando
     */
    const verificarServidor = useCallback(async () => {
        try {
            const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
            const online = res.ok;
            setServerOnline(online);
            return online;
        } catch {
            setServerOnline(false);
            return false;
        }
    }, []);

    /**
     * Extrai NCMs únicos do array de linhas do Livrão
     */
    const extrairNcms = (alterdataRows) => {
        const ncmsUnicos = new Set();
        alterdataRows.forEach(row => {
            // O row pode ser um objeto com 'Classificação' ou apenas uma string
            const classificationStr = typeof row === 'object' ? String(row['Classificação'] || '') : String(row || '');
            const ncm = classificationStr.replace(/\D/g, '');
            if (ncm.length >= 8) ncmsUnicos.add(ncm.substring(0, 8)); // Pega os 8 primeiros dígitos
        });
        return [...ncmsUnicos];
    };

    /**
     * Executa o scraping completo:
     * 1. Verifica se o servidor está online
     * 2. Extrai NCMs do Livrão
     * 3. Chama o endpoint /api/scrape-eauditoria
     * 4. Retorna as regras ou null se falhar
     *
     * @param {Array}  alterdataRows - Linhas do Livrão parseado
     * @param {Object} perfil        - { uf, atividade, regime, regimeEspecial }
     * @returns {Promise<Array|null>} Array de regras ou null em caso de erro/offline
     */
    const executarScraping = useCallback(async (alterdataRows, perfil) => {
        // ETAPA 0: Verificar servidor
        setStatus(SCRAPER_STATUS.VERIFICANDO);
        setProgresso('Verificando servidor de automação...');

        const online = await verificarServidor();
        if (!online) {
            setStatus(SCRAPER_STATUS.OFFLINE);
            setProgresso('Servidor offline — use o upload manual da base e-Auditoria.');
            return null;
        }

        // ETAPA 1: Extrair NCMs
        setStatus(SCRAPER_STATUS.EXTRAINDO);
        setProgresso('Extraindo NCMs únicos do Livrão...');
        await new Promise(r => setTimeout(r, 200)); // Deixa a UI renderizar

        const ncms = extrairNcms(alterdataRows);
        if (ncms.length === 0) {
            setStatus(SCRAPER_STATUS.ERRO);
            setProgresso('Nenhum NCM válido encontrado no Livrão.');
            return null;
        }

        setProgresso(`${ncms.length} NCMs únicos encontrados. Iniciando robô...`);

        // ETAPA 2: Scraping
        setStatus(SCRAPER_STATUS.BUSCANDO);
        setProgresso(`Iniciando robô no e-Auditoria...`);

        // Simulação de progresso para aliviar UX (overhead real de ~50s)
        let tempoDecorrido = 0;
        const mensagensUX = [
            { t: 0, msg: "Iniciando robô local..." },
            { t: 3, msg: "Fazendo login seguro no SSO e-Auditoria..." },
            { t: 10, msg: "Login concluído. Navegando para painel fiscal..." },
            { t: 18, msg: "Preenchendo Perfil (UF, Atividade, Regime)..." },
            { t: 26, msg: `Inserindo lote de ${ncms.length} NCMs...` },
            { t: 35, msg: "Processando análise tributária no portal..." },
            { t: 45, msg: "Gerando a planilha de Exportação..." },
            { t: 52, msg: "Aguardando download final..." }
        ];

        const intervaloUX = setInterval(() => {
            tempoDecorrido++;
            const atual = mensagensUX.slice().reverse().find(m => tempoDecorrido >= m.t);
            if (atual) {
                setProgresso(atual.msg);
            }
        }, 1000);

        try {
            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;

            const res = await fetch(`${SERVER_URL}/api/scrape-eauditoria`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ncms,
                    uf: perfil.uf,
                    atividade: perfil.atividade,
                    regime: perfil.regime,
                    regimeEspecial: perfil.regimeEspecial || ''
                }),
                signal // We use standard abort signal from controller
            });

            clearInterval(intervaloUX);

            if (!res.ok) {
                const err = await res.json();
                setStatus(SCRAPER_STATUS.ERRO);
                setProgresso(err.detalhe ? `${err.error} Detalhes: ${err.detalhe}` : (err.sugestao || err.error || 'Erro desconhecido no servidor.'));
                return null;
            }

            const { rules, total } = await res.json();
            setStatus(SCRAPER_STATUS.CONCLUIDO);
            setProgresso(`✅ ${total} regras fiscais baixadas automaticamente.`);
            return rules;

        } catch (err) {
            clearInterval(intervaloUX);
            console.error('[useEAuditoriaScraper] Falha:', err);

            if (err.name === 'AbortError') {
                setStatus(SCRAPER_STATUS.IDLE);
                setProgresso('Automação cancelada pelo usuário.');
            } else if (err.name === 'TimeoutError') {
                setStatus(SCRAPER_STATUS.ERRO);
                setProgresso('Timeout: o robô da e-Auditoria demorou mais de 2 minutos. Use o upload manual.');
            } else {
                setStatus(SCRAPER_STATUS.ERRO);
                setProgresso(`Falha de comunicação: ${err.message}. Servidor offline ou desconectado.`);
            }
            return null;
        }
    }, [verificarServidor]);

    const cancelarScraping = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    const resetScraper = useCallback(() => {
        setStatus(SCRAPER_STATUS.IDLE);
        setProgresso('');
    }, []);

    return {
        status,
        progresso,
        serverOnline,
        verificarServidor,
        executarScraping,
        cancelarScraping,
        resetScraper,
    };
}
