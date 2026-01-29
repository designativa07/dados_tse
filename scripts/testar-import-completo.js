const { importarCSVOtimizado } = require('./import-otimizado');

async function testarImportacaoCompleta() {
  try {
    console.log('🧪 Testando importação completa com base limpa...');
    
    const arquivo = 'votacao_secao_2018_SC.csv';
    
    if (!require('fs').existsSync(arquivo)) {
      console.error('❌ Arquivo votacao_secao_2018_SC.csv não encontrado!');
      console.log('💡 Certifique-se de que o arquivo está na raiz do projeto.');
      process.exit(1);
    }
    
    console.log(`📁 Arquivo: ${arquivo}`);
    console.log('🚀 Iniciando importação otimizada...');
    
    const startTime = Date.now();
    const resultado = await importarCSVOtimizado(arquivo, null);
    const endTime = Date.now();
    
    console.log('\n🎉 Teste concluído!');
    console.log('📊 Resultados:');
    console.log(`   • Total processados: ${resultado.totalProcessados}`);
    console.log(`   • Total inseridos: ${resultado.totalInseridos}`);
    console.log(`   • Total erros: ${resultado.totalErros}`);
    console.log(`   • Tempo total: ${resultado.tempoTotal.toFixed(2)}s`);
    console.log(`   • Velocidade: ${(resultado.totalProcessados / resultado.tempoTotal).toFixed(2)} registros/segundo`);
    
    if (resultado.totalErros > 0) {
      console.log(`⚠️  ${resultado.totalErros} registros com erro foram ignorados`);
    }
    
    console.log('\n✅ Base de dados pronta para uso!');
    console.log('🌐 Acesse http://localhost:3000 para visualizar os dados');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

testarImportacaoCompleta();
