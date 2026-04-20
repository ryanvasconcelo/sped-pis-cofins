import { useState, useRef, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useConciliacaoBancaria } from '../hooks/useConciliacaoBancaria';
import { STATUS_BANCO } from '../lib/banco-razao/banco-reconciler';
import {
    IconUpload, IconRefresh, IconX, IconSearch,
    IconDownload, IconWarning, IconCheck,
} from '../components/Icons';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v) {
    if (typeof v !== 'number') return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function absFmt(v) { return fmt(Math.abs(v)); }
function sign(v) { return v > 0.05 ? '+' : v < -0.05 ? '-' : ''; }

// ── Status Config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
    [STATUS_BANCO.CONCILIADO]:    { label: 'Conciliado (Consta no Razão e no Relatório Financeiro)',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    icon: '✓' },
    [STATUS_BANCO.DIVERGENTE]:    { label: 'Divergente',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '△' },
    [STATUS_BANCO.PENDENTE_RAZAO]:{ label: 'Pendente no razão e consta no relatório financeiro',    color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '✕' },
    [STATUS_BANCO.PENDENTE_BANCO]:{ label: 'Consta no razão porém não consta no relatório Financeiro',    color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: '?' },
    ANULADO:     { label: 'Anulado',         color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: '⊘' },
    ANULADO_INTERNO: { label: 'Int. Anulado', color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: '⊘' },
    ESTORNO:     { label: 'Estorno',          color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: '↩' },
};

// ── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ label, sublabel, accept, onFile, arquivo, onRemove, accent }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const onDrop = useCallback((e) => {
        e.preventDefault(); setDragging(false);
        const f = e.dataTransfer.files[0]; if (f) onFile(f);
    }, [onFile]);

    const onChange = useCallback((e) => {
        const f = e.target.files[0]; if (f) onFile(f);
        e.target.value = '';
    }, [onFile]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
            <div
                onClick={() => !arquivo && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                style={{
                    border: `1.5px dashed ${dragging ? accent : arquivo ? 'var(--border)' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-md)', padding: '14px 16px',
                    cursor: arquivo ? 'default' : 'pointer',
                    background: dragging ? `${accent}12` : arquivo ? 'var(--bg-secondary)' : 'transparent',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '52px',
                }}
            >
                {arquivo ? (
                    <>
                        <span style={{ color: accent, fontSize: '1.1rem', flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{arquivo.name}</span>
                        <button onClick={e => { e.stopPropagation(); onRemove(); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', flexShrink: 0 }}>
                            <IconX size={14} />
                        </button>
                    </>
                ) : (
                    <>
                        <IconUpload size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>{sublabel}</span>
                    </>
                )}
            </div>
            <input ref={inputRef} type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} />
        </div>
    );
}

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, highlight, sub, icon: Icon }) {
    return (
        <div className="relative overflow-hidden group p-5 bg-card/40 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 flex-1 min-w-[200px]">
            {/* Background Accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-110`} 
                 style={{ backgroundColor: highlight || 'var(--accent)' }} />
            
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
                    {Icon && <Icon size={14} className="text-muted-foreground/60" />}
                </div>
                <div className="text-2xl font-bold tracking-tight" style={{ color: highlight || 'var(--foreground)' }}>
                    {value}
                </div>
                {sub && (
                    <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground/80 font-medium">{sub}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── NettingPanel ─────────────────────────────────────────────────────────────

function NettingPanel({ resultado }) {
    const [open, setOpen] = useState(false);
    const ns = resultado.nettingSaldoStats;
    const nr = resultado.nettingRazaoStats;
    const totalAnulados = (ns.anulados || 0) + (nr.anulados || 0);

    return (
        <div className="bg-card/30 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden shadow-sm transition-all duration-300">
            <button
                onClick={() => setOpen(p => !p)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-500/10 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">
                        ⊘ {totalAnulados} Anulados
                    </div>
                    <div className="text-left">
                        <div className="text-xs font-bold text-foreground">Saneamento Interno (Netting)</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-tight">Lançamentos compensados antes da conciliação principal</div>
                    </div>
                </div>
                <div className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
                    <IconRefresh size={14} className="text-muted-foreground" />
                </div>
            </button>

            {open && (
                <div className="px-6 pb-6 pt-2 border-t border-border/40 bg-muted/10 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Coluna Saldo */}
                    <div>
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Relatório Banco
                        </div>
                        <div className="space-y-1 mb-4">
                            <div className="flex justify-between text-xs py-1 border-b border-border/30">
                                <span className="text-muted-foreground">Total Lido</span>
                                <span className="font-bold">{ns.total}</span>
                            </div>
                            <div className="flex justify-between text-xs py-1 border-b border-border/30">
                                <span className="text-muted-foreground font-medium text-rose-500/80">Estornos Explícitos</span>
                                <span className="font-bold text-rose-500">{ns.estornosExplicitos || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs py-1 border-b border-border/30">
                                <span className="text-muted-foreground font-medium text-amber-500/80">Anulados Internos</span>
                                <span className="font-bold text-amber-500">{ns.anuladosInternos || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs py-1 border-b border-border/30">
                                <span className="text-muted-foreground">Aptos p/ Matching</span>
                                <span className="font-bold text-emerald-500">{ns.ativos}</span>
                            </div>
                        </div>
                        
                        <div className="max-h-[200px] overflow-y-auto pr-2 space-y-1.5">
                            {resultado.saldoAnulados.map((l, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-card/20 border border-border/30 text-[10px]">
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="font-mono text-muted-foreground">#{l.nrOrigem}</span>
                                        <span className="truncate max-w-[150px] font-medium">{l.detalhes}</span>
                                    </div>
                                    <span className={`font-mono font-bold ${l.debito > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {l.debito > 0 ? fmt(l.debito) : `-${fmt(l.credito)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Coluna Razão */}
                    <div>
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Razão ERP
                        </div>
                        <div className="space-y-1 mb-4">
                            <div className="flex justify-between text-xs py-1 border-b border-border/30">
                                <span className="text-muted-foreground">Total Lido</span>
                                <span className="font-bold">{nr.total}</span>
                            </div>
                            <div className="flex justify-between text-xs py-1 border-b border-border/30">
                                <span className="text-muted-foreground font-medium text-amber-500/80">Anulados Internos</span>
                                <span className="font-bold text-amber-500">{nr.anuladosInternos || 0}</span>
                            </div>
                            <div className="flex justify-between text-xs py-1 border-b border-border/30">
                                <span className="text-muted-foreground">Aptos p/ Matching</span>
                                <span className="font-bold text-emerald-500">{nr.ativos}</span>
                            </div>
                        </div>

                        <div className="max-h-[200px] overflow-y-auto pr-2 space-y-1.5">
                            {resultado.razaoAnulados.map((l, i) => (
                                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-card/20 border border-border/30 text-[10px]">
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="font-mono text-muted-foreground">#{l.doc}</span>
                                        <span className="truncate max-w-[150px] font-medium">{l.nome || l.detalhes}</span>
                                    </div>
                                    <span className={`font-mono font-bold ${l.debito > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {l.debito > 0 ? fmt(l.debito) : `-${fmt(l.credito)}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Filter Bar ───────────────────────────────────────────────────────────────

function FilterBar({ filtroStatus, setFiltroStatus, contadores }) {
    const filters = [
        { key: 'TODOS', label: 'Todos', count: contadores.total },
        { key: STATUS_BANCO.DIVERGENTE, label: 'Divergentes', count: contadores.divergentes },
        { key: STATUS_BANCO.PENDENTE_RAZAO, label: 'Pend. Razão', count: contadores.pendentesRazao },
        { key: STATUS_BANCO.PENDENTE_BANCO, label: 'Pend. Banco', count: contadores.pendentesBanco },
        { key: STATUS_BANCO.CONCILIADO, label: 'Conciliados', count: contadores.conciliados },
    ];

    return (
        <div className="flex gap-2 flex-wrap items-center">
            {filters.map(f => {
                const active = filtroStatus === f.key;
                const cfg = STATUS_CFG[f.key];
                const activeColor = cfg ? cfg.color : 'var(--accent)';
                
                return (
                    <button 
                        key={f.key} 
                        onClick={() => setFiltroStatus(f.key)}
                        className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-tight transition-all duration-300 border ${
                            active 
                                ? 'bg-card shadow-sm' 
                                : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/40'
                        }`}
                        style={{ borderColor: active ? activeColor : undefined, color: active ? activeColor : undefined }}
                    >
                        {f.label}
                        <span className={`px-2 py-0.5 rounded-md text-[10px] transition-colors ${
                            active ? 'bg-foreground/5 text-foreground/80' : 'bg-muted text-muted-foreground'
                        }`}>
                            {f.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const cfg = STATUS_CFG[status] || STATUS_CFG[STATUS_BANCO.PENDENTE_BANCO];
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
              style={{ color: cfg.color, backgroundColor: cfg.bg }}>
            <span className="text-[12px]">{cfg.icon}</span>
            {cfg.label.split('(')[0].trim()}
        </span>
    );
}

// ── Result Row ───────────────────────────────────────────────────────────────

const gridLayout = '90px 90px minmax(160px, 1fr) 110px 110px 80px 120px';

function ResultRow({ item, index }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CFG[item.status] || STATUS_CFG[STATUS_BANCO.PENDENTE_BANCO];
    const isEven = index % 2 === 0;
    const chaveDoc = item.razaoDoc || item.saldoNrOrigem || '—';
    const nomeDesc = item.razaoNome || item.saldoDetalhes || '—';
    const dataStr = item.razaoDataStr || item.saldoDataStr || '—';
    const valorSaldo = item.lancamentosSaldo.length > 0 ? item.saldoCdML : null;
    const valorRazao = item.lancamentosRazao.length > 0 ? item.razaoValor : null;

    return (
        <div className="flex flex-col border-b border-border/30">
            <div 
                onClick={() => setExpanded(!expanded)}
                className={`grid grid-cols-[100px_90px_1fr_120px_120px_100px_160px] items-center px-6 py-3.5 hover:bg-muted/40 transition-colors group cursor-pointer ${!isEven ? 'bg-muted/10' : ''}`}
            >
                <div className="text-xs font-black font-mono text-foreground/80 flex items-center gap-2">
                    <span className={`text-[10px] transition-transform ${expanded ? 'rotate-90' : ''}`}>▸</span>
                    #{chaveDoc}
                </div>
                <div className="text-[11px] font-medium text-muted-foreground font-mono">{dataStr}</div>
                <div className="pr-4">
                    <div className="text-[11px] font-bold text-foreground line-clamp-1 truncate">{nomeDesc}</div>
                    <div className="text-[10px] text-muted-foreground/70 truncate">{item.saldoContaContrapartida || item.razaoDetalhes || ''}</div>
                </div>
                <div className="text-right font-mono text-xs font-bold">
                    {valorSaldo !== null ? fmt(Math.abs(valorSaldo)) : '—'}
                </div>
                <div className="text-right font-mono text-xs font-bold">
                    {valorRazao !== null ? fmt(Math.abs(valorRazao)) : '—'}
                </div>
                <div className={`text-right font-mono text-xs font-black ${item.status === STATUS_BANCO.CONCILIADO ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {item.status === STATUS_BANCO.CONCILIADO ? 'OK' : absFmt(item.deltaAbs)}
                </div>
                <div className="flex justify-center">
                    <StatusBadge status={item.status} />
                </div>
            </div>

            {expanded && (
                <div className="px-10 py-6 bg-muted/20 border-t border-border/20 grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-1 duration-300">
                    {/* Fonte A */}
                    <div className="p-4 rounded-xl bg-card/40 border border-border/40">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Detalhamento Razão Interno
                        </div>
                        {item.lancamentosRazao.length === 0 ? (
                            <div className="text-xs text-muted-foreground font-medium italic">Nenhum lançamento correspondente encontrado no Razão.</div>
                        ) : item.lancamentosRazao.map((l, i) => (
                            <div key={i} className="text-xs space-y-2">
                                <div className="flex justify-between pb-2 border-b border-border/20">
                                    <span className="text-muted-foreground">Documento</span>
                                    <span className="font-bold">#{l.doc}</span>
                                </div>
                                <div className="flex justify-between pb-2 border-b border-border/20">
                                    <span className="text-muted-foreground">Favorecido / Nome</span>
                                    <span className="font-bold">{l.nome}</span>
                                </div>
                                <div className="flex justify-between pb-2 border-b border-border/20">
                                    <span className="text-muted-foreground">Data Pagamento</span>
                                    <span className="font-bold">{l.dataPgtoStr}</span>
                                </div>
                                <div className="flex justify-between pt-2">
                                    <span className="text-muted-foreground">Movimentação</span>
                                    <div className="flex gap-4">
                                        <span className="text-emerald-500 font-bold">D: {fmt(l.debito)}</span>
                                        <span className="text-rose-500 font-bold">C: {fmt(l.credito)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Fonte B */}
                    <div className="p-4 rounded-xl bg-card/40 border border-border/40">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Detalhamento Relatório Financeiro
                        </div>
                        {item.lancamentosSaldo.length === 0 ? (
                            <div className="text-xs text-muted-foreground font-medium italic">Nenhum lançamento correspondente encontrado no Financeiro.</div>
                        ) : item.lancamentosSaldo.map((l, i) => (
                            <div key={i} className="text-xs space-y-2">
                                <div className="flex justify-between pb-2 border-b border-border/20">
                                    <span className="text-muted-foreground">Nº Origem / Transação</span>
                                    <span className="font-bold">#{l.nrOrigem} / {l.nrTransacao}</span>
                                </div>
                                <div className="flex justify-between pb-2 border-b border-border/20">
                                    <span className="text-muted-foreground">Conta Contrapartida</span>
                                    <span className="font-bold">{l.contaContrapartida}</span>
                                </div>
                                <div className="flex justify-between pb-2 border-b border-border/20">
                                    <span className="text-muted-foreground">Data do Lançamento</span>
                                    <span className="font-bold">{l.dataStr}</span>
                                </div>
                                <div className="flex justify-between pt-2">
                                    <span className="text-muted-foreground">Valor Líquido (ML)</span>
                                    <span className={`font-black ${l.cdML > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {fmt(l.cdML)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Legenda ──────────────────────────────────────────────────────────────────

const LEGENDA = [
    { status: STATUS_BANCO.DIVERGENTE, titulo: 'Divergente', desc: 'Lançamento encontrado nas duas fontes, mas com valores diferentes. Verificar se há erro de digitação, rateio ou data de competência errada.' },
    { status: STATUS_BANCO.PENDENTE_RAZAO, titulo: 'Pendente Razão', desc: 'Existe no Saldo Contábil (Fonte B) mas não tem par no Razão Interno (Fonte A). Possível falta de escrituração.' },
    { status: STATUS_BANCO.PENDENTE_BANCO, titulo: 'Pendente Banco', desc: 'Existe no Razão Interno (Fonte A) mas não tem par no Saldo Contábil (Fonte B). Possível lançamento digitado manualmente sem integração.' },
    { status: STATUS_BANCO.CONCILIADO, titulo: 'Conciliado', desc: 'Match perfeito entre as duas fontes. Diferença ≤ R$ 0,05. Nenhuma ação necessária.' },
];

function Legenda() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {LEGENDA.map(item => {
                const cfg = STATUS_CFG[item.status];
                return (
                    <div key={item.status} className="p-4 rounded-2xl bg-card/20 border border-border/40 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2 font-black uppercase tracking-widest text-[10px]" style={{ color: cfg.color }}>
                            <span className="text-lg">{cfg.icon}</span>
                            {item.titulo}
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground/80 font-medium">{item.desc}</p>
                    </div>
                );
            })}
        </div>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ConciliacaoBancariaPage() {
    const {
        arquivo1, arquivo2, arquivo3,
        setArquivo1, setArquivo2, setArquivo3,
        status, erro, resultado, resultadosFiltrados,
        filtroStatus, setFiltroStatus,
        buscaTexto, setBuscaTexto,
        processar, limpar, pronto, processing,
    } = useConciliacaoBancaria();

    const accentA = '#6366f1'; // Razão — índigo
    const accentB = '#0ea5e9'; // Saldo — azul
    const accentC = '#8b5cf6'; // Extrato — roxo

    const diferencaGeral = resultado?.diferencaGeral ?? 0;
    const diferencaColor = Math.abs(diferencaGeral) <= 0.05 ? '#22c55e' : '#ef4444';

    // ── Export ──────────────────────────────────────────────────────────────
    const handleExport = () => {
        if (!resultado) return;
        
        const wb = XLSX.utils.book_new();

        // Aba 1: Razão x Financeiro
        const data = resultadosFiltrados.map(r => ({
            'Doc / Nº Origem': r.razaoDoc || r.saldoNrOrigem || '',
            'Data': r.razaoDataStr || r.saldoDataStr || '',
            'Nome / Descrição': r.razaoNome || r.saldoDetalhes || '',
            'Conta Contrapartida': r.saldoContaContrapartida || r.razaoDetalhes || '',
            'Valor Saldo (B)': r.lancamentosSaldo.length > 0 ? r.saldoCdML : '',
            'Valor Razão (A)': r.lancamentosRazao.length > 0 ? r.razaoValor : '',
            'Delta': r.delta,
            'Status': STATUS_CFG[r.status]?.label || r.status,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Conciliação Principal');

        // Aba 2: Netting
        const nettingData = [
            ...resultado.saldoAnulados.map(l => ({
                Fonte: 'Saldo (B)', Doc: l.nrOrigem, Detalhes: l.detalhes,
                Débito: l.debito, Crédito: l.credito, Status: STATUS_CFG[l.status]?.label || l.status,
            })),
            ...resultado.razaoAnulados.map(l => ({
                Fonte: 'Razão (A)', Doc: l.doc, Detalhes: l.detalhes || l.nome,
                Débito: l.debito, Crédito: l.credito, Status: STATUS_CFG[l.status]?.label || l.status,
            })),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nettingData), 'Lançamentos Anulados');

        // Aba 3: Extrato Diário
        if (resultado.analiseExtrato) {
            const diariodata = resultado.analiseExtrato.resultadosPorDia.map(d => ({
                'Data': d.dataDisplay,
                'Extrato - Débito': d.extratoDebito,
                'Extrato - Crédito': d.extratoCredito,
                'Financeiro - Débito': d.financeiroDebito,
                'Financeiro - Crédito': d.financeiroCredito,
                'Δ Débito': d.deltaDebito,
                'Δ Crédito': d.deltaCredito,
                'Status': d.status
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(diariodata), 'Auditoria Extrato Diária');

            // Aba 4: Categorias Extrato
            const catdata = [
                ...resultado.analiseExtrato.categorias.aplicacao.map(i => ({ Categoria: 'Aplicação', Data: i.dataStr, Descrição: i.descricao, Valor: i.credito || -i.debito })),
                ...resultado.analiseExtrato.categorias.resgate.map(i => ({ Categoria: 'Resgate', Data: i.dataStr, Descrição: i.descricao, Valor: i.credito || -i.debito })),
                ...resultado.analiseExtrato.categorias.rendimento.map(i => ({ Categoria: 'Rendimento', Data: i.dataStr, Descrição: i.descricao, Valor: i.credito || -i.debito })),
                ...resultado.analiseExtrato.categorias.tarifa.map(i => ({ Categoria: 'Tarifa', Data: i.dataStr, Descrição: i.descricao, Valor: i.credito || -i.debito })),
            ];
            if (catdata.length > 0) {
                 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catdata), 'Categorias Extrato');
            }
        }

        XLSX.writeFile(wb, `Auditoria_Completa_${Date.now()}.xlsx`);
    };

    return (
        <AppLayout breadcrumbs={[{ label: 'Conciliação Bancária' }]}>

            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-card/50 p-4 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                        <IconSearch size={16} className="text-sky-500" />
                    </div>
                    <h2 className="text-xl font-display font-bold">Conciliação Bancária</h2>
                    <span className="text-xs px-2 py-1 border border-border rounded-full text-muted-foreground">Netting</span>
                </div>
                <div className="flex items-center gap-2">
                    {resultado && (
                        <button onClick={limpar} className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md hover:bg-muted transition-colors text-sm font-medium">
                            <IconRefresh size={14} /> Nova Análise
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">

                {/* ── Upload Section ── */}
                {!resultado && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.03em' }}>
                                Conciliação Bancária com Netting
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                Carregue o <strong>Razão Interno</strong> e o <strong>Saldo da Conta Contábil</strong> para identificar divergências. O motor de Netting remove automaticamente os lançamentos anulados antes do cruzamento.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>

                            {/* DropZone 1 */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: accentA, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 800 }}>1</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Arquivo 1</div>
                                    </div>
                                </div>
                                <DropZone
                                    label="Upload"
                                    sublabel="Ex: Razão ERP"
                                    accept=".xlsx,.xls,.csv,.pdf"
                                    arquivo={arquivo1}
                                    onFile={setArquivo1}
                                    onRemove={() => setArquivo1(null)}
                                    accent={accentA}
                                />
                            </div>

                            {/* DropZone 2 */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: accentB, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 800 }}>2</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Arquivo 2</div>
                                    </div>
                                </div>
                                <DropZone
                                    label="Upload"
                                    sublabel="Ex: Relatório Financeiro"
                                    accept=".xlsx,.xls,.csv,.pdf"
                                    arquivo={arquivo2}
                                    onFile={setArquivo2}
                                    onRemove={() => setArquivo2(null)}
                                    accent={accentB}
                                />
                            </div>

                            {/* DropZone 3 */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: accentC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'white', fontWeight: 800 }}>3</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Arquivo 3 (Opcional)</div>
                                    </div>
                                </div>
                                <DropZone
                                    label="Upload"
                                    sublabel="Ex: Extrato Bancário"
                                    accept=".xlsx,.xls,.csv,.pdf"
                                    arquivo={arquivo3}
                                    onFile={setArquivo3}
                                    onRemove={() => setArquivo3(null)}
                                    accent={accentC}
                                />
                            </div>
                        </div>

                        <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                            A ordem dos arquivos não importa. A IA analisará as colunas e determinará qual é o Razão, Relatório Financeiro ou Extrato Bancário. Para a conciliação linha-a-linha (Netting) o Razão e o Relatório Financeiro são obrigatórios. O Extrato ativa a validação de totais diários e categorias.
                        </div>

                        {/* Como funciona */}
                        <div style={{ padding: '18px 20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Como o Netting funciona</div>
                            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, flexShrink: 0 }}>1.</span>
                                    <span><strong>Saneamento:</strong> detecta lançamentos com "Anular entrada para pagamento nº X" e pares Déb/Créd de mesmo valor → marcados como Anulados</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, flexShrink: 0 }}>2.</span>
                                    <span><strong>Matching:</strong> cruza os lançamentos líquidos usando <strong>Doc === Nº Origem</strong></span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <span style={{ color: '#64748b', fontWeight: 700, flexShrink: 0 }}>3.</span>
                                    <span><strong>Sobras:</strong> o que não casou vira Pendente Razão ou Pendente Banco</span>
                                </div>
                            </div>
                        </div>

                        {erro && (
                            <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.85rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <IconWarning size={16} /> {erro}
                            </div>
                        )}

                        <button
                            onClick={processar}
                            disabled={!pronto || processing}
                            style={{
                                alignSelf: 'flex-start', padding: '12px 32px', borderRadius: 'var(--radius-md)',
                                background: pronto ? `linear-gradient(135deg, ${accentA}, ${accentB})` : 'var(--bg-secondary)',
                                color: pronto ? 'white' : 'var(--text-tertiary)',
                                border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: pronto ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: pronto ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {processing
                                ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Processando...</>
                                : <><IconSearch size={16} /> Iniciar Análise com Netting</>
                            }
                        </button>
                    </div>
                )}

                {/* ── Results Section ── */}
                {resultado && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease-out' }}>

                        {/* Dashboard Principal */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            <StatCard 
                                label="Conta Identificada" 
                                value={resultado.contaNome?.split(' ').pop() || '—'} 
                                sub={resultado.contaNome || 'Identificada no Saldo'}
                                icon={IconCheck}
                            />
                            <StatCard label="Total Saldo (B)" value={fmt(resultado.totalSaldo)} />
                            <StatCard label="Total Razão (A)" value={fmt(resultado.totalRazao)} />
                            <StatCard 
                                label="Diferença Geral" 
                                value={absFmt(diferencaGeral)} 
                                highlight={diferencaColor}
                                sub={Math.abs(diferencaGeral) <= 0.05 ? 'Fontes Batem' : (diferencaGeral > 0 ? 'Falta no Saldo' : 'Falta no Razão')}
                                icon={IconWarning}
                            />
                            <StatCard 
                                label="Divergentes" 
                                value={resultado.contadores.divergentes}
                                highlight={resultado.contadores.divergentes > 0 ? '#f59e0b' : undefined} 
                            />
                            <StatCard 
                                label="Pendências Totais" 
                                value={resultado.contadores.pendentesRazao + resultado.contadores.pendentesBanco}
                                highlight={(resultado.contadores.pendentesRazao + resultado.contadores.pendentesBanco) > 0 ? '#ef4444' : undefined} 
                            />
                        </div>

                        {/* Detalhes dos Arquivos */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 bg-muted/30 rounded-lg border border-border/40 text-[11px] font-medium text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentA }} />
                                <span>Razão ERP: <span className="text-foreground">{resultado.nomeArquivoRazao}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentB }} />
                                <span>Financeiro: <span className="text-foreground">{resultado.nomeArquivoSaldo}</span></span>
                            </div>
                            {resultado.nomeArquivoExtrato && (
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentC }} />
                                    <span>Extrato: <span className="text-foreground">{resultado.nomeArquivoExtrato}</span></span>
                                </div>
                            )}
                        </div>

                        {/* Validação de Extrato Bancário */}
                        {resultado.analiseExtrato && (
                            <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/60 shadow-sm overflow-hidden border-l-4" style={{ borderColor: accentC }}>
                                <div className="px-6 py-5 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-tight">
                                            <span className="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-500">
                                                <IconCheck size={14} />
                                            </span>
                                            Auditoria Bancária (Extrato vs Financeiro)
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1">Conferência de fluxos diários e categorização de movimentações bancárias</p>
                                    </div>
                                    <div className="px-3 py-1 bg-purple-500/10 text-purple-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        Validação Diária
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                        <div className="p-4 bg-muted/40 rounded-xl border border-border/40 text-center">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Aplicações</div>
                                            <div className="text-lg font-bold text-sky-500">{fmt(resultado.analiseExtrato.categorias.aplicacao.reduce((a,c)=>a+(c.credito||c.debito||0),0))}</div>
                                        </div>
                                        <div className="p-4 bg-muted/40 rounded-xl border border-border/40 text-center">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Resgates</div>
                                            <div className="text-lg font-bold text-emerald-500">{fmt(resultado.analiseExtrato.categorias.resgate.reduce((a,c)=>a+(c.credito||c.debito||0),0))}</div>
                                        </div>
                                        <div className="p-4 bg-muted/40 rounded-xl border border-border/40 text-center">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Rendimentos</div>
                                            <div className="text-lg font-bold text-amber-500">{fmt(resultado.analiseExtrato.categorias.rendimento.reduce((a,c)=>a+(c.credito||c.debito||0),0))}</div>
                                        </div>
                                        <div className="p-4 bg-muted/40 rounded-xl border border-border/40 text-center">
                                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Tarifas</div>
                                            <div className="text-lg font-bold text-rose-500">{fmt(resultado.analiseExtrato.categorias.tarifa.reduce((a,c)=>a+(c.credito||c.debito||0),0))}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1 flex items-center gap-2">
                                            <IconRefresh size={10} /> Status das Movimentações por Período
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {resultado.analiseExtrato.resultadosPorDia.map(d => {
                                                const isOk = d.status === 'CONCILIADO';
                                                return (
                                                    <div key={d.dataDisplay} className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                                                        isOk ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' 
                                                             : 'bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40'
                                                    }`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                                                                isOk ? 'bg-emerald-500/20 text-emerald-600' : 'bg-rose-500/20 text-rose-600'
                                                            }`}>
                                                                {d.dataDisplay.split('/')[0]}
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold">{d.dataDisplay}</div>
                                                                <div className={`text-[10px] font-medium ${isOk ? 'text-emerald-600/80' : 'text-rose-600/80'}`}>
                                                                    {isOk ? 'Movimentações Conferidas' : 'Divergência Encontrada'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {!isOk && (
                                                            <div className="text-right">
                                                                <div className="text-[10px] text-muted-foreground">Δ Déb/Créd</div>
                                                                <div className="text-xs font-mono font-bold text-rose-600">
                                                                    {absFmt(d.deltaDebito + d.deltaCredito)}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {isOk && <IconCheck size={14} className="text-emerald-500" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' }} />

                        {/* Netting Panel */}
                        <NettingPanel resultado={resultado} />

                        <Legenda />

                        {/* Lista de Resultados */}
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <FilterBar filtroStatus={filtroStatus} setFiltroStatus={setFiltroStatus} contadores={resultado.contadores} />
                                
                                <div className="flex items-center gap-3 flex-1 md:flex-none md:min-w-[400px]">
                                    <div className="relative flex-1">
                                        <IconSearch size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Filtrar por documento, nome ou conta..."
                                            value={buscaTexto}
                                            onChange={e => setBuscaTexto(e.target.value)}
                                            className="w-full pl-11 pr-4 py-2.5 bg-card/40 border border-border/60 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                        />
                                    </div>
                                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
                                        <IconDownload size={14} /> Exportar
                                    </button>
                                </div>
                            </div>

                            <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/60 shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <div className="min-w-[1000px]">
                                        {/* Header da Tabela */}
                                        <div className="grid grid-cols-[100px_90px_1fr_120px_120px_100px_160px] items-center px-6 py-4 bg-muted/30 border-b border-border/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                            <div>Doc/Origem</div>
                                            <div>Data</div>
                                            <div>Descrição / Detalhes</div>
                                            <div className="text-right">Saldo (B)</div>
                                            <div className="text-right">Razão (A)</div>
                                            <div className="text-right">Delta</div>
                                            <div className="text-center">Status</div>
                                        </div>

                                        {/* Corpo da Tabela */}
                                        <div className="relative">
                                            {resultadosFiltrados.length === 0 ? (
                                                <div className="py-20 text-center flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                                                        <IconSearch size={24} />
                                                    </div>
                                                    <p className="text-sm text-muted-foreground font-medium">Nenhum lançamento encontrado para os filtros aplicados</p>
                                                </div>
                                            ) : (
                                                <Virtuoso
                                                    style={{ height: '600px' }}
                                                    data={resultadosFiltrados}
                                                    itemContent={(index, item) => (
                                                        <ResultRow key={`${item.razaoDoc || item.saldoNrOrigem}-${index}`} item={item} index={index} />
                                                    )}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-3 bg-muted/20 border-t border-border/50 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-1 rounded-full bg-primary" />
                                        Exibindo {resultadosFiltrados.length} de {resultado.contadores.total} registros
                                    </div>
                                    <div>Pressione em uma linha para ver a origem</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </AppLayout>
    );
}
