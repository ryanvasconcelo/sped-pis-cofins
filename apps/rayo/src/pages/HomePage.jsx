import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { IconSun, IconMoon, IconBolt, IconSearch } from '../components/Icons';

export default function HomePage() {
    const { theme, toggle } = useTheme();

    return (
        <div className="app-layout" style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-primary)',
            backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(100, 100, 255, 0.05) 0%, transparent 50%)'
        }}>
            <header className="header" style={{
                justifyContent: 'space-between',
                padding: '16px 32px',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--glass-border)',
                zIndex: 10
            }}>
                <div className="header-brand">
                    <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src="/logo.png" alt="Rayo Logo" style={{ height: '32px', width: 'auto', filter: theme === 'dark' ? 'none' : 'invert(0.1)' }} />
                        <span style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(90deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Rayo Hub</span>
                    </div>
                </div>
                <div className="theme-toggle">
                    <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={toggle} style={{ borderRadius: 'var(--radius-md)', padding: '8px' }}>
                        <IconSun size={16} />
                    </button>
                    <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={toggle} style={{ borderRadius: 'var(--radius-md)', padding: '8px' }}>
                        <IconMoon size={16} />
                    </button>
                </div>
            </header>

            <main style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '60px 20px',
                maxWidth: '1100px',
                margin: '0 auto',
                textAlign: 'center',
                animation: 'fadeIn 0.8s ease-out'
            }}>
                <div style={{ marginBottom: '50px' }}>
                    <h1 style={{
                        fontSize: '3rem',
                        fontWeight: 900,
                        marginBottom: '16px',
                        letterSpacing: '-0.04em',
                        lineHeight: 1.1,
                        color: 'var(--text-primary)'
                    }}>
                        Bem-vindo ao <span style={{ color: 'var(--accent)' }}>Rayo Hub</span>
                    </h1>
                    <p style={{
                        color: 'var(--text-secondary)',
                        fontSize: '1.25rem',
                        maxWidth: '600px',
                        margin: '0 auto',
                        lineHeight: 1.6,
                        fontWeight: 500
                    }}>
                        Central de inteligência e automação fiscal. Selecione o módulo para iniciar sua auditoria.
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: '24px',
                    width: '100%',
                    perspective: '1000px'
                }}>

                    <Link to="/pis-cofins" style={{ textDecoration: 'none' }}>
                        <div className="glass-card" style={{
                            padding: '40px 32px',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '20px',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2), 0 0 20px rgba(139, 92, 246, 0.1)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                            }}
                        >
                            <div style={{
                                padding: '18px',
                                background: 'linear-gradient(135deg, var(--bg-tertiary), var(--bg-secondary))',
                                borderRadius: '20px',
                                color: 'var(--accent)',
                                boxShadow: 'var(--shadow-md)',
                                border: '1px solid var(--border)'
                            }}>
                                <IconBolt size={40} />
                            </div>
                            <div>
                                <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.5rem', fontWeight: 800 }}>Auditor PIS/COFINS</h2>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                                    Recuperação estratégica de crédito. Revisão inteligente de NCM e SPED Contribuições com motor de automação.
                                </p>
                            </div>
                            <div style={{ marginTop: 'auto', color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Acessar Módulo <IconBolt size={14} />
                            </div>
                        </div>
                    </Link>

                    <Link to="/icms" style={{ textDecoration: 'none' }}>
                        <div className="glass-card" style={{
                            padding: '40px 32px',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '20px',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            border: '1px solid var(--accent-light)',
                            background: theme === 'dark' ? 'rgba(57, 102, 255, 0.05)' : 'rgba(57, 102, 255, 0.02)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2), 0 0 30px rgba(57, 102, 255, 0.2)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                            }}
                        >
                            <div style={{
                                padding: '18px',
                                background: 'var(--accent)',
                                borderRadius: '20px',
                                color: 'black',
                                boxShadow: '0 8px 16px rgba(57, 102, 255, 0.3)'
                            }}>
                                <IconSearch size={40} />
                            </div>
                            <div>
                                <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.5rem', fontWeight: 800 }}>Auditor ICMS</h2>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                                    Cruzamento avançado de dados. Sincronização em tempo real com regras e-Auditoria e Livrão Alterdata.
                                </p>
                            </div>
                            <div style={{ marginTop: 'auto', color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Acessar Módulo <IconSearch size={14} />
                            </div>
                        </div>
                    </Link>

                    <Link to="/contas-razao" style={{ textDecoration: 'none' }}>
                        <div className="glass-card" style={{
                            padding: '40px 32px',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '20px',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            background: theme === 'dark' ? 'rgba(99, 102, 241, 0.05)' : 'rgba(99, 102, 241, 0.02)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2), 0 0 30px rgba(99, 102, 241, 0.25)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                            }}
                        >
                            <div style={{
                                padding: '18px',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                borderRadius: '20px',
                                color: 'white',
                                boxShadow: '0 8px 16px rgba(99, 102, 241, 0.35)'
                            }}>
                                <IconSearch size={40} />
                            </div>
                            <div>
                                <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.5rem', fontWeight: 800 }}>
                                    Auditor Contas e Razão
                                    <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 8px', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 999, color: '#6366f1', fontWeight: 700, verticalAlign: 'middle' }}>NOVO</span>
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                                    Conciliação automática entre Razão Contábil (NBS) e Relatório Financeiro (Sifin). Aponta inconsistências em segundos.
                                </p>
                            </div>
                            <div style={{ marginTop: 'auto', color: '#6366f1', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Acessar Módulo <IconSearch size={14} />
                            </div>
                        </div>
                    </Link>

                    <Link to="/stock" style={{ textDecoration: 'none' }}>
                        <div className="glass-card" style={{
                            padding: '40px 32px', height: '100%', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '20px',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            border: '1px solid rgba(249, 115, 22, 0.3)',
                            background: theme === 'dark' ? 'rgba(249, 115, 22, 0.05)' : 'rgba(249, 115, 22, 0.02)',
                            position: 'relative', overflow: 'hidden'
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2), 0 0 30px rgba(249, 115, 22, 0.25)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                            }}
                        >
                            <div style={{
                                padding: '18px', background: 'linear-gradient(135deg, #f97316, #fb923c)',
                                borderRadius: '20px', color: 'white', boxShadow: '0 8px 16px rgba(249, 115, 22, 0.35)'
                            }}>
                                <IconSearch size={40} />
                            </div>
                            <div>
                                <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.5rem', fontWeight: 800 }}>
                                    Auditor de Estoque
                                    <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 8px', border: '1px solid rgba(249,115,22,0.4)', borderRadius: 999, color: '#f97316', fontWeight: 700, verticalAlign: 'middle' }}>NOVO</span>
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                                    Comparativo Estoque × Razão Contábil. Identifica exatamente qual chassi está causando divergências de valor mês a mês.
                                </p>
                            </div>
                            <div style={{ marginTop: 'auto', color: '#f97316', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Acessar Módulo <IconSearch size={14} />
                            </div>
                        </div>
                    </Link>

                    {/* ── Subvenções ZFM ── módulo independente, sem dependência do rayo-server ── */}
                    <Link to="/subvencoes" style={{ textDecoration: 'none' }}>
                        <div className="glass-card" style={{
                            padding: '40px 32px', height: '100%', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: '20px',
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            background: theme === 'dark' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(34, 197, 94, 0.02)',
                            position: 'relative', overflow: 'hidden'
                        }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2), 0 0 30px rgba(34, 197, 94, 0.25)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = 'var(--glass-shadow)';
                            }}
                        >
                            <div style={{
                                padding: '18px', background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                                borderRadius: '20px', color: 'white', boxShadow: '0 8px 16px rgba(34, 197, 94, 0.35)'
                            }}>
                                <IconSearch size={40} />
                            </div>
                            <div>
                                <h2 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '1.5rem', fontWeight: 800 }}>
                                    Subvenções ZFM
                                    <span style={{ marginLeft: '8px', fontSize: '0.65rem', padding: '2px 8px', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 999, color: '#22c55e', fontWeight: 700, verticalAlign: 'middle' }}>NOVO</span>
                                </h2>
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.95rem' }}>
                                    Apuração automática de ICMS Desonerado (Convênio 65/88). Cruzamento SPED × XML, elegibilidade e laudo PDF/Excel com trilha de auditoria.
                                </p>
                            </div>
                            <div style={{ marginTop: 'auto', color: '#22c55e', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Acessar Módulo <IconSearch size={14} />
                            </div>
                        </div>
                    </Link>

                </div>
            </main>

            <footer style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                &copy; 2026 Rayo Hub — Inteligência Fiscal em Tempo Real
            </footer>
        </div>
    );
}
