const db = require('./config/database');

async function verificarPadronizacao() {
  try {
    console.log('🔍 Verificando padronização dos cargos...\n');
    
    // Verificar cargos únicos
    const cargosResult = await db.query('SELECT DISTINCT cargo FROM candidatos ORDER BY cargo');
    
    console.log('📋 Cargos após padronização:');
    cargosResult.rows.forEach((row, i) => {
      console.log(`${(i + 1).toString().padStart(2, ' ')}. "${row.cargo}"`);
    });
    
    // Verificar contagem por cargo
    console.log('\n📊 Contagem por cargo:');
    const contagemResult = await db.query(`
      SELECT cargo, COUNT(*) as total 
      FROM candidatos 
      GROUP BY cargo 
      ORDER BY total DESC
    `);
    
    contagemResult.rows.forEach(row => {
      console.log(`   ${row.cargo.padEnd(20)}: ${row.total.toString().padStart(4, ' ')} candidatos`);
    });
    
    // Verificar se há inconsistências
    console.log('\n🔍 Verificando inconsistências...');
    const inconsistentes = cargosResult.rows.filter(row => {
      const cargo = row.cargo;
      if (!cargo) return false;
      
      // Verificar se está padronizado (primeira letra maiúscula, resto minúsculo, exceto palavras específicas)
      const palavras = cargo.split(' ');
      const padronizado = palavras.every(palavra => {
        if (palavra === '') return true;
        
        // Exceções para números ordinais e hífens
        if (/^\d+º$/.test(palavra)) return true;
        if (palavra.includes('-')) {
          return palavra.split('-').every(parte => 
            parte === '' || parte.charAt(0) === parte.charAt(0).toUpperCase()
          );
        }
        
        // Primeira letra maiúscula, resto minúsculo
        return palavra.charAt(0) === palavra.charAt(0).toUpperCase() && 
               palavra.slice(1) === palavra.slice(1).toLowerCase();
      });
      
      return !padronizado;
    });
    
    if (inconsistentes.length > 0) {
      console.log('⚠️  Cargos ainda inconsistentes:');
      inconsistentes.forEach(row => {
        console.log(`   - "${row.cargo}"`);
      });
    } else {
      console.log('✅ Todos os cargos estão padronizados!');
    }
    
    // Verificar se há cargos duplicados (diferentes formatações do mesmo cargo)
    console.log('\n🔍 Verificando duplicatas conceituais...');
    const cargosNormalizados = cargosResult.rows.map(row => ({
      original: row.cargo,
      normalizado: row.cargo.toLowerCase().replace(/[^a-z0-9]/g, '')
    }));
    
    const duplicatas = {};
    cargosNormalizados.forEach(cargo => {
      if (!duplicatas[cargo.normalizado]) {
        duplicatas[cargo.normalizado] = [];
      }
      duplicatas[cargo.normalizado].push(cargo.original);
    });
    
    const duplicatasEncontradas = Object.values(duplicatas).filter(arr => arr.length > 1);
    
    if (duplicatasEncontradas.length > 0) {
      console.log('⚠️  Possíveis duplicatas conceituais:');
      duplicatasEncontradas.forEach(duplicata => {
        console.log(`   - ${duplicata.join(' | ')}`);
      });
    } else {
      console.log('✅ Nenhuma duplicata conceitual encontrada!');
    }
    
    console.log('\n🎉 Verificação concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error.message);
    process.exit(1);
  }
}

verificarPadronizacao();
