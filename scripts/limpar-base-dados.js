const db = require('../config/database');

async function limparBaseDados() {
  try {
    console.log('🧹 Iniciando limpeza da base de dados...');
    
    // Desabilitar verificações de chave estrangeira temporariamente
    await db.query('SET session_replication_role = replica;');
    
    console.log('🗑️ Removendo dados de votos...');
    const votosResult = await db.query('DELETE FROM votos');
    console.log(`✅ ${votosResult.rowCount} registros de votos removidos`);
    
    console.log('🗑️ Removendo dados de candidatos...');
    const candidatosResult = await db.query('DELETE FROM candidatos');
    console.log(`✅ ${candidatosResult.rowCount} registros de candidatos removidos`);
    
    console.log('🗑️ Preservando municípios e suas coordenadas...');
    // Não remover municípios - eles contêm coordenadas importantes
    // Apenas verificar quantos existem
    const municipiosCount = await db.query('SELECT COUNT(*) as count FROM municipios');
    console.log(`✅ ${municipiosCount.rows[0].count} municípios preservados (com coordenadas)`);
    
    console.log('🗑️ Removendo dados de eleições...');
    const eleicoesResult = await db.query('DELETE FROM eleicoes');
    console.log(`✅ ${eleicoesResult.rowCount} registros de eleições removidos`);
    
    console.log('🗑️ Removendo dados de relatórios...');
    const relatoriosResult = await db.query('DELETE FROM relatorios');
    console.log(`✅ ${relatoriosResult.rowCount} registros de relatórios removidos`);
    
    // Reabilitar verificações de chave estrangeira
    await db.query('SET session_replication_role = DEFAULT;');
    
    // Resetar sequências
    console.log('🔄 Resetando sequências...');
    await db.query('ALTER SEQUENCE eleicoes_id_seq RESTART WITH 1');
    await db.query('ALTER SEQUENCE candidatos_id_seq RESTART WITH 1');
    await db.query('ALTER SEQUENCE municipios_id_seq RESTART WITH 1');
    await db.query('ALTER SEQUENCE votos_id_seq RESTART WITH 1');
    await db.query('ALTER SEQUENCE relatorios_id_seq RESTART WITH 1');
    
    console.log('✅ Sequências resetadas');
    
    // Verificar se a limpeza foi bem-sucedida
    const contadores = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM eleicoes'),
      db.query('SELECT COUNT(*) as count FROM candidatos'),
      db.query('SELECT COUNT(*) as count FROM municipios'),
      db.query('SELECT COUNT(*) as count FROM votos'),
      db.query('SELECT COUNT(*) as count FROM relatorios')
    ]);
    
    console.log('\n📊 Verificação final:');
    console.log(`   • Eleições: ${contadores[0].rows[0].count} (removidas)`);
    console.log(`   • Candidatos: ${contadores[1].rows[0].count} (removidos)`);
    console.log(`   • Municípios: ${contadores[2].rows[0].count} (preservados com coordenadas)`);
    console.log(`   • Votos: ${contadores[3].rows[0].count} (removidos)`);
    console.log(`   • Relatórios: ${contadores[4].rows[0].count} (removidos)`);
    
    console.log('\n🎉 Base de dados limpa com sucesso!');
    console.log('🗺️ Municípios e coordenadas geográficas foram preservados.');
    console.log('💡 Agora você pode importar novos dados usando a importação otimizada.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  limparBaseDados();
}

module.exports = { limparBaseDados };
