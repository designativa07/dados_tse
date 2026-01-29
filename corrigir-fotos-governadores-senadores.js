const db = require('./config/database');

async function corrigirFotosGovernadoresSenadores() {
  try {
    console.log('🔧 Corrigindo fotos de Governadores e Senadores...\n');
    
    // Mapeamento correto baseado nos sequenciais dos candidatos
    const correcoes = [
      // Governadores
      { id: 1443, nome: 'PROFESSOR ALEX ALANO', sequencial: '240001610793', foto: 'FSC240001610793_div.jpg' },
      { id: 1492, nome: 'ESPERIDIÃO AMIN', sequencial: '240001679805', foto: 'FSC240001679805_div.jpg' },
      { id: 1501, nome: 'MOISÉS', sequencial: '240001610772', foto: 'FSC240001610772_div.jpg' },
      { id: 1503, nome: 'ODAIR TRAMONTIN', sequencial: '240001605909', foto: 'FSC240001605909_div.jpg' },
      
      // Senadores - corrigir sequenciais
      { id: 2103, nome: 'AFRÂNIO BOPPRÉ', sequencial: '240001610105', foto: 'FSC240001610105_div.jpg' },
      { id: 1860, nome: 'CAROLINE SANT ANNA', sequencial: '240001679860', foto: 'FSC240001679860_div.jpeg' },
      { id: 1882, nome: 'CELSO MALDANER', sequencial: '240001647359', foto: 'FSC240001647359_div.jpg' },
      { id: 2252, nome: 'CHRIS STUART', sequencial: '240001614319', foto: 'FSC240001614319_div.jpeg' },
      { id: 1518, nome: 'KENNEDY NUNES', sequencial: '240001644895', foto: 'FSC240001644895_div.jpg' },
      { id: 1674, nome: 'DÁRIO', sequencial: '240001679865', foto: 'FSC240001679865_div.jpg' },
      { id: 1774, nome: 'GILMAR SALGADO', sequencial: '240001610795', foto: 'FSC240001610795_div.jpg' },
      { id: 2094, nome: 'HILDA DEOLA', sequencial: '240001644705', foto: 'FSC240001644705_div.jpg' },
      { id: 1736, nome: 'RAIMUNDO COLOMBO', sequencial: '240001620979', foto: 'FSC240001620979_div.jpg' },
      { id: 1785, nome: 'JORGE SEIF', sequencial: '240001611131', foto: 'FSC240001611131_div.jpg' },
      { id: 1472, nome: 'LUIZ BARBOZA', sequencial: '240001602695', foto: 'FSC240001602695_div.jpg' }
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
    console.log('\n📋 Verificação final - Governadores e Senadores:');
    const verificacaoQuery = `
      SELECT id, nome, nome_urna, cargo, foto
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (cargo ILIKE '%Governador%' OR cargo ILIKE '%Senador%')
      ORDER BY cargo, nome;
    `;
    
    const verificacaoResult = await db.query(verificacaoQuery);
    verificacaoResult.rows.forEach(candidato => {
      const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' 
          ? candidato.nome_urna 
          : candidato.nome;
      const fotoStatus = candidato.foto ? '✅' : '❌';
      console.log(`   ${fotoStatus} ${candidato.id} | ${nomeExibir} | ${candidato.cargo} | ${candidato.foto || 'N/A'}`);
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
  corrigirFotosGovernadoresSenadores();
}

module.exports = corrigirFotosGovernadoresSenadores;
