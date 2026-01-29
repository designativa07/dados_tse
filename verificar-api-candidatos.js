const http = require('http');

async function verificarApiCandidatos() {
  try {
    console.log('🔍 Verificando API de candidatos em detalhes...\n');
    
    // Testar API de candidatos
    console.log('1. Testando API de candidatos...');
    
    try {
      const response = await fetch('http://localhost:3000/api/candidatos?eleicao_id=3&limite=5');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API funcionando');
        console.log('📋 Dados retornados:');
        
        data.data.forEach((candidato, index) => {
          console.log(`\n   Candidato ${index + 1}:`);
          console.log(`   ID: ${candidato.id}`);
          console.log(`   Nome: ${candidato.nome}`);
          console.log(`   Nome Urna: ${candidato.nome_urna || 'N/A'}`);
          console.log(`   Cargo: ${candidato.cargo}`);
          console.log(`   Partido: ${candidato.sigla_partido}`);
          console.log(`   Votos: ${candidato.total_votos || 0}`);
        });
        
        // Verificar se há campos nome_urna
        const temNomeUrna = data.data.some(c => c.hasOwnProperty('nome_urna'));
        console.log(`\n   Campo nome_urna presente: ${temNomeUrna ? '✅ Sim' : '❌ Não'}`);
        
        // Verificar se há VOTO BRANCO/NULO
        const temVotosBrancos = data.data.some(c => c.nome.includes('VOTO BRANCO'));
        const temVotosNulos = data.data.some(c => c.nome.includes('VOTO NULO'));
        console.log(`   VOTO BRANCO presente: ${temVotosBrancos ? '❌ Sim' : '✅ Não'}`);
        console.log(`   VOTO NULO presente: ${temVotosNulos ? '❌ Sim' : '✅ Não'}`);
        
      } else {
        console.log('❌ Erro na API:', response.status);
        const errorText = await response.text();
        console.log('   Erro:', errorText);
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
    }
    
    // Verificar se o servidor está rodando
    console.log('\n2. Verificando servidor...');
    try {
      const healthResponse = await fetch('http://localhost:3000/api/health');
      if (healthResponse.ok) {
        console.log('✅ Servidor está rodando');
        console.log('💡 Se as correções não funcionaram, reinicie o servidor:');
        console.log('   Ctrl+C e depois npm start');
      } else {
        console.log('❌ Servidor não está respondendo');
        console.log('💡 Execute: npm start');
      }
    } catch (error) {
      console.log('❌ Servidor não está acessível');
      console.log('💡 Execute: npm start');
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

verificarApiCandidatos();

