/**
 * RAYO HUB — Servidor Express (Microserviço Local)
 * Porta: 3001 | Frontend Rayo: porta 5173
 *
 * Endpoints:
 *   GET  /api/health              → { status: 'ok', version }
 *   GET  /api/queue-status        → { queueLength, processing }
 *   POST /api/scrape-eauditoria   → { ncms, uf, atividade, regime, regimeEspecial } → { rules }
 *
 * Módulos estáticos (build de produção):
 *   /subvencoes-app/*  → build do Auditor de Subvenções ZFM (subvencoes/app/dist)
 *                        Módulo independente: sem acoplamento de lógica com outros módulos.
 *                        Para servir: cd subvencoes/app && npm run build
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { scrapeEAuditoria } = require('./scraper/eauditoria-scraper');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Fila de Requisições (Serialização Anti-Ban) ───────────────────────────────
// Garante que apenas UMA sessão do e-Auditoria roda por vez, evitando
// logins simultâneos que podem acionar proteções anti-bot da plataforma.
let isProcessing = false;
const requestQueue = []; // Array de { resolve, reject, params }

async function processQueue() {
    if (isProcessing || requestQueue.length === 0) return;

    isProcessing = true;
    const { resolve, reject, params } = requestQueue.shift();

    try {
        const rules = await scrapeEAuditoria(params);
        resolve(rules);
    } catch (err) {
        reject(err);
    } finally {
        isProcessing = false;
        processQueue(); // Processa o próximo da fila
    }
}

function enqueue(params) {
    return new Promise((resolve, reject) => {
        requestQueue.push({ resolve, reject, params });
        processQueue();
    });
}

// Permite requests do frontend Rayo (Vite roda em localhost:5173 ou IP da rede)
app.use(cors({
    origin: '*', // Em rede local, permite acesso de qualquer IP para simplificar
    methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '10mb' })); // NCMs podem ser muitos

// ── Rayo Hub — frontend estático ─────────────────────────────────────────────
// Serve o build do Rayo Hub diretamente, eliminando o `serve -s dist` separado.
// Configure RAYO_DIST no .env se a pasta dist estiver em outro lugar.
const RAYO_DIST = process.env.RAYO_DIST
    || path.resolve(__dirname, '..', 'rayo', 'dist');

if (fs.existsSync(RAYO_DIST)) {
    app.use(express.static(RAYO_DIST));
    console.log(`   🌐 Rayo Hub: servindo build de ${RAYO_DIST}`);
} else {
    console.log(`   ⚠️  Rayo Hub build não encontrado: ${RAYO_DIST}`);
    console.log(`      Execute: cd apps/rayo && npm run build`);
}

// ── Módulo Subvenções ZFM — frontend estático ─────────────────────────────────
// Serve o build do Auditor em /subvencoes-app/ — mesma origem do Rayo Hub,
// portanto sem CORS nem iframe blocking.
// Configure SUBVENCOES_DIST no .env se o projeto estiver em outro caminho.
const SUBVENCOES_DIST = process.env.SUBVENCOES_DIST
    || path.resolve(__dirname, '..', '..', '..', 'subvencoes', 'app', 'dist');

if (fs.existsSync(SUBVENCOES_DIST)) {
    app.use('/subvencoes-app', express.static(SUBVENCOES_DIST));
    app.get('/subvencoes-app/*', (req, res) => {
        res.sendFile(path.join(SUBVENCOES_DIST, 'index.html'));
    });
    console.log(`   📦 Subvenções ZFM: http://localhost:${process.env.PORT || 3001}/subvencoes-app/`);
} else {
    console.log(`   ⚠️  Subvenções ZFM build não encontrado: ${SUBVENCOES_DIST}`);
    console.log(`      1. Execute: cd subvencoes/app && npm run build`);
    console.log(`      2. Ou defina SUBVENCOES_DIST no .env com o caminho absoluto`);
}

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.0',
        servico: 'Rayo Scraper — e-Auditoria',
        timestamp: new Date().toISOString()
    });
});

// ── Status da Fila ────────────────────────────────────────────────────────────
// O frontend usa este endpoint para mostrar ao usuário sua posição na fila.
app.get('/api/queue-status', (req, res) => {
    res.json({
        processing: isProcessing,
        queueLength: requestQueue.length,
        // Posição total de jobs pendentes (fila + o que está rodando agora)
        totalPending: requestQueue.length + (isProcessing ? 1 : 0),
    });
});

// ── Scraping do e-Auditoria (com Fila) ────────────────────────────────────────
app.post('/api/scrape-eauditoria', async (req, res) => {
    const { ncms, uf, atividade, regime, regimeEspecial } = req.body;

    // Validação de entrada
    if (!Array.isArray(ncms) || ncms.length === 0) {
        return res.status(400).json({ error: 'Campo "ncms" é obrigatório e deve ser um array não vazio.' });
    }
    if (!uf || !atividade || !regime) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes: uf, atividade, regime.' });
    }
    if (ncms.length > 500) {
        return res.status(400).json({ error: 'Máximo de 500 NCMs por requisição para evitar timeout.' });
    }

    // Posição na fila ANTES de entrar (para informar ao usuário)
    const posicaoNaFila = requestQueue.length + (isProcessing ? 1 : 0);

    console.log(`[/api/scrape-eauditoria] Nova requisição: ${ncms.length} NCMs | ${uf}/${atividade}/${regime} | Posição na fila: ${posicaoNaFila + 1}`);

    try {
        const rules = await enqueue({ ncms, uf, atividade, regime, regimeEspecial });
        console.log(`[/api/scrape-eauditoria] ✅ ${rules.length} regras retornadas`);
        res.json({ rules, total: rules.length });
    } catch (err) {
        console.error('[/api/scrape-eauditoria] ❌ Erro:', err.message);

        if (err.message.includes('Credenciais')) {
            res.status(401).json({
                error: 'Credenciais do e-Auditoria não configuradas.',
                detalhe: err.message,
                sugestao: 'Crie o arquivo .env na pasta rayo-server com EAUDITORIA_EMAIL e EAUDITORIA_PASSWORD.'
            });
        } else if (err.message.includes('Timeout') || err.message.includes('download')) {
            res.status(504).json({
                error: 'Timeout ao aguardar resposta do e-Auditoria.',
                detalhe: err.message,
                sugestao: 'Tente reduzir a quantidade de NCMs ou use o upload manual da base.'
            });
        } else if (err.message.includes('login') || err.message.includes('#username')) {
            res.status(401).json({
                error: 'Falha no login do e-Auditoria.',
                detalhe: 'Verifique as credenciais no arquivo .env do servidor.',
                sugestao: 'Confirme que EAUDITORIA_EMAIL e EAUDITORIA_PASSWORD estão corretos.'
            });
        } else {
            res.status(500).json({
                error: 'Erro interno no robô.',
                detalhe: err.message,
                sugestao: 'O layout do e-Auditoria pode ter mudado. Use o upload manual como fallback.'
            });
        }
    }
});

// ── SPA fallback — Rayo Hub ───────────────────────────────────────────────────
// Deve ficar APÓS todas as rotas /api/* e /subvencoes-app/*.
// Rotas do React Router (ex: /icms, /subvencoes) retornam o index.html do Rayo.
app.get('*', (req, res) => {
    const index = path.join(RAYO_DIST, 'index.html');
    if (fs.existsSync(index)) {
        res.sendFile(index);
    } else {
        res.status(404).send('Execute: cd apps/rayo && npm run build');
    }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Rayo Server rodando em http://localhost:${PORT}`);
    console.log(`   Acesso na rede: http://<IP-do-servidor>:${PORT}`);
    console.log(`   Health:   GET  http://localhost:${PORT}/api/health`);
    console.log(`   Fila:     GET  http://localhost:${PORT}/api/queue-status`);
    console.log(`   Scraper:  POST http://localhost:${PORT}/api/scrape-eauditoria\n`);
    console.log(`   📋 Sistema de fila ativo: processamento sequencial anti-ban.\n`);
});
