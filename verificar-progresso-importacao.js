const db = require('./config/database');

async function verificarProgresso() {
  try {
    console.log('🔍 Verificando progresso da importação...\n');
    
    // Verificar registros por ano
    const resultado2018 = await db.query('SELECT COUNT(*) as total FROM perfil_eleitor_secao WHERE ano_eleicao = 2018');
    const resultado2022 = await db.query('SELECT COUNT(*) as total FROM perfil_eleitor_secao WHERE ano_eleicao = 2022');
    
    console.log(`📊 Registros de 2018: ${resultado2018.rows[0].total}`);
    console.log(`📊 Registros de 2022: ${resultado2022.rows[0].total}`);
    
    // Verificar total geral
    const totalGeral = await db.query('SELECT COUNT(*) as total FROM perfil_eleitor_secao');
    console.log(`📊 Total geral: ${totalGeral.rows[0].total}`);
    
    // Verificar municípios únicos
    const municipiosUnicos = await db.query('SELECT COUNT(DISTINCT municipio_id) as total FROM perfil_eleitor_secao WHERE municipio_id IS NOT NULL');
    console.log(`📊 Municípios únicos: ${municipiosUnicos.rows[0].total}`);
    
    // Verificar alguns exemplos
    const exemplos = await db.query(`
      SELECT ano_eleicao, nm_municipio, nr_zona, nr_secao, ds_genero, ds_faixa_etaria, qt_eleitores_perfil 
      FROM perfil_eleitor_secao 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Últimos registros inseridos:');
    exemplos.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.ano_eleicao} - ${row.nm_municipio} (Zona ${row.nr_zona}, Seção ${row.nr_secao}) - ${row.ds_genero}, ${row.ds_faixa_etaria}: ${row.qt_eleitores_perfil} eleitores`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar progresso:', error.message);
  } finally {
    await db.closePool();
  }
}

verificarProgresso();
