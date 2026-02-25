import { useState, useCallback } from 'react';
import { IconChevronDown } from './Icons';
import { calcBaseCalculo, calcPis, calcCofins, cstGeraCredito } from '../core/calculator';

const isNoCreditCST = (cst) => {
    const noCreditCSTs = ['01', '70', '71', '72', '73', '74', '75', '98', '99', '49'];
    return cst && noCreditCSTs.includes(String(cst).padStart(2, '0'));
};

export default function NcmGroupCard({ groupKey, group, onUpdate }) {
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

    return (
        <div style={{
            borderLeft: `5px solid ${isComplementar ? 'var(--border-focus)' : (isChanged ? 'var(--success)' : 'var(--accent)')}`,
            padding: '16px 20px',
            backgroundColor: isComplementar ? 'var(--accent-soft)' : 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${isComplementar ? 'var(--border-focus)' : 'var(--border)'}`,
            borderLeftWidth: '5px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            marginBottom: '8px',
            boxShadow: isChanged ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            opacity: isComplementar ? 0.9 : 1
        }}>
            <div className="ncm-card-header" onClick={() => setExpanded(!expanded)} style={{ padding: 0, gap: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {group.description}
                        </span>
                        {isComplementar && (
                            <span style={{
                                fontSize: '0.65rem',
                                background: 'var(--border-focus)',
                                color: '#fff',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 600,
                                textTransform: 'uppercase'
                            }}>Informativo</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', alignItems: 'center' }}>
                        {codItemAtual && <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', padding: '0 4px', borderRadius: '2px' }}>Cód: {codItemAtual}</span>}
                        <span><strong>{group.records.length}</strong> registros</span>
                        <span>Base: <strong>{formatMoney(group.totalBase)}</strong></span>
                        <span>Atual: PIS {cstPisAtual} - COF {cstCofinsAtual}</span>
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

            {expanded && (
                <div style={{
                    marginTop: '16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-primary)',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 80px 60px 100px 100px',
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

                        return (
                            <div key={i} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 80px 60px 100px 100px',
                                gap: '10px',
                                padding: '8px 12px',
                                borderBottom: '1px solid var(--border)',
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.description}>{rec.description}</span>
                                <span style={{ textAlign: 'center' }}>{rec.cfop}</span>
                                <span style={{ textAlign: 'center' }}>{rec.cstPis || '—'}</span>
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
