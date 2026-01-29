const fetch = require('node-fetch');

async function testarPerformanceEleicoes() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('🧪 Testando performance do dropdown de eleições...\n');
    
    // Teste 1: Primeira requisição (sem cache)
    console.log('📊 Teste 1: Primeira requisição (sem cache)');
    const inicio1 = Date.now();
    const response1 = await fetch(`${baseUrl}/api/eleicoes/dropdown`);
    const data1 = await response1.json();
    const tempo1 = Date.now() - inicio1;
    
    console.log(`⏱️  Tempo: ${tempo1}ms`);
    console.log(`📈 Dados retornados: ${data1.total} eleições`);
    console.log(`💾 Cache usado: ${data1.cached ? 'Sim' : 'Não'}\n`);
    
    // Teste 2: Segunda requisição (com cache)
    console.log('📊 Teste 2: Segunda requisição (com cache)');
    const inicio2 = Date.now();
    const response2 = await fetch(`${baseUrl}/api/eleicoes/dropdown`);
    const data2 = await response2.json();
    const tempo2 = Date.now() - inicio2;
    
    console.log(`⏱️  Tempo: ${tempo2}ms`);
    console.log(`📈 Dados retornados: ${data2.total} eleições`);
    console.log(`💾 Cache usado: ${data2.cached ? 'Sim' : 'Não'}\n`);
    
    // Teste 3: Terceira requisição (com cache)
    console.log('📊 Teste 3: Terceira requisição (com cache)');
    const inicio3 = Date.now();
    const response3 = await fetch(`${baseUrl}/api/eleicoes/dropdown`);
    const data3 = await response3.json();
    const tempo3 = Date.now() - inicio3;
    
    console.log(`⏱️  Tempo: ${tempo3}ms`);
    console.log(`📈 Dados retornados: ${data3.total} eleições`);
    console.log(`💾 Cache usado: ${data3.cached ? 'Sim' : 'Não'}\n`);
    
    // Teste 4: Comparar com endpoint antigo (se disponível)
    console.log('📊 Teste 4: Comparação com endpoint antigo');
    const inicio4 = Date.now();
    const response4 = await fetch(`${baseUrl}/api/eleicoes`);
    const data4 = await response4.json();
    const tempo4 = Date.now() - inicio4;
    
    console.log(`⏱️  Tempo endpoint antigo: ${tempo4}ms`);
    console.log(`📈 Dados retornados: ${data4.data?.length || 0} eleições\n`);
    
    // Resumo
    console.log('📋 RESUMO DOS TESTES:');
    console.log(`🔴 Primeira requisição (sem cache): ${tempo1}ms`);
    console.log(`🟢 Segunda requisição (com cache): ${tempo2}ms`);
    console.log(`🟢 Terceira requisição (com cache): ${tempo3}ms`);
    console.log(`🟡 Endpoint antigo (com JOINs): ${tempo4}ms`);
    
    const melhoria = ((tempo1 - tempo2) / tempo1 * 100).toFixed(1);
    const melhoriaVsAntigo = ((tempo4 - tempo1) / tempo4 * 100).toFixed(1);
    
    console.log(`\n🚀 Melhoria de performance: ${melhoria}% mais rápido com cache!`);
    console.log(`🚀 Melhoria vs endpoint antigo: ${melhoriaVsAntigo}% mais rápido!`);
    
    if (tempo1 > 500) {
      console.log('⚠️  Ainda está lento (>500ms). Verifique se os índices foram aplicados.');
    } else if (tempo1 > 200) {
      console.log('🟡 Performance moderada. Pode melhorar com mais otimizações.');
    } else {
      console.log('✅ Performance excelente! O dropdown deve estar muito rápido agora.');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.log('💡 Certifique-se de que o servidor está rodando na porta 3000');
  }
}

testarPerformanceEleicoes();
