const http = require('http');

async function testarFotoDireta() {
  try {
    console.log('🔍 Testando acesso direto à foto...\n');
    
    const fotoUrl = 'http://localhost:3000/fotos_candidatos/FSC240001647335_div.jpg';
    console.log(`Testando URL: ${fotoUrl}`);
    
    try {
      const response = await fetch(fotoUrl);
      console.log(`Status: ${response.status}`);
      console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        console.log('✅ Foto acessível via servidor');
        console.log(`Tamanho: ${response.headers.get('content-length')} bytes`);
        console.log(`Tipo: ${response.headers.get('content-type')}`);
      } else {
        console.log('❌ Foto não acessível via servidor');
        const text = await response.text();
        console.log(`Resposta: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log('❌ Erro ao acessar foto:', error.message);
    }
    
    // Testar se o servidor está rodando
    console.log('\n🔍 Testando servidor...');
    try {
      const healthResponse = await fetch('http://localhost:3000/api/health');
      if (healthResponse.ok) {
        console.log('✅ Servidor está rodando');
      } else {
        console.log('❌ Servidor não está respondendo');
        console.log('💡 Execute: npm start');
        return;
      }
    } catch (error) {
      console.log('❌ Servidor não está acessível');
      console.log('💡 Execute: npm start');
      return;
    }
    
    console.log('\n💡 Soluções possíveis:');
    console.log('1. Reinicie o servidor: Ctrl+C e depois npm start');
    console.log('2. Verifique se a pasta fotos_candidatos existe');
    console.log('3. Verifique as permissões da pasta');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarFotoDireta();
