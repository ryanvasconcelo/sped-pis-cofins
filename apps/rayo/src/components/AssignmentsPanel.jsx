import { useState, useMemo } from 'react';
import { IconX, IconCheck, IconDownload, IconBolt } from './Icons';

// CST codes com descrições para tooltips e selects
export const CST_PISCOFINS = [
    { cst: '01', label: 'Op. Tributável – BC = Valor Op. (Alíq. Normal)' },
    { cst: '02', label: 'Op. Tributável – BC = Valor Op. (Alíq. Diferenc.)' },
    { cst: '03', label: 'Op. Tributável – BC = Qde Vendida (Alíq. por Unid.)' },
    { cst: '04', label: 'Op. Tributável – Tributação Monofásica (Zero)' },
    { cst: '05', label: 'Op. Tributável – Substituição Tributária' },
    { cst: '06', label: 'Op. Tributável – Alíquota Zero' },
    { cst: '07', label: 'Op. Isenta da Contribuição' },
    { cst: '08', label: 'Op. sem Incidência da Contribuição' },
    { cst: '09', label: 'Op. com Suspensão da Contribuição' },
    { cst: '49', label: 'Outras Op. de Saída' },
    { cst: '50', label: 'Op. com Direito a Crédito – Vinculada Excl. a Rec. Tributadas/Não-Cumulativo' },
    { cst: '51', label: 'Op. com Direito a Crédito – Vinculada Excl. a Rec. Não-Tributadas/Não-Cumulativo' },
    { cst: '52', label: 'Op. com Direito a Crédito – Vinculada Excl. a Rec. de Exportação/Não-Cumulativo' },
    { cst: '53', label: 'Op. com Direito a Crédito – Vinculada a Rec. Tributadas e Não-Tributadas/Não-Cumulativo' },
    { cst: '54', label: 'Op. com Direito a Crédito – Vinculada a Rec. Tributadas e de Exportação' },
    { cst: '55', label: 'Op. com Direito a Crédito – Vinculada a Rec. Não-Tributadas e de Exportação' },
    { cst: '56', label: 'Op. com Direito a Crédito – Vinculada a Rec. Tributadas, Não-Tributadas e de Exportação' },
    { cst: '60', label: 'Crédito Presumido – Op. de Aquisição Vinculada a Rec. Tributadas/Não-Cumulativo' },
    { cst: '70', label: 'Op. de Aquisição sem Direito a Crédito' },
    { cst: '71', label: 'Op. de Aquisição com Isenção' },
    { cst: '72', label: 'Op. de Aquisição com Suspensão' },
    { cst: '73', label: 'Op. de Aquisição a Alíquota Zero' },
    { cst: '74', label: 'Op. de Aquisição; sem Incidência da Contribuição' },
    { cst: '75', label: 'Op. de Aquisição por Substituição Tributária' },
    { cst: '98', label: 'Outras Op. de Entrada' },
    { cst: '99', label: 'Outras Op.' },
];

function CstSelect({ label, value, onChange }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                style={{
                    padding: '6px 8px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.82rem',
                    outline: 'none',
                    cursor: 'pointer',
                    minWidth: '120px'
                }}
            >
                <option value="">— Selecione —</option>
                {CST_PISCOFINS.map(c => (
                    <option key={c.cst} value={c.cst} title={c.label}>{c.cst} – {c.label.split('–')[0].trim()}</option>
                ))}
            </select>
        </div>
    );
}

const ALIQ_PIS_PADRAO = 1.65;
const ALIQ_COFINS_PADRAO = 7.6;
const FORM_DEFAULT = { label: '', cstPis: '', cstCofins: '', aliqPis: ALIQ_PIS_PADRAO, aliqCofins: ALIQ_COFINS_PADRAO };

