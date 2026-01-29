const db = require('./config/database');

async function aplicarIndicesRegionais() {
  try {
    console.log('🚀 Aplicando índices para otimização das regionais...\n');

    // Aplicar índices específicos para tabelas regionais
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_regionais_psdb_mesorregiao ON regionais_psdb(mesorregiao_id)',
      'CREATE INDEX IF NOT EXISTS idx_regionais_psdb_nome ON regionais_psdb(nome)',
      'CREATE INDEX IF NOT EXISTS idx_municipios_regionais_regional ON municipios_regionais(regional_psdb_id)',
      'CREATE INDEX IF NOT EXISTS idx_municipios_regionais_mesorregiao ON municipios_regionais(mesorregiao_id)',
      'CREATE INDEX IF NOT EXISTS idx_municipios_regionais_nome ON municipios_regionais(nome)',
      'CREATE INDEX IF NOT EXISTS idx_municipios_nome ON municipios(nome)'
    ];

    for (const indice of indices) {
      console.log(`📊 Criando índice: ${indice.split(' ')[5]}`);
      await db.query(indice);
    }

    console.log('\n✅ Todos os índices foram aplicados com sucesso!');
    console.log('🎯 O dropdown Regional PSDB deve estar muito mais rápido agora!');
    
  } catch (error) {
    console.error('❌ Erro ao aplicar índices:', error);
  } finally {
    process.exit(0);
  }
}

aplicarIndicesRegionais();
