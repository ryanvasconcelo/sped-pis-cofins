import { useState, useCallback } from 'react';
import { parseSpedFile } from '../core/sped-parser';
import { groupByNCM, extractUniqueNCMs } from '../core/ncm-grouper';

export function useSpedFile() {
    const [parsedData, setParsedData] = useState(null);
    const [ncmGroups, setNcmGroups] = useState(null);
    const [ncmList, setNcmList] = useState([]);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deparaRules, setDeparaRules] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('rayo_depara_rules')) || [];
        } catch {
            return [];
        }
    });

    const processFile = useCallback((file) => {
        setLoading(true);
        setError(null);
        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const parsed = parseSpedFile(content);
                setParsedData(parsed);

                const groups = groupByNCM(parsed);
                setNcmGroups(groups);

                const ncms = extractUniqueNCMs(parsed.items);
                setNcmList(ncms);

                setLoading(false);
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };

        reader.onerror = () => {
            setError('Erro ao ler o arquivo');
            setLoading(false);
        };

        reader.readAsText(file, 'ISO-8859-1');
    }, []);

    const reset = useCallback(() => {
        setParsedData(null);
        setNcmGroups(null);
        setNcmList([]);
        setFileName('');
        setError(null);
    }, []);

    const updateGroup = useCallback((groupKey, field, value) => {
        setNcmGroups(prev => {
            if (!prev) return prev;
            const newGroups = new Map(prev);
            const group = { ...newGroups.get(groupKey) };
            group[field] = value;
            newGroups.set(groupKey, group);
            return newGroups;
        });
    }, []);

    const applyDeparaRules = useCallback((rules) => {
        setDeparaRules(rules);
        localStorage.setItem('rayo_depara_rules', JSON.stringify(rules));

        if (!ncmGroups || rules.length === 0) return;

        setNcmGroups(prev => {
            const newGroups = new Map(prev);

            for (const [key, group] of newGroups) {
                let novoCstPis = group.novoCstPis;
                let novoCstCofins = group.novoCstCofins;
                let changed = false;

                // Para cada registro no grupo, checamos as regras
                for (const rec of group.records) {
                    const ncm = group.ncm;
                    const codItem = rec.codItem || '';
                    const cstPisAtual = rec.cstPis;
                    const cstCofinsAtual = rec.cstCofins;

                    for (const rule of rules) {
                        // Verifica match da regra (o que estiver vazio na regra é curinga)
                        const matchNcm = !rule.ncm || rule.ncm === ncm;
                        const matchCodItem = !rule.codItem || rule.codItem === codItem;

                        const matchPis = !rule.cstAtual || rule.cstAtual === cstPisAtual;
                        const matchCofins = !rule.cstAtual || rule.cstAtual === cstCofinsAtual;

                        if (matchNcm && matchCodItem && matchPis) {
                            novoCstPis = rule.novoCst;
                            changed = true;
                        }
                        if (matchNcm && matchCodItem && matchCofins) {
                            novoCstCofins = rule.novoCst;
                            changed = true;
                        }
                    }
                }

                if (changed) {
                    newGroups.set(key, {
                        ...group,
                        novoCstPis,
                        novoCstCofins
                    });
                }
            }
            return newGroups;
        });
    }, [ncmGroups]);

    return {
        parsedData, ncmGroups, ncmList, fileName, loading, error, deparaRules,
        processFile, reset, updateGroup, applyDeparaRules
    };
}
