import * as XLSX from 'xlsx';

/**
 * Gera um arquivo Excel (.xlsx) a partir do array de objetos corrigido e aciona o download no navegador.
 * @param {Array} correctedData - O array de dados clonado e corrigido pelo Motor Auditor.
 * @param {String} filename - O nome do arquivo a ser salvo (padrão: Livrão_Auditado_Rayo.xlsx)
 */
export const downloadCorrectedAlterdata = (correctedData, filename = 'Livrão_Auditado_Rayo.xlsx') => {
    // A biblioteca xlsx precisa de uma Worksheet (aba) construída a partir de JSON
    const worksheet = XLSX.utils.json_to_sheet(correctedData);

    // Cria um novo Workbook (Arquivo Excel)
    const workbook = XLSX.utils.book_new();

    // Adiciona a aba criada ao Workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Entradas Auditadas');

    // Aciona o download do arquivo no navegador do usuário
    XLSX.writeFile(workbook, filename);
};
