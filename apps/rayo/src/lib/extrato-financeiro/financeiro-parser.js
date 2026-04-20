import { parseSaldoConta } from '../banco-razao/saldo-conta-parser';
import { parseRazaoBanco } from '../banco-razao/razao-banco-parser';

/**
 * financeiro-parser.js
 *
 * Thin wrapper para parsear o relatório financeiro.
 * Utiliza as lógicas já existentes em saldo-conta-parser ou razao-banco-parser.
 */

export function parseRelatorioFinanceiro(buffer) {
    // Tenta primeiro parsear como Saldo/Extrato Simplificado
    try {
        const resultadoSaldo = parseSaldoConta(buffer);
        if (resultadoSaldo.lancamentos && resultadoSaldo.lancamentos.length > 0) {
            // Se for layout SIMPLIFICADO, é exatamente o que esperamos do financeiro
            if (resultadoSaldo.layoutDetectado === 'SIMPLIFICADO' || resultadoSaldo.layoutDetectado === 'SAP') {
                 // Convertemos para um schema padrão interno
                 return {
                     layoutDetectado: resultadoSaldo.layoutDetectado,
                     contaNome: resultadoSaldo.contaNome,
                     lancamentos: resultadoSaldo.lancamentos.map(l => ({
                         id: l.id,
                         // Usa dataStr ou raw date
                         dataStr: l.dataStr,
                         descricao: l.detalhes || l.nome || `Doc: ${l.nrOrigem}`,
                         debito: l.debito,
                         credito: l.credito,
                         status: l.status
                     }))
                 };
            }
        }
    } catch (err) {
        // Ignora e tenta o Razão
    }

    // Tenta parsear como Razão SAP (caso o financeiro venha no formato ERP padrão deles)
    const resultadoRazao = parseRazaoBanco(buffer);
    return {
        layoutDetectado: resultadoRazao.layoutDetectado,
        contaNome: resultadoRazao.contaNome,
        lancamentos: resultadoRazao.lancamentos.map(l => ({
            id: l.id,
            dataStr: l.dataPgtoStr || l.dataStr || '',
            descricao: l.nome || l.detalhes,
            debito: l.debito,
            credito: l.credito,
            status: l.status
        }))
    };
}
