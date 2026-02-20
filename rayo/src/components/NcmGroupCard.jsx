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

    return (
        <div className={`ncm-card ${isChanged ? 'changed' : ''}`}>
            <div className="ncm-card-header" onClick={() => setExpanded(!expanded)}>
                <div className="ncm-card-info">
                    <div className="ncm-card-title">
                        <span className="ncm-badge">
                            {group.ncm && group.ncm !== 'SEM_NCM' ? `NCM: ${group.ncm}` : (groupKey.length === 14 || groupKey.includes('_') ? 'CNPJ' : `NCM: ${groupKey}`)}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {group.description}
                        </span>
                    </div>
                    <div className="ncm-card-meta">
                        {codItemAtual && (
                            <span className="product-code" title="Código do produto">
                                Cód: {codItemAtual}
                            </span>
                        )}
                        <span>{group.productCount} {group.productCount === 1 ? 'registro' : 'registros'}</span>
                        <span>Base: {formatMoney(group.totalBase)}</span>
                        <span>CST atual: PIS {cstPisAtual} - COF {cstCofinsAtual}</span>
                        {totalCredit > 0 && (
                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                +{formatMoney(totalCredit)}
                            </span>
                        )}
                    </div>
                </div>

                <div className="ncm-card-inputs" onClick={e => e.stopPropagation()}>
                    <div className="input-group">
                        <label>CST PIS</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="text"
                                className={`input-cst ${cstPis ? 'filled' : ''}`}
                                value={cstPis}
                                onChange={e => handleCstChange('novoCstPis', e.target.value)}
                                placeholder="—"
                                maxLength={2}
                            />
                            {isNoCreditCST(cstPis) && (
                                <span title="Este CST não gera crédito" style={{ color: 'var(--warning)', fontSize: '0.7rem' }}>
                                    ⚠️
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Alíq PIS</label>
                        <input
                            type="number"
                            className="input-aliq"
                            value={group.aliqPis}
                            onChange={e => handleAliqChange('aliqPis', e.target.value)}
                            step="0.01"
                            min="0"
                            max="100"
                        />
                    </div>
                    <div className="input-group">
                        <label>CST COF</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="text"
                                className={`input-cst ${cstCofins ? 'filled' : ''}`}
                                value={cstCofins}
                                onChange={e => handleCstChange('novoCstCofins', e.target.value)}
                                placeholder="—"
                                maxLength={2}
                            />
                            {isNoCreditCST(cstCofins) && (
                                <span title="Este CST não gera crédito" style={{ color: 'var(--warning)', fontSize: '0.7rem' }}>
                                    ⚠️
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Alíq COF</label>
                        <input
                            type="number"
                            className="input-aliq"
                            value={group.aliqCofins}
                            onChange={e => handleAliqChange('aliqCofins', e.target.value)}
                            step="0.01"
                            min="0"
                            max="100"
                        />
                    </div>

                    <span className={`ncm-card-expand ${expanded ? 'open' : ''}`} onClick={() => setExpanded(!expanded)}>
                        <IconChevronDown size={16} />
                    </span>
                </div>
            </div>

            <div className={`ncm-card-products ${expanded ? 'open' : ''}`}>
                <div className="product-row" style={{ fontWeight: 600, color: 'var(--text-tertiary)', fontSize: '0.65rem', textTransform: 'uppercase' }}>
                    <span>Descrição</span>
                    <span style={{ textAlign: 'center' }}>CFOP</span>
                    <span style={{ textAlign: 'right' }}>Base Cálc.</span>
                    <span style={{ textAlign: 'right' }}>Crédito</span>
                </div>
                {group.records.map((rec, i) => {
                    const base = calcBaseCalculo(rec.vlItem, rec.vlDesc || 0);
                    const pis = cstPis && cstGeraCredito(cstPis) ? calcPis(base, group.aliqPis, cstPis) : 0;
                    const cofins = cstCofins && cstGeraCredito(cstCofins) ? calcCofins(base, group.aliqCofins, cstCofins) : 0;

                    return (
                        <div key={i} className="product-row">
                            <span className="product-desc" title={rec.description}>
                                {rec.description}
                            </span>
                            <span className="product-cfop">{rec.cfop}</span>
                            <span className="product-value">{formatMoney(base)}</span>
                            <span className="product-value" style={pis + cofins > 0 ? { color: 'var(--success)' } : {}}>
                                {pis + cofins > 0 ? `+${formatMoney(pis + cofins)}` : '—'}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function formatMoney(value) {
    if (!value) return 'R$ 0,00';
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
