const db = require('../config/database');

async function adicionarColunasCandidatos() {
  try {
    console.log('🔧 Adicionando colunas necessárias à tabela candidatos...\n');
    
    // Lista de colunas que precisam ser adicionadas
    const colunas = [
      // Dados básicos do candidato
      { nome: 'nome_urna', tipo: 'VARCHAR(255)' },
      { nome: 'nome_social', tipo: 'VARCHAR(255)' },
      { nome: 'cpf', tipo: 'VARCHAR(20)' },
      { nome: 'email', tipo: 'VARCHAR(255)' },
      
      // Situação da candidatura
      { nome: 'situacao_candidatura', tipo: 'INTEGER' },
      { nome: 'descricao_situacao_candidatura', tipo: 'VARCHAR(100)' },
      
      // Dados do partido/agremiação
      { nome: 'tipo_agremiacao', tipo: 'VARCHAR(50)' },
      { nome: 'numero_partido', tipo: 'INTEGER' },
      { nome: 'sigla_partido', tipo: 'VARCHAR(20)' },
      { nome: 'nome_partido', tipo: 'VARCHAR(100)' },
      
      // Dados da federação
      { nome: 'numero_federacao', tipo: 'BIGINT' },
      { nome: 'nome_federacao', tipo: 'VARCHAR(100)' },
      { nome: 'sigla_federacao', tipo: 'VARCHAR(20)' },
      { nome: 'composicao_federacao', tipo: 'VARCHAR(255)' },
      
      // Dados da coligação
      { nome: 'numero_coligacao', tipo: 'BIGINT' },
      { nome: 'nome_coligacao', tipo: 'VARCHAR(100)' },
      { nome: 'composicao_coligacao', tipo: 'VARCHAR(255)' },
      
      // Dados pessoais
      { nome: 'uf_nascimento', tipo: 'VARCHAR(2)' },
      { nome: 'data_nascimento', tipo: 'VARCHAR(20)' },
      { nome: 'titulo_eleitoral', tipo: 'VARCHAR(20)' },
      
      // Gênero
      { nome: 'genero', tipo: 'INTEGER' },
      { nome: 'descricao_genero', tipo: 'VARCHAR(20)' },
      
      // Grau de instrução
      { nome: 'grau_instrucao', tipo: 'INTEGER' },
      { nome: 'descricao_grau_instrucao', tipo: 'VARCHAR(50)' },
      
      // Estado civil
      { nome: 'estado_civil', tipo: 'INTEGER' },
      { nome: 'descricao_estado_civil', tipo: 'VARCHAR(30)' },
      
      // Cor/raça
      { nome: 'cor_raca', tipo: 'INTEGER' },
      { nome: 'descricao_cor_raca', tipo: 'VARCHAR(30)' },
      
      // Ocupação
      { nome: 'ocupacao', tipo: 'INTEGER' },
      { nome: 'descricao_ocupacao', tipo: 'VARCHAR(100)' },
      
      // Situação na totalização
      { nome: 'situacao_totalizacao_turno', tipo: 'INTEGER' },
      { nome: 'descricao_situacao_totalizacao_turno', tipo: 'VARCHAR(50)' },
      
      // Dados adicionais do TSE
      { nome: 'sequencial_candidato', tipo: 'BIGINT' },
      { nome: 'codigo_cargo', tipo: 'INTEGER' },
      { nome: 'codigo_eleicao', tipo: 'BIGINT' },
      { nome: 'descricao_eleicao', tipo: 'VARCHAR(255)' },
      { nome: 'data_eleicao', tipo: 'VARCHAR(20)' },
      { nome: 'tipo_eleicao', tipo: 'VARCHAR(50)' },
      { nome: 'numero_turno', tipo: 'INTEGER' },
      { nome: 'tipo_abrangencia', tipo: 'VARCHAR(50)' },
      { nome: 'sigla_uf', tipo: 'VARCHAR(2)' },
      { nome: 'codigo_ue', tipo: 'VARCHAR(20)' },
      { nome: 'nome_ue', tipo: 'VARCHAR(100)' },
      { nome: 'data_geracao', tipo: 'VARCHAR(20)' },
      { nome: 'hora_geracao', tipo: 'VARCHAR(20)' }
    ];
    
    let adicionadas = 0;
    let jaExistentes = 0;
    let erros = 0;
    
    for (const coluna of colunas) {
      try {
        // Verificar se a coluna já existe
        const verificarColunaQuery = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'candidatos' 
            AND column_name = $1
        `;
        
        const existe = await db.query(verificarColunaQuery, [coluna.nome]);
        
        if (existe.rows.length === 0) {
          // Adicionar coluna
          const adicionarColunaQuery = `
            ALTER TABLE candidatos 
            ADD COLUMN ${coluna.nome} ${coluna.tipo}
          `;
          
          await db.query(adicionarColunaQuery);
          console.log(`✅ Adicionada coluna: ${coluna.nome} (${coluna.tipo})`);
          adicionadas++;
        } else {
          console.log(`⚠️  Coluna já existe: ${coluna.nome}`);
          jaExistentes++;
        }
        
      } catch (error) {
        console.error(`❌ Erro ao adicionar coluna ${coluna.nome}:`, error.message);
        erros++;
      }
    }
    
    console.log('\n🎉 Migração concluída!');
    console.log(`- Colunas adicionadas: ${adicionadas}`);
    console.log(`- Colunas já existentes: ${jaExistentes}`);
    console.log(`- Erros: ${erros}`);
    
    // Verificar estrutura final da tabela
    console.log('\n📋 Estrutura atual da tabela candidatos:');
    const estruturaQuery = `
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'candidatos'
      ORDER BY ordinal_position
    `;
    
    const estrutura = await db.query(estruturaQuery);
    estrutura.rows.forEach((coluna, index) => {
      const tamanho = coluna.character_maximum_length ? `(${coluna.character_maximum_length})` : '';
      const nullable = coluna.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`${index + 1}. ${coluna.column_name} - ${coluna.data_type}${tamanho} ${nullable}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erro geral:', error);
    process.exit(1);
  }
}

adicionarColunasCandidatos();
