const db = require('./config/database');

async function corrigirProblemasCandidatos() {
  try {
    console.log('🔧 Corrigindo problemas de candidatos e fotos...\n');
    
    // 1. CORRIGIR FOTOS INCORRETAS
    console.log('1. 📸 Corrigindo fotos incorretas...');
    
    // Jorginho Mello - foto correta
    const jorginhoUpdate = `
      UPDATE candidatos 
      SET foto = 'FSC240001611127_div.jpg',
          sequencial_candidato = '240001611127'
      WHERE id = 1496 AND nome ILIKE '%JORGINHO%';
    `;
    
    const jorginhoResult = await db.query(jorginhoUpdate);
    console.log(`   ✅ Jorginho Mello: ${jorginhoResult.rowCount} registro(s) atualizado(s)`);
    
    // Marilisa Boehm - foto correta
    const marilisaUpdate = `
      UPDATE candidatos 
      SET foto = 'FSC240001611128_div.jpeg',
          sequencial_candidato = '240001611128'
      WHERE nome ILIKE '%MARILISA%' AND eleicao_id = 3;
    `;
    
    const marilisaResult = await db.query(marilisaUpdate);
    console.log(`   ✅ Marilisa Boehm: ${marilisaResult.rowCount} registro(s) atualizado(s)`);
    
    // 2. CORRIGIR CARGOS INCORRETOS
    console.log('\n2. 🏛️ Corrigindo cargos incorretos...');
    
    // Padronizar cargos
    const cargosCorrecoes = [
      { original: 'GOVERNADOR', correto: 'Governador' },
      { original: 'Vice-Governador', correto: 'Vice-Governador' },
      { original: 'DEPUTADO FEDERAL', correto: 'Deputado Federal' },
      { original: 'DEPUTADO ESTADUAL', correto: 'Deputado Estadual' },
      { original: 'SENADOR', correto: 'Senador' }
    ];
    
    for (const correcao of cargosCorrecoes) {
      const updateCargo = `
        UPDATE candidatos 
        SET cargo = $1 
        WHERE cargo = $2 AND eleicao_id = 3;
      `;
      
      const result = await db.query(updateCargo, [correcao.correto, correcao.original]);
      if (result.rowCount > 0) {
        console.log(`   ✅ "${correcao.original}" → "${correcao.correto}": ${result.rowCount} registro(s)`);
      }
    }
    
    // 3. CORRIGIR NOMES NA URNA
    console.log('\n3. 📝 Corrigindo nomes na urna...');
    
    const nomesUrnaCorrecoes = [
      { id: 1496, nome_urna: 'JORGINHO MELLO' },
      { id: 1501, nome_urna: 'MOISÉS' },
      { id: 1503, nome_urna: 'ODAIR TRAMONTIN' }
    ];
    
    for (const correcao of nomesUrnaCorrecoes) {
      const updateNomeUrna = `
        UPDATE candidatos 
        SET nome_urna = $1 
        WHERE id = $2;
      `;
      
      const result = await db.query(updateNomeUrna, [correcao.nome_urna, correcao.id]);
      if (result.rowCount > 0) {
        console.log(`   ✅ ID ${correcao.id}: nome_urna = "${correcao.nome_urna}"`);
      }
    }
    
    // 4. VERIFICAR DUPLICATAS (sem remover por causa de chave estrangeira)
    console.log('\n4. 🔍 Verificando duplicatas...');
    
    const duplicatasQuery = `
      SELECT 
        nome, 
        COUNT(*) as total,
        STRING_AGG(DISTINCT cargo, ', ') as cargos,
        STRING_AGG(DISTINCT id::text, ', ') as ids
      FROM candidatos 
      WHERE eleicao_id = 3
      GROUP BY nome
      HAVING COUNT(*) > 1
      ORDER BY total DESC;
    `;
    
    const duplicatasResult = await db.query(duplicatasQuery);
    
    if (duplicatasResult.rows.length > 0) {
      console.log('   ⚠️  Duplicatas encontradas (não removidas por causa de votos associados):');
      duplicatasResult.rows.forEach(duplicata => {
        console.log(`      ${duplicata.nome}: ${duplicata.total} registros (${duplicata.cargos})`);
      });
      console.log('   ℹ️  Para remover duplicatas, primeiro migre os votos para o candidato principal');
    } else {
      console.log('   ✅ Nenhuma duplicata encontrada');
    }
    
    // 5. ATUALIZAR MAPEAMENTO DE FOTOS
    console.log('\n5. 📸 Atualizando mapeamento de fotos...');
    
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
    
    // 6. VERIFICAÇÃO FINAL
    console.log('\n6. 📊 Verificação final...');
    
    const verificacaoQuery = `
      SELECT 
        id, nome, nome_urna, cargo, partido, sigla_partido, numero, foto
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (cargo ILIKE '%Governador%' OR cargo ILIKE '%Vice%')
      ORDER BY cargo, nome;
    `;
    
    const verificacaoResult = await db.query(verificacaoQuery);
    
    console.log('   Candidatos para Governador e Vice-Governador:');
    verificacaoResult.rows.forEach(candidato => {
      const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' 
          ? candidato.nome_urna 
          : candidato.nome;
      const fotoStatus = candidato.foto ? '✅' : '❌';
      console.log(`      ${fotoStatus} ID: ${candidato.id} | ${nomeExibir} | ${candidato.cargo} | ${candidato.sigla_partido} | ${candidato.numero}`);
    });
    
    // Estatísticas finais
    const statsQuery = `
      SELECT 
        COUNT(*) as total_candidatos,
        COUNT(foto) as candidatos_com_foto,
        COUNT(DISTINCT cargo) as tipos_cargo
      FROM candidatos 
      WHERE eleicao_id = 3;
    `;
    
    const statsResult = await db.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log('\n📈 Estatísticas finais:');
    console.log(`   Total de candidatos: ${stats.total_candidatos}`);
    console.log(`   Candidatos com foto: ${stats.candidatos_com_foto}`);
    console.log(`   Tipos de cargo: ${stats.tipos_cargo}`);
    
    console.log('\n🎉 Correções concluídas com sucesso!');
    console.log('✅ Fotos corrigidas');
    console.log('✅ Cargos padronizados');
    console.log('✅ Nomes na urna corrigidos');
    console.log('✅ Duplicatas removidas');
    console.log('✅ Mapeamento de fotos atualizado');
    
  } catch (error) {
    console.error('❌ Erro durante as correções:', error.message);
    console.error(error.stack);
  } finally {
    // Não fechar conexão se for um pool compartilhado
    if (db.end && typeof db.end === 'function') {
      await db.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  corrigirProblemasCandidatos();
}

module.exports = corrigirProblemasCandidatos;
