const http = require('http');

async function testarServidorCandidatos() {
  try {
    console.log('🔍 Testando servidor e rotas de candidatos...\n');
    
    // Testar health check
    console.log('1. Testando health check...');
    try {
      const healthResponse = await fetch('http://localhost:3000/api/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Servidor está rodando');
        console.log(`   Status: ${healthData.status}`);
        console.log(`   Database: ${healthData.database}`);
      } else {
        console.log('❌ Servidor não está respondendo corretamente');
        return;
      }
    } catch (error) {
      console.log('❌ Servidor não está rodando ou não acessível');
      console.log(`   Erro: ${error.message}`);
      console.log('\n💡 Solução: Execute "npm start" para iniciar o servidor');
      return;
    }
    
    // Testar rota de eleições
    console.log('\n2. Testando rota de eleições...');
    try {
      const eleicoesResponse = await fetch('http://localhost:3000/api/eleicoes');
      if (eleicoesResponse.ok) {
        const eleicoesData = await eleicoesResponse.json();
        console.log('✅ Rota de eleições funcionando');
        console.log(`   Eleições encontradas: ${eleicoesData.data?.length || 0}`);
        
        if (eleicoesData.data && eleicoesData.data.length > 0) {
          console.log('\n📋 Eleições disponíveis:');
          eleicoesData.data.forEach((eleicao, index) => {
            console.log(`   ${index + 1}. ${eleicao.ano} - ${eleicao.tipo} (ID: ${eleicao.id})`);
          });
        }
      } else {
        console.log('❌ Erro na rota de eleições:', eleicoesResponse.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar rota de eleições:', error.message);
    }
    
    // Testar rota de candidatos
    console.log('\n3. Testando rota de candidatos...');
    try {
      const candidatosResponse = await fetch('http://localhost:3000/api/candidatos');
      if (candidatosResponse.ok) {
        const candidatosData = await candidatosResponse.json();
        console.log('✅ Rota de candidatos funcionando');
        console.log(`   Candidatos encontrados: ${candidatosData.data?.length || 0}`);
        
        if (candidatosData.pagination) {
          console.log(`   Total: ${candidatosData.pagination.total}`);
          console.log(`   Páginas: ${candidatosData.pagination.paginas}`);
        }
      } else {
        console.log('❌ Erro na rota de candidatos:', candidatosResponse.status);
        const errorData = await candidatosResponse.text();
        console.log(`   Detalhes: ${errorData}`);
      }
    } catch (error) {
      console.log('❌ Erro ao testar rota de candidatos:', error.message);
    }
    
    // Testar rota de candidatos com filtro de eleição
    console.log('\n4. Testando rota de candidatos com filtro de eleição...');
    try {
      const candidatosFiltradosResponse = await fetch('http://localhost:3000/api/candidatos?eleicao_id=1&limite=10');
      if (candidatosFiltradosResponse.ok) {
        const candidatosFiltradosData = await candidatosFiltradosResponse.json();
        console.log('✅ Rota de candidatos com filtro funcionando');
        console.log(`   Candidatos encontrados: ${candidatosFiltradosData.data?.length || 0}`);
      } else {
        console.log('❌ Erro na rota de candidatos com filtro:', candidatosFiltradosResponse.status);
        const errorData = await candidatosFiltradosResponse.text();
        console.log(`   Detalhes: ${errorData}`);
      }
    } catch (error) {
      console.log('❌ Erro ao testar rota de candidatos com filtro:', error.message);
    }
    
    // Verificar se há candidatos no banco
    console.log('\n5. Verificando dados no banco...');
    try {
      const db = require('./config/database');
      
      // Verificar candidatos
      const candidatosQuery = 'SELECT COUNT(*) as total FROM candidatos';
      const candidatosResult = await db.query(candidatosQuery);
      console.log(`   Candidatos no banco: ${candidatosResult.rows[0].total}`);
      
      // Verificar eleições
      const eleicoesQuery = 'SELECT COUNT(*) as total FROM eleicoes';
      const eleicoesResult = await db.query(eleicoesQuery);
      console.log(`   Eleições no banco: ${eleicoesResult.rows[0].total}`);
      
      // Verificar votos
      const votosQuery = 'SELECT COUNT(*) as total FROM votos';
      const votosResult = await db.query(votosQuery);
      console.log(`   Votos no banco: ${votosResult.rows[0].total}`);
      
      if (candidatosResult.rows[0].total == 0) {
        console.log('\n⚠️  Nenhum candidato encontrado no banco de dados');
        console.log('💡 Solução: Execute o script de importação de candidatos');
      }
      
    } catch (error) {
      console.log('❌ Erro ao verificar banco de dados:', error.message);
    }
    
    console.log('\n📋 Instruções para resolver problemas:');
    console.log('1. Se o servidor não estiver rodando: npm start');
    console.log('2. Se não houver candidatos: execute o script de importação');
    console.log('3. Se houver erro 404: verifique se as rotas estão registradas no server.js');
    console.log('4. Se houver erro 500: verifique os logs do servidor');
    
    console.log('\n🎉 Teste concluído!');
    process.exit(0);
  } catch (error) {
    console.error('Erro geral:', error);
    process.exit(1);
  }
}

testarServidorCandidatos();
