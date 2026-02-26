import { useState, useCallback } from 'react';
import {
    getCstKeys, saveCstKey, deleteCstKey,
    getAssignments, assignNcm, unassignNcm, clearAllAssignments,
    applyAssignmentsToGroups, exportAssignmentsCsv
} from '../lib/assignments/cst-assignments';
import { downloadFile } from '../core/sped-writer';

/**
 * Hook para gerenciar o sistema de atribuições de CST.
 * Lê/escreve via localStorage e fornece actions para a UI.
 *
 * @param {function} applyAutoCorrecoes - Função do useSpedFile para atualizar os grupos
 * @param {Map} ncmGroups - Map atual de grupos NCM
 */
export function useAssignments(applyAutoCorrecoes, ncmGroups) {
    // Estado local espelha os dados do localStorage para forçar re-renders
    const [cstKeys, setCstKeys] = useState(() => getCstKeys());
    const [assignments, setAssignments] = useState(() => getAssignments());

    const refreshState = useCallback(() => {
        setCstKeys(getCstKeys());
        setAssignments(getAssignments());
    }, []);

    const createKey = useCallback((keyData) => {
        saveCstKey(keyData);
        refreshState();
    }, [refreshState]);

    const updateKey = useCallback((keyData) => {
        saveCstKey(keyData); // saveCstKey faz upsert pelo id
        refreshState();
    }, [refreshState]);

    const removeKey = useCallback((id) => {
        deleteCstKey(id);
        refreshState();
    }, [refreshState]);

    const assign = useCallback((cstKeyId, ncm) => {
        assignNcm(cstKeyId, ncm);
        refreshState();
    }, [refreshState]);

    const unassign = useCallback((ncm) => {
        unassignNcm(ncm);
        refreshState();
    }, [refreshState]);

    const clearAll = useCallback(() => {
        clearAllAssignments();
        refreshState();
    }, [refreshState]);

    /**
     * Aplica todas as atribuições salvas aos grupos NCM atuais.
     * Chama applyAutoCorrecoes do useSpedFile para atualizar o estado global.
     */
    const applyAll = useCallback(() => {
        if (!ncmGroups) return [];
        const currentAssignments = getAssignments();
        const currentKeys = getCstKeys();
        const { newGroups, appliedNcms } = applyAssignmentsToGroups(ncmGroups, currentAssignments, currentKeys);
        applyAutoCorrecoes(newGroups);
        return appliedNcms;
    }, [ncmGroups, applyAutoCorrecoes]);

    /**
     * Exporta atribuições como CSV para backup.
     */
    const exportCsv = useCallback(() => {
        const currentAssignments = getAssignments();
        const currentKeys = getCstKeys();
        const csv = exportAssignmentsCsv(currentAssignments, currentKeys);
        downloadFile(csv, 'atribuicoes-cst-rayo.csv', 'text/csv;charset=utf-8;');
    }, []);

    /**
     * Retorna o CstKey atribuído a um NCM específico, ou null.
     */
    const getKeyForNcm = useCallback((ncm) => {
        const assignment = assignments.find(a => a.ncm === ncm);
        if (!assignment) return null;
        return cstKeys.find(k => k.id === assignment.cstKeyId) || null;
    }, [assignments, cstKeys]);

    // Estatísticas
    const ncmCount = ncmGroups ? [...ncmGroups.values()].filter(g => g.ncm && g.ncm !== 'SEM_NCM').length : 0;
    const assignedCount = assignments.length;

    return {
        cstKeys,
        assignments,
        assignedCount,
        ncmCount,
        createKey,
        updateKey,
        removeKey,
        assign,
        unassign,
        clearAll,
        applyAll,
        exportCsv,
        getKeyForNcm
    };
}
