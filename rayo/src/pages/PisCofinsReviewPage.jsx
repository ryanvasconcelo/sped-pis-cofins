import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useTheme } from '../hooks/useTheme';
import { useSpedFile } from '../hooks/useSpedFile';
import NcmGroupCard from '../components/NcmGroupCard';
import { IconBolt, IconUpload, IconDownload, IconExport, IconSearch, IconCheck, IconX, IconSun, IconMoon, IconWarning, IconRefresh, IconBot } from '../components/Icons';
import { calcBaseCalculo, calcPis, calcCofins, cstGeraCredito } from '../core/calculator';
import { generateModifiedSped, downloadFile } from '../core/sped-writer';
import { generateNCMsCsv } from '../core/ncm-grouper';
import { Link } from 'react-router-dom';
import { useEAuditoriaScraper, SCRAPER_STATUS } from '../hooks/useEAuditoriaScraper';
import { aplicarAutoCorrecaoPisCofins } from '../lib/auditor/piscofins-auditor';

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

function SelectField({ label, value, onChange, options, required = false, hint, disabled = false }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', opacity: disabled ? 0.6 : 1 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {required && <span style={{ color: 'var(--danger)', marginRight: '3px' }}>*</span>}
                {label}
            </label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                style={{
                    padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%',
                    cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none', transition: 'border-color 0.2s'
                }}
            >
                <option value="" disabled>Selecione...</option>
                {options.map(opt =>
                    typeof opt === 'string'
                        ? <option key={opt} value={opt}>{opt}</option>
                        : <option key={opt.value} value={opt.value}>{opt.label}</option>
                )}
            </select>
            {hint && <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', margin: 0 }}>{hint}</p>}
        </div>
    );
}

