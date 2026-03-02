import * as XLSX from 'xlsx';

/**
 * Lê o Livrão do Alterdata e converte a primeira aba em um Array de Objetos JSON.
 * @param {File} file Arquivo .xlsx
 * @returns {Promise<Array>} Array de objetos com as colunas mapeadas.
 */
export const parseAlterdata = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: null });
                resolve(jsonData);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (e) => reject(new Error('Erro ao ler arquivo Alterdata'));
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Lê o Relatório do e-Auditoria, extrai os metadados do Perfil e as Regras
 * @param {File} file Arquivo .xlsx
 * @returns {Promise<Object>} { metadata: { atividade, regime, uf }, rules: Array }
 */
export const parseEAuditoria = async (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

                // Extrair as primeiras linhas para pegar o Perfil da Empresa
                const headerRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, range: 0, defval: null });

                let atividade = 'GERAL';
                let regime = 'LUCRO REAL';
                let uf = '';

                // Varre as 5 primeiras linhas procurando os rótulos do e-Auditoria
                for (let i = 0; i < 5; i++) {
                    const row = headerRows[i];
                    if (!row) continue;

                    const labelCell = String(row[0] || '');
                    const valueCell = String(row[1] || '').trim();

                    if (labelCell.includes('Atividade Selecionada')) atividade = valueCell;
                    if (labelCell.includes('Regime Tributário')) regime = valueCell;
                    if (labelCell.includes('UF')) uf = valueCell;
                }

                // Infere a natureza para o Motor de Auditoria (Comércio/Indústria)
                const natureza = atividade.toUpperCase().includes('INDÚSTRIA') ? 'industria' : 'comercio';

                // Extrair a coleção de dados da tabela (a partir da linha 6, index 5)
                const rules = XLSX.utils.sheet_to_json(firstSheet, { range: 5, defval: null });

                resolve({
                    metadata: { atividade, regime, uf, natureza },
                    rules
                });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (e) => reject(new Error('Erro ao ler arquivo e-Auditoria'));
        reader.readAsArrayBuffer(file);
    });
};
