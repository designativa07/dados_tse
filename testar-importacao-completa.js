const express = require('express');

console.log('🔍 Testando importação completa das rotas...\n');

try {
  console.log('1. Importando todas as rotas...');
  
  const eleicoesRoutes = require('./routes/eleicoes');
  console.log('✅ Rotas de eleições importadas');
  
  const municipiosRoutes = require('./routes/municipios');
  console.log('✅ Rotas de municípios importadas');
  
  const votosRoutes = require('./routes/votos');
  console.log('✅ Rotas de votos importadas');
  
  const relatoriosRoutes = require('./routes/relatorios');
  console.log('✅ Rotas de relatórios importadas');
  
  const uploadRoutes = require('./routes/upload');
  console.log('✅ Rotas de upload importadas');
  
  const uploadOtimizadoRoutes = require('./routes/upload-otimizado');
  console.log('✅ Rotas de upload otimizado importadas');
  
  const visualizacaoRoutes = require('./routes/visualizacao');
  console.log('✅ Rotas de visualização importadas');
  
  const candidatosRoutes = require('./routes/candidatos');
  console.log('✅ Rotas de candidatos importadas');
  
  console.log('\n2. Criando aplicação Express...');
  const app = express();
  
  console.log('3. Registrando rotas...');
  app.use('/api/eleicoes', eleicoesRoutes);
  app.use('/api/municipios', municipiosRoutes);
  app.use('/api/votos', votosRoutes);
  app.use('/api/relatorios', relatoriosRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/upload-otimizado', uploadOtimizadoRoutes);
  app.use('/api/visualizacao', visualizacaoRoutes);
  app.use('/api/candidatos', candidatosRoutes);
  
  console.log('✅ Todas as rotas registradas');
  
  console.log('\n4. Testando rota de candidatos...');
  
  // Simular uma requisição GET para /api/candidatos
  const req = {
    method: 'GET',
    url: '/api/candidatos',
    query: { eleicao_id: '1', limite: '10' },
    params: {},
    headers: {}
  };
  
  const res = {
    status: (code) => {
      console.log(`   Status: ${code}`);
      return {
        json: (data) => {
          console.log(`   Resposta: ${JSON.stringify(data).substring(0, 100)}...`);
        }
      };
    },
    json: (data) => {
      console.log(`   Resposta: ${JSON.stringify(data).substring(0, 100)}...`);
    }
  };
  
  // Encontrar a rota correta
  const candidatosRouter = candidatosRoutes;
  console.log('   Router de candidatos:', typeof candidatosRouter);
  console.log('   É função:', typeof candidatosRouter === 'function');
  
  // Verificar se há rotas registradas
  console.log('\n5. Verificando rotas registradas...');
  console.log('   Rotas no app:', app._router?.stack?.length || 'N/A');
  
  if (app._router && app._router.stack) {
    app._router.stack.forEach((layer, index) => {
      if (layer.route) {
        console.log(`   Rota ${index}: ${layer.route.path} (${Object.keys(layer.route.methods).join(', ')})`);
      } else if (layer.regexp) {
        console.log(`   Middleware ${index}: ${layer.regexp.source}`);
      }
    });
  }
  
  console.log('\n🎉 Teste de importação concluído!');
  
} catch (error) {
  console.error('❌ Erro durante a importação:', error.message);
  console.error('Stack:', error.stack);
}

process.exit(0);
