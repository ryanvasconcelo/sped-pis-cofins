/**
 * UI Module — Renderização da interface e tabela editável
 */

// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================
let appState = {
  parsedData: null,
  ncmList: null,
  editableRows: [],
  originalFileName: ''
};

// ============================================================
// RENDERIZAÇÃO
// ============================================================

/**
 * Renderiza informações do arquivo após o upload
 */
function renderFileInfo(meta, stats, format) {
  const infoDiv = document.getElementById('file-info');

  // Format label
  let formatLabel = '';
  const totalRegs = stats.totalC170 + stats.totalC191 + stats.totalC195;
  if (format === 'C170') {
    formatLabel = 'C170 (por NF)';
  } else if (format === 'C191_C195') {
    formatLabel = 'C191+C195 (consolidado)';
  } else if (format && format.startsWith('MISTO')) {
    formatLabel = 'Misto (C170 + C191/C195)';
  } else {
    formatLabel = 'Desconhecido';
  }

  // Registros detail
  let regsDetail = '';
  if (stats.totalC170 > 0) regsDetail += `${stats.totalC170} C170`;
  if (stats.totalC191 > 0) regsDetail += `${regsDetail ? ' + ' : ''}${stats.totalC191} C191`;
  if (stats.totalC195 > 0) regsDetail += `${regsDetail ? ' + ' : ''}${stats.totalC195} C195`;

  infoDiv.innerHTML = `
    <div class="info-grid">
      <div class="info-card">
        <span class="info-label">Empresa</span>
        <span class="info-value">${meta.companyName || '—'}</span>
      </div>
      <div class="info-card">
        <span class="info-label">CNPJ</span>
        <span class="info-value">${formatCNPJ(meta.cnpj)}</span>
      </div>
      <div class="info-card">
        <span class="info-label">Período</span>
        <span class="info-value">${formatPeriod(meta.period)}</span>
      </div>
      <div class="info-card">
        <span class="info-label">Produtos</span>
        <span class="info-value highlight">${stats.totalItems}</span>
      </div>
      <div class="info-card">
        <span class="info-label">Formato</span>
        <span class="info-value">${formatLabel}</span>
      </div>
      <div class="info-card">
        <span class="info-label">Registros</span>
        <span class="info-value highlight">${totalRegs}</span>
        <span class="info-label" style="font-size:0.65rem">${regsDetail}</span>
      </div>
    </div>
  `;
  infoDiv.classList.remove('hidden');
}

/**
 * Constrói os dados editáveis a partir dos registros parseados
 */
function buildEditableRows(parsedData) {
  const rows = [];

  // === C170: cada registro tem PIS E COFINS juntos ===
  parsedData.contributions
    .filter(c => c.type === 'C170')
    .forEach(c => {
      const item = parsedData.items.get(c.codItem);
      rows.push({
        id: `row-${c.lineIndex}`,
        lineIndex: c.lineIndex,
        type: 'C170',
        codItem: c.codItem,
        description: item ? item.description : c.codItem,
        ncm: item ? item.ncm : '',
        cfop: c.cfop,
        vlItem: c.vlItem,
        vlDesc: c.vlDesc,
        // PIS
        cstPisAtual: c.cstPis,
        novoCstPis: '',
        aliqPis: c.aliqPis || ALIQ_PIS_PADRAO,
        vlBcPis: c.vlBcPis,
        vlPis: c.vlPis,
        // COFINS
        cstCofinsAtual: c.cstCofins,
        novoCstCofins: '',
        aliqCofins: c.aliqCofins || ALIQ_COFINS_PADRAO,
        vlBcCofins: c.vlBcCofins,
        vlCofins: c.vlCofins,
        // Field positions
        fieldPositions: c.fieldPositions
      });
    });

  // === C191+C195: registros separados para PIS e COFINS ===
  const c191List = parsedData.contributions.filter(c => c.type === 'C191');
  const c195List = parsedData.contributions.filter(c => c.type === 'C195');

  c191List.forEach((c191, idx) => {
    // Encontrar o C195 correspondente (mesmo índice — emparelhados na ordem)
    const c195 = c195List[idx] || null;

    rows.push({
      id: `row-${c191.lineIndex}`,
      lineIndexPis: c191.lineIndex,
      lineIndexCofins: c195 ? c195.lineIndex : null,
      type: 'C191_C195',
      cnpj: c191.cnpj,
      cfop: c191.cfop,
      vlItem: c191.vlItem,
      vlDesc: c191.vlDesc,
      // PIS
      cstPisAtual: c191.cstPis,
      novoCstPis: '',
      aliqPis: c191.aliqPis || ALIQ_PIS_PADRAO,
      vlBcPis: c191.vlBcPis,
      vlPis: c191.vlPis,
      fieldPositionsPis: c191.fieldPositions,
      // COFINS
      cstCofinsAtual: c195 ? c195.cstCofins : '',
      novoCstCofins: '',
      aliqCofins: c195 ? (c195.aliqCofins || ALIQ_COFINS_PADRAO) : ALIQ_COFINS_PADRAO,
      vlBcCofins: c195 ? c195.vlBcCofins : 0,
      vlCofins: c195 ? c195.vlCofins : 0,
      fieldPositionsCofins: c195 ? c195.fieldPositions : null,
      // NCM lookup
      ncm: '',
      description: c191.cnpj ? `CNPJ: ${formatCNPJ(c191.cnpj)}` : `Registro ${idx + 1}`
    });
  });

  return rows;
}

