const db = require('./config/database');

async function testarAbaCandidatos() {
  try {
    console.log('🔍 Testando aba de candidatos...\n');
    
    // Verificar se a eleição de 2022 existe
    const eleicaoQuery = `
      SELECT id, ano, tipo FROM eleicoes WHERE ano = 2022 ORDER BY id LIMIT 1
    `;
    
    const eleicao = await db.query(eleicaoQuery);
    if (eleicao.rows.length === 0) {
      console.error('❌ Eleição de 2022 não encontrada');
      process.exit(1);
    }
    
    const eleicaoId = eleicao.rows[0].id;
    console.log(`✅ Eleição 2022 encontrada - ID: ${eleicaoId}`);
    
    // Testar API de candidatos
    console.log('\n🌐 Testando API de candidatos...');
    const apiUrl = `http://localhost:3000/api/candidatos?eleicao_id=${eleicaoId}&limite=10`;
    console.log(`   URL: ${apiUrl}`);
    
    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API de candidatos funcionando');
        console.log(`   Total de candidatos: ${data.pagination?.total || data.data?.length || 0}`);
        console.log(`   Candidatos retornados: ${data.data?.length || 0}`);
        
        if (data.data && data.data.length > 0) {
          console.log('\n📋 Primeiros 3 candidatos:');
          data.data.slice(0, 3).forEach((candidato, index) => {
            console.log(`   ${index + 1}. ${candidato.nome} (${candidato.numero}) - ${candidato.sigla_partido || 'N/A'} - ${candidato.total_votos || 0} votos`);
          });
        }
      } else {
        console.log('❌ Erro na API:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('⚠️  Não foi possível testar a API (servidor pode não estar rodando)');
      console.log(`   Erro: ${error.message}`);
    }
    
    // Verificar se os arquivos HTML e CSS existem
    const fs = require('fs');
    const path = require('path');
    
    const arquivos = [
      'public/index.html',
      'public/app.js',
      'public/styles.css',
      'public/perfil-candidato.html'
    ];
    
    console.log('\n📁 Verificando arquivos necessários:');
    arquivos.forEach(arquivo => {
      const caminho = path.join(__dirname, arquivo);
      if (fs.existsSync(caminho)) {
        console.log(`   ✅ ${arquivo}`);
      } else {
        console.log(`   ❌ ${arquivo} - Arquivo não encontrado`);
      }
    });
    
    // Verificar se a aba de candidatos está no HTML
    console.log('\n🔍 Verificando estrutura HTML:');
    const indexHtml = fs.readFileSync(path.join(__dirname, 'public/index.html'), 'utf8');
    
    const verificacoes = [
      { nome: 'Aba Candidatos na navegação', regex: /data-tab="candidatos"/ },
      { nome: 'Seção de candidatos', regex: /id="candidatos".*class="tab-content"/ },
      { nome: 'Filtros de candidatos', regex: /candidatos-eleicao/ },
      { nome: 'Tabela de candidatos', regex: /candidatos-body/ },
      { nome: 'Botão buscar candidatos', regex: /candidatos-buscar/ }
    ];
    
    verificacoes.forEach(verificacao => {
      if (verificacao.regex.test(indexHtml)) {
        console.log(`   ✅ ${verificacao.nome}`);
      } else {
        console.log(`   ❌ ${verificacao.nome}`);
      }
    });
    
    // Verificar se as funções JavaScript existem
    console.log('\n🔍 Verificando funções JavaScript:');
    const appJs = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');
    
    const funcoes = [
      'carregarCandidatosData',
      'renderizarCandidatosTabela',
      'atualizarEstatisticasCandidatos',
      'limparFiltrosCandidatos'
    ];
    
    funcoes.forEach(funcao => {
      if (appJs.includes(funcao)) {
        console.log(`   ✅ ${funcao}`);
      } else {
        console.log(`   ❌ ${funcao}`);
      }
    });
    
    // Instruções de uso
    console.log('\n📋 Instruções para testar a aba de candidatos:');
    console.log('1. Inicie o servidor: npm start');
    console.log('2. Acesse: http://localhost:3000');
    console.log('3. Clique na aba "Candidatos" na navegação');
    console.log('4. Selecione a eleição de 2022');
    console.log('5. Clique em "Buscar Candidatos"');
    console.log('6. Teste os filtros e clique nos nomes dos candidatos');
    
    console.log('\n🎉 Teste concluído!');
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

testarAbaCandidatos();
