import { useState, useMemo, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useIcmsAuditor } from '../hooks/useIcmsAuditor';
import { useEAuditoriaScraper, SCRAPER_STATUS } from '../hooks/useEAuditoriaScraper';
import { IconSun, IconMoon, IconUpload, IconCheck, IconWarning, IconX, IconRefresh, IconBolt, IconDownload, IconBot } from '../components/Icons';
import { downloadCorrectedAlterdata } from '../lib/writer/excel-writer';
import IcmsResultCard from '../components/IcmsResultCard';
import { Link } from 'react-router-dom';
import { Virtuoso } from 'react-virtuoso';

const TOLERANCIA_BC = 0.05;

// ─── Opções espelhando o formulário do e-Auditoria ────────────────────────────
const UFS_BRASIL = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

const ATIVIDADES = [
    { value: 'GERAL', label: 'Geral' },
    { value: 'ATACADO', label: 'Atacado' },
    { value: 'VAREJO', label: 'Varejo' },
    { value: 'FARMA', label: 'Farmácias' },
    { value: 'CONSTRUCAO', label: 'Construção Civil' },
    { value: 'INDUSTRIA', label: 'Indústria' },
];

const REGIMES = [
    { value: 'GERAL', label: 'Geral' },
    { value: 'LUCRO REAL', label: 'Lucro Real' },
    { value: 'LUCRO PRESUMIDO', label: 'Lucro Presumido' },
    { value: 'SIMPLES', label: 'Simples Nacional' },
];

const REGIMES_ESPECIAIS = [
    { value: '', label: '(nenhum)' },
    { value: 'ZFM', label: 'Zona Franca de Manaus (ZFM)' },
    { value: 'EPP', label: 'Empresa de Pequeno Porte' },
    { value: 'ME', label: 'Microempresa' },
];

function SelectField({ label, value, onChange, options, required = false, hint, disabled = false }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', opacity: disabled ? 0.6 : 1 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {required && <span style={{ color: 'var(--danger)', marginRight: '3px' }}>*</span>}
                {label}
            </label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                style={{
                    padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: '6px', color: 'var(--text)', fontSize: '0.9rem', width: '100%',
                    cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none'
                }}
            >
                {options.map(opt =>
                    typeof opt === 'string'
                        ? <option key={opt} value={opt}>{opt}</option>
                        : <option key={opt.value} value={opt.value}>{opt.label}</option>
                )}
            </select>
            {hint && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{hint}</p>}
        </div>
    );
}

