const { Pool } = require('pg');
require('dotenv').config();

// Configuração otimizada do pool de conexões PostgreSQL para grandes volumes
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mapa_votacoes',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
  
  // Configurações otimizadas para grandes volumes
  max: 10, // Reduzido para evitar sobrecarga
  min: 2, // Mínimo de conexões sempre ativas
  idleTimeoutMillis: 60000, // 1 minuto para fechar conexões inativas
  connectionTimeoutMillis: 30000, // 30 segundos para conectar
  acquireTimeoutMillis: 60000, // 60 segundos para adquirir conexão
  statement_timeout: 300000, // 5 minutos para queries
  
  // Configurações de SSL
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  
  // Configurações adicionais para performance
  application_name: 'mapa_votacoes_import',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Event listeners para monitoramento
pool.on('connect', (client) => {
  console.log('📊 Nova conexão estabelecida');
  
  // Configurar timeout para esta conexão
  client.query('SET statement_timeout = 300000'); // 5 minutos
  client.query('SET idle_in_transaction_session_timeout = 300000'); // 5 minutos
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool de conexões:', err);
  // Não sair do processo, apenas logar o erro
});

// Função para executar queries com tratamento de erro otimizado
const query = async (text, params) => {
  const start = Date.now();
  let client;
  
  try {
    client = await pool.connect();
    const res = await client.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) { // Log apenas queries lentas
      console.log(`🔍 Query executada em ${duration}ms:`, text.substring(0, 50) + '...');
    }
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Erro na query (${duration}ms):`, error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Função para transações com timeout
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET statement_timeout = 300000'); // 5 minutos
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Função para testar conexão
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('✅ Conexão com banco de dados estabelecida');
    return true;
  } catch (error) {
    console.error('❌ Falha na conexão com banco de dados:', error.message);
    return false;
  }
};

// Função para inicializar banco
const initializeDatabase = async () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await query(schema);
    console.log('✅ Banco de dados inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error.message);
    return false;
  }
};

// Função para fechar pool
const closePool = async () => {
  try {
    await pool.end();
    console.log('🔒 Pool de conexões fechado');
  } catch (error) {
    console.error('❌ Erro ao fechar pool:', error);
  }
};

// Função para obter estatísticas do pool
const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
};

module.exports = {
  query,
  transaction,
  testConnection,
  initializeDatabase,
  closePool,
  getPoolStats,
  pool
};
