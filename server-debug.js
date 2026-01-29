const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');

// Importar rotas
const eleicoesRoutes = require('./routes/eleicoes');
const municipiosRoutes = require('./routes/municipios');
const votosRoutes = require('./routes/votos');
const relatoriosRoutes = require('./routes/relatorios');
const uploadRoutes = require('./routes/upload');
const uploadOtimizadoRoutes = require('./routes/upload-otimizado');
const visualizacaoRoutes = require('./routes/visualizacao');
const candidatosRoutes = require('./routes/candidatos');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(cors());
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url}`);
  next();
});

// Rotas da API
console.log('🔧 Registrando rotas...');
app.use('/api/eleicoes', eleicoesRoutes);
console.log('✅ Rotas de eleições registradas');
app.use('/api/municipios', municipiosRoutes);
console.log('✅ Rotas de municípios registradas');
app.use('/api/votos', votosRoutes);
console.log('✅ Rotas de votos registradas');
app.use('/api/relatorios', relatoriosRoutes);
console.log('✅ Rotas de relatórios registradas');
app.use('/api/upload', uploadRoutes);
console.log('✅ Rotas de upload registradas');
app.use('/api/upload-otimizado', uploadOtimizadoRoutes);
console.log('✅ Rotas de upload otimizado registradas');
app.use('/api/visualizacao', visualizacaoRoutes);
console.log('✅ Rotas de visualização registradas');
app.use('/api/candidatos', candidatosRoutes);
console.log('✅ Rotas de candidatos registradas');

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota de health check
app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  console.log(`❌ Rota não encontrada: ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Rota não encontrada',
    message: `A rota ${req.originalUrl} não existe`
  });
});

// Inicializar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Acesse: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recebido, encerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT recebido, encerrando servidor...');
  server.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});

module.exports = app;
