const dashboardInteligencia = {
    ferramentas: {
        oportunidades: {
            titulo: "Mapa de Oportunidades",
            render: () => dashboardInteligencia.renderizarOportunidades()
        },
        gemeas: {
            titulo: "Cidades Gêmeas",
            render: () => dashboardInteligencia.renderizarGemeas()
        },
        eficiencia: {
            titulo: "Ranking de Eficiência",
            render: () => dashboardInteligencia.renderizarEficiencia()
        },
        metas: {
            titulo: "Simulador de Metas",
            render: () => dashboardInteligencia.renderizarMetas()
        },
        migracao: {
            titulo: "Matriz de Migração",
            render: () => dashboardInteligencia.renderizarMigracao()
        }
    },

    init() {
        console.log('🧠 Dashboard de Inteligência inicializado');
    },

    abrirFerramenta(nomeFerramenta) {
        const ferramenta = this.ferramentas[nomeFerramenta];
        if (!ferramenta) return;

        // Esconder grid de selecao
        document.querySelector('.inteligencia-grid').style.display = 'none';
        document.querySelector('.header-section p').style.display = 'none';

        // Mostrar container da ferramenta
        const container = document.getElementById('ferramenta-container');
        const conteudo = document.getElementById('ferramenta-conteudo');

        container.style.display = 'block';
        conteudo.innerHTML = `

            <div id="area-ferramenta">
                <div class="text-center p-5">
                    <i class="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                    <p class="text-muted">Carregando ferramenta...</p>
                </div>
            </div>
        `;

        // Renderizar conteudo especifico
        if (ferramenta.render) ferramenta.render();
    },

    fecharFerramenta() {
        // Esconder container
        document.getElementById('ferramenta-container').style.display = 'none';

        // Mostrar grid
        document.querySelector('.inteligencia-grid').style.display = 'grid';
        document.querySelector('.header-section p').style.display = 'block';
    },

    async getEleicoesOptions() {
        try {
            const res = await fetch('/api/eleicoes/dropdown');
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                return json.data.map(e => `<option value="${e.id}">${e.descricao} (${e.ano})</option>`).join('');
            }
            return '<option value="">Erro ao carregar eleições</option>';
        } catch (e) {
            console.error(e);
            return '<option value="">Erro de conexão</option>';
        }
    },

    async getCargosOptions() {
        try {
            const res = await fetch('/api/candidatos/cargos');
            const json = await res.json();
            if (json.cargos && Array.isArray(json.cargos)) {
                return json.cargos.map(c => `<option value="${c.cargo}">${c.cargo}</option>`).join('');
            }
            return '<option value="">Erro ao carregar cargos</option>';
        } catch (e) {
            console.error(e);
            return '<option value="">Erro de conexão</option>';
        }
    },

    // Placeholders para renderização das ferramentas
    async renderizarOportunidades() {
        const area = document.getElementById('area-ferramenta');
        const eleicoesOptions = await this.getEleicoesOptions();

        area.innerHTML = `
            <div class="inteligencia-tool-panel">
                <div class="inteligencia-tool-header">
                    <h4><i class="fas fa-search-location"></i> Configurar Busca de Oportunidades</h4>
                    <p>Encontre municípios com alto potencial demográfico, mas baixa performance eleitoral.</p>
                </div>
                <div class="inteligencia-tool-body">
                    <div class="inteligencia-form-row cols-2">
                        <div class="inteligencia-form-group">
                            <label>Eleição Base</label>
                            <div class="input-wrapper">
                                <i class="fas fa-calendar-alt input-icon"></i>
                                <select id="opt-eleicao" onchange="dashboardInteligencia.carregarCandidatosOportunidades(this.value)">
                                    <option value="">Selecione uma eleição...</option>
                                    ${eleicoesOptions}
                                </select>
                            </div>
                        </div>
                        <div class="inteligencia-form-group">
                            <label>Candidato (digite para buscar)</label>
                            <div class="input-wrapper">
                                <i class="fas fa-user input-icon"></i>
                                <input type="text" id="opt-candidato-input" list="opt-candidato-list" placeholder="Digite o nome do candidato..." disabled>
                                <datalist id="opt-candidato-list"></datalist>
                                <input type="hidden" id="opt-candidato">
                            </div>
                        </div>
                    </div>
                    <div class="inteligencia-form-row cols-3">
                        <div class="inteligencia-form-group">
                            <label>Perfil Demográfico</label>
                            <div class="input-wrapper">
                                <i class="fas fa-users input-icon"></i>
                                <select id="opt-criterio" onchange="dashboardInteligencia.atualizarValoresCriterio(this.value)">
                                    <option value="">Selecione...</option>
                                    <option value="faixa_etaria">Faixa Etária</option>
                                    <option value="escolaridade">Escolaridade</option>
                                    <option value="genero">Gênero</option>
                                </select>
                            </div>
                        </div>
                        <div class="inteligencia-form-group">
                            <label>Segmento Alvo</label>
                            <div class="input-wrapper">
                                <i class="fas fa-bullseye input-icon"></i>
                                <select id="opt-valor" disabled>
                                    <option value="">Selecione o critério...</option>
                                </select>
                            </div>
                        </div>
                        <div class="inteligencia-form-group" style="justify-content: flex-end;">
                            <button class="inteligencia-btn-primary" onclick="dashboardInteligencia.buscarOportunidades()">
                                <i class="fas fa-search-location"></i> Buscar Oportunidades
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div id="resultado-oportunidades" class="inteligencia-result"></div>
        `;

        // Configurar evento de busca de candidato
        const inputCandidato = document.getElementById('opt-candidato-input');
        inputCandidato.addEventListener('input', (e) => {
            this.handleCandidatoSelection(e.target.value);
        });
    },

    async carregarCandidatosOportunidades(eleicaoId) {
        const input = document.getElementById('opt-candidato-input');
        const datalist = document.getElementById('opt-candidato-list');
        const hiddenInput = document.getElementById('opt-candidato');

        if (!eleicaoId) {
            input.disabled = true;
            input.placeholder = 'Selecione a eleição primeiro...';
            datalist.innerHTML = '';
            hiddenInput.value = '';
            return;
        }

        input.disabled = true;
        input.placeholder = 'Carregando candidatos...';

        try {
            const res = await fetch(`/api/candidatos?eleicao_id=${eleicaoId}&limite=1000`);
            const json = await res.json();

            if (json.data && json.data.length > 0) {
                // Armazenar mapa de candidatos
                this.candidatosMap = {};
                datalist.innerHTML = json.data.map(c => {
                    const label = `${c.nome_urna} (${c.cargo})`;
                    this.candidatosMap[label] = c.id;
                    return `<option value="${label}" data-id="${c.id}">`;
                }).join('');
                input.disabled = false;
                input.placeholder = 'Digite o nome do candidato...';
            } else {
                input.placeholder = 'Nenhum candidato encontrado';
            }
        } catch (e) {
            console.error(e);
            input.placeholder = 'Erro ao carregar candidatos';
        }
    },

    handleCandidatoSelection(value) {
        const hiddenInput = document.getElementById('opt-candidato');
        if (this.candidatosMap && this.candidatosMap[value]) {
            hiddenInput.value = this.candidatosMap[value];
        } else {
            hiddenInput.value = '';
        }
    },

    async carregarCandidatos(eleicaoId) {
        // Mantido para compatibilidade com outras ferramentas
        const select = document.getElementById('opt-candidato');
        if (!eleicaoId) {
            select.innerHTML = '<option value="">Selecione a eleição primeiro...</option>';
            select.disabled = true;
            return;
        }

        select.innerHTML = '<option value="">Carregando...</option>';
        try {
            // Buscando todos os candidatos da eleição (pode ser pesado, ideal seria filtrar por cargo ou busca textual)
            // Para simplificar, vou buscar os top 100 mais votados ou algo assim, ou usar o endpoint de busca
            const res = await fetch(`/api/candidatos?eleicao_id=${eleicaoId}&limite=500`);
            const json = await res.json();

            if (json.data && json.data.length > 0) {
                select.innerHTML = json.data.map(c => `<option value="${c.id}">${c.nome_urna} (${c.cargo})</option>`).join('');
                select.disabled = false;
            } else {
                select.innerHTML = '<option value="">Nenhum candidato encontrado</option>';
            }
        } catch (e) {
            console.error(e);
            select.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    },

    atualizarValoresCriterio(criterio) {
        const select = document.getElementById('opt-valor');
        if (!criterio) {
            select.disabled = true;
            select.innerHTML = '<option value="">Selecione o critério...</option>';
            return;
        }

        let opcoes = [];
        if (criterio === 'faixa_etaria') {
            opcoes = ['16 A 17 ANOS', '18 A 20 ANOS', '21 A 24 ANOS', '25 A 34 ANOS', '35 A 44 ANOS', '45 A 59 ANOS', '60 A 69 ANOS', '70 A 79 ANOS'];
        } else if (criterio === 'escolaridade') {
            opcoes = ['ANALFABETO', 'LÊ E ESCREVE', 'ENSINO FUNDAMENTAL INCOMPLETO', 'ENSINO FUNDAMENTAL COMPLETO', 'ENSINO MÉDIO INCOMPLETO', 'ENSINO MÉDIO COMPLETO', 'SUPERIOR INCOMPLETO', 'SUPERIOR COMPLETO'];
        } else if (criterio === 'genero') {
            opcoes = ['MASCULINO', 'FEMININO'];
        }

        select.innerHTML = opcoes.map(op => `<option value="${op}">${op}</option>`).join('');
        select.disabled = false;
    },

    async buscarOportunidades() {
        const candidatoId = document.getElementById('opt-candidato').value;
        const eleicaoSelect = document.getElementById('opt-eleicao');
        const eleicaoId = eleicaoSelect.value;
        const criterio = document.getElementById('opt-criterio').value;
        const valor = document.getElementById('opt-valor').value;

        if (!candidatoId || !criterio || !valor) {
            alert('Preencha todos os campos!');
            return;
        }

        // Extrair o ano da eleição do texto da opção selecionada
        const eleicaoText = eleicaoSelect.options[eleicaoSelect.selectedIndex].text;
        const anoMatch = eleicaoText.match(/\((\d{4})\)/);
        const anoEleicao = anoMatch ? anoMatch[1] : '2022';

        const divResultado = document.getElementById('resultado-oportunidades');
        divResultado.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-2">Analisando dados...</p></div>';

        try {
            const params = new URLSearchParams({
                candidato_id: candidatoId,
                eleicao_id: eleicaoId,
                ano_eleicao: anoEleicao,
                criterio,
                valor,
                min_perfil_pct: 5, // Reduzido para mostrar mais resultados
                max_votos_pct: 50  // Aumentado para mostrar mais resultados
            });

            const res = await fetch(`/api/inteligencia/oportunidades?${params}`);
            const json = await res.json();

            console.log('Resposta oportunidades:', json);

            if (json.data && json.data.length > 0) {
                let html = `
                    <div class="inteligencia-result-card">
                        <div class="inteligencia-result-header">
                            <i class="fas fa-bullseye"></i>
                            <h5>Oportunidades Encontradas (${json.data.length})</h5>
                        </div>
                        <div class="inteligencia-result-body">
                            <p>Cidades com alta concentração de <strong>${valor}</strong> onde você teve baixa votação.</p>
                            <table class="inteligencia-table">
                                <thead>
                                    <tr>
                                        <th>Município</th>
                                        <th>Perfil (%)</th>
                                        <th>População Alvo</th>
                                        <th>Sua Votação (%)</th>
                                        <th>Seus Votos</th>
                                        <th>Potencial</th>
                                    </tr>
                                </thead>
                                <tbody>
                `;

                json.data.forEach(item => {
                    const gap = parseFloat(item.perfil_pct) - parseFloat(item.votos_pct || 0);
                    html += `
                        <tr>
                            <td>${item.municipio}</td>
                            <td style="color: #667eea; font-weight: 600;">${item.perfil_pct}%</td>
                            <td>${parseInt(item.total_perfil).toLocaleString()}</td>
                            <td style="color: #ef4444;">${item.votos_pct || 0}%</td>
                            <td>${parseInt(item.votos_candidato || 0).toLocaleString()}</td>
                            <td><span class="badge" style="background: ${gap > 20 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'}; color: white; padding: 6px 12px; border-radius: 20px;">${gap.toFixed(1)} pts</span></td>
                        </tr>
                    `;
                });

                html += `</tbody></table></div></div>`;
                divResultado.innerHTML = html;
            } else {
                divResultado.innerHTML = `
                    <div class="inteligencia-info-box" style="margin-top: 20px;">
                        <i class="fas fa-info-circle"></i>
                        <span>Nenhuma oportunidade encontrada com esses filtros. Tente ajustar o perfil demográfico ou segmento alvo.</span>
                    </div>
                `;
            }

        } catch (e) {
            console.error('Erro ao buscar oportunidades:', e);
            divResultado.innerHTML = '<div class="inteligencia-info-box" style="border-left-color: #ef4444; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);"><i class="fas fa-exclamation-circle" style="color: #ef4444;"></i><span style="color: #991b1b;">Erro ao buscar oportunidades. Verifique o console para mais detalhes.</span></div>';
        }
    },

    async renderizarGemeas() {
        const area = document.getElementById('area-ferramenta');

        // Carregar lista de municípios para datalist
        let dataList = '';
        try {
            const res = await fetch('/api/municipios');
            const data = await res.json();
            dataList = data.map(m => `<option value="${m.nome}" data-id="${m.id}"></option>`).join('');
            // Armazenar mapa de nomes para IDs
            this.municipiosMap = data.reduce((acc, m) => { acc[m.nome] = m.id; return acc; }, {});
        } catch (e) {
            console.error(e);
        }

        area.innerHTML = `
            <div class="inteligencia-tool-panel" style="max-width: 700px; margin: 0 auto;">
                <div class="inteligencia-tool-header" style="text-align: center;">
                    <h4 style="justify-content: center;"><i class="fas fa-city"></i> Encontrar Cidades Gêmeas</h4>
                    <p>Descubra municípios com perfil demográfico similar aos seus redutos.</p>
                </div>
                <div class="inteligencia-tool-body">
                    <div class="inteligencia-form-group" style="margin-bottom: 20px;">
                        <label style="text-align: center;">Município Base</label>
                        <div style="display: flex; gap: 12px;">
                            <div class="input-wrapper" style="flex: 1;">
                                <i class="fas fa-map-marker-alt input-icon"></i>
                                <input type="text" id="input-municipio-base" list="list-municipios" placeholder="Digite o nome da cidade...">
                                <datalist id="list-municipios">
                                    ${dataList}
                                </datalist>
                            </div>
                            <button class="inteligencia-btn-primary" onclick="dashboardInteligencia.buscarCidadesGemeas()">
                                <i class="fas fa-search"></i> Pesquisar
                            </button>
                        </div>
                    </div>
                    <div class="inteligencia-info-box">
                        <i class="fas fa-info-circle"></i>
                        <span>A análise vetorial considera: distribuição etária, escolaridade, gênero e dados socioeconômicos.</span>
                    </div>
                </div>
            </div>
            <div id="resultado-gemeas" class="inteligencia-result"></div>
        `;
    },

    async buscarCidadesGemeas() {
        const nome = document.getElementById('input-municipio-base').value;
        const id = this.municipiosMap ? this.municipiosMap[nome] : null;

        if (!id) {
            alert('Selecione um município válido da lista!');
            return;
        }

        const divResultado = document.getElementById('resultado-gemeas');
        divResultado.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin fa-2x"></i><p>Calculando similaridade vetorial...</p></div>';

        try {
            const res = await fetch(`/api/inteligencia/similares/${id}`);
            const json = await res.json();

            if (json.success) {
                let html = `
                    <h4 class="mb-3">Cidades similares a <span class="text-primary">${json.alvo.nome}</span></h4>
                    <div class="row">
                `;

                json.similares.forEach((c, index) => {
                    const similaridade = Math.max(0, 100 - (c.distancia * 100)).toFixed(1); // Converter distância em % de similaridade aproximada
                    html += `
                        <div class="col-md-6 col-lg-4 mb-3">
                            <div class="card h-100 border-0 shadow-sm">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h5 class="card-title mb-0">${index + 1}º ${c.nome}</h5>
                                        <span class="badge bg-${similaridade > 90 ? 'success' : 'primary'}">${similaridade}% Similar</span>
                                    </div>
                                    <ul class="list-unstyled small text-muted">
                                        <li><i class="fas fa-users"></i> ${parseInt(c.total).toLocaleString()} eleitores</li>
                                        <li><i class="fas fa-graduation-cap"></i> ${(c.pct_superior * 100).toFixed(1)}% Superior</li>
                                        <li><i class="fas fa-child"></i> ${(c.pct_jovem * 100).toFixed(1)}% Jovens</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += '</div>';
                divResultado.innerHTML = html;
            } else {
                divResultado.innerHTML = `<div class="alert alert-danger">${json.error || 'Erro ao buscar cidades.'}</div>`;
            }
        } catch (e) {
            console.error(e);
            divResultado.innerHTML = '<div class="alert alert-danger">Erro de conexão.</div>';
        }
    },

    async renderizarEficiencia() {
        const area = document.getElementById('area-ferramenta');
        const eleicoesOptions = await this.getEleicoesOptions();
        const cargosOptions = await this.getCargosOptions();

        area.innerHTML = `
            <div class="inteligencia-tool-panel">
                <div class="inteligencia-tool-header">
                    <h4><i class="fas fa-chart-line"></i> Ranking de Eficiência de Campanha</h4>
                    <p>Analise o retorno sobre o investimento (ROI) de votos por despesa declarada.</p>
                </div>
                <div class="inteligencia-tool-body">
                    <div class="inteligencia-form-row cols-3">
                        <div class="inteligencia-form-group">
                            <label>Eleição</label>
                            <div class="input-wrapper">
                                <i class="fas fa-calendar input-icon"></i>
                                <select id="efi-eleicao">
                                    <option value="">Todas</option>
                                    ${eleicoesOptions}
                                </select>
                            </div>
                        </div>
                        <div class="inteligencia-form-group">
                            <label>Cargo</label>
                            <div class="input-wrapper">
                                <i class="fas fa-user-tie input-icon"></i>
                                <select id="efi-cargo">
                                    <option value="">Todos</option>
                                    ${cargosOptions}
                                </select>
                            </div>
                        </div>
                        <div class="inteligencia-form-group">
                            <label>Ordenação</label>
                            <div class="input-wrapper">
                                <i class="fas fa-sort-amount-down input-icon"></i>
                                <select id="efi-ordem">
                                    <option value="custo_crescente">Mais Eficientes (Menor Custo/Voto)</option>
                                    <option value="custo_decrescente">Maior Investimento (Maior Custo)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="inteligencia-actions">
                        <button class="inteligencia-btn-primary" onclick="dashboardInteligencia.buscarEficiencia()">
                            <i class="fas fa-search-dollar"></i> Analisar Eficiência
                        </button>
                    </div>
                </div>
            </div>
            <div id="resultado-eficiencia" class="inteligencia-result"></div>
        `;
    },

    async buscarEficiencia() {
        const eleicao = document.getElementById('efi-eleicao').value;
        const cargo = document.getElementById('efi-cargo').value;
        const ordem = document.getElementById('efi-ordem').value;

        const div = document.getElementById('resultado-eficiencia');
        div.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Calculando ROI eleitoral...</div>';

        try {
            const params = new URLSearchParams({
                ordenar_por: ordem,
                ...(eleicao && { eleicao_id: eleicao }),
                ...(cargo && { cargo_filtro: cargo })
            });

            const res = await fetch(`/api/inteligencia/eficiencia?${params}`);
            const json = await res.json();

            if (json.success) {
                if (json.data.length === 0) {
                    div.innerHTML = '<div class="alert alert-warning">Nenhum dado encontrado com despesas declaradas.</div>';
                    return;
                }

                let html = `
                    <div class="table-responsive">
                        <table class="table table-hover align-middle">
                            <thead class="table-light">
                                <tr>
                                    <th>Rank</th>
                                    <th>Candidato</th>
                                    <th>Partido</th>
                                    <th>Votos</th>
                                    <th>Despesa (R$)</th>
                                    <th>Custo/Voto</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                json.data.forEach((r, i) => {
                    const custo = parseFloat(r.custo_por_voto);
                    const corBadge = custo < 10 ? 'success' : (custo < 50 ? 'warning' : 'danger');

                    html += `
                        <tr>
                            <td>#${i + 1}</td>
                            <td>
                                <div class="fw-bold">${r.nome_urna}</div>
                                <div class="small text-muted">${r.cargo}</div>
                            </td>
                            <td><span class="badge bg-light text-dark border">${r.sigla_partido}</span></td>
                            <td>${parseInt(r.votos).toLocaleString()}</td>
                            <td>R$ ${parseFloat(r.despesa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            <td>
                                <span class="badge bg-${corBadge} fs-6">
                                    R$ ${custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
                div.innerHTML = html;
            } else {
                div.innerHTML = `<div class="alert alert-danger">${json.error || 'Erro ao buscar dados'}</div>`;
            }

        } catch (e) {
            console.error(e);
            div.innerHTML = '<div class="alert alert-danger">Erro de conexão</div>';
        }
    },

    async renderizarMetas() {
        const area = document.getElementById('area-ferramenta');
        const eleicoesOptions = await this.getEleicoesOptions();

        area.innerHTML = `
            <div class="inteligencia-tool-panel">
                <div class="inteligencia-tool-header">
                    <h4><i class="fas fa-bullseye"></i> Simulador de Metas de Votos</h4>
                    <p>Defina uma meta global e veja onde você precisa crescer com base no histórico.</p>
                </div>
                <div class="inteligencia-tool-body">
                    <div class="inteligencia-form-row cols-3">
                        <div class="inteligencia-form-group">
                            <label>Eleição Base (Histórico)</label>
                            <div class="input-wrapper">
                                <i class="fas fa-history input-icon"></i>
                                <select id="meta-eleicao" onchange="dashboardInteligencia.carregarCandidatosMeta(this.value)">
                                    <option value="">Selecione...</option>
                                    ${eleicoesOptions}
                                </select>
                            </div>
                        </div>
                        <div class="inteligencia-form-group">
                            <label>Candidato</label>
                            <div class="input-wrapper">
                                <i class="fas fa-user input-icon"></i>
                                <select id="meta-candidato" disabled>
                                    <option value="">Selecione a eleição...</option>
                                </select>
                            </div>
                        </div>
                        <div class="inteligencia-form-group">
                            <label>Meta Global de Votos</label>
                            <div class="input-wrapper">
                                <i class="fas fa-trophy input-icon"></i>
                                <input type="number" id="meta-valor" placeholder="Ex: 50000">
                            </div>
                        </div>
                    </div>
                    <div class="inteligencia-actions">
                        <button class="inteligencia-btn-success" onclick="dashboardInteligencia.simularMetas()">
                            <i class="fas fa-calculator"></i> Calcular Projeção
                        </button>
                    </div>
                </div>
            </div>
            <div id="resultado-metas" class="inteligencia-result"></div>
        `;
    },

    async carregarCandidatosMeta(eleicaoId) {
        const select = document.getElementById('meta-candidato');
        if (!eleicaoId) {
            select.innerHTML = '<option value="">Selecione a eleição...</option>';
            select.disabled = true;
            return;
        }

        try {
            const res = await fetch(`/api/candidatos?eleicao_id=${eleicaoId}&limite=500`);
            const json = await res.json();
            select.innerHTML = json.data.map(c => `<option value="${c.id}">${c.nome_urna}</option>`).join('');
            select.disabled = false;
        } catch (e) {
            console.error(e);
        }
    },

    async simularMetas() {
        const eleicaoId = document.getElementById('meta-eleicao').value;
        const candidatoId = document.getElementById('meta-candidato').value;
        const meta = document.getElementById('meta-valor').value;

        if (!eleicaoId || !candidatoId || !meta) {
            alert('Preencha todos os campos');
            return;
        }

        const div = document.getElementById('resultado-metas');
        div.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Calculando...</div>';

        try {
            const res = await fetch(`/api/inteligencia/projecao?eleicao_id=${eleicaoId}&candidato_id=${candidatoId}&meta_votos=${meta}`);
            const json = await res.json();

            if (json.success) {
                let html = `
                    <div class="alert alert-info">
                        <strong>Fator de Crescimento:</strong> ${(json.fator_crescimento)}x 
                        (De ${parseInt(json.total_base).toLocaleString()} para ${parseInt(json.meta_global).toLocaleString()})
                    </div>
                    <div class="table-responsive">
                        <table class="table table-striped table-sm">
                            <thead>
                                <tr>
                                    <th>Município</th>
                                    <th>Base Atual</th>
                                    <th>Peso (%)</th>
                                    <th>Sua Meta</th>
                                    <th>Crescimento Necessário</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

                json.data.forEach(Row => {
                    html += `
                        <tr>
                            <td>${Row.municipio}</td>
                            <td>${Row.votos_base.toLocaleString()}</td>
                            <td>${Row.contribuicao_pct}%</td>
                            <td class="fw-bold text-success">${Row.meta_votos.toLocaleString()}</td>
                            <td>+${Row.necessario_adicional.toLocaleString()}</td>
                        </tr>
                    `;
                });

                html += '</tbody></table></div>';
                div.innerHTML = html;
            } else {
                div.innerHTML = `<div class="alert alert-warning">${json.message || 'Erro ao calcular'}</div>`;
            }
        } catch (e) {
            console.error(e);
            div.innerHTML = '<div class="alert alert-danger">Erro de conexão</div>';
        }
    },

    async renderizarMigracao() {
        const area = document.getElementById('area-ferramenta');
        const eleicoesOptions = await this.getEleicoesOptions();

        area.innerHTML = `
            <div class="inteligencia-tool-panel">
                <div class="inteligencia-tool-header">
                    <h4><i class="fas fa-exchange-alt"></i> Matriz de Migração de Votos</h4>
                    <p>Compare sua performance entre duas eleições e visualize onde você ganhou ou perdeu espaço.</p>
                </div>
                <div class="inteligencia-tool-body">
                    <div class="inteligencia-compare-container">
                        <div class="inteligencia-compare-panel">
                            <h5><span class="badge-label">A</span> Cenário Anterior (Base)</h5>
                            <div class="inteligencia-form-group" style="margin-bottom: 15px;">
                                <label>Eleição</label>
                                <div class="input-wrapper">
                                    <i class="fas fa-calendar input-icon"></i>
                                    <select id="mig-eleicao-a" onchange="dashboardInteligencia.carregarCandidatosMigracao('a', this.value)">
                                        <option value="">Selecione...</option>
                                        ${eleicoesOptions}
                                    </select>
                                </div>
                            </div>
                            <div class="inteligencia-form-group">
                                <label>Candidato</label>
                                <div class="input-wrapper">
                                    <i class="fas fa-user input-icon"></i>
                                    <select id="mig-candidato-a" disabled>
                                        <option value="">Selecione a eleição...</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="inteligencia-compare-arrow">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                        <div class="inteligencia-compare-panel">
                            <h5><span class="badge-label primary">B</span> Cenário Atual (Comparação)</h5>
                            <div class="inteligencia-form-group" style="margin-bottom: 15px;">
                                <label>Eleição</label>
                                <div class="input-wrapper">
                                    <i class="fas fa-calendar input-icon"></i>
                                    <select id="mig-eleicao-b" onchange="dashboardInteligencia.carregarCandidatosMigracao('b', this.value)">
                                        <option value="">Selecione...</option>
                                        ${eleicoesOptions}
                                    </select>
                                </div>
                            </div>
                            <div class="inteligencia-form-group">
                                <label>Candidato</label>
                                <div class="input-wrapper">
                                    <i class="fas fa-user input-icon"></i>
                                    <select id="mig-candidato-b" disabled>
                                        <option value="">Selecione a eleição...</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="inteligencia-actions center" style="margin-top: 25px;">
                        <button class="inteligencia-btn-primary" onclick="dashboardInteligencia.gerarMatrizMigracao()">
                            <i class="fas fa-chart-scatter"></i> Gerar Matriz de Migração
                        </button>
                    </div>
                </div>
            </div>

            <div id="resultado-migracao" class="inteligencia-result" style="display:none;">
                <div class="inteligencia-stats-row">
                    <div class="inteligencia-stat-card">
                        <h6>Votos Base (A)</h6>
                        <div class="stat-value" id="stat-total-a">0</div>
                    </div>
                    <div class="inteligencia-stat-card">
                        <h6>Votos Atuais (B)</h6>
                        <div class="stat-value" id="stat-total-b">0</div>
                    </div>
                    <div class="inteligencia-stat-card highlight">
                        <h6>Variação</h6>
                        <div class="stat-value" id="stat-variacao">0%</div>
                    </div>
                </div>

                <div class="inteligencia-tool-panel" style="margin-bottom: 20px;">
                    <div class="inteligencia-tool-body">
                        <canvas id="chart-migracao" height="300"></canvas>
                    </div>
                </div>

                <div class="inteligencia-result-card">
                    <div class="inteligencia-result-header info">
                        <i class="fas fa-table"></i>
                        <h5>Detalhamento por Município</h5>
                    </div>
                    <div class="inteligencia-result-body" style="max-height: 400px; overflow-y: auto; padding: 0;">
                        <table class="inteligencia-table">
                            <thead>
                                <tr>
                                    <th>Município</th>
                                    <th>Votos (A)</th>
                                    <th>Votos (B)</th>
                                    <th>Diferença</th>
                                    <th>Variação %</th>
                                </tr>
                            </thead>
                            <tbody id="table-migracao-body"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    async carregarCandidatosMigracao(lado, eleicaoId) {
        const select = document.getElementById(`mig-candidato-${lado}`);
        if (!eleicaoId) {
            select.innerHTML = '<option value="">Selecione a eleição...</option>';
            select.disabled = true;
            return;
        }

        try {
            const res = await fetch(`/api/candidatos?eleicao_id=${eleicaoId}&limite=500`);
            const json = await res.json();
            select.innerHTML = json.data.map(c => `<option value="${c.id}">${c.nome_urna} (${c.cargo})</option>`).join('');
            select.disabled = false;
        } catch (e) { console.error(e); }
    },

    async gerarMatrizMigracao() {
        const ea = document.getElementById('mig-eleicao-a').value;
        const ca = document.getElementById('mig-candidato-a').value;
        const eb = document.getElementById('mig-eleicao-b').value;
        const cb = document.getElementById('mig-candidato-b').value;

        if (!ea || !ca || !eb || !cb) {
            alert('Selecione os dois cenários para comparação.');
            return;
        }

        document.getElementById('resultado-migracao').style.display = 'block';
        document.getElementById('table-migracao-body').innerHTML = '<tr><td colspan="5" class="text-center">Carregando...</td></tr>';

        try {
            const params = new URLSearchParams({
                eleicao_a: ea, candidato_a: ca,
                eleicao_b: eb, candidato_b: cb
            });
            const res = await fetch(`/api/inteligencia/migracao?${params}`);
            const json = await res.json();

            if (json.success) {
                // Atualizar Stats
                document.getElementById('stat-total-a').innerText = parseInt(json.total_anterior).toLocaleString();
                document.getElementById('stat-total-b').innerText = parseInt(json.total_atual).toLocaleString();

                const varElem = document.getElementById('stat-variacao');
                const varVal = parseFloat(json.variacao_total_perc);
                varElem.innerText = (varVal > 0 ? '+' : '') + varVal + '%';
                varElem.className = varVal >= 0 ? 'text-success' : 'text-danger';

                // Tabela
                const tbody = document.getElementById('table-migracao-body');
                tbody.innerHTML = json.data.map(r => `
                    <tr>
                        <td>${r.municipio}</td>
                        <td>${r.votos_antigos}</td>
                        <td>${r.votos_novos}</td>
                        <td class="${r.variacao_absoluta >= 0 ? 'text-success' : 'text-danger'}">
                            ${r.variacao_absoluta > 0 ? '+' : ''}${r.variacao_absoluta}
                        </td>
                        <td>${r.variacao_perc}%</td>
                    </tr>
                `).join('');

                // Gráfico Scatter
                this.renderizarGraficoMigracao(json.data);
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao gerar matriz');
        }
    },

    renderizarGraficoMigracao(data) {
        const ctx = document.getElementById('chart-migracao').getContext('2d');
        if (this.chartMigracao) this.chartMigracao.destroy();

        // Preparar dados para Scatter
        const points = data.map(r => ({
            x: parseInt(r.votos_antigos),
            y: parseInt(r.votos_novos),
            municipio: r.municipio
        }));

        this.chartMigracao = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Municípios',
                    data: points,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                }, {
                    type: 'line',
                    label: 'Linha de Estabilidade (x=y)',
                    data: [{ x: 0, y: 0 }, { x: Math.max(...points.map(p => p.x)), y: Math.max(...points.map(p => p.x)) }],
                    borderColor: '#ccc',
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const p = context.raw;
                                return `${p.municipio}: Antigo ${p.x} -> Novo ${p.y}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Votos na Eleição Base' } },
                    y: { title: { display: true, text: 'Votos na Eleição Atual' } }
                }
            }
        });
    }
};

// Inicializar quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    dashboardInteligencia.init();
});