export default function AssignmentsPanel({
    onClose,
    onApplyAll,     // fn() — page handles feedback+scroll
    cstKeys,
    assignments,
    assignedCount,
    ncmCount,
    ncmList,        // [{ ncm, count, example }]
    createKey,
    updateKey,
    removeKey,
    assign,
    unassign,
    clearAll,
    exportCsv,
}) {
    const [activeTab, setActiveTab] = useState('chaves');
    const [form, setForm] = useState(FORM_DEFAULT);
    const [editingId, setEditingId] = useState(null);

    // Multi-select state for NCM assignment
    const [ncmSearch, setNcmSearch] = useState('');
    const [selectedNcms, setSelectedNcms] = useState(new Set());
    const [selectedKeyId, setSelectedKeyId] = useState('');

    const filteredNcmList = useMemo(() => {
        if (!ncmList) return [];
        const q = ncmSearch.toLowerCase();
        return ncmList.filter(n =>
            n.ncm.includes(q) || (n.example || '').toLowerCase().includes(q)
        );
    }, [ncmList, ncmSearch]);

    const toggleNcm = (ncm) => {
        setSelectedNcms(prev => {
            const next = new Set(prev);
            next.has(ncm) ? next.delete(ncm) : next.add(ncm);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedNcms.size === filteredNcmList.length) {
            setSelectedNcms(new Set());
        } else {
            setSelectedNcms(new Set(filteredNcmList.map(n => n.ncm)));
        }
    };

    const handleAssignSelected = () => {
        if (!selectedKeyId || selectedNcms.size === 0) return;
        selectedNcms.forEach(ncm => assign(selectedKeyId, ncm));
        setSelectedNcms(new Set());
        setNcmSearch('');
    };

    const handleSaveKey = () => {
        if (!form.label || !form.cstPis || !form.cstCofins) return;
        if (editingId) {
            updateKey({ id: editingId, ...form, aliqPis: parseFloat(form.aliqPis) || 0, aliqCofins: parseFloat(form.aliqCofins) || 0 });
        } else {
            createKey({ ...form, aliqPis: parseFloat(form.aliqPis) || 0, aliqCofins: parseFloat(form.aliqCofins) || 0 });
        }
        setForm(FORM_DEFAULT);
        setEditingId(null);
    };

    const startEdit = (key) => {
        setForm({ label: key.label, cstPis: key.cstPis, cstCofins: key.cstCofins, aliqPis: key.aliqPis, aliqCofins: key.aliqCofins });
        setEditingId(key.id);
        setActiveTab('chaves');
    };

    const progressPct = ncmCount > 0 ? Math.round((assignedCount / ncmCount) * 100) : 0;
    const allFilteredSelected = filteredNcmList.length > 0 && filteredNcmList.every(n => selectedNcms.has(n.ncm));

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease'
        }} onClick={onClose}>
            <div style={{
                width: '740px', maxWidth: '95vw', maxHeight: '90vh',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'fadeIn 0.25s ease'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>⚙️ Sistema de Atribuições CST</h2>
                            <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                Crie chaves compostas e atribua-as a NCMs. As atribuições ficam salvas entre sessões.
                            </p>
                        </div>
                        <button onClick={onClose} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                            <IconX size={16} />
                        </button>
                    </div>

                    {/* Progresso */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Progresso de Atribuição
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: progressPct === 100 ? 'var(--success)' : 'var(--accent)' }}>
                                {assignedCount} / {ncmCount} NCMs ({progressPct}%)
                            </span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', width: `${progressPct}%`,
                                background: progressPct === 100 ? 'var(--success)' : 'var(--accent)',
                                borderRadius: '3px', transition: 'width 0.5s ease'
                            }} />
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                            { id: 'chaves', label: `🔑 Chaves CST (${cstKeys.length})` },
                            { id: 'atribuicoes', label: `📌 Atribuições (${assignedCount})` }
                        ].map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                                border: '1px solid var(--border)',
                                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                                background: activeTab === tab.id ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', marginBottom: '-1px'
                            }}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

                    {/* Tab: Chaves CST */}
                    {activeTab === 'chaves' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                                <p style={{ margin: '0 0 12px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                    {editingId ? '✏️ Editar Chave' : '+ Nova Chave CST'}
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Nome da Chave *
                                        </label>
                                        <input
                                            value={form.label}
                                            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                                            placeholder="Ex: Monofásico Revenda, Tributado Crédito..."
                                            style={{ width: '100%', marginTop: '4px', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                    <CstSelect label="CST PIS *" value={form.cstPis} onChange={v => setForm(f => ({ ...f, cstPis: v }))} />
                                    <CstSelect label="CST COFINS *" value={form.cstCofins} onChange={v => setForm(f => ({ ...f, cstCofins: v }))} />
                                    <div>
                                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alíq. PIS (%)</label>
                                        <input type="number" step="0.01" value={form.aliqPis}
                                            onChange={e => setForm(f => ({ ...f, aliqPis: e.target.value }))}
                                            style={{ width: '100%', marginTop: '4px', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alíq. COFINS (%)</label>
                                        <input type="number" step="0.01" value={form.aliqCofins}
                                            onChange={e => setForm(f => ({ ...f, aliqCofins: e.target.value }))}
                                            style={{ width: '100%', marginTop: '4px', padding: '7px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleSaveKey}
                                        disabled={!form.label || !form.cstPis || !form.cstCofins}
                                        style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', border: 'none', color: '#1a1a2e', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: (!form.label || !form.cstPis || !form.cstCofins) ? 0.4 : 1 }}>
                                        <IconCheck size={14} /> {editingId ? 'Salvar Edição' : 'Criar Chave'}
                                    </button>
                                    {editingId && (
                                        <button onClick={() => { setEditingId(null); setForm(FORM_DEFAULT); }} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.82rem', cursor: 'pointer' }}>
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </div>

                            {cstKeys.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem', padding: '20px' }}>
                                    Nenhuma chave criada ainda. Crie a primeira acima.
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {cstKeys.map(key => (
                                        <div key={key.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'monospace' }}>PIS {key.cstPis}</span>
                                                    <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'monospace' }}>COF {key.cstCofins}</span>
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem' }}>{key.label}</p>
                                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                                                        Alíq: PIS {key.aliqPis}% / COFINS {key.aliqCofins}%
                                                        {' · '}{assignments.filter(a => a.cstKeyId === key.id).length} NCMs
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => startEdit(key)} style={{ padding: '4px 10px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer' }}>Editar</button>
                                                <button onClick={() => removeKey(key.id)} style={{ padding: '4px 10px', border: '1px solid var(--danger)', borderRadius: '4px', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '0.72rem', cursor: 'pointer' }}>Remover</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Atribuições */}
                    {activeTab === 'atribuicoes' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Bulk assignment area */}
                            {cstKeys.length > 0 && ncmList?.length > 0 && (
                                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                            Atribuir NCMs a uma Chave CST
                                        </p>
                                        {selectedNcms.size > 0 && (
                                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: '10px' }}>
                                                {selectedNcms.size} selecionados
                                            </span>
                                        )}
                                    </div>

                                    {/* Chave selector */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chave CST a Aplicar</label>
                                        <select value={selectedKeyId} onChange={e => setSelectedKeyId(e.target.value)}
                                            style={{ width: '100%', marginTop: '4px', padding: '8px 10px', background: 'var(--bg-input)', border: selectedKeyId ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}>
                                            <option value="">— Selecione a Chave CST —</option>
                                            {cstKeys.map(k => (
                                                <option key={k.id} value={k.id}>{k.label}  (PIS {k.cstPis} / COF {k.cstCofins})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* NCM search + multi-checkbox list */}
                                    <div style={{ marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                                            <input
                                                type="text"
                                                placeholder="🔍 Buscar NCM ou produto..."
                                                value={ncmSearch}
                                                onChange={e => setNcmSearch(e.target.value)}
                                                style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit' }}
                                            />
                                            <button onClick={toggleAll} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                                                {allFilteredSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                            </button>
                                        </div>
                                        <div style={{ maxHeight: '180px', overflowY: 'auto', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                                            {filteredNcmList.length === 0 ? (
                                                <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.78rem', padding: '12px' }}>Nenhum NCM encontrado</p>
                                            ) : filteredNcmList.map(n => {
                                                const alreadyAssigned = assignments.some(a => a.ncm === n.ncm);
                                                return (
                                                    <label key={n.ncm} style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        padding: '7px 12px', cursor: 'pointer',
                                                        borderBottom: '1px solid var(--border)',
                                                        background: selectedNcms.has(n.ncm) ? 'var(--accent-soft)' : 'transparent',
                                                        transition: 'background 0.15s'
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedNcms.has(n.ncm)}
                                                            onChange={() => toggleNcm(n.ncm)}
                                                            style={{ accentColor: 'var(--accent)', width: '14px', height: '14px', cursor: 'pointer' }}
                                                        />
                                                        <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{n.ncm}</span>
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.example}</span>
                                                        {alreadyAssigned && (
                                                            <span style={{ fontSize: '0.65rem', background: 'rgba(79,70,229,0.1)', color: 'var(--border-focus)', padding: '1px 6px', borderRadius: '8px', flexShrink: 0 }}>
                                                                📌 Atribuído
                                                            </span>
                                                        )}
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleAssignSelected}
                                        disabled={!selectedKeyId || selectedNcms.size === 0}
                                        style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--accent)', border: 'none', color: '#1a1a2e', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: (!selectedKeyId || selectedNcms.size === 0) ? 0.4 : 1 }}>
                                        <IconCheck size={14} />
                                        Atribuir {selectedNcms.size > 0 ? `${selectedNcms.size} NCM${selectedNcms.size > 1 ? 's' : ''}` : 'NCMs'} Selecionados
                                    </button>
                                </div>
                            )}

                            {/* Lista de atribuições salvas */}
                            {assignments.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem', padding: '20px' }}>
                                    Nenhuma atribuição ainda. {cstKeys.length === 0 ? 'Crie uma chave CST primeiro.' : 'Selecione NCMs acima e atribua.'}
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <p style={{ margin: '0 0 6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Atribuições Salvas ({assignments.length})
                                    </p>
                                    {assignments.map(a => {
                                        const key = cstKeys.find(k => k.id === a.cstKeyId);
                                        if (!key) return null;
                                        return (
                                            <div key={a.ncm} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>{a.ncm}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>→</span>
                                                    <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>PIS {key.cstPis}</span>
                                                    <span style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>COF {key.cstCofins}</span>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{key.label}</span>
                                                </div>
                                                <button onClick={() => unassign(a.ncm)} style={{ padding: '3px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'transparent', color: 'var(--text-tertiary)', fontSize: '0.7rem', cursor: 'pointer' }}>
                                                    Remover
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ borderTop: '1px solid var(--border)', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={exportCsv} disabled={assignments.length === 0}
                            style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', opacity: assignments.length === 0 ? 0.4 : 1 }}>
                            <IconDownload size={13} /> Export CSV
                        </button>
                        {assignments.length > 0 && (
                            <button onClick={() => { if (confirm('Apagar todas as atribuições?')) clearAll(); }}
                                style={{ padding: '7px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger)', background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                                Limpar Todas
                            </button>
                        )}
                    </div>
                    <button
                        onClick={onApplyAll}
                        disabled={assignments.length === 0}
                        style={{ padding: '9px 20px', borderRadius: 'var(--radius-md)', background: 'var(--success)', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px 0 rgba(5, 150, 105, 0.3)', opacity: assignments.length === 0 ? 0.4 : 1 }}>
                        <IconBolt size={16} /> Aplicar Todas as Atribuições
                    </button>
                </div>
            </div>
        </div>
    );
}
