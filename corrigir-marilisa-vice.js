const db = require('./config/database');

async function corrigirMarilisaVice() {
  try {
    console.log('🔧 Corrigindo MARILISA BOEHM para Vice-Governadora...\n');
    
    // Buscar MARILISA BOEHM
    console.log('1. Buscando MARILISA BOEHM...');
    const marilisaQuery = `
      SELECT id, nome, nome_urna, cargo, partido, sigla_partido, numero, eleicao_id
      FROM candidatos 
      WHERE nome ILIKE '%MARILISA%BOEHM%'
      ORDER BY eleicao_id;
    `;
    
    const marilisaResult = await db.query(marilisaQuery);
    console.log('   Candidatos MARILISA BOEHM encontrados:');
    marilisaResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero} | Eleição: ${candidato.eleicao_id}`);
    });
    
    // Buscar candidato PL 2022 para usar dados como base
    console.log('\n2. Buscando dados PL 2022 para usar como base...');
    const plQuery = `
      SELECT partido, sigla_partido, nome_partido, numero_partido
      FROM candidatos 
      WHERE eleicao_id = 3 AND sigla_partido = 'PL' 
      LIMIT 1;
    `;
    
    const plResult = await db.query(plQuery);
    if (plResult.rows.length === 0) {
      console.log('❌ Não encontrou dados PL 2022');
      process.exit(1);
    }
    
    const plData = plResult.rows[0];
    console.log(`   Dados PL encontrados: ${plData.sigla_partido} - ${plData.nome_partido}`);
    
    // Verificar se já existe MARILISA como Vice-Governadora na eleição 2022
    const marilisaViceQuery = `
      SELECT id, nome, nome_urna, cargo
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (nome ILIKE '%MARILISA%' OR nome_urna ILIKE '%DELEGADA MARILISA%')
      AND cargo ILIKE '%Vice%';
    `;
    
    const marilisaViceResult = await db.query(marilisaViceQuery);
    
    if (marilisaViceResult.rows.length > 0) {
      console.log('\n3. MARILISA já existe como Vice-Governadora na eleição 2022:');
      marilisaViceResult.rows.forEach(candidato => {
        console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo}`);
      });
    } else {
      console.log('\n3. Criando MARILISA BOEHM como Vice-Governadora na eleição 2022...');
      
      const insertMarilisaQuery = `
        INSERT INTO candidatos (
          eleicao_id, nome, nome_urna, cargo, numero, partido, sigla_partido, 
          nome_partido, numero_partido, descricao_situacao_candidatura
        ) VALUES (
          3, 'MARILISA BOEHM', 'DELEGADA MARILISA', 'Vice-Governador', 
          '22', $1, $2, $3, $4, 'APTO'
        );
      `;
      
      const marilisaParams = [
        plData.partido,
        plData.sigla_partido,
        plData.nome_partido,
        plData.numero_partido
      ];
      
      const insertResult = await db.query(insertMarilisaQuery, marilisaParams);
      console.log(`   ✅ MARILISA BOEHM criada como Vice-Governadora: ${insertResult.rowCount} linha(s) inserida(s)`);
    }
    
    // Verificar resultado final
    console.log('\n4. Verificando resultado final...');
    const finalQuery = `
      SELECT id, nome, nome_urna, cargo, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (nome ILIKE '%JORGINHO%' OR nome ILIKE '%MARILISA%')
      ORDER BY cargo;
    `;
    
    const finalResult = await db.query(finalQuery);
    console.log('   Resultado final:');
    finalResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero}`);
    });
    
    console.log('\n🎉 Correção concluída!');
    console.log('✅ JORGINHO MELLO é Governador');
    console.log('✅ DELEGADA MARILISA é Vice-Governadora');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

corrigirMarilisaVice();

