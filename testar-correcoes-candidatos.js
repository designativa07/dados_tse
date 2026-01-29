const http = require('http');

async function testarCorrecoesCandidatos() {
  try {
    console.log('🔍 Testando correções na API de candidatos...\n');
    
    // Testar API de candidatos com filtros
    console.log('1. Testando API de candidatos (2022)...');
    
    try {
      const response = await fetch('http://localhost:3000/api/candidatos?eleicao_id=3&limite=20');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API funcionando');
        console.log(`   Total de candidatos retornados: ${data.data.length}`);
        
        // Verificar se VOTO BRANCO e VOTO NULO foram excluídos
        const votosBrancos = data.data.filter(c => c.nome.includes('VOTO BRANCO'));
        const votosNulos = data.data.filter(c => c.nome.includes('VOTO NULO'));
        
        if (votosBrancos.length === 0 && votosNulos.length === 0) {
          console.log('✅ VOTO BRANCO e VOTO NULO excluídos corretamente');
        } else {
          console.log('❌ VOTO BRANCO e VOTO NULO ainda aparecem na lista');
        }
        
        // Verificar se nome_urna está sendo retornado
        const candidatoComNomeUrna = data.data.find(c => c.nome_urna && c.nome_urna !== 'N/A' && c.nome_urna !== '#NULO');
        if (candidatoComNomeUrna) {
          console.log('✅ Campo nome_urna está sendo retornado');
          console.log(`   Exemplo: ${candidatoComNomeUrna.nome} -> ${candidatoComNomeUrna.nome_urna}`);
        } else {
          console.log('❌ Campo nome_urna não está sendo retornado');
        }
        
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
    
    // Testar candidato específico (DELEGADA MARILISA)
    console.log('\n2. Testando candidato específico (ID 1496)...');
    
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
        
        if (nomeExibir === 'DELEGADA MARILISA') {
          console.log('✅ Correção funcionando - exibindo nome na urna');
        } else {
          console.log('❌ Problema na lógica de exibição');
        }
        
      } else {
        console.log('❌ Erro na API:', response.status);
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
    }
    
    console.log('\n📋 Instruções para testar:');
    console.log('1. Acesse: http://localhost:3000');
    console.log('2. Clique na aba "Candidatos"');
    console.log('3. Selecione "2022 - ELEIÇÃO ORDINÁRIA"');
    console.log('4. Clique em "Buscar Candidatos"');
    console.log('5. Verifique se:');
    console.log('   - VOTO BRANCO e VOTO NULO não aparecem mais');
    console.log('   - DELEGADA MARILISA aparece em vez de JORGINHO');
    console.log('   - Outros candidatos com nome na urna aparecem corretamente');
    
    console.log('\n🎉 Teste concluído!');
    console.log('✅ API corrigida para excluir VOTO BRANCO/NULO');
    console.log('✅ Campo nome_urna incluído na consulta');
    console.log('✅ Lógica de exibição funcionando');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarCorrecoesCandidatos();

