// Script para análises com dados complementares
class AnaliseComplementar {
    constructor() {
        this.dadosCarregados = false;
        this.estatisticas = {};
    }

    // Carregar estatísticas dos dados complementares
    async carregarEstatisticas() {
        try {
            const response = await fetch('/api/analise-complementar/estatisticas');
            const data = await response.json();
            
            if (response.ok) {
                this.estatisticas = data;
                this.dadosCarregados = true;
                this.exibirEstatisticas();
            } else {
                console.error('Erro ao carregar estatísticas:', data.error);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    }

    // Exibir estatísticas na interface
    exibirEstatisticas() {
        if (!this.dadosCarregados) return;

        // Atualizar dashboard com estatísticas complementares
        this.atualizarDashboard();
        
        // Adicionar filtros avançados
        this.adicionarFiltrosAvancados();
        
        // Criar gráficos de análise
        this.criarGraficosAnalise();
    }

    // Atualizar dashboard com dados complementares
    atualizarDashboard() {
        const dashboard = document.getElementById('dashboard');
        if (!dashboard) return;

        // Adicionar seção de estatísticas complementares
        const statsSection = document.createElement('div');
        statsSection.className = 'stats-section';
        statsSection.innerHTML = `
            <div class="section-header">
                <h3>📊 Análise Complementar dos Candidatos</h3>
            </div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${this.estatisticas.total_candidatos || 0}</div>
                    <div class="stat-label">Total de Candidatos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${this.estatisticas.candidatos_deferidos || 0}</div>
                    <div class="stat-label">Deferidos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${this.estatisticas.candidatos_indeferidos || 0}</div>
                    <div class="stat-label">Indeferidos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${this.estatisticas.candidatos_renuncia || 0}</div>
                    <div class="stat-label">Renúncias</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">R$ ${this.estatisticas.despesa_media || 0}</div>
                    <div class="stat-label">Despesa Média</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${this.estatisticas.reeleicoes || 0}</div>
                    <div class="stat-label">Reeleições</div>
                </div>
            </div>
        `;

        // Inserir após o conteúdo existente do dashboard
        const existingContent = dashboard.querySelector('.dashboard-content');
        if (existingContent) {
            existingContent.appendChild(statsSection);
        }
    }

    // Adicionar filtros avançados
    adicionarFiltrosAvancados() {
        const candidatosTab = document.getElementById('candidatos');
        if (!candidatosTab) return;

        // Adicionar filtros por situação da candidatura
        const filtrosContainer = candidatosTab.querySelector('.filtros-container');
        if (filtrosContainer) {
            const filtrosAvancados = document.createElement('div');
            filtrosAvancados.className = 'filtros-avancados';
            filtrosAvancados.innerHTML = `
                <h4>🔍 Filtros Avançados</h4>
                <div class="filtro-row">
                    <label for="filtro-situacao">Situação da Candidatura:</label>
                    <select id="filtro-situacao">
                        <option value="">Todas as situações</option>
                        <option value="DEFERIDO">Deferido</option>
                        <option value="INDEFERIDO">Indeferido</option>
                        <option value="RENÚNCIA">Renúncia</option>
                        <option value="CANCELADO">Cancelado</option>
                    </select>
                </div>
                <div class="filtro-row">
                    <label for="filtro-reeleicao">Reeleição:</label>
                    <select id="filtro-reeleicao">
                        <option value="">Todas</option>
                        <option value="S">Sim</option>
                        <option value="N">Não</option>
                    </select>
                </div>
                <div class="filtro-row">
                    <label for="filtro-despesa-min">Despesa Mínima (R$):</label>
                    <input type="number" id="filtro-despesa-min" placeholder="0">
                </div>
                <div class="filtro-row">
                    <label for="filtro-despesa-max">Despesa Máxima (R$):</label>
                    <input type="number" id="filtro-despesa-max" placeholder="1000000">
                </div>
                <div class="filtro-row">
                    <label for="filtro-nacionalidade">Nacionalidade:</label>
                    <select id="filtro-nacionalidade">
                        <option value="">Todas</option>
                        <option value="BRASILEIRA NATA">Brasileira Nata</option>
                        <option value="BRASILEIRA (NATURALIZADA)">Brasileira Naturalizada</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="analiseComplementar.aplicarFiltros()">
                    <i class="fas fa-filter"></i> Aplicar Filtros
                </button>
                <button class="btn btn-secondary" onclick="analiseComplementar.limparFiltros()">
                    <i class="fas fa-times"></i> Limpar
                </button>
            `;
            
            filtrosContainer.appendChild(filtrosAvancados);
        }
    }

    // Aplicar filtros avançados
    async aplicarFiltros() {
        const filtros = {
            situacao: document.getElementById('filtro-situacao')?.value,
            reeleicao: document.getElementById('filtro-reeleicao')?.value,
            despesaMin: document.getElementById('filtro-despesa-min')?.value,
            despesaMax: document.getElementById('filtro-despesa-max')?.value,
            nacionalidade: document.getElementById('filtro-nacionalidade')?.value
        };

        // Remover filtros vazios
        Object.keys(filtros).forEach(key => {
            if (!filtros[key]) delete filtros[key];
        });

        try {
            const params = new URLSearchParams(filtros);
            const response = await fetch(`/api/candidatos?${params}`);
            const data = await response.json();
            
            if (response.ok) {
                this.exibirResultadosFiltrados(data.data);
            } else {
                console.error('Erro ao aplicar filtros:', data.error);
            }
        } catch (error) {
            console.error('Erro na requisição:', error);
        }
    }

    // Limpar filtros
    limparFiltros() {
        document.getElementById('filtro-situacao').value = '';
        document.getElementById('filtro-reeleicao').value = '';
        document.getElementById('filtro-despesa-min').value = '';
        document.getElementById('filtro-despesa-max').value = '';
        document.getElementById('filtro-nacionalidade').value = '';
        
        // Recarregar lista de candidatos
        this.carregarCandidatos();
    }

    // Exibir resultados filtrados
    exibirResultadosFiltrados(candidatos) {
        const tabela = document.getElementById('tabela-candidatos');
        if (!tabela) return;

        const tbody = tabela.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        candidatos.forEach(candidato => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${candidato.nome_urna || candidato.nome}</td>
                <td>${candidato.cargo}</td>
                <td>${candidato.sigla_partido}</td>
                <td>${candidato.descricao_situacao_candidatura || 'N/A'}</td>
                <td>${candidato.total_votos ? candidato.total_votos.toLocaleString('pt-BR') : 0}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="verPerfil(${candidato.id})">
                        <i class="fas fa-eye"></i> Ver Perfil
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Criar gráficos de análise
    criarGraficosAnalise() {
        // Implementar gráficos com Chart.js ou similar
        this.criarGraficoSituacoes();
        this.criarGraficoDespesas();
        this.criarGraficoNacionalidades();
    }

    // Gráfico de situações dos candidatos
    criarGraficoSituacoes() {
        const canvas = document.getElementById('grafico-situacoes');
        if (!canvas || !this.estatisticas.situacoes) return;

        // Implementar gráfico de pizza com situações
        const ctx = canvas.getContext('2d');
        // Código do gráfico seria implementado aqui
    }

    // Gráfico de despesas de campanha
    criarGraficoDespesas() {
        const canvas = document.getElementById('grafico-despesas');
        if (!canvas || !this.estatisticas.despesas) return;

        // Implementar gráfico de barras com despesas
        const ctx = canvas.getContext('2d');
        // Código do gráfico seria implementado aqui
    }

    // Gráfico de nacionalidades
    criarGraficoNacionalidades() {
        const canvas = document.getElementById('grafico-nacionalidades');
        if (!canvas || !this.estatisticas.nacionalidades) return;

        // Implementar gráfico de nacionalidades
        const ctx = canvas.getContext('2d');
        // Código do gráfico seria implementado aqui
    }

    // Carregar candidatos (método auxiliar)
    async carregarCandidatos() {
        try {
            const response = await fetch('/api/candidatos');
            const data = await response.json();
            
            if (response.ok) {
                this.exibirResultadosFiltrados(data.data);
            }
        } catch (error) {
            console.error('Erro ao carregar candidatos:', error);
        }
    }
}

// Instanciar classe globalmente
const analiseComplementar = new AnaliseComplementar();

// Carregar dados quando a página estiver pronta
document.addEventListener('DOMContentLoaded', () => {
    analiseComplementar.carregarEstatisticas();
});
