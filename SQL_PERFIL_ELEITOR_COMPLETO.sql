-- ========================================
-- SCRIPT COMPLETO PARA PERFIL DO ELEITOR
-- ========================================
-- Execute este script no PostgreSQL para criar a estrutura completa
-- e depois execute o script de importação Node.js

-- 1. Criar tabela de perfil do eleitor por seção
CREATE TABLE IF NOT EXISTS perfil_eleitor_secao (
    id SERIAL PRIMARY KEY,
    dt_geracao DATE NOT NULL,
    hh_geracao TIME NOT NULL,
    ano_eleicao INTEGER NOT NULL,
    sg_uf VARCHAR(2) NOT NULL,
    cd_municipio INTEGER NOT NULL,
    nm_municipio VARCHAR(100) NOT NULL,
    nr_zona INTEGER NOT NULL,
    nr_secao INTEGER NOT NULL,
    nr_local_votacao INTEGER,
    nm_local_votacao VARCHAR(500),
    cd_genero INTEGER,
    ds_genero VARCHAR(50),
    cd_estado_civil INTEGER,
    ds_estado_civil VARCHAR(50),
    cd_faixa_etaria INTEGER,
    ds_faixa_etaria VARCHAR(50),
    cd_grau_escolaridade INTEGER,
    ds_grau_escolaridade VARCHAR(100),
    cd_raca_cor INTEGER,
    ds_raca_cor VARCHAR(50),
    cd_identidade_genero INTEGER,
    ds_identidade_genero VARCHAR(50),
    cd_quilombola INTEGER,
    ds_quilombola VARCHAR(50),
    cd_interprete_libras INTEGER,
    ds_interprete_libras VARCHAR(50),
    tp_obrigatoriedade_voto VARCHAR(50),
    qt_eleitores_perfil INTEGER NOT NULL DEFAULT 0,
    qt_eleitores_biometria INTEGER NOT NULL DEFAULT 0,
    qt_eleitores_deficiencia INTEGER NOT NULL DEFAULT 0,
    qt_eleitores_inc_nm_social INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Relacionamentos
    municipio_id INTEGER,
    eleicao_id INTEGER,
    
    FOREIGN KEY (municipio_id) REFERENCES municipios(id),
    FOREIGN KEY (eleicao_id) REFERENCES eleicoes(id)
);

-- 2. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_ano ON perfil_eleitor_secao(ano_eleicao);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_uf ON perfil_eleitor_secao(sg_uf);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_municipio ON perfil_eleitor_secao(cd_municipio);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_zona ON perfil_eleitor_secao(nr_zona);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_secao ON perfil_eleitor_secao(nr_secao);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_genero ON perfil_eleitor_secao(cd_genero);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_faixa_etaria ON perfil_eleitor_secao(cd_faixa_etaria);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_escolaridade ON perfil_eleitor_secao(cd_grau_escolaridade);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_raca ON perfil_eleitor_secao(cd_raca_cor);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_municipio_id ON perfil_eleitor_secao(municipio_id);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_eleicao_id ON perfil_eleitor_secao(eleicao_id);

-- Índices compostos para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_ano_uf_municipio ON perfil_eleitor_secao(ano_eleicao, sg_uf, cd_municipio);
CREATE INDEX IF NOT EXISTS idx_perfil_eleitor_zona_secao ON perfil_eleitor_secao(nr_zona, nr_secao);

-- 3. Inserir eleições se não existirem
INSERT INTO eleicoes (ano, tipo, descricao, turno) 
VALUES 
    (2018, 'Geral', 'Eleição Geral 2018', 1),
    (2022, 'Geral', 'Eleição Geral 2022', 1)
ON CONFLICT (ano) DO NOTHING;

