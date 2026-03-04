import React, { useState, useRef, useCallback, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { useEstoqueAuditor } from '../hooks/useEstoqueAuditor';
import { useTheme } from '../hooks/useTheme';
import { STATUS_ESTOQUE } from '../lib/estoque/comparador';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    IconUpload, IconRefresh, IconWarning, IconCheck, IconX,
    IconSearch, IconSun, IconMoon, IconDownload
} from '../components/Icons';
import { Link } from 'react-router-dom';

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt(v) {
    if (typeof v !== 'number' || isNaN(v)) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDelta(v) {
    if (typeof v !== 'number' || isNaN(v)) return '—';
    const abs = Math.abs(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return v > 0 ? `+${abs}` : v < 0 ? `-${abs.replace('-', '')}` : 'R$ 0,00';
}

const MES_NOMES = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
};

// ── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    [STATUS_ESTOQUE.CONCILIADO]: { label: 'Conciliado', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', icon: '✓' },
    [STATUS_ESTOQUE.VALOR_DIVERGENTE]: { label: 'Valor Divergente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '≠' },
    [STATUS_ESTOQUE.SO_ESTOQUE]: { label: 'Só no Estoque', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: '⬆' },
    [STATUS_ESTOQUE.SO_RAZAO]: { label: 'Só no Razão', color: '#6366f1', bg: 'rgba(99,102,241,0.1)', icon: '⬇' },
    [STATUS_ESTOQUE.SAIDO_NO_RAZAO]: { label: 'Saído no Razão', color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: '⚠' },
    [STATUS_ESTOQUE.SEM_ENTRADA]: { label: 'Sem Entrada no Razão', color: '#dc2626', bg: 'rgba(220,38,38,0.12)', icon: '✕' },
    [STATUS_ESTOQUE.TIMING]: { label: 'Diferença de Competência', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', icon: '⏱' },
};

const ACCENT = '#f97316'; // laranja — cor do módulo Estoque

// Explicações por status para uso no PDF e no inline
const STATUS_ANALISE = {
    [STATUS_ESTOQUE.SAIDO_NO_RAZAO]: 'Chassi foi vendido (crédito) no Razão, mas ainda consta no Estoque. Possível falta de baixa manual, devolução não registrada ou múltiplas entradas (recompra).',
    [STATUS_ESTOQUE.SEM_ENTRADA]: 'Chassi tem venda registrada no Razão, mas nunca teve débito de compra vinculado. A nota fiscal de entrada foi lançada sem o número do chassi no histórico.',
    [STATUS_ESTOQUE.SO_ESTOQUE]: 'Chassi consta no Estoque, mas não aparece em nenhum lançamento do Razão. Nota fiscal de entrada pode não ter sido escriturada.',
    [STATUS_ESTOQUE.SO_RAZAO]: 'Chassi aparece no Razão, mas não consta no Estoque físico. Possível erro de digitação no chassi ou baixa já realizada.',
    [STATUS_ESTOQUE.VALOR_DIVERGENTE]: 'Chassi encontrado em ambos, mas os valores diferem. Possível ajuste de preço, devolução parcial ou NF com valores diferentes.',
    [STATUS_ESTOQUE.TIMING]: 'Chassi presente no Estoque, mas o débito contábil de entrada foi lançado em outro mês (diferença de competência). Não é um erro real.',
    [STATUS_ESTOQUE.CONCILIADO]: 'Conciliado — não requer ação.',
};

const STATUS_PENDENTE = [
    STATUS_ESTOQUE.SAIDO_NO_RAZAO,
    STATUS_ESTOQUE.SEM_ENTRADA,
    STATUS_ESTOQUE.SO_ESTOQUE,
    STATUS_ESTOQUE.SO_RAZAO,
    STATUS_ESTOQUE.VALOR_DIVERGENTE,
];

// ── Sub-componentes ──────────────────────────────────────────────────────────

function DropZone({ label, sublabel, accept, onFile, arquivo, onRemove }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
    }, [onFile]);

    const handleChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) onFile(file);
        e.target.value = '';
    }, [onFile]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
            <div
                onClick={() => !arquivo && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{
                    border: `1.5px dashed ${dragging ? ACCENT : arquivo ? 'var(--border)' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-md)', padding: '16px', cursor: arquivo ? 'default' : 'pointer',
                    background: dragging ? `${ACCENT}12` : arquivo ? 'var(--bg-secondary)' : 'transparent',
                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px', minHeight: '56px',
                }}
            >
                {arquivo ? (
                    <>
                        <span style={{ color: ACCENT, fontSize: '1.1rem', flexShrink: 0 }}>✓</span>
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
            <input ref={inputRef} type="file" accept={accept} onChange={handleChange} style={{ display: 'none' }} />
        </div>
    );
}

function TotalCard({ label, value, highlight, small }) {
    return (
        <div style={{
            padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            border: highlight ? `1.5px solid ${highlight}` : '1px solid var(--border)', flex: 1, minWidth: '150px',
        }}>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>{label}</div>
            <div style={{ fontSize: small ? '1rem' : '1.2rem', fontWeight: 800, color: highlight || 'var(--text-primary)', letterSpacing: '-0.02em' }}>{value}</div>
        </div>
    );
}

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return null;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px',
            borderRadius: '999px', fontSize: '0.73rem', fontWeight: 700,
            color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
        }}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

function FilterBar({ filtroStatus, setFiltroStatus, detalhesChassi }) {
    const counts = {};
    counts['TODOS'] = detalhesChassi.length;
    counts['PENDENTES'] = detalhesChassi.filter(d => STATUS_PENDENTE.includes(d.status)).length;
    Object.values(STATUS_ESTOQUE).forEach(s => {
        counts[s] = detalhesChassi.filter(d => d.status === s).length;
    });

    const filters = [
        { key: 'TODOS', label: 'Todos', color: 'var(--accent)' },
        { key: 'PENDENTES', label: '⚠️ Somente Pendentes', color: '#ef4444' },
        { key: STATUS_ESTOQUE.SAIDO_NO_RAZAO, label: 'Saído no Razão', color: STATUS_CONFIG[STATUS_ESTOQUE.SAIDO_NO_RAZAO].color },
        { key: STATUS_ESTOQUE.SEM_ENTRADA, label: 'Sem Entrada no Razão', color: STATUS_CONFIG[STATUS_ESTOQUE.SEM_ENTRADA].color },
        { key: STATUS_ESTOQUE.SO_ESTOQUE, label: 'Só no Estoque', color: STATUS_CONFIG[STATUS_ESTOQUE.SO_ESTOQUE].color },
        { key: STATUS_ESTOQUE.SO_RAZAO, label: 'Só no Razão', color: STATUS_CONFIG[STATUS_ESTOQUE.SO_RAZAO].color },
        { key: STATUS_ESTOQUE.VALOR_DIVERGENTE, label: 'Valor Divergente', color: STATUS_CONFIG[STATUS_ESTOQUE.VALOR_DIVERGENTE].color },
        { key: STATUS_ESTOQUE.TIMING, label: 'Competência', color: STATUS_CONFIG[STATUS_ESTOQUE.TIMING].color },
        { key: STATUS_ESTOQUE.CONCILIADO, label: 'Conciliados', color: STATUS_CONFIG[STATUS_ESTOQUE.CONCILIADO].color },
    ];
    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {filters.map(f => {
                const active = filtroStatus === f.key;
                const count = counts[f.key] ?? 0;
                return (
                    <button key={f.key} onClick={() => setFiltroStatus(f.key)} style={{
                        padding: '5px 12px', borderRadius: '999px', fontSize: '0.77rem', fontWeight: 600,
                        border: `1.5px solid ${active ? f.color : 'var(--border)'}`,
                        background: active ? `${f.color}18` : 'transparent',
                        color: active ? f.color : 'var(--text-secondary)',
                        cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '5px',
                    }}>
                        {f.label}
                        <span style={{ background: active ? f.color : 'var(--bg-tertiary)', color: active ? 'white' : 'var(--text-secondary)', borderRadius: '999px', padding: '0px 6px', fontSize: '0.68rem', fontWeight: 700 }}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Tabela de Resumo Mensal ──────────────────────────────────────────────────

function TabelaResumoMensal({ resumoMensal, mesSelecionado, onSelecionarMes }) {
    return (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Resumo por Mês</span>
                <span style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)' }}>— clique em um mês para ver os detalhes por chassi</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '3px 10px', borderRadius: 999, border: '1px solid var(--border)' }}>
                    ★ = mês de referência do Razão · ⏱ = diferença de competência esperada
                </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                    <thead>
                        <tr style={{ background: 'var(--bg-secondary)' }}>
                            {['Mês', 'Qtd. Motos', 'Total Estoque', 'Total Razão (acum.)', 'Delta', 'Situação'].map(h => (
                                <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Mês' ? 'left' : 'right', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {resumoMensal.map((m, i) => {
                            const selecionado = m.mes === mesSelecionado;
                            const diverge = m.emDivergencia;
                            const deltaColor = !diverge ? '#22c55e' : m.delta > 0 ? '#ef4444' : '#6366f1';
                            return (
                                <tr
                                    key={m.mes}
                                    onClick={() => onSelecionarMes(m.mes)}
                                    style={{
                                        cursor: 'pointer',
                                        background: selecionado ? `${ACCENT}10` : i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                                        borderLeft: selecionado ? `3px solid ${ACCENT}` : '3px solid transparent',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <td style={{ padding: '10px 14px', fontWeight: 700, color: selecionado ? ACCENT : 'var(--text-primary)', fontSize: '0.85rem' }}>
                                        {m.mesDeReferencia && <span title="Mês de referência do Razão" style={{ marginRight: 5, color: '#f59e0b', fontSize: '0.7rem' }}>★</span>}
                                        {m.mesNome}
                                        {m.temTiming && (
                                            <span title="Este mês pode ter divergências de competência esperadas" style={{ marginLeft: 6, fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>⏱ {m.contadores.timing} compet.</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                        {m.qtdMotosEstoque}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                        {fmt(m.totalEstoque)}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                        {m.saldoContabilRazao != null ? fmt(m.saldoContabilRazao) : '—'}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: deltaColor }}>
                                        {Math.abs(m.delta) < 0.05 ? <span style={{ color: '#22c55e' }}>R$ 0,00</span> : fmtDelta(m.delta)}
                                    </td>
                                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                        {m.temTiming
                                            ? <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: '0.78rem' }}>⏱ Competência</span>
                                            : diverge
                                                ? <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.78rem' }}>🔴 Divergência</span>
                                                : <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.78rem' }}>✅ OK</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Tabela de Drilldown por Chassi ────────────────────────────────────────────

const gridChassi = '90px 1fr 120px 120px 100px 170px';

function ChassiRow({ item, index }) {
    const [expanded, setExpanded] = useState(false);
    const cfg = STATUS_CONFIG[item.status] || {};
    const temLanc = item.lancamentosRazao && item.lancamentosRazao.length > 0;

    return (
        <div style={{ borderBottom: '1px solid var(--border)' }}>
            <div
                onClick={() => temLanc && setExpanded(p => !p)}
                style={{
                    display: 'grid', gridTemplateColumns: gridChassi, alignItems: 'center',
                    borderLeft: `3px solid ${cfg.color || 'var(--border)'}`,
                    cursor: temLanc ? 'pointer' : 'default',
                    background: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                    transition: 'background 0.1s',
                }}
            >
                <div style={{ padding: '9px 12px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {item.chassi7}
                </div>
                <div style={{ padding: '9px 12px', fontSize: '0.78rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                    {item.chassiCompleto !== item.chassi7 ? item.chassiCompleto : '—'}
                </div>
                <div style={{ padding: '9px 12px', textAlign: 'right', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {item.valorEstoque > 0 ? fmt(item.valorEstoque) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                </div>
                <div style={{ padding: '9px 12px', textAlign: 'right', fontSize: '0.82rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {item.valorRazao > 0 ? fmt(item.valorRazao) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                </div>
                <div style={{ padding: '9px 12px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'monospace', color: Math.abs(item.delta) < 0.05 ? '#22c55e' : '#ef4444' }}>
                    {Math.abs(item.delta) < 0.05 ? '—' : fmtDelta(item.delta)}
                </div>
                <div style={{ padding: '9px 12px', textAlign: 'center' }}>
                    <StatusBadge status={item.status} />
                </div>
            </div>
            {expanded && temLanc && (
                <div style={{ background: 'var(--bg-tertiary)', padding: '12px 14px 12px 28px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600 }}>
                        LANÇAMENTOS NO RAZÃO
                        {item.status === STATUS_ESTOQUE.SAIDO_NO_RAZAO && (
                            <span style={{ marginLeft: '8px', color: '#f97316' }}>⚠ Este chassi foi creditado (saído) no mês {MES_NOMES[item.mesSaida] || item.mesSaida}</span>
                        )}
                        {item.status === STATUS_ESTOQUE.SEM_ENTRADA && (
                            <span style={{ marginLeft: '8px', color: '#dc2626' }}>✕ Venda registrada no Razão sem lançamento de compra correspondente</span>
                        )}
                        {item.status === STATUS_ESTOQUE.TIMING && (
                            <span style={{ marginLeft: '8px', color: '#94a3b8' }}>⏱ Débito de entrada lançado em {MES_NOMES[item.mesEntradaRazao] || item.mesEntradaRazao} (depois do fechamento deste mês)</span>
                        )}
                    </div>

                    {/* Explicações "Inteligentes" */}
                    {item.status === STATUS_ESTOQUE.SAIDO_NO_RAZAO && item.lancamentosRazao.filter(l => l.debito > 0).length > 1 && (
                        <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '6px', marginBottom: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <strong style={{ color: '#f59e0b', fontSize: '0.8rem' }}>🧠 Análise do Auditor:</strong> Este chassi possui múltiplas entradas de compra. Isso geralmente indica que a moto foi <strong>vendida e depois devolvida (NF Dev)</strong>, ou recomprada. O sistema marcou como saído porque encontrou a primeira venda, mas a devolução manual no Estoque pode ter ficado faltando ou com valor divergente.
                        </div>
                    )}

                    {item.status === STATUS_ESTOQUE.SEM_ENTRADA && item.valorEstoque > 0 && item.valorRazao === 0 && (
                        <div style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', marginBottom: '12px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <strong style={{ color: '#ef4444', fontSize: '0.8rem' }}>🧠 Análise do Auditor:</strong> Este chassi consta no Estoque e foi vendido no Razão, mas a <strong>nota de compra (débito) nunca foi vinculada a ele</strong>. O valor financeiro total do mês pode até estar batendo, mas o lançamento de entrada foi feito sem o número do chassi no histórico ou com erro de digitação.
                        </div>
                    )}

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem' }}>
                                <th style={{ textAlign: 'left', padding: '2px 8px', fontWeight: 600 }}>Mês</th>
                                <th style={{ textAlign: 'left', padding: '2px 8px', fontWeight: 600 }}>Histórico</th>
                                <th style={{ textAlign: 'right', padding: '2px 8px', fontWeight: 600 }}>Débito</th>
                                <th style={{ textAlign: 'right', padding: '2px 8px', fontWeight: 600 }}>Crédito</th>
                            </tr>
                        </thead>
                        <tbody>
                            {item.lancamentosRazao.map((l, i) => (
                                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                                    <td style={{ padding: '4px 8px', fontSize: '0.76rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                        {MES_NOMES[l.mes] || l.mes}
                                    </td>
                                    <td style={{ padding: '4px 8px', fontSize: '0.76rem', color: 'var(--text-secondary)', maxWidth: '360px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {l.historico}
                                    </td>
                                    <td style={{ padding: '4px 8px', fontSize: '0.76rem', fontFamily: 'monospace', textAlign: 'right', color: l.debito > 0 ? '#22c55e' : 'var(--text-tertiary)' }}>
                                        {l.debito > 0 ? fmt(l.debito) : '—'}
                                    </td>
                                    <td style={{ padding: '4px 8px', fontSize: '0.76rem', fontFamily: 'monospace', textAlign: 'right', color: l.credito > 0 ? '#ef4444' : 'var(--text-tertiary)' }}>
                                        {l.credito > 0 ? fmt(l.credito) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Tabela de Chassi com Scroll CSS ───────────────────────────────────────────

const GRID_COLS = ['Chassi (7)', 'Chassi Completo', 'Estoque R$', 'Razão R$', 'Delta', 'Status'];

function ChassiTablePaged({ itens }) {
    if (itens.length === 0) {
        return (
            <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                Nenhum resultado para este filtro
            </div>
        );
    }

    return (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: '760px' }}>
                    {/* Header fixo */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: gridChassi,
                        background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)',
                        position: 'sticky', top: 0, zIndex: 2,
                    }}>
                        {GRID_COLS.map(h => (
                            <div key={h} style={{
                                padding: '9px 12px',
                                textAlign: h === 'Chassi (7)' || h === 'Chassi Completo' ? 'left' : h === 'Status' ? 'center' : 'right',
                                fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                                {h}
                            </div>
                        ))}
                    </div>
                    {/* Body com scroll */}
                    <div style={{ maxHeight: 560, overflowY: 'auto' }}>
                        {itens.map((item, i) => (
                            <ChassiRow key={item.chassi7 || i} item={item} index={i} />
                        ))}
                    </div>
                </div>
            </div>
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', fontSize: '0.73rem', color: 'var(--text-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Role para ver todos os itens · clique num chassi para expandir os lançamentos do Razão</span>
                <span>{itens.length} chassi(s)</span>
            </div>
        </div>
    );
}

// ── Callout de Competência ──────────────────────────────────────────────────

function CompetenciaCallout({ mes, contTiming, ultimoMes }) {
    const [visible, setVisible] = useState(true);
    if (!visible || contTiming === 0) return null;
    const MES_NOME = {
        '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
        '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
        '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
    };
    return (
        <div style={{
            padding: '14px 18px', borderRadius: 'var(--radius-md)', marginBottom: '4px',
            background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.25)',
            display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative',
        }}>
            <span style={{ fontSize: '1.3rem', flexShrink: 0, marginTop: '2px' }}>⏱</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    O que é "Diferença de Competência"?
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.65, margin: 0 }}>
                    <strong>{contTiming} {contTiming === 1 ? 'chassi' : 'chassis'}</strong> aparecem no Estoque
                    de <strong>{MES_NOME[mes]}</strong> mas o lançamento contábil de entrada (débito) no Razão
                    só foi registrado em um mês posterior.
                    <br /><br />
                    Isso é <strong>esperado e normal</strong>: a moto pode ter dado entrada física no estoque
                    antes da nota fiscal ser lançada no sistema. É uma diferença de <em>regime de competência</em>
                    — a contabilidade registrou o fato em data diferente da entrada física.
                    <br /><br />
                    Esses itens <strong>não são erros reais</strong> — eles se conciliam no mês
                    em que o débito foi efetivamente lançado
                    {ultimoMes ? ` (verifique ${MES_NOME[ultimoMes]} para a visão completa).` : '.'}
                </p>
            </div>
            <button
                onClick={() => setVisible(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '0', flexShrink: 0, fontSize: '1rem' }}
                title="Fechar"
            >×</button>
        </div>
    );
}

// ── Legenda ──────────────────────────────────────────────────────────────────

const LEGENDA_ITEMS = [
    { status: STATUS_ESTOQUE.CONCILIADO, titulo: 'Conciliado', desc: 'Chassi presente em ambos com valor compatível. Nenhuma ação necessária.' },
    { status: STATUS_ESTOQUE.SAIDO_NO_RAZAO, titulo: 'Saído no Razão', desc: 'Chassi foi creditado (vendido) no Razão neste mês ou antes, mas ainda consta no Estoque. Principal causa de divergência acumulada.' },
    { status: STATUS_ESTOQUE.SEM_ENTRADA, titulo: 'Sem Entrada no Razão', desc: 'Chassi aparece como crédito (venda) no Razão, mas nunca teve débito de compra. Nota fiscal de entrada sem lançamento contábil correspondente.' },
    { status: STATUS_ESTOQUE.SO_ESTOQUE, titulo: 'Só no Estoque', desc: 'Chassi no Estoque sem absolutamente nenhum registro (nem compra nem venda) no Razão.' },
    { status: STATUS_ESTOQUE.SO_RAZAO, titulo: 'Só no Razão', desc: 'Chassi com saldo ativo no Razão (débito sem crédito), mas ausente no Estoque deste mês.' },
    { status: STATUS_ESTOQUE.VALOR_DIVERGENTE, titulo: 'Valor Divergente', desc: 'Chassi presente em ambos, mas o valor do Estoque difere do débito lançado no Razão.' },
    { status: STATUS_ESTOQUE.TIMING, titulo: 'Diferença de Competência', desc: 'Débito de entrada lançado no Razão DEPOIS do fechamento deste mês. Ocorre nos meses anteriores ao de referência do Razão — é esperado e não indica erro.' },
];


function Legenda() {
    const [aberta, setAberta] = useState(false);
    return (
        <div style={{ fontSize: '0.78rem' }}>
            <button onClick={() => setAberta(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}>
                {aberta ? '▾' : '▸'} {aberta ? 'Esconder legenda' : 'O que significa cada status?'}
            </button>
            {aberta && (
                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                    {LEGENDA_ITEMS.map(item => {
                        const cfg = STATUS_CONFIG[item.status];
                        return (
                            <div key={item.status} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: cfg.bg, border: `1px solid ${cfg.color}33` }}>
                                <div style={{ fontWeight: 800, color: cfg.color, fontSize: '0.8rem', marginBottom: '5px' }}>{cfg.icon} {item.titulo}</div>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55, fontSize: '0.74rem' }}>{item.desc}</p>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Página Principal ─────────────────────────────────────────────────────────

export default function EstoqueAuditorPage() {
    const { theme, toggle } = useTheme();
    const {
        arquivoEstoque, arquivoRazao, resultado, status, erro,
        mesSelecionado, mesSelecionadoDados, detalhesMesFiltrados, filtroStatus,
        setArquivoEstoque, setArquivoRazao,
        processar, limpar, setMesSelecionado, setFiltroStatus,
    } = useEstoqueAuditor();

    const [buscaGlobal, setBuscaGlobal] = useState('');

    const pronto = !!arquivoEstoque && !!arquivoRazao;
    const processing = status === 'processing';

    // --- XLSX Export ---
    const handleExportXLSX = (lista) => {
        if (!resultado || !mesSelecionadoDados) return;
        const src = lista || mesSelecionadoDados.detalhesChassi;
        const data = src.map(d => ({
            'Mês': d.mesNome || mesSelecionadoDados.mesNome,
            'Chassi (7)': d.chassi7,
            'Chassi Completo': d.chassiCompleto,
            'Estoque (R$)': d.valorEstoque,
            'Razão (R$)': d.valorRazao,
            'Delta (R$)': d.delta,
            'Status': STATUS_CONFIG[d.status]?.label || d.status,
            'Análise / Causa': STATUS_ANALISE[d.status] || '',
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        ws['!cols'] = [12, 14, 22, 16, 16, 16, 24, 60].map(w => ({ wch: w }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
        XLSX.writeFile(wb, `Relatorio_Estoque_${mesSelecionadoDados.mes}_${Date.now()}.xlsx`);
    };

    // --- PDF Export ---
    const handleExportPDF = () => {
        if (!resultado || !mesSelecionadoDados) return;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const mes = mesSelecionadoDados.mesNome;
        const totalEstoque = mesSelecionadoDados.totalEstoque;
        const delta = mesSelecionadoDados.delta;

        // Capa
        doc.setFontSize(18);
        doc.setTextColor(249, 115, 22);
        doc.text('Relatório de Auditoria de Estoque', 14, 18);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Mês: ${mes}  \u2022  Conta: ${resultado.contaNome || 'N/A'}`, 14, 26);
        doc.text(`Total Estoque: ${fmt(totalEstoque)}  \u2022  Delta: ${fmtDelta(delta)}  \u2022  Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);

        // Legenda de causas
        doc.setFontSize(9);
        doc.setTextColor(60);
        doc.text('Legenda de Causas:', 14, 42);
        let yLeg = 47;
        Object.entries(STATUS_ANALISE).filter(([k]) => k !== STATUS_ESTOQUE.CONCILIADO).forEach(([k, v]) => {
            const label = STATUS_CONFIG[k]?.label || k;
            const wrappedLines = doc.splitTextToSize(`• ${label}: ${v}`, 267);
            doc.setFontSize(7.5);
            doc.text(wrappedLines, 14, yLeg);
            yLeg += wrappedLines.length * 4 + 1;
        });

        // Tabela
        const pendentes = mesSelecionadoDados.detalhesChassi.filter(d => d.status !== STATUS_ESTOQUE.CONCILIADO);
        const rows = pendentes.map(d => [
            d.chassi7,
            d.chassiCompleto !== d.chassi7 ? d.chassiCompleto : '',
            fmt(d.valorEstoque),
            fmt(d.valorRazao),
            fmtDelta(d.delta),
            STATUS_CONFIG[d.status]?.label || d.status,
            doc.splitTextToSize(STATUS_ANALISE[d.status] || '', 80).join(' '),
        ]);

        autoTable(doc, {
            startY: yLeg + 4,
            head: [['Chassi (7)', 'Chassi Completo', 'Estoque R$', 'Razão R$', 'Delta', 'Status', 'Análise / Causa']],
            body: rows,
            styles: { fontSize: 7.5, cellPadding: 2 },
            headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 6: { cellWidth: 80 } },
            alternateRowStyles: { fillColor: [248, 248, 248] },
        });

        doc.save(`Relatorio_Estoque_${mesSelecionadoDados.mes}_${Date.now()}.pdf`);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>

            {/* Header */}
            <header style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 32px', background: 'var(--glass-bg)',
                backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--glass-border)', zIndex: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ← Rayo Hub
                    </Link>
                    <span style={{ color: 'var(--border)' }}>|</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconSearch size={14} style={{ color: 'white' }} />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Auditor de Estoque</span>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 999, color: 'var(--text-tertiary)' }}>MVP</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {resultado && (
                        <button onClick={limpar} style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.82rem',
                        }}>
                            <IconRefresh size={14} /> Nova Análise
                        </button>
                    )}
                    <button onClick={toggle} style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                        {theme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
                    </button>
                </div>
            </header>

            <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

                {/* ── Tela de Upload ── */}
                {!resultado && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '6px', letterSpacing: '-0.03em' }}>
                                Comparativo Estoque × Razão
                            </h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                Identifique exatamente qual chassi está causando a diferença entre o Estoque de Motos Novas e o Razão Contábil, mês a mês.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                            {/* Estoque */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'white', fontWeight: 800 }}>E</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Estoque de Motos Novas</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Planilha com 12 abas (Jan–Dez 2025) — .xls</div>
                                    </div>
                                </div>
                                <DropZone
                                    label="Estoque XLS"
                                    sublabel="Arraste ou clique — Estoque de Motos Novas (.xls)"
                                    accept=".xls,.xlsx"
                                    arquivo={arquivoEstoque}
                                    onFile={setArquivoEstoque}
                                    onRemove={() => setArquivoEstoque(null)}
                                />
                                <div style={{ marginTop: '16px', padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    <strong>Coluna D:</strong> Chassi completo ex: <code style={{ fontFamily: 'monospace' }}>95V6N1G2STM004316</code><br />
                                    Os últimos 7 caracteres (<code style={{ fontFamily: 'monospace' }}>M004316</code>) são usados como chave.
                                </div>
                            </div>

                            {/* Razão */}
                            <div className="glass-card" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ width: 24, height: 24, borderRadius: 6, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'white', fontWeight: 800 }}>R</div>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Razão Contábil de Estoque</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Lançamentos de Jan–Dez 2025 — .xlsx</div>
                                    </div>
                                </div>
                                <DropZone
                                    label="Razão XLSX"
                                    sublabel="Arraste ou clique — Razão Estoque Moto Rey (.xlsx)"
                                    accept=".xlsx,.xls"
                                    arquivo={arquivoRazao}
                                    onFile={setArquivoRazao}
                                    onRemove={() => setArquivoRazao(null)}
                                />
                                <div style={{ marginTop: '16px', padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    <strong>Campo Histórico:</strong> ex: <code style={{ fontFamily: 'monospace' }}>"Chassi M004316"</code><br />
                                    Débito = entrada; Crédito = venda/saída do estoque.
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
                                background: pronto ? `linear-gradient(135deg, ${ACCENT}, #fb923c)` : 'var(--bg-secondary)',
                                color: pronto ? 'white' : 'var(--text-tertiary)',
                                border: 'none', fontWeight: 800, fontSize: '0.9rem', cursor: pronto ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: pronto ? '0 4px 14px rgba(249,115,22,0.35)' : 'none',
                                transition: 'all 0.2s',
                            }}
                        >
                            {processing
                                ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> Processando...</>
                                : <><IconSearch size={16} /> Analisar</>}
                        </button>
                    </div>
                )}

                {/* ── Tela de Resultado ── */}
                {resultado && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease-out' }}>

                        {/* Cards de resumo & Busca */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <TotalCard label="Saldo Final Razão" value={fmt(resultado.saldoFinalRazao)} />
                                <TotalCard
                                    label={`🔴 Meses em Divergência`}
                                    value={resultado.mesesEmDivergencia.length}
                                    highlight={resultado.mesesEmDivergencia.length > 0 ? '#ef4444' : undefined}
                                    small
                                />
                                {resultado.primeiraMesDivergencia && (
                                    <TotalCard
                                        label="1ª Divergência em"
                                        value={MES_NOMES[resultado.primeiraMesDivergencia]}
                                        highlight={ACCENT}
                                        small
                                    />
                                )}
                                <TotalCard label="Conta" value={resultado.contaNome || '—'} small />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '6px 14px', width: '300px' }}>
                                <IconSearch size={16} style={{ color: 'var(--text-tertiary)', marginRight: '8px' }} />
                                <input
                                    type="text"
                                    placeholder="Buscar chassi em todos os meses..."
                                    value={buscaGlobal}
                                    onChange={(e) => setBuscaGlobal(e.target.value)}
                                    style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', width: '100%' }}
                                />
                                {buscaGlobal && (
                                    <span
                                        onClick={() => setBuscaGlobal('')}
                                        style={{ cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '1rem', padding: '0 4px' }}
                                    >×</span>
                                )}
                            </div>
                        </div>

                        {/* Aviso se abas não mapeadas */}
                        {resultado.abasNaoMapeadas?.length > 0 && (
                            <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: '#f59e0b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <IconWarning size={14} /> Abas não reconhecidas como mês (ignoradas): <strong>{resultado.abasNaoMapeadas.join(', ')}</strong>
                            </div>
                        )}

                        {/* Tabela mensal */}
                        <TabelaResumoMensal
                            resumoMensal={resultado.resumoMensal}
                            mesSelecionado={mesSelecionado}
                            onSelecionarMes={setMesSelecionado}
                        />

                        {/* Drilldown por chassi */}
                        {mesSelecionadoDados && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.3s ease-out' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                                            Detalhes — {mesSelecionadoDados.mesNome}
                                        </span>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
                                            {mesSelecionadoDados.qtdMotosEstoque} motos no estoque
                                        </span>
                                        {mesSelecionadoDados.mesDeReferencia && (
                                            <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 999, color: '#f59e0b', fontWeight: 700 }}>
                                                ★ Mês de referência — comparação mais precisa
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                        <button onClick={handleExportPDF} style={{
                                            padding: '7px 14px', background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700,
                                        }}>
                                            📄 Relatório PDF
                                        </button>
                                        <button onClick={() => handleExportXLSX()} style={{
                                            padding: '7px 14px', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700,
                                        }}>
                                            <IconDownload size={14} /> Exportar XLSX
                                        </button>
                                    </div>
                                </div>

                                <CompetenciaCallout
                                    mes={mesSelecionadoDados.mes}
                                    contTiming={mesSelecionadoDados.contadores?.timing || 0}
                                    ultimoMes={resultado.ultimoMes}
                                />

                                <Legenda />

                                <FilterBar
                                    filtroStatus={filtroStatus}
                                    setFiltroStatus={setFiltroStatus}
                                    detalhesChassi={mesSelecionadoDados.detalhesChassi}
                                />

                                <ChassiTablePaged itens={detalhesMesFiltrados} />
                            </div>
                        )}
                    </div>
                )}
            </main>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
