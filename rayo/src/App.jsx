import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useTheme } from './hooks/useTheme';
import { useSpedFile } from './hooks/useSpedFile';
import NcmGroupCard from './components/NcmGroupCard';
import DeParaModal from './components/DeParaModal';
import { IconBolt, IconUpload, IconDownload, IconExport, IconSearch, IconCheck, IconX, IconSun, IconMoon, IconWarning, IconRefresh } from './components/Icons';
import { calcBaseCalculo, calcPis, calcCofins, cstGeraCredito } from './core/calculator';
import { generateModifiedSped, downloadFile } from './core/sped-writer';
import { generateNCMsCsv } from './core/ncm-grouper';

export default function App() {
    const { theme, toggle } = useTheme();
    const { parsedData, ncmGroups, ncmList, fileName, loading, error, deparaRules, processFile, reset, updateGroup, applyDeparaRules } = useSpedFile();
    const [searchTerm, setSearchTerm] = useState('');
    const [toasts, setToasts] = useState([]);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showDePara, setShowDePara] = useState(false);
    const [showFlash, setShowFlash] = useState(true);

    // --- Initial animations & onboarding ---
    useEffect(() => {
        // Flash animation finishes after 1.5s
        const timer = setTimeout(() => setShowFlash(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (parsedData && !loading && !localStorage.getItem('rayo_has_seen_guide')) {
            setShowOnboarding(true);
        }
    }, [parsedData, loading]);

    const closeOnboarding = () => {
        setShowOnboarding(false);
        localStorage.setItem('rayo_has_seen_guide', 'true');
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

    // --- Aplicar em lote ---
    const handleApplyAll = useCallback((cst) => {
        if (!ncmGroups) return;
        for (const [key] of ncmGroups) {
            updateGroup(key, 'novoCstPis', cst);
            updateGroup(key, 'novoCstCofins', cst);
        }
        showToast(`CST ${cst} aplicado a todos os grupos!`);
    }, [ncmGroups, updateGroup, showToast]);

    // --- Download NCMs ---
    const handleDownloadNCMs = useCallback(() => {
        if (!ncmList?.length) return;
        const txt = generateNCMsCsv(ncmList);

        const company = parsedData?.meta?.companyName?.trim() || 'ARQUIVO_SPED';
        const finalName = `${company} - lista de ncm.txt`;

        downloadFile(txt, finalName, 'text/plain');
        showToast(`${ncmList.length} NCMs exportados!`);
    }, [ncmList, parsedData, showToast]);

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

        const modified = generateModifiedSped(parsedData.rawLines, modifications);

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
            {showFlash && <div className="lightning-flash" />}

            {/* Header */}
            <header className="header">
                <div className="header-brand">
                    <div className="header-logo">
                        <img src="/logo.png" alt="Rayo Logo" style={{ height: '32px', width: 'auto' }} />
                        <span>Rayo</span>
                    </div>
                    <span className="header-subtitle">Revisão PIS/COFINS</span>
                </div>
                <div className="theme-toggle">
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

            {/* File loaded */}
            {parsedData && !loading && (
                <>
                    {/* File Info */}
                    <div className="upload-zone" style={{ padding: '1.25rem', cursor: 'default' }}>
                        <div className="upload-success">
                            <IconCheck size={24} className="icon-success" />
                            <span className="filename">{fileName}</span>
                            <span className="stats">
                                {parsedData.stats.totalItems} produtos • {
                                    [parsedData.stats.totalC170 ? `${parsedData.stats.totalC170} C170` : '',
                                    parsedData.stats.totalC191 ? `${parsedData.stats.totalC191} C191` : '',
                                    parsedData.stats.totalC195 ? `${parsedData.stats.totalC195} C195` : '']
                                        .filter(Boolean).join(' + ')
                                }
                            </span>
                            <button className="btn-reset" onClick={reset}>
                                <IconRefresh size={12} />
                                <span>Carregar outro arquivo</span>
                            </button>
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="info-grid">
                        <div className="info-card">
                            <span className="label">Empresa</span>
                            <span className="value">{parsedData.meta.companyName || '—'}</span>
                        </div>
                        <div className="info-card">
                            <span className="label">CNPJ</span>
                            <span className="value">{formatCNPJ(parsedData.meta.cnpj)}</span>
                        </div>
                        <div className="info-card">
                            <span className="label">Período</span>
                            <span className="value">{formatPeriod(parsedData.meta.period)}</span>
                        </div>
                        <div className="info-card">
                            <span className="label">Grupos NCM</span>
                            <span className="value accent">{ncmGroups?.size || 0}</span>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="action-bar">
                        <div className="action-bar-left">
                            <button className="btn btn-secondary" onClick={() => setShowDePara(true)}>
                                <IconBolt size={15} />
                                Regras De-Para
                            </button>
                            <button className="btn btn-secondary" onClick={handleDownloadNCMs}>
                                <IconDownload size={15} />
                                Download NCMs
                            </button>
                            <button className="btn btn-primary" onClick={() => handleApplyAll('50')}>
                                <IconBolt size={15} />
                                Aplicar CST 50 a todos
                            </button>
                        </div>
                        <div className="action-bar-right">
                            <button className="btn btn-success" onClick={handleExport} disabled={summary.altered === 0}>
                                <IconExport size={15} />
                                Exportar TXT Revisado
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="search-bar">
                        <span className="search-icon">
                            <IconSearch size={14} />
                        </span>
                        <input
                            type="text"
                            placeholder="Filtrar por NCM, descrição, CNPJ..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* NCM Groups - Virtualized com Virtuoso */}
                    <div className="ncm-group-list" style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
                        <Virtuoso
                            style={{ height: '100%' }}
                            data={filteredGroups}
                            itemContent={(index, [key, group]) => (
                                <div style={{ paddingBottom: '1rem' }}>
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

                    {/* Summary */}
                    <div className="summary-grid">
                        <div className="summary-card">
                            <span className="label">Grupos Alterados</span>
                            <span className="value">{summary.altered}</span>
                        </div>
                        <div className="summary-card">
                            <span className="label">Crédito PIS</span>
                            <span className="value">{formatMoney(summary.totalPis)}</span>
                        </div>
                        <div className="summary-card">
                            <span className="label">Crédito COFINS</span>
                            <span className="value">{formatMoney(summary.totalCofins)}</span>
                        </div>
                        <div className="summary-card total">
                            <span className="label">Crédito Total Recuperado</span>
                            <span className="value">{formatMoney(summary.total)}</span>
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
                                    <IconDownload size={16} />
                                </div>
                                <div className="onboarding-step-content">
                                    <h4>1. Download NCMs</h4>
                                    <p>Baixe uma lista contendo todos os NCMs únicos encontrados no seu SPED, um por linha. Ideal para usar como filtro ou importar em outras ferramentas.</p>
                                </div>
                            </div>
                            <div className="onboarding-step">
                                <div className="onboarding-step-icon">
                                    <IconBolt size={16} />
                                </div>
                                <div className="onboarding-step-content">
                                    <h4>2. Aplicar CST 50 a todos</h4>
                                    <p>O botão relâmpago! Ele preenche de uma só vez o CST 50 em TODOS os grupos NCM do arquivo. Um atalho formidável para poupar tempo.</p>
                                </div>
                            </div>
                            <div className="onboarding-step">
                                <div className="onboarding-step-icon btn-neutral">
                                    <IconRefresh size={16} />
                                </div>
                                <div className="onboarding-step-content">
                                    <h4>3. Automação De-Para</h4>
                                    <p>No painel Regras De-Para, você pode cadastrar condições baseadas em <b>NCM + Código do Produto + CST Atual</b> para que o sistema altere automaticamente para o Novo CST desejado.</p>
                                </div>
                            </div>
                            <div className="onboarding-step">
                                <div className="onboarding-step-icon btn-neutral">
                                    <IconExport size={16} />
                                </div>
                                <div className="onboarding-step-content">
                                    <h4>4. Exportar TXT Revisado</h4>
                                    <p>Após editar alíquotas ou modificar CSTs, e verificar a estimativa de créditos no sistema, baixe o arquivo SPED final (.txt) atualizado.</p>
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

            {/* De-Para Modal */}
            {showDePara && (
                <DeParaModal
                    rules={deparaRules}
                    onSave={(rules) => {
                        applyDeparaRules(rules);
                        setShowDePara(false);
                        showToast('Regras De-Para aplicadas com sucesso!');
                    }}
                    onClose={() => setShowDePara(false)}
                />
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
