const db = require('./config/database');

async function verificarImportacaoComplementar() {
  try {
    console.log('🔍 Verificando importação dos dados complementares...\n');
    
    // Verificar quantos candidatos têm dados complementares
    const totalCandidatos = await db.query('SELECT COUNT(*) as total FROM candidatos');
    console.log(`📊 Total de candidatos no banco: ${totalCandidatos.rows[0].total}`);
    
    // Verificar candidatos com dados complementares
    const candidatosComDados = await db.query(`
      SELECT COUNT(*) as total 
      FROM candidatos 
      WHERE cd_detalhe_situacao_cand IS NOT NULL 
      OR ds_detalhe_situacao_cand IS NOT NULL
      OR cd_nacionalidade IS NOT NULL
      OR ds_nacionalidade IS NOT NULL
    `);
    
    console.log(`✅ Candidatos com dados complementares: ${candidatosComDados.rows[0].total}`);
    
    // Verificar alguns exemplos
    const exemplos = await db.query(`
      SELECT 
        id, 
        nome, 
        cargo,
        cd_detalhe_situacao_cand,
        ds_detalhe_situacao_cand,
        cd_nacionalidade,
        ds_nacionalidade,
        nm_municipio_nascimento,
        vr_despesa_max_campanha,
        st_reeleicao,
        st_declarar_bens
      FROM candidatos 
      WHERE cd_detalhe_situacao_cand IS NOT NULL
      ORDER BY id
      LIMIT 5
    `);
    
    console.log('\n📋 Exemplos de candidatos com dados complementares:');
    exemplos.rows.forEach((candidato, i) => {
      console.log(`\n${i + 1}. ${candidato.nome} (${candidato.cargo})`);
      console.log(`   Detalhe situação: ${candidato.cd_detalhe_situacao_cand} - ${candidato.ds_detalhe_situacao_cand}`);
      console.log(`   Nacionalidade: ${candidato.cd_nacionalidade} - ${candidato.ds_nacionalidade}`);
      console.log(`   Município nascimento: ${candidato.nm_municipio_nascimento}`);
      console.log(`   Despesa máxima: R$ ${candidato.vr_despesa_max_campanha || 'N/A'}`);
      console.log(`   Reeleição: ${candidato.st_reeleicao || 'N/A'}`);
      console.log(`   Declarar bens: ${candidato.st_declarar_bens || 'N/A'}`);
    });
    
    // Verificar estatísticas por situação
    const situacoes = await db.query(`
      SELECT 
        ds_detalhe_situacao_cand,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_detalhe_situacao_cand IS NOT NULL
      GROUP BY ds_detalhe_situacao_cand
      ORDER BY quantidade DESC
    `);
    
    console.log('\n📊 Situações dos candidatos:');
    situacoes.rows.forEach(situacao => {
      console.log(`   ${situacao.ds_detalhe_situacao_cand}: ${situacao.quantidade} candidatos`);
    });
    
    // Verificar nacionalidades
    const nacionalidades = await db.query(`
      SELECT 
        ds_nacionalidade,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_nacionalidade IS NOT NULL
      GROUP BY ds_nacionalidade
      ORDER BY quantidade DESC
    `);
    
    console.log('\n🌍 Nacionalidades:');
    nacionalidades.rows.forEach(nacionalidade => {
      console.log(`   ${nacionalidade.ds_nacionalidade}: ${nacionalidade.quantidade} candidatos`);
    });
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  }
}

verificarImportacaoComplementar();
