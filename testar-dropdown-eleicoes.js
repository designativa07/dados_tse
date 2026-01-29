const db = require('./config/database');

async function testarDropdownEleicoes() {
  try {
    console.log('🔍 Testando dropdown de eleições na aba candidatos...\n');
    
    // Verificar se existem eleições no banco
    const eleicoesQuery = `
      SELECT id, ano, tipo, descricao 
      FROM eleicoes 
      ORDER BY ano DESC
    `;
    
    const eleicoes = await db.query(eleicoesQuery);
    
    if (eleicoes.rows.length === 0) {
      console.error('❌ Nenhuma eleição encontrada no banco de dados');
      process.exit(1);
    }
    
    console.log(`✅ Encontradas ${eleicoes.rows.length} eleições no banco:`);
    eleicoes.rows.forEach((eleicao, index) => {
      console.log(`   ${index + 1}. ${eleicao.ano} - ${eleicao.tipo} (ID: ${eleicao.id})`);
    });
    
    // Testar API de eleições
    console.log('\n🌐 Testando API de eleições...');
    const apiUrl = 'http://localhost:3000/api/eleicoes';
    console.log(`   URL: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API de eleições funcionando');
        console.log(`   Eleições retornadas: ${data.data?.length || 0}`);
        
        if (data.data && data.data.length > 0) {
          console.log('\n📋 Eleições da API:');
          data.data.forEach((eleicao, index) => {
            console.log(`   ${index + 1}. ${eleicao.ano} - ${eleicao.tipo} (ID: ${eleicao.id})`);
          });
        }
      } else {
        console.log('❌ Erro na API:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('⚠️  Não foi possível testar a API (servidor pode não estar rodando)');
      console.log(`   Erro: ${error.message}`);
    }
    
    // Verificar se a função carregarEleicoesCandidatos existe no JavaScript
    console.log('\n🔍 Verificando função JavaScript...');
    const fs = require('fs');
    const path = require('path');
    const appJs = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
    
    if (appJs.includes('carregarEleicoesCandidatos')) {
      console.log('✅ Função carregarEleicoesCandidatos encontrada');
    } else {
      console.log('❌ Função carregarEleicoesCandidatos não encontrada');
    }
    
    if (appJs.includes('candidatos-eleicao')) {
      console.log('✅ Referência ao dropdown candidatos-eleicao encontrada');
    } else {
      console.log('❌ Referência ao dropdown candidatos-eleicao não encontrada');
    }
    
    // Verificar se a função é chamada quando a aba é ativada
    if (appJs.includes('tabName === \'candidatos\'')) {
      console.log('✅ Lógica para carregar eleições quando aba candidatos é ativada encontrada');
    } else {
      console.log('❌ Lógica para carregar eleições quando aba candidatos é ativada não encontrada');
    }
    
    // Verificar se o dropdown existe no HTML
    console.log('\n🔍 Verificando HTML...');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
    
    if (indexHtml.includes('id="candidatos-eleicao"')) {
      console.log('✅ Dropdown candidatos-eleicao encontrado no HTML');
    } else {
      console.log('❌ Dropdown candidatos-eleicao não encontrado no HTML');
    }
    
    // Instruções para testar
    console.log('\n📋 Instruções para testar:');
    console.log('1. Inicie o servidor: npm start');
    console.log('2. Acesse: http://localhost:3000');
    console.log('3. Clique na aba "Candidatos"');
    console.log('4. Verifique se o dropdown "Eleição" está populado');
    console.log('5. Se não estiver, abra o console do navegador (F12) e verifique erros');
    
    console.log('\n🎉 Teste concluído!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

testarDropdownEleicoes();
