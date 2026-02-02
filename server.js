const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');
const eleicoesRoutes = require('./routes/eleicoes');
const municipiosRoutes = require('./routes/municipios');
const votosRoutes = require('./routes/votos');
const relatoriosRoutes = require('./routes/relatorios');
const uploadRoutes = require('./routes/upload');
const uploadOtimizadoRoutes = require('./routes/upload-otimizado');
const visualizacaoRoutes = require('./routes/visualizacao');
const candidatosRoutes = require('./routes/candidatos');
const analiseComplementarRoutes = require('./routes/analise-complementar');
const regionaisRoutes = require('./routes/regionais');
const fotosCandidatosRoutes = require('./routes/fotos-candidatos');
const demograficoRoutes = require('./routes/demografico');
const correlacaoRegionalRoutes = require('./routes/correlacao-regional');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://unpkg.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://fonts.googleapis.com", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Desabilitar para evitar problemas com APIs
}));

// Rate limiting - otimizado para uploads grandes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10000, // máximo 10.000 requests por IP por janela (otimizado para uploads)
  message: 'Muitas requisições deste IP, tente novamente em 15 minutos.',
  skip: (req) => {
    // Pular rate limiting para uploads de CSV
    return req.path.includes('/upload/csv') || req.path.includes('/limpar-base-dados');
  }
});

app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Middleware para parsing
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ extended: true, limit: '1gb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/fotos-candidatos', express.static(path.join(__dirname, 'fotos_candidatos')));
app.use('/fotos_candidatos', express.static(path.join(__dirname, 'fotos_candidatos')));

// Rotas da API
app.use('/api/eleicoes', eleicoesRoutes);
app.use('/api/municipios', municipiosRoutes);
app.use('/api/votos', votosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/upload-otimizado', uploadOtimizadoRoutes);
app.use('/api/visualizacao', visualizacaoRoutes);
app.use('/api/candidatos', candidatosRoutes);
app.use('/api/analise-complementar', analiseComplementarRoutes);
app.use('/api/regionais', regionaisRoutes);
app.use('/api/fotos-candidatos', fotosCandidatosRoutes);
app.use('/api/ranking', require('./routes/ranking'));
app.use('/api/demografico', demograficoRoutes);
app.use('/api/correlacao-regional', correlacaoRegionalRoutes);

// Rota principal - servir a aplicação web
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

// Rota para limpar base de dados
app.post('/api/limpar-base-dados', async (req, res) => {
  try {
    console.log('🧹 Iniciando limpeza da base de dados via API...');

    // Desabilitar verificações de chave estrangeira temporariamente
    await db.query('SET session_replication_role = replica;');

    console.log('🗑️ Removendo dados de votos...');
    const votosResult = await db.query('DELETE FROM votos');
    console.log(`✅ ${votosResult.rowCount} registros de votos removidos`);

    console.log('🗑️ Removendo dados de candidatos...');
    const candidatosResult = await db.query('DELETE FROM candidatos');
    console.log(`✅ ${candidatosResult.rowCount} registros de candidatos removidos`);

    console.log('🗑️ Removendo dados de municípios...');
    const municipiosResult = await db.query('DELETE FROM municipios');
    console.log(`✅ ${municipiosResult.rowCount} registros de municípios removidos`);

    console.log('🗑️ Removendo dados de eleições...');
    const eleicoesResult = await db.query('DELETE FROM eleicoes');
    console.log(`✅ ${eleicoesResult.rowCount} registros de eleições removidos`);

    console.log('🗑️ Removendo dados de relatórios...');
    const relatoriosResult = await db.query('DELETE FROM relatorios');
    console.log(`✅ ${relatoriosResult.rowCount} registros de relatórios removidos`);

    // Reabilitar verificações de chave estrangeira
    await db.query('SET session_replication_role = DEFAULT;');

    // Resetar sequências
    console.log('🔄 Resetando sequências...');
    await db.query('ALTER SEQUENCE eleicoes_id_seq RESTART WITH 1');
    await db.query('ALTER SEQUENCE candidatos_id_seq RESTART WITH 1');
    await db.query('ALTER SEQUENCE municipios_id_seq RESTART WITH 1');
    await db.query('ALTER SEQUENCE votos_id_seq RESTART WITH 1');
    await db.query('ALTER SEQUENCE relatorios_id_seq RESTART WITH 1');

    console.log('✅ Sequências resetadas');

    // Verificar se a limpeza foi bem-sucedida
    const contadores = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM eleicoes'),
      db.query('SELECT COUNT(*) as count FROM candidatos'),
      db.query('SELECT COUNT(*) as count FROM municipios'),
      db.query('SELECT COUNT(*) as count FROM votos'),
      db.query('SELECT COUNT(*) as count FROM relatorios')
    ]);

    const estatisticas = {
      eleicoes: contadores[0].rows[0].count,
      candidatos: contadores[1].rows[0].count,
      municipios: contadores[2].rows[0].count,
      votos: contadores[3].rows[0].count,
      relatorios: contadores[4].rows[0].count
    };

    console.log('📊 Verificação final:', estatisticas);
    console.log('🎉 Base de dados limpa com sucesso!');

    res.json({
      success: true,
      message: 'Base de dados limpa com sucesso!',
      estatisticas: estatisticas,
      registros_removidos: {
        votos: votosResult.rowCount,
        candidatos: candidatosResult.rowCount,
        municipios: municipiosResult.rowCount,
        eleicoes: eleicoesResult.rowCount,
        relatorios: relatoriosResult.rowCount
      }
    });

  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
    res.status(500).json({
      success: false,
      error: 'Erro durante a limpeza da base de dados',
      details: error.message
    });
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro:', err);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Dados JSON inválidos',
      message: 'Verifique o formato dos dados enviados'
    });
  }

  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflito de dados',
      message: 'Registro já existe no banco de dados'
    });
  }

  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: `A rota ${req.originalUrl} não existe`
  });
});

// Inicializar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Acesse localmente: http://localhost:${PORT}`);
  console.log(`🌐 Acesse na rede: http://172.23.62.120:${PORT}`);
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
