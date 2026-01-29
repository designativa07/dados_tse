const db = require('./config/database');

async function adicionarColunaFoto() {
  try {
    console.log('🔧 Adicionando coluna foto na tabela candidatos...\n');
    
    // Verificar se a coluna já existe
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'candidatos' AND column_name = 'foto';
    `;
    const checkResult = await db.query(checkColumnQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Coluna "foto" já existe na tabela candidatos');
    } else {
      // Adicionar coluna foto
      const addColumnQuery = `
        ALTER TABLE candidatos 
        ADD COLUMN foto VARCHAR(255);
      `;
      await db.query(addColumnQuery);
      console.log('✅ Coluna "foto" adicionada com sucesso');
    }
    
    // Atualizar candidatos com fotos disponíveis
    console.log('\n📸 Atualizando candidatos com fotos...');
    
    const fs = require('fs');
    const fotosDir = './fotos_candidatos';
    const arquivos = fs.readdirSync(fotosDir);
    
    let atualizados = 0;
    for (const arquivo of arquivos) {
      if (arquivo.endsWith('.jpg') || arquivo.endsWith('.jpeg') || arquivo.endsWith('.png')) {
        const match = arquivo.match(/^FSC(\d+)_div\.(jpg|jpeg|png)$/i);
        if (match) {
          const sequencial = parseInt(match[1]);
          const extensao = match[2];
          const nomeArquivo = `FSC${sequencial}_div.${extensao}`;
          
          // Atualizar candidato com o nome do arquivo da foto
          const updateQuery = `
            UPDATE candidatos 
            SET foto = $1 
            WHERE sequencial_candidato = $2
          `;
          
          const result = await db.query(updateQuery, [nomeArquivo, sequencial]);
          if (result.rowCount > 0) {
            atualizados += result.rowCount;
          }
        }
      }
    }
    
    console.log(`✅ ${atualizados} candidatos atualizados com fotos`);
    
    // Verificar resultado
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(foto) as com_foto,
        COUNT(*) - COUNT(foto) as sem_foto
      FROM candidatos
    `;
    const stats = await db.query(statsQuery);
    
    const total = parseInt(stats.rows[0].total);
    const comFoto = parseInt(stats.rows[0].com_foto);
    const semFoto = parseInt(stats.rows[0].sem_foto);
    
    console.log('\n📊 Estatísticas finais:');
    console.log(`   Total de candidatos: ${total}`);
    console.log(`   Com foto: ${comFoto} (${((comFoto/total)*100).toFixed(1)}%)`);
    console.log(`   Sem foto: ${semFoto} (${((semFoto/total)*100).toFixed(1)}%)`);
    
    console.log('\n🎉 Coluna foto adicionada e candidatos atualizados!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

adicionarColunaFoto();
