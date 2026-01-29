// Análise Regional - JavaScript
let dadosRegionais = {
    mesorregioes: [],
    regionais: [],
    candidatos: [],
    estatisticas: null
};

// Inicializar página
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando análise regional...');
    carregarDadosIniciais();
});

// Carregar dados iniciais
async function carregarDadosIniciais() {
    try {
        // Carregar estatísticas gerais
        await carregarEstatisticasGerais();
        
        // Carregar mesorregiões
        await carregarMesorregioes();
        
        // Carregar regionais PSDB
        await carregarRegionaisPSDB();
        
        // Carregar candidatos
        await carregarCandidatos();
        
        console.log('✅ Dados iniciais carregados com sucesso');
    } catch (error) {
        console.error('❌ Erro ao carregar dados iniciais:', error);
        mostrarErro('Erro ao carregar dados iniciais');
    }
}

// Carregar estatísticas gerais
async function carregarEstatisticasGerais() {
    try {
        const response = await fetch('/api/regionais/estatisticas-gerais');
        const data = await response.json();
        
        if (data.success) {
            dadosRegionais.estatisticas = data.estatisticas_gerais;
            dadosRegionais.mesorregioes = data.mesorregioes;
            exibirEstatisticasGerais(data.estatisticas_gerais, data.mesorregioes);
        } else {
            throw new Error(data.message || 'Erro ao carregar estatísticas');
        }
    } catch (error) {
        console.error('Erro ao carregar estatísticas gerais:', error);
        throw error;
    }
}

