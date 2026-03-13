/**
 * SubvencoesPage — Módulo Subvenções ZFM dentro do Rayo Hub
 *
 * Arquitetura: iframe isolado apontando para o auditor rodando em localhost:5174
 * Independência total: não usa rayo-server, não importa nada de outros módulos Rayo.
 *
 * Processos necessários (independentes):
 *   Auditor:    cd subvencoes/app    && npm run dev   → porta 5174
 *   Robô SEFAZ: cd subvencoes/server && node index.js → porta 3002
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const AUDITOR_URL   = `http://${window.location.hostname}:5174`;
const SEFAZ_BOT_URL = `http://${window.location.hostname}:3002`;

// Verifica se uma porta está respondendo HTTP (retorna boolean)
async function portaResponde(url, timeout = 3000) {
    try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeout);
        // Usa HEAD para minimizar tráfego; ignora erros CORS (só importa o TCP conectar)
        await fetch(url, { method: 'HEAD', signal: ctrl.signal });
        clearTimeout(timer);
        return true;
    } catch (e) {
        // AbortError = timeout, TypeError "Failed to fetch" = connection refused
        // Ambos significam offline — mas se chegou aqui com outro erro pode ser CORS (app rodando)
        if (e?.name === 'AbortError') return false;
        // "Failed to fetch" no Chrome = porta fechada; outros erros de rede também = false
        return false;
    }
}

function StatusPill({ online, label }) {
    const color = online === null ? '#6b7280' : online ? '#22c55e' : '#ef4444';
    const bg    = online === null ? 'rgba(107,114,128,0.15)' : online ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 10px', borderRadius: 999, background: bg,
            border: `1px solid ${color}44` }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color,
                boxShadow: online ? `0 0 5px ${color}` : 'none',
                transition: 'all 0.3s' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color }}>
                {label}: {online === null ? 'verificando…' : online ? 'online' : 'offline'}
            </span>
        </div>
    );
}

export default function SubvencoesPage() {
    // null = ainda checando | true = online | false = offline
    const [auditorOnline, setAuditorOnline] = useState(null);
    const [botOnline, setBotOnline]         = useState(null);
    const iframeRef = useRef(null);

    async function verificar() {
        // Auditor: tenta fazer uma requisição real (não no-cors — que dá falso positivo no macOS)
        // CORS vai bloquear, mas um erro de CORS significa que o servidor RESPONDEU → online
        // Um erro "Failed to fetch" / TypeError significa porta fechada → offline
        try {
            await fetch(AUDITOR_URL, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
            setAuditorOnline(true);
        } catch (e) {
            // TypeError sem mensagem de CORS = porta fechada
            // Se a mensagem contém "CORS" ou "fetch" o servidor respondeu (CORS block = online)
            const msg = e?.message?.toLowerCase() ?? '';
            const servidorRespondeu = msg.includes('cors') || msg.includes('blocked');
            setAuditorOnline(servidorRespondeu);
        }
        // Bot SEFAZ: tem endpoint /api/health com CORS aberto
        try {
            const r = await fetch(`${SEFAZ_BOT_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
            setBotOnline(r.ok);
        } catch {
            setBotOnline(false);
        }
    }

    useEffect(() => {
        verificar();
        const t = setInterval(verificar, 10000);
        return () => clearInterval(t);
    }, []);

    // Handler do iframe: quando carrega com sucesso confirma online
    function onIframeLoad() { setAuditorOnline(true); }

    const mostrarOffline = auditorOnline === false;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh',
            background: 'var(--bg-primary, #0a0a0a)' }}>

            {/* ── Barra superior ──────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                padding: '8px 20px', flexShrink: 0,
                background: 'var(--glass-bg, rgba(255,255,255,0.04))',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
            }}>
                <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-secondary, #9ca3af)',
                    fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    ← Rayo Hub
                </Link>

                <div style={{ width: 1, height: 16, background: 'var(--glass-border, rgba(255,255,255,0.1))', flexShrink: 0 }} />

                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary, #f9fafb)',
                    letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                    Subvenções ZFM
                </span>

                <span style={{ fontSize: 11, padding: '2px 8px',
                    background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                    borderRadius: 999, border: '1px solid rgba(34,197,94,0.3)', fontWeight: 700 }}>
                    Convênio 65/88
                </span>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusPill online={auditorOnline} label="Auditor" />
                    <StatusPill online={botOnline}     label="Robô SEFAZ" />
                    {mostrarOffline && (
                        <button
                            onClick={() => { setAuditorOnline(null); verificar(); }}
                            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999,
                                background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                                border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer', fontWeight: 600 }}>
                            ↺ Verificar
                        </button>
                    )}
                </div>
            </div>

            {/* ── Conteúdo ─────────────────────────────────────────────── */}
            {mostrarOffline ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 20,
                    padding: 32, textAlign: 'center' }}>

                    <div style={{ fontSize: 52 }}>🔌</div>

                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800,
                        color: 'var(--text-primary, #f9fafb)' }}>
                        Módulo Subvenções não está rodando
                    </h2>

                    <p style={{ margin: 0, fontSize: 14, maxWidth: 480, lineHeight: 1.6,
                        color: 'var(--text-secondary, #9ca3af)' }}>
                        Este módulo é <strong style={{ color: 'var(--text-primary, #f9fafb)' }}>independente</strong> do Rayo Hub.
                        Abra dois terminais e execute os comandos abaixo:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 500 }}>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, marginBottom: 4 }}>
                                1 — Auditor (interface + motor fiscal)
                            </div>
                            <code style={{ display: 'block', padding: '10px 16px', borderRadius: 8,
                                fontFamily: 'monospace', fontSize: 13,
                                color: 'var(--text-primary, #f9fafb)',
                                background: 'var(--bg-secondary, rgba(255,255,255,0.06))',
                                border: '1px solid rgba(34,197,94,0.2)' }}>
                                cd subvencoes/app &amp;&amp; npm run dev
                            </code>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 700, marginBottom: 4 }}>
                                2 — Robô SEFAZ (opcional — só para download automático de XMLs)
                            </div>
                            <code style={{ display: 'block', padding: '10px 16px', borderRadius: 8,
                                fontFamily: 'monospace', fontSize: 13,
                                color: 'var(--text-primary, #f9fafb)',
                                background: 'var(--bg-secondary, rgba(255,255,255,0.06))',
                                border: '1px solid rgba(255,255,255,0.08)' }}>
                                cd subvencoes/server &amp;&amp; node index.js
                            </code>
                        </div>
                    </div>

                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280', maxWidth: 420 }}>
                        Após iniciar, clique em <strong>↺ Verificar</strong> na barra acima ou aguarde a detecção automática.
                    </p>
                </div>
            ) : (
                <iframe
                    ref={iframeRef}
                    src={auditorOnline !== false ? AUDITOR_URL : 'about:blank'}
                    title="Auditor de Subvenções ZFM — Convênio 65/88"
                    onLoad={onIframeLoad}
                    style={{ flex: 1, width: '100%', border: 'none',
                        background: 'var(--bg-primary, #0a0a0a)',
                        display: auditorOnline === null ? 'none' : 'block' }}
                    allow="downloads"
                />
            )}

            {/* Loading skeleton enquanto verifica */}
            {auditorOnline === null && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary, #9ca3af)', gap: 10, fontSize: 14 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid #22c55e', borderTopColor: 'transparent',
                        animation: 'spin 0.8s linear infinite' }} />
                    Conectando ao módulo Subvenções…
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}
        </div>
    );
}
