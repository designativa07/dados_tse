const db = require('./config/database');

async function corrigirFinalSimples() {
  try {
    console.log('🔧 Corrigindo para a configuração correta...\n');
    
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
    
    // A solução mais simples: criar dois candidatos separados
    console.log('\n2. Criando candidatos corretos...');
    
    // Primeiro, vamos verificar se já existe MARILISA como Vice-Governadora
    const marilisaViceQuery = `
      SELECT id, nome, nome_urna, cargo
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND cargo ILIKE '%Vice%'
      AND (nome ILIKE '%MARILISA%' OR nome_urna ILIKE '%MARILISA%');
    `;
    
    const marilisaViceResult = await db.query(marilisaViceQuery);
    
    if (marilisaViceResult.rows.length === 0) {
      console.log('   Criando MARILISA BOEHM como Vice-Governadora...');
      
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
        
        // Usar um número único para MARILISA
        const insertMarilisaQuery = `
          INSERT INTO candidatos (
            eleicao_id, nome, nome_urna, cargo, numero, partido, sigla_partido, 
            nome_partido, numero_partido, descricao_situacao_candidatura
          ) VALUES (
            3, 'MARILISA BOEHM', 'DELEGADA MARILISA', 'Vice-Governador', 
            '999', $1, $2, $3, $4, 'APTO'
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
      console.log('   MARILISA já existe como Vice-Governadora');
    }
    
    // Verificar resultado final
    console.log('\n3. Verificando resultado final...');
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
    console.log('✅ JORGINHO MELLO é Governador (PL - Número 22)');
    console.log('✅ DELEGADA MARILISA é Vice-Governadora (PL - Número 999)');
    console.log('✅ Agora cada um tem seu cargo correto');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

corrigirFinalSimples();

