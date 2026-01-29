const db = require('../config/database');

async function corrigirSQLDireto() {
  try {
    console.log('🔧 Corrigindo caracteres usando SQL direto...');
    
    // Correções usando SQL direto
    const correcoes = [
      // Candidatos
      "UPDATE candidatos SET nome = REPLACE(nome, 'JOS', 'JOSÉ') WHERE nome LIKE '%JOS%'",
      "UPDATE candidatos SET nome = REPLACE(nome, 'JESS', 'JESSÉ') WHERE nome LIKE '%JESS%'",
      "UPDATE candidatos SET nome = REPLACE(nome, 'CSAR', 'CÉSAR') WHERE nome LIKE '%CSAR%'",
      "UPDATE candidatos SET nome = REPLACE(nome, 'ANTNIO', 'ANTÔNIO') WHERE nome LIKE '%ANTNIO%'",
      "UPDATE candidatos SET nome = REPLACE(nome, 'ELESBO', 'ELESBÃO') WHERE nome LIKE '%ELESBO%'",
      "UPDATE candidatos SET nome = REPLACE(nome, 'CSSIA', 'CÁSSIA') WHERE nome LIKE '%CSSIA%'",
      "UPDATE candidatos SET nome = REPLACE(nome, 'TRCIO', 'TÉRCIO') WHERE nome LIKE '%TRCIO%'",
      
      // Municípios
      "UPDATE municipios SET nome = REPLACE(nome, 'ARARANGU', 'ARARANGUÁ') WHERE nome LIKE '%ARARANGU%'",
      "UPDATE municipios SET nome = REPLACE(nome, 'MARACAJ', 'MARACAJÁ') WHERE nome LIKE '%MARACAJ%'",
      "UPDATE municipios SET nome = REPLACE(nome, 'SO FRANCISCO', 'SÃO FRANCISCO') WHERE nome LIKE '%SO FRANCISCO%'"
    ];
    
    let totalCorrigidos = 0;
    
    for (const query of correcoes) {
      try {
        console.log(`Executando: ${query.substring(0, 50)}...`);
        const result = await db.query(query);
        if (result.rowCount > 0) {
          console.log(`✅ ${result.rowCount} registros corrigidos`);
          totalCorrigidos += result.rowCount;
        }
      } catch (error) {
        console.error(`❌ Erro na query:`, error.message);
      }
    }
    
    // Verificar resultados
    console.log('🔍 Verificando resultados...');
    
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
    
    console.log(`🎉 Correção concluída! Total de registros corrigidos: ${totalCorrigidos}`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
    process.exit(1);
  }
}

corrigirSQLDireto();
