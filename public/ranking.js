// Variáveis globais para o ranking
let rankingCurrentPage = 1;
const rankingItemsPerPage = 50;
let rankingData = [];
let rankingFilteredData = [];
// Conjunto para armazenar IDs dos candidatos excluídos
let excludedCandidates = new Set();
// Conjunto para armazenar IDs dos candidatos selecionados para visualização (filtro positivo)
let selectedCandidates = new Set();
let allCandidatesList = []; // Cache dos candidatos carregados


document.addEventListener('DOMContentLoaded', () => {
    console.log('Ranking.js: DOMContentLoaded');
    // Inicializar listeners se necessário
    const btnBuscarRanking = document.getElementById('btn-buscar-ranking');
    if (btnBuscarRanking) {
        btnBuscarRanking.addEventListener('click', carregarRanking);
    }

    const btnToggleLayout = document.getElementById('btn-toggle-layout');
    if (btnToggleLayout) {
        btnToggleLayout.addEventListener('click', toggleLayout);
    }

    const btnExportarExcel = document.getElementById('btn-exportar-excel');
    console.log('Botão Excel encontrado?', btnExportarExcel);
    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', () => {
            console.log('Clique no botão Excel detectado');
            exportarRankingExcel();
        });
    }


    // Toggle Ranking Mode
    const radioButtons = document.querySelectorAll('input[name="ranking-tipo"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', toggleRankingMode);
    });

    // Close multi-select when clicking outside
    document.addEventListener('click', (e) => {
        const regionalWrapper = document.getElementById('ranking-regional-wrapper');
        const candidateWrapper = document.getElementById('ranking-candidatos-group');
        const columnWrapper = document.getElementById('column-options'); // Wrapper handled differently usually

        if (regionalWrapper && !regionalWrapper.contains(e.target)) {
            document.getElementById('regional-options').classList.remove('active');
        }
        if (candidateWrapper && !candidateWrapper.contains(e.target)) {
            document.getElementById('candidate-options').classList.remove('active');
        }

        const colBox = document.querySelector('.control-group label:contains("Colunas")')?.parentElement;
        // Simpler check for column dropdown
        const colOptions = document.getElementById('column-options');
        const colSelectBox = colOptions?.parentElement?.querySelector('.select-box');

        if (colOptions && colOptions.classList.contains('active')) {
            if (!colOptions.contains(e.target) && !colSelectBox.contains(e.target)) {
                colOptions.classList.remove('active');
            }
        }
    });

    // Populate Regionals on load
    carregarListaRegionais();
});

async function carregarListaRegionais() {
    try {
        const response = await fetch('/api/regionais/regionais-psdb');
        const json = await response.json();
        if (json.success) {
            const container = document.getElementById('regional-options');
            if (container) {
                container.innerHTML = '';

                // Add "Select All" option
                const selectAllDiv = document.createElement('div');
                selectAllDiv.className = 'checkbox-item';
                selectAllDiv.innerHTML = `
                    <input type="checkbox" id="regional-all" checked onchange="toggleAllRegionais(this)">
                    <label for="regional-all"><strong>Todas as Regionais</strong></label>
                `;
                container.appendChild(selectAllDiv);

                json.data.forEach(reg => {
                    const div = document.createElement('div');
                    div.className = 'checkbox-item';
                    div.innerHTML = `
                        <input type="checkbox" name="regional-checkbox" value="${reg.id}" id="reg-${reg.id}" checked onchange="updateRegionalSelectedText()">
                        <label for="reg-${reg.id}">${reg.nome}</label>
                    `;
                    container.appendChild(div);
                });

                updateRegionalSelectedText();
            }
        }
    } catch (e) {
        console.error('Erro ao carregar regionais:', e);
    }
}

function toggleRegionalDropdown() {
    document.getElementById('regional-options').classList.toggle('active');
}

function toggleAllRegionais(source) {
    const checkboxes = document.querySelectorAll('input[name="regional-checkbox"]');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateRegionalSelectedText();
}

function updateRegionalSelectedText() {
    const checkboxes = document.querySelectorAll('input[name="regional-checkbox"]');
    const checked = document.querySelectorAll('input[name="regional-checkbox"]:checked');
    const textSpan = document.getElementById('regional-selected-text');
    const selectAllCb = document.getElementById('regional-all');

    if (checked.length === checkboxes.length) {
        textSpan.textContent = "Todas as Regionais";
        if (selectAllCb) selectAllCb.checked = true;
    } else if (checked.length === 0) {
        textSpan.textContent = "Nenhuma Selecionada";
        if (selectAllCb) selectAllCb.checked = false;
    } else {
        textSpan.textContent = `${checked.length} Selecionadas`;
        if (selectAllCb) selectAllCb.checked = false;
    }
}

