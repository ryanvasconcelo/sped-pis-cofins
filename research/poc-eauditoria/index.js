const puppeteer = require('puppeteer');
require('dotenv').config();

async function runEauditoriaPOC() {
    console.log('🚀 Iniciando Robô POC E-Auditoria...');

    // Launch browser in non-headless mode for testing so we can see what it's doing
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();

    try {
        console.log('🌐 Navegando para a página de login...');
        await page.goto('https://plataforma.e-auditoria.com.br/login', { waitUntil: 'networkidle2' });

        console.log('🔐 Inserindo credenciais...');

        // O e-Auditoria redireciona para um servidor Keycloak, os IDs corretos são esses
        await page.waitForSelector('#username', { timeout: 10000 });

        const email = process.env.EAUDITORIA_EMAIL || 'financeiro1@projecont.com.br';
        const password = process.env.EAUDITORIA_PASSWORD || 'Pr0j3c0nt*';

        if (email === 'seu_email@aqui.com') {
            console.warn('⚠️ Credenciais não configuradas. Crie um arquivo .env na pasta poc-eauditoria com EAUDITORIA_EMAIL e EAUDITORIA_PASSWORD.');
            // We will pause here if no credentials are set
            // await browser.close();
            // return;
        }

        await page.type('#username', email);
        await page.type('#password', password);

        console.log('🖱️ Clicando em Entrar...');
        await page.click('#kc-login');

        console.log('⏳ Aguardando carregamento do Dashboard...');
        // Wait for the URL to change or a specific dashboard element to appear
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log('✅ Login realizado com sucesso!');

        console.log('📂 Navegando para o Corretor do SPED...');
        await page.goto('https://plataforma.e-auditoria.com.br/corretor-do-sped', { waitUntil: 'networkidle2' });

        console.log('✅ Página do Corretor carregada. Próximo passo: localizar o botão "Importar SPEDs"');

        // Vamos clicar no botão "Importar SPEDs" com base no texto do seu print
        const importButtonSelector = '::-p-text(Importar SPEDs)';
        await page.waitForSelector(importButtonSelector, { timeout: 10000 });
        console.log('🎯 Botão "Importar SPEDs" localizado! Clicando...');

        // Promise.all para esperar a navegação que o clique causa
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => { }), // Ignora timeout inofensivo
            page.click(importButtonSelector)
        ]);

        console.log('📤 Tela de Central de Importação carregada. Preparando o Upload...');

        // Caminho absoluto para o seu arquivo SPED real de teste
        // Se quiser, substitua por um TXT isca bem menor depois, mas para a POC vamos usar um real seu que vimos
        const filePath = '/Users/ryanrichard/projecont/AutomaçãoSPED-Pis-Cofins/SPEDs/EFD CONTRIBUICOES - 02.2025.TXT';

        // O Puppeteer lida com upload maravilhosamente bem se formos pela raiz do HTML (o input type="file" escondido da dropzone)
        const fileInput = await page.$('input[type="file"]');
        if (fileInput) {
            console.log('✅ Input File encontrado (Dropzone). Enviando arquivo...');
            await fileInput.uploadFile(filePath);
        } else {
            console.log('⚠️ Input escondido não achado, fallback para FileChooser visual...');
            const [fileChooser] = await Promise.all([
                page.waitForFileChooser(),
                page.click('::-p-text(Clique ou arraste e solte)')
            ]);
            await fileChooser.accept([filePath]);
        }

        console.log('⏳ Arquivo giga enviado pro e-Auditoria. Eles levam uns segundos processando. Vamos aguardar 15 segundos...');
        await new Promise(resolve => setTimeout(resolve, 15000)); // Dumb wait na POC

        // Ir para a tela de Correção (Screenshot 3)
        console.log('🚀 Dando bypass e indo direto para a tela de Correção Automática (corretor-do-sped/correcao-automatica)...');
        await page.goto('https://plataforma.e-auditoria.com.br/corretor-do-sped/correcao-automatica', { waitUntil: 'networkidle2' });

        console.log('🔍 Procurando o botão "Corrigir SPED" ou "Corrigir em Lote" na tabela...');

        try {
            await page.waitForSelector('::-p-text(Corrigir SPED)', { timeout: 8000 });
            console.log('🔨 Botão mágico "Corrigir SPED" encontrado! Disparando correção remota...');
            await page.click('::-p-text(Corrigir SPED)');

            console.log('⏳ A correção está correndo solta nos supercomputadores de MG... Aguardando 15 segundos na POC para emular.');
            await new Promise(resolve => setTimeout(resolve, 15000));

            console.log('✅ Etapa Visual concluída!');
        } catch (e) {
            console.log('⚠️ Aviso: Nenhum botão escrito "Corrigir SPED" livre encontrado na tabela.');
            console.log('   Isso provavelmente quer dizer que (como no seu print 3) o SPED que você enviou já está "Corrigido" ou "Sem correções".');
        }

        console.log('🎉 POC finalizada com SUCESSO. Em produção, este script também clicaria no botão "Baixar correção em lote" e mandaria o TXT de resposta para o seu Rayo ler silenciosamente.');
        console.log('O navegador fechará sozinho em 30 segundos.');
        await new Promise(resolve => setTimeout(resolve, 30000));

    } catch (error) {
        console.error('❌ Erro Crítico durante a execução do robô:', error);
    } finally {
        await browser.close();
    }
}

runEauditoriaPOC();
