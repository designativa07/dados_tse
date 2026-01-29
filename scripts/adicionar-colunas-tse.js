const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dados_tse',
  password: 'postgres',
  port: 5432,
});

async function adicionarColunasTSE() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Adicionando colunas do TSE à tabela votos...');
    
    // Lista de todas as colunas do CSV do TSE
    const colunasTSE = [
      'dt_geracao VARCHAR(20)',
      'hh_geracao VARCHAR(10)', 
      'ano_eleicao INTEGER',
      'cd_tipo_eleicao INTEGER',
      'nm_tipo_eleicao VARCHAR(100)',
      'nr_turno INTEGER',
      'cd_eleicao INTEGER',
      'ds_eleicao VARCHAR(255)',
      'dt_eleicao VARCHAR(20)',
      'tp_abrangencia VARCHAR(10)',
      'sg_uf VARCHAR(2)',
      'sg_ue VARCHAR(10)',
      'nm_ue VARCHAR(100)',
      'cd_municipio INTEGER',
      'nm_municipio VARCHAR(100)',
      'nr_zona INTEGER',
      'nr_secao INTEGER',
      'cd_cargo INTEGER',
      'ds_cargo VARCHAR(100)',
      'nr_votavel INTEGER',
      'nm_votavel VARCHAR(255)',
      'qt_votos INTEGER',
      'nr_local_votacao INTEGER',
      'sq_candidato BIGINT',
      'nm_local_votacao VARCHAR(255)',
      'ds_local_votacao_endereco VARCHAR(500)'
    ];
    
    // Adicionar cada coluna se não existir
    for (const coluna of colunasTSE) {
      const [nomeColuna] = coluna.split(' ');
      
      // Verificar se a coluna já existe
      const checkColumn = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'votos' AND column_name = $1
      `, [nomeColuna]);
      
      if (checkColumn.rows.length === 0) {
        console.log(`➕ Adicionando coluna: ${nomeColuna}`);
        await client.query(`ALTER TABLE votos ADD COLUMN ${coluna}`);
      } else {
        console.log(`✅ Coluna ${nomeColuna} já existe`);
      }
    }
    
    // Adicionar índices para as novas colunas importantes
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_votos_ano_eleicao ON votos(ano_eleicao)',
      'CREATE INDEX IF NOT EXISTS idx_votos_cd_eleicao ON votos(cd_eleicao)',
      'CREATE INDEX IF NOT EXISTS idx_votos_cd_municipio ON votos(cd_municipio)',
      'CREATE INDEX IF NOT EXISTS idx_votos_nr_votavel ON votos(nr_votavel)',
      'CREATE INDEX IF NOT EXISTS idx_votos_sq_candidato ON votos(sq_candidato)',
      'CREATE INDEX IF NOT EXISTS idx_votos_nr_local_votacao ON votos(nr_local_votacao)'
    ];
    
    for (const indice of indices) {
      console.log(`🔍 Criando índice: ${indice.split(' ')[5]}`);
      await client.query(indice);
    }
    
    console.log('✅ Todas as colunas do TSE foram adicionadas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar colunas:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  adicionarColunasTSE()
    .then(() => {
      console.log('🎉 Script concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { adicionarColunasTSE };