export default function AuditorIcmsPage() {
    const { theme, toggle } = useTheme();
    const {
        alterdataBase, eAuditoriaBase,
        alterdataName, eAuditoriaName, alterdataHasSeguro,
        perfilEmpresa, updatePerfil,
        loading, error, auditResults, ncmSemCobertura, correctedAlterdata, modifiedCells,
        handleUploadAlterdata, handleUploadEAuditoria, executeAudit, resetFiles,
        setEAuditoriaBaseSilently // Precisaremos injetar os resultados do robô no state do hook silenciosamente
    } = useIcmsAuditor();

    const {
        status: scraperStatus,
        progresso: scraperProgresso,
        serverOnline,
        verificarServidor,
        executarScraping,
        cancelarScraping,
        resetScraper
    } = useEAuditoriaScraper();

    const [filterMode, setFilterMode] = useState('errors');

    // Verifica status do scraper server ao montar a página
    useEffect(() => {
        verificarServidor();
    }, [verificarServidor]);

    const handleDropAlterdata = async (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0] || e.target?.files?.[0];
        if (file) {
            await handleUploadAlterdata(file);
        }
    };

    const perfilCompleto = !!(perfilEmpresa.uf && perfilEmpresa.atividade && perfilEmpresa.regime);
    const prontoParaAudit = !!(alterdataName && eAuditoriaName && perfilCompleto);

    const handleDropEAuditoria = (e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0] || e.target?.files?.[0];
        if (file) handleUploadEAuditoria(file);
    };

    // Robô Automático: Disparado apenas manualmente agora. (User requested button "iniciar captura").
    const handleStartCapture = () => {
        if (alterdataBase && perfilCompleto && !eAuditoriaBase && scraperStatus === SCRAPER_STATUS.IDLE && serverOnline !== false) {
            executarScraping(alterdataBase, perfilEmpresa).then(rules => {
                if (rules) {
                    setEAuditoriaBaseSilently(rules, 'Automático (Puppeteer)');
                }
            });
        }
    };



    const handleDragOver = (e) => e.preventDefault();

    const filteredResults = useMemo(() => {
        if (!auditResults) return [];
        return filterMode === 'errors'
            ? auditResults.filter(r => r.severidade === 'erro' || r.severidade === 'alerta')
            : auditResults;
    }, [auditResults, filterMode]);

    const stats = useMemo(() => {
        if (!auditResults) return { errors: 0, alerts: 0, total: 0, corrected: 0 };
        return {
            total: auditResults.length,
            errors: auditResults.filter(r => r.severidade === 'erro').length,
            alerts: auditResults.filter(r => r.severidade === 'alerta').length,
            corrected: auditResults.filter(r => r.correcaoAplicada).length,
        };
    }, [auditResults]);

    const handleFullReset = () => {
        resetFiles();
        resetScraper();
    };

    // UI Builders
    const isRoboRunning = [SCRAPER_STATUS.VERIFICANDO, SCRAPER_STATUS.EXTRAINDO, SCRAPER_STATUS.BUSCANDO].includes(scraperStatus);
    const allowProfileEdit = !eAuditoriaName && !isRoboRunning;

    return (
        <div className="app-layout" style={{
            backgroundImage: 'radial-gradient(circle at 50% -10%, rgba(57, 102, 255, 0.05) 0%, transparent 50%)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* --- Header --- */}
            <header className="header" style={{
                justifyContent: 'space-between',
                padding: '12px 24px',
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid var(--glass-border)',
                zIndex: 10
            }}>
                <div className="header-brand" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="header-logo">
                        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'inherit' }}>
                            <img src="/logo.png" alt="Rayo Logo" style={{ height: '28px', width: 'auto' }} />
                            <span style={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: '1.1rem' }}>Rayo Hub</span>
                        </Link>
                    </div>
                    <span style={{ borderLeft: '1px solid var(--border)', paddingLeft: '15px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-tertiary)' }}>Auditor ICMS</span>
                </div>

                {perfilCompleto && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.75rem' }}>
                        {[perfilEmpresa.uf, perfilEmpresa.atividade, perfilEmpresa.regime].map((v, idx) => (
                            <span key={`${idx}-${v}`} style={{
                                padding: '3px 10px',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-secondary)',
                                fontWeight: 700,
                                boxShadow: 'var(--shadow-sm)'
                            }}>{v}</span>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {serverOnline !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: serverOnline ? 'var(--success)' : 'var(--text-tertiary)' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: serverOnline ? 'var(--success)' : 'var(--text-tertiary)' }} className={serverOnline ? 'pulse-anim' : ''}></div>
                            {serverOnline ? 'Robô EC2 Online' : 'Offline'}
                        </div>
                    )}
                    <div className="theme-toggle">
                        <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={toggle}>
                            <IconSun size={14} />
                        </button>
                        <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={toggle}>
                            <IconMoon size={14} />
                        </button>
                    </div>
                </div>
            </header>

            <main style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%', animation: 'fadeIn 0.5s ease-out' }}>

                {/* Avisos */}
                {alterdataName && !alterdataHasSeguro && (
                    <div className="warn-banner" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)', color: 'var(--warning-text)', padding: '12px 20px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.85rem', fontWeight: 500 }}>
                        <IconWarning size={18} /> <span>Coluna <strong>Seguro</strong> não detectada. Os cálculos seguirão sem o valor de seguro.</span>
                    </div>
                )}
                {error && (
                    <div style={{ border: '1px solid var(--danger)', background: 'var(--danger-soft)', color: 'var(--danger-text)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><IconX size={20} /> <span style={{ fontWeight: 600 }}>{error}</span></div>
                        <button className="btn-reset" onClick={handleFullReset} style={{ padding: '6px 16px', fontSize: '0.8rem' }}>Limpar Erro</button>
                    </div>
                )}

                {!auditResults && (
                    <>
                        {/* 1. Perfil da Empresa */}
                        <div className="glass-card" style={{ padding: '24px', opacity: allowProfileEdit ? 1 : 0.8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <IconBot size={20} style={{ color: 'var(--accent)' }} className={isRoboRunning ? 'spin-anim' : ''} />
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>1. Perfil da Empresa</h3>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>OBRIGATÓRIO</span>
                                </div>
                                {!allowProfileEdit && <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>Editando bloqueado durate o processamento</span>}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                <SelectField label="UF" value={perfilEmpresa.uf} onChange={v => updatePerfil('uf', v)} options={UFS_BRASIL} required disabled={!allowProfileEdit} />
                                <SelectField label="Atividade" value={perfilEmpresa.atividade} onChange={v => updatePerfil('atividade', v)} options={ATIVIDADES} required disabled={!allowProfileEdit} />
                                <SelectField label="Regime Tributário" value={perfilEmpresa.regime} onChange={v => updatePerfil('regime', v)} options={REGIMES} required disabled={!allowProfileEdit} />
                                <SelectField label="Regime Especial" value={perfilEmpresa.regimeEspecial} onChange={v => updatePerfil('regimeEspecial', v)} options={REGIMES_ESPECIAIS} disabled={!allowProfileEdit} />
                            </div>

                            {perfilEmpresa.uf === 'AM' && allowProfileEdit && (
                                <div className="glass-card" style={{
                                    background: 'var(--warning-soft)',
                                    padding: '12px 20px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--warning)',
                                    marginTop: '20px',
                                    display: 'flex',
                                    gap: '12px',
                                    alignItems: 'center',
                                    animation: 'pulse 3s infinite ease-in-out'
                                }}>
                                    <div style={{ background: 'var(--warning)', color: '#fff', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                                        <IconWarning size={16} />
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--warning-text)', margin: 0, fontWeight: 600 }}>
                                        UF AM ativa — Considere ativar <span style={{ textDecoration: 'underline' }}>EPP/ME</span> se aplicável para regras de Zona Franca.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 2 & 3. Uploads */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>

                            {/* Livrão Bruto */}
                            <div className="upload-zone" style={{
                                background: alterdataName ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                                border: alterdataName ? '1px solid var(--success)' : '1px dashed var(--border)',
                                cursor: isRoboRunning ? 'wait' : 'pointer'
                            }}
                                onDrop={handleDropAlterdata}
                                onDragOver={handleDragOver}
                                onClick={() => !isRoboRunning && document.getElementById('alterdata-input').click()}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: alterdataName ? 'var(--success-soft)' : 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: alterdataName ? 'var(--success)' : 'var(--text-tertiary)', border: '1px solid var(--border)' }}>
                                        {alterdataName ? <IconCheck size={28} /> : <IconUpload size={28} />}
                                    </div>
                                    <div style={{ textAlign: 'left', flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{alterdataName || '2. Livrão Bruto (Alterdata)'}</h4>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                            {alterdataName ? 'Base carregada e pronta' : 'Selecione o .xlsx exportado'}
                                        </p>
                                    </div>
                                    {alterdataName && !isRoboRunning && (
                                        <button className="btn-reset" onClick={(e) => { e.stopPropagation(); handleFullReset(); }} style={{ padding: '6px' }}><IconX size={16} /></button>
                                    )}
                                </div>
                                <input id="alterdata-input" type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={handleDropAlterdata} disabled={isRoboRunning || !!alterdataName} />
                            </div>

                            {/* Base de Regras */}
                            <div className="upload-zone" style={{
                                background: eAuditoriaName ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                                border: eAuditoriaName ? '1px solid var(--success)' : (prontoParaAudit ? '1px dashed var(--accent)' : '1px dashed var(--border)'),
                                cursor: isRoboRunning ? 'wait' : 'pointer'
                            }}
                                onDrop={handleDropEAuditoria}
                                onDragOver={handleDragOver}
                                onClick={() => (!isRoboRunning && !eAuditoriaName) && document.getElementById('eauditoria-input').click()}>

                                {isRoboRunning ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
                                        <IconBot size={40} className="spin-anim" style={{ color: 'var(--accent)' }} />
                                        <div style={{ textAlign: 'left', flex: 1 }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent)' }}>Robô e-Auditoria Ativo</h4>
                                            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{scraperProgresso}</p>
                                            <div style={{ width: '100%', height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', marginTop: '10px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', background: 'var(--accent)', width: '60%', animation: 'pulse-anim 2s infinite' }}></div>
                                            </div>
                                        </div>
                                        <button className="btn-reset" onClick={(e) => { e.stopPropagation(); cancelarScraping(); }} style={{ fontSize: '0.7rem' }}>Cancelar</button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: eAuditoriaName ? 'var(--success-soft)' : 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: eAuditoriaName ? 'var(--success)' : 'var(--accent)', border: '1px solid var(--border)' }}>
                                            {eAuditoriaName ? <IconCheck size={28} /> : <IconBot size={28} />}
                                        </div>
                                        <div style={{ textAlign: 'left', flex: 1 }}>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>{eAuditoriaName || '3. Base de Regras NCM'}</h4>
                                            {eAuditoriaName ? (
                                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Regras aplicadas com sucesso</p>
                                            ) : (
                                                <div style={{ marginTop: '8px' }}>
                                                    {alterdataName && perfilCompleto && serverOnline ? (
                                                        <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); handleStartCapture(); }} style={{ fontSize: '0.75rem', padding: '6px 14px' }}>
                                                            Iniciar Captura Inteligente
                                                        </button>
                                                    ) : (
                                                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Aguardando arquivos ou robô...</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <input id="eauditoria-input" type="file" accept=".xlsx,.csv" style={{ display: 'none' }} onChange={handleDropEAuditoria} disabled={isRoboRunning || !!eAuditoriaName} />
                            </div>
                        </div>

                        {/* 4. Executar */}
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                            <button
                                className="btn btn-success"
                                style={{ padding: '18px 48px', fontSize: '1.25rem', fontWeight: 800, borderRadius: '24px', boxShadow: prontoParaAudit ? '0 10px 30px rgba(34, 197, 94, 0.3)' : 'none', opacity: prontoParaAudit ? 1 : 0.3, transition: 'all 0.3s' }}
                                onClick={() => executeAudit()}
                                disabled={!prontoParaAudit || loading}
                            >
                                <IconBolt size={24} /> {loading ? 'Cruzando Dados...' : '4. Iniciar Auditoria Oficial'}
                            </button>
                            {!prontoParaAudit && <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>Complete os passos 1, 2 e 3 acima para liberar a auditoria.</p>}
                        </div>
                    </>
                )}

                {/* --- Resultados --- */}
                {auditResults && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '100px' }}>

                        {/* Header Resultados */}
                        <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <div style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '8px', borderRadius: '10px' }}><IconCheck size={24} /></div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Resultados da Auditoria</h3>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{filterMode === 'errors' ? 'Mostrando apenas erros e alertas' : 'Mostrando listagem completa'}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div className="theme-toggle" style={{ background: 'var(--bg-tertiary)', padding: '4px' }}>
                                    <button className={`theme-btn ${filterMode === 'errors' ? 'active' : ''}`} onClick={() => setFilterMode('errors')} style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }}>Pendências</button>
                                    <button className={`theme-btn ${filterMode === 'all' ? 'active' : ''}`} onClick={() => setFilterMode('all')} style={{ width: 'auto', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 700 }}>Tudo</button>
                                </div>
                                <button className="btn btn-secondary" onClick={handleFullReset} style={{ fontSize: '0.8rem' }}><IconRefresh size={14} /> Novo Audit</button>
                            </div>
                        </div>

                        {/* Avisos Críticos */}
                        {ncmSemCobertura.length > 0 && (
                            <div style={{ background: 'var(--danger-soft)', border: '1px solid var(--danger)', padding: '16px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <div style={{ background: 'var(--danger)', color: 'white', padding: '4px', borderRadius: '6px' }}><IconX size={16} /></div>
                                    <h4 style={{ margin: 0, color: 'var(--danger-text)', fontWeight: 800 }}>{ncmSemCobertura.length} NCM(s) sem cobertura detectada</h4>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {ncmSemCobertura.map(item => (
                                        <span key={item.ncm} style={{ background: 'white', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--danger)', fontSize: '0.75rem', fontWeight: 700 }}>{item.ncm}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Listagem */}
                        <div style={{ height: '600px', width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
                            {filteredResults.length === 0 ? (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', gap: '15px' }}>
                                    <IconCheck size={48} style={{ color: 'var(--success)', opacity: 0.5 }} />
                                    <p style={{ fontWeight: 600 }}>Tudo certo por aqui!</p>
                                </div>
                            ) : (
                                <Virtuoso
                                    style={{ height: '100%', width: '100%' }}
                                    data={filteredResults}
                                    itemContent={(index, result) => <div style={{ padding: '4px 12px' }}><IcmsResultCard key={index} result={result} /></div>}
                                />
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* --- Floating Dashboard --- */}
            {auditResults && (
                <div style={{
                    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                    width: 'min(900px, 95%)', background: 'var(--glass-bg)', backdropFilter: 'blur(16px)',
                    border: '1px solid var(--glass-border)', borderRadius: '24px', padding: '12px 24px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.3), var(--glass-shadow)', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between', zIndex: 100,
                    animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{ display: 'flex', gap: '32px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Auditoria</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--accent)' }}>{stats.total} itens</span>
                        </div>
                        <div style={{ width: '1px', height: '30px', background: 'var(--border)', alignSelf: 'center' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--danger)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Inconsistências</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--danger)' }}>{stats.errors} erros</span>
                        </div>
                        <div style={{ width: '1px', height: '30px', background: 'var(--border)', alignSelf: 'center' }}></div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--success)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Automação</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--success)' }}>{stats.corrected} fixes</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        {correctedAlterdata && (
                            <button className="btn btn-success" onClick={() => downloadCorrectedAlterdata(correctedAlterdata, `Auditoria_ICMS_${alterdataName}`, modifiedCells || new Map())} style={{ padding: '10px 24px', borderRadius: '14px', fontWeight: 800, fontSize: '0.9rem', boxShadow: '0 8px 20px rgba(34, 197, 94, 0.2)' }}>
                                <IconDownload size={18} /> Exportar Planilha
                            </button>
                        )}
                        <button className="btn btn-secondary" onClick={handleFullReset} style={{ padding: '10px 20px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'none' }}>
                            <IconRefresh size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
