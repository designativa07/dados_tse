const db = require('./config/database');

async function testarPartidos() {
  try {
    console.log('🔍 Testando dados de partidos...\n');
    
    // Buscar eleição de 2022
    const eleicaoQuery = `
      SELECT id FROM eleicoes WHERE ano = 2022 ORDER BY id LIMIT 1
    `;
    
    const eleicao = await db.query(eleicaoQuery);
    if (eleicao.rows.length === 0) {
      console.error('❌ Eleição de 2022 não encontrada');
      process.exit(1);
    }
    
    const eleicaoId = eleicao.rows[0].id;
    console.log(`📊 Eleição 2022 encontrada - ID: ${eleicaoId}`);
    
    // Testar consulta da tabela com partido
    console.log('\n📋 Testando consulta da tabela com partido...');
    const tabelaQuery = `
      SELECT 
        m.nome as municipio,
        v.quantidade_votos as votos,
        c.nome as candidato,
        c.partido,
        c.sigla_partido,
        c.nome_partido
      FROM votos v
      JOIN municipios m ON v.municipio_id = m.id
      JOIN candidatos c ON v.candidato_id = c.id
      JOIN eleicoes e ON v.eleicao_id = e.id
      WHERE v.eleicao_id = $1
      ORDER BY v.quantidade_votos DESC
      LIMIT 10
    `;
    
    const tabelaResult = await db.query(tabelaQuery, [eleicaoId]);
    console.log('✅ Consulta da tabela executada com sucesso');
    console.log(`📊 Encontrados ${tabelaResult.rows.length} registros`);
    
    if (tabelaResult.rows.length > 0) {
      console.log('\n📋 Primeiros 5 registros:');
      tabelaResult.rows.slice(0, 5).forEach((row, index) => {
        console.log(`${index + 1}. ${row.candidato} - ${row.sigla_partido || 'N/A'} - ${row.partido || 'N/A'} - ${row.votos} votos`);
      });
    }
    
    // Testar consulta agregada por candidato
    console.log('\n📊 Testando consulta agregada por candidato...');
    const agregadaQuery = `
      SELECT 
        c.id, c.nome, c.cargo, c.numero, c.partido, c.sigla_partido, c.nome_partido,
        SUM(v.quantidade_votos) as total_votos
      FROM votos v
      JOIN municipios m ON v.municipio_id = m.id
      JOIN candidatos c ON v.candidato_id = c.id
      WHERE v.eleicao_id = $1
      GROUP BY c.id, c.nome, c.cargo, c.numero, c.partido, c.sigla_partido, c.nome_partido
      ORDER BY total_votos DESC
      LIMIT 10
    `;
    
    const agregadaResult = await db.query(agregadaQuery, [eleicaoId]);
    console.log('✅ Consulta agregada executada com sucesso');
    console.log(`📊 Encontrados ${agregadaResult.rows.length} candidatos`);
    
    if (agregadaResult.rows.length > 0) {
      console.log('\n📋 Top 5 candidatos:');
      agregadaResult.rows.slice(0, 5).forEach((row, index) => {
        console.log(`${index + 1}. ${row.nome} (${row.numero}) - ${row.sigla_partido || 'N/A'} - ${row.total_votos} votos`);
      });
    }
    
    // Verificar candidatos sem partido
    console.log('\n⚠️  Verificando candidatos sem partido...');
    const semPartidoQuery = `
      SELECT COUNT(*) as total_sem_partido
      FROM candidatos c
      WHERE c.eleicao_id = $1 AND (c.partido IS NULL OR c.partido = '')
    `;
    
    const semPartidoResult = await db.query(semPartidoQuery, [eleicaoId]);
    const totalSemPartido = parseInt(semPartidoResult.rows[0].total_sem_partido);
    
    console.log(`📊 Candidatos sem partido: ${totalSemPartido}`);
    
    if (totalSemPartido > 0) {
      console.log('⚠️  Alguns candidatos não têm dados de partido. Execute a importação completa.');
    } else {
      console.log('✅ Todos os candidatos têm dados de partido!');
    }
    
    // Estatísticas por partido
    console.log('\n📈 Estatísticas por partido:');
    const statsPartidoQuery = `
      SELECT 
        c.sigla_partido,
        c.nome_partido,
        COUNT(*) as total_candidatos,
        SUM(v.quantidade_votos) as total_votos
      FROM candidatos c
      LEFT JOIN votos v ON c.id = v.candidato_id
      WHERE c.eleicao_id = $1 AND c.sigla_partido IS NOT NULL
      GROUP BY c.sigla_partido, c.nome_partido
      ORDER BY total_votos DESC NULLS LAST
      LIMIT 10
    `;
    
    const statsPartido = await db.query(statsPartidoQuery, [eleicaoId]);
    statsPartido.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.sigla_partido} - ${row.nome_partido} - ${row.total_candidatos} candidatos - ${parseInt(row.total_votos || 0).toLocaleString('pt-BR')} votos`);
    });
    
    console.log('\n🎉 Teste concluído!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

testarPartidos();
