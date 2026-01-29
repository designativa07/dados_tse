const express = require('express');
const db = require('./config/database');

console.log('🔍 Testando servidor com debug...\n');

const app = express();

// Middleware básico
app.use(express.json());

// Importar rotas
console.log('1. Importando rotas...');
const candidatosRoutes = require('./routes/candidatos');
console.log('✅ Rotas de candidatos importadas');

// Registrar rotas
console.log('2. Registrando rotas...');
app.use('/api/candidatos', candidatosRoutes);
console.log('✅ Rotas registradas');

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor funcionando' });
});

// Middleware de debug
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// Iniciar servidor
const PORT = 3001; // Porta diferente para não conflitar
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste rodando na porta ${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}`);
  
  // Testar as rotas
  testarRotas();
});

async function testarRotas() {
  try {
    console.log('\n3. Testando rotas...');
    
    // Testar rota de teste
    const testResponse = await fetch(`http://localhost:${PORT}/api/test`);
    if (testResponse.ok) {
      console.log('✅ Rota de teste funcionando');
    } else {
      console.log('❌ Rota de teste falhou');
    }
    
    // Testar rota de candidatos
    const candidatosResponse = await fetch(`http://localhost:${PORT}/api/candidatos`);
    if (candidatosResponse.ok) {
      const data = await candidatosResponse.json();
      console.log('✅ Rota de candidatos funcionando');
      console.log(`   Candidatos encontrados: ${data.data?.length || 0}`);
    } else {
      console.log('❌ Rota de candidatos falhou:', candidatosResponse.status);
      const errorData = await candidatosResponse.text();
      console.log(`   Erro: ${errorData}`);
    }
    
    // Testar rota de candidatos com filtro
    const candidatosFiltradosResponse = await fetch(`http://localhost:${PORT}/api/candidatos?eleicao_id=1&limite=5`);
    if (candidatosFiltradosResponse.ok) {
      const data = await candidatosFiltradosResponse.json();
      console.log('✅ Rota de candidatos com filtro funcionando');
      console.log(`   Candidatos encontrados: ${data.data?.length || 0}`);
    } else {
      console.log('❌ Rota de candidatos com filtro falhou:', candidatosFiltradosResponse.status);
      const errorData = await candidatosFiltradosResponse.text();
      console.log(`   Erro: ${errorData}`);
    }
    
    console.log('\n🎉 Teste concluído!');
    server.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    server.close();
    process.exit(1);
  }
}
