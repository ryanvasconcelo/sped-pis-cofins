/**
 * RetificacaoCodigosPage.jsx
 *
 * Módulo: Retificação de Códigos de Produto no SPED EFD
 *
 * Fluxo:
 *   1. Upload do SPED EFD (.txt) + NF-e XMLs (.xml ou .zip)
 *   2. Processamento client-side (cruzamento SPED × XML)
 *   3. Tabela de retificações: Código SPED → Código NF-e
 *   4. Download: TXT (SPED corrigido), XLSX, PDF
 */

import { useState, useRef, useCallback, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import AppLayout from '../components/layout/AppLayout';
import { useRetificacaoCodigos } from '../hooks/useRetificacaoCodigos';
import { IconUpload, IconX, IconDownload, IconRefresh } from '../components/Icons';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    a_corrigir:          { label: 'A Corrigir',        color: '#ef4444', bg: 'rgba(239,68,68,0.10)',   icon: '✕' },
    correto:             { label: 'Correto',            color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   icon: '✓' },
    sem_xml:             { label: 'Sem XML',            color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', icon: '–' },
    item_nao_encontrado: { label: 'Item não localizado',color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  icon: '△' },
    cprod_invalido:      { label: 'cProd inválido',     color: '#f59e0b', bg: 'rgba(245,158,11,0.10)',  icon: '⚠' },
};

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.sem_xml;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 999,
            fontSize: '0.72rem', fontWeight: 700,
            color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap'
        }}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

function truncateChave(chv) {
    if (!chv || chv.length < 44) return chv || '—';
    return `...${chv.slice(-8)}`;
}

// ─── DropZone ─────────────────────────────────────────────────────────────────

