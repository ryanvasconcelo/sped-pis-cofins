import { useState, useCallback } from 'react';
import { IconX, IconPlus, IconTrash } from './Icons';

export default function DeParaModal({ rules, onSave, onClose }) {
    const [localRules, setLocalRules] = useState([...rules]);

    const handleAdd = () => {
        setLocalRules([...localRules, { id: Date.now(), ncm: '', codItem: '', cstAtual: '', novoCst: '' }]);
    };

    const handleRemove = (id) => {
        setLocalRules(localRules.filter(r => r.id !== id));
    };

    const handleChange = (id, field, value) => {
        setLocalRules(localRules.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    return (
        <div className="onboarding-overlay" onClick={onClose}>
            <div className="onboarding-modal" style={{ maxWidth: '800px', width: '90%' }} onClick={e => e.stopPropagation()}>
                <div className="onboarding-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>Regras De-Para</h3>
                        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                            Configure regras para aplicar CSTs automaticamente com base no NCM, Código do Produto e CST atual.
                        </p>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <IconX size={20} />
                    </button>
                </div>

                <div className="depara-content" style={{ marginTop: '1.5rem', maxHeight: '50vh', overflowY: 'auto' }}>
                    {localRules.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-tertiary)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                            Nenhuma regra cadastrada.<br />Clique abaixo para adicionar sua primeira regra.
                        </div>
                    ) : (
                        <div className="depara-table">
                            <div className="depara-header" style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1.5fr) minmax(100px, 1fr) 80px 80px 40px', gap: '0.5rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem', padding: '0 0.5rem' }}>
                                <span>NCM (Opcional)</span>
                                <span>Cód Produto (Opcional)</span>
                                <span>CST Atual</span>
                                <span>Novo CST</span>
                                <span></span>
                            </div>
                            {localRules.map(rule => (
                                <div key={rule.id} className="depara-row" style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1.5fr) minmax(100px, 1fr) 80px 80px 40px', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
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

                <div className="onboarding-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button className="btn btn-primary" onClick={() => onSave(localRules.filter(r => r.novoCst))}>
                        Salvar e Aplicar
                    </button>
                </div>
            </div>
        </div>
    );
}
