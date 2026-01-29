const db = require('./config/database');

async function corrigirDadosJorginho() {
  try {
    console.log('🔧 Corrigindo dados do JORGINHO MELLO...\n');
    
    // Primeiro, vamos verificar se existe MARILISA BOEHM no banco
    console.log('1. Verificando se MARILISA BOEHM existe no banco...');
    const marilisaQuery = `
      SELECT id, nome, nome_urna, cargo, partido, sigla_partido, numero
      FROM candidatos 
      WHERE nome ILIKE '%MARILISA%BOEHM%' OR nome ILIKE '%MARILISA%'
      AND eleicao_id = 3;
    `;
    
    const marilisaResult = await db.query(marilisaQuery);
    console.log('   Candidatos MARILISA encontrados:');
    marilisaResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero}`);
    });
    
    // Verificar se há candidato Governador PL número 22
    console.log('\n2. Verificando candidato Governador PL número 22...');
    const governadorQuery = `
      SELECT id, nome, nome_urna, cargo, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND sigla_partido = 'PL' 
      AND numero = '22'
      AND cargo ILIKE '%Governador%';
    `;
    
    const governadorResult = await db.query(governadorQuery);
    console.log('   Candidatos Governador PL 22:');
    governadorResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero}`);
    });
    
    // Corrigir JORGINHO MELLO (ID 1496) - deve ser Governador
    console.log('\n3. Corrigindo JORGINHO MELLO para Governador...');
    const updateJorginhoQuery = `
      UPDATE candidatos 
      SET 
        cargo = 'Governador',
        nome_urna = 'JORGINHO MELLO'
      WHERE id = 1496;
    `;
    
    const updateJorginhoResult = await db.query(updateJorginhoQuery);
    console.log(`   ✅ JORGINHO MELLO atualizado: ${updateJorginhoResult.rowCount} linha(s) afetada(s)`);
    
    // Verificar se MARILISA BOEHM existe, se não, criar
    if (marilisaResult.rows.length === 0) {
      console.log('\n4. Criando candidato MARILISA BOEHM (Vice-Governadora)...');
      
      // Buscar dados de um candidato PL para usar como base
      const baseQuery = `
        SELECT eleicao_id, partido, sigla_partido, numero_partido, nome_partido
        FROM candidatos 
        WHERE eleicao_id = 3 AND sigla_partido = 'PL' 
        LIMIT 1;
      `;
      
      const baseResult = await db.query(baseQuery);
      if (baseResult.rows.length > 0) {
        const base = baseResult.rows[0];
        
        const insertMarilisaQuery = `
          INSERT INTO candidatos (
            eleicao_id, nome, nome_urna, cargo, numero, partido, sigla_partido, 
            nome_partido, numero_partido, descricao_situacao_candidatura
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          );
        `;
        
        const marilisaParams = [
          base.eleicao_id,
          'MARILISA BOEHM',
          'DELEGADA MARILISA',
          'Vice-Governador',
          '22',
          base.partido,
          base.sigla_partido,
          base.nome_partido,
          base.numero_partido,
          'APTO'
        ];
        
        const insertResult = await db.query(insertMarilisaQuery, marilisaParams);
        console.log(`   ✅ MARILISA BOEHM criada: ${insertResult.rowCount} linha(s) inserida(s)`);
      }
    } else {
      console.log('\n4. MARILISA BOEHM já existe, atualizando cargo...');
      const updateMarilisaQuery = `
        UPDATE candidatos 
        SET cargo = 'Vice-Governador'
        WHERE id = ${marilisaResult.rows[0].id};
      `;
      
      const updateMarilisaResult = await db.query(updateMarilisaQuery);
      console.log(`   ✅ MARILISA BOEHM atualizada: ${updateMarilisaResult.rowCount} linha(s) afetada(s)`);
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
    console.log('✅ JORGINHO MELLO agora é Governador');
    console.log('✅ DELEGADA MARILISA agora é Vice-Governadora');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

corrigirDadosJorginho();