function DropZone({ label, sublabel, accept, onFile, onFiles, arquivo, arquivos, onRemove, accent, multiple }) {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);

    const handleDrop = useCallback(e => {
        e.preventDefault(); setDragging(false);
        if (multiple) {
            const files = [...e.dataTransfer.files];
            if (files.length) onFiles(files);
        } else {
            const file = e.dataTransfer.files[0];
            if (file) onFile(file);
        }
    }, [multiple, onFile, onFiles]);

    const handleChange = useCallback(e => {
        if (multiple) {
            const files = [...e.target.files];
            if (files.length) onFiles(files);
        } else {
            const file = e.target.files[0];
            if (file) onFile(file);
        }
        e.target.value = '';
    }, [multiple, onFile, onFiles]);

    const hasFiles = arquivo || (arquivos && arquivos.length > 0);
    const displayName = arquivo?.name || (arquivos?.length > 0 ? `${arquivos.length} arquivo(s)` : null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {label}
            </span>
            <div
                onClick={() => !hasFiles && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{
                    border: `1.5px dashed ${dragging ? accent : hasFiles ? 'var(--border)' : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    cursor: hasFiles ? 'default' : 'pointer',
                    background: dragging ? `${accent}18` : hasFiles ? 'var(--bg-secondary)' : 'transparent',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', gap: 10, minHeight: 52
                }}
            >
                {hasFiles ? (
                    <>
                        <span style={{ color: accent, fontSize: '1.1rem', flexShrink: 0 }}>✓</span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {displayName}
                        </span>
                        <button onClick={e => { e.stopPropagation(); onRemove(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2, flexShrink: 0 }}>
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
            <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={handleChange} style={{ display: 'none' }} />
        </div>
    );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
    return (
        <div style={{
            flex: 1, minWidth: 120, padding: '14px 18px',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: color ? `1.5px solid ${color}40` : '1px solid var(--border)'
        }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                {label}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: color || 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {value}
            </div>
        </div>
    );
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar({ filtro, setFiltro, stats }) {
    const filters = [
        { key: 'TODOS',              label: 'Todos',              count: stats.total },
        { key: 'a_corrigir',         label: 'A Corrigir',         count: stats.aCorrigir },
        { key: 'correto',            label: 'Corretos',           count: stats.corretos },
        { key: 'sem_xml',            label: 'Sem XML',            count: stats.semXml + stats.itemNaoEnc },
        { key: 'cprod_invalido',     label: 'cProd Inválido',     count: stats.cProdInvalido || 0 },
    ];
    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {filters.map(f => {
                const active = filtro === f.key;
                const cfg = STATUS_CONFIG[f.key];
                const activeColor = cfg?.color || '#0ea5e9';
                const activeBg = cfg?.bg || 'rgba(14,165,233,0.10)';
                return (
                    <button key={f.key} onClick={() => setFiltro(f.key)} style={{
                        padding: '6px 14px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600,
                        border: `1.5px solid ${active ? activeColor : 'var(--border)'}`,
                        background: active ? activeBg : 'transparent',
                        color: active ? activeColor : 'var(--text-secondary)',
                        cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', gap: 6
                    }}>
                        {f.label}
                        <span style={{
                            background: active ? activeColor : 'var(--bg-tertiary)',
                            color: active ? 'white' : 'var(--text-secondary)',
                            borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700
                        }}>{f.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ─── Table ────────────────────────────────────────────────────────────────────

function RetificacaoTable({ rows }) {
    const thStyle = {
        padding: '10px 14px', textAlign: 'left',
        fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)',
        whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1
    };
    const tdStyle = {
        padding: '9px 14px', fontSize: '0.83rem', color: 'var(--text-primary)',
        borderBottom: '1px solid var(--border)', verticalAlign: 'middle'
    };

    if (!rows.length) {
        return (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
                Nenhum item para este filtro.
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 560, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>NF</th>
                        <th style={thStyle}>Chave NF-e</th>
                        <th style={thStyle}>Item</th>
                        <th style={thStyle}>Código SPED</th>
                        <th style={thStyle}>Código NF-e</th>
                        <th style={thStyle}>Descrição SPED</th>
                        <th style={thStyle}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => {
                        const changed = row.status === 'a_corrigir';
                        return (
                            <tr key={i} style={{ background: changed ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                                <td style={{ ...tdStyle, fontWeight: 600, fontFamily: 'monospace' }}>
                                    {row.nfNum || '—'}
                                </td>
                                <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '0.76rem', color: 'var(--text-tertiary)' }} title={row.chvNFe}>
                                    {truncateChave(row.chvNFe)}
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}>
                                    {row.numItem}
                                </td>
                                <td style={{
                                    ...tdStyle, fontFamily: 'monospace', fontWeight: 600,
                                    color: changed ? '#ef4444' : 'var(--text-primary)'
                                }}>
                                    {row.codSped}
                                </td>
                                <td style={{
                                    ...tdStyle, fontFamily: 'monospace', fontWeight: 700,
                                    color: changed ? '#22c55e' : row.status === 'cprod_invalido' ? '#f59e0b' : 'var(--text-tertiary)'
                                }} title={row.codNFeRaw || ''}>
                                    {row.codNFe || (row.codNFeRaw ? `⚠ ${row.codNFeRaw}` : '—')}
                                </td>
                                <td style={{ ...tdStyle, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.descrSped}>
                                    {row.descrSped || '—'}
                                </td>
                                <td style={tdStyle}>
                                    <StatusBadge status={row.status} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── Export functions ─────────────────────────────────────────────────────────

function exportXlsx(rows, meta) {
    const headers = ['NF', 'Chave NF-e', 'Item', 'Código SPED', 'Código NF-e', 'Descrição SPED', 'Descrição NF-e', 'Status'];
    const data = rows.map(r => [
        r.nfNum || '',
        r.chvNFe || '',
        r.numItem || '',
        r.codSped || '',
        r.codNFe || '',
        r.descrSped || '',
        r.descrNFe || '',
        STATUS_CONFIG[r.status]?.label || r.status
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    // Larguras
    ws['!cols'] = [8, 46, 6, 20, 20, 40, 40, 18].map(w => ({ wch: w }));

    // Destaque nas linhas "a_corrigir"
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = 1; R <= range.e.r; R++) {
        const status = data[R - 1][7];
        if (status === STATUS_CONFIG.a_corrigir.label) {
            ['D', 'E'].forEach(col => {
                const cell = ws[`${col}${R + 1}`];
                if (cell) cell.s = { fill: { fgColor: { rgb: 'FFE2E2' } }, font: { bold: true } };
            });
        }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Retificacao');
    XLSX.writeFile(wb, `Retificacao_Codigos_${meta.cnpj || ''}.xlsx`);
}

function exportPdf(rows, meta, stats) {
    const doc = new jsPDF('landscape', 'pt', 'a4');
    const pageWidth = doc.internal.pageSize.width;

    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text('Retificação de Códigos de Produto — SPED EFD', 40, 40);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(
        `Empresa: ${meta.companyName || '—'} | CNPJ: ${meta.cnpj || '—'} | Período: ${meta.period || '—'}` +
        `\nTotal de itens: ${stats.total} | A corrigir: ${stats.aCorrigir} | Corretos: ${stats.corretos} | Sem XML: ${stats.semXml + stats.itemNaoEnc}` +
        `\nGerado em: ${new Date().toLocaleString('pt-BR')}`,
        40, 58
    );

    const columns = [
        { header: 'NF',          dataKey: 'nfNum' },
        { header: 'Chave',       dataKey: 'chvNFe' },
        { header: 'Item',        dataKey: 'numItem' },
        { header: 'Cód. SPED',  dataKey: 'codSped' },
        { header: 'Cód. NF-e',  dataKey: 'codNFe' },
        { header: 'Descrição',   dataKey: 'descrSped' },
        { header: 'Status',      dataKey: 'status' },
    ];

    const body = rows.map(r => ({
        nfNum:    r.nfNum || '—',
        chvNFe:   r.chvNFe ? `...${r.chvNFe.slice(-12)}` : '—',
        numItem:  r.numItem || '—',
        codSped:  r.codSped || '—',
        codNFe:   r.codNFe || '—',
        descrSped: (r.descrSped || '—').slice(0, 50),
        status:   STATUS_CONFIG[r.status]?.label || r.status,
    }));

    autoTable(doc, {
        startY: 102,
        columns,
        body,
        styles: { fontSize: 7.5, cellPadding: 4 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell(data) {
            if (data.column.dataKey === 'status') {
                const st = rows[data.row.index]?.status;
                if (st === 'a_corrigir')   data.cell.styles.textColor = [239, 68, 68];
                if (st === 'correto')       data.cell.styles.textColor = [34, 197, 94];
            }
            if (data.column.dataKey === 'codNFe' && rows[data.row.index]?.status === 'a_corrigir') {
                data.cell.styles.textColor = [34, 197, 94];
                data.cell.styles.fontStyle = 'bold';
            }
            if (data.column.dataKey === 'codSped' && rows[data.row.index]?.status === 'a_corrigir') {
                data.cell.styles.textColor = [239, 68, 68];
            }
        }
    });

    doc.save(`Retificacao_Codigos_${meta.cnpj || 'SPED'}.pdf`);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RetificacaoCodigosPage() {
    const {
        arquivoSped, setArquivoSped,
        arquivosNfe, setArquivosNfe,
        resultado, status, erro,
        filtro, setFiltro,
        processar,
        baixarSpedCorrigido
    } = useRetificacaoCodigos();

    const isProcessing = status === 'processing';
    const isDone = status === 'done';
    const accent = '#8b5cf6';

    const rowsFiltrados = useMemo(() => {
        if (!resultado) return [];
        const { rows } = resultado;
        if (filtro === 'TODOS') return rows;
        if (filtro === 'sem_xml') return rows.filter(r => r.status === 'sem_xml' || r.status === 'item_nao_encontrado');
        if (filtro === 'cprod_invalido') return rows.filter(r => r.status === 'cprod_invalido');
        return rows.filter(r => r.status === filtro);
    }, [resultado, filtro]);

    const meta = resultado?.spedData?.meta || {};
    const stats = resultado?.stats || { total: 0, aCorrigir: 0, corretos: 0, semXml: 0, itemNaoEnc: 0, conflitos: 0, nfsComXml: 0 };

    return (
        <AppLayout breadcrumbs={[{ label: 'Retificação de Códigos' }]}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                {/* Título */}
                <div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                        Retificação de Códigos de Produto
                    </h1>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 620 }}>
                        Corrige automaticamente os códigos de produto no SPED EFD (0200 + C170) com base nos <code>cProd</code> das NF-e XML correspondentes.
                    </p>
                </div>

                {/* Upload */}
                <div style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)', padding: '24px 28px',
                    display: 'flex', flexDirection: 'column', gap: 20
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <DropZone
                            label="SPED EFD"
                            sublabel="Arraste ou clique — arquivo .txt"
                            accept=".txt"
                            onFile={setArquivoSped}
                            arquivo={arquivoSped}
                            onRemove={() => setArquivoSped(null)}
                            accent={accent}
                        />
                        <DropZone
                            label="NF-e (XML ou ZIP)"
                            sublabel="Arraste ou clique — .xml / .zip (múltiplos)"
                            accept=".xml,.zip"
                            onFiles={setArquivosNfe}
                            arquivos={arquivosNfe}
                            onRemove={() => setArquivosNfe([])}
                            accent="#06b6d4"
                            multiple
                        />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button
                            onClick={processar}
                            disabled={isProcessing || !arquivoSped || !arquivosNfe.length}
                            style={{
                                padding: '10px 28px', borderRadius: 'var(--radius-md)',
                                background: accent, color: 'white', border: 'none',
                                fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                                opacity: (isProcessing || !arquivoSped || !arquivosNfe.length) ? 0.5 : 1,
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {isProcessing ? 'Processando…' : 'Processar'}
                        </button>

                        {isDone && (
                            <button onClick={processar} style={{
                                background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
                                padding: '9px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, fontSize: '0.83rem',
                                display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                <IconRefresh size={14} /> Reprocessar
                            </button>
                        )}

                        {isProcessing && (
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                                Lendo arquivos e cruzando dados…
                            </span>
                        )}
                    </div>

                    {erro && (
                        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                            {erro}
                        </div>
                    )}
                </div>

                {/* Resultado */}
                {isDone && resultado && (
                    <>
                        {/* Stats */}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <StatCard label="NFs com XML"     value={stats.nfsComXml}  color="#8b5cf6" />
                            <StatCard label="Total de itens"  value={stats.total}                      />
                            <StatCard label="A corrigir"      value={stats.aCorrigir}  color="#ef4444" />
                            <StatCard label="Corretos"        value={stats.corretos}   color="#22c55e" />
                            <StatCard label="Sem XML"         value={stats.semXml + stats.itemNaoEnc} color="#94a3b8" />
                            {(stats.cProdInvalido > 0) && (
                                <StatCard label="cProd Inválido" value={stats.cProdInvalido} color="#f59e0b" />
                            )}
                        </div>

                        {/* Empresa */}
                        {meta.companyName && (
                            <div style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                                <strong style={{ color: 'var(--text-secondary)' }}>{meta.companyName}</strong>
                                {' '}— CNPJ: {meta.cnpj} | Período: {meta.period}
                            </div>
                        )}

                        {/* Alerta de cProd inválido */}
                        {stats.cProdInvalido > 0 && (
                            <div style={{
                                padding: '12px 18px', borderRadius: 'var(--radius-md)',
                                background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                                color: '#f59e0b', fontSize: '0.84rem', lineHeight: 1.6
                            }}>
                                <strong>Atenção — {stats.cProdInvalido} item(ns) com cProd inválido no XML:</strong> Algumas NF-e contêm <code>cProd</code> que não representa um código de produto válido (ex: CFOP usado como produto). Esses itens foram excluídos da correção automática e exigem revisão manual.
                            </div>
                        )}

                        {/* Filtros */}
                        <FilterBar filtro={filtro} setFiltro={setFiltro} stats={stats} />

                        {/* Tabela */}
                        <RetificacaoTable rows={rowsFiltrados} />

                        {/* Downloads */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
                            <button
                                onClick={baixarSpedCorrigido}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 22px', borderRadius: 'var(--radius-md)',
                                    background: accent, color: 'white', border: 'none',
                                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                                }}
                            >
                                <IconDownload size={16} /> Baixar SPED Corrigido (.txt)
                            </button>

                            <button
                                onClick={() => exportXlsx(resultado.rows, meta)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 22px', borderRadius: 'var(--radius-md)',
                                    background: '#16a34a', color: 'white', border: 'none',
                                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                                }}
                            >
                                <IconDownload size={16} /> Exportar XLSX
                            </button>

                            <button
                                onClick={() => exportPdf(resultado.rows, meta, stats)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '10px 22px', borderRadius: 'var(--radius-md)',
                                    background: '#dc2626', color: 'white', border: 'none',
                                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                                }}
                            >
                                <IconDownload size={16} /> Exportar PDF
                            </button>
                        </div>

                        {stats.aCorrigir > 0 && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: -12 }}>
                                O SPED corrigido aplica {stats.aCorrigir} correção(ões) exclusivamente nos registros C170 (campo COD_ITEM). Registros 0200 e demais blocos não são alterados.
                            </p>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}