-- 4. Comentários para documentação
COMMENT ON TABLE perfil_eleitor_secao IS 'Dados demográficos detalhados dos eleitores por seção eleitoral';
COMMENT ON COLUMN perfil_eleitor_secao.dt_geracao IS 'Data de geração do arquivo pelo TSE';
COMMENT ON COLUMN perfil_eleitor_secao.hh_geracao IS 'Hora de geração do arquivo pelo TSE';
COMMENT ON COLUMN perfil_eleitor_secao.ano_eleicao IS 'Ano da eleição (2018, 2022, etc.)';
COMMENT ON COLUMN perfil_eleitor_secao.sg_uf IS 'Sigla do estado (SC, PR, etc.)';
COMMENT ON COLUMN perfil_eleitor_secao.cd_municipio IS 'Código do município no TSE';
COMMENT ON COLUMN perfil_eleitor_secao.nm_municipio IS 'Nome do município';
COMMENT ON COLUMN perfil_eleitor_secao.nr_zona IS 'Número da zona eleitoral';
COMMENT ON COLUMN perfil_eleitor_secao.nr_secao IS 'Número da seção eleitoral';
COMMENT ON COLUMN perfil_eleitor_secao.nr_local_votacao IS 'Número do local de votação';
COMMENT ON COLUMN perfil_eleitor_secao.nm_local_votacao IS 'Nome do local de votação';
COMMENT ON COLUMN perfil_eleitor_secao.cd_genero IS 'Código do gênero (2=MASCULINO, 4=FEMININO)';
COMMENT ON COLUMN perfil_eleitor_secao.ds_genero IS 'Descrição do gênero';
COMMENT ON COLUMN perfil_eleitor_secao.cd_estado_civil IS 'Código do estado civil';
COMMENT ON COLUMN perfil_eleitor_secao.ds_estado_civil IS 'Descrição do estado civil';
COMMENT ON COLUMN perfil_eleitor_secao.cd_faixa_etaria IS 'Código da faixa etária';
COMMENT ON COLUMN perfil_eleitor_secao.ds_faixa_etaria IS 'Descrição da faixa etária';
COMMENT ON COLUMN perfil_eleitor_secao.cd_grau_escolaridade IS 'Código do grau de escolaridade';
COMMENT ON COLUMN perfil_eleitor_secao.ds_grau_escolaridade IS 'Descrição do grau de escolaridade';
COMMENT ON COLUMN perfil_eleitor_secao.cd_raca_cor IS 'Código da raça/cor';
COMMENT ON COLUMN perfil_eleitor_secao.ds_raca_cor IS 'Descrição da raça/cor';
COMMENT ON COLUMN perfil_eleitor_secao.cd_identidade_genero IS 'Código da identidade de gênero';
COMMENT ON COLUMN perfil_eleitor_secao.ds_identidade_genero IS 'Descrição da identidade de gênero';
COMMENT ON COLUMN perfil_eleitor_secao.cd_quilombola IS 'Código quilombola';
COMMENT ON COLUMN perfil_eleitor_secao.ds_quilombola IS 'Descrição quilombola';
COMMENT ON COLUMN perfil_eleitor_secao.cd_interprete_libras IS 'Código intérprete de libras';
COMMENT ON COLUMN perfil_eleitor_secao.ds_interprete_libras IS 'Descrição intérprete de libras';
COMMENT ON COLUMN perfil_eleitor_secao.tp_obrigatoriedade_voto IS 'Tipo de obrigatoriedade do voto';
COMMENT ON COLUMN perfil_eleitor_secao.qt_eleitores_perfil IS 'Quantidade de eleitores no perfil';
COMMENT ON COLUMN perfil_eleitor_secao.qt_eleitores_biometria IS 'Quantidade de eleitores com biometria';
COMMENT ON COLUMN perfil_eleitor_secao.qt_eleitores_deficiencia IS 'Quantidade de eleitores com deficiência';
COMMENT ON COLUMN perfil_eleitor_secao.qt_eleitores_inc_nm_social IS 'Quantidade de eleitores com nome social';

-- 5. Verificar se a estrutura foi criada corretamente
SELECT 
    'Tabela criada com sucesso!' as status,
    COUNT(*) as total_colunas
FROM information_schema.columns 
WHERE table_name = 'perfil_eleitor_secao';

-- 6. Verificar índices criados
SELECT 
    'Índices criados:' as status,
    COUNT(*) as total_indices
FROM pg_indexes 
WHERE tablename = 'perfil_eleitor_secao';

-- 7. Verificar eleições inseridas
SELECT 
    'Eleições disponíveis:' as status,
    COUNT(*) as total_eleicoes
FROM eleicoes 
WHERE ano IN (2018, 2022);

-- ========================================
-- PRÓXIMOS PASSOS:
-- ========================================
-- 1. Execute este script SQL no PostgreSQL
-- 2. Execute: node importar-perfil-eleitor.js
-- 3. Execute: node testar-importacao-perfil.js
-- ========================================
