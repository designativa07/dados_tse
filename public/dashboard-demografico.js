// Dashboard Demográfico - Análise do Perfil do Eleitor
// Integração com API /api/demografico

const dashboard = {
    charts: {},

    // Carregar todos os dados demográficos
    async carregarDemografico() {
        try {
            console.log('📊 Carregando dashboard demográfico...');

            // Carregar comparativo temporal e ranking em paralelo
            const [comparativo, ranking] = await Promise.all([
                fetch('/api/demografico/comparativo-temporal').then(r => r.json()),
                fetch('/api/demografico/ranking-crescimento').then(r => r.json())
            ]);

            if (comparativo.success) {
                this.atualizarCards(comparativo.comparativo);
                this.renderizarGraficoGenero(comparativo.comparativo.genero);
                this.renderizarGraficoEscolaridade(comparativo.comparativo.escolaridade);
                this.renderizarGraficoFaixaEtaria(comparativo.comparativo.faixa_etaria);
                this.renderizarGraficoEstadoCivil(comparativo.comparativo);
            }

            if (ranking.success) {
                this.renderizarRankingCrescimento(ranking.ranking);
            }

            console.log('✅ Dashboard demográfico carregado!');
        } catch (error) {
            console.error('❌ Erro ao carregar dashboard demográfico:', error);
        }
    },

    // Atualizar cards de estatísticas
    atualizarCards(dados) {
        const total2022 = dados.totais.eleitores_2022 || 0;
        const total2018 = dados.totais.eleitores_2018 || 0;
        const crescimento = dados.totais.crescimento_percentual || 0;

        document.getElementById('total-eleitores-2022').textContent = this.formatarNumero(total2022);
        document.getElementById('total-eleitores-2018').textContent = this.formatarNumero(total2018);
        document.getElementById('crescimento-percentual').textContent = `+${crescimento}%`;
    },

    // Gráfico de Gênero (Pizza)
    renderizarGraficoGenero(dados) {
        const ctx = document.getElementById('chart-genero');
        if (!ctx) return;

        // Destruir gráfico existente
        if (this.charts.genero) {
            this.charts.genero.destroy();
        }

        // Filtrar apenas 2022
        const dados2022 = dados.filter(d => d.total_2022 > 0);

        this.charts.genero = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: dados2022.map(d => d.ds_genero),
                datasets: [{
                    data: dados2022.map(d => parseInt(d.total_2022)),
                    backgroundColor: ['#ec4899', '#3b82f6', '#9ca3af'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const value = ctx.raw;
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((value / total) * 100).toFixed(1);
                                return `${ctx.label}: ${this.formatarNumero(value)} (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });
    },

    // Gráfico de Escolaridade (Barras Horizontais)
    renderizarGraficoEscolaridade(dados) {
        const ctx = document.getElementById('chart-escolaridade');
        if (!ctx) return;

        if (this.charts.escolaridade) {
            this.charts.escolaridade.destroy();
        }

        // Ordenar por total 2022
        const ordenados = dados.sort((a, b) => parseInt(b.total_2022) - parseInt(a.total_2022)).slice(0, 8);

        this.charts.escolaridade = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ordenados.map(d => this.truncarTexto(d.ds_grau_escolaridade, 20)),
                datasets: [{
                    label: '2022',
                    data: ordenados.map(d => parseInt(d.total_2022)),
                    backgroundColor: '#667eea',
                    borderRadius: 4
                }, {
                    label: '2018',
                    data: ordenados.map(d => parseInt(d.total_2018)),
                    backgroundColor: '#94a3b8',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    x: {
                        ticks: {
                            callback: (v) => this.formatarNumeroCompacto(v)
                        }
                    }
                }
            }
        });
    },

    // Gráfico de Faixa Etária (Barras Comparativas)
    renderizarGraficoFaixaEtaria(dados) {
        const ctx = document.getElementById('chart-faixa-etaria');
        if (!ctx) return;

        if (this.charts.faixaEtaria) {
            this.charts.faixaEtaria.destroy();
        }

        // Ordenar por faixa etária
        const ordenados = dados.filter(d => d.ds_faixa_etaria).sort((a, b) => {
            const numA = parseInt(a.ds_faixa_etaria.match(/\d+/)?.[0]) || 0;
            const numB = parseInt(b.ds_faixa_etaria.match(/\d+/)?.[0]) || 0;
            return numA - numB;
        });

        this.charts.faixaEtaria = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ordenados.map(d => d.ds_faixa_etaria),
                datasets: [{
                    label: '2022',
                    data: ordenados.map(d => parseInt(d.total_2022)),
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }, {
                    label: '2018',
                    data: ordenados.map(d => parseInt(d.total_2018)),
                    backgroundColor: '#94a3b8',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: (v) => this.formatarNumeroCompacto(v)
                        }
                    }
                }
            }
        });
    },

    // Gráfico de Estado Civil (Pizza)
    renderizarGraficoEstadoCivil(dados) {
        const ctx = document.getElementById('chart-estado-civil');
        if (!ctx) return;

        if (this.charts.estadoCivil) {
            this.charts.estadoCivil.destroy();
        }

        // Buscar dados de estado civil via API
        this.carregarEstadoCivil();
    },

    async carregarEstadoCivil() {
        try {
            const response = await fetch('/api/demografico/resumo?ano_eleicao=2022');
            const data = await response.json();

            if (data.success && data.resumo.estado_civil) {
                const ctx = document.getElementById('chart-estado-civil');

                if (this.charts.estadoCivil) {
                    this.charts.estadoCivil.destroy();
                }

                const cores = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

                this.charts.estadoCivil = new Chart(ctx, {
                    type: 'pie',
                    data: {
                        labels: data.resumo.estado_civil.map(d => d.ds_estado_civil),
                        datasets: [{
                            data: data.resumo.estado_civil.map(d => parseInt(d.total)),
                            backgroundColor: cores,
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: { font: { size: 11 } }
                            }
                        }
                    }
                });
            }
        } catch (error) {
            console.error('Erro ao carregar estado civil:', error);
        }
    },

    // Tabela de Ranking de Crescimento
    renderizarRankingCrescimento(dados) {
        const tbody = document.getElementById('ranking-crescimento-body');
        if (!tbody) return;

        tbody.innerHTML = dados.slice(0, 10).map((item, index) => {
            const crescimentoClass = item.crescimento_absoluto > 0 ? 'crescimento-positivo' : 'crescimento-negativo';
            const sinal = item.crescimento_absoluto > 0 ? '+' : '';

            return `
                <tr>
                    <td><strong>${index + 1}</strong></td>
                    <td>${item.municipio}</td>
                    <td class="text-end">${this.formatarNumero(item.eleitores_2018)}</td>
                    <td class="text-end">${this.formatarNumero(item.eleitores_2022)}</td>
                    <td class="text-end ${crescimentoClass}">${sinal}${this.formatarNumero(item.crescimento_absoluto)}</td>
                    <td class="text-end ${crescimentoClass}">${sinal}${item.crescimento_percentual}%</td>
                </tr>
            `;
        }).join('');
    },

    // Utilitários
    formatarNumero(num) {
        if (!num) return '0';
        return parseInt(num).toLocaleString('pt-BR');
    },

    formatarNumeroCompacto(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
        return num.toString();
    },

    truncarTexto(texto, max) {
        if (!texto) return '';
        return texto.length > max ? texto.substring(0, max) + '...' : texto;
    },

    // Carregar mapa temático por indicador
    async carregarMapaTematico() {
        const indicador = document.getElementById('indicador-tematico')?.value || 'escolaridade';
        const tbody = document.getElementById('mapa-tematico-body');

        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="5" class="text-center"><i class="fas fa-spinner fa-spin"></i> Carregando dados...</td></tr>';

        try {
            const response = await fetch(`/api/demografico/mapa-tematico/${indicador}?ano_eleicao=2022`);
            const data = await response.json();

            if (data.success && data.dados && data.dados.length > 0) {
                // Encontrar valores min/max para normalização
                const valores = data.dados.map(d => parseFloat(d.valor) || 0);
                const maxValor = Math.max(...valores);
                const minValor = Math.min(...valores);

                // Cores para diferentes indicadores
                const cores = {
                    escolaridade: '#667eea',
                    jovens: '#10b981',
                    idosos: '#f59e0b',
                    mulheres: '#ec4899'
                };

                const cor = cores[indicador] || '#667eea';

                tbody.innerHTML = data.dados.slice(0, 15).map((item, index) => {
                    const normalizado = maxValor > minValor
                        ? ((parseFloat(item.valor) - minValor) / (maxValor - minValor)) * 100
                        : 50;

                    const valor = parseFloat(item.valor || 0).toFixed(1);

                    return `
                        <tr>
                            <td><strong>${index + 1}</strong></td>
                            <td>${item.municipio}</td>
                            <td class="text-end">${valor}%</td>
                            <td class="text-end">${this.formatarNumero(item.total_eleitores)}</td>
                            <td>
                                <div class="progress-bar-container" style="background: #e2e8f0; border-radius: 4px; height: 20px; position: relative;">
                                    <div style="width: ${normalizado}%; height: 100%; background: ${cor}; border-radius: 4px;"></div>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

            } else {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center">Sem dados disponíveis para este indicador.</td></tr>';
            }
        } catch (error) {
            console.error('Erro ao carregar mapa temático:', error);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
        }
    },

    // Carregar Análise Regional
    async carregarRegional() {
        const tbodyComparativo = document.getElementById('regional-comparativo-body');
        const tbodyPotencial = document.getElementById('regional-potencial-body');

        if (!tbodyComparativo || !tbodyPotencial) return;

        try {
            console.log('🔄 Carregando análise regional...');

            // Carregar dados em paralelo
            const [comparativoRes, potencialRes] = await Promise.all([
                fetch('/api/correlacao-regional/comparativo'),
                fetch('/api/correlacao-regional/potencial-crescimento')
            ]);

            const comparativo = await comparativoRes.json();
            const potencial = await potencialRes.json();

            // Renderizar Comparativo
            if (comparativo.success && comparativo.comparativo_regionais) {
                const maxTaxa = Math.max(...comparativo.comparativo_regionais.map(r => parseFloat(r.taxa_filiacao_por_mil) || 0));

                tbodyComparativo.innerHTML = comparativo.comparativo_regionais.map(item => {
                    const taxa = parseFloat(item.taxa_filiacao_por_mil) || 0;
                    const percentual = (taxa / maxTaxa) * 100;
                    let cor = '#e2e8f0';
                    if (taxa > 15) cor = '#10b981';
                    else if (taxa > 10) cor = '#3b82f6';
                    else if (taxa > 5) cor = '#f59e0b';
                    else cor = '#ef4444';

                    return `
                        <tr>
                            <td class="fw-bold">${item.regional || 'Não Informado'}</td>
                            <td class="text-center">${item.total_municipios}</td>
                            <td class="text-end">${this.formatarNumero(item.total_filiados)}</td>
                            <td class="text-end">${this.formatarNumero(item.total_populacao)}</td>
                            <td class="text-end fw-bold">${taxa.toFixed(2)}</td>
                            <td>
                                <div class="progress-bar-container" style="background: #e2e8f0; border-radius: 4px; height: 8px; width: 100px;">
                                    <div style="width: ${percentual}%; height: 100%; background: ${cor}; border-radius: 4px;"></div>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');
            }

            // Renderizar Potencial
            if (potencial.success && potencial.potencial_crescimento) {
                tbodyPotencial.innerHTML = potencial.potencial_crescimento.map(item => {
                    let badgeClass = 'bg-secondary';
                    if (item.potencial_crescimento === 'ALTO') badgeClass = 'bg-success';
                    else if (item.potencial_crescimento === 'MÉDIO') badgeClass = 'bg-warning text-dark';
                    else badgeClass = 'bg-danger';

                    return `
                        <tr>
                            <td class="fw-bold text-primary">${item.municipio}</td>
                            <td>${item.regional || '-'}</td>
                            <td class="text-end">${this.formatarNumero(item.total_eleitores)}</td>
                            <td class="text-end">${item.pct_superior}%</td>
                            <td class="text-end">${item.pct_adultos_jovens}%</td>
                            <td class="text-end text-muted">${this.formatarNumero(item.filiados)}</td>
                            <td class="text-center"><span class="badge ${badgeClass}">${item.potencial_crescimento}</span></td>
                        </tr>
                    `;
                }).join('');
            }

        } catch (error) {
            console.error('Erro ao carregar análise regional:', error);
            if (tbodyComparativo) tbodyComparativo.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
            if (tbodyPotencial) tbodyPotencial.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Erro ao carregar dados.</td></tr>';
        }
    }

};

// Carregar automaticamente quando a aba eleitor for exibida
document.addEventListener('DOMContentLoaded', () => {
    // Observar mudanças na aba eleitor
    const eleitorTab = document.getElementById('eleitor');

    if (eleitorTab) {
        // Carregar quando a aba se tornar visível
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    dashboard.carregarDemografico();
                }
            });
        });

        observer.observe(eleitorTab, { attributes: true, attributeFilter: ['class'] });

        // Também carregar se a aba já estiver ativa
        if (eleitorTab.classList.contains('active')) {
            dashboard.carregarDemografico();
        }
    }


    // Observar mudanças na aba regionais
    const regionaisTab = document.getElementById('regionais');

    if (regionaisTab) {
        // Carregar quando a aba se tornar visível
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    dashboard.carregarRegional();
                }
            });
        });

        observer.observe(regionaisTab, { attributes: true, attributeFilter: ['class'] });

        // Também carregar se a aba já estiver ativa
        if (regionaisTab.classList.contains('active')) {
            dashboard.carregarRegional();
        }
    }
});
