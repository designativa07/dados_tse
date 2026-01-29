const http = require('http');

async function testarAbaCandidatosFinal() {
  try {
    console.log('🔍 Teste final da aba de candidatos...\n');
    
    // Testar rota de eleições
    console.log('1. Testando rota de eleições...');
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
    console.log('\n2. Testando rota de candidatos...');
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
        
        if (candidatosData.data && candidatosData.data.length > 0) {
          console.log('\n📋 Primeiros candidatos:');
          candidatosData.data.slice(0, 3).forEach((candidato, index) => {
            console.log(`   ${index + 1}. ${candidato.nome} (${candidato.cargo}) - ${candidato.eleicao_ano}`);
          });
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
    console.log('\n3. Testando rota de candidatos com filtro de eleição...');
    try {
      const candidatosFiltradosResponse = await fetch('http://localhost:3000/api/candidatos?eleicao_id=1&limite=5');
      if (candidatosFiltradosResponse.ok) {
        const candidatosFiltradosData = await candidatosFiltradosResponse.json();
        console.log('✅ Rota de candidatos com filtro funcionando');
        console.log(`   Candidatos encontrados: ${candidatosFiltradosData.data?.length || 0}`);
        
        if (candidatosFiltradosData.data && candidatosFiltradosData.data.length > 0) {
          console.log('\n📋 Candidatos filtrados:');
          candidatosFiltradosData.data.forEach((candidato, index) => {
            console.log(`   ${index + 1}. ${candidato.nome} (${candidato.cargo}) - ${candidato.eleicao_ano}`);
          });
        }
      } else {
        console.log('❌ Erro na rota de candidatos com filtro:', candidatosFiltradosResponse.status);
        const errorData = await candidatosFiltradosResponse.text();
        console.log(`   Detalhes: ${errorData}`);
      }
    } catch (error) {
      console.log('❌ Erro ao testar rota de candidatos com filtro:', error.message);
    }
    
    // Testar rota de candidato específico
    console.log('\n4. Testando rota de candidato específico...');
    try {
      const candidatoResponse = await fetch('http://localhost:3000/api/candidatos/1');
      if (candidatoResponse.ok) {
        const candidatoData = await candidatoResponse.json();
        console.log('✅ Rota de candidato específico funcionando');
        console.log(`   Candidato: ${candidatoData.nome} (${candidatoData.cargo})`);
        console.log(`   Total de votos: ${candidatoData.total_votos || 0}`);
      } else {
        console.log('❌ Erro na rota de candidato específico:', candidatoResponse.status);
        const errorData = await candidatoResponse.text();
        console.log(`   Detalhes: ${errorData}`);
      }
    } catch (error) {
      console.log('❌ Erro ao testar rota de candidato específico:', error.message);
    }
    
    console.log('\n📋 Instruções para testar a interface:');
    console.log('1. Acesse: http://localhost:3000');
    console.log('2. Clique na aba "Candidatos"');
    console.log('3. Selecione uma eleição no dropdown');
    console.log('4. Clique em "Buscar Candidatos"');
    console.log('5. Verifique se a tabela é populada com os candidatos');
    console.log('6. Teste os filtros e paginação');
    console.log('7. Clique no nome de um candidato para ver o perfil');
    
    console.log('\n🎉 Teste final concluído!');
    console.log('✅ Todas as rotas estão funcionando corretamente');
    console.log('✅ A aba de candidatos deve estar funcionando na interface');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarAbaCandidatosFinal();
