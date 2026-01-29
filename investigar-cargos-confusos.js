const db = require('./config/database');

async function investigarCargosConfusos() {
  try {
    console.log('🔍 Investigando problemas com cargos de Governador e Vice-Governador...\n');
    
    // Buscar candidatos com nome JORGINHO
    console.log('1. Candidatos com nome JORGINHO:');
    const jorginhoQuery = `
      SELECT 
        id, nome, nome_urna, cargo, partido, sigla_partido, eleicao_id
      FROM candidatos 
      WHERE nome ILIKE '%JORGINHO%'
      ORDER BY eleicao_id, cargo;
    `;
    
    const jorginhoResult = await db.query(jorginhoQuery);
    jorginhoResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Eleição: ${candidato.eleicao_id}`);
    });
    
    // Buscar candidatos com nome DELEGADA MARILISA
    console.log('\n2. Candidatos com nome DELEGADA MARILISA:');
    const marilisaQuery = `
      SELECT 
        id, nome, nome_urna, cargo, partido, sigla_partido, eleicao_id
      FROM candidatos 
      WHERE nome_urna ILIKE '%DELEGADA MARILISA%' OR nome ILIKE '%DELEGADA MARILISA%'
      ORDER BY eleicao_id, cargo;
    `;
    
    const marilisaResult = await db.query(marilisaQuery);
    marilisaResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Eleição: ${candidato.eleicao_id}`);
    });
    
    // Verificar se há candidatos duplicados com mesmo nome mas cargos diferentes
    console.log('\n3. Verificando duplicatas por nome:');
    const duplicatasQuery = `
      SELECT 
        nome, 
        COUNT(*) as total,
        STRING_AGG(DISTINCT cargo, ', ') as cargos,
        STRING_AGG(DISTINCT id::text, ', ') as ids
      FROM candidatos 
      WHERE eleicao_id = 3
      GROUP BY nome
      HAVING COUNT(*) > 1
      ORDER BY total DESC
      LIMIT 10;
    `;
    
    const duplicatasResult = await db.query(duplicatasQuery);
    duplicatasResult.rows.forEach(duplicata => {
      console.log(`   Nome: ${duplicata.nome} | Total: ${duplicata.total} | Cargos: ${duplicata.cargos} | IDs: ${duplicata.ids}`);
    });
    
    // Verificar candidatos de Governador e Vice-Governador na eleição 2022
    console.log('\n4. Candidatos Governador e Vice-Governador (2022):');
    const governadoresQuery = `
      SELECT 
        id, nome, nome_urna, cargo, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (cargo ILIKE '%Governador%' OR cargo ILIKE '%Vice%')
      ORDER BY cargo, nome;
    `;
    
    const governadoresResult = await db.query(governadoresQuery);
    governadoresResult.rows.forEach(candidato => {
      const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' && candidato.nome_urna !== '#NULO' 
          ? candidato.nome_urna 
          : candidato.nome;
      console.log(`   ID: ${candidato.id} | Nome: ${nomeExibir} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero}`);
    });
    
    // Verificar se há problemas com VOTO BRANCO e VOTO NULO
    console.log('\n5. Verificando VOTO BRANCO e VOTO NULO:');
    const votosQuery = `
      SELECT 
        id, nome, cargo, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (nome ILIKE '%VOTO%' OR nome ILIKE '%BRANCO%' OR nome ILIKE '%NULO%')
      ORDER BY nome;
    `;
    
    const votosResult = await db.query(votosQuery);
    votosResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

investigarCargosConfusos();
