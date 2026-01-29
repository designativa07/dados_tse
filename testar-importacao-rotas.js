const express = require('express');

console.log('🔍 Testando importação de rotas...\n');

try {
  console.log('1. Testando importação de eleicoes...');
  const eleicoesRoutes = require('./routes/eleicoes');
  console.log('✅ Rotas de eleições carregadas');
  
  console.log('2. Testando importação de candidatos...');
  const candidatosRoutes = require('./routes/candidatos');
  console.log('✅ Rotas de candidatos carregadas');
  
  console.log('3. Testando criação de router...');
  const router = express.Router();
  console.log('✅ Router criado');
  
  console.log('4. Testando registro de rotas...');
  router.get('/test', (req, res) => {
    res.json({ message: 'Teste OK' });
  });
  console.log('✅ Rota de teste registrada');
  
  console.log('5. Verificando se as rotas estão definidas...');
  console.log('   Rotas de candidatos:', typeof candidatosRoutes);
  console.log('   É função:', typeof candidatosRoutes === 'function');
  
  // Testar se conseguimos acessar as rotas
  console.log('\n6. Testando acesso às rotas...');
  const app = express();
  app.use('/api/candidatos', candidatosRoutes);
  
  // Simular uma requisição
  const req = { 
    method: 'GET', 
    url: '/api/candidatos',
    query: { eleicao_id: '1' }
  };
  const res = {
    status: (code) => ({ json: (data) => console.log(`   Status ${code}:`, data) }),
    json: (data) => console.log('   Resposta:', data)
  };
  
  console.log('✅ Rotas registradas no app');
  
  console.log('\n🎉 Todas as importações funcionaram corretamente!');
  console.log('\n💡 O problema pode estar na ordem de carregamento ou na configuração do servidor');
  
} catch (error) {
  console.error('❌ Erro ao importar rotas:', error.message);
  console.error('Stack:', error.stack);
}

process.exit(0);
