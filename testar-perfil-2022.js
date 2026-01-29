const http = require('http');

async function testarPerfil2022() {
  try {
    console.log('🔍 Testando perfil de candidato da eleição 2022...\n');
    
    // Testar candidato da eleição 2022
    const candidatoId = 1321; // ABEL BICHESKI
    
    console.log(`1. Testando perfil do candidato ID ${candidatoId}...`);
    
    try {
      const response = await fetch(`http://localhost:3000/api/candidatos/${candidatoId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API funcionando');
        console.log(`   Nome: ${data.nome}`);
        console.log(`   Cargo: ${data.cargo}`);
        console.log(`   Eleição: ${data.eleicao_ano}`);
        console.log(`   Nome na Urna: ${data.nome_urna || 'N/A'}`);
        console.log(`   Nome Social: ${data.nome_social || 'N/A'}`);
        console.log(`   CPF: ${data.cpf || 'N/A'}`);
        console.log(`   Email: ${data.email || 'N/A'}`);
        console.log(`   Data Nascimento: ${data.data_nascimento || 'N/A'}`);
        console.log(`   UF Nascimento: ${data.uf_nascimento || 'N/A'}`);
        console.log(`   Gênero: ${data.descricao_genero || 'N/A'}`);
        console.log(`   Grau Instrução: ${data.descricao_grau_instrucao || 'N/A'}`);
        console.log(`   Estado Civil: ${data.descricao_estado_civil || 'N/A'}`);
        console.log(`   Cor/Raça: ${data.descricao_cor_raca || 'N/A'}`);
        console.log(`   Ocupação: ${data.descricao_ocupacao || 'N/A'}`);
        console.log(`   Título Eleitoral: ${data.titulo_eleitoral || 'N/A'}`);
        
        const perfilUrl = `http://localhost:3000/perfil-candidato.html?id=${candidatoId}`;
        console.log(`\n2. URL do perfil: ${perfilUrl}`);
        console.log('✅ URL gerada corretamente');
        
        console.log('\n📋 Instruções para testar:');
        console.log('1. Acesse: http://localhost:3000');
        console.log('2. Clique na aba "Candidatos"');
        console.log('3. Selecione "2022 - ELEIÇÃO ORDINÁRIA"');
        console.log('4. Clique em "Buscar Candidatos"');
        console.log('5. Clique no nome de um candidato');
        console.log('6. Verifique se o perfil mostra todos os dados');
        
        console.log('\n💡 Explicação do problema:');
        console.log('- Candidatos da eleição 2018: Dados básicos apenas');
        console.log('- Candidatos da eleição 2022: Dados completos (complementares)');
        console.log('- O candidato ID 581 é de 2018, por isso mostra "N/A"');
        console.log('- Use candidatos de 2022 para ver o perfil completo');
        
      } else {
        console.log('❌ Erro na API:', response.status);
        const errorData = await response.text();
        console.log(`   Detalhes: ${errorData}`);
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
    }
    
    console.log('\n🎉 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarPerfil2022();
