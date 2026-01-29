const http = require('http');

async function diagnosticarProblemaIndex() {
  try {
    console.log('🔍 Diagnosticando problema na página inicial...\n');
    
    // Testar se o servidor está respondendo
    console.log('1. Testando servidor...');
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        console.log('✅ Servidor está respondendo');
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      } else {
        console.log('❌ Servidor com problema:', response.status);
        return;
      }
    } catch (error) {
      console.log('❌ Servidor não está acessível:', error.message);
      console.log('💡 Execute: npm start');
      return;
    }
    
    // Testar APIs principais
    console.log('\n2. Testando APIs principais...');
    
    const apis = [
      { nome: 'Eleições', url: 'http://localhost:3000/api/eleicoes' },
      { nome: 'Municípios', url: 'http://localhost:3000/api/municipios' },
      { nome: 'Candidatos', url: 'http://localhost:3000/api/candidatos?limite=5' },
      { nome: 'Relatórios', url: 'http://localhost:3000/api/relatorios' }
    ];
    
    for (const api of apis) {
      try {
        const response = await fetch(api.url);
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ ${api.nome}: OK (${response.status})`);
          if (data.data) {
            console.log(`      Dados: ${data.data.length} itens`);
          }
        } else {
          console.log(`   ❌ ${api.nome}: Erro ${response.status}`);
          const errorText = await response.text();
          console.log(`      Erro: ${errorText.substring(0, 100)}...`);
        }
      } catch (error) {
        console.log(`   ❌ ${api.nome}: ${error.message}`);
      }
    }
    
    // Testar arquivos estáticos
    console.log('\n3. Testando arquivos estáticos...');
    
    const arquivos = [
      { nome: 'app.js', url: 'http://localhost:3000/app.js' },
      { nome: 'styles.css', url: 'http://localhost:3000/styles.css' },
      { nome: 'index.html', url: 'http://localhost:3000/index.html' }
    ];
    
    for (const arquivo of arquivos) {
      try {
        const response = await fetch(arquivo.url);
        if (response.ok) {
          console.log(`   ✅ ${arquivo.nome}: OK (${response.status})`);
        } else {
          console.log(`   ❌ ${arquivo.nome}: Erro ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${arquivo.nome}: ${error.message}`);
      }
    }
    
    // Verificar se há erros no console do navegador
    console.log('\n4. Verificações para o navegador...');
    console.log('   💡 Abra o console do navegador (F12) e verifique se há erros JavaScript');
    console.log('   💡 Verifique se as APIs estão retornando dados');
    console.log('   💡 Verifique se há problemas de CORS ou CSP');
    
    // Testar uma API específica com mais detalhes
    console.log('\n5. Testando API de eleições em detalhes...');
    try {
      const response = await fetch('http://localhost:3000/api/eleicoes');
      if (response.ok) {
        const data = await response.json();
        console.log('   ✅ API de eleições funcionando');
        console.log(`   Dados retornados:`, JSON.stringify(data, null, 2));
      } else {
        console.log('   ❌ API de eleições com problema');
      }
    } catch (error) {
      console.log('   ❌ Erro na API de eleições:', error.message);
    }
    
    console.log('\n📋 Possíveis soluções:');
    console.log('1. Reinicie o servidor: Ctrl+C e depois npm start');
    console.log('2. Verifique se há erros no console do navegador');
    console.log('3. Verifique se as APIs estão retornando dados');
    console.log('4. Verifique se há problemas de CORS ou CSP');
    console.log('5. Verifique se o banco de dados está conectado');
    
  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error.message);
  }
}

diagnosticarProblemaIndex();

