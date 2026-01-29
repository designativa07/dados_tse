const http = require('http');

async function testarFotoCorrigida() {
  try {
    console.log('🧪 Testando foto corrigida do Jorginho...\n');
    
    // Testar API do candidato Jorginho (ID 1496)
    console.log('1. Testando API do candidato Jorginho...');
    try {
      const response = await fetch('http://localhost:3000/api/candidatos/1496');
      if (response.ok) {
        const candidato = await response.json();
        console.log('✅ API do candidato funcionando');
        console.log(`   Nome: ${candidato.nome}`);
        console.log(`   Nome na Urna: ${candidato.nome_urna}`);
        console.log(`   Cargo: ${candidato.cargo}`);
        console.log(`   Foto: ${candidato.foto}`);
        console.log(`   Sequencial: ${candidato.sequencial_candidato}`);
        
        // Verificar se a foto está correta
        if (candidato.foto === 'FSC240001611127_div.jpg') {
          console.log('✅ Foto está correta!');
        } else {
          console.log('❌ Foto ainda está incorreta:', candidato.foto);
        }
        
      } else {
        console.log('❌ Erro na API:', response.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
    }
    
    // Testar se a foto está acessível
    console.log('\n2. Testando acesso à foto...');
    try {
      const response = await fetch('http://localhost:3000/fotos_candidatos/FSC240001611127_div.jpg');
      if (response.ok) {
        console.log('✅ Foto acessível via servidor');
        console.log(`   Status: ${response.status}`);
        console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      } else {
        console.log('❌ Foto não acessível:', response.status);
      }
    } catch (error) {
      console.log('❌ Erro ao acessar foto:', error.message);
    }
    
    // Testar página de perfil
    console.log('\n3. Testando página de perfil...');
    try {
      const response = await fetch('http://localhost:3000/perfil-candidato.html?id=1496');
      if (response.ok) {
        console.log('✅ Página de perfil acessível');
        console.log(`   Status: ${response.status}`);
        
        // Verificar se a página contém a referência à foto correta
        const html = await response.text();
        if (html.includes('FSC240001611127_div.jpg')) {
          console.log('✅ Página contém referência à foto correta');
        } else {
          console.log('❌ Página não contém referência à foto correta');
        }
        
      } else {
        console.log('❌ Erro na página de perfil:', response.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar página de perfil:', error.message);
    }
    
    console.log('\n🎉 Teste concluído!');
    console.log('\n💡 Para verificar visualmente:');
    console.log('1. Acesse: http://localhost:3000/perfil-candidato.html?id=1496');
    console.log('2. Verifique se a foto exibida é do Jorginho (homem)');
    console.log('3. A foto anterior era da Marilisa (mulher)');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarFotoCorrigida();

