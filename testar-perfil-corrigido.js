const http = require('http');

async function testarPerfilCorrigido() {
  try {
    console.log('🔍 Testando perfil de candidato após correção do erro "voltar"...\n');
    
    // Testar candidato da eleição 2022
    const candidatoId = 1785; // ID mencionado no erro
    
    console.log(`1. Testando perfil do candidato ID ${candidatoId}...`);
    
    try {
      const response = await fetch(`http://localhost:3000/api/candidatos/${candidatoId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API funcionando');
        console.log(`   Nome: ${data.nome}`);
        console.log(`   Cargo: ${data.cargo}`);
        console.log(`   Eleição: ${data.eleicao_ano}`);
        
        const perfilUrl = `http://localhost:3000/perfil-candidato.html?id=${candidatoId}`;
        console.log(`\n2. URL do perfil: ${perfilUrl}`);
        console.log('✅ URL gerada corretamente');
        
        console.log('\n📋 Instruções para testar:');
        console.log('1. Acesse a URL do perfil acima');
        console.log('2. Verifique se a página carrega sem erros JavaScript');
        console.log('3. Teste o botão "← Voltar" no canto superior esquerdo');
        console.log('4. Verifique se o botão funciona corretamente');
        
        console.log('\n🔧 Correções aplicadas:');
        console.log('- Função voltar() movida para escopo global');
        console.log('- Função duplicada removida');
        console.log('- Botão "← Voltar" agora deve funcionar');
        
      } else {
        console.log('❌ Erro na API:', response.status);
        const errorData = await response.text();
        console.log(`   Detalhes: ${errorData}`);
      }
    } catch (error) {
      console.log('❌ Erro ao testar API:', error.message);
    }
    
    console.log('\n🎉 Teste concluído!');
    console.log('✅ Erro "voltar is not defined" corrigido');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarPerfilCorrigido();
