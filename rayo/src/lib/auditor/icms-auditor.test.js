import { describe, it, expect } from 'vitest';
import { runAudit, calcularBaseCerta } from './icms-auditor';

// ─── Matemática da Base de Cálculo ───────────────────────────────────────────
describe('ICMS Auditor — Matemática da Base de Cálculo', () => {
    it('Base normal integralmente', () => {
        const linha = { 'Valor Total Item': '100.00', 'Descontos': '0', 'Despesas Acessórias': '0', 'Valor Frete': '0' };
        expect(calcularBaseCerta(linha, {}, '00')).toBe(100.00);
    });

    it('Abate desconto e soma frete', () => {
        const linha = { 'Valor Total Item': '100.00', 'Descontos': '10.00', 'Despesas Acessórias': '0', 'Valor Frete': '15.00' };
        expect(calcularBaseCerta(linha, {}, '00')).toBe(105.00);
    });

    it('Aplica redução de base (33,33%)', () => {
        const linha = { 'Valor Total Item': '100.00', 'Descontos': '0', 'Valor Frete': '0' };
        const regra = { '% RED. BASE DE CÁLCULO ICMS': '33,33' };
        expect(calcularBaseCerta(linha, regra, '00')).toBeCloseTo(66.67, 2);
    });

    it('CST 60 (ST) força base zero', () => {
        const linha = { 'Valor Total Item': '360.00', 'Descontos': '0', 'Valor Frete': '0' };
        expect(calcularBaseCerta(linha, {}, '60')).toBe(0.00);
    });

    it('Soma seguro quando coluna "Valor Seguro" existe', () => {
        const linha = { 'Valor Total Item': '100.00', 'Descontos': '0', 'Despesas Acessórias': '0', 'Valor Frete': '0', 'Valor Seguro': '10.00' };
        expect(calcularBaseCerta(linha, {}, '00')).toBe(110.00);
    });

    it('Não quebra quando coluna de seguro está ausente', () => {
        const linha = { 'Valor Total Item': '100.00', 'Descontos': '0', 'Despesas Acessórias': '0', 'Valor Frete': '0' };
        expect(calcularBaseCerta(linha, {}, '00')).toBe(100.00);
    });
});

// ─── Motor Completo — Análise Combinatória ────────────────────────────────────
describe('ICMS Auditor — Análise Combinatória (Motor Completo)', () => {
    const perfil = { natureza: 'comercio', regime: 'real' };

    it('NCM, Base e CST perfeitos — sem apontamentos', () => {
        const eAuditoria = [{ 'NCM': '12345678', 'CST/CSOSN': '000' }];
        const alterdata = [{ 'Classificação': '1234.56.78', 'CST ICMS': '000', 'CFOP': '1102', 'Valor Total Item': '100', 'ICMS Base item': '100' }];
        const { report } = runAudit(alterdata, eAuditoria, perfil);
        expect(report.length).toBe(0);
    });

    it('Variação combinatória aceitável (120 vs 000) — alerta amarelo, sem auto-correção', () => {
        const eAuditoria = [{ 'NCM': '12345678', 'CST/CSOSN': '000' }];
        const alterdata = [{ 'Classificação': '1234.56.78', 'CST ICMS': '120', 'CFOP': '1102', 'Valor Total Item': '100', 'ICMS Base item': '100' }];
        const { report, correctedData } = runAudit(alterdata, eAuditoria, perfil);
        expect(report.some(r => r.severidade === 'alerta')).toBe(true);
        expect(correctedData[0]['CST ICMS']).toBe('120'); // Não auto-corrige variação amarela
    });

    it('Uso e consumo (CFOP 1556) — alerta amarelo, não erro vermelho', () => {
        const eAuditoria = [{ 'NCM': '12345678', 'CST/CSOSN': '000' }];
        const alterdata = [{ 'Classificação': '1234.56.78', 'CST ICMS': '090', 'CFOP': '1556', 'Valor Total Item': '100', 'ICMS Base item': '0' }];
        const { report } = runAudit(alterdata, eAuditoria, perfil);
        const alertas = report.filter(r => r.severidade === 'alerta');
        expect(alertas.length).toBeGreaterThan(0);
        expect(alertas.some(r => r.motivo.includes('Exceção'))).toBe(true);
    });

    // ─── Novos testes — FASE 1 ───────────────────────────────────────────────
    it('ST Invertido: Alterdata CST 060 para NCM tributável → erro vermelho', () => {
        const eAuditoria = [{ 'NCM': '12345678', 'CST/CSOSN': '000' }]; // Regra diz tributado
        const alterdata = [{ 'Classificação': '1234.56.78', 'CST ICMS': '060', 'CFOP': '1102', 'Valor Total Item': '100', 'ICMS Base item': '0' }];
        const { report } = runAudit(alterdata, eAuditoria, perfil);
        const stIndevido = report.find(r => r.motivo.includes('ST Indevido'));
        expect(stIndevido).toBeDefined();
        expect(stIndevido.severidade).toBe('erro');
    });

    it('CFOP de devolução (1201) → erro vermelho', () => {
        const eAuditoria = [{ 'NCM': '12345678', 'CST/CSOSN': '000' }];
        const alterdata = [{ 'Classificação': '1234.56.78', 'CST ICMS': '000', 'CFOP': '1201', 'Valor Total Item': '100', 'ICMS Base item': '100' }];
        const { report } = runAudit(alterdata, eAuditoria, perfil);
        const devolucao = report.find(r => r.motivo.includes('Devolução'));
        expect(devolucao).toBeDefined();
        expect(devolucao.severidade).toBe('erro');
    });

    it('NCM não mapeado na base → severidade erro (alta), agrupado em ncmSemCobertura', () => {
        const eAuditoria = [{ 'NCM': '99999999', 'CST/CSOSN': '000' }];
        const alterdata = [{ 'Classificação': '1234.56.78', 'CST ICMS': '000', 'CFOP': '1102', 'Valor Total Item': '100', 'ICMS Base item': '100' }];
        const { report, ncmSemCobertura } = runAudit(alterdata, eAuditoria, perfil);
        expect(report[0].severidade).toBe('erro');
        expect(report[0].motivo).toContain('não auditado');
        expect(ncmSemCobertura.length).toBe(1);
        expect(ncmSemCobertura[0].linhas).toContain(2);
    });

    it('Correção aplicada é registrada no report (não no Excel silenciosamente)', () => {
        const eAuditoria = [{ 'NCM': '12345678', 'CST/CSOSN': '000' }];
        const alterdata = [{ 'Classificação': '1234.56.78', 'CST ICMS': '090', 'CFOP': '1102', 'Valor Total Item': '100', 'ICMS Base item': '100' }];
        const { report, correctedData } = runAudit(alterdata, eAuditoria, perfil);
        // CST 090 vs 000 é erro crítico (fora do grupo combinatório) → deve corrigir e registrar
        const comCorrecao = report.find(r => r.correcaoAplicada !== null);
        expect(comCorrecao).toBeDefined();
        expect(comCorrecao.correcaoAplicada.campo).toBe('CST ICMS');
        // Excel corrigido preserva o dígito de origem
        expect(correctedData[0]['CST ICMS']).toBe('000'); // origem 0 + raiz 00
    });
});
