const db = require('./config/database');

async function adicionarColunasComplementares() {
  try {
    console.log('🔧 Adicionando colunas para dados complementares...\n');
    
    // Colunas específicas do arquivo complementar que precisam ser adicionadas
    const colunasComplementares = [
      // Detalhes da situação da candidatura
      { nome: 'cd_detalhe_situacao_cand', tipo: 'INTEGER', descricao: 'Código do detalhe da situação da candidatura' },
      { nome: 'ds_detalhe_situacao_cand', tipo: 'VARCHAR(100)', descricao: 'Descrição do detalhe da situação da candidatura' },
      
      // Nacionalidade
      { nome: 'cd_nacionalidade', tipo: 'INTEGER', descricao: 'Código da nacionalidade' },
      { nome: 'ds_nacionalidade', tipo: 'VARCHAR(100)', descricao: 'Descrição da nacionalidade' },
      
      // Município de nascimento
      { nome: 'cd_municipio_nascimento', tipo: 'INTEGER', descricao: 'Código do município de nascimento' },
      { nome: 'nm_municipio_nascimento', tipo: 'VARCHAR(100)', descricao: 'Nome do município de nascimento' },
      
      // Idade e características
      { nome: 'nr_idade_data_posse', tipo: 'INTEGER', descricao: 'Idade na data da posse' },
      { nome: 'st_quilombola', tipo: 'VARCHAR(10)', descricao: 'Situação quilombola' },
      { nome: 'cd_etnia_indigena', tipo: 'INTEGER', descricao: 'Código da etnia indígena' },
      { nome: 'ds_etnia_indigena', tipo: 'VARCHAR(100)', descricao: 'Descrição da etnia indígena' },
      
      // Despesas e campanha
      { nome: 'vr_despesa_max_campanha', tipo: 'DECIMAL(15,2)', descricao: 'Valor máximo de despesas da campanha' },
      { nome: 'st_reeleicao', tipo: 'VARCHAR(1)', descricao: 'Situação de reeleição' },
      { nome: 'st_declarar_bens', tipo: 'VARCHAR(1)', descricao: 'Situação de declaração de bens' },
      
      // Protocolos e processos
      { nome: 'nr_protocolo_candidatura', tipo: 'BIGINT', descricao: 'Número do protocolo da candidatura' },
      { nome: 'nr_processo', tipo: 'VARCHAR(50)', descricao: 'Número do processo' },
      
      // Situações específicas
      { nome: 'cd_situacao_candidato_pleito', tipo: 'INTEGER', descricao: 'Código da situação do candidato no pleito' },
      { nome: 'ds_situacao_candidato_pleito', tipo: 'VARCHAR(100)', descricao: 'Descrição da situação do candidato no pleito' },
      { nome: 'cd_situacao_candidato_urna', tipo: 'INTEGER', descricao: 'Código da situação do candidato na urna' },
      { nome: 'ds_situacao_candidato_urna', tipo: 'VARCHAR(100)', descricao: 'Descrição da situação do candidato na urna' },
      { nome: 'st_candidato_inserido_urna', tipo: 'VARCHAR(3)', descricao: 'Situação de inserção do candidato na urna' },
      { nome: 'nm_tipo_destinacao_votos', tipo: 'VARCHAR(50)', descricao: 'Nome do tipo de destinação de votos' },
      { nome: 'cd_situacao_candidato_tot', tipo: 'INTEGER', descricao: 'Código da situação do candidato na totalização' },
      { nome: 'ds_situacao_candidato_tot', tipo: 'VARCHAR(100)', descricao: 'Descrição da situação do candidato na totalização' },
      
      // Prestação de contas e substituições
      { nome: 'st_prest_contas', tipo: 'VARCHAR(1)', descricao: 'Situação de prestação de contas' },
      { nome: 'st_substituido', tipo: 'VARCHAR(1)', descricao: 'Situação de substituição' },
      { nome: 'sq_substituido', tipo: 'BIGINT', descricao: 'Sequencial do substituído' },
      { nome: 'sq_ordem_suplencia', tipo: 'INTEGER', descricao: 'Sequencial da ordem de suplência' },
      
      // Datas importantes
      { nome: 'dt_aceite_candidatura', tipo: 'TIMESTAMP', descricao: 'Data de aceite da candidatura' },
      
      // Julgamentos
      { nome: 'cd_situacao_julgamento', tipo: 'INTEGER', descricao: 'Código da situação do julgamento' },
      { nome: 'ds_situacao_julgamento', tipo: 'VARCHAR(100)', descricao: 'Descrição da situação do julgamento' },
      { nome: 'cd_situacao_julgamento_pleito', tipo: 'INTEGER', descricao: 'Código da situação do julgamento no pleito' },
      { nome: 'ds_situacao_julgamento_pleito', tipo: 'VARCHAR(100)', descricao: 'Descrição da situação do julgamento no pleito' },
      { nome: 'cd_situacao_julgamento_urna', tipo: 'INTEGER', descricao: 'Código da situação do julgamento na urna' },
      { nome: 'ds_situacao_julgamento_urna', tipo: 'VARCHAR(100)', descricao: 'Descrição da situação do julgamento na urna' },
      
      // Cassações
      { nome: 'cd_situacao_cassacao', tipo: 'INTEGER', descricao: 'Código da situação da cassação' },
      { nome: 'ds_situacao_cassacao', tipo: 'VARCHAR(100)', descricao: 'Descrição da situação da cassação' },
      { nome: 'cd_situacao_cassacao_midia', tipo: 'INTEGER', descricao: 'Código da situação da cassação na mídia' },
      { nome: 'ds_situacao_cassacao_midia', tipo: 'VARCHAR(100)', descricao: 'Descrição da situação da cassação na mídia' },
      
      // Diplomas
      { nome: 'cd_situacao_diploma', tipo: 'INTEGER', descricao: 'Código da situação do diploma' },
      { nome: 'ds_situacao_diploma', tipo: 'VARCHAR(100)', descricao: 'Descrição da situação do diploma' }
    ];
    
    let colunasAdicionadas = 0;
    let colunasExistentes = 0;
    
    for (const coluna of colunasComplementares) {
      try {
        // Verificar se a coluna já existe
        const existe = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'candidatos' 
          AND column_name = $1
        `, [coluna.nome]);
        
        if (existe.rows.length === 0) {
          // Adicionar coluna
          await db.query(`
            ALTER TABLE candidatos 
            ADD COLUMN ${coluna.nome} ${coluna.tipo}
          `);
          
          console.log(`✅ Adicionada: ${coluna.nome} (${coluna.tipo}) - ${coluna.descricao}`);
          colunasAdicionadas++;
        } else {
          console.log(`⚠️  Já existe: ${coluna.nome}`);
          colunasExistentes++;
        }
      } catch (error) {
        console.error(`❌ Erro ao adicionar ${coluna.nome}:`, error.message);
      }
    }
    
    console.log(`\n📊 Resumo:`);
    console.log(`   ✅ Colunas adicionadas: ${colunasAdicionadas}`);
    console.log(`   ⚠️  Colunas já existentes: ${colunasExistentes}`);
    console.log(`   📋 Total processadas: ${colunasComplementares.length}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

adicionarColunasComplementares();
