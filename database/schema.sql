-- Schema do banco de dados para análise de dados eleitorais TSE
-- Criado para sistema de mapa de calor e tabelas configuráveis

-- Tabela de eleições
CREATE TABLE IF NOT EXISTS eleicoes (
    id SERIAL PRIMARY KEY,
    ano INTEGER NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    turno INTEGER,
    data_eleicao DATE,
    data_geracao TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de estados/UF
CREATE TABLE IF NOT EXISTS estados (
    id SERIAL PRIMARY KEY,
    sigla VARCHAR(2) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

-- Tabela de municípios
CREATE TABLE IF NOT EXISTS municipios (
    id SERIAL PRIMARY KEY,
    codigo INTEGER UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    sigla_uf VARCHAR(2) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    FOREIGN KEY (sigla_uf) REFERENCES estados(sigla)
);

-- Tabela de candidatos
CREATE TABLE IF NOT EXISTS candidatos (
    id SERIAL PRIMARY KEY,
    numero INTEGER NOT NULL,
    nome VARCHAR(255) NOT NULL,
    cargo VARCHAR(100),
    partido VARCHAR(50),
    eleicao_id INTEGER,
    FOREIGN KEY (eleicao_id) REFERENCES eleicoes(id)
);

-- Tabela principal de votos
CREATE TABLE IF NOT EXISTS votos (
    id SERIAL PRIMARY KEY,
    eleicao_id INTEGER NOT NULL,
    municipio_id INTEGER NOT NULL,
    candidato_id INTEGER NOT NULL,
    zona INTEGER,
    secao INTEGER,
    local_votacao VARCHAR(255),
    endereco_local VARCHAR(500),
    quantidade_votos INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (eleicao_id) REFERENCES eleicoes(id),
    FOREIGN KEY (municipio_id) REFERENCES municipios(id),
    FOREIGN KEY (candidato_id) REFERENCES candidatos(id)
);

-- Tabela de configurações de visualização
CREATE TABLE IF NOT EXISTS configuracoes_visualizacao (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'tabela', 'grafico', 'mapa'
    configuracoes JSONB,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de relatórios salvos
CREATE TABLE IF NOT EXISTS relatorios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    filtros JSONB,
    visualizacao JSONB,
    eleicao_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (eleicao_id) REFERENCES eleicoes(id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_votos_eleicao ON votos(eleicao_id);
CREATE INDEX IF NOT EXISTS idx_votos_municipio ON votos(municipio_id);
CREATE INDEX IF NOT EXISTS idx_votos_candidato ON votos(candidato_id);
CREATE INDEX IF NOT EXISTS idx_votos_quantidade ON votos(quantidade_votos);
CREATE INDEX IF NOT EXISTS idx_municipios_uf ON municipios(sigla_uf);
CREATE INDEX IF NOT EXISTS idx_candidatos_eleicao ON candidatos(eleicao_id);

-- Tabelas regionais (criadas dinamicamente)
CREATE TABLE IF NOT EXISTS mesorregioes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS regionais_psdb (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    mesorregiao_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesorregiao_id) REFERENCES mesorregioes(id)
);

CREATE TABLE IF NOT EXISTS municipios_regionais (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    mesorregiao_id INTEGER NOT NULL,
    regional_psdb_id INTEGER NOT NULL,
    filiados_psdb_2024 INTEGER DEFAULT 0,
    populacao_2024 INTEGER DEFAULT 0,
    eleitores_2024 INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mesorregiao_id) REFERENCES mesorregioes(id),
    FOREIGN KEY (regional_psdb_id) REFERENCES regionais_psdb(id)
);

-- Índices específicos para tabelas regionais
CREATE INDEX IF NOT EXISTS idx_regionais_psdb_mesorregiao ON regionais_psdb(mesorregiao_id);
CREATE INDEX IF NOT EXISTS idx_regionais_psdb_nome ON regionais_psdb(nome);
CREATE INDEX IF NOT EXISTS idx_municipios_regionais_regional ON municipios_regionais(regional_psdb_id);
CREATE INDEX IF NOT EXISTS idx_municipios_regionais_mesorregiao ON municipios_regionais(mesorregiao_id);
CREATE INDEX IF NOT EXISTS idx_municipios_regionais_nome ON municipios_regionais(nome);
CREATE INDEX IF NOT EXISTS idx_municipios_nome ON municipios(nome);

-- Índices específicos para tabela eleicoes
CREATE INDEX IF NOT EXISTS idx_eleicoes_ano ON eleicoes(ano);
CREATE INDEX IF NOT EXISTS idx_eleicoes_tipo ON eleicoes(tipo);
CREATE INDEX IF NOT EXISTS idx_eleicoes_ano_turno ON eleicoes(ano, turno);
CREATE INDEX IF NOT EXISTS idx_eleicoes_ano_desc ON eleicoes(ano DESC);

-- Inserir dados iniciais de estados brasileiros (principais)
INSERT INTO estados (sigla, nome, latitude, longitude) VALUES
('SC', 'Santa Catarina', -27.2423, -50.2189),
('PR', 'Paraná', -24.7944, -51.0000),
('RS', 'Rio Grande do Sul', -30.0346, -51.2177),
('SP', 'São Paulo', -23.5505, -46.6333),
('RJ', 'Rio de Janeiro', -22.9068, -43.1729),
('MG', 'Minas Gerais', -19.9167, -43.9345),
('ES', 'Espírito Santo', -19.1834, -40.3089),
('BA', 'Bahia', -12.9714, -38.5014),
('SE', 'Sergipe', -10.5741, -37.3857),
('AL', 'Alagoas', -9.5713, -36.7820),
('PE', 'Pernambuco', -8.0476, -34.8770),
('PB', 'Paraíba', -7.1195, -34.8450),
('RN', 'Rio Grande do Norte', -5.4026, -36.9541),
('CE', 'Ceará', -3.7319, -38.5267),
('PI', 'Piauí', -8.8137, -42.5157),
('MA', 'Maranhão', -2.5387, -44.2825),
('TO', 'Tocantins', -10.1753, -48.2982),
('GO', 'Goiás', -16.6864, -49.2643),
('DF', 'Distrito Federal', -15.7801, -47.9292),
('MT', 'Mato Grosso', -12.6819, -56.9211),
('MS', 'Mato Grosso do Sul', -20.7722, -54.7852),
('AC', 'Acre', -9.0238, -70.8120),
('RO', 'Rondônia', -11.5057, -63.5806),
('RR', 'Roraima', 1.4144, -61.5483),
('AP', 'Amapá', 1.4144, -51.5819),
('AM', 'Amazonas', -3.1190, -60.0217),
('PA', 'Pará', -1.9981, -46.3076)
ON CONFLICT (sigla) DO NOTHING;

-- Inserir dados de municípios de SC (baseado nos seus dados)
INSERT INTO municipios (codigo, nome, sigla_uf, latitude, longitude) VALUES
(80896, 'CRICIÚMA', 'SC', -28.6775, -49.3697),
(83275, 'SÃO JOSÉ', 'SC', -27.6136, -48.6366),
(81051, 'FLORIANÓPOLIS', 'SC', -27.5954, -48.5480),
(81833, 'LAGES', 'SC', -27.8161, -50.3259),
(83259, 'SÃO JOAQUIM', 'SC', -28.2939, -49.9317),
(83798, 'VIDEIRA', 'SC', -27.0089, -51.1517),
(83178, 'SÃO DOMINGOS', 'SC', -26.5581, -52.5317),
(81477, 'INDAIAL', 'SC', -26.8989, -49.2317),
(83470, 'SIDERÓPOLIS', 'SC', -28.5981, -49.4267),
(80390, 'BALNEÁRIO CAMBORIÚ', 'SC', -26.9906, -48.6342),
(81078, 'FRAIBURGO', 'SC', -27.0256, -50.8075),
(82651, 'PORTO BELO', 'SC', -27.1567, -48.5450),
(80845, 'OURO VERDE', 'SC', -26.6917, -52.3100),
(83437, 'SCHROEDER', 'SC', -26.4117, -49.0733),
(80276, 'ARARANGUÁ', 'SC', -28.9356, -49.4958)
ON CONFLICT (codigo) DO NOTHING;

-- Inserir configurações padrão de visualização
INSERT INTO configuracoes_visualizacao (nome, tipo, configuracoes) VALUES
('Tabela Básica', 'tabela', '{"colunas": ["municipio", "votos", "candidato"], "ordenacao": "votos_desc", "pagina": 10}'),
('Mapa de Calor', 'mapa', '{"tipo": "heatmap", "raio": 30, "blur": 20, "gradiente": {"0.4": "blue", "0.6": "cyan", "0.7": "lime", "0.8": "yellow", "1.0": "red"}}'),
('Gráfico de Barras', 'grafico', '{"tipo": "bar", "eixo_x": "municipio", "eixo_y": "votos", "orientacao": "horizontal"}'),
('Gráfico de Pizza', 'grafico', '{"tipo": "pie", "campo": "municipio", "valor": "votos", "limite": 10}')
ON CONFLICT DO NOTHING;