function toggleRankingMode() {
    const mode = document.querySelector('input[name="ranking-tipo"]:checked').value;
    const municipioInput = document.getElementById('ranking-busca-municipio');
    const regionalWrapper = document.getElementById('ranking-regional-wrapper');
    const label = document.getElementById('ranking-filtro-label');

    if (mode === 'regional') {
        municipioInput.style.display = 'none';
        regionalWrapper.style.display = 'block';
        label.textContent = 'Filtrar Regional';
    } else {
        municipioInput.style.display = 'block';
        regionalWrapper.style.display = 'none';
        label.textContent = 'Filtrar Município';
    }

    // Limpar os resultados ao trocar de modo para evitar confusão
    const container = document.getElementById('ranking-results');
    container.innerHTML = '<div class="placeholder-msg"><p>Clique em Carregar Ranking para atualizar.</p></div>';
    rankingData = [];
    rankingFilteredData = [];

    // Hide candidate filter until data is loaded
    const candGroup = document.getElementById('ranking-candidatos-group');
    if (candGroup) candGroup.style.display = 'none';
}

function toggleLayout() {
    const container = document.getElementById('ranking-results');
    container.classList.toggle('layout-compact');

    const btn = document.getElementById('btn-toggle-layout');
    if (container.classList.contains('layout-compact')) {
        btn.classList.add('active');
        btn.title = "Voltar para Layout Padrão";
    } else {
        btn.classList.remove('active');
        btn.title = "Alternar Layout de Impressão";
    }
}

// Função para excluir um candidato globalmente
function excluirCandidato(id) {
    if (confirm('Deseja realmente excluir este candidato de todos os rankings?')) {
        excludedCandidates.add(parseInt(id));
        renderizarRanking();
    }
}

// Função principal para carregar o ranking
async function carregarRanking() {
    const container = document.getElementById('ranking-results');
    const loading = document.getElementById('ranking-loading');
    const eleicaoSelect = document.getElementById('ranking-eleicao');
    const mode = document.querySelector('input[name="ranking-tipo"]:checked').value;

    if (!eleicaoSelect.value) {
        alert('Por favor, selecione uma eleição.');
        return;
    }

    container.innerHTML = '';
    loading.style.display = 'block';

    try {
        let url;
        if (mode === 'regional') {
            // Collect checked IDs
            const checked = Array.from(document.querySelectorAll('input[name="regional-checkbox"]:checked')).map(cb => cb.value);

            // If none checked, show warning or fetch none?
            if (checked.length === 0) {
                loading.style.display = 'none';
                container.innerHTML = '<div class="alert alert-warning">Selecione pelo menos uma regional.</div>';
                return;
            }

            // If "All" are checked, we can optionally just omit the regional_id param to fetch all (if backend supports it)
            // Or pass all IDs. Passing IDs is safer if "All" logic is client side.
            // Our backend logic: if regional_id param exists, it filters by it. If missing, it fetches all? 
            // Let's check backend... "if (regional_id) { ... }" -> So if we don't pass it, it fetches all rows where cargo IN ...
            // That works. BUT, if we have "All" checked, we might want to pass nothing to handle "all".
            const totalCheckboxes = document.querySelectorAll('input[name="regional-checkbox"]').length;

            const limitEl = document.getElementById('ranking-limite');
            const limit = limitEl ? limitEl.value : 50;

            url = `/api/ranking/top-candidatos-regional?eleicao_id=${eleicaoSelect.value}&limit=${limit}`;

            if (checked.length < totalCheckboxes) {
                url += `&regional_id=${checked.join(',')}`;
            }
            // If length == totalCheckboxes, we don't append regional_id, so backend fetches all.
        } else {
            const limitEl = document.getElementById('ranking-limite');
            const limit = limitEl ? limitEl.value : 50;
            url = `/api/ranking/top-candidatos?eleicao_id=${eleicaoSelect.value}&limit=${limit}`;
        }

        const response = await fetch(url);
        const json = await response.json();

        if (json.success) {
            rankingData = json.data;
            document.getElementById('ranking-candidatos-group').style.display = 'block';
            populateCandidateFilter();
            aplicarFiltoseRenderizar();

        } else {
            container.innerHTML = `<div class="alert alert-error">Erro ao carregar dados: ${json.error}</div>`;
        }

    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="alert alert-error">Erro de conexão com o servidor.</div>';
    } finally {
        loading.style.display = 'none';
    }
}

