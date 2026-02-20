/**
 * SPED Parser — Lê e interpreta arquivos SPED EFD-Contribuições
 * 
 * Suporta dois formatos de escrituração:
 * - C170 (itens por nota fiscal) 
 * - C191+C195 (consolidado por CNPJ/CST/CFOP)
 * 
 * Todos os campos são tratados como STRING para preservar zeros à esquerda.
 */

// ============================================================
// MAPEAMENTO DE CAMPOS — Baseado no Guia Prático EFD-Contribuições
// ============================================================

/**
 * Registro 0200 — Cadastro de Itens
 * Layout: |0200|COD_ITEM|DESCR_ITEM|COD_BARRA|COD_ANT|UNID_INV|TIPO_ITEM|COD_NCM|EX_IPI|COD_GEN|COD_LST|ALIQ_ICMS|
 */
const FIELDS_0200 = {
  REG: 1,           // "0200"
  COD_ITEM: 2,      // Código do item
  DESCR_ITEM: 3,    // Descrição do item
  COD_BARRA: 4,     // Código de barras
  COD_ANT: 5,       // Código anterior
  UNID_INV: 6,      // Unidade de inventário
  TIPO_ITEM: 7,     // Tipo do item
  COD_NCM: 8,       // NCM (8 dígitos)
  EX_IPI: 9,        // Exceção IPI
  COD_GEN: 10,      // Código gênero
  COD_LST: 11,      // Código lista de serviço
  ALIQ_ICMS: 12     // Alíquota ICMS
};

/**
 * Registro C170 — Itens do Documento (por nota fiscal)
 * Layout EFD-Contribuições — posições confirmadas com dados reais:
 * 
 * Split por pipe: fields[0]="" fields[1]="C170" fields[2]=NUM_ITEM ...
 * 
 * Nº01=REG    Nº02=NUM_ITEM Nº03=COD_ITEM  Nº04=DESCR     Nº05=QTD
 * Nº06=UNID   Nº07=VL_ITEM  Nº08=VL_DESC   Nº09=IND_MOV   Nº10=CST_ICMS
 * Nº11=CFOP   Nº12=COD_NAT  Nº13=VL_BC_ICMS Nº14=ALIQ_ICMS Nº15=VL_ICMS
 * Nº16=VL_BC_ST Nº17=ALIQ_ST Nº18=VL_ICMS_ST Nº19=IND_APUR
 * Nº20=CST_PIS Nº21=VL_BC_PIS Nº22=ALIQ_PIS_% Nº23=QUANT_BC Nº24=ALIQ_PIS_R Nº25=VL_PIS
 * Nº26=CST_COFINS Nº27=VL_BC_COF Nº28=ALIQ_COF_% Nº29=QUANT_BC Nº30=ALIQ_COF_R Nº31=VL_COFINS
 * Nº32=COD_CTA
 * 
 * IMPORTANTE: fields[N] = Nº(N) porque fields[0] é vazio (pipe inicial)
 * Portanto: Nº20 = fields[20+1] = fields[21]
 */