/**
 * Renderiza a tabela editável
 */
function renderTable(rows) {
  const container = document.getElementById('table-container');
  const tbody = document.getElementById('data-tbody');
  tbody.innerHTML = '';

  rows.forEach((row, idx) => {
    const baseCalc = calcBaseCalculo(row.vlItem, row.vlDesc);
    const tr = document.createElement('tr');
    tr.id = row.id;
    tr.dataset.index = idx;

    tr.innerHTML = `
      <td class="cell-num">${idx + 1}</td>
      <td class="cell-desc" title="${row.description}">${truncate(row.description, 30)}</td>
      <td class="cell-ncm">${row.ncm || '—'}</td>
      <td class="cell-cfop">${row.cfop}</td>
      <td class="cell-money">${formatMoney(baseCalc)}</td>
      <td class="cell-cst cst-atual">${row.cstPisAtual}</td>
      <td class="cell-input">
        <input type="text" class="input-cst input-cst-pis" 
               data-idx="${idx}" data-field="novoCstPis"
               value="${row.novoCstPis}" maxlength="2" 
               placeholder="CST">
      </td>
      <td class="cell-input">
        <input type="number" class="input-aliq input-aliq-pis" 
               data-idx="${idx}" data-field="aliqPis"
               value="${row.aliqPis}" step="0.01" min="0" max="100">
      </td>
      <td class="cell-money cell-vlpis">${formatMoney(row.vlPis)}</td>
      <td class="cell-cst cst-atual">${row.cstCofinsAtual}</td>
      <td class="cell-input">
        <input type="text" class="input-cst input-cst-cofins" 
               data-idx="${idx}" data-field="novoCstCofins"
               value="${row.novoCstCofins}" maxlength="2" 
               placeholder="CST">
      </td>
      <td class="cell-input">
        <input type="number" class="input-aliq input-aliq-cofins" 
               data-idx="${idx}" data-field="aliqCofins"
               value="${row.aliqCofins}" step="0.01" min="0" max="100">
      </td>
      <td class="cell-money cell-vlcofins">${formatMoney(row.vlCofins)}</td>
    `;

    tbody.appendChild(tr);
  });

  // Adicionar event listeners
  document.querySelectorAll('.input-cst, .input-aliq').forEach(input => {
    input.addEventListener('change', handleInputChange);
    input.addEventListener('input', handleInputChange);
  });

  container.classList.remove('hidden');
  updateSummary(rows);
}

/**
 * Manipula mudança de input na tabela
 */
