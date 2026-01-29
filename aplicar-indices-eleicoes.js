const db = require('./config/database');

async function aplicarIndicesEleicoes() {
  try {
    console.log('🚀 Aplicando índices para otimização das eleições...\n');

    // Aplicar índices específicos para tabela eleicoes
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_eleicoes_ano ON eleicoes(ano)',
      'CREATE INDEX IF NOT EXISTS idx_eleicoes_tipo ON eleicoes(tipo)',
      'CREATE INDEX IF NOT EXISTS idx_eleicoes_ano_turno ON eleicoes(ano, turno)',
      'CREATE INDEX IF NOT EXISTS idx_eleicoes_ano_desc ON eleicoes(ano DESC)'
    ];

    for (const indice of indices) {
      console.log(`📊 Criando índice: ${indice.split(' ')[5]}`);
      await db.query(indice);
    }

    console.log('\n✅ Todos os índices de eleições foram aplicados com sucesso!');
    console.log('🎯 O dropdown de eleições deve estar muito mais rápido agora!');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar índices:', error);
  } finally {
    process.exit(0);
  }
}

aplicarIndicesEleicoes();
