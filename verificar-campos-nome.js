const db = require('./config/database');

async function verificarCamposNome() {
  try {
    console.log('🔍 Verificando campos de nome na tabela candidatos...\n');
    
    // Verificar estrutura da tabela
    const estruturaQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'candidatos' 
      AND column_name LIKE '%nome%'
      ORDER BY column_name;
    `;
    
    const estrutura = await db.query(estruturaQuery);
    console.log('📋 Campos de nome na tabela candidatos:');
    estrutura.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });
    
    // Verificar dados de um candidato específico
    console.log('\n🔍 Dados do candidato JORGINHO DOS SANTOS MELLO:');
    const candidatoQuery = `
      SELECT 
        id, nome, nome_urna, nome_social, cargo, partido, sigla_partido
      FROM candidatos 
      WHERE nome ILIKE '%JORGINHO%' OR nome_urna ILIKE '%JORGINHO%' OR nome_urna ILIKE '%MARILISA%'
      LIMIT 5;
    `;
    
    const candidatos = await db.query(candidatoQuery);
    candidatos.rows.forEach(candidato => {
      console.log(`\n   ID: ${candidato.id}`);
      console.log(`   Nome: ${candidato.nome || 'N/A'}`);
      console.log(`   Nome na Urna: ${candidato.nome_urna || 'N/A'}`);
      console.log(`   Nome Social: ${candidato.nome_social || 'N/A'}`);
      console.log(`   Cargo: ${candidato.cargo || 'N/A'}`);
      console.log(`   Partido: ${candidato.sigla_partido || 'N/A'}`);
    });
    
    // Verificar se há candidatos com nome_urna preenchido
    console.log('\n📊 Estatísticas de nomes:');
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(nome) as com_nome,
        COUNT(nome_urna) as com_nome_urna,
        COUNT(nome_social) as com_nome_social
      FROM candidatos;
    `;
    
    const stats = await db.query(statsQuery);
    const total = parseInt(stats.rows[0].total);
    const comNome = parseInt(stats.rows[0].com_nome);
    const comNomeUrna = parseInt(stats.rows[0].com_nome_urna);
    const comNomeSocial = parseInt(stats.rows[0].com_nome_social);
    
    console.log(`   Total de candidatos: ${total}`);
    console.log(`   Com nome: ${comNome} (${((comNome/total)*100).toFixed(1)}%)`);
    console.log(`   Com nome na urna: ${comNomeUrna} (${((comNomeUrna/total)*100).toFixed(1)}%)`);
    console.log(`   Com nome social: ${comNomeSocial} (${((comNomeSocial/total)*100).toFixed(1)}%)`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificarCamposNome();
