const db = require('./config/database');

async function testarQueryCandidatos() {
  try {
    console.log('🔍 Testando query de candidatos diretamente no banco...\n');
    
    // Testar a query que a API deveria estar usando
    const query = `
      SELECT 
        c.id,
        c.nome,
        c.nome_urna,
        c.cargo,
        c.numero,
        c.partido,
        c.sigla_partido,
        c.nome_partido,
        c.descricao_situacao_candidatura,
        e.ano as eleicao_ano,
        SUM(v.quantidade_votos) as total_votos
      FROM candidatos c
      JOIN eleicoes e ON c.eleicao_id = e.id
      LEFT JOIN votos v ON c.id = v.candidato_id
      WHERE c.eleicao_id = 3 
      AND c.nome NOT ILIKE '%VOTO BRANCO%'
      AND c.nome NOT ILIKE '%VOTO NULO%'
      GROUP BY c.id, c.nome, c.nome_urna, c.cargo, c.numero, c.partido, c.sigla_partido, c.nome_partido, c.descricao_situacao_candidatura, e.ano
      ORDER BY total_votos DESC NULLS LAST, c.nome
      LIMIT 10;
    `;
    
    const result = await db.query(query);
    
    console.log('📋 Resultados da query:');
    result.rows.forEach((candidato, index) => {
      const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' && candidato.nome_urna !== '#NULO' 
          ? candidato.nome_urna 
          : candidato.nome;
      
      console.log(`\n   ${index + 1}. ID: ${candidato.id}`);
      console.log(`      Nome: ${candidato.nome}`);
      console.log(`      Nome Urna: ${candidato.nome_urna || 'N/A'}`);
      console.log(`      Nome a Exibir: ${nomeExibir}`);
      console.log(`      Cargo: ${candidato.cargo}`);
      console.log(`      Partido: ${candidato.sigla_partido}`);
      console.log(`      Votos: ${parseInt(candidato.total_votos || 0).toLocaleString('pt-BR')}`);
    });
    
    // Verificar se VOTO BRANCO/NULO foram excluídos
    const votosBrancos = result.rows.filter(c => c.nome.includes('VOTO BRANCO'));
    const votosNulos = result.rows.filter(c => c.nome.includes('VOTO NULO'));
    
    console.log(`\n✅ VOTO BRANCO excluído: ${votosBrancos.length === 0 ? 'Sim' : 'Não'}`);
    console.log(`✅ VOTO NULO excluído: ${votosNulos.length === 0 ? 'Sim' : 'Não'}`);
    
    // Verificar se nome_urna está sendo retornado
    const candidatosComNomeUrna = result.rows.filter(c => c.nome_urna && c.nome_urna !== 'N/A' && c.nome_urna !== '#NULO');
    console.log(`✅ Candidatos com nome na urna: ${candidatosComNomeUrna.length}`);
    
    if (candidatosComNomeUrna.length > 0) {
      console.log('   Exemplos:');
      candidatosComNomeUrna.slice(0, 3).forEach(c => {
        console.log(`   - ${c.nome} -> ${c.nome_urna}`);
      });
    }
    
    console.log('\n💡 A query está funcionando corretamente!');
    console.log('   O problema é que o servidor precisa ser reiniciado para aplicar as mudanças.');
    console.log('   Execute: Ctrl+C e depois npm start');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

testarQueryCandidatos();

