const db = require('../config/database');

async function corrigirCodigoUe() {
  try {
    console.log('🔧 Corrigindo tipo da coluna codigo_ue...\n');
    
    // Verificar tipo atual da coluna codigo_ue
    const verificarTipoQuery = `
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'candidatos' 
        AND column_name = 'codigo_ue'
    `;
    
    const tipoAtual = await db.query(verificarTipoQuery);
    
    if (tipoAtual.rows.length > 0) {
      const tipo = tipoAtual.rows[0].data_type;
      
      if (tipo === 'bigint') {
        // Alterar para VARCHAR
        const alterarQuery = `
          ALTER TABLE candidatos 
          ALTER COLUMN codigo_ue TYPE VARCHAR(20)
        `;
        
        await db.query(alterarQuery);
        console.log('✅ Coluna codigo_ue alterada de BIGINT para VARCHAR(20)');
      } else if (tipo === 'character varying') {
        console.log('✅ Coluna codigo_ue já é VARCHAR');
      } else {
        console.log(`ℹ️  Coluna codigo_ue tem tipo ${tipo}`);
      }
    } else {
      console.log('⚠️  Coluna codigo_ue não encontrada');
    }
    
    // Verificar estrutura final
    console.log('\n📋 Estrutura atual da coluna codigo_ue:');
    const estruturaQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'candidatos'
        AND column_name = 'codigo_ue'
    `;
    
    const estrutura = await db.query(estruturaQuery);
    if (estrutura.rows.length > 0) {
      const coluna = estrutura.rows[0];
      const tamanho = coluna.character_maximum_length ? `(${coluna.character_maximum_length})` : '';
      console.log(`${coluna.column_name} - ${coluna.data_type}${tamanho}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

corrigirCodigoUe();
