import { useState, useCallback } from 'react';
import { parseAlterdata, parseEAuditoria } from '../lib/parser/excel-parser';
import { runAudit } from '../lib/auditor/icms-auditor';

// Perfil padrão espelhando os defaults do e-Auditoria (da screenshot: AM, GERAL, GERAL)
const PERFIL_PADRAO = {
    uf: 'AM',
    atividade: 'GERAL',
    regime: 'GERAL',
    regimeEspecial: ''
};

export function useIcmsAuditor() {
    const [alterdataBase, setAlterdataBase] = useState(null);
    const [eAuditoriaBase, setEAuditoriaBase] = useState(null);
    const [eAuditoriaMetadata, setEAuditoriaMetadata] = useState(null);
    const [alterdataName, setAlterdataName] = useState(null);
    const [eAuditoriaName, setEAuditoriaName] = useState(null);
    const [alterdataHasSeguro, setAlterdataHasSeguro] = useState(false);

    // Perfil manual da empresa — analista preenche na UI do Rayo
    const [perfilEmpresa, setPerfilEmpresa] = useState(PERFIL_PADRAO);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [auditResults, setAuditResults] = useState(null);
    const [ncmSemCobertura, setNcmSemCobertura] = useState([]);
    const [correctedAlterdata, setCorrectedAlterdata] = useState(null);
    const [modifiedCells, setModifiedCells] = useState(null);

    const handleUploadAlterdata = useCallback(async (file) => {
        try {
            setLoading(true);
            setError(null);
            const data = await parseAlterdata(file);
            const temSeguro = data.length > 0 && (
                'Valor Seguro' in data[0] || 'Seguro' in data[0] || 'VL_SEG' in data[0]
            );
            setAlterdataHasSeguro(temSeguro);
            setAlterdataBase(data);
            setAlterdataName(file.name);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleUploadEAuditoria = useCallback(async (file) => {
        try {
            setLoading(true);
            setError(null);
            const data = await parseEAuditoria(file);
            setEAuditoriaBase(data.rules);
            // Metadados do e-Auditoria ainda são lidos da planilha (para exibição informativa)
            // mas o perfil que manda no motor é o perfilEmpresa do analista
            setEAuditoriaMetadata(data.metadata);
            setEAuditoriaName(file.name);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const setEAuditoriaBaseSilently = useCallback((rules, sourceName) => {
        setEAuditoriaBase(rules);
        setEAuditoriaName(sourceName);
        setError(null);
    }, []);

    const updatePerfil = useCallback((campo, valor) => {
        setPerfilEmpresa(prev => ({ ...prev, [campo]: valor }));
    }, []);

    const executeAudit = useCallback(() => {
        if (!alterdataBase || !eAuditoriaBase) {
            setError('Ambas as planilhas (Alterdata e e-Auditoria) precisam estar carregadas.');
            return;
        }

        try {
            setLoading(true);
            // Motor usa perfil inserido pelo analista — não mais extraído automaticamente
            const natureza = ['INDUSTRIA', 'INDUSTRIA_ALIMENTICIA'].includes(perfilEmpresa.atividade)
                ? 'industria'
                : 'comercio';

            const { report, correctedData, modifiedCells: modified, ncmSemCobertura: semCobertura } = runAudit(
                alterdataBase,
                eAuditoriaBase,
                { natureza, regime: perfilEmpresa.regime.toLowerCase() }
            );
            setAuditResults(report);
            setNcmSemCobertura(semCobertura);
            setCorrectedAlterdata(correctedData);
            setModifiedCells(modified);
            setError(null);
        } catch (err) {
            setError('Erro ao cruzar as bases: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [alterdataBase, eAuditoriaBase, perfilEmpresa]);

    const resetFiles = useCallback(() => {
        setAlterdataBase(null);
        setEAuditoriaBase(null);
        setEAuditoriaMetadata(null);
        setAlterdataName(null);
        setEAuditoriaName(null);
        setAlterdataHasSeguro(false);
        setAuditResults(null);
        setNcmSemCobertura([]);
        setCorrectedAlterdata(null);
        setModifiedCells(null);
        setError(null);
        // Não reseta o perfil — analista provavelmente vai auditar a mesma empresa de novo
    }, []);

    return {
        alterdataBase, eAuditoriaBase, eAuditoriaMetadata,
        alterdataName, eAuditoriaName, alterdataHasSeguro,
        perfilEmpresa, updatePerfil,
        loading, error, auditResults, ncmSemCobertura, correctedAlterdata, modifiedCells,
        handleUploadAlterdata, handleUploadEAuditoria, executeAudit, resetFiles,
        setEAuditoriaBaseSilently
    };
}