const FIELDS_C170 = {
  REG: 2,               // "C170"  (Nº01, mas fields[1] pelo zero na frente)
  NUM_ITEM: 3,           // Nº02 — Número sequencial do item
  COD_ITEM: 4,           // Nº03 — Código do item (liga com 0200)
  DESCR_COMPL: 5,        // Nº04 — Descrição complementar
  QTD: 6,                // Nº05 — Quantidade
  UNID: 7,               // Nº06 — Unidade
  VL_ITEM: 8,            // Nº07 — Valor total do item
  VL_DESC: 9,            // Nº08 — Valor do desconto
  IND_MOV: 10,           // Nº09 — Indicador de movimentação
  CST_ICMS: 11,          // Nº10 — CST ICMS
  CFOP: 12,              // Nº11 — CFOP
  COD_NAT: 13,           // Nº12 — Código da natureza da operação
  VL_BC_ICMS: 14,        // Nº13 — Base de cálculo ICMS
  ALIQ_ICMS: 15,         // Nº14 — Alíquota ICMS
  VL_ICMS: 16,           // Nº15 — Valor ICMS
  VL_BC_ICMS_ST: 17,     // Nº16 — BC ICMS ST
  ALIQ_ST: 18,           // Nº17 — Alíquota ST
  VL_ICMS_ST: 19,        // Nº18 — Valor ICMS ST
  IND_APUR: 20,          // Nº19 — Indicador de apuração
  CST_PIS: 21,           // Nº20 ⚡ CST PIS
  VL_BC_PIS: 22,         // Nº21 ⚡ Base de cálculo PIS
  ALIQ_PIS_PCT: 23,      // Nº22 ⚡ Alíquota PIS (%)
  QUANT_BC_PIS: 24,      // Nº23 — Quantidade base de cálculo PIS
  ALIQ_PIS_REAIS: 25,    // Nº24 — Alíquota PIS (R$)
  VL_PIS: 26,            // Nº25 ⚡ Valor PIS
  CST_COFINS: 27,        // Nº26 ⚡ CST COFINS
  VL_BC_COFINS: 28,      // Nº27 ⚡ Base de cálculo COFINS
  ALIQ_COFINS_PCT: 29,   // Nº28 ⚡ Alíquota COFINS (%)
  QUANT_BC_COFINS: 30,   // Nº29 — Quantidade base de cálculo COFINS
  ALIQ_COFINS_REAIS: 31, // Nº30 — Alíquota COFINS (R$)
  VL_COFINS: 32,         // Nº31 ⚡ Valor COFINS
  COD_CTA: 33,           // Nº32 — Código conta contábil
  VL_ABAT_NT: 34         // Nº33 — Valor abatimento não tributado
};

/**
 * Registro C191 — PIS (consolidado por CNPJ/CST/CFOP)
 * Layout: |C191|CNPJ|CST_PIS|CFOP|VL_ITEM|VL_DESC|VL_BC_PIS|ALIQ_PIS|QUANT_BC_PIS|ALIQ_PIS_QUANT|VL_PIS|COD_CTA|
 */
const FIELDS_C191 = {
  REG: 1,               // "C191"
  CNPJ: 2,              // CNPJ do participante
  CST_PIS: 3,           // ⚡ CST PIS
  CFOP: 4,              // CFOP
  VL_ITEM: 5,           // Valor do item
  VL_DESC: 6,           // Valor do desconto
  VL_BC_PIS: 7,         // ⚡ Base de cálculo PIS
  ALIQ_PIS: 8,          // ⚡ Alíquota PIS (%)
  QUANT_BC_PIS: 9,      // Quantidade BC PIS
  ALIQ_PIS_QUANT: 10,   // Alíquota PIS (R$/unidade)
  VL_PIS: 11,           // ⚡ Valor PIS
  COD_CTA: 12           // Código conta contábil
};

/**
 * Registro C195 — COFINS (consolidado por CNPJ/CST/CFOP)
 * Layout: |C195|CNPJ|CST_COFINS|CFOP|VL_ITEM|VL_DESC|VL_BC_COFINS|ALIQ_COFINS|QUANT_BC_COFINS|ALIQ_COFINS_QUANT|VL_COFINS|COD_CTA|
 */
const FIELDS_C195 = {
  REG: 1,               // "C195"
  CNPJ: 2,              // CNPJ do participante
  CST_COFINS: 3,        // ⚡ CST COFINS
  CFOP: 4,              // CFOP
  VL_ITEM: 5,           // Valor do item
  VL_DESC: 6,           // Valor do desconto
  VL_BC_COFINS: 7,      // ⚡ Base de cálculo COFINS
  ALIQ_COFINS: 8,       // ⚡ Alíquota COFINS (%)
  QUANT_BC_COFINS: 9,   // Quantidade BC COFINS
  ALIQ_COFINS_QUANT: 10,// Alíquota COFINS (R$/unidade)
  VL_COFINS: 11,        // ⚡ Valor COFINS
  COD_CTA: 12           // Código conta contábil
};

// ============================================================
// PARSER
// ============================================================

