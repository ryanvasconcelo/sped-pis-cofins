/**
 * RAYO HUB — Servidor Express (Microserviço Local)
 * Porta: 3001 | Frontend Rayo: porta 5173
 *
 * Endpoints:
 *   GET  /api/health              → { status: 'ok', version }
 *   GET  /api/queue-status        → { queueLength, processing }
 *   POST /api/scrape-eauditoria   → { ncms, uf, atividade, regime, regimeEspecial } → { rules }
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
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

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 Rayo Server rodando em http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Fila:   http://localhost:${PORT}/api/queue-status`);
    console.log(`   Scraper: POST http://localhost:${PORT}/api/scrape-eauditoria\n`);
    console.log(`   📋 Sistema de fila ativo: processamento sequencial anti-ban.\n`);
});
