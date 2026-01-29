const db = require('../config/database');

async function limparDuplicacoes() {
  try {
    console.log('🔧 Limpando duplicações de caracteres...');
    
    // Correções para duplicações específicas
    const correcoes = [
      "UPDATE candidatos SET nome = REPLACE(nome, 'JOSÉÉ', 'JOSÉ') WHERE nome LIKE '%JOSÉÉ%'",
      "UPDATE candidatos SET nome = REPLACE(nome, 'JESSÉE', 'JESSÉ') WHERE nome LIKE '%JESSÉE%'",
      "UPDATE candidatos SET nome = REPLACE(nome, 'JOSÉE', 'JOSÉ') WHERE nome LIKE '%JOSÉE%'",
      "UPDATE candidatos SET nome = REPLACE(nome, 'JOSÉINO', 'JOSÉINO') WHERE nome LIKE '%JOSÉINO%'",
      "UPDATE candidatos SET nome = REPLACE(nome, 'JOSÉCELITO', 'JOSÉCELITO') WHERE nome LIKE '%JOSÉCELITO%'"
    ];
    
    let totalCorrigidos = 0;
    
    for (const query of correcoes) {
      try {
        console.log(`Executando: ${query.substring(0, 60)}...`);
        const result = await db.query(query);
        if (result.rowCount > 0) {
          console.log(`✅ ${result.rowCount} registros corrigidos`);
          totalCorrigidos += result.rowCount;
        }
      } catch (error) {
        console.error(`❌ Erro na query:`, error.message);
      }
    }
    
    // Verificar resultados finais
    console.log('🔍 Verificando resultados finais...');
    
    const candidatosProblematicos = await db.query(`
      SELECT nome, COUNT(*) as total 
      FROM candidatos 
      WHERE nome ~ '[^A-Za-z0-9\\s\\-\\.]'
      GROUP BY nome 
      ORDER BY total DESC
      LIMIT 5
    `);
    
    if (candidatosProblematicos.rows.length > 0) {
      console.log('⚠️ Candidatos com caracteres problemáticos restantes:');
      candidatosProblematicos.rows.forEach(row => {
        console.log(`   "${row.nome}": ${row.total} registros`);
      });
    } else {
      console.log('✅ Todos os candidatos foram corrigidos!');
    }
    
    console.log(`🎉 Limpeza concluída! Total de registros corrigidos: ${totalCorrigidos}`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
    process.exit(1);
  }
}

limparDuplicacoes();
