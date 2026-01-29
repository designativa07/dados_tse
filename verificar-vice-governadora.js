const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dados_tse',
  password: 'postgres',
  port: 5432,
});

async function verificarViceGovernadora() {
  try {
    console.log('🔍 Verificando dados da vice-governadora...\n');
    
    // Buscar candidatos com cargo de vice-governador
    const query = `
      SELECT 
        id, nome, nome_urna, cargo, numero, partido, foto,
        sequencial_candidato, eleicao_id
      FROM candidatos 
      WHERE eleicao_id = 3 
        AND (cargo ILIKE '%vice%' OR cargo ILIKE '%vice-governador%')
      ORDER BY id
    `;
    
    const result = await pool.query(query);
    
    console.log('📊 Candidatos com cargo de vice-governador:');
    console.log('='.repeat(80));
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum candidato encontrado com cargo de vice-governador');
    } else {
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
    }
    
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
    
    if (resultMarilisa.rows.length === 0) {
      console.log('❌ Nenhum candidato encontrado com nome Marilisa');
    } else {
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
    }
    
    // Verificar se há candidatos com número 222 (vice-governador)
    console.log('\n\n🔍 Candidatos com número 222 (vice-governador):');
    console.log('='.repeat(80));
    
    const query222 = `
      SELECT 
        id, nome, nome_urna, cargo, numero, partido, foto,
        sequencial_candidato, eleicao_id
      FROM candidatos 
      WHERE eleicao_id = 3 AND numero = 222
      ORDER BY id
    `;
    
    const result222 = await pool.query(query222);
    
    if (result222.rows.length === 0) {
      console.log('❌ Nenhum candidato encontrado com número 222');
    } else {
      result222.rows.forEach((candidato, index) => {
        console.log(`\n${index + 1}. ID: ${candidato.id}`);
        console.log(`   Nome: ${candidato.nome}`);
        console.log(`   Nome na Urna: ${candidato.nome_urna}`);
        console.log(`   Cargo: ${candidato.cargo}`);
        console.log(`   Número: ${candidato.numero}`);
        console.log(`   Partido: ${candidato.partido}`);
        console.log(`   Foto: ${candidato.foto || 'N/A'}`);
        console.log(`   Sequencial: ${candidato.sequencial_candidato || 'N/A'}`);
      });
    }
    
    // Verificar fotos específicas
    console.log('\n\n📸 Verificando fotos específicas:');
    console.log('='.repeat(80));
    
    const fs = require('fs');
    const path = require('path');
    const fotosDir = path.join(__dirname, 'fotos_candidatos');
    
    if (fs.existsSync(fotosDir)) {
      // Foto do Jorginho (sequencial 240001611128)
      const fotoJorginho = 'FSC240001611128_div.jpeg';
      const fotoJorginhoPath = path.join(fotosDir, fotoJorginho);
      
      console.log(`\nFoto do Jorginho: ${fotoJorginho}`);
      console.log(`Existe: ${fs.existsSync(fotoJorginhoPath) ? '✅ Sim' : '❌ Não'}`);
      
      // Buscar fotos com sequencial similar
      const files = fs.readdirSync(fotosDir);
      const fotosSimilares = files.filter(file => 
        file.includes('240001611') || 
        file.includes('240001604') ||
        file.includes('240001605')
      );
      
      console.log(`\nFotos com sequencial similar:`);
      fotosSimilares.forEach(file => {
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

verificarViceGovernadora();

