/**
 * SubvencoesPage — Módulo Subvenções ZFM dentro do Rayo Hub
 *
 * Arquitetura: iframe isolado apontando para o auditor rodando em localhost:5174
 * Independência total: não usa rayo-server, não importa nada de outros módulos Rayo.
 * O auditor tem seu próprio servidor de robô SEFAZ em localhost:3002.
 *
 * Para rodar o módulo:
 *   Auditor:      cd subvencoes/app    && npm run dev   → porta 5174
 *   Robô SEFAZ:   cd subvencoes/server && node index.js → porta 3002
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// URLs do módulo independente — sem dependência do rayo-server (porta 3001)
const AUDITOR_URL     = `http://${window.location.hostname}:5174`;
const SEFAZ_BOT_URL   = `http://${window.location.hostname}:3002`;

function StatusPill({ online, label, cmd }) {
    const color = online === null ? '#6b7280' : online ? '#22c55e' : '#ef4444';
    const bg    = online === null ? 'rgba(107,114,128,0.1)' : online ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 999, background: bg,
                border: `1px solid ${color}33` }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color,
                    boxShadow: online ? `0 0 6px ${color}` : 'none' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color }}>
                    {label}: {online === null ? '...' : online ? 'online' : 'offline'}
                </span>
            </div>
            {online === false && cmd && (
                <code style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444', borderRadius: 4, fontFamily: 'monospace',
                    border: '1px solid rgba(239,68,68,0.2)' }}>
                    {cmd}
                </code>
            )}
        </div>
    );
}

export default function SubvencoesPage() {
    const [auditorOnline, setAuditorOnline] = useState(null);
    const [botOnline, setBotOnline]         = useState(null);
    const iframeRef = useRef(null);

    useEffect(() => {
        async function checkAuditor() {
            try {
                // no-cors porque o auditor não precisa enviar CORS headers para check de presença
                await fetch(AUDITOR_URL, { mode: 'no-cors', signal: AbortSignal.timeout(3000) });
                setAuditorOnline(true);
            } catch {
                setAuditorOnline(false);
            }
        }
        async function checkBot() {
            try {
                const r = await fetch(`${SEFAZ_BOT_URL}/api/health`, { signal: AbortSignal.timeout(2000) });
                setBotOnline(r.ok);
            } catch {
                setBotOnline(false);
            }
        }
        checkAuditor();
        checkBot();
        const t = setInterval(() => { checkAuditor(); checkBot(); }, 12000);
        return () => clearInterval(t);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh',
            background: 'var(--bg-primary, #0a0a0a)' }}>

            {/* ── Barra superior ──────────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                padding: '8px 20px', flexShrink: 0,
                background: 'var(--glass-bg, rgba(255,255,255,0.04))',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
            }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 6,
                    textDecoration: 'none', color: 'var(--text-secondary, #9ca3af)',
                    fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    ← Rayo Hub
                </Link>

                <div style={{ width: 1, height: 16, background: 'var(--glass-border, rgba(255,255,255,0.08))', flexShrink: 0 }} />

                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary, #f9fafb)',
                    letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                    Subvenções ZFM
                </span>

                <span style={{ fontSize: 11, padding: '2px 8px',
                    background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                    borderRadius: 999, border: '1px solid rgba(34,197,94,0.3)',
                    fontWeight: 700 }}>
                    Convênio 65/88
                </span>

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <StatusPill
                        online={auditorOnline}
                        label="Auditor"
                        cmd="cd subvencoes/app && npm run dev"
                    />
                    <StatusPill
                        online={botOnline}
                        label="Robô SEFAZ"
                        cmd="cd subvencoes/server && node index.js"
                    />
                </div>
            </div>

            {/* ── Conteúdo principal ──────────────────────────────────────── */}
            {auditorOnline === false ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 20,
                    padding: 32, textAlign: 'center' }}>
                    <div style={{ fontSize: 56 }}>🔌</div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800,
                        color: 'var(--text-primary, #f9fafb)' }}>
                        Módulo Subvenções offline
                    </h2>
                    <p style={{ margin: 0, fontSize: 14, maxWidth: 440, lineHeight: 1.6,
                        color: 'var(--text-secondary, #9ca3af)' }}>
                        O auditor roda de forma independente na porta{' '}
                        <strong style={{ color: '#22c55e' }}>5174</strong>.
                        Inicie-o no terminal para continuar:
                    </p>
                    <code style={{ padding: '12px 24px', borderRadius: 10, fontFamily: 'monospace',
                        fontSize: 13, color: 'var(--text-primary, #f9fafb)',
                        background: 'var(--bg-secondary, rgba(255,255,255,0.06))',
                        border: '1px solid var(--glass-border, rgba(255,255,255,0.1))' }}>
                        cd /caminho/para/subvencoes/app &amp;&amp; npm run dev
                    </code>
                    <button
                        onClick={() => { setAuditorOnline(null); }}
                        style={{ padding: '10px 28px', borderRadius: 10, cursor: 'pointer',
                            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                            color: '#000', fontWeight: 700, border: 'none', fontSize: 13 }}>
                        Verificar novamente
                    </button>
                </div>
            ) : (
                <iframe
                    ref={iframeRef}
                    src={AUDITOR_URL}
                    title="Auditor de Subvenções ZFM — Convênio 65/88"
                    style={{ flex: 1, width: '100%', border: 'none',
                        background: 'var(--bg-primary, #0a0a0a)' }}
                    allow="downloads"
                />
            )}
        </div>
    );
}