export default function PisCofinsReviewPage() {
    const { theme, toggle } = useTheme();
    const { parsedData, ncmGroups, ncmList, fileName, loading, error, processFile, reset, updateGroup, applyAutoCorrecoes } = useSpedFile();
    const [searchTerm, setSearchTerm] = useState('');
    const [toasts, setToasts] = useState([]);
    const [showOnboarding, setShowOnboarding] = useState(() => {
        return !localStorage.getItem('rayo_onboarding_seen');
    });

    // --- RPA States ---
    const [perfilEmpresa, setPerfilEmpresa] = useState({ uf: '', atividade: '', regime: '', regimeEspecial: '' });
    const [eAuditoriaRules, setEAuditoriaRules] = useState(null);

    const {
        status: scraperStatus,
        progresso: scraperProgresso,
        serverOnline,
        executarScraping,
        cancelarScraping,
        verificarServidor
    } = useEAuditoriaScraper();

    useEffect(() => {
        verificarServidor();
    }, [verificarServidor]);

    const perfilCompleto = !!(perfilEmpresa.uf && perfilEmpresa.atividade && perfilEmpresa.regime);
    const isRoboRunning = scraperStatus !== SCRAPER_STATUS.IDLE && scraperStatus !== SCRAPER_STATUS.CONCLUIDO && scraperStatus !== SCRAPER_STATUS.ERRO;

    const closeOnboarding = () => {
        setShowOnboarding(false);
        localStorage.setItem('rayo_onboarding_seen', 'true');
    };

    // --- Toast ---
    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);

    // --- Upload ---
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        const file = e.dataTransfer?.files[0] || e.target?.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    // --- Filtro & Ordenação (Impacto Financeiro) ---
    const filteredGroups = useMemo(() => {
        if (!ncmGroups) return [];

        // Convert to array and sort by Base de Calculo (highest first)
        const sorted = [...ncmGroups.entries()].sort((a, b) => {
            let valA = 0, valB = 0;
            a[1].records.forEach(r => valA += calcBaseCalculo(r.vlItem, r.vlDesc || 0));
            b[1].records.forEach(r => valB += calcBaseCalculo(r.vlItem, r.vlDesc || 0));
            return valB - valA;
        });

        if (!searchTerm) return sorted;

        const term = searchTerm.toLowerCase();
        return sorted.filter(([key, group]) =>
            key.toLowerCase().includes(term) ||
            group.description.toLowerCase().includes(term) ||
            group.records.some(r => r.description?.toLowerCase().includes(term))
        );
    }, [ncmGroups, searchTerm]);

    // --- Summary ---
    const summary = useMemo(() => {
        if (!ncmGroups) return { altered: 0, totalPis: 0, totalCofins: 0, total: 0 };

        let altered = 0, totalPis = 0, totalCofins = 0;
        for (const [, group] of ncmGroups) {
            const cstPis = group.novoCstPis;
            const cstCofins = group.novoCstCofins;
            if (cstPis || cstCofins) altered++;

            group.records.forEach(rec => {
                const base = calcBaseCalculo(rec.vlItem, rec.vlDesc || 0);
                if (cstPis && cstGeraCredito(cstPis)) totalPis += calcPis(base, group.aliqPis, cstPis);
                if (cstCofins && cstGeraCredito(cstCofins)) totalCofins += calcCofins(base, group.aliqCofins, cstCofins);
            });
        }
        return { altered, totalPis, totalCofins, total: totalPis + totalCofins };
    }, [ncmGroups]);

    // --- Download NCMs ---
    const handleDownloadNCMs = useCallback(() => {
        if (!ncmList?.length) return;
        const txt = generateNCMsCsv(ncmList);

        const company = parsedData?.meta?.companyName?.trim() || 'ARQUIVO_SPED';
        const finalName = `${company} - lista de ncm.txt`;

        downloadFile(txt, finalName, 'text/plain');
        showToast(`${ncmList.length} NCMs exportados!`);
    }, [ncmList, parsedData, showToast]);

    // --- Exportação de De/Para (RPA Placeholder) ---
    // Will be handled dynamically later when we create piscofins-auditor.js
    const handleStartCapture = async () => {
        if (!parsedData || !ncmList || ncmList.length === 0 || !perfilCompleto) return;

        // ncmList tem o formato: [{ ncm: '09012100', count: 12, example: 'CAFE' }, ...]
        // Precisamos mapear apenas a string do NCM para o formato que a função extrairNcms do hook espera
        const mockAlterdata = ncmList.map(item => item.ncm);

        const rules = await executarScraping(mockAlterdata, perfilEmpresa);
        if (rules && rules.length > 0) {
            setEAuditoriaRules(rules);

            // Auto-Correção autônoma: Motor
            const regrasAutoAplicadas = aplicarAutoCorrecaoPisCofins(ncmGroups, rules, perfilEmpresa);
            applyAutoCorrecoes(regrasAutoAplicadas);

            showToast(`Regras de PIS/COFINS processadas e CSTs 50 preenchidos automaticamente!`, 'success');
        }
    };

    // --- Download TXT Revisado ---
    const handleExport = useCallback(() => {
        if (!parsedData || !ncmGroups) return;

        const modifications = [];
        for (const [, group] of ncmGroups) {
            const cstPis = group.novoCstPis;
            const cstCofins = group.novoCstCofins;
            if (!cstPis && !cstCofins) continue;

            group.records.forEach(rec => {
                const base = calcBaseCalculo(rec.vlItem, rec.vlDesc || 0);
                const valorPis = cstPis && cstGeraCredito(cstPis) ? calcPis(base, group.aliqPis, cstPis) : 0;
                const valorCofins = cstCofins && cstGeraCredito(cstCofins) ? calcCofins(base, group.aliqCofins, cstCofins) : 0;

                if (rec.type === 'C170') {
                    modifications.push({
                        lineIndex: rec.lineIndex,
                        fieldPositions: rec.fieldPositions,
                        newCstPis: cstPis || undefined,
                        newVlBcPis: cstPis ? base : undefined,
                        newAliqPis: cstPis ? group.aliqPis : undefined,
                        newVlPis: cstPis ? valorPis : undefined,
                        newCstCofins: cstCofins || undefined,
                        newVlBcCofins: cstCofins ? base : undefined,
                        newAliqCofins: cstCofins ? group.aliqCofins : undefined,
                        newVlCofins: cstCofins ? valorCofins : undefined
                    });
                } else if (rec.type === 'C191_C195') {
                    if (cstPis && rec.lineIndexPis != null) {
                        modifications.push({
                            lineIndex: rec.lineIndexPis,
                            fieldPositions: rec.fieldPositionsPis,
                            newCstPis: cstPis,
                            newVlBcPis: base,
                            newAliqPis: group.aliqPis,
                            newVlPis: valorPis
                        });
                    }
                    if (cstCofins && rec.lineIndexCofins != null) {
                        modifications.push({
                            lineIndex: rec.lineIndexCofins,
                            fieldPositions: rec.fieldPositionsCofins,
                            newCstCofins: cstCofins,
                            newVlBcCofins: base,
                            newAliqCofins: group.aliqCofins,
                            newVlCofins: valorCofins
                        });
                    }
                }
            });
        }

        const modified = generateModifiedSped(parsedData.rawLines, modifications, parsedData.lineEnding);

        const company = parsedData?.meta?.companyName?.trim() || 'ARQUIVO_SPED';
        const finalName = `${company} - sped final.txt`;

        downloadFile(modified, finalName);
        showToast(`Arquivo revisado exportado! ${modifications.length} registros alterados.`);
    }, [parsedData, ncmGroups, showToast]);

    // --- Format helpers ---
    const formatCNPJ = (cnpj) => {
        if (!cnpj || cnpj.length < 14) return cnpj || '—';
        return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
    };

    const formatPeriod = (period) => {
        if (!period) return '—';
        return period.replace(/(\d{2})(\d{2})(\d{4})/g, '$1/$2/$3');
    };

    const formatMoney = (v) => {
        if (!v) return 'R$ 0,00';
        return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="app-layout">

            {/* Header */}
            <header className="header">
                <div className="header-brand">
                    <div className="header-logo">
                        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', color: 'inherit' }}>
                            <img src="/logo.png" alt="Rayo Logo" style={{ height: '32px', width: 'auto' }} />
                            <span>Rayo Hub</span>
                        </Link>
                    </div>
                    <span className="header-subtitle" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '15px' }}>Revisão PIS/COFINS</span>
                </div>

                {perfilCompleto && parsedData && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '0.75rem' }}>
                        {[perfilEmpresa.uf, perfilEmpresa.atividade, perfilEmpresa.regime].map((v, idx) => (
                            <span key={`${idx}-${v}`} style={{
                                padding: '3px 10px',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                                boxShadow: 'var(--shadow-sm)'
                            }}>{v}</span>
                        ))}
                    </div>
                )}

                <div className="theme-toggle">
                    <button
                        className="btn-help"
                        onClick={() => setShowOnboarding(true)}
                        title="Como usar o Rayo"
                        aria-label="Ajuda"
                    >
                        ?
                    </button>
                    <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={toggle}>
                        <IconSun size={14} />
                    </button>
                    <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={toggle}>
                        <IconMoon size={14} />
                    </button>
                </div>
            </header>

            {/* Upload */}
            {!parsedData && !loading && (
                <div
                    className="upload-zone"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => document.getElementById('file-input').click()}
                >
                    <div className="upload-icon">
                        <IconUpload size={36} />
                    </div>
                    <p className="upload-title">Arraste seu arquivo SPED (.TXT) aqui</p>
                    <p className="upload-subtitle">ou clique para selecionar</p>
                    <input
                        id="file-input"
                        type="file"
                        accept=".txt,.TXT"
                        style={{ display: 'none' }}
                        onChange={handleDrop}
                    />
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="upload-zone">
                    <div className="loading">
                        <div className="spinner" />
                        <p>Processando {fileName}...</p>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="upload-zone" style={{ borderColor: 'var(--danger)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                        <IconX size={18} />
                        <span>{error}</span>
                    </div>
                    <button className="btn-reset" onClick={reset}>Tentar novamente</button>
                </div>
            )}

            {/* File loaded - RPA and Profile Section */}
            {parsedData && !loading && (
                <>
                    {/* Perfil da Empresa */}
                    <div style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        boxShadow: 'var(--shadow-md)',
                        marginBottom: '8px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <IconBot size={20} style={{ color: 'var(--accent)' }} className={isRoboRunning ? 'spin-anim' : ''} />
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>1. Perfil Tributário</h3>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '10px' }}>Obrigatório</span>
                            </div>
                            {serverOnline !== null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: serverOnline ? 'var(--success)' : 'var(--text-tertiary)' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: serverOnline ? 'var(--success)' : 'var(--text-tertiary)' }} className={serverOnline ? 'pulse-anim' : ''}></div>
                                    {serverOnline ? 'Robô Local Online' : 'Servidor Offline'}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                            <SelectField
                                label="UF"
                                value={perfilEmpresa.uf}
                                onChange={v => setPerfilEmpresa({ ...perfilEmpresa, uf: v })}
                                options={['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO']}
                                required
                                disabled={isRoboRunning || eAuditoriaRules}
                            />
                            <SelectField
                                label="Atividade Principal"
                                value={perfilEmpresa.atividade}
                                onChange={v => setPerfilEmpresa({ ...perfilEmpresa, atividade: v })}
                                options={ATIVIDADES}
                                required
                                disabled={isRoboRunning || eAuditoriaRules}
                            />
                            <SelectField
                                label="Regime Tributário"
                                value={perfilEmpresa.regime}
                                onChange={v => setPerfilEmpresa({ ...perfilEmpresa, regime: v })}
                                options={REGIMES}
                                required
                                disabled={isRoboRunning || eAuditoriaRules}
                            />
                        </div>
                    </div>

                    {/* 2 & 3: Base & Robô */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', marginTop: '12px' }}>
                        {/* Card 2: Base SPED */}
                        <div className="upload-zone" style={{
                            background: fileName ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                            border: fileName ? '1px solid var(--success)' : '1px dashed var(--border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '24px',
                            cursor: fileName ? 'default' : 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s',
                            boxShadow: 'var(--shadow-sm)'
                        }} onClick={() => !fileName && document.getElementById('sped-input').click()}>
                            <div style={{ color: fileName ? 'var(--success)' : 'var(--text-tertiary)' }}>
                                {fileName ? (
                                    <div style={{ background: 'var(--success-soft)', padding: '12px', borderRadius: '50%' }}>
                                        <IconCheck size={28} />
                                    </div>
                                ) : (
                                    <IconUpload size={28} />
                                )}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{fileName || '2. Base SPED (Arquivo .txt)'}</h4>
                                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                    {fileName ? `Extraídos ${parsedData.stats.totalItems} registros` : 'Arraste o SPED Fiscal bruto aqui'}
                                </p>
                            </div>
                            {fileName && (
                                <button className="btn-reset" onClick={(e) => { e.stopPropagation(); reset(); }} style={{ padding: '4px 12px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <IconRefresh size={10} /> Trocar Arquivo
                                </button>
                            )}
                            <input id="sped-input" type="file" accept=".txt" style={{ display: 'none' }} onChange={handleDrop} />
                        </div>

                        {/* Card 3: Robô e-Auditoria */}
                        <div className="upload-zone" style={{
                            background: eAuditoriaRules ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                            border: eAuditoriaRules ? '1px solid var(--success)' : '1px dashed var(--accent)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.2s',
                            boxShadow: 'var(--shadow-sm)',
                            opacity: fileName ? 1 : 0.5,
                            pointerEvents: fileName ? 'auto' : 'none'
                        }}>
                            {isRoboRunning ? (
                                <>
                                    <IconBot size={28} className="spin-anim" style={{ color: 'var(--accent)' }} />
                                    <div style={{ textAlign: 'center', width: '100%' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--accent)' }}>Robô e-Auditoria Ativo</h4>
                                        <p style={{ margin: '8px 0', fontSize: '0.8rem', fontWeight: 600 }}>{scraperProgresso}</p>
                                        <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: scraperStatus === SCRAPER_STATUS.IDLE ? '5%' : (scraperStatus === SCRAPER_STATUS.CONCLUIDO ? '100%' : '60%'),
                                                height: '100%',
                                                background: 'var(--accent)',
                                                transition: 'width 0.5s ease'
                                            }}></div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ color: eAuditoriaRules ? 'var(--success)' : 'var(--accent)' }}>
                                        {eAuditoriaRules ? (
                                            <div style={{ background: 'var(--success-soft)', padding: '12px', borderRadius: '50%' }}>
                                                <IconCheck size={28} />
                                            </div>
                                        ) : (
                                            <IconBot size={28} />
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{eAuditoriaRules ? 'Regras Sincronizadas' : '3. Inteligência Tributária'}</h4>
                                        <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                            {eAuditoriaRules ? 'Regras do e-Auditoria aplicadas' : 'Inicie a captura via Robô'}
                                        </p>
                                    </div>
                                    {!eAuditoriaRules && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleStartCapture}
                                                disabled={!perfilCompleto || isRoboRunning}
                                                style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px' }}
                                            >
                                                <IconBot size={14} /> Iniciar Captura Automática
                                            </button>
                                            {!perfilCompleto && !isRoboRunning && (
                                                <p style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 600, margin: 0 }}>
                                                    Preencha o Passo 1 (Perfil) para habilitar o robô.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {scraperStatus === SCRAPER_STATUS.ERRO && (
                                        <p style={{ color: 'var(--danger)', fontSize: '0.7rem', marginTop: '4px' }}>⚠️ Falha: {scraperProgresso}</p>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Meta Info (Sticky / Floating Section Header) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '24px', marginBottom: '12px' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Auditando {ncmList.length} Grupos NCM</h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Filtre os resultados ou aplique regras em massa abaixo.</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="search-bar" style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '16px',
                        padding: '2px 12px'
                    }}>
                        <span className="search-icon"><IconSearch size={16} /></span>
                        <input
                            type="text"
                            placeholder="Buscar por NCM, produto ou descrição..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', padding: '12px' }}
                        />
                    </div>

                    {/* NCM Groups List */}
                    <div style={{ height: 'calc(100vh - 480px)', minHeight: '400px', marginBottom: '100px' }}>
                        <Virtuoso
                            style={{ height: '100%' }}
                            data={filteredGroups}
                            itemContent={(index, [key, group]) => (
                                <div style={{ paddingBottom: '8px' }}>
                                    <NcmGroupCard
                                        key={key}
                                        groupKey={key}
                                        group={group}
                                        onUpdate={updateGroup}
                                    />
                                </div>
                            )}
                        />
                    </div>

                    {/* Bottom Floating Dashboard */}
                    <div style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 'calc(100% - 80px)',
                        maxWidth: '1100px',
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-xl)',
                        padding: '16px 32px',
                        boxShadow: 'var(--glass-shadow)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        zIndex: 1000,
                        animation: 'fadeIn 0.5s ease-out'
                    }}>
                        <div style={{ display: 'flex', gap: '32px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Base de Cálculo</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatMoney(summary.totalBase)}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--success)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Crédito Recuperado</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--success)' }}>{formatMoney(summary.total)}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Alterações</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{summary.altered} grupos</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button className="btn btn-secondary" onClick={() => { if (confirm('Resetar auditoria?')) reset(); }} style={{ borderRadius: 'var(--radius-md)' }}>
                                <IconRefresh size={16} /> Limpar
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={handleExport}
                                disabled={summary.altered === 0}
                                style={{
                                    padding: '10px 24px',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'center',
                                    background: 'var(--success)',
                                    boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.4)'
                                }}
                            >
                                <IconDownload size={18} /> Exportar TXT Corrigido
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Footer */}
            <footer className="footer">
                Rayo v2.0 — Processamento 100% local. Seus dados fiscais nunca saem do seu computador.
            </footer>

            {/* Onboarding Guide */}
            {showOnboarding && (
                <div className="onboarding-overlay" onClick={closeOnboarding}>
                    <div className="onboarding-modal" onClick={e => e.stopPropagation()}>
                        <div className="onboarding-header">
                            <div className="onboarding-logo">
                                <img src="/logo.png" alt="Rayo Logo" />
                                <span>Rayo</span>
                            </div>
                            <p>Bem-vindo ao novo revisor em lote de PIS/COFINS.</p>
                        </div>

                        <div className="onboarding-steps">
                            <div className="onboarding-step">
                                <div className="onboarding-step-icon btn-neutral">
                                    <IconUpload size={16} />
                                </div>
                                <div className="onboarding-step-content">
                                    <h4>1. Upload</h4>
                                    <p>Arraste seu arquivo TXT do SPED ou clique para selecionar.</p>
                                </div>
                            </div>
                            <div className="onboarding-step">
                                <div className="onboarding-step-icon">
                                    <IconBolt size={16} />
                                </div>
                                <div className="onboarding-step-content">
                                    <h4>2. Revisar por NCM</h4>
                                    <p>Os produtos são agrupados por NCM. Altere o CST PIS e COFINS de cada grupo conforme necessário.</p>
                                </div>
                            </div>
                            <div className="onboarding-step">
                                <div className="onboarding-step-icon btn-neutral">
                                    <IconBot size={16} />
                                </div>
                                <div className="onboarding-step-content">
                                    <h4>3. Captura Automática</h4>
                                    <p>O robô Rayo busca as regras vigentes diretamente no e-Auditoria para você, preenchendo os CSTs automaticamente.</p>
                                </div>
                            </div>
                            <div className="onboarding-step">
                                <div className="onboarding-step-icon btn-neutral">
                                    <IconExport size={16} />
                                </div>
                                <div className="onboarding-step-content">
                                    <h4>4. Exportar</h4>
                                    <p>Quando terminar, clique em "Exportar TXT Revisado". O arquivo gerado é idêntico ao original, apenas com os campos PIS/COFINS alterados. Valide no PVA antes de transmitir.</p>
                                </div>
                            </div>
                        </div>

                        <div className="onboarding-actions">
                            <button className="btn btn-primary" onClick={closeOnboarding}>
                                Entendi, vamos lá!
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* Toasts */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast-${t.type} show`}>
                        {t.type === 'success' ? <IconCheck size={14} /> : t.type === 'warning' ? <IconWarning size={14} /> : <IconX size={14} />}
                        <span>{t.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
