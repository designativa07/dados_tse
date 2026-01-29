const db = require('../config/database');

async function corrigirTiposDados() {
  try {
    console.log('🔧 Corrigindo tipos de dados para valores grandes...\n');
    
    // Lista de colunas que precisam ser alteradas para BIGINT
    const colunasParaBigInt = [
      'numero_federacao',
      'numero_coligacao', 
      'sequencial_candidato',
      'codigo_eleicao'
    ];
    
    let alteradas = 0;
    let jaCorretas = 0;
    let erros = 0;
    
    for (const coluna of colunasParaBigInt) {
      try {
        // Verificar tipo atual da coluna
        const verificarTipoQuery = `
          SELECT data_type 
          FROM information_schema.columns 
          WHERE table_name = 'candidatos' 
            AND column_name = $1
        `;
        
        const tipoAtual = await db.query(verificarTipoQuery, [coluna]);
        
        if (tipoAtual.rows.length > 0) {
          const tipo = tipoAtual.rows[0].data_type;
          
          if (tipo === 'integer') {
            // Alterar para BIGINT
            const alterarQuery = `
              ALTER TABLE candidatos 
              ALTER COLUMN ${coluna} TYPE BIGINT
            `;
            
            await db.query(alterarQuery);
            console.log(`✅ Alterada coluna ${coluna} de INTEGER para BIGINT`);
            alteradas++;
          } else if (tipo === 'bigint') {
            console.log(`⚠️  Coluna ${coluna} já é BIGINT`);
            jaCorretas++;
          } else {
            console.log(`ℹ️  Coluna ${coluna} tem tipo ${tipo} (não precisa alterar)`);
            jaCorretas++;
          }
        } else {
          console.log(`⚠️  Coluna ${coluna} não encontrada`);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao alterar coluna ${coluna}:`, error.message);
        erros++;
      }
    }
    
    console.log('\n🎉 Correção concluída!');
    console.log(`- Colunas alteradas: ${alteradas}`);
    console.log(`- Colunas já corretas: ${jaCorretas}`);
    console.log(`- Erros: ${erros}`);
    
    // Verificar estrutura final
    console.log('\n📋 Estrutura atual das colunas numéricas:');
    const estruturaQuery = `
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'candidatos'
        AND data_type IN ('integer', 'bigint')
      ORDER BY column_name
    `;
    
    const estrutura = await db.query(estruturaQuery);
    estrutura.rows.forEach((coluna, index) => {
      const tamanho = coluna.character_maximum_length ? `(${coluna.character_maximum_length})` : '';
      console.log(`${index + 1}. ${coluna.column_name} - ${coluna.data_type}${tamanho}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erro geral:', error);
    process.exit(1);
  }
}

corrigirTiposDados();