/**
 * Converte valor numérico brasileiro (vírgula decimal) para float
 * Ex: "518,9" → 518.9 | "1.234,56" → 1234.56 | "" → 0
 */
function parseBRNumber(str) {
  if (!str || str.trim() === '') return 0;
  // Remove pontos de milhar, troca vírgula por ponto
  return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

/**
 * Converte float para formato numérico brasileiro
 * Ex: 518.9 → "518,90" | 1234.56 → "1234,56"
 */
function formatBRNumber(num, decimals = 2) {
  if (num === 0 || num === null || num === undefined) return '0,00';
  return num.toFixed(decimals).replace('.', ',');
}

/**
 * Parseia uma linha do SPED (delimitada por pipe)
 * Retorna array de campos (índice 0 = vazio, índice 1 = tipo de registro)
 */
function parseLine(line) {
  // Linha: |REG|campo1|campo2|...|
  // Split por | dá: ["", "REG", "campo1", "campo2", ..., ""]
  return line.split('|');
}

/**
 * Obtém o tipo de registro de uma linha parseada
 */
function getRegType(fields) {
  return fields[1] || '';
}

/**
 * Parseia o arquivo SPED completo
 * @param {string} content — Conteúdo do arquivo TXT
 * @returns {Object} Estrutura de dados com todos os registros
 */
function parseSpedFile(content) {
  const lines = content.split('\n');
  const rawLines = [...lines]; // Cópia das linhas originais

  const items = new Map();       // 0200: código → dados do produto
  const contributions = [];       // Registros de contribuição
  let format = null;              // 'C170' ou 'C191_C195'
  let hasC170 = false;
  let hasC191 = false;
  let hasC195 = false;

  // Info do arquivo
  let companyName = '';
  let cnpj = '';
  let period = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseLine(line);
    const reg = getRegType(fields);

    switch (reg) {
      case '0000':
        companyName = fields[8] || '';
        cnpj = fields[9] || '';
        period = `${fields[6] || ''} a ${fields[7] || ''}`;
        break;

      case '0200':
        items.set(fields[FIELDS_0200.COD_ITEM], {
          code: fields[FIELDS_0200.COD_ITEM],
          description: fields[FIELDS_0200.DESCR_ITEM],
          ncm: fields[FIELDS_0200.COD_NCM],
          barcode: fields[FIELDS_0200.COD_BARRA],
          unit: fields[FIELDS_0200.UNID_INV],
          lineIndex: i
        });
        break;

      case 'C170':
        hasC170 = true;
        contributions.push({
          lineIndex: i,
          type: 'C170',
          codItem: fields[FIELDS_C170.COD_ITEM],
          cfop: fields[FIELDS_C170.CFOP],
          vlItem: parseBRNumber(fields[FIELDS_C170.VL_ITEM]),
          vlDesc: parseBRNumber(fields[FIELDS_C170.VL_DESC]),
          // PIS (posições corrigidas: Nº20=fields[21], Nº25=fields[26])
          cstPis: (fields[FIELDS_C170.CST_PIS] || '').trim(),
          vlBcPis: parseBRNumber(fields[FIELDS_C170.VL_BC_PIS]),
          aliqPis: parseBRNumber(fields[FIELDS_C170.ALIQ_PIS_PCT]),
          vlPis: parseBRNumber(fields[FIELDS_C170.VL_PIS]),
          // COFINS (posições corrigidas: Nº26=fields[27], Nº31=fields[32])
          cstCofins: (fields[FIELDS_C170.CST_COFINS] || '').trim(),
          vlBcCofins: parseBRNumber(fields[FIELDS_C170.VL_BC_COFINS]),
          aliqCofins: parseBRNumber(fields[FIELDS_C170.ALIQ_COFINS_PCT]),
          vlCofins: parseBRNumber(fields[FIELDS_C170.VL_COFINS]),
          // Field positions for writer
          fieldPositions: {
            CST_PIS: FIELDS_C170.CST_PIS,
            VL_BC_PIS: FIELDS_C170.VL_BC_PIS,
            ALIQ_PIS: FIELDS_C170.ALIQ_PIS_PCT,
            VL_PIS: FIELDS_C170.VL_PIS,
            CST_COFINS: FIELDS_C170.CST_COFINS,
            VL_BC_COFINS: FIELDS_C170.VL_BC_COFINS,
            ALIQ_COFINS: FIELDS_C170.ALIQ_COFINS_PCT,
            VL_COFINS: FIELDS_C170.VL_COFINS
          }
        });
        break;

      case 'C191':
        hasC191 = true;
        contributions.push({
          lineIndex: i,
          type: 'C191',
          cnpj: fields[FIELDS_C191.CNPJ] || '',
          cfop: fields[FIELDS_C191.CFOP] || '',
          vlItem: parseBRNumber(fields[FIELDS_C191.VL_ITEM]),
          vlDesc: parseBRNumber(fields[FIELDS_C191.VL_DESC]),
          // PIS
          cstPis: fields[FIELDS_C191.CST_PIS] || '',
          vlBcPis: parseBRNumber(fields[FIELDS_C191.VL_BC_PIS]),
          aliqPis: parseBRNumber(fields[FIELDS_C191.ALIQ_PIS]),
          vlPis: parseBRNumber(fields[FIELDS_C191.VL_PIS]),
          // Campo extra (observação do e-Auditoria presente em alguns arquivos)
          codCta: fields[FIELDS_C191.COD_CTA] || '',
          fieldPositions: {
            CST_PIS: FIELDS_C191.CST_PIS,
            VL_BC_PIS: FIELDS_C191.VL_BC_PIS,
            ALIQ_PIS: FIELDS_C191.ALIQ_PIS,
            VL_PIS: FIELDS_C191.VL_PIS
          }
        });
        break;

      case 'C195':
        hasC195 = true;
        contributions.push({
          lineIndex: i,
          type: 'C195',
          cnpj: fields[FIELDS_C195.CNPJ] || '',
          cfop: fields[FIELDS_C195.CFOP] || '',
          vlItem: parseBRNumber(fields[FIELDS_C195.VL_ITEM]),
          vlDesc: parseBRNumber(fields[FIELDS_C195.VL_DESC]),
          // COFINS
          cstCofins: fields[FIELDS_C195.CST_COFINS] || '',
          vlBcCofins: parseBRNumber(fields[FIELDS_C195.VL_BC_COFINS]),
          aliqCofins: parseBRNumber(fields[FIELDS_C195.ALIQ_COFINS]),
          vlCofins: parseBRNumber(fields[FIELDS_C195.VL_COFINS]),
          codCta: fields[FIELDS_C195.COD_CTA] || '',
          fieldPositions: {
            CST_COFINS: FIELDS_C195.CST_COFINS,
            VL_BC_COFINS: FIELDS_C195.VL_BC_COFINS,
            ALIQ_COFINS: FIELDS_C195.ALIQ_COFINS,
            VL_COFINS: FIELDS_C195.VL_COFINS
          }
        });
        break;
    }
  }

  // Contar registros por tipo
  const countC170 = contributions.filter(c => c.type === 'C170').length;
  const countC191 = contributions.filter(c => c.type === 'C191').length;
  const countC195 = contributions.filter(c => c.type === 'C195').length;

  // Detectar formato dominante
  // Arquivos podem ter AMBOS os formatos — usamos o que tem mais registros
  if (hasC170 && !hasC191 && !hasC195) {
    format = 'C170';
  } else if (!hasC170 && (hasC191 || hasC195)) {
    format = 'C191_C195';
  } else if (hasC170 && (hasC191 || hasC195)) {
    // Arquivo misto — usar formato dominante
    format = countC170 > (countC191 + countC195) ? 'MISTO_C170' : 'MISTO_C191_C195';
  }

  return {
    rawLines,
    items,
    contributions,
    format,
    meta: { companyName, cnpj, period },
    stats: {
      totalLines: lines.length,
      totalItems: items.size,
      totalC170: countC170,
      totalC191: countC191,
      totalC195: countC195
    }
  };
}

// Exportar para uso em módulos ou global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseSpedFile, parseBRNumber, formatBRNumber, parseLine };
}