// Exibir estatísticas gerais
function exibirEstatisticasGerais(stats, mesorregioes) {
    const container = document.getElementById('estatisticas-gerais');
    
    const html = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${stats.total_mesorregioes}</div>
                <div class="stat-label">Mesorregiões</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.total_regionais}</div>
                <div class="stat-label">Regionais PSDB</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${stats.total_municipios}</div>
                <div class="stat-label">Municípios</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${formatarNumeroCompleto(stats.populacao_total)}</div>
                <div class="stat-label">População Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${formatarNumeroCompleto(stats.eleitores_total)}</div>
                <div class="stat-label">Eleitores</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${formatarNumeroCompleto(stats.filiados_psdb_total)}</div>
                <div class="stat-label">Filiados PSDB</div>
            </div>
        </div>
        
        <div class="mt-4">
            <h6>Distribuição por Mesorregião</h6>
            <div class="row">
                ${mesorregioes.map(reg => `
                    <div class="col-md-4 mb-2">
                        <div class="d-flex justify-content-between">
                            <span>${reg.mesorregiao}</span>
                            <span class="region-badge">${formatarNumero(reg.populacao)} hab</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Carregar mesorregiões
async function carregarMesorregioes() {
    try {
        const response = await fetch('/api/regionais/mesorregioes');
        const data = await response.json();
        
        if (data.success) {
            dadosRegionais.mesorregioes = data.data;
            preencherSelectMesorregioes(data.data);
        } else {
            throw new Error(data.message || 'Erro ao carregar mesorregiões');
        }
    } catch (error) {
        console.error('Erro ao carregar mesorregiões:', error);
        throw error;
    }
}

// Preencher select de mesorregiões
function preencherSelectMesorregioes(mesorregioes) {
    const select = document.getElementById('filtro-mesorregiao');
    select.innerHTML = '<option value="">Todas as mesorregiões</option>';
    
    mesorregioes.forEach(mesorregiao => {
        const option = document.createElement('option');
        option.value = mesorregiao.id;
        option.textContent = `${mesorregiao.nome} (${mesorregiao.total_municipios} municípios)`;
        select.appendChild(option);
    });
}

// Carregar regionais PSDB
async function carregarRegionaisPSDB() {
    try {
        const response = await fetch('/api/regionais/regionais-psdb');
        const data = await response.json();
        
        if (data.success) {
            dadosRegionais.regionais = data.data;
            preencherSelectRegionais(data.data);
        } else {
            throw new Error(data.message || 'Erro ao carregar regionais');
        }
    } catch (error) {
        console.error('Erro ao carregar regionais PSDB:', error);
        throw error;
    }
}

// Preencher select de regionais
function preencherSelectRegionais(regionais) {
    const select = document.getElementById('filtro-regional');
    select.innerHTML = '<option value="">Todas as regionais</option>';
    
    regionais.forEach(regional => {
        const option = document.createElement('option');
        option.value = regional.id;
        option.textContent = `${regional.nome} (${regional.mesorregiao})`;
        select.appendChild(option);
    });
}

// Carregar candidatos
async function carregarCandidatos() {
    try {
        const response = await fetch('/api/regionais/candidatos-por-regiao');
        const data = await response.json();
        
        if (data.success) {
            dadosRegionais.candidatos = data.data;
            exibirCandidatos(data.data);
        } else {
            throw new Error(data.message || 'Erro ao carregar candidatos');
        }
    } catch (error) {
        console.error('Erro ao carregar candidatos:', error);
        throw error;
    }
}

// Exibir candidatos
function exibirCandidatos(candidatos) {
    const container = document.getElementById('resultados-candidatos');
    const totalElement = document.getElementById('total-resultados');
    
    totalElement.textContent = `${candidatos.length} resultados`;
    
    if (candidatos.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">Nenhum candidato encontrado</h5>
                <p class="text-muted">Tente ajustar os filtros de pesquisa</p>
            </div>
        `;
        return;
    }
    
    const html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead class="table-dark">
                    <tr>
                        <th>Candidato</th>
                        <th>Cargo</th>
                        <th>Partido</th>
                        <th>Total de Votos</th>
                        <th>Municípios</th>
                        <th>Região</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${candidatos.map(candidato => `
                        <tr class="candidate-row">
                            <td>
                                <strong>${candidato.nome}</strong>
                            </td>
                            <td>
                                <span class="badge bg-info">${candidato.cargo}</span>
                            </td>
                            <td>
                                ${candidato.sigla_partido ? 
                                    `<span class="badge bg-secondary">${candidato.sigla_partido}</span>` : 
                                    '<span class="text-muted">N/A</span>'
                                }
                            </td>
                            <td>
                                <strong>${formatarNumero(candidato.total_votos)}</strong>
                            </td>
                            <td>
                                <span class="badge bg-success">${candidato.municipios_com_votos}</span>
                            </td>
                            <td>
                                <small class="text-muted">
                                    ${candidato.mesorregiao} - ${candidato.regional_psdb}
                                </small>
                            </td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="analisarCandidato(${candidato.id}, '${candidato.nome}')">
                                    <i class="fas fa-chart-line me-1"></i>
                                    Analisar
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// Aplicar filtros
async function aplicarFiltros() {
    const cargo = document.getElementById('filtro-cargo').value;
    const mesorregiao = document.getElementById('filtro-mesorregiao').value;
    const regional = document.getElementById('filtro-regional').value;
    const partido = document.getElementById('filtro-partido').value;
    
    const params = new URLSearchParams();
    if (cargo) params.append('cargo', cargo);
    if (mesorregiao) params.append('mesorregiao_id', mesorregiao);
    if (regional) params.append('regional_id', regional);
    if (partido) params.append('partido', partido);
    
    try {
        const response = await fetch(`/api/regionais/candidatos-por-regiao?${params}`);
        const data = await response.json();
        
        if (data.success) {
            exibirCandidatos(data.data);
        } else {
            throw new Error(data.message || 'Erro ao aplicar filtros');
        }
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        mostrarErro('Erro ao aplicar filtros');
    }
}

// Limpar filtros
function limparFiltros() {
    document.getElementById('filtro-cargo').value = '';
    document.getElementById('filtro-mesorregiao').value = '';
    document.getElementById('filtro-regional').value = '';
    document.getElementById('filtro-partido').value = '';
    
    // Recarregar todos os candidatos
    carregarCandidatos();
}

// Analisar candidato específico
async function analisarCandidato(candidatoId, nomeCandidato) {
    try {
        // Mostrar seção de detalhes
        document.getElementById('detalhes-candidato').style.display = 'block';
        
        // Carregar dados do candidato
        const [votosMesorregiao, votosRegional] = await Promise.all([
            fetch(`/api/regionais/votos-por-mesorregiao/${candidatoId}`).then(r => r.json()),
            fetch(`/api/regionais/votos-por-regional/${candidatoId}`).then(r => r.json())
        ]);
        
        if (votosMesorregiao.success && votosRegional.success) {
            exibirDetalhesCandidato(nomeCandidato, votosMesorregiao, votosRegional);
        } else {
            throw new Error('Erro ao carregar detalhes do candidato');
        }
        
        // Scroll para a seção de detalhes
        document.getElementById('detalhes-candidato').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Erro ao analisar candidato:', error);
        mostrarErro('Erro ao carregar detalhes do candidato');
    }
}

// Exibir detalhes do candidato
function exibirDetalhesCandidato(nome, votosMesorregiao, votosRegional) {
    const container = document.getElementById('detalhes-conteudo');
    
    const totalVotos = votosMesorregiao.data.reduce((sum, item) => sum + item.total_votos, 0);
    
    const html = `
        <div class="row mb-4">
            <div class="col-12">
                <h4>${nome}</h4>
                <p class="text-muted">${votosMesorregiao.candidato.cargo} - ${votosMesorregiao.candidato.sigla_partido || 'N/A'}</p>
            </div>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <h5><i class="fas fa-map me-2"></i>Votos por Mesorregião</h5>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Mesorregião</th>
                                <th>Votos</th>
                                <th>%</th>
                                <th>Municípios</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${votosMesorregiao.data.map(item => `
                                <tr>
                                    <td>${item.mesorregiao}</td>
                                    <td>${formatarNumero(item.total_votos)}</td>
                                    <td>${((item.total_votos / totalVotos) * 100).toFixed(1)}%</td>
                                    <td>${item.municipios_com_votos}/${item.total_municipios_regiao}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="col-md-6">
                <h5><i class="fas fa-building me-2"></i>Votos por Regional PSDB</h5>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Regional</th>
                                <th>Votos</th>
                                <th>%</th>
                                <th>Municípios</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${votosRegional.data.map(item => `
                                <tr>
                                    <td>${item.regional_psdb}</td>
                                    <td>${formatarNumero(item.total_votos)}</td>
                                    <td>${((item.total_votos / totalVotos) * 100).toFixed(1)}%</td>
                                    <td>${item.municipios_com_votos}/${item.total_municipios_regional}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="row mt-4">
            <div class="col-12">
                <div class="alert alert-info">
                    <h6><i class="fas fa-info-circle me-2"></i>Resumo</h6>
                    <p class="mb-0">
                        <strong>Total de votos:</strong> ${formatarNumero(totalVotos)} | 
                        <strong>Mesorregiões atendidas:</strong> ${votosMesorregiao.data.length} | 
                        <strong>Regionais atendidas:</strong> ${votosRegional.data.length}
                    </p>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Funções utilitárias
function formatarNumero(numero) {
    if (!numero || isNaN(numero)) return '0';
    
    // Para números muito grandes, usar notação abreviada
    if (numero >= 1000000) {
        return (numero / 1000000).toFixed(1) + 'M';
    } else if (numero >= 1000) {
        return (numero / 1000).toFixed(1) + 'K';
    }
    
    return new Intl.NumberFormat('pt-BR').format(numero);
}

// Função para formatar números grandes com separadores
function formatarNumeroCompleto(numero) {
    if (!numero || isNaN(numero)) return '0';
    return new Intl.NumberFormat('pt-BR').format(numero);
}

function mostrarErro(mensagem) {
    const container = document.getElementById('resultados-candidatos');
    container.innerHTML = `
        <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>
            ${mensagem}
        </div>
    `;
}
