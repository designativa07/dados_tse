const db = require('./config/database');

function padronizarCargo(cargo) {
  if (!cargo) return cargo;
  
  // Converter para minúsculo primeiro
  let cargoPadronizado = cargo.toLowerCase();
  
  // Capitalizar primeira letra de cada palavra
  cargoPadronizado = cargoPadronizado.replace(/\b\w/g, l => l.toUpperCase());
  
  // Tratamentos especiais
  cargoPadronizado = cargoPadronizado
    .replace(/\b1º\b/g, '1º')
    .replace(/\b2º\b/g, '2º')
    .replace(/\bSuplente\b/g, 'Suplente')
    .replace(/\bVice\b/g, 'Vice')
    .replace(/\bGovernador\b/g, 'Governador')
    .replace(/\bDeputado\b/g, 'Deputado')
    .replace(/\bFederal\b/g, 'Federal')
    .replace(/\bEstadual\b/g, 'Estadual')
    .replace(/\bSenador\b/g, 'Senador');
  
  return cargoPadronizado;
}

async function padronizarCargos() {
  try {
    console.log('🔧 Padronizando cargos no banco de dados...\n');
    
    // Primeiro, verificar os cargos atuais
    console.log('1. Verificando cargos atuais...');
    const cargosAtuais = await db.query('SELECT DISTINCT cargo FROM candidatos ORDER BY cargo');
    
    console.log('📋 Cargos atuais:');
    cargosAtuais.rows.forEach((row, i) => {
      console.log(`${(i + 1).toString().padStart(2, ' ')}. "${row.cargo}"`);
    });
    
    // Criar mapeamento de conversão
    const mapeamento = {};
    cargosAtuais.rows.forEach(row => {
      const cargoOriginal = row.cargo;
      const cargoPadronizado = padronizarCargo(cargoOriginal);
      
      if (cargoOriginal !== cargoPadronizado) {
        mapeamento[cargoOriginal] = cargoPadronizado;
      }
    });
    
    console.log('\n2. Mapeamento de conversão:');
    Object.keys(mapeamento).forEach(original => {
      console.log(`   "${original}" → "${mapeamento[original]}"`);
    });
    
    if (Object.keys(mapeamento).length === 0) {
      console.log('✅ Todos os cargos já estão padronizados!');
      process.exit(0);
    }
    
    // Aplicar as conversões
    console.log('\n3. Aplicando padronização...');
    let totalAtualizados = 0;
    
    for (const [original, padronizado] of Object.entries(mapeamento)) {
      const updateQuery = `
        UPDATE candidatos 
        SET cargo = $1 
        WHERE cargo = $2
      `;
      
      const result = await db.query(updateQuery, [padronizado, original]);
      console.log(`   ✅ "${original}" → "${padronizado}": ${result.rowCount} registros atualizados`);
      totalAtualizados += result.rowCount;
    }
    
    console.log(`\n📊 Total de registros atualizados: ${totalAtualizados}`);
    
    // Verificar resultado final
    console.log('\n4. Verificando resultado final...');
    const cargosFinais = await db.query('SELECT DISTINCT cargo FROM candidatos ORDER BY cargo');
    
    console.log('📋 Cargos após padronização:');
    cargosFinais.rows.forEach((row, i) => {
      console.log(`${(i + 1).toString().padStart(2, ' ')}. "${row.cargo}"`);
    });
    
    // Verificar se ainda há inconsistências
    const inconsistentes = cargosFinais.rows.filter(row => {
      const cargo = row.cargo;
      return cargo !== padronizarCargo(cargo);
    });
    
    if (inconsistentes.length > 0) {
      console.log('\n⚠️  Ainda há cargos inconsistentes:');
      inconsistentes.forEach(row => {
        console.log(`   - "${row.cargo}"`);
      });
    } else {
      console.log('\n✅ Todos os cargos foram padronizados com sucesso!');
    }
    
    console.log('\n🎉 Padronização concluída!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a padronização:', error.message);
    process.exit(1);
  }
}

padronizarCargos();
