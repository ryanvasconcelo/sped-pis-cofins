/**
 * useRetificacaoCodigos.js
 *
 * Hook de orquestração do módulo Retificação de Códigos de Produto.
 *
 * Entradas:
 *   - arquivoSped : File | null  (.txt do SPED EFD)
 *   - arquivosNfe : File[]       (.xml individuais ou .zip com XMLs)
 *
 * Saídas:
 *   - resultado   : { rows, c170Mods, c0200Mods, stats, spedData } | null
 *   - status      : 'idle' | 'processing' | 'done' | 'error'
 *   - erro        : string | null
 */

import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import {
    parseSpedForRetificacao,
    parseNfeXml,
    buildRetificacao,
    applyRetificacao,
    downloadSpedTxt
} from '../lib/retificacao/retificacao-engine';

function readFileText(file, encoding = 'windows-1252') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`Erro ao ler: ${file.name}`));
        reader.readAsText(file, encoding);
    });
}

function readFileBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error(`Erro ao ler: ${file.name}`));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Extrai XMLs de NF-e de uma lista de Files (podem ser .xml ou .zip).
 * Retorna Map<chNFe, {cProd, xProd, ncm} por nItem>
 */
async function extractXmlMap(files) {
    const xmlTexts = [];

    for (const file of files) {
        if (file.name.toLowerCase().endsWith('.xml')) {
            const text = await readFileText(file, 'utf-8');
            xmlTexts.push(text);
        } else if (file.name.toLowerCase().endsWith('.zip')) {
            const buf = await readFileBuffer(file);
            const zip = await JSZip.loadAsync(buf);
            const xmlFiles = Object.values(zip.files).filter(
                f => !f.dir && f.name.toLowerCase().endsWith('.xml')
            );
            for (const zf of xmlFiles) {
                const text = await zf.async('text');
                xmlTexts.push(text);
            }
        }
    }

    const xmlByChave = new Map();
    for (const text of xmlTexts) {
        const parsed = parseNfeXml(text);
        if (parsed && parsed.chNFe) {
            xmlByChave.set(parsed.chNFe, parsed);
        }
    }

    return xmlByChave;
}

export function useRetificacaoCodigos() {
    const [arquivoSped, setArquivoSpedState]   = useState(null);
    const [arquivosNfe, setArquivosNfeState]   = useState([]);
    const [resultado, setResultado]             = useState(null);
    const [status, setStatus]                   = useState('idle');
    const [erro, setErro]                       = useState(null);
    const [filtro, setFiltro]                   = useState('TODOS');

    const reset = useCallback(() => {
        setResultado(null);
        setErro(null);
        setStatus('idle');
        setFiltro('TODOS');
    }, []);

    const setArquivoSped = useCallback((file) => {
        setArquivoSpedState(file);
        reset();
    }, [reset]);

    const setArquivosNfe = useCallback((files) => {
        setArquivosNfeState(files);
        reset();
    }, [reset]);

    const processar = useCallback(async () => {
        if (!arquivoSped) {
            setErro('Adicione o arquivo SPED EFD (.txt).');
            return;
        }
        if (!arquivosNfe.length) {
            setErro('Adicione pelo menos um arquivo de NF-e (.xml ou .zip).');
            return;
        }

        setStatus('processing');
        setErro(null);

        try {
            // Leitura em paralelo
            const [spedText, xmlByChave] = await Promise.all([
                readFileText(arquivoSped, 'windows-1252'),
                extractXmlMap(arquivosNfe)
            ]);

            const spedData = parseSpedForRetificacao(spedText);
            const result   = buildRetificacao(spedData, xmlByChave);

            setResultado({ ...result, spedData });
            setStatus('done');
        } catch (e) {
            setErro(e.message || 'Erro desconhecido durante o processamento.');
            setStatus('error');
        }
    }, [arquivoSped, arquivosNfe]);

    const baixarSpedCorrigido = useCallback(() => {
        if (!resultado) return;
        const { c170Mods, c0200Mods, spedData } = resultado;
        const conteudo = applyRetificacao(
            spedData.rawLines,
            spedData.lineEnding,
            c170Mods
        );
        const base = arquivoSped?.name?.replace(/\.txt$/i, '') || 'SPED';
        downloadSpedTxt(conteudo, `${base}_RETIFICADO.txt`);
    }, [resultado, arquivoSped]);

    return {
        arquivoSped, setArquivoSped,
        arquivosNfe, setArquivosNfe,
        resultado, status, erro,
        filtro, setFiltro,
        processar,
        baixarSpedCorrigido
    };
}
