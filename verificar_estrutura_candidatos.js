const db = require('./config/database');

async function verificarEstruturaCandidatos() {
  try {
    console.log('Verificando estrutura da tabela candidatos...\n');
    
    // Verificar estrutura atual
    const estruturaQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'candidatos'
      ORDER BY ordinal_position
    `;
    
    const estrutura = await db.query(estruturaQuery);
    console.log('Estrutura atual da tabela candidatos:');
    estrutura.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Verificar se há colunas de partido
    const colunasPartido = estrutura.rows.filter(row => 
      row.column_name.includes('partido') || 
      row.column_name.includes('coligacao') ||
      row.column_name.includes('federacao')
    );
    
    console.log('\nColunas relacionadas a partido:');
    if (colunasPartido.length > 0) {
      colunasPartido.forEach(row => {
        console.log(`- ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('Nenhuma coluna de partido encontrada');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

verificarEstruturaCandidatos();

