const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dados_tse',
  password: 'postgres',
  port: 5432,
});

async function corrigirFotoJorginho() {
  try {
    console.log('🔧 Corrigindo foto do Jorginho...\n');
    
    // Buscar o candidato Jorginho (ID 1496)
    const queryJorginho = `
      SELECT id, nome, nome_urna, cargo, numero, foto, sequencial_candidato
      FROM candidatos 
      WHERE id = 1496
    `;
    
    const resultJorginho = await pool.query(queryJorginho);
    
    if (resultJorginho.rows.length === 0) {
      console.log('❌ Candidato Jorginho não encontrado');
      return;
    }
    
    const jorginho = resultJorginho.rows[0];
    console.log('📊 Dados atuais do Jorginho:');
    console.log(`   ID: ${jorginho.id}`);
    console.log(`   Nome: ${jorginho.nome}`);
    console.log(`   Nome na Urna: ${jorginho.nome_urna}`);
    console.log(`   Cargo: ${jorginho.cargo}`);
    console.log(`   Número: ${jorginho.numero}`);
    console.log(`   Foto atual: ${jorginho.foto}`);
    console.log(`   Sequencial: ${jorginho.sequencial_candidato}`);
    
    // A foto correta deveria ser FSC240001611127_div.jpg (sequencial 240001611127)
    // Mas está com FSC240001611128_div.jpeg (sequencial 240001611128 - da Marilisa)
    
    console.log('\n🔧 Corrigindo foto...');
    
    const updateQuery = `
      UPDATE candidatos 
      SET foto = 'FSC240001611127_div.jpg',
          sequencial_candidato = '240001611127'
      WHERE id = 1496
    `;
    
    await pool.query(updateQuery);
    
    console.log('✅ Foto corrigida!');
    console.log('   Nova foto: FSC240001611127_div.jpg');
    console.log('   Novo sequencial: 240001611127');
    
    // Verificar se a foto existe
    const fs = require('fs');
    const path = require('path');
    const fotoPath = path.join(__dirname, 'fotos_candidatos', 'FSC240001611127_div.jpg');
    
    if (fs.existsSync(fotoPath)) {
      console.log('✅ Arquivo de foto existe no sistema');
    } else {
      console.log('❌ Arquivo de foto não encontrado:', fotoPath);
    }
    
    // Verificar se a foto da Marilisa está correta
    console.log('\n🔍 Verificando foto da Marilisa...');
    
    const queryMarilisa = `
      SELECT id, nome, nome_urna, cargo, numero, foto, sequencial_candidato
      FROM candidatos 
      WHERE nome ILIKE '%marilisa%' AND eleicao_id = 3
    `;
    
    const resultMarilisa = await pool.query(queryMarilisa);
    
    if (resultMarilisa.rows.length > 0) {
      const marilisa = resultMarilisa.rows[0];
      console.log('📊 Dados da Marilisa:');
      console.log(`   ID: ${marilisa.id}`);
      console.log(`   Nome: ${marilisa.nome}`);
      console.log(`   Nome na Urna: ${marilisa.nome_urna}`);
      console.log(`   Cargo: ${marilisa.cargo}`);
      console.log(`   Número: ${marilisa.numero}`);
      console.log(`   Foto: ${marilisa.foto}`);
      console.log(`   Sequencial: ${marilisa.sequencial_candidato}`);
      
      // A Marilisa deveria ter a foto FSC240001611128_div.jpeg
      if (marilisa.foto !== 'FSC240001611128_div.jpeg') {
        console.log('\n🔧 Corrigindo foto da Marilisa...');
        
        const updateMarilisaQuery = `
          UPDATE candidatos 
          SET foto = 'FSC240001611128_div.jpeg',
              sequencial_candidato = '240001611128'
          WHERE id = ${marilisa.id}
        `;
        
        await pool.query(updateMarilisaQuery);
        console.log('✅ Foto da Marilisa corrigida!');
      } else {
        console.log('✅ Foto da Marilisa já está correta');
      }
    } else {
      console.log('❌ Marilisa não encontrada no banco');
    }
    
    // Verificar resultado final
    console.log('\n📊 Verificação final:');
    console.log('='.repeat(50));
    
    const queryFinal = `
      SELECT id, nome, nome_urna, cargo, numero, foto, sequencial_candidato
      FROM candidatos 
      WHERE id IN (1496, (SELECT id FROM candidatos WHERE nome ILIKE '%marilisa%' AND eleicao_id = 3 LIMIT 1))
      ORDER BY id
    `;
    
    const resultFinal = await pool.query(queryFinal);
    
    resultFinal.rows.forEach((candidato, index) => {
      console.log(`\n${index + 1}. ID: ${candidato.id}`);
      console.log(`   Nome: ${candidato.nome}`);
      console.log(`   Nome na Urna: ${candidato.nome_urna}`);
      console.log(`   Cargo: ${candidato.cargo}`);
      console.log(`   Número: ${candidato.numero}`);
      console.log(`   Foto: ${candidato.foto}`);
      console.log(`   Sequencial: ${candidato.sequencial_candidato}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

corrigirFotoJorginho();

