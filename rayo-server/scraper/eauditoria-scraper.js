/**
 * RAYO HUB — Scraper Puppeteer para e-Auditoria
 * Módulo: Consulta de Regras Fiscais por NCM
 *
 * URL alvo: https://regrasfiscais.e-auditoria.com.br/consulta/regras-fiscais
 * Login: https://plataforma.e-auditoria.com.br/login (Keycloak)
 *
 * Fluxo:
 *   1. Login (reutilizado da POC que já funcionou)
 *   2. Navegar para a tela de consulta
 *   3. Preencher Perfil (UF, Atividade, Regime, RegimeEspecial)
 *   4. Inserir NCMs
 *   5. Executar consulta
 *   6. Baixar planilha de regras
 *   7. Parsear e retornar JSON
 */

const puppeteer = require('puppeteer');
const XLSX = require('xlsx');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Mapeamento dos valores da UI do Rayo → labels do e-Auditoria
const ATIVIDADE_MAP = {
    'GERAL': 'Geral',
    'ATACADO': 'Atacado',
    'VAREJO': 'Varejo',
    'FARMA': 'Farma',      // Sem acento para busca mais resiliente (acha Farmácia/Farmácias)
    'CONSTRUCAO': 'Constru', // Acha Construção
    'INDUSTRIA': 'Indús',  // Acha Indústria
};

const REGIME_MAP = {
    'GERAL': 'Geral',
    'LUCRO REAL': 'Lucro Real',
    'LUCRO PRESUMIDO': 'Lucro Presumido',
    'SIMPLES': 'Simples Nacional',
};

/**
 * Seleciona um item em um dropdown Ant Design (React) no e-Auditoria.
 * O AntD renderiza um `input` mascarado, e as opções vão para o final da página num Portal.
 */
async function selecionarDropdownAntD(page, inputId, valorDesejado) {
    let tentativas = 0;
    while (tentativas < 3) {
        try {
            const selectorInput = `#${inputId}`;

            // Checar se o elemento existe no DOM sem exigir visibilidade (AntD esconde o search input original)
            const existe = await page.evaluate((id) => !!document.getElementById(id), inputId);
            if (!existe) {
                console.warn(`[Rayo Scraper] ⚠️ Dropdown ${inputId} não encontrado na DOM.`);
                return false;
            }

            // 1. Focar atirando com Mouse na caixa pai
            const boxClick = await page.evaluate((id) => {
                const el = document.getElementById(id);
                if (!el) return null;
                const sel = el.closest('.ant-select-selector');
                if (!sel) return null;
                const rect = sel.getBoundingClientRect();
                return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            }, inputId);

            if (boxClick) {
                await page.mouse.click(boxClick.x, boxClick.y);
                await new Promise(r => setTimeout(r, 600)); // Tempo para abrir a lista / focar
            } else {
                return false;
            }

            // 2. Disparar letras e forçar seleções
            await page.keyboard.type(valorDesejado, { delay: 60 });
            await new Promise(r => setTimeout(r, 800)); // Espera filtrar e animar

            // 3. Capturar elemento filtrado real de fato! Em vez de "Enter", caçamos fisicamente sua CAIXA e atiramos com Mouse.
            const clickCoordOpt = await page.evaluate((valor) => {
                const abertos = [...document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden)')];
                const target = valor.toLowerCase();

                for (const drop of abertos) {
                    const options = [...drop.querySelectorAll('.ant-select-item-option')];
                    for (const o of options) {
                        const txt = (o.getAttribute('title') || o.textContent || '').trim().toLowerCase();
                        if (txt === target || txt.includes(target) || target.includes(txt)) {
                            o.scrollIntoView({ block: 'center' });
                            const rec = o.getBoundingClientRect();
                            return { x: rec.left + rec.width / 2, y: rec.top + rec.height / 2 };
                        }
                    }
                }
                return null;
            }, valorDesejado);

            if (clickCoordOpt) {
                // Tiro perfeito de Mouse na "Opcao" do Antd
                await page.mouse.click(clickCoordOpt.x, clickCoordOpt.y);
                await new Promise(r => setTimeout(r, 500));
            } else {
                console.warn(`[Rayo Scraper] ⚠️ Opt '${valorDesejado}' não localizada na DOM. Apertarei Enter como Fallback.`);
                await page.keyboard.press('Enter');
                await new Promise(r => setTimeout(r, 500));
                await page.keyboard.press('Tab');
            }

            // 4. VERIFICAÇÃO DE GARANTIA: O React aceitou?
            const valorAtual = await page.evaluate((id) => {
                const el = document.getElementById(id);
                if (!el) return '';
                const parent = el.closest('.ant-select-selector');
                if (!parent) return '';
                const span = parent.querySelector('.ant-select-selection-item');
                return span ? (span.getAttribute('title') || span.textContent || '').trim().toLowerCase() : '';
            }, inputId);

            const targetVal = valorDesejado.toLowerCase();

            if (valorAtual === targetVal || valorAtual.includes(targetVal) || targetVal.includes(valorAtual)) {
                console.log(`[Rayo Scraper] ✅ Filtrou, Selecionou e Validou '${valorDesejado}' em ${inputId}`);
                await new Promise(r => setTimeout(r, 400));
                return true;
            } else {
                console.warn(`[Rayo Scraper] ⚠️ O select ${inputId} não fixou '${valorDesejado}'. Valor ficou '${valorAtual}'. Tentando de novo...`);
                // Clicar fora para resetar painel sem apertar Escape! (Escape quebra Perfil Modal)
                await page.mouse.click(20, 20);
                await new Promise(r => setTimeout(r, 300));
                tentativas++;
            }

        } catch (e) {
            console.warn(`[Rayo Scraper] ⚠️ Erro transiente ao digitar em ${inputId}:`, e.message);
            tentativas++;
        }
    }

    console.warn(`[Rayo Scraper] 🚨 Falha final ao selecionar '${valorDesejado}' em ${inputId} após 3 tentativas.`);
    return false;
}

