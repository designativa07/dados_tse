const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dados_tse',
  password: 'postgres',
  port: 5432,
});

async function verificarMarilisaBanco() {
  try {
    console.log('🔍 Verificando Marilisa no banco de dados...\n');
    
    // Buscar todos os candidatos com nome similar a Marilisa
    const query = `
      SELECT 
        id, nome, nome_urna, cargo, numero, partido, foto,
        sequencial_candidato, eleicao_id
      FROM candidatos 
      WHERE (nome ILIKE '%marilisa%' OR nome_urna ILIKE '%marilisa%')
        AND eleicao_id = 3
      ORDER BY id
    `;
    
    const result = await pool.query(query);
    
    console.log('📊 Candidatos encontrados com nome Marilisa:');
    console.log('='.repeat(80));
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhum candidato encontrado com nome Marilisa');
      
      // Buscar candidatos com cargo de vice-governador
      console.log('\n🔍 Buscando candidatos com cargo de vice-governador...');
      
      const queryVice = `
        SELECT 
          id, nome, nome_urna, cargo, numero, partido, foto,
          sequencial_candidato, eleicao_id
        FROM candidatos 
        WHERE eleicao_id = 3 
          AND (cargo ILIKE '%vice%' OR cargo ILIKE '%vice-governador%')
        ORDER BY id
      `;
      
      const resultVice = await pool.query(queryVice);
      
      if (resultVice.rows.length > 0) {
        console.log('\n📊 Candidatos com cargo de vice-governador:');
        resultVice.rows.forEach((candidato, index) => {
          console.log(`\n${index + 1}. ID: ${candidato.id}`);
          console.log(`   Nome: ${candidato.nome}`);
          console.log(`   Nome na Urna: ${candidato.nome_urna}`);
          console.log(`   Cargo: ${candidato.cargo}`);
          console.log(`   Número: ${candidato.numero}`);
          console.log(`   Partido: ${candidato.partido}`);
          console.log(`   Foto: ${candidato.foto || 'N/A'}`);
          console.log(`   Sequencial: ${candidato.sequencial_candidato || 'N/A'}`);
        });
      } else {
        console.log('❌ Nenhum candidato encontrado com cargo de vice-governador');
      }
      
      // Buscar candidatos com número 22
      console.log('\n🔍 Buscando candidatos com número 22...');
      
      const query22 = `
        SELECT 
          id, nome, nome_urna, cargo, numero, partido, foto,
          sequencial_candidato, eleicao_id
        FROM candidatos 
        WHERE eleicao_id = 3 AND numero = 22
        ORDER BY id
      `;
      
      const result22 = await pool.query(query22);
      
      if (result22.rows.length > 0) {
        console.log('\n📊 Candidatos com número 22:');
        result22.rows.forEach((candidato, index) => {
          console.log(`\n${index + 1}. ID: ${candidato.id}`);
          console.log(`   Nome: ${candidato.nome}`);
          console.log(`   Nome na Urna: ${candidato.nome_urna}`);
          console.log(`   Cargo: ${candidato.cargo}`);
          console.log(`   Número: ${candidato.numero}`);
          console.log(`   Partido: ${candidato.partido}`);
          console.log(`   Foto: ${candidato.foto || 'N/A'}`);
          console.log(`   Sequencial: ${candidato.sequencial_candidato || 'N/A'}`);
        });
      } else {
        console.log('❌ Nenhum candidato encontrado com número 22');
      }
      
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
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

verificarMarilisaBanco();

