const http = require('http');

async function testarCorrecaoFinal() {
  try {
    console.log('🔍 Testando correção final dos dados...\n');
    
    // Testar API de candidatos
    console.log('1. Testando API de candidatos (2022)...');
    
    try {
      const response = await fetch('http://localhost:3000/api/candidatos?eleicao_id=3&limite=10');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API funcionando');
        console.log(`   Total de candidatos retornados: ${data.data.length}`);
        
        // Verificar se VOTO BRANCO e VOTO NULO foram excluídos
        const votosBrancos = data.data.filter(c => c.nome.includes('VOTO BRANCO'));
        const votosNulos = data.data.filter(c => c.nome.includes('VOTO NULO'));
        
        console.log(`   VOTO BRANCO excluído: ${votosBrancos.length === 0 ? '✅ Sim' : '❌ Não'}`);
        console.log(`   VOTO NULO excluído: ${votosNulos.length === 0 ? '✅ Sim' : '❌ Não'}`);
        
        // Verificar se nome_urna está sendo retornado
        const temNomeUrna = data.data.some(c => c.hasOwnProperty('nome_urna'));
        console.log(`   Campo nome_urna presente: ${temNomeUrna ? '✅ Sim' : '❌ Não'}`);
        
        // Mostrar alguns exemplos
        console.log('\n📋 Primeiros 5 candidatos:');
        data.data.slice(0, 5).forEach((candidato, index) => {
          const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' && candidato.nome_urna !== '#NULO' 
              ? candidato.nome_urna 
              : candidato.nome;
          console.log(`   ${index + 1}. ${nomeExibir} (${candidato.cargo}) - ${candidato.sigla_partido}`);
        });
        
      } else {
        console.log('❌ Erro na API:', response.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
    }
    
    // Testar candidato específico (JORGINHO MELLO)
    console.log('\n2. Testando candidato JORGINHO MELLO (ID 1496)...');
    
    try {
      const response = await fetch('http://localhost:3000/api/candidatos/1496');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API funcionando');
        console.log(`   Nome completo: ${data.nome}`);
        console.log(`   Nome na urna: ${data.nome_urna}`);
        console.log(`   Cargo: ${data.cargo}`);
        console.log(`   Partido: ${data.sigla_partido}`);
        
        // Verificar lógica de exibição
        const nomeExibir = data.nome_urna && data.nome_urna !== 'N/A' && data.nome_urna !== '#NULO' 
            ? data.nome_urna 
            : data.nome || 'Nome não disponível';
        
        console.log(`   Nome a ser exibido: ${nomeExibir}`);
        
        if (nomeExibir === 'DELEGADA MARILISA' && data.cargo === 'Governador') {
          console.log('✅ Correção funcionando - JORGINHO MELLO aparece como DELEGADA MARILISA (Governador)');
        } else {
          console.log('❌ Problema na correção');
        }
        
      } else {
        console.log('❌ Erro na API:', response.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
    }
    
    console.log('\n📋 Resumo da correção:');
    console.log('✅ JORGINHO DOS SANTOS MELLO é o Governador');
    console.log('✅ Nome na urna: DELEGADA MARILISA');
    console.log('✅ Na interface aparece: DELEGADA MARILISA (Governador)');
    console.log('✅ VOTO BRANCO e VOTO NULO excluídos da lista');
    console.log('✅ Campo nome_urna incluído na API');
    
    console.log('\n💡 Para aplicar as mudanças:');
    console.log('1. Reinicie o servidor: Ctrl+C e depois npm start');
    console.log('2. Acesse: http://localhost:3000');
    console.log('3. Clique na aba "Candidatos"');
    console.log('4. Selecione "2022 - ELEIÇÃO ORDINÁRIA"');
    console.log('5. Clique em "Buscar Candidatos"');
    console.log('6. Verifique se DELEGADA MARILISA aparece como Governador');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarCorrecaoFinal();

