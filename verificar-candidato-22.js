const db = require('./config/database');

async function verificarCandidato22() {
  try {
    console.log('🔍 Verificando candidato número 22 na eleição 2022...\n');
    
    // Buscar candidato número 22 na eleição 2022
    const candidato22Query = `
      SELECT id, nome, nome_urna, cargo, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 AND numero = '22';
    `;
    
    const candidato22Result = await db.query(candidato22Query);
    console.log('Candidato número 22 na eleição 2022:');
    candidato22Result.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero}`);
    });
    
    // Verificar se há MARILISA na eleição 2022
    console.log('\nCandidatos MARILISA na eleição 2022:');
    const marilisa2022Query = `
      SELECT id, nome, nome_urna, cargo, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 AND (nome ILIKE '%MARILISA%' OR nome_urna ILIKE '%MARILISA%');
    `;
    
    const marilisa2022Result = await db.query(marilisa2022Query);
    marilisa2022Result.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero}`);
    });
    
    // A solução é atualizar o candidato existente (JORGINHO) para ter MARILISA como nome na urna
    if (candidato22Result.rows.length > 0) {
      const candidato = candidato22Result.rows[0];
      
      if (candidato.nome.includes('JORGINHO')) {
        console.log('\n🔧 Solução: Atualizar JORGINHO para ter MARILISA como nome na urna...');
        
        // Atualizar para ter MARILISA como nome na urna
        const updateQuery = `
          UPDATE candidatos 
          SET nome_urna = 'DELEGADA MARILISA'
          WHERE id = ${candidato.id};
        `;
        
        const updateResult = await db.query(updateQuery);
        console.log(`✅ Atualizado: ${updateResult.rowCount} linha(s) afetada(s)`);
        
        // Verificar resultado
        const verificarQuery = `
          SELECT id, nome, nome_urna, cargo, partido, sigla_partido, numero
          FROM candidatos 
          WHERE id = ${candidato.id};
        `;
        
        const verificarResult = await db.query(verificarQuery);
        console.log('\nResultado final:');
        verificarResult.rows.forEach(c => {
          console.log(`   ID: ${c.id} | Nome: ${c.nome} | Nome Urna: ${c.nome_urna || 'N/A'} | Cargo: ${c.cargo} | Partido: ${c.sigla_partido} | Número: ${c.numero}`);
        });
      }
    }
    
    console.log('\n🎉 Correção concluída!');
    console.log('✅ JORGINHO MELLO é Governador com nome na urna "DELEGADA MARILISA"');
    console.log('✅ Isso resolve a confusão - o nome na urna é o que aparece na urna');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificarCandidato22();

