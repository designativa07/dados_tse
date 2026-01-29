const db = require('./config/database');

async function verificarDados2022() {
  try {
    console.log('Verificando dados de 2022...\n');
    
    // Verificar se há dados de votos para Governador em 2022
    const votosGovernadorQuery = `
      SELECT 
        COUNT(*) as total_registros,
        SUM(quantidade_votos) as total_votos
      FROM votos v
      JOIN eleicoes e ON v.eleicao_id = e.id
      WHERE e.ano = 2022 AND v.cargo = 'GOVERNADOR'
    `;
    
    const votosGovernador = await db.query(votosGovernadorQuery);
    console.log('Votos para Governador em 2022 (tabela votos):');
    console.log(`- Total de registros: ${votosGovernador.rows[0].total_registros}`);
    console.log(`- Total de votos: ${parseInt(votosGovernador.rows[0].total_votos || 0).toLocaleString('pt-BR')}`);
    
    // Verificar se há dados brutos na tabela votos
    const dadosBrutosQuery = `
      SELECT 
        cargo,
        COUNT(*) as registros,
        SUM(quantidade_votos) as total_votos
      FROM votos v
      JOIN eleicoes e ON v.eleicao_id = e.id
      WHERE e.ano = 2022
      GROUP BY cargo
      ORDER BY total_votos DESC
    `;
    
    const dadosBrutos = await db.query(dadosBrutosQuery);
    console.log('\nDados brutos por cargo em 2022:');
    dadosBrutos.rows.forEach(row => {
      console.log(`- ${row.cargo}: ${row.registros} registros, ${parseInt(row.total_votos).toLocaleString('pt-BR')} votos`);
    });
    
    // Verificar se há problema com a importação dos candidatos
    const candidatosQuery = `
      SELECT 
        c.nome,
        c.cargo,
        c.numero,
        c.partido,
        COUNT(v.id) as registros_votos,
        SUM(v.quantidade_votos) as total_votos
      FROM candidatos c
      LEFT JOIN votos v ON c.id = v.candidato_id
      JOIN eleicoes e ON c.eleicao_id = e.id
      WHERE e.ano = 2022 AND c.cargo = 'Governador'
      GROUP BY c.id, c.nome, c.cargo, c.numero, c.partido
      ORDER BY total_votos DESC
    `;
    
    const candidatos = await db.query(candidatosQuery);
    console.log('\nCandidatos a Governador em 2022 (tabela candidatos):');
    candidatos.rows.forEach(row => {
      console.log(`- ${row.nome} (${row.numero}): ${row.registros_votos} registros, ${parseInt(row.total_votos || 0).toLocaleString('pt-BR')} votos`);
    });
    
    // Verificar se há dados de Jorginho Mello na tabela votos (sem join com candidatos)
    const jorginhoVotosQuery = `
      SELECT 
        v.cargo,
        v.nome_candidato,
        v.numero_candidato,
        COUNT(*) as registros,
        SUM(v.quantidade_votos) as total_votos
      FROM votos v
      JOIN eleicoes e ON v.eleicao_id = e.id
      WHERE e.ano = 2022 AND (v.nome_candidato ILIKE '%JORGINHO%' OR v.nome_candidato ILIKE '%MELLO%')
      GROUP BY v.cargo, v.nome_candidato, v.numero_candidato
      ORDER BY total_votos DESC
    `;
    
    const jorginhoVotos = await db.query(jorginhoVotosQuery);
    console.log('\nJorginho Mello na tabela votos (dados brutos):');
    if (jorginhoVotos.rows.length > 0) {
      jorginhoVotos.rows.forEach(row => {
        console.log(`- ${row.nome_candidato} (${row.cargo}) - ${row.numero_candidato}: ${row.registros} registros, ${parseInt(row.total_votos).toLocaleString('pt-BR')} votos`);
      });
    } else {
      console.log('Nenhum registro encontrado na tabela votos');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

verificarDados2022();
