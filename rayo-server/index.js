/**
 * RAYO HUB — Servidor Express (Microserviço Local)
 * Porta: 3001 | Frontend Rayo: porta 5173
 *
 * Endpoints:
 *   GET  /api/health              → { status: 'ok', version }
 *   POST /api/scrape-eauditoria   → { ncms, uf, atividade, regime, regimeEspecial } → { rules }
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { scrapeEAuditoria } = require('./scraper/eauditoria-scraper');

const app = express();
const PORT = process.env.PORT || 3001;

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

// ── Scraping do e-Auditoria ───────────────────────────────────────────────────
app.post('/api/scrape-eauditoria', async (req, res) => {
    const { ncms, uf, atividade, regime, regimeEspecial } = req.body;

    // Validação de entrada (Lei do Critério Antes do Código — SOP-IA)
    if (!Array.isArray(ncms) || ncms.length === 0) {
        return res.status(400).json({ error: 'Campo "ncms" é obrigatório e deve ser um array não vazio.' });
    }
    if (!uf || !atividade || !regime) {
        return res.status(400).json({ error: 'Campos obrigatórios ausentes: uf, atividade, regime.' });
    }
    if (ncms.length > 500) {
        return res.status(400).json({ error: 'Máximo de 500 NCMs por requisição para evitar timeout.' });
    }

    console.log(`[/api/scrape-eauditoria] Iniciando scraping: ${ncms.length} NCMs | ${uf}/${atividade}/${regime}`);

    try {
        const rules = await scrapeEAuditoria({ ncms, uf, atividade, regime, regimeEspecial });
        console.log(`[/api/scrape-eauditoria] ✅ ${rules.length} regras retornadas`);
        res.json({ rules, total: rules.length });
    } catch (err) {
        console.error('[/api/scrape-eauditoria] ❌ Erro:', err.message);

        // Distingue erros operacionais de erros de infraestrutura
        if (err.message.includes('Timeout') || err.message.includes('download')) {
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
    console.log(`   Scraper: POST http://localhost:${PORT}/api/scrape-eauditoria\n`);
});
