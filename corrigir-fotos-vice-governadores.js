const db = require('./config/database');

async function corrigirFotosViceGovernadores() {
  try {
    console.log('🔧 Corrigindo fotos dos Vice-Governadores...\n');
    
    // Mapeamento correto baseado nos sequenciais dos vice-governadores
    const correcoes = [
      { id: 1508, nome: 'ANA LUCIA MEOTTI', sequencial: '240001611129', foto: 'FSC240001611129_div.jpg' },
      { id: 1469, nome: 'BIA VARGAS', sequencial: '240001611130', foto: 'FSC240001611130_div.jpg' },
      { id: 1504, nome: 'ERON GIORDANI', sequencial: '240001611131', foto: 'FSC240001611131_div.jpg' },
      { id: 1629, nome: 'JAIR FERNANDES DE AGUIAR RAMOS', sequencial: '240001611132', foto: 'FSC240001611132_div.jpeg' },
      { id: 1377, nome: 'DR DALMO', sequencial: '240001611133', foto: 'FSC240001611133_div.jpeg' }
    ];
    
    let atualizados = 0;
    let naoEncontrados = 0;
    let erros = 0;
    
    // Verificar quais fotos existem
    const fs = require('fs');
    const path = require('path');
    const fotosDir = path.join(__dirname, 'fotos_candidatos');
    
    console.log('📸 Verificando fotos disponíveis...');
    const fotosExistentes = fs.readdirSync(fotosDir);
    
    for (const correcao of correcoes) {
      try {
        // Verificar se a foto existe
        const fotoExiste = fotosExistentes.includes(correcao.foto);
        
        if (!fotoExiste) {
          console.log(`   ❌ Foto não encontrada: ${correcao.foto} (${correcao.nome})`);
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
          correcao.foto, 
          correcao.sequencial, 
          correcao.id
        ]);
        
        if (result.rowCount > 0) {
          console.log(`   ✅ ${correcao.nome}: ${correcao.foto}`);
          atualizados++;
        } else {
          console.log(`   ⚠️  Candidato não encontrado: ID ${correcao.id} (${correcao.nome})`);
          naoEncontrados++;
        }
        
      } catch (error) {
        console.log(`   ❌ Erro ao atualizar ${correcao.nome}: ${error.message}`);
        erros++;
      }
    }
    
    console.log(`\n📊 Resultado:`);
    console.log(`   ✅ Atualizados: ${atualizados}`);
    console.log(`   ❌ Não encontrados: ${naoEncontrados}`);
    console.log(`   ❌ Erros: ${erros}`);
    
    // Atualizar mapeamento de fotos
    console.log('\n🔄 Atualizando mapeamento de fotos...');
    
    const candidatosComFoto = await db.query(`
      SELECT id, nome, cargo, foto, sequencial_candidato
      FROM candidatos 
      WHERE eleicao_id = 3 AND foto IS NOT NULL
      ORDER BY cargo, nome;
    `);
    
    const mapeamentoFotos = candidatosComFoto.rows.map(candidato => ({
      candidato_id: candidato.id,
      nome: candidato.nome,
      cargo: candidato.cargo,
      sequencial: candidato.sequencial_candidato,
      foto_arquivo: candidato.foto,
      foto_url: `/fotos-candidatos/${candidato.foto}`
    }));
    
    const mapeamentoFile = path.join(__dirname, 'mapeamento-fotos-candidatos.json');
    fs.writeFileSync(mapeamentoFile, JSON.stringify(mapeamentoFotos, null, 2));
    console.log(`   ✅ Mapeamento atualizado: ${mapeamentoFotos.length} candidatos com foto`);
    
    // Verificação final
    console.log('\n📋 Verificação final - Vice-Governadores:');
    const verificacaoQuery = `
      SELECT id, nome, nome_urna, cargo, foto, sequencial_candidato
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND cargo ILIKE '%Vice%'
      ORDER BY nome;
    `;
    
    const verificacaoResult = await db.query(verificacaoQuery);
    verificacaoResult.rows.forEach(candidato => {
      const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' 
          ? candidato.nome_urna 
          : candidato.nome;
      const fotoStatus = candidato.foto ? '✅' : '❌';
      console.log(`   ${fotoStatus} ${candidato.id} | ${nomeExibir} | ${candidato.cargo} | ${candidato.foto || 'N/A'} | Seq: ${candidato.sequencial_candidato || 'N/A'}`);
    });
    
    console.log('\n🎉 Correção de fotos dos vice-governadores concluída!');
    
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
  corrigirFotosViceGovernadores();
}

module.exports = corrigirFotosViceGovernadores;
