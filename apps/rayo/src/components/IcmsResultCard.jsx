import React from 'react';
import { IconWarning, IconX, IconCheck, IconBolt } from './Icons';

export default function IcmsResultCard({ result }) {
    const isError = result.severidade === 'erro';
    const borderColor = isError ? 'var(--danger)' : '#eab308';
    const bgBadgeColor = isError ? '#fee2e2' : '#fef9c3';
    const textBadgeColor = isError ? 'var(--danger)' : '#92400e';

    return (
        <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            borderLeft: `5px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            backgroundColor: 'var(--card-bg)',
            transition: 'background-color 0.2s ease',
        }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Linha {result.linha}</span>

                    <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        background: bgBadgeColor,
                        color: textBadgeColor,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {isError ? <IconX size={12} /> : <IconWarning size={12} />}
                        {result.motivo}
                    </span>

                    {result.correcaoAplicada && (
                        <span style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            background: '#dbeafe',
                            color: '#1d4ed8',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            ✏️ {result.correcaoAplicada.campo} corrigido
                        </span>
                    )}
                </div>

                <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-secondary)', background: 'var(--bg)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    NCM: <strong style={{ color: 'var(--text)' }}>{result.ncm}</strong> {result.cfop && `| CFOP: `}<strong style={{ color: 'var(--text)' }}>{result.cfop}</strong>
                </div>
            </div>

            {/* Values / Differential row */}
            <div style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                backgroundColor: 'var(--bg)',
                padding: '10px 15px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                fontSize: '0.88rem'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Recebido (Alterdata)</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 500 }}>{result.cst || '—'}</span>
                </div>

                {result.esperado && (
                    <>
                        <div style={{ color: 'var(--text-muted)' }}>→</div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Esperado (e-Auditoria)</span>
                            <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>{result.esperado}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Subtle Detail Text */}
            <p style={{
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: '1.4'
            }}>
                {result.detalhe}
            </p>
        </div>
    );
}
