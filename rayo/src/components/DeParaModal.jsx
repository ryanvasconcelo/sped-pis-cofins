import { useState, useEffect } from 'react';
import { IconX, IconPlus, IconTrash } from './Icons';

export default function DeParaModal({ rules, onSave, onApplySelected, onRevertSelected, onClose }) {
    const [localRules, setLocalRules] = useState([...rules]);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        setLocalRules([...rules]);
    }, [rules]);

    const handleAdd = () => {
        setLocalRules([...localRules, { id: Date.now(), ncm: '', codItem: '', cstAtual: '', novoCst: '', appliedAt: null }]);
    };

    const handleRemove = (id) => {
        setLocalRules(localRules.filter(r => r.id !== id));
        setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    };

    const handleChange = (id, field, value) => {
        setLocalRules(localRules.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectedIds.length === localRules.length && localRules.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(localRules.map(r => r.id));
        }
    };

    const handleApply = () => {
        const validRules = localRules.filter(r => r.novoCst);
        onSave(validRules);
        onApplySelected(selectedIds);
    };

    const handleRevert = () => {
        const validRules = localRules.filter(r => r.novoCst);
        onSave(validRules);
        onRevertSelected(selectedIds);
    };

    const handleSaveClose = () => {
        onSave(localRules.filter(r => r.novoCst));
        onClose();
    };

    const allSelected = localRules.length > 0 && selectedIds.length === localRules.length;

    return (
        <div className="onboarding-overlay" onClick={onClose}>
            <div className="onboarding-modal" style={{ maxWidth: '900px', width: '90%' }} onClick={e => e.stopPropagation()}>
                <div className="onboarding-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Regras De-Para</h3>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Configure regras com NCM e Código do Produto, selecione e aplique ao SPED carregado.
                        </p>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <IconX size={20} />
                    </button>
                </div>

                <div className="depara-content" style={{ marginTop: '1.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
                    {localRules.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-tertiary)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                            Nenhuma regra cadastrada.<br />Clique abaixo para adicionar sua primeira regra.
                        </div>
                    ) : (
                        <div className="depara-table">
                            <div className="depara-header" style={{ display: 'grid', gridTemplateColumns: '40px minmax(100px, 1.2fr) minmax(100px, 1fr) 80px 80px 100px 40px', gap: '0.5rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', padding: '0 0.5rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                                </div>
                                <span>NCM (Opcional)</span>
                                <span>Cód (Opcional)</span>
                                <span>De (CST)</span>
                                <span>Para (CST)</span>
                                <span style={{ textAlign: 'center' }}>Status</span>
                                <span></span>
                            </div>
                            {localRules.map(rule => (
                                <div key={rule.id} className="depara-row" style={{ display: 'grid', gridTemplateColumns: '40px minmax(100px, 1.2fr) minmax(100px, 1fr) 80px 80px 100px 40px', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: selectedIds.includes(rule.id) ? 'var(--accent-soft)' : 'var(--bg-secondary)', borderRadius: '6px', border: selectedIds.includes(rule.id) ? '1px solid var(--accent)' : '1px solid transparent' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <input type="checkbox" checked={selectedIds.includes(rule.id)} onChange={() => toggleSelect(rule.id)} style={{ cursor: 'pointer' }} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Ex: 15079011"
                                        value={rule.ncm}
                                        onChange={e => handleChange(rule.id, 'ncm', e.target.value.replace(/\D/g, ''))}
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Ex: 1004"
                                        value={rule.codItem}
                                        onChange={e => handleChange(rule.id, 'codItem', e.target.value)}
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Ex: 73"
                                        value={rule.cstAtual}
                                        onChange={e => handleChange(rule.id, 'cstAtual', e.target.value.replace(/\D/g, '').slice(0, 2))}
                                        style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Obrigatório"
                                        value={rule.novoCst}
                                        onChange={e => handleChange(rule.id, 'novoCst', e.target.value.replace(/\D/g, '').slice(0, 2))}
                                        className={!rule.novoCst ? 'error' : ''}
                                        style={{ width: '100%', padding: '0.5rem', border: !rule.novoCst ? '1px solid var(--danger)' : '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: 600,
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '12px',
                                            backgroundColor: rule.appliedAt ? 'var(--success-soft)' : 'var(--bg-tertiary)',
                                            color: rule.appliedAt ? 'var(--success)' : 'var(--text-tertiary)'
                                        }}>
                                            {rule.appliedAt ? 'Aplicada' : 'Não Aplicada'}
                                        </span>
                                    </div>
                                    <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleRemove(rule.id)}>
                                        <IconTrash size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ marginTop: '1rem' }}>
                        <button className="btn btn-secondary" onClick={handleAdd}>
                            <IconPlus size={14} /> Adicionar Regra
                        </button>
                    </div>
                </div>

                <div className="onboarding-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={handleRevert} disabled={selectedIds.length === 0}>
                            Reverter Selecionadas
                        </button>
                        <button className="btn btn-primary" onClick={handleApply} disabled={selectedIds.length === 0}>
                            Aplicar Selecionadas
                        </button>
                    </div>
                    <div>
                        <button className="btn btn-secondary" onClick={handleSaveClose}>
                            Salvar e Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