/**
 * Função principal de scraping.
 * @param {Object} params
 * @param {string[]} params.ncms      - Array de NCMs limpos (só dígitos)
 * @param {string}   params.uf        - UF da empresa (ex: 'AM')
 * @param {string}   params.atividade - Atividade (valor do enum da UI)
 * @param {string}   params.regime    - Regime Tributário (valor do enum da UI)
 * @param {string}   params.regimeEspecial - Regime Especial (opcional)
 * @returns {Promise<Array>} Array de regras fiscais (mesmo formato do parseEAuditoria)
 */
async function scrapeEAuditoria({ ncms, uf, atividade, regime, regimeEspecial }) {
    console.log(`[Rayo Scraper] Iniciando para ${ncms.length} NCMs | UF: ${uf} | Atividade: ${atividade} | Regime: ${regime}`);

    const browser = await puppeteer.launch({
        headless: true, // Mudado para false a pedido do usuário para visualização / debug
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Evita crash em Linux server
            '--start-maximized'
        ],
        defaultViewport: null // Deixa o tamanho da janela controlar o viewport
    });

    const page = await browser.newPage();
    // Timeout global de 120s por operação (lotes grandes no e-Auditoria demoram)
    page.setDefaultTimeout(120000);

    // Diretório temporário para o download da planilha
    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rayo-'));
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: downloadDir,
    });

    try {
        // ── ETAPA 1: Login ──────────────────────────────────────────────────
        console.log('[Rayo Scraper] Etapa 1/5: Login no e-Auditoria...');
        await page.goto('https://plataforma.e-auditoria.com.br/login', { waitUntil: 'domcontentloaded' });

        await page.waitForSelector('#username');

        const email = process.env.EAUDITORIA_EMAIL;
        const password = process.env.EAUDITORIA_PASSWORD;

        if (!email || !password) {
            throw new Error('Credenciais do e-Auditoria não encontradas no arquivo .env (EAUDITORIA_EMAIL/EAUDITORIA_PASSWORD)');
        }

        await page.type('#username', email);
        await page.type('#password', password);
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
            page.click('#kc-login')
        ]);
        console.log('[Rayo Scraper] ✅ Login OK');

        // ── ETAPA 2: Navegar para Regras Fiscais ────────────────────────────
        console.log('[Rayo Scraper] Etapa 2/5: Navegando para consulta de regras fiscais...');
        await page.goto('https://regrasfiscais.e-auditoria.com.br/consulta/regras-fiscais', { waitUntil: 'domcontentloaded' });

        // ── ETAPA 3: Preencher Perfil (no Modal que abre automaticamente) ────────────
        console.log('[Rayo Scraper] Etapa 3/5: Preenchendo perfil da empresa no modal...');

        // 3.1 Esperar o modal de perfil e fechar aviso amarelo "É preciso definir um perfil..." se existir
        try {
            await page.waitForSelector('.modal, div[role="dialog"]', { visible: true, timeout: 5000 });
        } catch (e) {
            console.log('[Rayo Scraper] Modal não abriu sozinho, tentando clicar em Editar Perfil...');
            await page.evaluate(() => {
                const btns = [...document.querySelectorAll('button, a')];
                const editar = btns.find(b => b.textContent?.trim()?.toLowerCase().includes('editar perfil'));
                if (editar) editar.click();
            });
            await page.waitForSelector('.modal, div[role="dialog"]', { visible: true, timeout: 5000 }).catch(() => { });
        }

        // Tenta fechar o alerta amarelo de erro que bloqueia a UI
        await page.evaluate(() => {
            const spans = [...document.querySelectorAll('span, button')];
            const msgAviso = spans.find(s => s.textContent?.includes('É preciso definir um perfil'));
            if (msgAviso) {
                // Tenta achar o botão de fechar (X) perto da mensagem
                const alertBox = msgAviso.closest('div[role="alert"], .alert');
                if (alertBox) {
                    const closeBtn = alertBox.querySelector('button, .close');
                    if (closeBtn) closeBtn.click();
                }
            }
        });
        await new Promise(r => setTimeout(r, 500));

        // Estratégia: usar strings diretas passadas pelo usuário, convertendo apenas se necessário pelo mapa
        const atividadeLabel = ATIVIDADE_MAP[atividade] || atividade;
        const regimeLabel = REGIME_MAP[regime] || regime;

        // 3.2 Preencher os campos utilizando Componentes Ant Design
        await selecionarDropdownAntD(page, 'select-uf-perfil', uf);
        await selecionarDropdownAntD(page, 'select-atividade-perfil', atividadeLabel);
        await selecionarDropdownAntD(page, 'select-regime-tributario-perfil', regimeLabel);

        if (regimeEspecial && regimeEspecial.trim() !== '') {
            await selecionarDropdownAntD(page, 'select-regime-especial-perfil', regimeEspecial);
        }

        // 3.3 Lidar com a mensagem de alerta/confirmação nativa (se houver) que aparece ao salvar
        page.once('dialog', async dialog => {
            console.log('[Rayo Scraper] ⚠️ Alerta interceptado ao salvar perfil:', dialog.message());
            await dialog.accept();
        });

        // 3.4 Clicar no Salvar do modal pelo ID nativo do botão
        const salvou = await page.evaluate(() => {
            const btnSalvar = document.getElementById('btn-salvar-edicao-perfil');
            if (btnSalvar && !btnSalvar.disabled) {
                btnSalvar.click();
                return true;
            }
            return false;
        });

        if (salvou) {
            // Aguarda a rede ficar silenciosa e modal fechar
            await new Promise(r => setTimeout(r, 1000));
            // Caso não seja um alert nativo, mas um SweetAlert / modal secundário de OK
            await page.evaluate(() => {
                const btns = [...document.querySelectorAll('button')];
                const okBtn = btns.find(b => {
                    const text = b.textContent?.trim()?.toLowerCase() || '';
                    return text === 'ok' || text === 'entendi' || text === 'fechar';
                });
                if (okBtn && okBtn.offsetParent !== null) { // se vísivel
                    okBtn.click();
                }
            });
            console.log('[Rayo Scraper] ✅ Perfil salvo e modais fechados.');
        }

        // ── ETAPA 4: Selecionar Tipo de Consulta e Inserir NCMs no Modal ───────────
        console.log(`[Rayo Scraper] Etapa 4/5: Inserindo ${ncms.length} NCMs (Fluxo Modal de Planilha)...`);

        // 4.1 Mudar de GTIN para NCM no dropdown principal de pesquisa 
        console.log(`[Rayo Scraper] Selecionando 'NCM' no tipo de consulta...`);
        await selecionarDropdownAntD(page, 'select-tipo-consulta', 'NCM');
        await new Promise(r => setTimeout(r, 1000)); // Espera re-render após mudar de pesquisa GTIN pra pesquisa NCM

        // 4.1.5 Fechar modal de aviso "Informação" sobre GTIN/NCM se aparecer
        try {
            console.log(`[Rayo Scraper] Verificando se há modal de aviso de NCM...`);
            const fechouModalAviso = await page.evaluate(() => {
                const btns = [...document.querySelectorAll('.ant-modal-content button, div[role="dialog"] button, button')];
                const btnOk = btns.find(b => {
                    const txt = b.textContent?.trim()?.toLowerCase() || '';
                    return txt === 'ok' || txt.includes('não exibir');
                });

                if (btnOk && btnOk.offsetParent !== null) { // se visível
                    btnOk.click();
                    return true;
                }

                // Tenta fechar no X da modal, caso o botão Ok não seja detectado facilmente
                const btnClose = btns.find(b => b.classList.contains('ant-modal-close') || b.getAttribute('aria-label') === 'Close');
                if (btnClose && btnClose.offsetParent !== null) {
                    btnClose.click();
                    return true;
                }

                return false;
            });

            if (fechouModalAviso) {
                console.log(`[Rayo Scraper] ✅ Modal de aviso NCM fechado.`);
                await new Promise(r => setTimeout(r, 800)); // Espera a animação do modal fechar
            }
        } catch (e) {
            console.warn(`[Rayo Scraper] ⚠️ Erro transiente ao tentar fechar modal de NCM:`, e.message);
        }

        // 4.2 Clicar em "Consulta por Planilha de Excel"
        const modalAberto = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button, a, div[role="button"], span')];
            const btnPlanilha = btns.find(b => b.textContent && b.textContent.includes('Consulta por Planilha de Excel'));
            if (btnPlanilha) {
                btnPlanilha.click();
                return true;
            }
            return false;
        });

        if (!modalAberto) {
            throw new Error(`Botão "Consulta por Planilha de Excel" não encontrado na tela.`);
        }

        // 4.3 Esperar a textarea visível e Colar NCMs (com page.type para o React AntD escutar)
        await page.waitForSelector('textarea', { visible: true, timeout: 5000 });
        console.log(`[Rayo Scraper] ✅ Modal aberto.`);

        const ncmTexto = ncms.join('\n');

        // Limpar e preencher atirando com type, como humano
        await page.click('textarea'); // foca
        await page.click('textarea', { clickCount: 3 });
        await page.keyboard.press('Backspace');

        // Type é lento pra lotes enormes de NCM. Paste é melhor interagindo com Clipboard ou Injected
        await page.evaluate((texto) => {
            const ta = document.querySelector('textarea');
            if (ta) {
                ta.value = texto;
                // Dispatch duplo que o textarea React padrão acata, AntD às vezes engole.
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                ta.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }, ncmTexto);

        // Digitar um "Espaço" e "Backspace" com o Puppeteer no final para Forçar o onChange do React AntD a ver a mudança
        await page.click('textarea');
        await page.keyboard.press('Space');
        await page.keyboard.press('Backspace');

        // 4.5 Clicar em "Consultar NCMs" via Bounding Box nativa
        const coordsConsultar = await page.evaluate(() => {
            const btns = [...document.querySelectorAll('button')];
            const consultar = btns.find(b => {
                const t = b.textContent?.trim()?.toLowerCase() || '';
                return t.includes('consultar ncm') || t.includes('consultar gtin') || t.includes('consultar ean');
            });
            if (consultar && !consultar.disabled) {
                const r = consultar.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }
            return null;
        });

        if (coordsConsultar) {
            await page.mouse.click(coordsConsultar.x, coordsConsultar.y);
            console.log('[Rayo Scraper] ✅ Busca enviada, aguardando painel recarregar...');
        } else {
            console.warn('[Rayo Scraper] ⚠️ Botao consultar não encontrado, pode abortar');
        }

        // Aguardar resultados fecharem o modal e pintarem na tela da listagem (tabela gerada)
        // Em vez de network idle (que pode ser muito lento devido a pings em background), vamos aguardar ativamente o botão surgir.
        console.log('[Rayo Scraper] Etapa 5/5: Aguardando painel recarregar e botão Exportar para Excel aparecer...');

        console.time('[Rayo Scraper Timer] Wait for Export Button');
        const handleDownload = await page.waitForFunction(() => {
            const btns = [...document.querySelectorAll('button, a, [role="button"]')];
            const download = btns.find(b => {
                const t = b.textContent?.trim()?.toLowerCase() || '';
                return t === 'exportar para excel' || t.includes('exportar excel');
            });
            if (download && !download.disabled) {
                const r = download.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) { // Garante visibilidade
                    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
                }
            }
            return null;
        }, { timeout: 120000, polling: 1000 }).catch(() => null);
        console.timeEnd('[Rayo Scraper Timer] Wait for Export Button');

        if (!handleDownload) {
            await page.screenshot({ path: 'debug-tabela-ncm-erro.png', fullPage: true });
            throw new Error('Botão "Exportar para Excel" não apareceu em 120s.');
        }

        const coordsDownload = await handleDownload.jsonValue();
        console.log('[Rayo Scraper] ✅ Botão Exportar encontrado, efetuando o clique...');

        console.time('[Rayo Scraper Timer] Click and Download');
        await page.mouse.click(coordsDownload.x, coordsDownload.y);

        // Aguardar o arquivo aparecer no diretório de download
        const arquivoXlsx = await aguardarDownload(downloadDir, 30000);
        console.timeEnd('[Rayo Scraper Timer] Click and Download');

        console.log(`[Rayo Scraper] ✅ Planilha baixada: ${arquivoXlsx}`);

        console.time('[Rayo Scraper Timer] Parse Excel');
        // ── Parse da Planilha ────────────────────────────────────────────────
        const workbook = XLSX.readFile(arquivoXlsx);
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rules = XLSX.utils.sheet_to_json(firstSheet, { range: 5, defval: null });
        console.timeEnd('[Rayo Scraper Timer] Parse Excel');

        console.log(`[Rayo Scraper] ✅ ${rules.length} regras extraídas. Finalizando...`);
        return rules;

    } finally {
        await browser.close();
        // Limpa arquivos temporários
        fs.rmSync(downloadDir, { recursive: true, force: true });
    }
}

