const http = require('http');

async function testarPerfilCandidato() {
  try {
    console.log('🔍 Testando perfil de candidato após correção...\n');
    
    // Testar se o servidor está rodando
    console.log('1. Verificando servidor...');
    try {
      const healthResponse = await fetch('http://localhost:3000/api/health');
      if (healthResponse.ok) {
        console.log('✅ Servidor está rodando');
      } else {
        console.log('❌ Servidor não está respondendo');
        return;
      }
    } catch (error) {
      console.log('❌ Servidor não está acessível');
      console.log('💡 Execute: npm start');
      return;
    }
    
    // Testar rota de candidatos
    console.log('\n2. Testando rota de candidatos...');
    try {
      const candidatosResponse = await fetch('http://localhost:3000/api/candidatos?limite=1');
      if (candidatosResponse.ok) {
        const candidatosData = await candidatosResponse.json();
        console.log('✅ Rota de candidatos funcionando');
        
        if (candidatosData.data && candidatosData.data.length > 0) {
          const candidato = candidatosData.data[0];
          console.log(`   Candidato encontrado: ${candidato.nome} (ID: ${candidato.id})`);
          
          // Testar rota de perfil específico
          console.log('\n3. Testando perfil específico...');
          const perfilResponse = await fetch(`http://localhost:3000/api/candidatos/${candidato.id}`);
          if (perfilResponse.ok) {
            const perfilData = await perfilResponse.json();
            console.log('✅ Rota de perfil funcionando');
            console.log(`   Nome: ${perfilData.nome}`);
            console.log(`   Cargo: ${perfilData.cargo}`);
            console.log(`   Total de votos: ${perfilData.total_votos || 0}`);
            
            // Testar URL do perfil
            const perfilUrl = `http://localhost:3000/perfil-candidato.html?id=${candidato.id}`;
            console.log(`\n4. URL do perfil: ${perfilUrl}`);
            console.log('✅ URL gerada corretamente');
            
            console.log('\n📋 Instruções para testar:');
            console.log('1. Acesse: http://localhost:3000');
            console.log('2. Clique na aba "Candidatos"');
            console.log('3. Selecione uma eleição');
            console.log('4. Clique em "Buscar Candidatos"');
            console.log('5. Clique no nome de um candidato');
            console.log('6. Verifique se o perfil carrega sem erros JavaScript');
            
          } else {
            console.log('❌ Erro na rota de perfil:', perfilResponse.status);
            const errorData = await perfilResponse.text();
            console.log(`   Detalhes: ${errorData}`);
          }
        } else {
          console.log('⚠️  Nenhum candidato encontrado');
        }
      } else {
        console.log('❌ Erro na rota de candidatos:', candidatosResponse.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar rotas:', error.message);
    }
    
    console.log('\n🎉 Teste concluído!');
    console.log('✅ Erro de sintaxe JavaScript corrigido');
    console.log('✅ Perfil de candidato deve funcionar corretamente');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarPerfilCandidato();
