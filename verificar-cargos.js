const db = require('./config/database');

async function verificarCargos() {
  try {
    console.log('🔍 Verificando cargos no banco de dados...\n');
    
    const result = await db.query('SELECT DISTINCT cargo FROM candidatos ORDER BY cargo');
    
    console.log(`📊 Total de tipos de cargo únicos: ${result.rows.length}\n`);
    
    console.log('📋 Cargos encontrados:');
    result.rows.forEach((row, i) => {
      console.log(`${(i + 1).toString().padStart(2, ' ')}. "${row.cargo}"`);
    });
    
    // Agrupar por padrões
    console.log('\n🔍 Análise de padrões:');
    const padroes = {};
    
    result.rows.forEach(row => {
      const cargo = row.cargo;
      if (!cargo) return;
      
      // Detectar padrão
      let padrao = 'outros';
      if (cargo === cargo.toUpperCase()) {
        padrao = 'TUDO_MAIUSCULO';
      } else if (cargo === cargo.toLowerCase()) {
        padrao = 'tudo_minusculo';
      } else if (cargo.charAt(0) === cargo.charAt(0).toUpperCase() && cargo.slice(1) === cargo.slice(1).toLowerCase()) {
        padrao = 'Primeira_Maiuscula';
      } else if (cargo.includes(' ')) {
        const palavras = cargo.split(' ');
        if (palavras.every(p => p.charAt(0) === p.charAt(0).toUpperCase())) {
          padrao = 'Cada_Palavra_Maiuscula';
        }
      }
      
      if (!padroes[padrao]) padroes[padrao] = [];
      padroes[padrao].push(cargo);
    });
    
    Object.keys(padroes).forEach(padrao => {
      console.log(`\n📌 ${padrao}: ${padroes[padrao].length} cargos`);
      padroes[padrao].forEach(cargo => {
        console.log(`   - "${cargo}"`);
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificarCargos();