function aplicarFiltoseRenderizar() {
    const mode = document.querySelector('input[name="ranking-tipo"]:checked').value;
    rankingFilteredData = rankingData;

    if (mode === 'municipio') {
        const municipioInput = document.getElementById('ranking-busca-municipio');
        // Filtro de texto do município se houver
        if (municipioInput && municipioInput.value.trim()) {
            const termo = municipioInput.value.trim().toLowerCase();
            rankingFilteredData = rankingData.filter(m => m.nome.toLowerCase().includes(termo));
        }
    } else {
        // Modo regional: o filtro já foi feito no backend ou selectionamos 'Todas'
        // Se quisermos filtrar o dropdown client-side seria aqui, mas o dropdown define a busca principal.
        // Então não precisamos filtrar texto aqui, a menos que adicionemos input de texto.
    }

    // Ordenar alfabeticamente
    rankingFilteredData.sort((a, b) => a.nome.localeCompare(b.nome));

    renderizarRanking();
}

function renderizarRanking() {
    const container = document.getElementById('ranking-results');
    container.innerHTML = '';

    if (rankingFilteredData.length === 0) {
        container.innerHTML = '<div class="no-data"><p>Nenhum município encontrado com os filtros selecionados.</p></div>';
        return;
    }

    rankingFilteredData.forEach(municipio => {
        const card = document.createElement('div');
        card.className = 'municipio-ranking-card';

        let html = `
            <div class="municipio-header-card">
                <h3>${municipio.nome}</h3>
            </div>
            <div class="cargos-container">
        `;

        // Filtrar candidatos excluídos e pegar top 20
        // Filtrar candidatos excluídos e pegar top 20
        const topFederal = filtrarEProcessarCandidatos(municipio.cargos['DEPUTADO FEDERAL']);
        const topEstadual = filtrarEProcessarCandidatos(municipio.cargos['DEPUTADO ESTADUAL']);

        const cargoFiltro = document.getElementById('ranking-cargo-filtro')?.value;

        if (!cargoFiltro || cargoFiltro === 'DEPUTADO FEDERAL') {
            html += renderizarTabelaCargo('Deputado Federal', topFederal);
        }
        if (!cargoFiltro || cargoFiltro === 'DEPUTADO ESTADUAL') {
            html += renderizarTabelaCargo('Deputado Estadual', topEstadual);
        }

        html += `</div>`;
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function filtrarEProcessarCandidatos(candidatos) {
    if (!candidatos) return [];

    // 1. Filtrar excluídos (exclusão explicita)
    let filtrados = candidatos.filter(c => !excludedCandidates.has(c.id));

    // 2. Filtrar Selecionados (inclusão explicita)
    // Se houver algum candidato selecionado na lista, mostramos APENAS eles.
    // Se a lista estiver vazia (padrão), mostramos todos.
    if (selectedCandidates.size > 0) {
        filtrados = filtrados.filter(c => selectedCandidates.has(c.id));
    }

    // 2. Pegar top 20 (ou N conforme config) - Aplicamos o slice APÓS os filtros de seleção?
    // Se o usuário selecionou candidatos específicos, ele quer ver esses candidatos, mesmo que não sejam top 20.
    // Mas a gente só tem os dados que vieram do backend (que já limitou a Top N).
    // Então só conseguimos mostrar o que temos.
    // Se o filtro reduziu a lista, mostramos o que sobrou.

    return filtrados.slice(0, 50); // Aumentei o slice visual para caso o usuario selecione muitos
}

function renderizarTabelaCargo(titulo, candidatos) {
    if (!candidatos || candidatos.length === 0) {
        return `
            <div class="cargo-block">
                <h4>${titulo}</h4>
                <p class="empty-msg">Nenhum dado encontrado.</p>
            </div>
        `;
    }

    // Determinar quais colunas exibir
    const showPos = document.getElementById('col-pos').checked;
    const showCand = document.getElementById('col-cand').checked;
    const showPartido = document.getElementById('col-partido').checked;
    const showVotos = document.getElementById('col-votos').checked;
    const showFoto = document.getElementById('col-foto').checked;

    let headers = '';
    if (showPos) headers += `<th style="width: 50px;">Pos</th>`;
    if (showFoto) headers += `<th style="width: 50px;">Foto</th>`;
    if (showCand) headers += `<th>Candidato</th>`;
    if (showPartido) headers += `<th>Partido</th>`;
    if (showVotos) headers += `<th style="text-align: right;">Votos</th>`;
    headers += `<th style="width: 80px;"></th>`; // Actions always visible

    let rows = candidatos.map((c, index) => {
        let cells = '';
        if (showPos) cells += `<td class="rank-col">#${c.rank || index + 1}</td>`;
        if (showFoto) {
            // Check if foto is valid string and likely a filename
            const hasFoto = c.foto && typeof c.foto === 'string' && c.foto.length > 3 && c.foto !== 'null' && c.foto !== 'undefined';
            const fotoUrl = hasFoto ? `/fotos_candidatos/${c.foto}` : 'assets/img/sem-foto.png';

            // Add loading=lazy and robust onerror
            cells += `<td><img src="${fotoUrl}" loading="lazy" style="width:30px;height:30px;border-radius:4px;object-fit:cover;" onerror="this.onerror=null;this.src='assets/img/sem-foto.png'"></td>`;
        }
        if (showCand) cells += `<td class="nome-col"><strong>${c.nome_urna || c.nome}</strong></td>`;
        if (showPartido) cells += `<td class="partido-col">${c.partido}</td>`;
        if (showVotos) cells += `<td class="votos-col">${c.votos.toLocaleString('pt-BR')} votos</td>`;

        return `
        <tr>
            ${cells}
            <td class="action-col">
                <button onclick="excluirCandidato(${c.id})" class="btn-excluir-sm" title="Excluir Candidato">
                    <i class="fas fa-trash-alt"></i>
                </button>
                <a href="perfil-candidato.html?id=${c.id}" target="_blank" class="btn-perfil-sm" title="Ver Perfil">
                    <i class="fas fa-user"></i>
                </a>
            </td>
        </tr>
    `}).join('');

    return `
        <div class="cargo-block">
            <h4>${titulo}</h4>
            <table class="ranking-table">
                <thead>
                    <tr>
                        ${headers}
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>
    `;
}

// Exportar para ser acessível globalmente se carregado via script tag
window.carregarRanking = carregarRanking;

function exportarRankingExcel() {
    console.log('Iniciando exportação para Excel...');
    if (typeof XLSX === 'undefined') {
        console.error('Biblioteca XLSX não encontrada!');
        alert('Erro: Biblioteca de Excel não carregada.');
        return;
    }

    if (!rankingFilteredData || rankingFilteredData.length === 0) {
        alert('Não há dados para exportar. Carregue o ranking primeiro.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const dadosExcel = [];

    // Título das colunas
    const headers = ['Município', 'Cargo'];
    const showPos = document.getElementById('col-pos').checked;
    const showCand = document.getElementById('col-cand').checked;
    const showPartido = document.getElementById('col-partido').checked;
    const showVotos = document.getElementById('col-votos').checked;

    if (showPos) headers.push('Posição');
    if (showCand) headers.push('Candidato');
    if (showPartido) headers.push('Partido');
    if (showVotos) headers.push('Votos');

    dadosExcel.push(headers);

    const cargoFiltro = document.getElementById('ranking-cargo-filtro')?.value;

    rankingFilteredData.forEach(municipio => {
        // Função auxiliar para adicionar linha
        const addRow = (c, cargo, index) => {
            const row = [municipio.nome, cargo];
            if (showPos) row.push(c.rank || index + 1);
            if (showCand) row.push(c.nome_urna || c.nome);
            if (showPartido) row.push(c.partido);
            if (showVotos) row.push(c.votos);
            dadosExcel.push(row);
        };

        // Deputado Federal
        if (!cargoFiltro || cargoFiltro === 'DEPUTADO FEDERAL') {
            filtrarEProcessarCandidatos(municipio.cargos['DEPUTADO FEDERAL']).forEach((c, i) => addRow(c, 'Deputado Federal', i));
        }
        // Deputado Estadual
        if (!cargoFiltro || cargoFiltro === 'DEPUTADO ESTADUAL') {
            filtrarEProcessarCandidatos(municipio.cargos['DEPUTADO ESTADUAL']).forEach((c, i) => addRow(c, 'Deputado Estadual', i));
        }
    });

    const ws = XLSX.utils.aoa_to_sheet(dadosExcel);

    // Ajuste de largura das colunas (aproximado)
    const wscols = [{ wch: 30 }, { wch: 20 }];
    if (showPos) wscols.push({ wch: 10 });
    if (showCand) wscols.push({ wch: 40 });
    if (showPartido) wscols.push({ wch: 15 });
    if (showVotos) wscols.push({ wch: 15 });

    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Ranking Eleitoral");

    // Nome do arquivo com data/hora
    const dataHora = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "_");
    XLSX.writeFile(wb, `Ranking_Eleitoral_${dataHora}.xlsx`);
}

// ============== NOVAS FUNCIONALIDADES DE FILTRO E COLUNAS ==============

function toggleColumnDropdown() {
    const el = document.getElementById('column-options');
    if (el) el.classList.toggle('active');
}

function updateColumnDisplay() {
    renderizarRanking();
}

function toggleCandidateDropdown() {
    document.getElementById('candidate-options').classList.toggle('active');
}

function populateCandidateFilter() {
    // Reset selections on new data
    selectedCandidates.clear();

    // 1. Coletar todos os candidatos únicos dos dados atuais
    const uniqueCandidates = new Map();

    rankingData.forEach(m => {
        ['DEPUTADO FEDERAL', 'DEPUTADO ESTADUAL'].forEach(cargo => {
            if (m.cargos && m.cargos[cargo]) {
                m.cargos[cargo].forEach(c => {
                    if (!uniqueCandidates.has(c.id)) {
                        uniqueCandidates.set(c.id, {
                            id: c.id,
                            nome: c.nome_urna || c.nome,
                            partido: c.partido,
                            cargo: cargo
                        });
                    }
                });
            }
        });
    });

    allCandidatesList = Array.from(uniqueCandidates.values());
    // Ordenar por nome
    allCandidatesList.sort((a, b) => a.nome.localeCompare(b.nome));

    renderCandidateOptions(allCandidatesList);
}

function renderCandidateOptions(lista) {
    const container = document.getElementById('candidate-checkboxes');
    container.innerHTML = '';

    // Opção "Selecionar Todos / Nenhum"
    // Na verdade, se nenhum selecionado = todos.
    // Vamos adicionar um botão "Limpar Seleção" se houver selecionados?
    // Ou apenas iterar a lista.

    lista.forEach(c => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        // Se já estava selecionado antes, manter checked
        const isChecked = selectedCandidates.has(c.id) ? 'checked' : '';

        div.innerHTML = `
            <input type="checkbox" id="cand-filter-${c.id}" value="${c.id}" ${isChecked} onchange="updateCandidateFilter(this)">
            <label for="cand-filter-${c.id}">
                <span class="cand-name">${c.nome}</span>
                <span class="cand-info">(${c.partido} - ${c.cargo === 'DEPUTADO ESTADUAL' ? 'Est.' : 'Fed.'})</span>
            </label>
        `;
        container.appendChild(div);
    });

    updateCandidateSelectedText();
}

function filterCandidateOptions() {
    const term = document.getElementById('candidate-search-input').value.toLowerCase();
    const filtered = allCandidatesList.filter(c =>
        c.nome.toLowerCase().includes(term) ||
        c.partido.toLowerCase().includes(term)
    );
    renderCandidateOptions(filtered);
}

function updateCandidateFilter(checkbox) {
    const id = parseInt(checkbox.value);
    if (checkbox.checked) {
        selectedCandidates.add(id);
    } else {
        selectedCandidates.delete(id);
    }
    updateCandidateSelectedText();
    aplicarFiltoseRenderizar();
}

function updateCandidateSelectedText() {
    const textSpan = document.getElementById('candidate-selected-text');
    if (selectedCandidates.size === 0) {
        textSpan.textContent = "Todos os Candidatos";
    } else {
        textSpan.textContent = `${selectedCandidates.size} Selecionado(s)`;
    }
}
// GLOBAL EXPORTS
window.toggleColumnDropdown = toggleColumnDropdown;
window.updateColumnDisplay = updateColumnDisplay;
window.toggleCandidateDropdown = toggleCandidateDropdown;
window.filterCandidateOptions = filterCandidateOptions;
window.updateCandidateFilter = updateCandidateFilter;


// Exportar para ser acessível globalmente
window.carregarRanking = carregarRanking;
window.excluirCandidato = excluirCandidato;
window.exportarRankingExcel = exportarRankingExcel;
