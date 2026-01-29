const { Pool } = require('pg');
require('dotenv').config();

// Configuração do pool de conexões PostgreSQL otimizada para grandes volumes
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mapa_votacoes',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
  max: 5, // Reduzido ainda mais para evitar sobrecarga
  min: 1, // Mínimo de conexões
  idleTimeoutMillis: 300000, // 5 minutos
  connectionTimeoutMillis: 60000, // 1 minuto para conectar
  acquireTimeoutMillis: 120000, // 2 minutos para adquirir conexão
  statement_timeout: 300000, // 5 minutos para queries
  query_timeout: 300000, // 5 minutos para queries
  ssl: (process.env.DB_SSL === 'true' || (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false'))
    ? { rejectUnauthorized: false }
    : false
});

// Event listeners para monitoramento
pool.on('connect', () => {
  console.log('📊 Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool de conexões:', err);
  process.exit(-1);
});

// Função para executar queries com tratamento de erro
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`🔍 Query executada em ${duration}ms:`, text.substring(0, 50) + '...');
    return res;
  } catch (error) {
    console.error('❌ Erro na query:', error);
    throw error;
  }
};

// Função para transações
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
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

// Função para inicializar banco (criar tabelas se não existirem)
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

module.exports = {
  query,
  transaction,
  testConnection,
  initializeDatabase,
  closePool,
  pool
};