function handleInputChange(e) {
  const input = e.target;
  const idx = parseInt(input.dataset.idx);
  const field = input.dataset.field;
  const row = appState.editableRows[idx];

  if (!row) return;

  // Atualizar o campo editado
  if (field === 'novoCstPis' || field === 'novoCstCofins') {
    row[field] = input.value.trim();
  } else {
    row[field] = parseFloat(input.value) || 0;
  }

  // Recalcular valores
  const baseCalc = calcBaseCalculo(row.vlItem, row.vlDesc);
  const cstPis = row.novoCstPis || row.cstPisAtual;
  const cstCofins = row.novoCstCofins || row.cstCofinsAtual;

  const result = calcularContribuicoes({
    vlItem: row.vlItem,
    vlDesc: row.vlDesc,
    cstPis: cstPis,
    aliqPis: row.aliqPis,
    cstCofins: cstCofins,
    aliqCofins: row.aliqCofins
  });

  // Atualizar valores calculados na row
  row.vlBcPis = result.baseCalculo;
  row.vlPis = result.valorPis;
  row.vlBcCofins = result.baseCalculo;
  row.vlCofins = result.valorCofins;

  // Atualizar células na tabela
  const tr = document.querySelector(`#${row.id}`);
  if (tr) {
    tr.querySelector('.cell-vlpis').textContent = formatMoney(result.valorPis);
    tr.querySelector('.cell-vlcofins').textContent = formatMoney(result.valorCofins);

    // Highlight CST change
    const pisInput = tr.querySelector('.input-cst-pis');
    const cofinsInput = tr.querySelector('.input-cst-cofins');

    if (row.novoCstPis && row.novoCstPis !== row.cstPisAtual) {
      pisInput.classList.add('changed');
    } else {
      pisInput.classList.remove('changed');
    }
    if (row.novoCstCofins && row.novoCstCofins !== row.cstCofinsAtual) {
      cofinsInput.classList.add('changed');
    } else {
      cofinsInput.classList.remove('changed');
    }
  }

  updateSummary(appState.editableRows);
}

/**
 * Atualiza o resumo de impacto
 */
function updateSummary(rows) {
  let totalPisOriginal = 0;
  let totalCofinsOriginal = 0;
  let totalPisNovo = 0;
  let totalCofinsNovo = 0;
  let cstsAlterados = 0;

  rows.forEach(row => {
    // Valores originais (do arquivo)
    const origPis = row.vlPis || 0;
    const origCofins = row.vlCofins || 0;

    // Calcular novos valores
    const cstPis = row.novoCstPis || row.cstPisAtual;
    const cstCofins = row.novoCstCofins || row.cstCofinsAtual;
    const baseCalc = calcBaseCalculo(row.vlItem, row.vlDesc);

    const novoPis = cstGeraCredito(cstPis) ? calcPis(baseCalc, row.aliqPis, cstPis) : 0;
    const novoCofins = cstGeraCredito(cstCofins) ? calcCofins(baseCalc, row.aliqCofins, cstCofins) : 0;

    totalPisNovo += novoPis;
    totalCofinsNovo += novoCofins;

    if (row.novoCstPis && row.novoCstPis !== row.cstPisAtual) cstsAlterados++;
    if (row.novoCstCofins && row.novoCstCofins !== row.cstCofinsAtual) cstsAlterados++;
  });

  const summaryDiv = document.getElementById('summary');
  summaryDiv.innerHTML = `
    <div class="summary-grid">
      <div class="summary-card">
        <span class="summary-label">CSTs Alterados</span>
        <span class="summary-value ${cstsAlterados > 0 ? 'highlight' : ''}">${cstsAlterados}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Crédito PIS</span>
        <span class="summary-value money">${formatMoney(totalPisNovo)}</span>
      </div>
      <div class="summary-card">
        <span class="summary-label">Crédito COFINS</span>
        <span class="summary-value money">${formatMoney(totalCofinsNovo)}</span>
      </div>
      <div class="summary-card total">
        <span class="summary-label">Crédito Total Recuperado</span>
        <span class="summary-value money highlight">${formatMoney(totalPisNovo + totalCofinsNovo)}</span>
      </div>
    </div>
  `;
  summaryDiv.classList.remove('hidden');
}

// ============================================================
// UTILIDADES DE FORMATAÇÃO
// ============================================================

function formatCNPJ(cnpj) {
  if (!cnpj || cnpj.length < 14) return cnpj || '—';
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`;
}

function formatPeriod(period) {
  if (!period) return '—';
  // Format: "01012025 a 31012025" → "01/01/2025 a 31/01/2025"
  return period.replace(/(\d{2})(\d{2})(\d{4})/g, '$1/$2/$3');
}

function formatMoney(value) {
  if (value === 0 || value === undefined || value === null) return 'R$ 0,00';
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function truncate(str, maxLen) {
  if (!str) return '—';
  return str.length > maxLen ? str.substring(0, maxLen) + '…' : str;
}

// ============================================================
// FILTROS
// ============================================================

function filterTable(searchTerm) {
  const rows = document.querySelectorAll('#data-tbody tr');
  const term = searchTerm.toLowerCase();

  rows.forEach(tr => {
    const text = tr.textContent.toLowerCase();
    tr.style.display = text.includes(term) ? '' : 'none';
  });
}
