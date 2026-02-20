/**
 * App — Orquestrador principal
 * Conecta: Upload → Parser → NCM Extractor → UI → Calculator → Writer → Download
 */

document.addEventListener('DOMContentLoaded', () => {
    initUpload();
    initButtons();
});

// ============================================================
// UPLOAD
// ============================================================

function initUpload() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');

    // Click para selecionar
    dropzone.addEventListener('click', () => fileInput.click());

    // Drag & Drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processFile(file);
    });
}

function initButtons() {
    document.getElementById('btn-download-ncm').addEventListener('click', handleDownloadNCMs);
    document.getElementById('btn-concluir').addEventListener('click', handleConcluir);
    document.getElementById('btn-download-final').addEventListener('click', handleDownloadFinal);
    document.getElementById('search-input').addEventListener('input', (e) => filterTable(e.target.value));
}

// ============================================================
// PROCESSAMENTO DO ARQUIVO
// ============================================================

function processFile(file) {
    appState.originalFileName = file.name;

    // Mostrar loading
    const dropzone = document.getElementById('dropzone');
    dropzone.innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <p>Processando ${file.name}...</p>
    </div>
  `;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target.result;
            const parsed = parseSpedFile(content);
            appState.parsedData = parsed;

            // Extrair NCMs
            appState.ncmList = extractUniqueNCMs(parsed.items);

            // Renderizar info
            renderFileInfo(parsed.meta, parsed.stats, parsed.format);

            // Construir e renderizar tabela
            appState.editableRows = buildEditableRows(parsed);
            renderTable(appState.editableRows);

            // Mostrar botões
            document.getElementById('actions-panel').classList.remove('hidden');
            document.getElementById('search-panel').classList.remove('hidden');

            // Atualizar dropzone
            dropzone.innerHTML = `
        <div class="upload-success">
          <span class="icon-success">✅</span>
          <p><strong>${file.name}</strong></p>
          <p class="subtext">${parsed.stats.totalItems} produtos • ${[parsed.stats.totalC170 ? parsed.stats.totalC170 + ' C170' : '', parsed.stats.totalC191 ? parsed.stats.totalC191 + ' C191' : '', parsed.stats.totalC195 ? parsed.stats.totalC195 + ' C195' : ''].filter(Boolean).join(' + ')}</p>
          <button class="btn btn-secondary btn-sm" onclick="resetApp()">Carregar outro arquivo</button>
        </div>
      `;
        } catch (err) {
            console.error('Erro ao processar arquivo:', err);
            dropzone.innerHTML = `
        <div class="upload-error">
          <span class="icon-error">❌</span>
          <p>Erro ao processar o arquivo</p>
          <p class="subtext">${err.message}</p>
          <button class="btn btn-secondary btn-sm" onclick="resetApp()">Tentar novamente</button>
        </div>
      `;
        }
    };

    reader.onerror = () => {
        dropzone.innerHTML = `
      <div class="upload-error">
        <span class="icon-error">❌</span>
        <p>Erro ao ler o arquivo</p>
        <button class="btn btn-secondary btn-sm" onclick="resetApp()">Tentar novamente</button>
      </div>
    `;
    };

    // Tentar múltiplos encodings
    reader.readAsText(file, 'ISO-8859-1');
}

// ============================================================
// AÇÕES
// ============================================================

function handleDownloadNCMs() {
    if (!appState.ncmList || appState.ncmList.length === 0) {
        showToast('Nenhum NCM encontrado', 'warning');
        return;
    }

    const csv = generateNCMsCsv(appState.ncmList);
    const baseName = appState.originalFileName.replace(/\.txt$/i, '');
    downloadFile(csv, `NCMs_${baseName}.csv`, 'text/csv');
    showToast(`${appState.ncmList.length} NCMs exportados com sucesso!`, 'success');
}

function handleConcluir() {
    // Validar que pelo menos 1 CST foi alterado
    const altered = appState.editableRows.filter(r =>
        (r.novoCstPis && r.novoCstPis !== r.cstPisAtual) ||
        (r.novoCstCofins && r.novoCstCofins !== r.cstCofinsAtual)
    );

    if (altered.length === 0) {
        showToast('Nenhum CST foi alterado. Preencha os novos CSTs antes de concluir.', 'warning');
        return;
    }

    // Habilitar download final
    document.getElementById('btn-download-final').disabled = false;
    document.getElementById('btn-download-final').classList.add('ready');
    showToast(`${altered.length} registro(s) com CSTs alterados. Pronto para download!`, 'success');
}

function handleDownloadFinal() {
    if (!appState.parsedData) {
        showToast('Nenhum arquivo carregado', 'warning');
        return;
    }

    // Construir lista de modificações
    const modifications = [];

    appState.editableRows.forEach(row => {
        const cstPis = row.novoCstPis || row.cstPisAtual;
        const cstCofins = row.novoCstCofins || row.cstCofinsAtual;
        const baseCalc = calcBaseCalculo(row.vlItem, row.vlDesc);

        const result = calcularContribuicoes({
            vlItem: row.vlItem,
            vlDesc: row.vlDesc,
            cstPis: cstPis,
            aliqPis: row.aliqPis,
            cstCofins: cstCofins,
            aliqCofins: row.aliqCofins
        });

        if (row.type === 'C170') {
            // C170: PIS e COFINS na mesma linha
            if (row.novoCstPis || row.novoCstCofins) {
                modifications.push({
                    lineIndex: row.lineIndex,
                    fieldPositions: row.fieldPositions,
                    newCstPis: row.novoCstPis || undefined,
                    newVlBcPis: row.novoCstPis ? result.baseCalculo : undefined,
                    newAliqPis: row.novoCstPis ? row.aliqPis : undefined,
                    newVlPis: row.novoCstPis ? result.valorPis : undefined,
                    newCstCofins: row.novoCstCofins || undefined,
                    newVlBcCofins: row.novoCstCofins ? result.baseCalculo : undefined,
                    newAliqCofins: row.novoCstCofins ? row.aliqCofins : undefined,
                    newVlCofins: row.novoCstCofins ? result.valorCofins : undefined
                });
            }
        } else {
            // C191+C195: linhas separadas
            if (row.novoCstPis && row.lineIndexPis !== null) {
                modifications.push({
                    lineIndex: row.lineIndexPis,
                    fieldPositions: row.fieldPositionsPis,
                    newCstPis: row.novoCstPis,
                    newVlBcPis: result.baseCalculo,
                    newAliqPis: row.aliqPis,
                    newVlPis: result.valorPis
                });
            }
            if (row.novoCstCofins && row.lineIndexCofins !== null) {
                modifications.push({
                    lineIndex: row.lineIndexCofins,
                    fieldPositions: row.fieldPositionsCofins,
                    newCstCofins: row.novoCstCofins,
                    newVlBcCofins: result.baseCalculo,
                    newAliqCofins: row.aliqCofins,
                    newVlCofins: result.valorCofins
                });
            }
        }
    });

    // Gerar arquivo modificado
    const modifiedContent = generateModifiedSped(appState.parsedData.rawLines, modifications);
    const baseName = appState.originalFileName.replace(/\.txt$/i, '');
    downloadFile(modifiedContent, `${baseName}_REVISADO.TXT`);
    showToast('Arquivo SPED revisado baixado com sucesso!', 'success');
}

// ============================================================
// UTILIDADES
// ============================================================

function resetApp() {
    appState = {
        parsedData: null,
        ncmList: null,
        editableRows: [],
        originalFileName: ''
    };

    // Reset UI
    document.getElementById('dropzone').innerHTML = `
    <div class="upload-prompt">
      <span class="upload-icon">📂</span>
      <p class="upload-title">Arraste seu arquivo SPED (.TXT) aqui</p>
      <p class="upload-subtitle">ou clique para selecionar</p>
    </div>
  `;
    document.getElementById('file-info').classList.add('hidden');
    document.getElementById('actions-panel').classList.add('hidden');
    document.getElementById('search-panel').classList.add('hidden');
    document.getElementById('table-container').classList.add('hidden');
    document.getElementById('summary').classList.add('hidden');
    document.getElementById('btn-download-final').disabled = true;
    document.getElementById('btn-download-final').classList.remove('ready');
    document.getElementById('file-input').value = '';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span class="toast-msg">${message}</span>
  `;
    container.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => toast.classList.add('show'));

    // Remover após 4s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
