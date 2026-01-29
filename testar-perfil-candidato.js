const db = require('./config/database');

async function testarPerfilCandidato() {
  try {
    console.log('🔍 Testando funcionalidade de perfil de candidato...\n');
    
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
    
    // Buscar um candidato com dados completos
    const candidatoQuery = `
      SELECT 
        c.id,
        c.nome,
        c.cargo,
        c.numero,
        c.partido,
        c.sigla_partido,
        c.nome_partido,
        c.descricao_situacao_candidatura,
        SUM(v.quantidade_votos) as total_votos
      FROM candidatos c
      LEFT JOIN votos v ON c.id = v.candidato_id
      WHERE c.eleicao_id = $1
        AND c.partido IS NOT NULL
        AND c.sigla_partido IS NOT NULL
      GROUP BY c.id, c.nome, c.cargo, c.numero, c.partido, c.sigla_partido, c.nome_partido, c.descricao_situacao_candidatura
      ORDER BY total_votos DESC NULLS LAST
      LIMIT 1
    `;
    
    const candidatoResult = await db.query(candidatoQuery, [eleicaoId]);
    
    if (candidatoResult.rows.length === 0) {
      console.error('❌ Nenhum candidato com dados completos encontrado');
      process.exit(1);
    }
    
    const candidato = candidatoResult.rows[0];
    console.log(`✅ Candidato encontrado: ${candidato.nome} (ID: ${candidato.id})`);
    console.log(`   Partido: ${candidato.sigla_partido} - ${candidato.nome_partido}`);
    console.log(`   Cargo: ${candidato.cargo}`);
    console.log(`   Total de votos: ${parseInt(candidato.total_votos || 0).toLocaleString('pt-BR')}`);
    
    // Testar API do candidato
    console.log('\n🌐 Testando API do candidato...');
    const apiUrl = `http://localhost:3000/api/candidatos/${candidato.id}`;
    console.log(`   URL: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API funcionando corretamente');
        console.log(`   Nome: ${data.nome}`);
        console.log(`   Partido: ${data.sigla_partido || data.partido}`);
        console.log(`   Total de votos: ${data.total_votos || 0}`);
        console.log(`   Municípios: ${data.total_municipios || 0}`);
        console.log(`   Zonas: ${data.total_zonas || 0}`);
        console.log(`   Seções: ${data.total_secoes || 0}`);
      } else {
        console.log('❌ Erro na API:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('⚠️  Não foi possível testar a API (servidor pode não estar rodando)');
      console.log(`   Erro: ${error.message}`);
    }
    
    // Testar página de perfil
    console.log('\n📄 Testando página de perfil...');
    const perfilUrl = `http://localhost:3000/perfil-candidato.html?id=${candidato.id}`;
    console.log(`   URL: ${perfilUrl}`);
    console.log('   Abra esta URL no navegador para testar a página de perfil');
    
    // Verificar se a página existe
    const fs = require('fs');
    const path = require('path');
    const perfilPath = path.join(__dirname, 'public', 'perfil-candidato.html');
    
    if (fs.existsSync(perfilPath)) {
      console.log('✅ Página de perfil encontrada');
    } else {
      console.log('❌ Página de perfil não encontrada');
    }
    
    // Mostrar instruções
    console.log('\n📋 Instruções para testar:');
    console.log('1. Inicie o servidor: npm start');
    console.log('2. Acesse: http://localhost:3000');
    console.log('3. Configure os filtros para mostrar candidatos');
    console.log('4. Clique no nome de um candidato na tabela');
    console.log('5. Você será redirecionado para a página de perfil');
    
    console.log('\n🎉 Teste concluído!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

testarPerfilCandidato();
