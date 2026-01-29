const db = require('./config/database');

async function testarInsercaoSimples() {
    try {
        console.log('🧪 Testando inserção simples...');
        
        // Dados de teste mínimos
        const dados = {
            dt_geracao: '2024-01-01',
            hh_geracao: '10:00:00',
            ano_eleicao: 2018,
            sg_uf: 'SC',
            cd_municipio: 4205406,
            nm_municipio: 'FLORIANOPOLIS',
            nr_zona: 1,
            nr_secao: 1,
            cd_genero: 2,
            ds_genero: 'MASCULINO',
            qt_eleitores_perfil: 100,
            municipio_id: 1,
            eleicao_id: 1
        };
        
        // Query simples com apenas campos obrigatórios
        const query = `
            INSERT INTO perfil_eleitor_secao (
                dt_geracao, hh_geracao, ano_eleicao, sg_uf, cd_municipio, nm_municipio,
                nr_zona, nr_secao, cd_genero, ds_genero, qt_eleitores_perfil,
                municipio_id, eleicao_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;
        
        const valores = [
            dados.dt_geracao, dados.hh_geracao, dados.ano_eleicao, dados.sg_uf, dados.cd_municipio,
            dados.nm_municipio, dados.nr_zona, dados.nr_secao, dados.cd_genero, dados.ds_genero,
            dados.qt_eleitores_perfil, dados.municipio_id, dados.eleicao_id
        ];
        
        console.log('📝 Query:', query);
        console.log('📊 Valores:', valores);
        
        await db.query(query, valores);
        console.log('✅ Inserção bem-sucedida!');
        
        // Limpar dados de teste
        await db.query('DELETE FROM perfil_eleitor_secao WHERE ano_eleicao = $1 AND cd_municipio = $2', [2018, 4205406]);
        console.log('🧹 Dados de teste removidos');
        
    } catch (error) {
        console.error('❌ Erro na inserção:', error.message);
        console.error('📋 Detalhes:', error);
    } finally {
        await db.closePool();
    }
}

testarInsercaoSimples();

