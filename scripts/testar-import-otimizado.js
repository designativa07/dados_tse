const { importarCSVOtimizado } = require('./import-otimizado');

async function testarImportacao() {
  try {
    console.log('🧪 Testando importação otimizada...');
    
    const arquivo = 'dados_tse.csv';
    const eleicaoId = 2; // ID da eleição 2018
    
    console.log(`📁 Arquivo: ${arquivo}`);
    console.log(`🗳️ Eleição ID: ${eleicaoId}`);
    
    const resultado = await importarCSVOtimizado(arquivo, eleicaoId);
    
    console.log('\n🎉 Teste concluído!');
    console.log('📊 Resultados:');
    console.log(`   • Total processados: ${resultado.totalProcessados}`);
    console.log(`   • Total inseridos: ${resultado.totalInseridos}`);
    console.log(`   • Total erros: ${resultado.totalErros}`);
    console.log(`   • Tempo total: ${resultado.tempoTotal.toFixed(2)}s`);
    console.log(`   • Velocidade: ${(resultado.totalProcessados / resultado.tempoTotal).toFixed(2)} registros/segundo`);
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testarImportacao();