/**
 * Aguarda um arquivo .xlsx aparecer no diretório de download.
 */
function aguardarDownload(dir, timeoutMs) {
    return new Promise((resolve, reject) => {
        const inicio = Date.now();
        const check = setInterval(() => {
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
            if (files.length > 0) {
                clearInterval(check);
                resolve(path.join(dir, files[0]));
            } else if (Date.now() - inicio > timeoutMs) {
                clearInterval(check);
                reject(new Error(`Timeout: nenhum arquivo .xlsx baixado em ${timeoutMs}ms`));
            }
        }, 500);
    });
}

module.exports = { scrapeEAuditoria };

// ── Teste Direto pelo Terminal (CLI) ─────────────────────────────────────────
if (require.main === module) {
    // Carrega o .env localizado um nível acima (na raiz de rayo-server)
    require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

    console.log('[CLI] Iniciando teste manual do scraper...');

    if (!process.env.EAUDITORIA_EMAIL) {
        console.error('[CLI] ERRO: Credenciais EAUDITORIA_EMAIL/PASSWORD não encontradas no .env');
        process.exit(1);
    }

    const mockData = {
        ncms: ['39232190', '22021000', '19053100'],
        uf: 'AM',
        atividade: 'GERAL',
        regime: 'LUCRO REAL',
        regimeEspecial: ''
    };

    scrapeEAuditoria(mockData)
        .then(rules => {
            console.log(`[CLI] Sucesso! ${rules.length} regras extraídas.`);
            console.log(rules.slice(0, 2)); // Mostra as 2 primeiras regras como prova
            process.exit(0);
        })
        .catch(err => {
            console.error('\n[CLI] Falha Crítica:\n', err);
            process.exit(1);
        });
}
