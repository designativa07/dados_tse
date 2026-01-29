const db = require('../config/database');

async function verificarDuplicatasCandidatos() {
  try {
    console.log('🔍 Verificando candidatos duplicados...\n');
    
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
    
    // Verificar candidatos duplicados por número
    const duplicatasQuery = `
      SELECT 
        numero,
        COUNT(*) as total,
        STRING_AGG(nome, ', ') as nomes,
        STRING_AGG(id::text, ', ') as ids
      FROM candidatos 
      WHERE eleicao_id = $1
      GROUP BY numero
      HAVING COUNT(*) > 1
      ORDER BY numero
    `;
    
    const duplicatas = await db.query(duplicatasQuery, [eleicaoId]);
    
    if (duplicatas.rows.length > 0) {
      console.log(`⚠️  Encontradas ${duplicatas.rows.length} duplicatas por número:`);
      duplicatas.rows.forEach((dup, index) => {
        console.log(`${index + 1}. Número ${dup.numero}: ${dup.total} candidatos`);
        console.log(`   Nomes: ${dup.nomes}`);
        console.log(`   IDs: ${dup.ids}`);
        console.log('');
      });
      
      // Perguntar se deve limpar
      console.log('🔧 Deseja limpar as duplicatas? (manter o candidato com ID menor)');
      console.log('   Isso irá remover candidatos duplicados mantendo apenas o primeiro.');
      
      // Para script automático, vamos limpar automaticamente
      console.log('🧹 Limpando duplicatas automaticamente...');
      
      for (const dup of duplicatas.rows) {
        const ids = dup.ids.split(', ').map(id => parseInt(id)).sort();
        const manterId = ids[0]; // Manter o ID menor
        const removerIds = ids.slice(1); // Remover os demais
        
        console.log(`   Número ${dup.numero}: Mantendo ID ${manterId}, removendo IDs ${removerIds.join(', ')}`);
        
        for (const idRemover of removerIds) {
          const deleteQuery = `DELETE FROM candidatos WHERE id = $1`;
          await db.query(deleteQuery, [idRemover]);
        }
      }
      
      console.log('✅ Duplicatas removidas!');
    } else {
      console.log('✅ Nenhuma duplicata encontrada.');
    }
    
    // Verificar candidatos por nome similar
    const similaresQuery = `
      SELECT 
        nome,
        COUNT(*) as total,
        STRING_AGG(numero::text, ', ') as numeros,
        STRING_AGG(id::text, ', ') as ids
      FROM candidatos 
      WHERE eleicao_id = $1
      GROUP BY nome
      HAVING COUNT(*) > 1
      ORDER BY nome
    `;
    
    const similares = await db.query(similaresQuery, [eleicaoId]);
    
    if (similares.rows.length > 0) {
      console.log(`\n⚠️  Encontrados ${similares.rows.length} candidatos com mesmo nome:`);
      similares.rows.forEach((sim, index) => {
        console.log(`${index + 1}. Nome: ${sim.nome}`);
        console.log(`   Números: ${sim.numeros}`);
        console.log(`   IDs: ${sim.ids}`);
        console.log('');
      });
    }
    
    // Estatísticas finais
    const statsQuery = `
      SELECT 
        COUNT(*) as total_candidatos,
        COUNT(DISTINCT numero) as numeros_unicos,
        COUNT(DISTINCT nome) as nomes_unicos
      FROM candidatos 
      WHERE eleicao_id = $1
    `;
    
    const stats = await db.query(statsQuery, [eleicaoId]);
    const stat = stats.rows[0];
    
    console.log('\n📊 Estatísticas finais:');
    console.log(`- Total de candidatos: ${stat.total_candidatos}`);
    console.log(`- Números únicos: ${stat.numeros_unicos}`);
    console.log(`- Nomes únicos: ${stat.nomes_unicos}`);
    
    if (stat.total_candidatos === stat.numeros_unicos) {
      console.log('✅ Todos os números de candidatos são únicos!');
    } else {
      console.log('⚠️  Ainda existem números duplicados.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

verificarDuplicatasCandidatos();
