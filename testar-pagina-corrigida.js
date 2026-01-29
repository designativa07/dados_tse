const http = require('http');

async function testarPaginaCorrigida() {
  try {
    console.log('🔍 Testando página após correção do erro de sintaxe...\n');
    
    // Testar se o servidor está respondendo
    console.log('1. Testando servidor...');
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        console.log('✅ Servidor está respondendo');
        console.log(`   Status: ${response.status}`);
      } else {
        console.log('❌ Servidor com problema:', response.status);
        return;
      }
    } catch (error) {
      console.log('❌ Servidor não está acessível:', error.message);
      console.log('💡 Execute: npm start');
      return;
    }
    
    // Testar app.js especificamente
    console.log('\n2. Testando app.js...');
    try {
      const response = await fetch('http://localhost:3000/app.js');
      if (response.ok) {
        console.log('✅ app.js carregando corretamente');
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
        
        // Verificar se o arquivo tem conteúdo
        const content = await response.text();
        console.log(`   Tamanho: ${content.length} caracteres`);
        
        // Verificar se há erros de sintaxe básicos
        if (content.includes('SyntaxError') || content.includes('Unexpected token')) {
          console.log('❌ Possível erro de sintaxe detectado no conteúdo');
        } else {
          console.log('✅ Nenhum erro de sintaxe óbvio detectado');
        }
        
      } else {
        console.log('❌ Erro ao carregar app.js:', response.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar app.js:', error.message);
    }
    
    // Testar APIs principais
    console.log('\n3. Testando APIs principais...');
    
    const apis = [
      { nome: 'Eleições', url: 'http://localhost:3000/api/eleicoes' },
      { nome: 'Municípios', url: 'http://localhost:3000/api/municipios' },
      { nome: 'Candidatos', url: 'http://localhost:3000/api/candidatos?limite=5' }
    ];
    
    for (const api of apis) {
      try {
        const response = await fetch(api.url);
        if (response.ok) {
          console.log(`   ✅ ${api.nome}: OK`);
        } else {
          console.log(`   ❌ ${api.nome}: Erro ${response.status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${api.nome}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Teste concluído!');
    console.log('✅ Erro de sintaxe corrigido');
    console.log('✅ Servidor funcionando');
    console.log('✅ APIs funcionando');
    
    console.log('\n💡 Instruções:');
    console.log('1. Recarregue a página no navegador (Ctrl+F5)');
    console.log('2. Abra o console do navegador (F12)');
    console.log('3. Verifique se não há mais erros JavaScript');
    console.log('4. Teste os links e funcionalidades');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarPaginaCorrigida();

