const db = require('./config/database');

async function corrigirFotosPrincipais() {
  try {
    console.log('📸 Corrigindo fotos dos candidatos principais...\n');
    
    // Lista de candidatos principais e suas fotos corretas (baseado nas fotos que existem)
    const candidatosPrincipais = [
      { id: 1508, nome: 'ANA LUCIA MEOTTI', sequencial: '240001611129', foto: 'FSC240001611129_div.jpg' },
      { id: 1469, nome: 'BIA VARGAS', sequencial: '240001611130', foto: 'FSC240001611130_div.jpg' },
      { id: 1504, nome: 'ERON GIORDANI', sequencial: '240001611131', foto: 'FSC240001611131_div.jpg' },
      { id: 1629, nome: 'JAIR FERNANDES DE AGUIAR RAMOS', sequencial: '240001611132', foto: 'FSC240001611132_div.jpeg' },
      { id: 1377, nome: 'DR DALMO', sequencial: '240001611133', foto: 'FSC240001611133_div.jpeg' }
    ];
    
    let atualizados = 0;
    let naoEncontrados = 0;
    
    for (const candidato of candidatosPrincipais) {
      try {
        // Verificar se o arquivo de foto existe
        const fs = require('fs');
        const path = require('path');
        const fotoPath = path.join(__dirname, 'fotos_candidatos', candidato.foto);
        
        if (!fs.existsSync(fotoPath)) {
          console.log(`   ❌ Foto não encontrada: ${candidato.foto}`);
          naoEncontrados++;
          continue;
        }
        
        // Atualizar candidato
        const updateQuery = `
          UPDATE candidatos 
          SET foto = $1, sequencial_candidato = $2
          WHERE id = $3;
        `;
        
        const result = await db.query(updateQuery, [
          candidato.foto, 
          candidato.sequencial, 
          candidato.id
        ]);
        
        if (result.rowCount > 0) {
          console.log(`   ✅ ${candidato.nome}: ${candidato.foto}`);
          atualizados++;
        } else {
          console.log(`   ⚠️  Candidato não encontrado: ID ${candidato.id}`);
          naoEncontrados++;
        }
        
      } catch (error) {
        console.log(`   ❌ Erro ao atualizar ${candidato.nome}: ${error.message}`);
        naoEncontrados++;
      }
    }
    
    console.log(`\n📊 Resultado:`);
    console.log(`   ✅ Atualizados: ${atualizados}`);
    console.log(`   ❌ Não encontrados/erros: ${naoEncontrados}`);
    
    // Atualizar mapeamento de fotos
    console.log('\n🔄 Atualizando mapeamento de fotos...');
    
    const candidatosComFoto = await db.query(`
      SELECT id, nome, cargo, foto, sequencial_candidato
      FROM candidatos 
      WHERE eleicao_id = 3 AND foto IS NOT NULL
      ORDER BY id;
    `);
    
    const mapeamentoFotos = candidatosComFoto.rows.map(candidato => ({
      candidato_id: candidato.id,
      nome: candidato.nome,
      cargo: candidato.cargo,
      sequencial: candidato.sequencial_candidato,
      foto_arquivo: candidato.foto,
      foto_url: `/fotos-candidatos/${candidato.foto}`
    }));
    
    const fs = require('fs');
    const path = require('path');
    const mapeamentoFile = path.join(__dirname, 'mapeamento-fotos-candidatos.json');
    
    fs.writeFileSync(mapeamentoFile, JSON.stringify(mapeamentoFotos, null, 2));
    console.log(`   ✅ Mapeamento atualizado: ${mapeamentoFotos.length} candidatos com foto`);
    
    // Verificação final
    console.log('\n📋 Candidatos com foto após correção:');
    const verificacaoQuery = `
      SELECT id, nome, nome_urna, cargo, foto
      FROM candidatos 
      WHERE eleicao_id = 3 AND foto IS NOT NULL
      ORDER BY cargo, nome;
    `;
    
    const verificacaoResult = await db.query(verificacaoQuery);
    verificacaoResult.rows.forEach(candidato => {
      const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' 
          ? candidato.nome_urna 
          : candidato.nome;
      console.log(`   ✅ ${candidato.id} | ${nomeExibir} | ${candidato.cargo} | ${candidato.foto}`);
    });
    
    console.log('\n🎉 Correção de fotos concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (db.end && typeof db.end === 'function') {
      await db.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  corrigirFotosPrincipais();
}

module.exports = corrigirFotosPrincipais;
