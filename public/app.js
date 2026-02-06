// Sistema de Análise Eleitoral TSE
// Aplicação principal com todas as funcionalidades

class SistemaEleitoral {
    constructor() {
        this.apiBase = '/api';
        this.map = null;
        this.heatmapLayer = null;
        this.circulosLayer = null;
        this.charts = {};
        this.currentEleicao = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.carregarDadosIniciais();
        this.setupUpload();
    }

    setupEventListeners() {
        // Navegação entre abas
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.mostrarTab(tab);
            });
        });


        // Event listeners para controles
        document.getElementById('tabela-eleicao')?.addEventListener('change', () => {
            this.carregarCandidatos('tabela-candidato');
        });

        // Event listener para busca de candidatos com sugestões
        document.getElementById('tabela-busca-candidato')?.addEventListener('input', (e) => {
            this.buscarCandidatosSugestoes(e.target.value);
        });

        // Event listener para fechar sugestões ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.fecharSugestoesCandidatos();
            }
        });

        document.getElementById('relatorio-eleicao')?.addEventListener('change', () => {
            this.carregarCandidatos('relatorio-candidato');
        });

        // Event listeners para aba de candidatos
        document.getElementById('candidatos-eleicao')?.addEventListener('change', () => {
            this.carregarCandidatosData();
        });

        document.getElementById('candidatos-buscar')?.addEventListener('click', () => {
            this.carregarCandidatosData();
        });

        document.getElementById('candidatos-limpar')?.addEventListener('click', () => {
            this.limparFiltrosCandidatos();
        });

        document.getElementById('candidatos-exportar')?.addEventListener('click', () => {
            this.exportarCandidatos();
        });

        // Event listeners para aba de municípios
        document.getElementById('municipios-busca')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.buscarMunicipios();
            }
        });

        // Busca automática com debounce
        document.getElementById('municipios-busca')?.addEventListener('input', (e) => {
            clearTimeout(this.buscaTimeout);
            const termo = e.target.value.trim();

            if (termo.length >= 2) {
                this.buscaTimeout = setTimeout(() => {
                    this.buscarMunicipios();
                }, 500); // Aguarda 500ms após parar de digitar
            } else if (termo.length === 0) {
                this.limparResultadosMunicipios();
            }
        });

        document.getElementById('municipios-eleicao')?.addEventListener('change', () => {
            this.buscarMunicipios();
        });

        document.getElementById('municipios-ordenar')?.addEventListener('change', () => {
            this.buscarMunicipios();
        });

        document.getElementById('municipios-ordem')?.addEventListener('change', () => {
            this.buscarMunicipios();
        });

        // Event listeners para mapa
        document.getElementById('mapa-eleicao')?.addEventListener('change', () => {
            this.carregarCandidatos('mapa-candidato');
            // Limpar mapa quando mudar eleição
            if (this.map) {
                this.limparMapa();
            }
        });

        document.getElementById('mapa-candidato')?.addEventListener('change', () => {
            // Atualizar mapa automaticamente quando mudar candidato
            if (document.getElementById('mapa-eleicao').value) {
                this.carregarMapa();
            }
        });

        document.getElementById('mapa-tipo')?.addEventListener('change', () => {
            // Atualizar mapa automaticamente quando mudar tipo
            if (document.getElementById('mapa-eleicao').value) {
                this.carregarMapa();
            }
        });
    }

    setupUpload() {
        // Configurar abas de upload
        this.setupUploadTabs();

        // Configurar upload de candidatos/votos
        this.setupUploadCandidatos();

        // Configurar upload de perfil do eleitor
        this.setupUploadPerfilEleitor();
    }

    setupUploadTabs() {
        const tabButtons = document.querySelectorAll('.upload-tab-btn');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remover classe active de todos os botões
                tabButtons.forEach(btn => btn.classList.remove('active'));

                // Adicionar classe active ao botão clicado
                button.classList.add('active');

                // Mostrar/ocultar seções correspondentes
                const uploadType = button.dataset.uploadType;
                this.showUploadSection(uploadType);
            });
        });
    }

    showUploadSection(uploadType) {
        // Ocultar todas as seções
        document.getElementById('upload-candidatos').style.display = 'none';
        document.getElementById('upload-perfil-eleitor').style.display = 'none';

        // Mostrar seção correspondente
        if (uploadType === 'candidatos') {
            document.getElementById('upload-candidatos').style.display = 'block';
        } else if (uploadType === 'perfil-eleitor') {
            document.getElementById('upload-perfil-eleitor').style.display = 'block';
        }
    }

    setupUploadCandidatos() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('csv-file');

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processarArquivo(files[0], 'candidatos');
            }
        });

        // Click to select - apenas na área, não no botão
        uploadArea.addEventListener('click', (e) => {
            // Só clica no input se não foi clicado no botão
            if (!e.target.closest('button')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.processarArquivo(e.target.files[0], 'candidatos');
            }
        });
    }

    setupUploadPerfilEleitor() {
        const uploadArea = document.getElementById('upload-area-perfil');
        const fileInput = document.getElementById('csv-file-perfil');

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.processarArquivo(files[0], 'perfil-eleitor');
            }
        });

        // Click to select - apenas na área, não no botão
        uploadArea.addEventListener('click', (e) => {
            // Só clica no input se não foi clicado no botão
            if (!e.target.closest('button')) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.processarArquivo(e.target.files[0], 'perfil-eleitor');
            }
        });
    }

    async carregarDadosIniciais() {
        try {
            console.log('🚀 Iniciando carregamento de dados iniciais...');

            // Carregar eleições primeiro (mais rápido com cache)
            await this.carregarEleicoes();

            // Carregar outros dados em paralelo
            await Promise.all([
                this.carregarEleicoesCandidatos()
            ]);

            // Carregar eleições para aba de municípios (após carregar eleições)
            this.carregarEleicoesMunicipios();

            // Selecionar automaticamente a eleição de 2022 (ID: 3)
            const eleicao2022 = window.EleicoesMock ? window.EleicoesMock.getEleicaoAtual() : null;
            if (eleicao2022) {
                console.log('🎯 Eleição 2022 carregada com sucesso');
            } else {
                console.log('⚠️ Eleição 2022 não encontrada, mostrando mensagem de seleção');
                // Se não encontrar a eleição de 2022, mostrar mensagem de seleção
                this.mostrarMensagemSelecao();
            }

            console.log('✅ Dados iniciais carregados com sucesso');
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.mostrarErro('Erro ao carregar dados iniciais');
        }
    }

    mostrarMensagemSelecao() {
        const container = document.getElementById('votos-por-cargo-container');
        if (container) {
            container.innerHTML = `
                <div class="selecao-mensagem">
                    <div class="selecao-icon">
                        <i class="fas fa-hand-pointer"></i>
                    </div>
                    <h3>Selecione uma eleição</h3>
                    <p>Escolha uma eleição no filtro acima para visualizar as estatísticas</p>
                </div>
            `;
        }

        // Limpar outras estatísticas
        document.getElementById('total-municipios').textContent = '0';
        document.getElementById('total-candidatos').textContent = '0';
        document.getElementById('total-eleicoes').textContent = '0';
    }

    async carregarEstatisticas(eleicaoId = null) {
        try {
            // Verificar cache primeiro
            let stats = null;
            if (eleicaoId && window.CacheUtils) {
                stats = window.CacheUtils.getEstatisticas(eleicaoId);
            }

            // Se não estiver no cache, buscar do servidor
            if (!stats) {
                const url = eleicaoId
                    ? `${this.apiBase}/votos/estatisticas?eleicao_id=${eleicaoId}`
                    : `${this.apiBase}/votos/estatisticas`;
                const response = await fetch(url);
                stats = await response.json();

                // Armazenar no cache
                if (eleicaoId && window.CacheUtils) {
                    window.CacheUtils.setEstatisticas(eleicaoId, stats);
                }
            }

            // Mostrar estatísticas gerais
            document.getElementById('total-municipios').textContent = stats.municipios_envolvidos || '0';
            document.getElementById('total-candidatos').textContent = stats.candidatos_envolvidos || '0';
            document.getElementById('total-eleicoes').textContent = stats.eleicoes_envolvidas || '0';

            // Carregar estatísticas por cargo
            await this.carregarEstatisticasPorCargo(eleicaoId);
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }

    async carregarEstatisticasPorCargo(eleicaoId = null) {
        try {
            const url = eleicaoId
                ? `${this.apiBase}/votos/estatisticas-por-cargo?eleicao_id=${eleicaoId}`
                : `${this.apiBase}/votos/estatisticas-por-cargo`;
            const response = await fetch(url);
            const data = await response.json();

            // Limpar container de votos por cargo
            const container = document.getElementById('votos-por-cargo-container');
            if (container) {
                container.innerHTML = '';
            } else {
                // Criar container se não existir
                const statsGrid = document.querySelector('.stats-grid');
                const newContainer = document.createElement('div');
                newContainer.id = 'votos-por-cargo-container';
                newContainer.className = 'votos-por-cargo-container';
                statsGrid.appendChild(newContainer);
            }

            // Criar cards para cada cargo (filtrando cargos específicos)
            const cargosExcluidos = ['Vice-Governador', '1º Suplente', '2º Suplente'];

            data.cargos.forEach(cargo => {
                // Pular cargos que devem ser excluídos
                if (cargosExcluidos.includes(cargo.cargo)) {
                    return;
                }

                const card = document.createElement('div');
                card.className = 'stat-card cargo-stat-card';
                card.innerHTML = `
                    <div class="stat-icon">
                        <i class="fas fa-vote-yea"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${parseInt(cargo.total_votos).toLocaleString('pt-BR')}</h3>
                        <p>${cargo.cargo}</p>
                        <small>${cargo.candidatos_envolvidos} candidatos</small>
                    </div>
                `;
                document.getElementById('votos-por-cargo-container').appendChild(card);
            });

        } catch (error) {
            console.error('Erro ao carregar estatísticas por cargo:', error);
        }
    }



    async carregarGraficosDashboard(eleicaoId = null) {
        try {
            // Se não foi especificada uma eleição, usar a eleição atual (2022)
            if (!eleicaoId) {
                const eleicaoAtual = window.EleicoesMock ? window.EleicoesMock.getEleicaoAtual() : null;
                if (eleicaoAtual) {
                    eleicaoId = eleicaoAtual.id;
                } else {
                    return;
                }
            }

            // Destruir gráficos existentes para evitar conflitos
            if (this.charts.municipios) {
                this.charts.municipios.destroy();
                this.charts.municipios = null;
            }
            if (this.charts.candidatos) {
                this.charts.candidatos.destroy();
                this.charts.candidatos = null;
            }

            // Buscar dados para gráficos
            const response = await fetch(`${this.apiBase}/visualizacao/grafico?eleicao_id=${eleicaoId}&agrupar_por=municipio&limite=10`);
            const dados = await response.json();

            // Gráfico de municípios
            const ctxMunicipios = document.getElementById('chart-municipios');
            if (ctxMunicipios && dados.dados) {
                // Configurar canvas para leitura frequente
                ctxMunicipios.willReadFrequently = true;
                this.charts.municipios = new Chart(ctxMunicipios, {
                    type: 'bar',
                    data: {
                        labels: dados.dados.map(item => item.label),
                        datasets: [{
                            label: 'Eleitores',
                            data: dados.dados.map(item => item.value),
                            backgroundColor: 'rgba(102, 126, 234, 0.8)',
                            borderColor: 'rgba(102, 126, 234, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }

            // Carregar cargos para o seletor
            await this.carregarCargosParaSeletor(eleicaoId);

            // Configurar evento do seletor de cargo
            this.configurarSeletorCargo(eleicaoId);
        } catch (error) {
            console.error('Erro ao carregar gráficos:', error);
        }
    }

    async carregarCargosParaSeletor(eleicaoId) {
        try {
            const response = await fetch(`${this.apiBase}/votos/estatisticas-por-cargo?eleicao_id=${eleicaoId}`);
            const data = await response.json();

            const select = document.getElementById('grafico-cargo');
            if (select) {
                // Limpar opções existentes (exceto a primeira)
                select.innerHTML = '<option value="">Selecione um cargo</option>';

                // Adicionar cargos
                data.cargos.forEach(cargo => {
                    const option = document.createElement('option');
                    option.value = cargo.cargo;
                    option.textContent = cargo.cargo;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar cargos para seletor:', error);
        }
    }

    configurarSeletorCargo(eleicaoId) {
        const select = document.getElementById('grafico-cargo');
        if (select) {
            // Remover event listeners existentes para evitar duplicação
            select.removeEventListener('change', this.handleCargoChange);

            // Criar nova função de handler
            this.handleCargoChange = async (e) => {
                const cargoSelecionado = e.target.value;
                if (cargoSelecionado) {
                    await this.carregarGraficoCandidatos(eleicaoId, cargoSelecionado);
                } else {
                    // Limpar gráfico se nenhum cargo selecionado
                    this.limparGraficoCandidatos();
                }
            };

            // Adicionar novo event listener
            select.addEventListener('change', this.handleCargoChange);
        }
    }

    async carregarGraficoCandidatos(eleicaoId, cargo) {
        try {
            // Destruir gráfico existente de forma mais robusta
            if (this.charts.candidatos) {
                this.charts.candidatos.destroy();
                this.charts.candidatos = null;
            }

            // Aguardar um pouco para garantir que o canvas foi liberado
            await new Promise(resolve => setTimeout(resolve, 200));

            // Buscar dados de candidatos para o cargo selecionado
            const response = await fetch(`${this.apiBase}/visualizacao/grafico?eleicao_id=${eleicaoId}&agrupar_por=candidato&cargo=${encodeURIComponent(cargo)}&limite=10`);
            const dados = await response.json();

            const ctxCandidatos = document.getElementById('chart-candidatos');
            if (ctxCandidatos && dados.dados && dados.dados.length > 0) {
                // Limpar o canvas completamente antes de criar novo gráfico
                const ctx = ctxCandidatos.getContext('2d');
                ctx.clearRect(0, 0, ctxCandidatos.width, ctxCandidatos.height);

                // Resetar o canvas para garantir que está limpo
                ctxCandidatos.width = ctxCandidatos.width;
                ctxCandidatos.willReadFrequently = true;

                const cores = [
                    '#667eea', '#f093fb', '#4facfe', '#43e97b', '#feca57',
                    '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'
                ];

                this.charts.candidatos = new Chart(ctxCandidatos, {
                    type: 'bar',
                    data: {
                        labels: dados.dados.map(item => item.label),
                        datasets: [{
                            label: 'Votos',
                            data: dados.dados.map(item => item.value),
                            backgroundColor: cores.slice(0, dados.dados.length),
                            borderColor: cores.slice(0, dados.dados.length).map(cor => cor.replace('0.8', '1')),
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    boxWidth: 12,
                                    font: {
                                        size: 10
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function (value) {
                                        return value.toLocaleString('pt-BR');
                                    }
                                }
                            },
                            x: {
                                ticks: {
                                    maxRotation: 45,
                                    minRotation: 0
                                }
                            }
                        }
                    }
                });
            } else {
                // Mostrar mensagem se não há dados
                this.mostrarMensagemSemDados(ctxCandidatos);
            }
        } catch (error) {
            console.error('Erro ao carregar gráfico de candidatos:', error);
        }
    }

    limparGraficoCandidatos() {
        if (this.charts.candidatos) {
            this.charts.candidatos.destroy();
            this.charts.candidatos = null;
        }

        // Limpar canvas completamente
        const ctxCandidatos = document.getElementById('chart-candidatos');
        if (ctxCandidatos) {
            const ctx = ctxCandidatos.getContext('2d');
            ctx.clearRect(0, 0, ctxCandidatos.width, ctxCandidatos.height);
            // Resetar o canvas para garantir limpeza completa
            ctxCandidatos.width = ctxCandidatos.width;
            this.mostrarMensagemSemDados(ctxCandidatos);
        }
    }

    mostrarMensagemSemDados(canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Selecione um cargo para visualizar os candidatos', canvas.width / 2, canvas.height / 2);
    }

    async carregarEleicoes() {
        try {
            console.log('🔄 Iniciando carregamento de eleições...');
            // Buscar eleições usando endpoint otimizado para dropdown
            const response = await fetch(`${this.apiBase}/eleicoes/dropdown`);
            let eleicoes = [];

            if (response.ok) {
                const result = await response.json();
                eleicoes = result.data || result; // Suportar tanto formato com .data quanto direto
                console.log('✅ Eleições carregadas da base de dados:', eleicoes);
                console.log(`📊 Total de eleições encontradas: ${eleicoes.length}`);
                console.log(`💾 Cache usado: ${result.cached ? 'Sim' : 'Não'}`);
            } else {
                // Fallback para dados mockados se a API falhar
                eleicoes = window.EleicoesMock ? window.EleicoesMock.getEleicoes() : [];
                console.log('⚠️ Usando dados mockados como fallback');
            }

            const selectors = ['dashboard-eleicao', 'tabela-eleicao', 'mapa-eleicao', 'relatorio-eleicao', 'regionais-eleicao', 'candidatos-eleicao', 'ranking-eleicao'];

            selectors.forEach(selectorId => {
                const select = document.getElementById(selectorId);
                if (select) {
                    console.log(`📝 Populando seletor: ${selectorId}`);
                    const placeholder = '<option value="">Selecione uma eleição</option>';
                    select.innerHTML = placeholder;
                    eleicoes.forEach(eleicao => {
                        const option = document.createElement('option');
                        option.value = eleicao.id;
                        option.textContent = eleicao.descricao || `${eleicao.ano} - ${eleicao.tipo} (${eleicao.turno}° Turno)`;
                        select.appendChild(option);
                        console.log(`   ➕ Adicionada: ${option.textContent} (ID: ${eleicao.id})`);
                    });
                    console.log(`✅ Seletor ${selectorId} populado com ${eleicoes.length} eleições`);
                } else {
                    console.log(`❌ Seletor não encontrado: ${selectorId}`);
                }
            });

            console.log('✅ Eleições carregadas com sucesso');
        } catch (error) {
            console.error('Erro ao carregar eleições:', error);
            // Em caso de erro, tentar usar dados mockados
            try {
                const eleicoes = window.EleicoesMock ? window.EleicoesMock.getEleicoes() : [];
                const selectors = ['dashboard-eleicao', 'tabela-eleicao', 'mapa-eleicao', 'relatorio-eleicao', 'regionais-eleicao', 'candidatos-eleicao', 'ranking-eleicao'];

                selectors.forEach(selectorId => {
                    const select = document.getElementById(selectorId);
                    if (select && eleicoes.length > 0) {
                        const placeholder = '<option value="">Selecione uma eleição</option>';
                        select.innerHTML = placeholder;
                        eleicoes.forEach(eleicao => {
                            const option = document.createElement('option');
                            option.value = eleicao.id;
                            option.textContent = eleicao.descricao;
                            select.appendChild(option);
                        });
                    }
                });
                console.log('⚠️ Usando dados mockados devido a erro na API');
            } catch (mockError) {
                console.error('Erro ao usar dados mockados:', mockError);
            }
        }
    }

    async carregarCandidatos(selectId) {
        const eleicaoSelect = document.getElementById(selectId.replace('candidato', 'eleicao'));
        const candidatoSelect = document.getElementById(selectId);
        const searchInput = document.getElementById(selectId + '-search');

        if (!eleicaoSelect || !candidatoSelect) return;

        const eleicaoId = eleicaoSelect.value;
        if (!eleicaoId) {
            candidatoSelect.innerHTML = '<option value="">Selecione um candidato</option>';
            if (searchInput) searchInput.value = '';
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/votos/agregados?eleicao_id=${eleicaoId}&agrupar_por=candidato`);
            const data = await response.json();

            // Ordenar candidatos alfabeticamente
            const candidatosOrdenados = data.data.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

            // Armazenar todos os candidatos para busca
            this.todosCandidatos = candidatosOrdenados;

            this.renderizarCandidatos(candidatosOrdenados, selectId);

            // Configurar busca se o input existir
            if (searchInput) {
                this.configurarBuscaCandidatos(selectId);
            }
        } catch (error) {
            console.error('Erro ao carregar candidatos:', error);
        }
    }

    renderizarCandidatos(candidatos, selectId) {
        const candidatoSelect = document.getElementById(selectId);
        candidatoSelect.innerHTML = '<option value="">Todos os candidatos</option>';

        candidatos.forEach(candidato => {
            const option = document.createElement('option');
            option.value = candidato.id;
            option.textContent = `${candidato.nome} (${parseInt(candidato.total_votos).toLocaleString('pt-BR')} votos)`;
            candidatoSelect.appendChild(option);
        });
    }

    configurarBuscaCandidatos(selectId) {
        const searchInput = document.getElementById(selectId + '-search');
        const candidatoSelect = document.getElementById(selectId);

        if (!searchInput || !candidatoSelect) return;

        searchInput.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase().trim();

            if (termo === '') {
                // Mostrar todos os candidatos
                this.renderizarCandidatos(this.todosCandidatos, selectId);
            } else {
                // Filtrar candidatos pelo termo de busca
                const candidatosFiltrados = this.todosCandidatos.filter(candidato =>
                    candidato.nome.toLowerCase().includes(termo)
                );
                this.renderizarCandidatos(candidatosFiltrados, selectId);
            }
        });

        // Limpar busca quando mudar eleição
        const eleicaoSelect = document.getElementById(selectId.replace('candidato', 'eleicao'));
        if (eleicaoSelect) {
            eleicaoSelect.addEventListener('change', () => {
                searchInput.value = '';
            });
        }
    }

    mostrarTab(tabName) {
        // Esconder todas as abas
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remover active de todos os botões
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Mostrar aba selecionada
        document.getElementById(tabName).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Carregar dados específicos da aba
        if (tabName === 'mapas' && !this.map) {
            this.inicializarMapa();
        } else if (tabName === 'candidatos') {
            this.carregarEleicoesCandidatos();
        } else if (tabName === 'regionais') {
            this.carregarDadosRegionais();
        }
    }

    processarArquivo(file, uploadType = 'candidatos') {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.mostrarErro('Por favor, selecione um arquivo CSV válido.');
            return;
        }

        // Processar automaticamente sem formulário
        this.processarUploadAutomatico(file, uploadType);
    }

    async processarUploadAutomatico(file, uploadType = 'candidatos') {
        // Mostrar barra de progresso
        const progressContainer = uploadType === 'perfil-eleitor' ? 'progress-container-perfil' : 'progress-container';
        this.showProgress(0, 0, 'Iniciando processamento...', progressContainer);

        try {
            const formData = new FormData();
            formData.append('csv', file);
            formData.append('uploadType', uploadType);

            // Usar rota específica baseada no tipo
            const endpoint = uploadType === 'perfil-eleitor' ? '/upload/perfil-eleitor' : '/upload/csv-progress';
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Erro na requisição');
            }

            // Processar Server-Sent Events
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.error) {
                                throw new Error(data.error);
                            }

                            if (data.success) {
                                // Processamento concluído
                                this.hideProgress(progressContainer);
                                this.mostrarResultadoUpload(data, 'otimizada', uploadType);
                                await this.carregarDadosIniciais(); // Recarregar dados
                                return;
                            }

                            // Atualizar progresso
                            if (data.current !== undefined && data.total !== undefined) {
                                this.showProgress(data.current, data.total, data.text, progressContainer);
                            }
                        } catch (parseError) {
                            console.error('Erro ao processar dados SSE:', parseError);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Erro no upload:', error);
            this.hideProgress();
            this.mostrarErro('Erro ao processar arquivo: ' + error.message);
        }
    }

    // Mostrar barra de progresso
    showProgress(current, total, text = 'Processando...', containerId = 'progress-container') {
        const container = document.getElementById(containerId);
        const progressFill = document.getElementById(containerId.replace('container', 'fill'));
        const progressText = document.getElementById(containerId.replace('container', 'text'));
        const progressPercentage = document.getElementById(containerId.replace('container', 'percentage'));
        const progressCurrent = document.getElementById(containerId.replace('container', 'current'));
        const progressTotal = document.getElementById(containerId.replace('container', 'total'));

        container.style.display = 'block';
        progressText.textContent = text;
        progressCurrent.textContent = current.toLocaleString();
        progressTotal.textContent = total.toLocaleString();

        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        progressPercentage.textContent = `${percentage}%`;
        progressFill.style.width = `${percentage}%`;
    }

    // Esconder barra de progresso
    hideProgress(containerId = 'progress-container') {
        const container = document.getElementById(containerId);
        container.style.display = 'none';
    }

    async processarUpload() {
        const fileInput = document.getElementById('csv-file');
        const file = fileInput.files[0];

        if (!file) {
            this.mostrarErro('Por favor, selecione um arquivo.');
            return;
        }

        // Validar dados da eleição
        const eleicaoData = {
            ano: parseInt(document.getElementById('eleicao-ano').value),
            tipo: document.getElementById('eleicao-tipo').value,
            descricao: document.getElementById('eleicao-descricao').value,
            turno: parseInt(document.getElementById('eleicao-turno').value)
        };

        if (!eleicaoData.ano || !eleicaoData.tipo) {
            this.mostrarErro('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        const tipoImportacao = document.getElementById('tipo-importacao').value;

        // Mostrar barra de progresso
        this.showProgress(0, 0, 'Iniciando processamento...');

        try {
            const formData = new FormData();
            formData.append('csv', file);
            formData.append('eleicao', JSON.stringify(eleicaoData));

            // Usar a nova rota com progresso em tempo real
            const response = await fetch(`${this.apiBase}/upload/csv-progress`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Erro na requisição');
            }

            // Processar Server-Sent Events
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.error) {
                                throw new Error(data.error);
                            }

                            if (data.success) {
                                // Processamento concluído
                                this.hideProgress();
                                this.mostrarResultadoUpload(data, tipoImportacao);
                                await this.carregarDadosIniciais(); // Recarregar dados
                                return;
                            }

                            // Atualizar progresso
                            if (data.current !== undefined && data.total !== undefined) {
                                this.showProgress(data.current, data.total, data.text);
                            }
                        } catch (parseError) {
                            console.error('Erro ao processar dados SSE:', parseError);
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Erro no upload:', error);
            this.hideProgress();
            this.mostrarErro('Erro ao processar arquivo: ' + error.message);
        }
    }

    mostrarResultadoUpload(result, tipoImportacao = 'normal', uploadType = 'candidatos') {
        const progressElement = uploadType === 'perfil-eleitor' ? 'upload-progress-perfil' : 'upload-progress';
        const resultElement = uploadType === 'perfil-eleitor' ? 'upload-result-perfil' : 'upload-result';
        const statsElement = uploadType === 'perfil-eleitor' ? 'result-stats-perfil' : 'result-stats';

        document.getElementById(progressElement).style.display = 'none';

        // Adaptar para diferentes formatos de resposta
        const stats = result.stats || result.estatisticas;
        let statsHtml = '';

        if (uploadType === 'perfil-eleitor') {
            statsHtml = `
                <div class="result-stats">
                    <div class="result-stat">
                        <h4>${stats.total_linhas || stats.linhas_processadas || 0}</h4>
                        <p>Linhas Processadas</p>
                    </div>
                    <div class="result-stat">
                        <h4>${stats.registros_validos || stats.perfil_inseridos || 0}</h4>
                        <p>Registros de Perfil</p>
                    </div>
                    <div class="result-stat">
                        <h4>${stats.municipios_encontrados || 0}</h4>
                        <p>Municípios Encontrados</p>
                    </div>
                    <div class="result-stat">
                        <h4>${stats.registros_ignorados || 0}</h4>
                        <p>Registros Ignorados</p>
                    </div>
                </div>
                <div class="result-info">
                    <p><strong>Tipo:</strong> Importação de Perfil do Eleitor</p>
                    <p><strong>Performance:</strong> Processamento otimizado com streaming</p>
                </div>
            `;
        } else {
            statsHtml = `
                <div class="result-stats">
                    <div class="result-stat">
                        <h4>${stats.total_linhas || stats.linhas_processadas || 0}</h4>
                        <p>Linhas Processadas</p>
                    </div>
                    <div class="result-stat">
                        <h4>${stats.registros_validos || stats.votos_inseridos || 0}</h4>
                        <p>Registros Válidos</p>
                    </div>
                    <div class="result-stat">
                        <h4>${stats.votos_inseridos || 0}</h4>
                        <p>Votos Inseridos</p>
                    </div>
                    <div class="result-stat">
                        <h4>${stats.candidatos_criados || 0}</h4>
                        <p>Candidatos Criados</p>
                    </div>
                    <div class="result-stat">
                        <h4>${stats.municipios_encontrados || 0}</h4>
                        <p>Municípios Encontrados</p>
                    </div>
                    ${tipoImportacao === 'otimizada' ? `
                    <div class="result-stat">
                        <h4>${stats.erros || 0}</h4>
                        <p>Erros</p>
                    </div>
                    ` : ''}
                </div>
                ${tipoImportacao === 'otimizada' ? `
                <div class="result-info">
                    <p><strong>Tipo:</strong> Importação Otimizada</p>
                    <p><strong>Performance:</strong> Processamento em lotes de 2000 registros</p>
                </div>
                ` : ''}
            `;
        }

        document.getElementById(statsElement).innerHTML = statsHtml;
        document.getElementById(resultElement).style.display = 'block';
    }

    cancelarUpload() {
        document.getElementById('upload-form').style.display = 'none';
        document.getElementById('upload-area').style.display = 'block';
        document.getElementById('upload-progress').style.display = 'none';
        document.getElementById('upload-result').style.display = 'none';
        document.getElementById('csv-file').value = '';
    }

    async baixarTemplate() {
        try {
            const response = await fetch(`${this.apiBase}/upload/template`);
            const blob = await response.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'template_tse.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Erro ao baixar template:', error);
            this.mostrarErro('Erro ao baixar template');
        }
    }

    async limparBaseDados() {
        // Confirmação antes de executar
        const confirmacao = confirm(
            '⚠️ ATENÇÃO: Esta ação irá remover TODOS os dados da base!\n\n' +
            'Isso inclui:\n' +
            '• Todos os votos\n' +
            '• Todos os candidatos\n' +
            '• Todos os municípios\n' +
            '• Todas as eleições\n' +
            '• Todos os relatórios\n\n' +
            'Esta ação NÃO pode ser desfeita!\n\n' +
            'Tem certeza que deseja continuar?'
        );

        if (!confirmacao) {
            return;
        }

        const btnLimpar = document.getElementById('btn-limpar-dados');
        const textoOriginal = btnLimpar.innerHTML;

        try {
            // Desabilitar botão e mostrar loading
            btnLimpar.disabled = true;
            btnLimpar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Limpando...';

            const response = await fetch(`${this.apiBase}/limpar-base-dados`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (response.ok && result.success) {
                this.mostrarSucesso('Base de dados limpa com sucesso!');

                // Mostrar estatísticas da limpeza
                const stats = result.registros_removidos;
                const mensagemDetalhada = `
                    Limpeza concluída!\n\n
                    Registros removidos:\n
                    • ${stats.votos.toLocaleString('pt-BR')} votos\n
                    • ${stats.candidatos.toLocaleString('pt-BR')} candidatos\n
                    • ${stats.municipios.toLocaleString('pt-BR')} municípios\n
                    • ${stats.eleicoes.toLocaleString('pt-BR')} eleições\n
                    • ${stats.relatorios.toLocaleString('pt-BR')} relatórios\n\n
                    A base de dados está pronta para novos dados!
                `;

                alert(mensagemDetalhada);

                // Recarregar dados iniciais para atualizar o dashboard
                await this.carregarDadosIniciais();

            } else {
                throw new Error(result.error || 'Erro ao limpar base de dados');
            }
        } catch (error) {
            console.error('Erro ao limpar base de dados:', error);
            this.mostrarErro('Erro ao limpar base de dados: ' + error.message);
        } finally {
            // Reabilitar botão
            btnLimpar.disabled = false;
            btnLimpar.innerHTML = textoOriginal;
        }
    }

    async carregarTabela() {
        const eleicaoId = document.getElementById('tabela-eleicao').value;
        if (!eleicaoId) {
            this.mostrarErro('Por favor, selecione uma eleição.');
            return;
        }

        const colunas = Array.from(document.getElementById('tabela-colunas').selectedOptions)
            .map(option => option.value);

        if (colunas.length === 0) {
            this.mostrarErro('Por favor, selecione pelo menos uma coluna.');
            return;
        }

        // Coletar todos os filtros
        const filtros = {
            eleicao_id: eleicaoId,
            agrupar_por: document.getElementById('tabela-agrupar').value,
            cargo: document.getElementById('tabela-cargo').value,
            zona: document.getElementById('tabela-zona').value,
            secao: document.getElementById('tabela-secao').value,
            busca_candidato: document.getElementById('tabela-busca-candidato').value,
            busca_municipio: document.getElementById('tabela-busca-municipio').value,
            busca_numero: document.getElementById('tabela-busca-numero').value,
            ordenar_por: document.getElementById('tabela-ordenar').value,
            ordem: document.getElementById('tabela-ordem').value,
            limite: document.getElementById('tabela-limite').value
        };

        // Remover filtros vazios
        Object.keys(filtros).forEach(key => {
            if (!filtros[key] || filtros[key] === '') {
                delete filtros[key];
            }
        });

        try {
            const params = new URLSearchParams(filtros);
            const response = await fetch(`${this.apiBase}/votos/tabela-agrupada?${params}`);
            const data = await response.json();

            this.renderizarTabela(data.data, colunas, filtros.agrupar_por);
            this.renderizarPaginacao({ total: data.total_registros, page: 1, pages: 1 });

            // Mostrar botões de exportação se houver dados
            if (data.data && data.data.length > 0) {
                document.getElementById('export-actions').style.display = 'block';
            } else {
                document.getElementById('export-actions').style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao carregar tabela:', error);
            this.mostrarErro('Erro ao carregar dados da tabela');
        }
    }

    limparFiltrosTabela() {
        // Limpar todos os campos de filtro
        document.getElementById('tabela-eleicao').value = '';
        document.getElementById('tabela-agrupar').value = 'candidato';
        document.getElementById('tabela-cargo').value = '';
        document.getElementById('tabela-zona').value = '';
        document.getElementById('tabela-secao').value = '';
        document.getElementById('tabela-busca-candidato').value = '';
        document.getElementById('tabela-busca-municipio').value = '';
        document.getElementById('tabela-busca-numero').value = '';
        document.getElementById('tabela-ordenar').value = 'votos';
        document.getElementById('tabela-ordem').value = 'DESC';
        document.getElementById('tabela-limite').value = '100';

        // Limpar seleção de colunas
        const colunasSelect = document.getElementById('tabela-colunas');
        Array.from(colunasSelect.options).forEach(option => {
            option.selected = false;
        });

        // Selecionar colunas padrão
        const colunasPadrao = ['municipio', 'candidato', 'votos', 'cargo'];
        colunasPadrao.forEach(valor => {
            const option = colunasSelect.querySelector(`option[value="${valor}"]`);
            if (option) option.selected = true;
        });

        // Limpar tabela
        document.getElementById('tabela-header').innerHTML = '';
        document.getElementById('tabela-body').innerHTML = '';
        document.getElementById('tabela-pagination').innerHTML = '';

        // Esconder botões de exportação
        document.getElementById('export-actions').style.display = 'none';

        this.mostrarSucesso('Filtros limpos com sucesso!');
    }

    renderizarTabela(data, colunas, agruparPor = 'nenhum') {
        const thead = document.getElementById('tabela-header');
        const tbody = document.getElementById('tabela-body');
        const pagination = document.getElementById('tabela-pagination');

        if (!thead || !tbody || !pagination) {
            console.error('Elementos da tabela não encontrados!');
            return;
        }

        // Mapear colunas selecionadas para campos do banco
        const mapeamentoColunas = {
            'municipio': 'municipio_nome',
            'candidato': 'candidato_nome',
            'cargo': 'cargo',
            'numero': 'candidato_numero',
            'partido': 'candidato_partido',
            'votos': agruparPor === 'nenhum' ? 'quantidade_votos' : 'total_votos',
            'zona': 'zona',
            'secao': 'secao',
            'local': 'local_votacao',
            'endereco': 'endereco',
            'eleicao': 'eleicao_ano',
            'turno': 'eleicao_turno'
        };

        // Determinar colunas para exibir baseado no agrupamento
        let colunasParaExibir = colunas;
        if (agruparPor === 'candidato') {
            // Para agrupamento por candidato, mostrar campos específicos
            colunasParaExibir = colunas.map(col => {
                if (col === 'votos') return 'total_votos';
                if (col === 'municipio') return 'municipio_nome';
                return mapeamentoColunas[col] || col;
            });
        } else if (agruparPor === 'municipio') {
            colunasParaExibir = colunas.map(col => {
                if (col === 'votos') return 'total_votos';
                if (col === 'candidato') return 'candidatos_envolvidos';
                return mapeamentoColunas[col] || col;
            });
        } else if (agruparPor === 'cargo') {
            colunasParaExibir = colunas.map(col => {
                if (col === 'votos') return 'total_votos';
                if (col === 'candidato') return 'candidatos_envolvidos';
                if (col === 'municipio') return 'municipios_envolvidos';
                return mapeamentoColunas[col] || col;
            });
        } else if (agruparPor === 'partido') {
            colunasParaExibir = colunas.map(col => {
                if (col === 'votos') return 'total_votos';
                if (col === 'candidato') return 'candidatos_envolvidos';
                if (col === 'municipio') return 'municipios_envolvidos';
                return mapeamentoColunas[col] || col;
            });
        } else if (agruparPor === 'zona') {
            colunasParaExibir = colunas.map(col => {
                if (col === 'votos') return 'total_votos';
                if (col === 'candidato') return 'candidatos_envolvidos';
                if (col === 'municipio') return 'municipios_envolvidos';
                return mapeamentoColunas[col] || col;
            });
        } else {
            // Dados detalhados - usar mapeamento direto
            colunasParaExibir = colunas.map(col => mapeamentoColunas[col] || col);
        }

        // Cabeçalho
        thead.innerHTML = `
            <tr>
                ${colunas.map(col => `<th>${this.formatarNomeColuna(col)}</th>`).join('')}
            </tr>
        `;

        // Corpo
        tbody.innerHTML = data.map(row => `
            <tr>
                ${colunas.map(col => {
            const campo = colunasParaExibir[colunas.indexOf(col)];
            let rawValue = row[campo];

            // Tratamento para colunas irrelevantes no agrupamento
            if (agruparPor === 'candidato' && ['municipio', 'zona', 'secao', 'local', 'endereco'].includes(col)) {
                return `<td class="text-muted text-center" title="Dados agrupados por candidato">-</td>`;
            }
            if (agruparPor === 'municipio' && ['candidato', 'numero', 'partido', 'cargo', 'zona', 'secao', 'local', 'endereco'].includes(col)) {
                if (col === 'candidato') return `<td class="text-muted text-center">${row.candidatos_envolvidos || 0} envolvidos</td>`;
                if (col === 'cargo') return `<td class="text-muted text-center">Vários</td>`;
                return `<td class="text-muted text-center" title="Dados agrupados por município">-</td>`;
            }
            if (agruparPor === 'cargo' && ['candidato', 'numero', 'partido', 'municipio', 'zona', 'secao'].includes(col)) {
                if (col === 'candidato') return `<td class="text-muted text-center">${row.candidatos_envolvidos || 0} envolvidos</td>`;
                if (col === 'municipio') return `<td class="text-muted text-center">${row.municipios_envolvidos || 0} envolvidos</td>`;
                return `<td class="text-muted text-center">-</td>`;
            }

            const valor = this.formatarValor(rawValue, col);

            // Se for coluna de candidato e tiver ID, criar link
            if (col === 'candidato' && row.candidato_id) {
                return `<td><a href="perfil-candidato.html?id=${row.candidato_id}" class="candidato-link">${valor}</a></td>`;
            }

            return `<td>${valor}</td>`;
        }).join('')}
            </tr>
        `).join('');

        // Paginação
        pagination.innerHTML = `
            <div class="pagination-info">
                Mostrando ${data.length} registros
            </div>
        `;
    }

    async carregarTabelaPagina(pagina) {
        // Implementar paginação se necessário
    }

    // Função para buscar candidatos com sugestões
    async buscarCandidatosSugestoes(termo) {
        const suggestionsDropdown = document.getElementById('candidato-suggestions');

        if (!termo || termo.length < 2) {
            this.fecharSugestoesCandidatos();
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/candidatos/busca?q=${encodeURIComponent(termo)}&limite=10`);
            const data = await response.json();

            this.exibirSugestoesCandidatos(data.candidatos);
        } catch (error) {
            console.error('Erro ao buscar candidatos:', error);
            this.fecharSugestoesCandidatos();
        }
    }

    // Função para exibir sugestões de candidatos
    exibirSugestoesCandidatos(candidatos) {
        const suggestionsDropdown = document.getElementById('candidato-suggestions');

        if (!candidatos || candidatos.length === 0) {
            suggestionsDropdown.innerHTML = '<div class="no-suggestions">Nenhum candidato encontrado</div>';
            suggestionsDropdown.style.display = 'block';
            return;
        }

        const html = candidatos.map(candidato => `
            <div class="suggestion-item" onclick="this.selecionarCandidato('${candidato.nome}', ${candidato.id})">
                <div class="suggestion-name">${candidato.nome}</div>
                <div class="suggestion-details">
                    <span>Cargo: ${candidato.cargo || 'N/A'}</span>
                    <span>Número: ${candidato.numero || 'N/A'}</span>
                    <span>Partido: ${candidato.partido || 'N/A'}</span>
                </div>
            </div>
        `).join('');

        suggestionsDropdown.innerHTML = html;
        suggestionsDropdown.style.display = 'block';

        // Adicionar função de seleção aos itens
        suggestionsDropdown.querySelectorAll('.suggestion-item').forEach(item => {
            item.selecionarCandidato = (nome, id) => {
                document.getElementById('tabela-busca-candidato').value = nome;
                this.fecharSugestoesCandidatos();
            };
        });
    }

    // Função para fechar sugestões de candidatos
    fecharSugestoesCandidatos() {
        const suggestionsDropdown = document.getElementById('candidato-suggestions');
        if (suggestionsDropdown) {
            suggestionsDropdown.style.display = 'none';
        }
    }

    renderizarPaginacao(paginacao) {
        const pagination = document.getElementById('tabela-pagination');
        if (!pagination) return;

        // Se não há paginação necessária, mostrar apenas info
        if (paginacao.pages <= 1) {
            pagination.innerHTML = `
                <div class="pagination-info">
                    Mostrando ${paginacao.total} registros
                </div>
            `;
            return;
        }

        // Implementar paginação completa se necessário
        let paginacaoHtml = '<div class="pagination-controls">';

        // Botão anterior
        if (paginacao.page > 1) {
            paginacaoHtml += `<button class="btn btn-sm" onclick="sistema.carregarTabelaPagina(${paginacao.page - 1})">Anterior</button>`;
        }

        // Números das páginas
        for (let i = 1; i <= paginacao.pages; i++) {
            const active = i === paginacao.page ? 'active' : '';
            paginacaoHtml += `<button class="btn btn-sm ${active}" onclick="sistema.carregarTabelaPagina(${i})">${i}</button>`;
        }

        // Botão próximo
        if (paginacao.page < paginacao.pages) {
            paginacaoHtml += `<button class="btn btn-sm" onclick="sistema.carregarTabelaPagina(${paginacao.page + 1})">Próximo</button>`;
        }

        paginacaoHtml += '</div>';
        paginacaoHtml += `<div class="pagination-info">Página ${paginacao.page} de ${paginacao.pages} (${paginacao.total} registros)</div>`;

        pagination.innerHTML = paginacaoHtml;
    }

    async carregarMapa() {
        const eleicaoId = document.getElementById('mapa-eleicao').value;
        if (!eleicaoId) {
            this.mostrarErro('Por favor, selecione uma eleição.');
            return;
        }

        const candidatoId = document.getElementById('mapa-candidato').value;
        const tipo = document.getElementById('mapa-tipo').value;

        try {
            const params = new URLSearchParams({
                eleicao_id: eleicaoId,
                candidato_id: candidatoId,
                tipo: tipo
            });

            const response = await fetch(`${this.apiBase}/visualizacao/mapa?${params}`);
            const data = await response.json();
            this.renderizarMapa(data);
        } catch (error) {
            console.error('Erro ao carregar mapa:', error);
            this.mostrarErro('Erro ao carregar dados do mapa');
        }
    }

    inicializarMapa() {
        if (this.map) return;

        this.map = L.map('mapa').setView([-27.2423, -50.2189], 7);

        // Sistema de fallback com múltiplos provedores de mapas
        this.configurarProvedoresMapa();
    }

    configurarProvedoresMapa() {
        // Lista de provedores com fallback
        const provedores = [
            {
                nome: 'CartoDB Positron',
                url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
                opcoes: {
                    attribution: '© OpenStreetMap contributors © CARTO',
                    subdomains: 'abcd',
                    maxZoom: 20
                }
            },
            {
                nome: 'OpenStreetMap',
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                opcoes: {
                    attribution: '© OpenStreetMap contributors',
                    subdomains: ['a', 'b', 'c'],
                    maxZoom: 19
                }
            },
            {
                nome: 'CartoDB Dark Matter',
                url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
                opcoes: {
                    attribution: '© OpenStreetMap contributors © CARTO',
                    subdomains: 'abcd',
                    maxZoom: 20
                }
            }
        ];

        // Criar layers para cada provedor
        this.layers = {};
        provedores.forEach(provedor => {
            this.layers[provedor.nome] = L.tileLayer(provedor.url, provedor.opcoes);
        });

        // Adicionar controle de layers
        const controleLayers = L.control.layers(null, this.layers, {
            position: 'topright',
            collapsed: false
        }).addTo(this.map);

        // Tentar carregar o primeiro provedor (CartoDB Positron)
        this.tentarCarregarProvedor('CartoDB Positron');
    }

    tentarCarregarProvedor(nomeProvedor) {
        const layer = this.layers[nomeProvedor];
        if (!layer) return;

        // Mostrar status de carregamento
        this.mostrarStatusMapa('carregando', `Carregando ${nomeProvedor}...`);

        // Adicionar o layer ao mapa
        layer.addTo(this.map);

        let tilesCarregados = 0;
        let tilesComErro = 0;
        const totalTilesEsperados = 4; // Aproximadamente 4 tiles para o zoom inicial

        // Configurar timeout para detectar falhas
        const timeout = setTimeout(() => {
            if (this.map && this.map.hasLayer(layer)) {
                // Se o layer ainda estiver carregando após 15 segundos, tentar próximo
                this.mostrarStatusMapa('erro', `Timeout ao carregar ${nomeProvedor}`);
                this.tentarProximoProvedor(nomeProvedor);
            }
        }, 15000);

        // Contar tiles carregados com sucesso
        layer.on('tileload', () => {
            tilesCarregados++;
            if (tilesCarregados >= totalTilesEsperados) {
                clearTimeout(timeout);
                this.mostrarStatusMapa('sucesso', `${nomeProvedor} carregado com sucesso`);
                setTimeout(() => this.esconderStatusMapa(), 2000);
            }
        });

        // Se houver erro no carregamento, tentar próximo provedor
        layer.on('tileerror', () => {
            tilesComErro++;
            if (tilesComErro >= 3) { // Se 3 ou mais tiles falharem
                clearTimeout(timeout);
                this.mostrarStatusMapa('erro', `Erro ao carregar ${nomeProvedor}`);
                this.tentarProximoProvedor(nomeProvedor);
            }
        });
    }

    tentarProximoProvedor(provedorAtual) {
        const nomesProvedores = Object.keys(this.layers);
        const indiceAtual = nomesProvedores.indexOf(provedorAtual);
        const proximoIndice = (indiceAtual + 1) % nomesProvedores.length;
        const proximoProvedor = nomesProvedores[proximoIndice];

        // Remover layer atual se estiver no mapa
        if (this.map && this.map.hasLayer(this.layers[provedorAtual])) {
            this.map.removeLayer(this.layers[provedorAtual]);
        }

        this.tentarCarregarProvedor(proximoProvedor);
    }

    mostrarStatusMapa(tipo, mensagem) {
        const statusElement = document.getElementById('mapa-status');
        if (statusElement) {
            statusElement.className = `mapa-status ${tipo}`;
            statusElement.innerHTML = `
                <i class="fas ${tipo === 'carregando' ? 'fa-spinner fa-spin' :
                    tipo === 'erro' ? 'fa-exclamation-triangle' :
                        'fa-check-circle'}"></i>
                ${mensagem}
            `;
        }
    }

    esconderStatusMapa() {
        const statusElement = document.getElementById('mapa-status');
        if (statusElement) {
            statusElement.style.display = 'none';
        }
    }

    limparMapa() {
        if (!this.map) return;

        // Limpar todas as camadas de dados
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
        }
        if (this.circulosLayer) {
            this.map.removeLayer(this.circulosLayer);
            this.circulosLayer = null;
        }

        // Limpar qualquer camada de calor ou círculo que possa ter ficado
        this.map.eachLayer((layer) => {
            if (layer instanceof L.HeatLayer || layer instanceof L.LayerGroup) {
                this.map.removeLayer(layer);
            }
        });
    }

    renderizarMapa(data) {
        // Verificar se Leaflet está disponível
        if (typeof L === 'undefined') {
            console.error('❌ Leaflet não está carregado!');
            this.mostrarErro('Erro: Biblioteca de mapas não carregada');
            return;
        }

        if (!this.map) {
            this.inicializarMapa();
        }

        // Limpar TODAS as camadas existentes completamente
        if (this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
        }
        if (this.circulosLayer) {
            this.map.removeLayer(this.circulosLayer);
            this.circulosLayer = null;
        }

        // Limpar qualquer camada de calor ou círculo que possa ter ficado
        this.map.eachLayer((layer) => {
            if (layer instanceof L.HeatLayer || layer instanceof L.LayerGroup) {
                this.map.removeLayer(layer);
            }
        });

        if (data.dados.length === 0 && data.aviso) {
            this.mostrarErro(data.aviso);
            return;
        }

        if (!data.dados || data.dados.length === 0) {
            this.mostrarErro('Nenhum dado encontrado para exibir no mapa.');
            return;
        }
        // Coordenadas dos municípios de SC (hardcoded - mesmo que perfil-candidato.html)
        const coordenadasSC = {
            'FLORIANÓPOLIS': [-27.5954, -48.5480], 'JOINVILLE': [-26.3044, -48.8481],
            'BLUMENAU': [-26.9194, -49.0661], 'SÃO JOSÉ': [-27.6136, -48.6366],
            'CRICIÚMA': [-28.6775, -49.3697], 'LAGES': [-27.8161, -50.3259],
            'CHAPECÓ': [-27.0964, -52.6181], 'ITAJAÍ': [-26.9078, -48.6619],
            'PALHOÇA': [-27.6444, -48.6678], 'BALNEÁRIO CAMBORIÚ': [-26.9906, -48.6342],
            'TUBARÃO': [-28.4667, -49.0069], 'SÃO BENTO DO SUL': [-26.2500, -49.3833],
            'ARARANGUÁ': [-28.9356, -49.4958], 'CAÇADOR': [-26.7758, -51.0139],
            'VIDEIRA': [-27.0089, -51.1517], 'BRUSQUE': [-27.0978, -48.9128],
            'SÃO MIGUEL DO OESTE': [-26.7250, -53.5181], 'CONCÓRDIA': [-27.2333, -52.0167],
            'JARAGUÁ DO SUL': [-26.4858, -49.0669], 'NOVA TRENTO': [-27.2858, -48.9308],
            'INDAIAL': [-26.8989, -49.2317], 'SÃO JOÃO BATISTA': [-27.2761, -48.8489],
            'BOMBINHAS': [-27.1389, -48.5089], 'PORTO BELO': [-27.1567, -48.5450],
            'GAROPABA': [-28.0250, -48.6122], 'IMBITUBA': [-28.2400, -48.6700],
            'LAGUNA': [-28.4833, -48.7833], 'SIDERÓPOLIS': [-28.5981, -49.4267],
            'URUSSANGA': [-28.5181, -49.3208], 'TURVO': [-28.9250, -49.6750],
            'MELEIRO': [-28.8250, -49.6417], 'JACINTO MACHADO': [-28.9967, -49.7633],
            'SOMBRIO': [-29.1081, -49.8081], 'TREZE DE MAIO': [-28.5581, -49.1417],
            'MORRO DA FUMAÇA': [-28.6500, -49.2083], 'FORQUILHINHA': [-28.7458, -49.4708],
            'NOVA VENEZA': [-28.6333, -49.5000], 'ORLEANS': [-28.3581, -49.2917],
            'GRAVATAL': [-28.3333, -49.0333], 'SÃO LUDGERO': [-28.3250, -49.1750],
            'SÃO MARTINHO': [-28.1581, -48.9750], 'SÃO BONIFÁCIO': [-27.9000, -48.9250],
            'ANITÁPOLIS': [-27.9000, -49.1250], 'SÃO JOAQUIM': [-28.2939, -49.9317],
            'BOM JARDIM DA SERRA': [-28.3333, -49.6250], 'BOCAÍNA DO SUL': [-27.7417, -49.9417],
            'URUBICI': [-28.0167, -49.5917], 'BOM RETIRO': [-27.8000, -49.4833],
            'CAMPO BELO DO SUL': [-27.9000, -50.7583], 'CURITIBANOS': [-27.2833, -50.5833],
            'FREI ROGÉRIO': [-27.1750, -50.8083], 'MONTE CARLO': [-27.2250, -50.9750],
            'PONTE ALTA': [-27.4833, -50.3750], 'SÃO CRISTÓVÃO DO SUL': [-27.2667, -50.4417],
            'VARGEM BONITA': [-27.0083, -51.7417], 'ABDON BATISTA': [-27.6167, -51.0167],
            'BRUNÓPOLIS': [-27.3083, -50.8667], 'CAPÃO ALTO': [-27.9333, -50.5083],
            'CELSO RAMOS': [-27.6333, -51.3333], 'ERMO': [-28.1000, -49.4250],
            'IBIAM': [-27.1833, -51.2333], 'IBICARÉ': [-27.0917, -51.3583],
            'IMBUIA': [-27.4917, -49.4250], 'JABORÁ': [-27.1750, -51.7333],
            'JOSÉ BOITEUX': [-26.9583, -49.6250], 'LAURO MULLER': [-28.3917, -49.3917],
            'LEBON RÉGIS': [-26.9250, -50.6917], 'PAINEL': [-27.9167, -50.1083],
            'PALMEIRA': [-27.5833, -50.1583], 'PONTE SERRADA': [-26.8750, -52.0167],
            'RIO RUFINO': [-27.8583, -49.7750], 'SANTA CECÍLIA': [-26.9583, -50.4250],
            'SÃO JOSÉ DO CERRITO': [-27.6667, -50.5750], 'TUNÁPOLIS': [-26.9667, -53.6417],
            'VARGEM': [-27.4833, -50.9750], 'ZORTÉA': [-27.4500, -51.5500],
            'ABELARDO LUZ': [-26.5647, -52.3281], 'AGROLÂNDIA': [-27.4117, -49.8225],
            'AGRONÔMICA': [-27.2650, -49.7081], 'ÁGUA DOCE': [-26.9983, -51.5539],
            'ÁGUAS DE CHAPECÓ': [-27.0750, -52.9833], 'ÁGUAS FRIAS': [-26.8800, -52.8583],
            'ÁGUAS MORNAS': [-27.6972, -48.8231], 'ALFREDO WAGNER': [-27.7000, -49.3333],
            'ALTO BELA VISTA': [-27.4333, -51.9083], 'ANCHIETA': [-26.5417, -53.3333],
            'ANGELINA': [-27.5647, -48.9869], 'ANTÔNIO CARLOS': [-27.5186, -48.7681],
            'APIÚNA': [-27.0347, -49.3897], 'ARABUTÃ': [-27.1583, -52.1417],
            'ARAQUARI': [-26.3756, -48.7203], 'ARMAZÉM': [-28.2417, -49.0167],
            'ARROIO TRINTA': [-26.9250, -51.3417], 'ASCURRA': [-26.9539, -49.3758],
            'ATALANTA': [-27.4167, -49.7833], 'AURORA': [-27.3083, -49.6333],
            'BALNEÁRIO ARROIO DO SILVA': [-28.9833, -49.4333], 'BALNEÁRIO BARRA DO SUL': [-26.4583, -48.6167],
            'BALNEÁRIO GAIVOTA': [-29.1500, -49.5833], 'BALNEÁRIO PIÇARRAS': [-26.7644, -48.6703],
            'BANDEIRANTE': [-26.7667, -53.6417], 'BARRA BONITA': [-26.6500, -53.4333],
            'BARRA VELHA': [-26.6350, -48.6967], 'BELA VISTA DO TOLDO': [-26.2750, -50.4667],
            'BELMONTE': [-26.8417, -53.5750], 'BENEDITO NOVO': [-26.7819, -49.3606],
            'BIGUAÇU': [-27.4939, -48.6556], 'BOCAINA DO SUL': [-27.7417, -49.9417],
            'BRAÇO DO NORTE': [-28.2750, -49.1667], 'BRAÇO DO TROMBUDO': [-27.3583, -49.8833],
            'BRUSQUE': [-27.0978, -48.9128], 'CAÇADOR': [-26.7758, -51.0139],
            'CAIBI': [-27.0750, -53.2500], 'CALMON': [-26.5917, -51.1000],
            'CAMBORIÚ': [-27.0256, -48.6553], 'CAMPO ALEGRE': [-26.1928, -49.2658],
            'CAMPO ERÊ': [-26.3917, -53.0833], 'CAMPOS NOVOS': [-27.4017, -51.2250],
            'CANELINHA': [-27.2617, -48.7658], 'CANOINHAS': [-26.1769, -50.3903],
            'CAPINZAL': [-27.3417, -51.6083], 'CAPIVARI DE BAIXO': [-28.4500, -48.9583],
            'CATANDUVAS': [-27.0667, -51.6583], 'CAXAMBU DO SUL': [-27.1583, -52.8750],
            'CERRO NEGRO': [-27.7917, -50.8667], 'CHAPADÃO DO LAGEADO': [-27.5917, -49.5500],
            'COCAL DO SUL': [-28.6000, -49.3333], 'CORDILHEIRA ALTA': [-26.9833, -52.6083],
            'CORONEL FREITAS': [-26.9083, -52.7000], 'CORONEL MARTINS': [-26.5083, -52.6667],
            'CORREIA PINTO': [-27.5833, -50.3583], 'CORUPÁ': [-26.4258, -49.2439],
            'CUNHA PORÃ': [-26.9000, -53.1667], 'CUNHATAÍ': [-26.9667, -53.0833],
            'CURITIBANOS': [-27.2833, -50.5833], 'DESCANSO': [-26.8250, -53.5000],
            'DIONÍSIO CERQUEIRA': [-26.2558, -53.6372], 'DONA EMMA': [-26.9833, -49.7167],
            'DOUTOR PEDRINHO': [-26.7167, -49.4833], 'ENTRE RIOS': [-26.7167, -52.5667],
            'ERVAL VELHO': [-27.2750, -51.4417], 'FAXINAL DOS GUEDES': [-26.8500, -52.2583],
            'FLOR DO SERTÃO': [-26.7833, -53.3500], 'FRAIBURGO': [-27.0256, -50.8075],
            'FREI ROGÉRIO': [-27.1750, -50.8083], 'GALVÃO': [-26.4583, -52.6917],
            'GARUVA': [-26.0289, -48.8544], 'GASPAR': [-26.9306, -49.1156],
            'GOVERNADOR CELSO RAMOS': [-27.3161, -48.5575], 'GRÃO PARÁ': [-28.1833, -49.2250],
            'GRAVATAL': [-28.3333, -49.0333], 'GUABIRUBA': [-27.0831, -48.9811],
            'GUARACIABA': [-26.6000, -53.5250], 'GUARAMIRIM': [-26.4725, -49.0011],
            'GUARUJÁ DO SUL': [-26.3833, -53.5333], 'GUATAMBÚ': [-27.1333, -52.7917],
            'HERVAL D´OESTE': [-27.1917, -51.4833], 'IBIAM': [-27.1833, -51.2333],
            'IBICARÉ': [-27.0917, -51.3583], 'IBIRAMA': [-27.0569, -49.5181],
            'IÇARA': [-28.7136, -49.3089], 'ILHOTA': [-26.9003, -48.8297],
            'IMARUÍ': [-28.3333, -48.8167], 'IMBUIA': [-27.4917, -49.4250],
            'IOMERÊ': [-27.0000, -51.2417], 'IPIRA': [-27.4083, -51.7750],
            'IPORÃ DO OESTE': [-26.9833, -53.5417], 'IPUAÇU': [-26.6333, -52.4583],
            'IPUMIRIM': [-27.0750, -52.1333], 'IRACEMINHA': [-26.8167, -53.2750],
            'IRANI': [-27.0250, -51.9000], 'IRATI': [-26.6583, -52.8917],
            'IRINEÓPOLIS': [-26.2417, -50.8000], 'ITÁ': [-27.2917, -52.3250],
            'ITAIÓPOLIS': [-26.3389, -49.9047], 'ITAPEMA': [-27.0903, -48.6108],
            'ITAPIRANGA': [-27.1667, -53.7167], 'ITAPOÁ': [-26.1167, -48.6167],
            'ITUPORANGA': [-27.4106, -49.6006], 'JABORÁ': [-27.1750, -51.7333],
            'JACINTO MACHADO': [-28.9967, -49.7633], 'JAGUARUNA': [-28.6147, -49.0300],
            'JARAGUÁ DO SUL': [-26.4858, -49.0669], 'JARDINÓPOLIS': [-26.7250, -52.8583],
            'JOAÇABA': [-27.1761, -51.5014], 'JOINVILLE': [-26.3044, -48.8481],
            'JOSÉ BOITEUX': [-26.9583, -49.6250], 'JUPIÁ': [-26.3917, -52.7250],
            'LACERDÓPOLIS': [-27.2583, -51.5583], 'LAGES': [-27.8161, -50.3259],
            'LAGUNA': [-28.4833, -48.7833], 'LAURO MULLER': [-28.3917, -49.3917],
            'LEBON RÉGIS': [-26.9250, -50.6917], 'LEOBERTO LEAL': [-27.5083, -49.2750],
            'LINDÓIA DO SUL': [-27.0500, -52.0667], 'LONTRAS': [-27.1667, -49.5333],
            'LUIZ ALVES': [-26.7147, -48.9344], 'LUZERNA': [-27.1333, -51.4667],
            'MACIEIRA': [-26.8583, -51.3667], 'MAFRA': [-26.1114, -49.8050],
            'MAJOR GERCINO': [-27.4167, -49.0667], 'MAJOR VIEIRA': [-26.3667, -50.3250],
            'MARACAJÁ': [-28.8500, -49.4583], 'MARAVILHA': [-26.7653, -53.1742],
            'MAREMA': [-26.8000, -52.6250], 'MASSARANDUBA': [-26.6097, -49.0078],
            'MATOS COSTA': [-26.4667, -51.1500], 'MELEIRO': [-28.8250, -49.6417],
            'MIRIM DOCE': [-27.1917, -49.9583], 'MODELO': [-26.7750, -53.0417],
            'MONDAÍ': [-27.1000, -53.4000], 'MONTE CARLO': [-27.2250, -50.9750],
            'MONTE CASTELO': [-26.4583, -50.2333], 'MORRO DA FUMAÇA': [-28.6500, -49.2083],
            'MORRO GRANDE': [-28.8000, -49.7167], 'NAVEGANTES': [-26.8986, -48.6542],
            'NOVA ERECHIM': [-26.9000, -52.9083], 'NOVA ITABERABA': [-26.9417, -52.8167],
            'NOVA TRENTO': [-27.2858, -48.9308], 'NOVA VENEZA': [-28.6333, -49.5000],
            'NOVO HORIZONTE': [-26.4417, -52.8333], 'ORLEANS': [-28.3581, -49.2917],
            'OTACÍLIO COSTA': [-27.4833, -50.1250], 'OURO': [-27.3417, -51.6250],
            'OURO VERDE': [-26.6917, -52.3167], 'PAIAL': [-27.2500, -52.5000],
            'PAINEL': [-27.9167, -50.1083], 'PALHOÇA': [-27.6444, -48.6678],
            'PALMA SOLA': [-26.3500, -53.2750], 'PALMEIRA': [-27.5833, -50.1583],
            'PALMITOS': [-27.0669, -53.1592], 'PAPANDUVA': [-26.3833, -50.1417],
            'PARAÍSO': [-26.6167, -53.6750], 'PASSO DE TORRES': [-29.3083, -49.7167],
            'PASSOS MAIA': [-26.7833, -52.0583], 'PAULO LOPES': [-27.9617, -48.6856],
            'PEDRAS GRANDES': [-28.4333, -49.1917], 'PENHA': [-26.7694, -48.6439],
            'PERITIBA': [-27.3750, -51.9083], 'PETROLÂNDIA': [-27.5333, -49.6833],
            'PINHALZINHO': [-26.8500, -52.9917], 'PINHEIRO PRETO': [-27.0417, -51.2250],
            'PIRATUBA': [-27.4250, -51.7667], 'PLANALTO ALEGRE': [-27.0667, -52.8667],
            'POMERODE': [-26.7406, -49.1764], 'PONTE ALTA': [-27.4833, -50.3750],
            'PONTE ALTA DO NORTE': [-27.1583, -50.4667], 'PONTE SERRADA': [-26.8750, -52.0167],
            'PORTO BELO': [-27.1567, -48.5450], 'PORTO UNIÃO': [-26.2369, -51.0800],
            'POUSO REDONDO': [-27.2583, -49.9333], 'PRAIA GRANDE': [-29.1917, -49.9500],
            'PRESIDENTE CASTELO BRANCO': [-27.2250, -51.8000], 'PRESIDENTE GETÚLIO': [-27.0500, -49.6250],
            'PRESIDENTE NEREU': [-27.2750, -49.3833], 'PRINCESA': [-26.4417, -53.5917],
            'QUILOMBO': [-26.7250, -52.7250], 'RANCHO QUEIMADO': [-27.6750, -49.0167],
            'RIO DAS ANTAS': [-26.8917, -51.0750], 'RIO DO CAMPO': [-26.9417, -50.1333],
            'RIO DO OESTE': [-27.1917, -49.7917], 'RIO DO SUL': [-27.2142, -49.6431],
            'RIO DOS CEDROS': [-26.7375, -49.2728], 'RIO FORTUNA': [-28.1250, -49.1083],
            'RIO NEGRINHO': [-26.2558, -49.5181], 'RIO RUFINO': [-27.8583, -49.7750],
            'RIQUEZA': [-27.0583, -53.3250], 'RODEIO': [-26.9242, -49.3650],
            'ROMELÂNDIA': [-26.6833, -53.3167], 'SALETE': [-26.9833, -49.9917],
            'SALTINHO': [-26.6083, -53.0583], 'SALTO VELOSO': [-26.9000, -51.4083],
            'SANGÃO': [-28.6333, -49.1333], 'SANTA CECÍLIA': [-26.9583, -50.4250],
            'SANTA HELENA': [-26.9333, -53.6250], 'SANTA ROSA DE LIMA': [-28.0333, -49.1167],
            'SANTA ROSA DO SUL': [-29.1333, -49.7083], 'SANTA TEREZINHA': [-26.7833, -50.0083],
            'SANTA TEREZINHA DO PROGRESSO': [-26.6250, -53.2000], 'SANTIAGO DO SUL': [-26.6417, -52.6750],
            'SANTO AMARO DA IMPERATRIZ': [-27.6861, -48.7822], 'SÃO BENTO DO SUL': [-26.2500, -49.3833],
            'SÃO BERNARDINO': [-26.4750, -52.9667], 'SÃO BONIFÁCIO': [-27.9000, -48.9250],
            'SÃO CARLOS': [-27.0833, -53.0083], 'SÃO CRISTÓVÃO DO SUL': [-27.2667, -50.4417],
            'SÃO DOMINGOS': [-26.5581, -52.5317], 'SÃO FRANCISCO DO SUL': [-26.2433, -48.6386],
            'SÃO JOÃO BATISTA': [-27.2761, -48.8489], 'SÃO JOÃO DO ITAPERIÚ': [-26.6167, -48.7667],
            'SÃO JOÃO DO OESTE': [-27.1000, -53.5917], 'SÃO JOÃO DO SUL': [-29.2167, -49.8083],
            'SÃO JOAQUIM': [-28.2939, -49.9317], 'SÃO JOSÉ': [-27.6136, -48.6366],
            'SÃO JOSÉ DO CEDRO': [-26.4583, -53.4917], 'SÃO JOSÉ DO CERRITO': [-27.6667, -50.5750],
            'SÃO LOURENÇO DO OESTE': [-26.3583, -52.8500], 'SÃO LUDGERO': [-28.3250, -49.1750],
            'SÃO MARTINHO': [-28.1581, -48.9750], 'SÃO MIGUEL DA BOA VISTA': [-26.6917, -53.2500],
            'SÃO MIGUEL DO OESTE': [-26.7250, -53.5181], 'SÃO PEDRO DE ALCÂNTARA': [-27.5667, -48.8167],
            'SAUDADES': [-26.9250, -53.0000], 'SCHROEDER': [-26.4128, -49.0697],
            'SEARA': [-27.1500, -52.3083], 'SERRA ALTA': [-26.7250, -53.0417],
            'SIDERÓPOLIS': [-28.5981, -49.4267], 'SOMBRIO': [-29.1081, -49.8081],
            'SUL BRASIL': [-26.7333, -52.9667], 'TAIÓ': [-27.1167, -49.9917],
            'TANGARÁ': [-27.1000, -51.2500], 'TIGRINHOS': [-26.6833, -53.1583],
            'TIJUCAS': [-27.2364, -48.6319], 'TIMBÉ DO SUL': [-28.8333, -49.8417],
            'TIMBÓ': [-26.8231, -49.2728], 'TIMBÓ GRANDE': [-26.6167, -50.6750],
            'TRÊS BARRAS': [-26.1083, -50.3167], 'TREVISO': [-28.5167, -49.4583],
            'TREZE DE MAIO': [-28.5581, -49.1417], 'TREZE TÍLIAS': [-27.0000, -51.4083],
            'TROMBUDO CENTRAL': [-27.2917, -49.7917], 'TUNÁPOLIS': [-26.9667, -53.6417],
            'TURVO': [-28.9250, -49.6750], 'UNIÃO DO OESTE': [-26.7583, -52.8500],
            'URUBICI': [-28.0167, -49.5917], 'URUPEMA': [-28.3083, -49.8750],
            'URUSSANGA': [-28.5181, -49.3208], 'VARGEÃO': [-26.8583, -52.1583],
            'VARGEM': [-27.4833, -50.9750], 'VARGEM BONITA': [-27.0083, -51.7417],
            'VIDAL RAMOS': [-27.3833, -49.3583], 'VIDEIRA': [-27.0089, -51.1517],
            'VITOR MEIRELES': [-26.8750, -49.8333], 'WITMARSUM': [-26.9333, -49.7917],
            'XANXERÊ': [-26.8756, -52.4036], 'XAVANTINA': [-27.0667, -52.3417],
            'XAXIM': [-26.9583, -52.5361], 'ZORTÉA': [-27.4500, -51.5500]
        };

        // Preparar dados para mapa de calor - usar coordenadas hardcoded se não tiver no banco
        const pontosHeatmap = data.dados
            .map(item => {
                const municipioNome = item.municipio.toUpperCase();
                const coords = coordenadasSC[municipioNome];
                if (coords) {
                    return [coords[0], coords[1], parseInt(item.total_votos)];
                }
                // Fallback para coords do banco se existirem
                if (item.latitude && item.longitude) {
                    return [parseFloat(item.latitude), parseFloat(item.longitude), parseInt(item.total_votos)];
                }
                return null;
            })
            .filter(p => p !== null);

        // Adicionar mapa de calor
        if (data.tipo === 'heatmap' || data.tipo === 'ambos') {
            this.heatmapLayer = L.heatLayer(pontosHeatmap, {
                radius: 30,
                blur: 20,
                maxZoom: 18,
                gradient: {
                    0.4: 'blue',
                    0.6: 'cyan',
                    0.7: 'lime',
                    0.8: 'yellow',
                    1.0: 'red'
                }
            }).addTo(this.map);
        }

        // Adicionar círculos proporcionais
        if (data.tipo === 'circulos' || data.tipo === 'ambos') {
            this.circulosLayer = L.layerGroup();

            data.dados.forEach((item, index) => {
                const municipioNome = item.municipio.toUpperCase();
                const coords = coordenadasSC[municipioNome];
                if (!coords && (!item.latitude || !item.longitude)) return;

                const lat = coords ? coords[0] : parseFloat(item.latitude);
                const lon = coords ? coords[1] : parseFloat(item.longitude);
                const raio = Math.max(8, Math.min(25, parseInt(item.total_votos) / 3));

                const circulo = L.circleMarker([lat, lon], {
                    radius: raio,
                    fillColor: '#ff0000',
                    color: '#ff0000',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.6
                });

                circulo.bindPopup(`
                    <b>${item.municipio}</b><br>
                    Votos: ${parseInt(item.total_votos).toLocaleString()}<br>
                    Candidato: ${item.candidato}<br>
                    Cargo: ${item.cargo}
                `);

                this.circulosLayer.addLayer(circulo);
            });

            this.circulosLayer.addTo(this.map);
        }

        // Ajustar visualização para mostrar todos os pontos
        if (pontosHeatmap.length > 0) {
            const group = new L.featureGroup();
            pontosHeatmap.forEach(point => {
                if (point && !isNaN(point[0]) && !isNaN(point[1])) {
                    group.addLayer(L.marker([point[0], point[1]]));
                }
            });
            if (group.getLayers().length > 0) {
                this.map.fitBounds(group.getBounds().pad(0.1));
            }
        }
    }

    async carregarRelatorios() {
        try {
            const response = await fetch(`${this.apiBase}/relatorios`);
            const data = await response.json();

            this.renderizarRelatorios(data.data);
        } catch (error) {
            console.error('Erro ao carregar relatórios:', error);
            this.mostrarErro('Erro ao carregar relatórios');
        }
    }

    renderizarRelatorios(relatorios) {
        const container = document.getElementById('relatorios-list');

        if (relatorios.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-bar"></i>
                    <h3>Nenhum relatório encontrado</h3>
                    <p>Crie seu primeiro relatório clicando no botão "Novo Relatório"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = relatorios.map(relatorio => `
            <div class="relatorio-card">
                <h3>${relatorio.nome}</h3>
                <p>${relatorio.descricao || 'Sem descrição'}</p>
                <p><strong>Eleição:</strong> ${relatorio.eleicao_ano ? `${relatorio.eleicao_ano} - ${relatorio.eleicao_tipo}` : 'N/A'}</p>
                <p><strong>Criado em:</strong> ${new Date(relatorio.created_at).toLocaleDateString('pt-BR')}</p>
                <div class="relatorio-actions">
                    <button class="btn btn-primary btn-sm" onclick="sistema.executarRelatorio(${relatorio.id})">
                        <i class="fas fa-play"></i>
                        Executar
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="sistema.editarRelatorio(${relatorio.id})">
                        <i class="fas fa-edit"></i>
                        Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="sistema.deletarRelatorio(${relatorio.id})">
                        <i class="fas fa-trash"></i>
                        Deletar
                    </button>
                </div>
            </div>
        `).join('');
    }

    criarRelatorio() {
        document.getElementById('modal-titulo').textContent = 'Novo Relatório';
        document.getElementById('form-relatorio').reset();
        this.mostrarModal();
    }

    async editarRelatorio(id) {
        try {
            const response = await fetch(`${this.apiBase}/relatorios/${id}`);
            const relatorio = await response.json();

            document.getElementById('modal-titulo').textContent = 'Editar Relatório';
            document.getElementById('relatorio-nome').value = relatorio.nome;
            document.getElementById('relatorio-descricao').value = relatorio.descricao || '';
            document.getElementById('relatorio-eleicao').value = relatorio.eleicao_id || '';

            this.mostrarModal();
        } catch (error) {
            console.error('Erro ao carregar relatório:', error);
            this.mostrarErro('Erro ao carregar relatório');
        }
    }

    async salvarRelatorio() {
        const formData = {
            nome: document.getElementById('relatorio-nome').value.trim(),
            descricao: document.getElementById('relatorio-descricao').value.trim(),
            eleicao_id: document.getElementById('relatorio-eleicao').value ? parseInt(document.getElementById('relatorio-eleicao').value) : null,
            tipo: document.getElementById('relatorio-tipo').value || 'tabela',
            colunas: Array.from(document.getElementById('relatorio-colunas').selectedOptions)
                .map(option => option.value)
        };

        // Remover campos vazios
        if (!formData.descricao) delete formData.descricao;
        if (!formData.eleicao_id) delete formData.eleicao_id;
        if (formData.colunas.length === 0) delete formData.colunas;

        if (!formData.nome) {
            this.mostrarErro('Por favor, preencha o nome do relatório.');
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/relatorios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                this.fecharModal();
                await this.carregarRelatorios();
                this.mostrarSucesso('Relatório criado com sucesso!');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao salvar relatório');
            }
        } catch (error) {
            console.error('Erro ao salvar relatório:', error);
            this.mostrarErro('Erro ao salvar relatório: ' + error.message);
        }
    }

    async executarRelatorio(id) {
        try {
            const response = await fetch(`${this.apiBase}/relatorios/${id}/executar`);
            const data = await response.json();

            console.log('Resultado do relatório:', data);

            // Exibir resultado baseado no tipo
            if (data.tipo === 'tabela') {
                this.exibirTabelaRelatorio(data);
            } else if (data.tipo === 'grafico') {
                this.exibirGraficoRelatorio(data);
            } else if (data.tipo === 'mapa') {
                this.exibirMapaRelatorio(data);
            }

            this.mostrarSucesso('Relatório executado com sucesso!');
        } catch (error) {
            console.error('Erro ao executar relatório:', error);
            this.mostrarErro('Erro ao executar relatório');
        }
    }

    exibirTabelaRelatorio(data) {
        // Criar modal para exibir tabela
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Relatório: ${data.relatorio}</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="relatorio-info">
                        <p><strong>Tipo:</strong> ${data.tipo}</p>
                        <p><strong>Total de registros:</strong> ${data.total_registros}</p>
                    </div>
                    <div class="tabela-container">
                        ${this.gerarTabelaHTML(data.dados, data.colunas)}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    exibirGraficoRelatorio(data) {
        // Criar modal para exibir gráfico
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Relatório: ${data.relatorio}</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="relatorio-info">
                        <p><strong>Tipo:</strong> ${data.tipo}</p>
                        <p><strong>Agrupamento:</strong> ${data.agrupamento}</p>
                        <p><strong>Total de registros:</strong> ${data.dados.length}</p>
                    </div>
                    <div class="grafico-container">
                        <canvas id="grafico-relatorio" width="800" height="400"></canvas>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Renderizar gráfico
        this.renderizarGrafico(data);
    }

    exibirMapaRelatorio(data) {
        // Criar modal para exibir mapa
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Relatório: ${data.relatorio}</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="relatorio-info">
                        <p><strong>Tipo:</strong> ${data.tipo}</p>
                        <p><strong>Total de registros:</strong> ${data.dados.length}</p>
                    </div>
                    <div class="mapa-container">
                        <div id="mapa-relatorio" style="height: 400px; width: 100%;"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'block';

        // Renderizar mapa
        this.renderizarMapaRelatorio(data);
    }

    gerarTabelaHTML(dados, colunas) {
        if (!dados || dados.length === 0) {
            return '<p>Nenhum dado encontrado.</p>';
        }

        // Se não há colunas definidas, usar todas as colunas disponíveis
        if (!colunas || colunas.length === 0) {
            const primeiraLinha = dados[0];
            colunas = Object.keys(primeiraLinha);
        }

        const headers = colunas.map(col => `<th>${this.formatarNomeColuna(col)}</th>`).join('');
        const rows = dados.map(row =>
            `<tr>${colunas.map(col => `<td>${this.formatarValor(row[col], col)}</td>`).join('')}</tr>`
        ).join('');

        return `
            <table class="tabela-relatorio">
                <thead>
                    <tr>${headers}</tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    renderizarGrafico(data) {
        // Aguardar um pouco para o canvas estar disponível
        setTimeout(() => {
            const canvas = document.getElementById('grafico-relatorio');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            // Preparar dados para o gráfico
            const labels = data.dados.map(item => item.label || item.nome || item.municipio || item.candidato || 'Sem nome');
            const valores = data.dados.map(item => {
                const valor = item.value || item.valor || item.votos || item.total_votos || 0;
                return isNaN(valor) ? 0 : Number(valor);
            });

            // Verificar se há dados válidos
            if (valores.length === 0 || valores.every(v => v === 0)) {
                ctx.fillStyle = '#666';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Nenhum dado disponível para exibir', canvas.width / 2, canvas.height / 2);
                return;
            }

            // Criar gráfico de barras simples
            const maxValor = Math.max(...valores);
            const barWidth = Math.max(20, canvas.width / labels.length);
            const barHeight = canvas.height - 80;

            // Limpar canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Desenhar barras
            labels.forEach((label, index) => {
                const valor = valores[index];
                if (valor <= 0) return; // Pular valores zero ou negativos

                const altura = Math.max(1, (valor / maxValor) * barHeight);
                const x = index * barWidth;
                const y = canvas.height - altura - 50;

                // Verificar se as coordenadas são válidas
                if (isNaN(x) || isNaN(y) || isNaN(altura) || !isFinite(x) || !isFinite(y) || !isFinite(altura)) {
                    return;
                }

                // Cor da barra (gradiente)
                const gradient = ctx.createLinearGradient(0, y, 0, y + altura);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');

                ctx.fillStyle = gradient;
                ctx.fillRect(x + 5, y, barWidth - 10, altura);

                // Valor no topo da barra
                ctx.fillStyle = '#333';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(valor.toString(), x + barWidth / 2, Math.max(15, y - 5));

                // Label embaixo
                ctx.fillStyle = '#666';
                ctx.font = '10px Arial';
                const labelText = label.length > 12 ? label.substring(0, 12) + '...' : label;
                ctx.fillText(labelText, x + barWidth / 2, canvas.height - 20);
            });

            // Título do gráfico
            ctx.fillStyle = '#333';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Relatório: ${data.relatorio}`, canvas.width / 2, 25);

        }, 100);
    }

    renderizarMapaRelatorio(data) {
        // Implementação básica do mapa para relatórios
        setTimeout(() => {
            const mapaDiv = document.getElementById('mapa-relatorio');
            if (!mapaDiv || typeof L === 'undefined') return;

            // Limpar mapa anterior
            mapaDiv.innerHTML = '';

            // Criar mapa
            const mapa = L.map('mapa-relatorio').setView([-27.2423, -50.2189], 7);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapa);

            // Adicionar marcadores para os dados
            data.dados.forEach(item => {
                if (item.latitude && item.longitude) {
                    L.marker([item.latitude, item.longitude])
                        .addTo(mapa)
                        .bindPopup(`
                            <strong>${item.label || item.nome || 'Local'}</strong><br>
                            Votos: ${item.valor || item.votos || 0}
                        `);
                }
            });

        }, 100);
    }

    async deletarRelatorio(id) {
        if (!confirm('Tem certeza que deseja deletar este relatório?')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBase}/relatorios/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.carregarRelatorios();
                this.mostrarSucesso('Relatório deletado com sucesso!');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao deletar relatório');
            }
        } catch (error) {
            console.error('Erro ao deletar relatório:', error);
            this.mostrarErro('Erro ao deletar relatório: ' + error.message);
        }
    }

    mostrarModal() {
        document.getElementById('modal-relatorio').classList.add('active');
    }

    fecharModal() {
        document.getElementById('modal-relatorio').classList.remove('active');
    }

    formatarNomeColuna(coluna) {
        const nomes = {
            'municipio': 'Município',
            'municipio_nome': 'Município',
            'votos': 'Votos',
            'candidato': 'Candidato',
            'candidato_nome': 'Candidato',
            'cargo': 'Cargo',
            'numero': 'Número',
            'partido': 'Partido',
            'zona': 'Zona',
            'secao': 'Seção',
            'local': 'Local de Votação',
            'endereco': 'Endereço',
            'eleicao': 'Eleição',
            'tipo': 'Tipo',
            'turno': 'Turno',
            'total_votos': 'Total de Votos',
            'municipios_envolvidos': 'Municípios Envolvidos',
            'candidatos_envolvidos': 'Candidatos Envolvidos',
            'total_registros': 'Total de Registros',
            'media_votos_por_secao': 'Média de Votos por Seção'
        };
        return nomes[coluna] || coluna;
    }

    formatarValor(valor, tipoColuna = '') {
        if (valor === null || valor === undefined) return '-';

        // Formatações específicas por tipo de coluna
        if (tipoColuna === 'turno' && valor) {
            return `${valor}º Turno`;
        }

        if (tipoColuna === 'eleicao' && valor) {
            return `${valor}`;
        }

        if (tipoColuna === 'partido' && (!valor || valor === 'NULL' || valor === '')) {
            return 'Sem partido';
        }

        if (typeof valor === 'number') return valor.toLocaleString('pt-BR');
        return valor.toString();
    }

    mostrarErro(mensagem) {
        this.mostrarNotificacao(mensagem, 'error');
    }

    mostrarSucesso(mensagem) {
        this.mostrarNotificacao(mensagem, 'success');
    }

    mostrarNotificacao(mensagem, tipo) {
        const notificacao = document.createElement('div');
        notificacao.className = `notification ${tipo}`;
        notificacao.textContent = mensagem;

        notificacao.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 2rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        if (tipo === 'error') {
            notificacao.style.background = '#dc3545';
        } else if (tipo === 'success') {
            notificacao.style.background = '#28a745';
        }

        document.body.appendChild(notificacao);

        setTimeout(() => {
            notificacao.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notificacao);
            }, 300);
        }, 3000);
    }

    // Funções de exportação
    exportarExcel() {
        try {
            const tabela = document.getElementById('tabela-dados');
            if (!tabela || !tabela.rows.length) {
                this.mostrarNotificacao('Nenhuma tabela para exportar', 'error');
                return;
            }

            // Preparar dados da tabela
            const dados = this.extrairDadosTabela();
            if (dados.length === 0) {
                this.mostrarNotificacao('Nenhum dado para exportar', 'error');
                return;
            }

            // Criar workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(dados);

            // Configurar largura das colunas
            const colWidths = this.calcularLarguraColunas(dados);
            ws['!cols'] = colWidths;

            // Adicionar worksheet ao workbook
            XLSX.utils.book_append_sheet(wb, ws, 'Dados Eleitorais');

            // Gerar nome do arquivo
            const eleicao = document.getElementById('tabela-eleicao').selectedOptions[0]?.text || 'dados';
            const data = new Date().toISOString().split('T')[0];
            const nomeArquivo = `dados_eleitorais_${eleicao.replace(/\s+/g, '_')}_${data}.xlsx`;

            // Salvar arquivo
            XLSX.writeFile(wb, nomeArquivo);
            this.mostrarNotificacao('Arquivo Excel exportado com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao exportar Excel:', error);
            this.mostrarNotificacao('Erro ao exportar Excel: ' + error.message, 'error');
        }
    }

    exportarPDF() {
        try {
            const tabela = document.getElementById('tabela-dados');
            if (!tabela || !tabela.rows.length) {
                this.mostrarNotificacao('Nenhuma tabela para exportar', 'error');
                return;
            }

            // Preparar dados da tabela
            const dados = this.extrairDadosTabela();
            if (dados.length === 0) {
                this.mostrarNotificacao('Nenhum dado para exportar', 'error');
                return;
            }

            // Criar PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape', 'mm', 'a4');

            // Configurar título
            const eleicao = document.getElementById('tabela-eleicao').selectedOptions[0]?.text || 'Dados Eleitorais';
            const data = new Date().toLocaleDateString('pt-BR');

            doc.setFontSize(16);
            doc.text('Sistema de Análise Eleitoral TSE', 14, 10);
            doc.setFontSize(12);
            doc.text(`Relatório: ${eleicao}`, 14, 18);
            doc.text(`Data: ${data}`, 14, 24);

            // Preparar dados para a tabela
            const colunas = Object.keys(dados[0]);
            const linhas = dados.map(linha => colunas.map(col => linha[col]));

            // Adicionar tabela
            doc.autoTable({
                head: [colunas],
                body: linhas,
                startY: 30,
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                headStyles: {
                    fillColor: [102, 126, 234],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 250]
                },
                margin: { left: 14, right: 14 }
            });

            // Gerar nome do arquivo
            const nomeArquivo = `dados_eleitorais_${eleicao.replace(/\s+/g, '_')}_${data.replace(/\//g, '-')}.pdf`;

            // Salvar arquivo
            doc.save(nomeArquivo);
            this.mostrarNotificacao('Arquivo PDF exportado com sucesso!', 'success');

        } catch (error) {
            console.error('Erro ao exportar PDF:', error);
            this.mostrarNotificacao('Erro ao exportar PDF: ' + error.message, 'error');
        }
    }

    imprimirTabela() {
        try {
            const tabela = document.getElementById('tabela-dados');
            if (!tabela || !tabela.rows.length) {
                this.mostrarNotificacao('Nenhuma tabela para imprimir', 'error');
                return;
            }

            // Criar janela de impressão
            const janelaImpressao = window.open('', '_blank');

            // Obter dados da tabela
            const dados = this.extrairDadosTabela();
            const eleicao = document.getElementById('tabela-eleicao').selectedOptions[0]?.text || 'Dados Eleitorais';
            const data = new Date().toLocaleDateString('pt-BR');

            // Criar HTML para impressão
            let html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Relatório Eleitoral - ${eleicao}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #667eea; margin-bottom: 10px; }
                        h2 { color: #333; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #667eea; color: white; font-weight: bold; }
                        tr:nth-child(even) { background-color: #f2f2f2; }
                        .header { margin-bottom: 30px; }
                        .info { margin-bottom: 20px; color: #666; }
                        @media print {
                            body { margin: 0; }
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>Sistema de Análise Eleitoral TSE</h1>
                        <h2>Relatório: ${eleicao}</h2>
                        <div class="info">
                            <p><strong>Data:</strong> ${data}</p>
                            <p><strong>Total de registros:</strong> ${dados.length}</p>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
            `;

            // Adicionar cabeçalhos
            if (dados.length > 0) {
                Object.keys(dados[0]).forEach(coluna => {
                    html += `<th>${this.formatarNomeColuna(coluna)}</th>`;
                });
            }

            html += `
                            </tr>
                        </thead>
                        <tbody>
            `;

            // Adicionar dados
            dados.forEach(linha => {
                html += '<tr>';
                Object.values(linha).forEach(valor => {
                    html += `<td>${this.formatarValor(valor)}</td>`;
                });
                html += '</tr>';
            });

            html += `
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            // Escrever HTML na janela
            janelaImpressao.document.write(html);
            janelaImpressao.document.close();

            // Aguardar carregamento e imprimir
            janelaImpressao.onload = () => {
                janelaImpressao.print();
                janelaImpressao.close();
            };

            this.mostrarNotificacao('Preparando impressão...', 'info');

        } catch (error) {
            console.error('Erro ao imprimir:', error);
            this.mostrarNotificacao('Erro ao imprimir: ' + error.message, 'error');
        }
    }

    extrairDadosTabela() {
        const tabela = document.getElementById('tabela-dados');
        const dados = [];

        if (!tabela || !tabela.rows.length) return dados;

        // Obter cabeçalhos
        const cabecalhos = Array.from(tabela.querySelectorAll('thead th')).map(th => th.textContent.trim());

        // Obter dados das linhas
        const linhas = Array.from(tabela.querySelectorAll('tbody tr'));

        linhas.forEach(linha => {
            const celulas = Array.from(linha.querySelectorAll('td'));
            const linhaDados = {};

            celulas.forEach((celula, index) => {
                const coluna = cabecalhos[index];
                if (coluna) {
                    linhaDados[coluna] = celula.textContent.trim();
                }
            });

            if (Object.keys(linhaDados).length > 0) {
                dados.push(linhaDados);
            }
        });

        return dados;
    }

    calcularLarguraColunas(dados) {
        if (dados.length === 0) return [];

        const colunas = Object.keys(dados[0]);
        return colunas.map(coluna => {
            const larguraMaxima = Math.max(
                coluna.length,
                ...dados.map(linha => String(linha[coluna] || '').length)
            );
            return { wch: Math.min(Math.max(larguraMaxima + 2, 10), 50) };
        });
    }

    formatarNomeColuna(coluna) {
        const nomes = {
            'municipio': 'Município',
            'votos': 'Votos',
            'candidato': 'Candidato',
            'cargo': 'Cargo',
            'numero': 'Número',
            'zona': 'Zona',
            'partido': 'Partido',
            'secao': 'Seção',
            'local': 'Local de Votação',
            'endereco': 'Endereço',
            'eleicao': 'Eleição',
            'turno': 'Turno'
        };
        return nomes[coluna] || coluna;
    }

    formatarValor(valor) {
        if (typeof valor === 'number') {
            return valor.toLocaleString('pt-BR');
        }
        return String(valor || '');
    }

    // ===== FUNÇÕES PARA ABA DE ANÁLISE REGIONAL =====

    async carregarDadosRegionais() {
        try {
            // Carregar estatísticas gerais
            await this.carregarEstatisticasRegionais();

            // Carregar mesorregiões
            await this.carregarMesorregioes();

            // Carregar regionais PSDB
            await this.carregarRegionaisPSDB();
        } catch (error) {
            console.error('Erro ao carregar dados regionais:', error);
        }
    }

    async carregarEstatisticasRegionais() {
        try {
            const response = await fetch(`${this.apiBase}/regionais/estatisticas-gerais`);
            const data = await response.json();

            if (data.success) {
                const stats = data.estatisticas_gerais;
                document.getElementById('total-mesorregioes').textContent = stats.total_mesorregioes || '0';
                document.getElementById('total-regionais').textContent = stats.total_regionais || '0';
                document.getElementById('total-municipios-regionais').textContent = stats.total_municipios || '0';
                document.getElementById('populacao-total').textContent = (stats.populacao_total || '0').toLocaleString('pt-BR');
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas regionais:', error);
        }
    }

    async carregarMesorregioes() {
        try {
            const response = await fetch(`${this.apiBase}/regionais/mesorregioes`);
            const data = await response.json();

            if (data.success) {
                const select = document.getElementById('regionais-mesorregiao');
                select.innerHTML = '<option value="">Todas as mesorregiões</option>';

                data.data.forEach(mesorregiao => {
                    const option = document.createElement('option');
                    option.value = mesorregiao.id;
                    option.textContent = `${mesorregiao.nome} (${mesorregiao.total_municipios} municípios)`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar mesorregiões:', error);
        }
    }

    async carregarRegionaisPSDB() {
        try {
            const response = await fetch(`${this.apiBase}/regionais/regionais-psdb`);
            const data = await response.json();

            if (data.success) {
                const select = document.getElementById('regionais-regional');
                select.innerHTML = '<option value="">Todas as regionais</option>';

                data.data.forEach(regional => {
                    const option = document.createElement('option');
                    option.value = regional.id;
                    option.textContent = `${regional.nome} - ${regional.mesorregiao}`;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar regionais PSDB:', error);
        }
    }

    async carregarAnaliseRegional() {
        // Declarar elementos no início da função para acesso em todo o escopo
        const loadingElement = document.getElementById('regionais-loading');
        const noDataElement = document.getElementById('regionais-no-data');
        const resultsElement = document.getElementById('regionais-results');

        try {
            // Verificar se a aba regional está visível
            const regionaisTab = document.getElementById('regionais');
            if (!regionaisTab || !regionaisTab.classList.contains('active')) {
                console.warn('Aba regional não está ativa, mudando para ela...');
                this.mostrarTab('regionais');
                // Aguardar um pouco para o DOM atualizar
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            const eleicaoId = document.getElementById('regionais-eleicao')?.value;
            const cargo = document.getElementById('regionais-cargo')?.value;
            const mesorregiaoId = document.getElementById('regionais-mesorregiao')?.value;
            const regionalId = document.getElementById('regionais-regional')?.value;

            if (!eleicaoId) {
                this.mostrarErro('Selecione uma eleição para analisar');
                return;
            }

            if (loadingElement) loadingElement.style.display = 'block';
            if (noDataElement) noDataElement.style.display = 'none';
            if (resultsElement) {
                resultsElement.innerHTML = `
                    <div class="table-loader">
                        <div class="table-loader-spinner"></div>
                        <div class="table-loader-text">Carregando análise regional...</div>
                        <div class="table-loader-subtext">Processando dados de candidatos por região</div>
                    </div>
                `;
            }

            // Se uma regional específica foi selecionada, usar a nova rota
            if (regionalId) {
                const params = new URLSearchParams({
                    eleicao_id: eleicaoId
                });

                // Adicionar filtro de cargo se selecionado
                if (cargo) {
                    params.append('cargo', cargo);
                }

                const response = await fetch(`${this.apiBase}/regionais/candidatos-por-regional/${regionalId}?${params}`);
                const data = await response.json();

                if (data.success) {
                    this.exibirResultadosRegionalEspecifica(data);
                } else {
                    this.mostrarErro(data.message || 'Erro ao carregar análise da regional');
                }
            } else if (mesorregiaoId) {
                // Se uma mesorregião específica foi selecionada, mostrar municípios da mesorregião
                const response = await fetch(`${this.apiBase}/regionais/municipios?mesorregiao_id=${mesorregiaoId}`);
                const data = await response.json();

                if (data.success && data.data.length > 0) {
                    this.exibirMunicipiosMesorregiao(data.data, mesorregiaoId);
                } else {
                    if (noDataElement) {
                        noDataElement.style.display = 'block';
                        noDataElement.textContent = 'Nenhum município encontrado nesta mesorregião';
                    }
                }
            } else {
                // Análise geral por região - mostrar estatísticas de todas as regionais
                const params = new URLSearchParams();
                if (eleicaoId) params.append('eleicao_id', eleicaoId);
                if (cargo) params.append('cargo', cargo);

                const response = await fetch(`${this.apiBase}/regionais/estatisticas-todas-regionais?${params}`);
                const data = await response.json();

                if (data.success && data.regionais.length > 0) {
                    this.exibirEstatisticasTodasRegionais(data);
                } else {
                    if (noDataElement) {
                        noDataElement.style.display = 'block';
                        noDataElement.textContent = 'Nenhuma regional encontrada com os filtros selecionados';
                    }
                }
            }

        } catch (error) {
            console.error('Erro ao carregar análise regional:', error);
            this.mostrarErro('Erro ao carregar análise regional');
        } finally {
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    // Exibir municípios de uma mesorregião específica
    exibirMunicipiosMesorregiao(municipios, mesorregiaoId) {
        const container = document.getElementById('regionais-results');

        // Buscar nome da mesorregião
        const mesorregiaoSelect = document.getElementById('regionais-mesorregiao');
        const mesorregiaoNome = mesorregiaoSelect.options[mesorregiaoSelect.selectedIndex]?.textContent || 'Mesorregião';

        // Calcular estatísticas
        const totalMunicipios = municipios.length;
        const totalEleitores = municipios.reduce((sum, m) => sum + (m.eleitores_2024 || 0), 0);
        const totalPopulacao = municipios.reduce((sum, m) => sum + (m.populacao_2024 || 0), 0);
        const totalFiliados = municipios.reduce((sum, m) => sum + (m.filiados_psdb_2024 || 0), 0);

        const html = `
            <div class="regionais-detalhes-container">
                <div class="regionais-header-info">
                    <h2>
                        <i class="fas fa-map-marked-alt me-2"></i>
                        ${mesorregiaoNome}
                    </h2>
                    <div class="regionais-stats">
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${totalMunicipios}</div>
                            <div class="regionais-stats-label">Municípios</div>
                        </div>
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${totalEleitores.toLocaleString()}</div>
                            <div class="regionais-stats-label">Eleitores</div>
                        </div>
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${totalPopulacao.toLocaleString()}</div>
                            <div class="regionais-stats-label">População</div>
                        </div>
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${totalFiliados.toLocaleString()}</div>
                            <div class="regionais-stats-label">Filiados PSDB</div>
                        </div>
                    </div>
                </div>
                
                <div class="regionais-municipios-section">
                    <h3>🏘️ Municípios da Mesorregião</h3>
                    <div class="regionais-municipios-table">
                        <table class="regionais-table">
                            <thead>
                                <tr>
                                    <th>Município</th>
                                    <th>Regional PSDB</th>
                                    <th>Eleitores</th>
                                    <th>População</th>
                                    <th>Filiados PSDB</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${municipios.map(municipio => `
                                    <tr>
                                        <td class="regionais-table-nome">
                                            <a href="#" class="municipio-link" onclick="mostrarCandidatosMunicipio(${municipio.id}, '${municipio.nome}')" title="Clique para ver candidatos que receberam votos neste município">
                                                ${municipio.nome}
                                            </a>
                                        </td>
                                        <td class="regionais-table-regional">${municipio.regional_psdb || 'N/A'}</td>
                                        <td class="regionais-table-eleitores">${(municipio.eleitores_2024 || 0).toLocaleString()}</td>
                                        <td class="regionais-table-populacao">${(municipio.populacao_2024 || 0).toLocaleString()}</td>
                                        <td class="regionais-table-filiados">${(municipio.filiados_psdb_2024 || 0).toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                                <tr class="regionais-table-total">
                                    <td class="regionais-table-nome"><strong>TOTAL</strong></td>
                                    <td class="regionais-table-regional"><strong>-</strong></td>
                                    <td class="regionais-table-eleitores"><strong>${totalEleitores.toLocaleString()}</strong></td>
                                    <td class="regionais-table-populacao"><strong>${totalPopulacao.toLocaleString()}</strong></td>
                                    <td class="regionais-table-filiados"><strong>${totalFiliados.toLocaleString()}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    exibirResultadosRegionalEspecifica(data) {
        const container = document.getElementById('regionais-results');
        if (!container) {
            console.error('Elemento regionais-results não encontrado');
            return;
        }

        // Remover loader se existir
        const loader = container.querySelector('.table-loader');
        if (loader) {
            loader.remove();
        }

        const { regional, municipios, candidatos, estatisticas } = data;

        let html = `
            <div class="regionais-detalhes-container">
                <div class="regionais-header-info">
                    <h2>${regional.regional} - ${regional.mesorregiao}</h2>
                    <div class="regionais-stats-grid">
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${municipios.length}</div>
                            <div class="regionais-stats-label">Municípios</div>
                        </div>
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${estatisticas.candidatos_com_votos}</div>
                            <div class="regionais-stats-label">Candidatos com Votos</div>
                        </div>
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${estatisticas.total_votos.toLocaleString()}</div>
                            <div class="regionais-stats-label">Total de Votos</div>
                        </div>
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${regional.eleitores_total.toLocaleString()}</div>
                            <div class="regionais-stats-label">Eleitores</div>
                        </div>
                    </div>
                </div>
                
                <div class="regionais-municipios-section">
                    <h3>🏘️ Municípios da Regional</h3>
                    <div class="regionais-municipios-table">
                        <table class="regionais-table">
                            <thead>
                                <tr>
                                    <th>Município</th>
                                    <th>Eleitores</th>
                                    <th>População</th>
                                    <th>Filiados PSDB</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${municipios.map(municipio => `
                                    <tr>
                                        <td class="regionais-table-nome">
                                            <a href="#" class="municipio-link" onclick="mostrarCandidatosMunicipio(${municipio.id}, '${municipio.municipio}')" title="Clique para ver candidatos que receberam votos neste município">
                                                ${municipio.municipio}
                                            </a>
                                        </td>
                                        <td class="regionais-table-eleitores">${municipio.eleitores_2024.toLocaleString()}</td>
                                        <td class="regionais-table-populacao">${municipio.populacao_2024.toLocaleString()}</td>
                                        <td class="regionais-table-filiados">${municipio.filiados_psdb_2024.toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                                <tr class="regionais-table-total">
                                    <td class="regionais-table-nome"><strong>TOTAL</strong></td>
                                    <td class="regionais-table-eleitores"><strong>${municipios.reduce((sum, m) => sum + m.eleitores_2024, 0).toLocaleString()}</strong></td>
                                    <td class="regionais-table-populacao"><strong>${municipios.reduce((sum, m) => sum + m.populacao_2024, 0).toLocaleString()}</strong></td>
                                    <td class="regionais-table-filiados"><strong>${municipios.reduce((sum, m) => sum + m.filiados_psdb_2024, 0).toLocaleString()}</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="regionais-candidatos-section">
                    <h3>👥 Candidatos com Votos na Regional</h3>
                    <div class="regionais-candidatos-table">
                        <table class="regionais-table">
                            <thead>
                                <tr>
                                    <th>Candidato</th>
                                    <th>Cargo</th>
                                    <th>Partido</th>
                                    <th>Votos</th>
                                    <th>Municípios</th>
                                    <th>% Atendidos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${candidatos.map(candidato => `
                                    <tr>
                                        <td class="regionais-table-nome">
                                            <a href="perfil-candidato.html?id=${candidato.id}" class="candidato-link" title="Clique para ver o perfil completo do candidato">
                                                ${candidato.nome}
                                            </a>
                                        </td>
                                        <td class="regionais-table-cargo">${candidato.cargo}</td>
                                        <td class="regionais-table-partido">${candidato.sigla_partido || 'N/A'}</td>
                                        <td class="regionais-table-votos">${candidato.total_votos.toLocaleString()}</td>
                                        <td class="regionais-table-municipios">${candidato.municipios_com_votos}</td>
                                        <td class="regionais-table-percentual">${candidato.percentual_municipios_atendidos}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Função para mostrar candidatos de um município específico
    async mostrarCandidatosMunicipio(municipioId, nomeMunicipio) {
        try {
            // Mostrar loading
            const container = document.getElementById('regionais-results');
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <p class="mt-3">Carregando candidatos do município ${nomeMunicipio}...</p>
                </div>
            `;

            // Buscar candidatos do município
            const response = await fetch(`${this.apiBase}/regionais/candidatos-municipio/${municipioId}`);
            const data = await response.json();

            if (data.success) {
                this.exibirCandidatosMunicipio(nomeMunicipio, data.candidatos, data.municipio);
            } else {
                throw new Error(data.message || 'Erro ao carregar candidatos do município');
            }
        } catch (error) {
            console.error('Erro ao carregar candidatos do município:', error);
            this.mostrarErro('Erro ao carregar candidatos do município');
        }
    }

    // Exibir candidatos de um município específico
    exibirCandidatosMunicipio(nomeMunicipio, candidatos, municipio) {
        const container = document.getElementById('regionais-results');

        const html = `
            <div class="regionais-detalhes-container">
                <div class="regionais-header-info">
                    <h2>🏘️ ${nomeMunicipio}</h2>
                    <div class="regionais-stats-grid">
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${candidatos.length}</div>
                            <div class="regionais-stats-label">Candidatos com Votos</div>
                        </div>
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${municipio.eleitores_2024.toLocaleString()}</div>
                            <div class="regionais-stats-label">Eleitores</div>
                        </div>
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${municipio.populacao_2024.toLocaleString()}</div>
                            <div class="regionais-stats-label">População</div>
                        </div>
                        <div class="regionais-stats-card">
                            <div class="regionais-stats-number">${candidatos.reduce((sum, c) => sum + c.total_votos, 0).toLocaleString()}</div>
                            <div class="regionais-stats-label">Total de Votos</div>
                        </div>
                    </div>
                </div>
                
                <div class="regionais-candidatos-section">
                    <h3>👥 Candidatos com Votos em ${nomeMunicipio}</h3>
                    <div class="regionais-candidatos-table">
                        <table class="regionais-table">
                            <thead>
                                <tr>
                                    <th>Candidato</th>
                                    <th>Cargo</th>
                                    <th>Partido</th>
                                    <th>Votos</th>
                                    <th>% dos Eleitores</th>
                                    <th>% dos Votos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${candidatos.map(candidato => `
                                    <tr>
                                        <td class="regionais-table-nome">
                                            <a href="perfil-candidato.html?id=${candidato.id}" class="candidato-link" title="Clique para ver o perfil completo do candidato">
                                                ${candidato.nome}
                                            </a>
                                        </td>
                                        <td class="regionais-table-cargo">${candidato.cargo}</td>
                                        <td class="regionais-table-partido">${candidato.sigla_partido || 'N/A'}</td>
                                        <td class="regionais-table-votos">${candidato.total_votos.toLocaleString()}</td>
                                        <td class="regionais-table-percentual">${candidato.percentual_eleitores}%</td>
                                        <td class="regionais-table-percentual">${candidato.percentual_votos}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="mt-4">
                    <button class="btn btn-outline-secondary" onclick="window.history.back()">
                        <i class="fas fa-arrow-left me-2"></i>
                        Voltar
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    exibirEstatisticasTodasRegionais(data) {
        const container = document.getElementById('regionais-results');
        if (!container) {
            console.error('Elemento regionais-results não encontrado');
            return;
        }

        // Remover loader se existir
        const loader = container.querySelector('.table-loader');
        if (loader) {
            loader.remove();
        }

        const { regionais, totais } = data;

        // console.log('🔍 Dados carregados para todas as regionais:', { regionais: regionais.length, totais });
        // console.log('🔍 Primeira regional:', regionais[0]);

        let html = `
            <div class="regionais-todas-container">
                <div class="regionais-todas-header">
                    <h2>📊 Estatísticas de Todas as Regionais</h2>
                    <div class="regionais-todas-stats-grid">
                        <div class="regionais-todas-stats-card">
                            <div class="regionais-todas-stats-number">${regionais.length}</div>
                            <div class="regionais-todas-stats-label">Regionais</div>
                        </div>
                        <div class="regionais-todas-stats-card">
                            <div class="regionais-todas-stats-number">${totais.total_municipios.toLocaleString()}</div>
                            <div class="regionais-todas-stats-label">Municípios</div>
                        </div>
                        <div class="regionais-todas-stats-card">
                            <div class="regionais-todas-stats-number">${totais.eleitores_total.toLocaleString()}</div>
                            <div class="regionais-todas-stats-label">Eleitores</div>
                        </div>
                        <div class="regionais-todas-stats-card">
                            <div class="regionais-todas-stats-number">${totais.populacao_total.toLocaleString()}</div>
                            <div class="regionais-todas-stats-label">População</div>
                        </div>
                        <div class="regionais-todas-stats-card">
                            <div class="regionais-todas-stats-number">${totais.total_filiados.toLocaleString()}</div>
                            <div class="regionais-todas-stats-label">Filiados PSDB</div>
                        </div>
                        <div class="regionais-todas-stats-card">
                            <div class="regionais-todas-stats-number">${totais.total_candidatos_com_votos.toLocaleString()}</div>
                            <div class="regionais-todas-stats-label">Candidatos com Votos</div>
                        </div>
                    </div>
                </div>
                
                <div class="regionais-todas-table-section">
                    <h3>🏛️ Detalhes por Regional</h3>
                    <div class="regionais-todas-table-container">
                        <table class="regionais-todas-table">
                            <thead>
                                <tr>
                                    <th>Regional</th>
                                    <th>Mesorregião</th>
                                    <th>Municípios</th>
                                    <th>Eleitores</th>
                                    <th>População</th>
                                    <th>Filiados PSDB</th>
                                    <th>Candidatos com Votos</th>
                                    <th>Total de Votos</th>
                                    <th style="width: 50px;"></th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        regionais.forEach((regional, index) => {
            // Log específico para RIO DO SUL
            // if (regional.nome && regional.nome.includes('RIO DO SUL')) {
            //     console.log('🔍 Dados da regional RIO DO SUL:', regional);
            // }

            html += `
                <tr class="regionais-todas-table-row clickable" data-regional-id="${regional.id}" onclick="toggleMunicipiosRegional('${regional.id}', ${index})" title="Clique para ver municípios desta regional">
                    <td class="regionais-todas-table-regional">
                        <span class="regional-nome">${regional.regional}</span>
                    </td>
                    <td class="regionais-todas-table-mesorregiao">${regional.mesorregiao}</td>
                    <td class="regionais-todas-table-municipios">${parseInt(regional.total_municipios).toLocaleString()}</td>
                    <td class="regionais-todas-table-eleitores">${parseInt(regional.eleitores_total).toLocaleString()}</td>
                    <td class="regionais-todas-table-populacao">${parseInt(regional.populacao_total).toLocaleString()}</td>
                    <td class="regionais-todas-table-filiados">${parseInt(regional.total_filiados).toLocaleString()}</td>
                    <td class="regionais-todas-table-candidatos">${parseInt(regional.candidatos_com_votos).toLocaleString()}</td>
                    <td class="regionais-todas-table-votos">${parseInt(regional.total_votos).toLocaleString()}</td>
                    <td class="regionais-todas-table-expand" style="text-align: center; width: 50px;">
                        <i class="fas fa-chevron-right regional-expand-icon" id="regional-icon-${index}"></i>
                    </td>
                </tr>
                <tr class="municipios-regional-detalhes" id="municipios-regional-${index}" style="display: none;">
                    <td colspan="9">
                        <div class="municipios-regional-container">
                            <div class="loading-municipios-regional" id="loading-regional-${index}">
                                <i class="fas fa-spinner fa-spin"></i> Carregando municípios da regional...
                            </div>
                            <div id="municipios-regional-content-${index}" style="display: none;">
                                <!-- Conteúdo dos municípios será inserido aqui -->
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        });

        // Linha de totais
        html += `
                                <tr class="regionais-todas-table-total">
                                    <td class="regionais-todas-table-regional"><strong>TOTAL</strong></td>
                                    <td class="regionais-todas-table-mesorregiao">-</td>
                                    <td class="regionais-todas-table-municipios"><strong>${totais.total_municipios.toLocaleString()}</strong></td>
                                    <td class="regionais-todas-table-eleitores"><strong>${totais.eleitores_total.toLocaleString()}</strong></td>
                                    <td class="regionais-todas-table-populacao"><strong>${totais.populacao_total.toLocaleString()}</strong></td>
                                    <td class="regionais-todas-table-filiados"><strong>${totais.total_filiados.toLocaleString()}</strong></td>
                                    <td class="regionais-todas-table-candidatos"><strong>${totais.total_candidatos_com_votos.toLocaleString()}</strong></td>
                                    <td class="regionais-todas-table-votos"><strong>${totais.total_votos.toLocaleString()}</strong></td>
                                    <td class="regionais-todas-table-expand">-</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    // Função global para toggle de municípios de regional
    toggleMunicipiosRegional(regionalId, index) {
        console.log('toggleMunicipiosRegional chamado:', regionalId, index);

        const detalhesRow = document.getElementById(`municipios-regional-${index}`);
        const icon = document.getElementById(`regional-icon-${index}`);
        const loading = document.getElementById(`loading-regional-${index}`);
        const content = document.getElementById(`municipios-regional-content-${index}`);

        if (!detalhesRow || !icon) {
            console.error('Elementos não encontrados!');
            return;
        }

        if (detalhesRow.style.display === 'none') {
            // Fechar outras seções abertas primeiro
            document.querySelectorAll('.municipios-regional-detalhes').forEach(row => {
                if (row.id !== `municipios-regional-${index}`) {
                    row.style.display = 'none';
                    const otherIndex = row.id.split('-')[2];
                    const otherIcon = document.getElementById(`regional-icon-${otherIndex}`);
                    if (otherIcon) {
                        otherIcon.classList.remove('expanded');
                        otherIcon.style.transform = 'rotate(0deg)';
                    }
                }
            });

            // Abrir
            console.log('Abrindo seção de municípios da regional');
            detalhesRow.style.display = 'table-row';
            icon.classList.add('expanded');
            icon.style.transform = 'rotate(90deg)';

            // Se ainda não carregou os dados, carregar agora
            if (content && (content.innerHTML.trim() === '' || content.innerHTML.includes('<!-- Conteúdo dos municípios será inserido aqui -->'))) {
                this.carregarMunicipiosRegional(regionalId, index);
            }
        } else {
            // Fechar
            console.log('Fechando seção de municípios da regional');
            detalhesRow.style.display = 'none';
            icon.classList.remove('expanded');
            icon.style.transform = 'rotate(0deg)';
        }
    }

    // Função para carregar municípios de uma regional
    async carregarMunicipiosRegional(regionalId, index) {
        const loading = document.getElementById(`loading-regional-${index}`);
        const content = document.getElementById(`municipios-regional-content-${index}`);

        try {
            const response = await fetch(`${this.apiBase}/regionais/municipios?regional_id=${regionalId}`);
            const data = await response.json();

            if (loading) loading.style.display = 'none';

            if (data.success && data.data && data.data.length > 0) {
                this.exibirMunicipiosRegional(data.data, index);
            } else {
                if (content) {
                    content.innerHTML = '<div class="no-data">Nenhum município encontrado nesta regional</div>';
                }
            }
            if (content) content.style.display = 'block';
        } catch (error) {
            console.error('Erro ao carregar municípios da regional:', error);
            if (loading) loading.style.display = 'none';
            if (content) {
                content.innerHTML = '<div class="no-data">Erro ao carregar municípios da regional</div>';
                content.style.display = 'block';
            }
        }
    }

    // Função para exibir municípios de uma regional
    exibirMunicipiosRegional(municipios, index) {
        const content = document.getElementById(`municipios-regional-content-${index}`);

        const html = `
            <div class="municipios-regional-table">
                <table class="table table-sm table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Município</th>
                            <th>Eleitores</th>
                            <th>População</th>
                            <th>Filiados PSDB</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${municipios.map(municipio => `
                            <tr>
                                <td class="municipio-nome">
                                    <strong>${municipio.nome}</strong>
                                </td>
                                <td class="municipio-eleitores">${(municipio.eleitores_2024 || 0).toLocaleString()}</td>
                                <td class="municipio-populacao">${(municipio.populacao_2024 || 0).toLocaleString()}</td>
                                <td class="municipio-filiados">${(municipio.filiados_psdb_2024 || 0).toLocaleString()}</td>
                                <td class="municipio-acoes">
                                    <button class="btn btn-sm btn-outline-primary" 
                                            onclick="mostrarCandidatosMunicipio(${municipio.id}, '${municipio.nome}')" 
                                            title="Ver candidatos deste município">
                                        <i class="fas fa-users me-1"></i>
                                        Candidatos
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        content.innerHTML = html;
    }

    exibirResultadosRegionais(candidatos) {
        const container = document.getElementById('regionais-results');
        if (!container) {
            console.error('Elemento regionais-results não encontrado');
            return;
        }

        // Remover loader se existir
        const loader = container.querySelector('.table-loader');
        if (loader) {
            loader.remove();
        }

        // Agrupar candidatos por cargo (excluindo suplentes e vice-governador)
        const candidatosPorCargo = {};
        candidatos.forEach(candidato => {
            const cargo = candidato.cargo || 'Não informado';

            // Pular suplentes e vice-governador
            if (cargo.includes('Suplente') || cargo.includes('Vice-Governador')) {
                return;
            }

            if (!candidatosPorCargo[cargo]) {
                candidatosPorCargo[cargo] = [];
            }
            candidatosPorCargo[cargo].push(candidato);
        });

        let html = '';

        Object.entries(candidatosPorCargo).forEach(([cargo, candidatosCargo]) => {
            html += `
                <div class="regionais-chart-container">
                    <h3>${cargo}</h3>
                    <div class="regionais-candidatos-table">
                        <table class="regionais-table">
                            <thead>
                                <tr>
                                    <th>Candidato</th>
                                    <th>Partido</th>
                                    <th>Votos</th>
                                    <th>Municípios</th>
                                    <th>Mesorregião</th>
                                    <th>Regional PSDB</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${candidatosCargo.map(candidato => `
                                    <tr>
                                        <td class="regionais-table-nome">${candidato.nome}</td>
                                        <td class="regionais-table-partido">${candidato.sigla_partido || 'N/A'}</td>
                                        <td class="regionais-table-votos">${candidato.total_votos.toLocaleString()}</td>
                                        <td class="regionais-table-municipios">${candidato.municipios_com_votos}</td>
                                        <td class="regionais-table-mesorregiao">${candidato.mesorregiao}</td>
                                        <td class="regionais-table-regional">${candidato.regional_psdb}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    limparFiltrosRegionais() {
        const eleicaoSelect = document.getElementById('regionais-eleicao');
        const cargoSelect = document.getElementById('regionais-cargo');
        const mesorregiaoSelect = document.getElementById('regionais-mesorregiao');
        const regionalSelect = document.getElementById('regionais-regional');
        const resultsElement = document.getElementById('regionais-results');
        const noDataElement = document.getElementById('regionais-no-data');

        if (eleicaoSelect) eleicaoSelect.value = '';
        if (cargoSelect) cargoSelect.value = '';
        if (mesorregiaoSelect) mesorregiaoSelect.value = '';
        if (regionalSelect) regionalSelect.value = '';
        if (resultsElement) {
            resultsElement.innerHTML = '';
        }
        if (noDataElement) {
            noDataElement.style.display = 'block';
            noDataElement.textContent = 'Selecione uma eleição para visualizar a análise regional';
        }
    }

    // ===== FUNÇÕES PARA ABA DE CANDIDATOS =====

    async carregarEleicoesCandidatos() {
        try {
            const eleicaoSelect = document.getElementById('candidatos-eleicao');
            if (!eleicaoSelect) return;

            // Se já foi carregado, não carregar novamente
            if (eleicaoSelect.children.length > 1) return;

            // Usar dados mockados para melhor performance
            const eleicoes = window.EleicoesMock ? window.EleicoesMock.getEleicoes() : [];

            eleicaoSelect.innerHTML = '<option value="">Selecione uma eleição</option>';
            eleicoes.forEach(eleicao => {
                const option = document.createElement('option');
                option.value = eleicao.id;
                option.textContent = eleicao.descricao;
                eleicaoSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar eleições para candidatos:', error);
        }
    }

    async carregarCandidatosData() {
        try {
            const filtros = this.obterFiltrosCandidatos();

            if (!filtros.eleicao_id) {
                this.mostrarErro('Selecione uma eleição para buscar candidatos');
                return;
            }

            this.mostrarLoading('candidatos-body', 'Carregando candidatos...');

            const params = new URLSearchParams();
            Object.keys(filtros).forEach(key => {
                if (filtros[key]) {
                    params.append(key, filtros[key]);
                }
            });

            const response = await fetch(`${this.apiBase}/candidatos?${params}`);
            const data = await response.json();

            if (response.ok) {
                this.renderizarCandidatosTabela(data.data);
                this.atualizarEstatisticasCandidatos(data.data);
                this.atualizarPaginacaoCandidatos(data.pagination);
            } else {
                throw new Error(data.error || 'Erro ao carregar candidatos');
            }
        } catch (error) {
            console.error('Erro ao carregar candidatos:', error);
            this.mostrarErro('Erro ao carregar candidatos: ' + error.message);
        }
    }

    obterFiltrosCandidatos() {
        return {
            eleicao_id: document.getElementById('candidatos-eleicao')?.value || '',
            partido: document.getElementById('candidatos-partido')?.value || '',
            cargo: document.getElementById('candidatos-cargo')?.value || '',
            nome: document.getElementById('candidatos-nome')?.value || '',
            limite: document.getElementById('candidatos-limite')?.value || '100',
            pagina: 1
        };
    }

    renderizarCandidatosTabela(candidatos) {
        const tbody = document.getElementById('candidatos-body');
        if (!tbody) return;

        if (candidatos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>Nenhum candidato encontrado</h3>
                        <p>Não foram encontrados candidatos com os filtros aplicados</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = candidatos.map(candidato => {
            // Usar nome na urna se disponível, senão usar nome completo
            const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' && candidato.nome_urna !== '#NULO'
                ? candidato.nome_urna
                : candidato.nome || 'N/A';

            const hasFoto = candidato.foto && typeof candidato.foto === 'string' && candidato.foto.length > 3 && candidato.foto !== 'null' && candidato.foto !== 'undefined';
            const fotoUrl = hasFoto ? `/fotos_candidatos/${candidato.foto}` : 'assets/img/sem-foto.png';

            return `
            <tr>
                <td>
                    <img src="${fotoUrl}" loading="lazy" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.onerror=null;this.src='assets/img/sem-foto.png'">
                </td>
                <td>
                    <a href="perfil-candidato.html?id=${candidato.id}" class="candidato-link">
                        ${nomeExibir}
                    </a>
                </td>
                <td>${candidato.numero || 'N/A'}</td>
                <td>${candidato.cargo || 'N/A'}</td>
                <td>
                    <span class="partido-info">
                        <strong>${candidato.sigla_partido || 'N/A'}</strong>
                        ${candidato.nome_partido ? `<br><small>${candidato.nome_partido}</small>` : ''}
                    </span>
                </td>
                <td>
                    <span class="situacao ${candidato.descricao_situacao_candidatura === 'APTO' ? 'apto' : 'inapto'}">
                        ${candidato.descricao_situacao_candidatura || 'N/A'}
                    </span>
                </td>
                <td class="text-right">${parseInt(candidato.total_votos || 0).toLocaleString('pt-BR')}</td>
                <td>
                    <div class="action-buttons-small">
                        <a href="perfil-candidato.html?id=${candidato.id}" class="btn-small btn-primary" title="Ver perfil">
                            <i class="fas fa-user"></i>
                        </a>
                        <button class="btn-small btn-info" onclick="sistema.verVotosCandidato(${candidato.id})" title="Ver votos">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    }

    atualizarEstatisticasCandidatos(candidatos) {
        const statsContainer = document.getElementById('candidatos-stats');
        const statsGrid = document.getElementById('candidatos-stats-grid');

        if (!statsContainer || !statsGrid) return;

        if (candidatos.length === 0) {
            statsContainer.style.display = 'none';
            return;
        }

        const totalCandidatos = candidatos.length;
        const totalVotos = candidatos.reduce((sum, c) => sum + (parseInt(c.total_votos) || 0), 0);
        const candidatosAptos = candidatos.filter(c => c.descricao_situacao_candidatura === 'APTO').length;
        const candidatosInaptos = candidatos.filter(c => c.descricao_situacao_candidatura === 'INAPTO').length;

        const partidosUnicos = new Set(candidatos.map(c => c.sigla_partido).filter(p => p)).size;
        const cargosUnicos = new Set(candidatos.map(c => c.cargo).filter(c => c)).size;

        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-number">${totalCandidatos}</div>
                <div class="stat-label">Total de Candidatos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalVotos.toLocaleString('pt-BR')}</div>
                <div class="stat-label">Total de Votos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${candidatosAptos}</div>
                <div class="stat-label">Candidatos Aptos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${candidatosInaptos}</div>
                <div class="stat-label">Candidatos Inaptos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${partidosUnicos}</div>
                <div class="stat-label">Partidos Diferentes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${cargosUnicos}</div>
                <div class="stat-label">Cargos Diferentes</div>
            </div>
        `;

        statsContainer.style.display = 'block';
    }

    atualizarPaginacaoCandidatos(paginacao) {
        const pagination = document.getElementById('candidatos-pagination');
        if (!pagination || !paginacao) return;

        pagination.innerHTML = `
            <div class="pagination-info">
                Mostrando ${paginacao.pagina * paginacao.limite - paginacao.limite + 1} a ${Math.min(paginacao.pagina * paginacao.limite, paginacao.total)} de ${paginacao.total} candidatos
            </div>
        `;
    }

    limparFiltrosCandidatos() {
        document.getElementById('candidatos-eleicao').value = '';
        document.getElementById('candidatos-partido').value = '';
        document.getElementById('candidatos-cargo').value = '';
        document.getElementById('candidatos-nome').value = '';
        document.getElementById('candidatos-situacao').value = '';
        document.getElementById('candidatos-ordenar').value = 'total_votos';
        document.getElementById('candidatos-ordem').value = 'DESC';
        document.getElementById('candidatos-limite').value = '100';

        // Limpar tabela
        const tbody = document.getElementById('candidatos-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>Nenhum candidato encontrado</h3>
                        <p>Configure os filtros e clique em "Buscar Candidatos" para visualizar os dados</p>
                    </td>
                </tr>
            `;
        }

        // Ocultar estatísticas
        const statsContainer = document.getElementById('candidatos-stats');
        if (statsContainer) {
            statsContainer.style.display = 'none';
        }
    }

    async exportarCandidatos() {
        try {
            const filtros = this.obterFiltrosCandidatos();

            if (!filtros.eleicao_id) {
                this.mostrarErro('Selecione uma eleição para exportar candidatos');
                return;
            }

            // Implementar exportação para Excel
            this.mostrarErro('Funcionalidade de exportação será implementada em breve');
        } catch (error) {
            console.error('Erro ao exportar candidatos:', error);
            this.mostrarErro('Erro ao exportar candidatos: ' + error.message);
        }
    }

    verVotosCandidato(candidatoId) {
        // Redirecionar para a página de perfil do candidato
        window.open(`perfil-candidato.html?id=${candidatoId}`, '_blank');
    }

    mostrarLoading(elementId, mensagem = 'Carregando...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <tr>
                    <td colspan="7" class="loading-state">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>${mensagem}</span>
                    </td>
                </tr>
            `;
        }
    }

    // ===== MÉTODOS PARA ABA MUNICÍPIOS =====

    async buscarMunicipios() {
        try {
            const termo = document.getElementById('municipios-busca').value.trim();
            const eleicaoId = document.getElementById('municipios-eleicao').value;
            const ordenarPor = document.getElementById('municipios-ordenar').value;
            const ordem = document.getElementById('municipios-ordem').value;

            // Validar termo de busca
            if (!termo || termo.length < 2) {
                this.limparResultadosMunicipios();
                return;
            }

            // Mostrar loading
            this.mostrarLoadingMunicipios();

            // Construir parâmetros da busca
            const params = new URLSearchParams({
                q: termo,
                page: 1,
                limit: 20
            });

            if (eleicaoId) {
                params.append('eleicao_id', eleicaoId);
            }

            // Fazer requisição
            const response = await fetch(`${this.apiBase}/municipios/busca?${params}`);
            const data = await response.json();

            if (response.ok) {
                this.exibirResultadosMunicipios(data);
                this.atualizarEstatisticasMunicipios(data);
            } else {
                throw new Error(data.error || 'Erro ao buscar municípios');
            }

        } catch (error) {
            console.error('Erro ao buscar municípios:', error);
            this.mostrarErro('Erro ao buscar municípios: ' + error.message);
            this.ocultarLoadingMunicipios();
        }
    }

    mostrarLoadingMunicipios() {
        document.getElementById('municipios-loading').style.display = 'block';
        document.getElementById('municipios-no-data').style.display = 'none';
        document.getElementById('municipios-list').style.display = 'none';
        document.getElementById('municipios-pagination').style.display = 'none';
        document.getElementById('municipios-stats').style.display = 'none';
    }

    ocultarLoadingMunicipios() {
        document.getElementById('municipios-loading').style.display = 'none';
    }

    exibirResultadosMunicipios(data) {
        const container = document.getElementById('municipios-list');
        const noData = document.getElementById('municipios-no-data');
        const pagination = document.getElementById('municipios-pagination');

        if (data.data && data.data.length > 0) {
            container.innerHTML = data.data.map(municipio => this.criarCardMunicipio(municipio)).join('');
            container.style.display = 'block';
            noData.style.display = 'none';

            // Atualizar paginação
            this.atualizarPaginacaoMunicipios(data.pagination, pagination);
        } else {
            container.style.display = 'none';
            noData.innerHTML = `
                <i class="fas fa-search"></i>
                <h3>Nenhum município encontrado</h3>
                <p>Tente ajustar os termos de busca ou filtros</p>
            `;
            noData.style.display = 'block';
            pagination.style.display = 'none';
        }

        this.ocultarLoadingMunicipios();
    }

    criarCardMunicipio(municipio) {
        const candidatosNomes = municipio.candidatos_nomes ? municipio.candidatos_nomes.slice(0, 3) : [];
        const cargos = municipio.cargos ? municipio.cargos.slice(0, 3) : [];

        return `
            <div class="municipio-card" onclick="verDetalhesMunicipio(${municipio.id}, '${municipio.nome}')">
                <div class="municipio-card-header">
                    <h3 class="municipio-nome">${municipio.nome}</h3>
                    <span class="municipio-uf">${municipio.sigla_uf}</span>
                </div>
                
                <div class="municipio-stats">
                    <div class="municipio-stat">
                        <span class="municipio-stat-number">${municipio.total_candidatos || 0}</span>
                        <span class="municipio-stat-label">Candidatos</span>
                    </div>
                    <div class="municipio-stat">
                        <span class="municipio-stat-number">${this.formatarNumero(municipio.total_votos || 0)}</span>
                        <span class="municipio-stat-label">Votos</span>
                    </div>
                    <div class="municipio-stat">
                        <span class="municipio-stat-number">${municipio.total_eleicoes || 0}</span>
                        <span class="municipio-stat-label">Eleições</span>
                    </div>
                </div>

                ${candidatosNomes.length > 0 ? `
                    <div class="municipio-candidatos">
                        <h4>Principais Candidatos:</h4>
                        <div class="candidatos-tags">
                            ${candidatosNomes.map(nome => `<span class="candidato-tag">${nome}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                ${cargos.length > 0 ? `
                    <div class="municipio-candidatos">
                        <h4>Cargos:</h4>
                        <div class="candidatos-tags">
                            ${cargos.map(cargo => `<span class="cargo-tag">${cargo}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="municipio-acoes">
                    <button class="btn-ver-detalhes">
                        <i class="fas fa-eye"></i>
                        Ver Detalhes
                    </button>
                </div>
            </div>
        `;
    }

    atualizarEstatisticasMunicipios(data) {
        const statsContainer = document.getElementById('municipios-stats');
        const statsGrid = document.getElementById('municipios-stats-grid');

        if (data.pagination && data.pagination.total > 0) {
            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-city"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${data.pagination.total}</h3>
                        <p>Municípios Encontrados</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${data.data.reduce((total, m) => total + (m.total_candidatos || 0), 0)}</h3>
                        <p>Total de Candidatos</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-vote-yea"></i>
                    </div>
                    <div class="stat-content">
                        <h3>${this.formatarNumero(data.data.reduce((total, m) => total + (m.total_votos || 0), 0))}</h3>
                        <p>Total de Votos</p>
                    </div>
                </div>
            `;
            statsContainer.style.display = 'block';
        } else {
            statsContainer.style.display = 'none';
        }
    }

    atualizarPaginacaoMunicipios(pagination, container) {
        if (pagination.pages > 1) {
            let html = '<div class="pagination">';

            // Botão anterior
            if (pagination.page > 1) {
                html += `<button class="btn btn-secondary" onclick="sistema.buscarMunicipiosPagina(${pagination.page - 1})">
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>`;
            }

            // Páginas
            const startPage = Math.max(1, pagination.page - 2);
            const endPage = Math.min(pagination.pages, pagination.page + 2);

            for (let i = startPage; i <= endPage; i++) {
                const active = i === pagination.page ? 'active' : '';
                html += `<button class="btn ${active}" onclick="sistema.buscarMunicipiosPagina(${i})">${i}</button>`;
            }

            // Botão próximo
            if (pagination.page < pagination.pages) {
                html += `<button class="btn btn-secondary" onclick="sistema.buscarMunicipiosPagina(${pagination.page + 1})">
                    Próximo <i class="fas fa-chevron-right"></i>
                </button>`;
            }

            html += '</div>';
            container.innerHTML = html;
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }

    async buscarMunicipiosPagina(pagina) {
        // Implementar busca por página específica
        const termo = document.getElementById('municipios-busca').value.trim();
        const eleicaoId = document.getElementById('municipios-eleicao').value;

        const params = new URLSearchParams({
            q: termo,
            page: pagina,
            limit: 20
        });

        if (eleicaoId) {
            params.append('eleicao_id', eleicaoId);
        }

        try {
            this.mostrarLoadingMunicipios();
            const response = await fetch(`${this.apiBase}/municipios/busca?${params}`);
            const data = await response.json();

            if (response.ok) {
                this.exibirResultadosMunicipios(data);
                this.atualizarEstatisticasMunicipios(data);
            } else {
                throw new Error(data.error || 'Erro ao buscar municípios');
            }
        } catch (error) {
            console.error('Erro ao buscar municípios:', error);
            this.mostrarErro('Erro ao buscar municípios: ' + error.message);
            this.ocultarLoadingMunicipios();
        }
    }

    async verDetalhesMunicipio(municipioId, nomeMunicipio) {
        try {
            // Buscar informações detalhadas do município
            const response = await fetch(`${this.apiBase}/municipios/${municipioId}`);
            const municipio = await response.json();

            if (response.ok) {
                this.exibirModalMunicipio(municipio, nomeMunicipio);
            } else {
                throw new Error(municipio.error || 'Erro ao buscar detalhes do município');
            }
        } catch (error) {
            console.error('Erro ao buscar detalhes do município:', error);
            this.mostrarErro('Erro ao buscar detalhes do município: ' + error.message);
        }
    }

    exibirModalMunicipio(municipio, nomeMunicipio) {
        const modal = document.getElementById('modal-municipio');
        const titulo = document.getElementById('modal-municipio-titulo');
        const info = document.getElementById('municipio-info');

        titulo.textContent = `Detalhes - ${nomeMunicipio}`;

        info.innerHTML = `
            <div class="municipio-info-header">
                <h3 class="municipio-info-nome">${municipio.nome}</h3>
                <span class="municipio-uf">${municipio.sigla_uf}</span>
            </div>
            <div class="municipio-info-detalhes">
                <div class="municipio-info-item">
                    <span class="municipio-info-label">Código IBGE</span>
                    <span class="municipio-info-value">${municipio.codigo}</span>
                </div>
                <div class="municipio-info-item">
                    <span class="municipio-info-label">Total de Candidatos</span>
                    <span class="municipio-info-value">${municipio.candidatos_votados || 0}</span>
                </div>
                <div class="municipio-info-item">
                    <span class="municipio-info-label">Total de Votos</span>
                    <span class="municipio-info-value">${this.formatarNumero(municipio.total_votos || 0)}</span>
                </div>
                <div class="municipio-info-item">
                    <span class="municipio-info-label">Eleições Participou</span>
                    <span class="municipio-info-value">${municipio.eleicoes_participou || 0}</span>
                </div>
                ${municipio.latitude && municipio.longitude ? `
                    <div class="municipio-info-item">
                        <span class="municipio-info-label">Coordenadas</span>
                        <span class="municipio-info-value">${municipio.latitude.toFixed(4)}, ${municipio.longitude.toFixed(4)}</span>
                    </div>
                ` : ''}
            </div>
        `;

        // Armazenar ID do município no modal para uso posterior
        modal.setAttribute('data-municipio-id', municipio.id);

        // Carregar candidatos do município
        this.carregarCandidatosMunicipio(municipio.id);

        // Carregar cargos para o modal
        this.carregarCargosModal();

        // Configurar event listeners do modal
        this.configurarEventListenersModal();

        // Fechar ao clicar fora do modal
        window.onclick = (event) => {
            if (event.target == modal) {
                this.fecharModalMunicipio();
            }
        }

        modal.style.display = 'block';
    }

    fecharModalMunicipio() {
        document.getElementById('modal-municipio').style.display = 'none';
    }

    async carregarCargosModal() {
        try {
            const select = document.getElementById('modal-cargo');
            if (!select) return;

            // Se já foi carregado, não carregar novamente
            if (select.children.length > 1) return;

            // Usar cargos fixos conhecidos (mais confiável)
            const cargos = [
                'Governador',
                'Vice-Governador',
                'Deputado Federal',
                'Deputado Estadual',
                'Senador'
            ];

            select.innerHTML = '<option value="">Todos os cargos</option>';
            cargos.forEach(cargo => {
                const option = document.createElement('option');
                option.value = cargo;
                option.textContent = cargo;
                select.appendChild(option);
            });
            console.log('✅ Cargos carregados no modal');
        } catch (error) {
            console.error('Erro ao carregar cargos para modal:', error);
        }
    }

    configurarEventListenersModal() {
        // Event listener para filtro de eleição
        document.getElementById('modal-eleicao')?.addEventListener('change', () => {
            this.carregarCandidatosMunicipio();
        });

        // Event listener para filtro de cargo
        document.getElementById('modal-cargo')?.addEventListener('change', () => {
            this.carregarCandidatosMunicipio();
        });

        // Event listener para ordenação
        document.getElementById('modal-ordenar')?.addEventListener('change', () => {
            this.carregarCandidatosMunicipio();
        });

        // Event listener para botão filtrar
        document.getElementById('modal-filtrar')?.addEventListener('click', () => {
            this.carregarCandidatosMunicipio();
        });
    }

    async carregarCandidatosMunicipio(municipioId = null) {
        try {
            // Se não foi passado municipioId, pegar do modal atual
            if (!municipioId) {
                const modal = document.getElementById('modal-municipio');
                if (modal.style.display === 'none') return;

                // Pegar ID do município armazenado no modal
                municipioId = modal.getAttribute('data-municipio-id');
                if (!municipioId) {
                    console.warn('ID do município não encontrado no modal');
                    return;
                }
            }

            const eleicaoId = document.getElementById('modal-eleicao').value;
            const cargo = document.getElementById('modal-cargo').value;
            const ordenarPor = document.getElementById('modal-ordenar').value;

            // Mostrar loading
            document.getElementById('candidatos-loading').style.display = 'block';

            // Construir parâmetros
            const params = new URLSearchParams({
                page: 1,
                limit: 50
            });

            if (eleicaoId) params.append('eleicao_id', eleicaoId);
            if (cargo) params.append('cargo', cargo);
            params.append('ordenar_por', ordenarPor);

            // Fazer requisição
            const response = await fetch(`${this.apiBase}/municipios/${municipioId}/candidatos?${params}`);
            const data = await response.json();

            if (response.ok) {
                this.exibirCandidatosMunicipio(data);
            } else {
                throw new Error(data.error || 'Erro ao buscar candidatos do município');
            }

        } catch (error) {
            console.error('Erro ao carregar candidatos do município:', error);
            this.mostrarErro('Erro ao carregar candidatos: ' + error.message);
        } finally {
            document.getElementById('candidatos-loading').style.display = 'none';
        }
    }

    exibirCandidatosMunicipio(data) {
        const tbody = document.getElementById('candidatos-modal-body');
        const pagination = document.getElementById('candidatos-modal-pagination');

        if (data.data && data.data.length > 0) {
            tbody.innerHTML = data.data.map(candidato => `
                <tr>
                    <td>
                        <div class="candidato-info">
                            ${candidato.foto ?
                    `<img src="/fotos_candidatos/${candidato.foto}" alt="${candidato.candidato_nome}" class="candidato-foto" onerror="this.src='/fotos_candidatos/sem-foto.jpg'">` :
                    `<div class="candidato-foto-placeholder"><i class="fas fa-user"></i></div>`
                }
                            <span class="candidato-nome">${candidato.candidato_nome}</span>
                        </div>
                    </td>
                    <td>${candidato.numero}</td>
                    <td>${candidato.cargo}</td>
                    <td>${candidato.partido}</td>
                    <td>${this.formatarNumero(candidato.total_votos)}</td>
                    <td>${candidato.eleicao_ano} - ${candidato.eleicao_tipo}</td>
                </tr>
            `).join('');

            // Atualizar paginação se necessário
            if (data.pagination && data.pagination.pages > 1) {
                // Implementar paginação para candidatos se necessário
                pagination.style.display = 'block';
            } else {
                pagination.style.display = 'none';
            }
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-users"></i>
                        <h3>Nenhum candidato encontrado</h3>
                        <p>Tente ajustar os filtros</p>
                    </td>
                </tr>
            `;
            pagination.style.display = 'none';
        }
    }

    formatarNumero(numero) {
        return new Intl.NumberFormat('pt-BR').format(numero);
    }

    limparResultadosMunicipios() {
        document.getElementById('municipios-loading').style.display = 'none';
        document.getElementById('municipios-list').style.display = 'none';
        document.getElementById('municipios-pagination').style.display = 'none';
        document.getElementById('municipios-stats').style.display = 'none';

        const noData = document.getElementById('municipios-no-data');
        noData.innerHTML = `
            <i class="fas fa-city"></i>
            <h3>Nenhuma busca realizada</h3>
            <p>Digite o nome de um município e clique em "Buscar" para visualizar os resultados</p>
        `;
        noData.style.display = 'block';
    }

    async carregarEleicoesMunicipios() {
        try {
            console.log('🔄 Carregando eleições para aba municípios...');

            // Carregar eleições para o seletor da aba municípios
            const select = document.getElementById('municipios-eleicao');
            const modalSelect = document.getElementById('modal-eleicao');

            if (!select) {
                console.warn('⚠️ Select de eleições não encontrado');
                return;
            }

            // Se já foi carregado, não carregar novamente
            if (select.children.length > 1) {
                console.log('✅ Eleições já carregadas no dropdown');
                return;
            }

            // Carregar eleições diretamente da API (método mais confiável)
            const response = await fetch(`${this.apiBase}/eleicoes`);
            const result = await response.json();
            const eleicoes = result.data || result;

            if (!eleicoes || eleicoes.length === 0) {
                console.warn('⚠️ Nenhuma eleição encontrada na API');
                return;
            }

            console.log(`📋 Carregando ${eleicoes.length} eleições no dropdown`);
            select.innerHTML = '<option value="">Todas as eleições</option>';
            eleicoes.forEach(eleicao => {
                const option = document.createElement('option');
                option.value = eleicao.id;
                option.textContent = `${eleicao.ano} - ${eleicao.tipo} (${eleicao.turno}º Turno)`;
                select.appendChild(option);
            });
            console.log('✅ Eleições carregadas no dropdown principal');

            // Carregar também no modal
            if (modalSelect) {
                modalSelect.innerHTML = '<option value="">Todas as eleições</option>';
                eleicoes.forEach(eleicao => {
                    const option = document.createElement('option');
                    option.value = eleicao.id;
                    option.textContent = `${eleicao.ano} - ${eleicao.tipo} (${eleicao.turno}º Turno)`;
                    modalSelect.appendChild(option);
                });
                console.log('✅ Eleições carregadas no dropdown do modal');
            }
        } catch (error) {
            console.error('Erro ao carregar eleições para municípios:', error);
        }
    }
}

// Funções globais para compatibilidade
function carregarTabela() {
    sistema.carregarTabela();
}

function carregarMapa() {
    sistema.carregarMapa();
}

function processarUpload() {
    sistema.processarUpload();
}

function cancelarUpload() {
    sistema.cancelarUpload();
}

function baixarTemplate() {
    sistema.baixarTemplate();
}

function limparBaseDados() {
    sistema.limparBaseDados();
}

function criarRelatorio() {
    sistema.criarRelatorio();
}

function salvarRelatorio() {
    sistema.salvarRelatorio();
}

function fecharModal() {
    sistema.fecharModal();
}

function limparFiltrosTabela() {
    sistema.limparFiltrosTabela();
}

// Funções de exportação
function exportarExcel() {
    sistema.exportarExcel();
}

function exportarPDF() {
    sistema.exportarPDF();
}

function imprimirTabela() {
    sistema.imprimirTabela();
}

// Função global para mostrar candidatos de um município
function mostrarCandidatosMunicipio(municipioId, nomeMunicipio) {
    if (sistema) {
        sistema.mostrarCandidatosMunicipio(municipioId, nomeMunicipio);
    } else {
        console.error('Sistema não inicializado ainda');
    }
}

// Função global para toggle de municípios de regional
function toggleMunicipiosRegional(regionalId, index) {
    if (sistema) {
        sistema.toggleMunicipiosRegional(regionalId, index);
    } else {
        console.error('Sistema não inicializado ainda');
    }
}

// Funções globais para aba Municípios
function buscarMunicipios() {
    if (sistema) {
        sistema.buscarMunicipios();
    } else {
        console.error('Sistema não inicializado ainda');
    }
}

function verDetalhesMunicipio(municipioId, nomeMunicipio) {
    if (sistema) {
        sistema.verDetalhesMunicipio(municipioId, nomeMunicipio);
    } else {
        console.error('Sistema não inicializado ainda');
    }
}

function fecharModalMunicipio() {
    if (sistema) {
        sistema.fecharModalMunicipio();
    } else {
        console.error('Sistema não inicializado ainda');
    }
}

function carregarCandidatosMunicipio() {
    if (sistema) {
        sistema.carregarCandidatosMunicipio();
    } else {
        console.error('Sistema não inicializado ainda');
    }
}

// Inicializar aplicação
let sistema;
document.addEventListener('DOMContentLoaded', () => {
    sistema = new SistemaEleitoral();
});

// Adicionar estilos para notificações
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
