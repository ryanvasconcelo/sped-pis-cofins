import { useState, useCallback } from 'react';
import { IconChevronDown } from './Icons';
import { calcBaseCalculo, calcPis, calcCofins, cstGeraCredito } from '../core/calculator';
import { detectarMultiCst } from '../core/ncm-grouper';
import { CST_PISCOFINS } from './AssignmentsPanel';

const isNoCreditCST = (cst) => {
    const noCreditCSTs = ['01', '70', '71', '72', '73', '74', '75', '98', '99', '49'];
    return cst && noCreditCSTs.includes(String(cst).padStart(2, '0'));
};

/** Retorna a descrição curta de um CST para tooltip */
function getCstLabel(cst) {
    if (!cst) return '';
    const code = String(cst).padStart(2, '0');
    const found = CST_PISCOFINS.find(c => c.cst === code);
    return found ? found.label : '';
}

/** Badge de tooltip inline */
function CstBadge({ cst, style = {} }) {
    const [hover, setHover] = useState(false);
    const label = getCstLabel(cst);
    return (
        <span
            style={{ position: 'relative', display: 'inline-flex', ...style }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            <span style={{
                fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700,
                background: 'var(--bg-tertiary)', border: '1px solid var(--border)',
                borderRadius: '4px', padding: '1px 6px', cursor: 'help'
            }}>{cst || '—'}</span>
            {hover && label && (
                <span style={{
                    position: 'absolute', bottom: '110%', left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#1a1a2e', color: '#f8fafc',
                    fontSize: '0.68rem', fontWeight: 500,
                    padding: '5px 8px', borderRadius: '6px',
                    whiteSpace: 'nowrap', maxWidth: '300px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 999, pointerEvents: 'none',
                    lineHeight: 1.4
                }}>{label}</span>
            )}
        </span>
    );
}

export default function NcmGroupCard({
    groupKey, group, onUpdate,
    robotStarted = false, hasRobotRule = false,
    assignedKey = null,
    onAssign = null,
    isJustApplied = false,
}) {
    const [expanded, setExpanded] = useState(false);

    const handleCstChange = useCallback((field, value) => {
        const clean = value.replace(/\D/g, '').slice(0, 2);
        onUpdate(groupKey, field, clean);
    }, [groupKey, onUpdate]);

    const handleAliqChange = useCallback((field, value) => {
        onUpdate(groupKey, field, parseFloat(value) || 0);
    }, [groupKey, onUpdate]);

    // Calcular totais do grupo
    const cstPis = group.novoCstPis || '';
    const cstCofins = group.novoCstCofins || '';
    let totalPis = 0;
    let totalCofins = 0;

    group.records.forEach(rec => {
        const base = calcBaseCalculo(rec.vlItem, rec.vlDesc || 0);
        if (cstPis && cstGeraCredito(cstPis)) {
            totalPis += calcPis(base, group.aliqPis, cstPis);
        }
        if (cstCofins && cstGeraCredito(cstCofins)) {
            totalCofins += calcCofins(base, group.aliqCofins, cstCofins);
        }
    });

    const isChanged = cstPis !== '' || cstCofins !== '';
    const totalCredit = totalPis + totalCofins;

    // Get display CST atual (from first record)
    const firstRec = group.records[0];
    const cstPisAtual = firstRec?.cstPis || '—';
    const cstCofinsAtual = firstRec?.cstCofins || '—';
    const codItemAtual = firstRec?.codItem;
    const isComplementar = group.description?.toUpperCase().includes('COMPLEMENTAR');

    // Multi-CST detection
    const multiCst = detectarMultiCst(group);

    // --- Lógica de Status ---
    const getStatus = () => {
        if (isComplementar) return 'info';
        if (robotStarted && !hasRobotRule && group.ncm && group.ncm !== 'SEM_NCM' && !groupKey.includes('_')) {
            return 'danger';
        }
        if (cstPis !== '' && cstCofins !== '') return 'success';
        if (group.aliqPis === 0 || group.aliqCofins === 0) return 'warning';
        return 'neutral';
    };

    const status = getStatus();

    const statusStyles = {
        success: { border: 'var(--success)', bg: 'rgba(34, 197, 94, 0.05)', text: 'var(--success)', label: 'Regularizado' },
        warning: { border: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.05)', text: 'var(--warning-text)', label: 'Pendente' },
        danger: { border: 'var(--danger)', bg: 'rgba(239, 68, 68, 0.05)', text: 'var(--danger)', label: 'Não Encontrado' },
        info: { border: 'var(--border-focus)', bg: 'var(--accent-soft)', text: 'var(--accent)', label: 'Informativo' },
        neutral: { border: 'var(--border)', bg: 'var(--bg-secondary)', text: 'var(--text-tertiary)', label: 'Padrão' }
    };

    const currentStyle = statusStyles[status];

    return (
        <div style={{
            borderLeft: `6px solid ${currentStyle.border}`,
            padding: '16px 20px',
            backgroundColor: currentStyle.bg,
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${status === 'neutral' ? 'var(--border)' : currentStyle.border}`,
            borderLeftWidth: '6px',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            marginBottom: '12px',
            boxShadow: isJustApplied
                ? '0 0 0 3px rgba(5, 150, 105, 0.4), 0 8px 24px rgba(5, 150, 105, 0.2)'
                : status === 'success' ? 'var(--shadow-md)'
                    : status === 'warning' ? '0 4px 12px rgba(245, 158, 11, 0.1)'
                        : 'var(--shadow-sm)',
            position: 'relative',
            overflow: 'hidden',
            animation: isJustApplied ? 'pulseGreen 0.6s ease' : undefined
        }}>
            <div className="ncm-card-header" onClick={() => setExpanded(!expanded)} style={{ padding: 0, gap: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                            background: 'var(--bg-tertiary)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)'
                        }}>
                            {group.ncm && group.ncm !== 'SEM_NCM' ? `NCM:${group.ncm}` : (groupKey.length === 14 || groupKey.includes('_') ? 'CNPJ' : `NCM: ${groupKey} `)}
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {group.description}
                        </span>
                        <span style={{
                            fontSize: '0.65rem',
                            background: currentStyle.border,
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                            {currentStyle.label}
                        </span>

                        {/* Badge multi-CST */}
                        {multiCst.hasMultiCst && (
                            <span style={{
                                fontSize: '0.65rem',
                                background: '#f59e0b',
                                color: '#1a1a2e',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                display: 'flex', alignItems: 'center', gap: '3px',
                                cursor: 'pointer'
                            }} title="Este NCM possui registros com CSTs distintos — inconsistência tributária detectada">
                                ⚠️ {(multiCst.pisCsts.size > 1 ? multiCst.pisCsts.size : 0) + (multiCst.cofinsCsts.size > 1 ? multiCst.cofinsCsts.size : 0)} CSTs Divergentes
                            </span>
                        )}

                        {/* Badge atribuição */}
                        {assignedKey && (
                            <span style={{
                                fontSize: '0.65rem',
                                background: 'rgba(79, 70, 229, 0.12)',
                                color: 'var(--border-focus)',
                                border: '1px solid var(--border-focus)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 700
                            }} title={`Atribuído: ${assignedKey.label}`}>
                                📌 {assignedKey.label}
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', alignItems: 'center', flexWrap: 'wrap' }}>
                        {codItemAtual && <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', padding: '0 4px', borderRadius: '2px' }}>Cód: {codItemAtual}</span>}
                        <span><strong>{group.records.length}</strong> registros</span>
                        <span>Base: <strong>{formatMoney(group.totalBase)}</strong></span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            Antigos: PIS <CstBadge cst={cstPisAtual} /> COF <CstBadge cst={cstCofinsAtual} />
                        </span>
                        {totalCredit > 0 && <span style={{ color: 'var(--success)', fontWeight: 800 }}>+ {formatMoney(totalCredit)}</span>}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div className="ncm-card-inputs" style={{ display: 'flex', gap: '10px', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                        <div className="input-group">
                            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.02em' }}>CST PIS</label>
                            <input
                                className={`input-cst ${cstPis ? 'filled' : ''}`}
                                value={cstPis}
                                onChange={(e) => handleCstChange('novoCstPis', e.target.value)}
                                placeholder="—"
                                title={getCstLabel(cstPis)}
                                style={{ width: '40px', padding: '4px', textAlign: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="input-group">
                            <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>Aliq</label>
                            <input
                                className="input-aliq"
                                value={group.aliqPis}
                                onChange={(e) => handleAliqChange('aliqPis', e.target.value)}
                                style={{ width: '50px', padding: '4px', textAlign: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
                            />
                        </div>

                        <div style={{ width: '1px', height: '20px', background: 'var(--border)', margin: '0 4px' }}></div>

                        <div className="input-group">
                            <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 800, letterSpacing: '0.02em' }}>CST COF</label>
                            <input
                                className={`input-cst ${cstCofins ? 'filled' : ''}`}
                                value={cstCofins}
                                onChange={(e) => handleCstChange('novoCstCofins', e.target.value)}
                                placeholder="—"
                                title={getCstLabel(cstCofins)}
                                style={{ width: '40px', padding: '4px', textAlign: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div className="input-group">
                            <label style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700 }}>Aliq</label>
                            <input
                                className="input-aliq"
                                value={group.aliqCofins}
                                onChange={(e) => handleAliqChange('aliqCofins', e.target.value)}
                                style={{ width: '50px', padding: '4px', textAlign: 'center', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>
                    <div className={`ncm-card-expand ${expanded ? 'open' : ''}`} style={{ transition: 'transform 0.3s', transform: expanded ? 'rotate(180deg)' : 'none', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconChevronDown size={20} />
                    </div>
                </div>
            </div>

            {/* Expansion area */}
            {expanded && (
                <div style={{
                    marginTop: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    overflow: 'hidden'
                }}>
                    {/* Multi-CST Alert */}
                    {multiCst.hasMultiCst && (
                        <div style={{
                            background: 'rgba(245, 158, 11, 0.08)',
                            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
                            padding: '10px 14px',
                            display: 'flex', gap: '16px', flexWrap: 'wrap'
                        }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e' }}>⚠️ CSTs divergentes detectados neste NCM:</span>
                            {multiCst.hasMultiPis && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>PIS:</span>
                                    {[...multiCst.pisCsts.entries()].map(([cst, count]) => (
                                        <span key={cst} style={{ background: '#fef9c3', border: '1px solid #d97706', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>
                                            {cst} <span style={{ opacity: 0.7 }}>({count}×)</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {multiCst.hasMultiCofins && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>COFINS:</span>
                                    {[...multiCst.cofinsCsts.entries()].map(([cst, count]) => (
                                        <span key={cst} style={{ background: '#fef9c3', border: '1px solid #d97706', borderRadius: '4px', padding: '1px 6px', fontSize: '0.7rem', fontWeight: 700 }}>
                                            {cst} <span style={{ opacity: 0.7 }}>({count}×)</span>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 80px 100px 100px',
                        gap: '10px',
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderBottom: '1px solid var(--border)',
                        fontWeight: 700,
                        color: 'var(--text-tertiary)',
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        <span>Descrição do Produto</span>
                        <span style={{ textAlign: 'center' }}>CFOP</span>
                        <span style={{ textAlign: 'center' }}>CST</span>
                        <span style={{ textAlign: 'right' }}>Valor Base</span>
                        <span style={{ textAlign: 'right' }}>Crédito</span>
                    </div>
                    {group.records.map((rec, i) => {
                        const base = calcBaseCalculo(rec.vlItem, rec.vlDesc || 0);
                        const pis = cstPis && cstGeraCredito(cstPis) ? calcPis(base, group.aliqPis, cstPis) : 0;
                        const cofins = cstCofins && cstGeraCredito(cstCofins) ? calcCofins(base, group.aliqCofins, cstCofins) : 0;
                        const creditoLinha = pis + cofins;
                        const cstAtual = rec.cstPis ? String(rec.cstPis).padStart(2, '0') : '—';

                        return (
                            <div key={i} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 80px 80px 100px 100px',
                                gap: '10px',
                                padding: '8px 12px',
                                borderBottom: '1px solid var(--border)',
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.description}>{rec.description}</span>
                                <span style={{ textAlign: 'center' }}>{rec.cfop}</span>
                                <span style={{ textAlign: 'center' }}>
                                    <CstBadge cst={cstAtual} />
                                </span>
                                <span style={{ textAlign: 'right', fontFamily: 'monospace' }}>{formatMoney(base)}</span>
                                <span style={{ textAlign: 'right', fontFamily: 'monospace', color: creditoLinha > 0 ? 'var(--success)' : 'inherit', fontWeight: creditoLinha > 0 ? 600 : 400 }}>
                                    {creditoLinha > 0 ? `+ ${formatMoney(creditoLinha)} ` : '—'}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function formatMoney(value) {
    if (!value && value !== 0) return 'R$ 0,00';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
