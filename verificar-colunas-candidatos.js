const db = require('./config/database');

async function verificarColunasCandidatos() {
  try {
    console.log('🔍 Verificando colunas existentes na tabela candidatos...\n');
    
    // Verificar estrutura da tabela candidatos
    const resultado = await db.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'candidatos' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas existentes na tabela candidatos:');
    resultado.rows.forEach((col, i) => {
      console.log(`${i + 1}. ${col.column_name} (${col.data_type}) - ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log(`\n📊 Total de colunas: ${resultado.rows.length}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar colunas:', error.message);
  } finally {
    await db.end();
  }
}

verificarColunasCandidatos();