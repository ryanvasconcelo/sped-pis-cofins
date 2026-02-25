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


    const applyAutoCorrecoes = useCallback((newGroups) => {
        setNcmGroups(newGroups);
    }, []);

    return {
        parsedData, ncmGroups, ncmList, fileName, loading, error,
        processFile, reset, updateGroup, applyAutoCorrecoes
    };
}
