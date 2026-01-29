const db = require('./config/database');

async function corrigirCargosCorretos() {
  try {
    console.log('🔧 Corrigindo cargos para a configuração correta...\n');
    
    // Verificar situação atual
    console.log('1. Situação atual:');
    const atualQuery = `
      SELECT id, nome, nome_urna, cargo, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (nome ILIKE '%JORGINHO%' OR nome ILIKE '%MARILISA%')
      ORDER BY cargo;
    `;
    
    const atualResult = await db.query(atualQuery);
    atualResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero}`);
    });
    
    // Corrigir JORGINHO MELLO para Governador com nome na urna correto
    console.log('\n2. Corrigindo JORGINHO MELLO...');
    const updateJorginhoQuery = `
      UPDATE candidatos 
      SET 
        cargo = 'Governador',
        nome_urna = 'JORGINHO MELLO'
      WHERE id = 1496;
    `;
    
    const updateJorginhoResult = await db.query(updateJorginhoQuery);
    console.log(`   ✅ JORGINHO MELLO atualizado: ${updateJorginhoResult.rowCount} linha(s) afetada(s)`);
    
    // Verificar se existe MARILISA BOEHM na eleição 2022
    console.log('\n3. Verificando MARILISA BOEHM na eleição 2022...');
    const marilisaQuery = `
      SELECT id, nome, nome_urna, cargo, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (nome ILIKE '%MARILISA%' OR nome_urna ILIKE '%MARILISA%');
    `;
    
    const marilisaResult = await db.query(marilisaQuery);
    console.log('   Candidatos MARILISA encontrados:');
    marilisaResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero}`);
    });
    
    // Se não existe MARILISA como Vice-Governadora, criar
    const marilisaVice = marilisaResult.rows.find(c => c.cargo && c.cargo.includes('Vice'));
    
    if (!marilisaVice) {
      console.log('\n4. Criando MARILISA BOEHM como Vice-Governadora...');
      
      // Buscar dados PL para usar como base
      const plQuery = `
        SELECT partido, sigla_partido, nome_partido, numero_partido
        FROM candidatos 
        WHERE eleicao_id = 3 AND sigla_partido = 'PL' 
        LIMIT 1;
      `;
      
      const plResult = await db.query(plQuery);
      if (plResult.rows.length > 0) {
        const plData = plResult.rows[0];
        
        // Usar número diferente para evitar conflito
        const insertMarilisaQuery = `
          INSERT INTO candidatos (
            eleicao_id, nome, nome_urna, cargo, numero, partido, sigla_partido, 
            nome_partido, numero_partido, descricao_situacao_candidatura
          ) VALUES (
            3, 'MARILISA BOEHM', 'DELEGADA MARILISA', 'Vice-Governador', 
            '222', $1, $2, $3, $4, 'APTO'
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
    } else {
      console.log('\n4. MARILISA já existe como Vice-Governadora');
    }
    
    // Verificar resultado final
    console.log('\n5. Verificando resultado final...');
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
    console.log('✅ JORGINHO MELLO é Governador (nome na urna: JORGINHO MELLO)');
    console.log('✅ DELEGADA MARILISA é Vice-Governadora');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

corrigirCargosCorretos();

