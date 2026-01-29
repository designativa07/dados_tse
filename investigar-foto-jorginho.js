const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dados_tse',
  password: 'postgres',
  port: 5432,
});

async function investigarFotoJorginho() {
  try {
    console.log('🔍 Investigando problema da foto do Jorginho...\n');
    
    // Buscar candidatos com número 22 na eleição 2022
    const query = `
      SELECT 
        id, nome, nome_urna, cargo, numero, partido, foto,
        sequencial_candidato, eleicao_id
      FROM candidatos 
      WHERE eleicao_id = 3 AND numero = 22
      ORDER BY id
    `;
    
    const result = await pool.query(query);
    
    console.log('📊 Candidatos com número 22 (eleição 2022):');
    console.log('='.repeat(80));
    
    result.rows.forEach((candidato, index) => {
      console.log(`\n${index + 1}. ID: ${candidato.id}`);
      console.log(`   Nome: ${candidato.nome}`);
      console.log(`   Nome na Urna: ${candidato.nome_urna}`);
      console.log(`   Cargo: ${candidato.cargo}`);
      console.log(`   Número: ${candidato.numero}`);
      console.log(`   Partido: ${candidato.partido}`);
      console.log(`   Foto: ${candidato.foto || 'N/A'}`);
      console.log(`   Sequencial: ${candidato.sequencial_candidato || 'N/A'}`);
    });
    
    // Buscar candidatos com nome similar a Jorginho
    console.log('\n\n🔍 Candidatos com nome similar a Jorginho:');
    console.log('='.repeat(80));
    
    const queryJorginho = `
      SELECT 
        id, nome, nome_urna, cargo, numero, partido, foto,
        sequencial_candidato, eleicao_id
      FROM candidatos 
      WHERE (nome ILIKE '%jorginho%' OR nome_urna ILIKE '%jorginho%')
        AND eleicao_id = 3
      ORDER BY id
    `;
    
    const resultJorginho = await pool.query(queryJorginho);
    
    resultJorginho.rows.forEach((candidato, index) => {
      console.log(`\n${index + 1}. ID: ${candidato.id}`);
      console.log(`   Nome: ${candidato.nome}`);
      console.log(`   Nome na Urna: ${candidato.nome_urna}`);
      console.log(`   Cargo: ${candidato.cargo}`);
      console.log(`   Número: ${candidato.numero}`);
      console.log(`   Partido: ${candidato.partido}`);
      console.log(`   Foto: ${candidato.foto || 'N/A'}`);
      console.log(`   Sequencial: ${candidato.sequencial_candidato || 'N/A'}`);
    });
    
    // Buscar candidatos com nome similar a Marilisa
    console.log('\n\n🔍 Candidatos com nome similar a Marilisa:');
    console.log('='.repeat(80));
    
    const queryMarilisa = `
      SELECT 
        id, nome, nome_urna, cargo, numero, partido, foto,
        sequencial_candidato, eleicao_id
      FROM candidatos 
      WHERE (nome ILIKE '%marilisa%' OR nome_urna ILIKE '%marilisa%')
        AND eleicao_id = 3
      ORDER BY id
    `;
    
    const resultMarilisa = await pool.query(queryMarilisa);
    
    resultMarilisa.rows.forEach((candidato, index) => {
      console.log(`\n${index + 1}. ID: ${candidato.id}`);
      console.log(`   Nome: ${candidato.nome}`);
      console.log(`   Nome na Urna: ${candidato.nome_urna}`);
      console.log(`   Cargo: ${candidato.cargo}`);
      console.log(`   Número: ${candidato.numero}`);
      console.log(`   Partido: ${candidato.partido}`);
      console.log(`   Foto: ${candidato.foto || 'N/A'}`);
      console.log(`   Sequencial: ${candidato.sequencial_candidato || 'N/A'}`);
    });
    
    // Verificar se há fotos com sequencial 22
    console.log('\n\n📸 Verificando fotos com sequencial 22:');
    console.log('='.repeat(80));
    
    const fs = require('fs');
    const path = require('path');
    const fotosDir = path.join(__dirname, 'fotos_candidatos');
    
    if (fs.existsSync(fotosDir)) {
      const files = fs.readdirSync(fotosDir);
      const fotos22 = files.filter(file => 
        file.toLowerCase().includes('22') || 
        file.toLowerCase().includes('jorginho') ||
        file.toLowerCase().includes('marilisa')
      );
      
      console.log(`\nFotos encontradas relacionadas ao número 22:`);
      fotos22.forEach(file => {
        console.log(`   - ${file}`);
      });
    } else {
      console.log('❌ Pasta fotos_candidatos não encontrada');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

investigarFotoJorginho();
