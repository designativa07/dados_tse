// Variáveis globais para o ranking
let rankingCurrentPage = 1;
const rankingItemsPerPage = 50;
let rankingData = [];
let rankingFilteredData = [];
// Conjunto para armazenar IDs dos candidatos excluídos
let excludedCandidates = new Set();

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
});

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
    const municipioInput = document.getElementById('ranking-busca-municipio');

    if (!eleicaoSelect.value) {
        alert('Por favor, selecione uma eleição.');
        return;
    }

    container.innerHTML = '';
    loading.style.display = 'block';

    try {
        // Buscamos 35 para ter margem de exclusão (buffer)
        let url = `/api/ranking/top-candidatos?eleicao_id=${eleicaoSelect.value}&limit=35`;

        const response = await fetch(url);
        const json = await response.json();

        if (json.success) {
            rankingData = json.data;
            // Limpar lista de excluídos ao carregar nova busca? 
            // O usuário pediu global, mas talvez queira manter durante a sessão. 
            // Vamos manter o Set global excludedCandidates sem limpar aqui.

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
    const municipioInput = document.getElementById('ranking-busca-municipio');
    rankingFilteredData = rankingData; // Inicialmente tudo

    // Filtro de texto do município se houver
    if (municipioInput && municipioInput.value.trim()) {
        const termo = municipioInput.value.trim().toLowerCase();
        rankingFilteredData = rankingData.filter(m => m.nome.toLowerCase().includes(termo));
    }

    // Ordenar municípios alfabeticamente
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
        const topFederal = filtrarEProcessarCandidatos(municipio.cargos['DEPUTADO FEDERAL']);
        const topEstadual = filtrarEProcessarCandidatos(municipio.cargos['DEPUTADO ESTADUAL']);

        html += renderizarTabelaCargo('Deputado Federal', topFederal);
        html += renderizarTabelaCargo('Deputado Estadual', topEstadual);

        html += `</div>`;
        card.innerHTML = html;
        container.appendChild(card);
    });
}

function filtrarEProcessarCandidatos(candidatos) {
    if (!candidatos) return [];
    // 1. Filtrar excluídos
    const filtrados = candidatos.filter(c => !excludedCandidates.has(c.id));
    // 2. Pegar top 20
    return filtrados.slice(0, 20);
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

    let rows = candidatos.map((c, index) => `
        <tr>
            <td class="rank-col">#${index + 1}</td>
            <td class="nome-col">
                <strong>${c.nome_urna || c.nome}</strong>
            </td>
            <td class="partido-col">${c.partido}</td>
            <td class="votos-col">${c.votos.toLocaleString('pt-BR')} votos</td>
            <td class="action-col">
                <button onclick="excluirCandidato(${c.id})" class="btn-excluir-sm" title="Excluir Candidato">
                    <i class="fas fa-trash-alt"></i>
                </button>
                <a href="perfil-candidato.html?id=${c.id}" target="_blank" class="btn-perfil-sm" title="Ver Perfil">
                    <i class="fas fa-user"></i>
                </a>
            </td>
        </tr>
    `).join('');

    return `
        <div class="cargo-block">
            <h4>${titulo}</h4>
            <table class="ranking-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">Pos</th>
                        <th>Candidato</th>
                        <th>Partido</th>
                        <th style="text-align: right;">Votos</th>
                        <th style="width: 80px;"></th>
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
    dadosExcel.push(['Município', 'Cargo', 'Posição', 'Candidato', 'Partido', 'Votos']);

    rankingFilteredData.forEach(municipio => {
        // Deputado Federal
        const federais = filtrarEProcessarCandidatos(municipio.cargos['DEPUTADO FEDERAL']);
        federais.forEach((c, index) => {
            dadosExcel.push([
                municipio.nome,
                'Deputado Federal',
                index + 1,
                c.nome_urna || c.nome,
                c.partido,
                c.votos
            ]);
        });

        // Deputado Estadual
        const estaduais = filtrarEProcessarCandidatos(municipio.cargos['DEPUTADO ESTADUAL']);
        estaduais.forEach((c, index) => {
            dadosExcel.push([
                municipio.nome,
                'Deputado Estadual',
                index + 1,
                c.nome_urna || c.nome,
                c.partido,
                c.votos
            ]);
        });
    });

    const ws = XLSX.utils.aoa_to_sheet(dadosExcel);

    // Ajuste de largura das colunas
    const wscols = [
        { wch: 30 }, // Município
        { wch: 20 }, // Cargo
        { wch: 10 }, // Posição
        { wch: 40 }, // Candidato
        { wch: 15 }, // Partido
        { wch: 15 }  // Votos
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, "Ranking Eleitoral");

    // Nome do arquivo com data/hora
    const dataHora = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "_");
    XLSX.writeFile(wb, `Ranking_Eleitoral_${dataHora}.xlsx`);
}

// Exportar para ser acessível globalmente
window.carregarRanking = carregarRanking;
window.excluirCandidato = excluirCandidato;
window.exportarRankingExcel = exportarRankingExcel;
