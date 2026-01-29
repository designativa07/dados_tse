const db = require('./config/database');

async function testarAnaliseComplementar() {
  try {
    console.log('🧪 Testando funcionalidades de análise complementar...\n');
    
    // Teste 1: Verificar se as colunas complementares existem
    console.log('1️⃣ Verificando colunas complementares...');
    const colunas = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'candidatos' 
      AND column_name LIKE '%detalhe_situacao%'
      ORDER BY column_name
    `);
    
    console.log(`   ✅ Encontradas ${colunas.rows.length} colunas de situação:`);
    colunas.rows.forEach(col => {
      console.log(`      - ${col.column_name}`);
    });
    
    // Teste 2: Estatísticas básicas
    console.log('\n2️⃣ Estatísticas básicas...');
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_candidatos,
        COUNT(CASE WHEN ds_detalhe_situacao_cand = 'DEFERIDO' THEN 1 END) as deferidos,
        COUNT(CASE WHEN ds_detalhe_situacao_cand = 'INDEFERIDO' THEN 1 END) as indeferidos,
        COUNT(CASE WHEN ds_detalhe_situacao_cand = 'RENÚNCIA' THEN 1 END) as renuncias,
        COUNT(CASE WHEN st_reeleicao = 'S' THEN 1 END) as reeleicoes,
        AVG(vr_despesa_max_campanha) as despesa_media
      FROM candidatos
    `);
    
    const stat = stats.rows[0];
    console.log(`   📊 Total de candidatos: ${stat.total_candidatos}`);
    console.log(`   ✅ Deferidos: ${stat.deferidos}`);
    console.log(`   ❌ Indeferidos: ${stat.indeferidos}`);
    console.log(`   🚪 Renúncias: ${stat.renuncias}`);
    console.log(`   🔄 Reeleições: ${stat.reeleicoes}`);
    console.log(`   💰 Despesa média: R$ ${parseFloat(stat.despesa_media || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    
    // Teste 3: Análise demográfica
    console.log('\n3️⃣ Análise demográfica...');
    const demograficos = await db.query(`
      SELECT 
        ds_nacionalidade,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_nacionalidade IS NOT NULL
      GROUP BY ds_nacionalidade
      ORDER BY quantidade DESC
    `);
    
    console.log('   🌍 Nacionalidades:');
    demograficos.rows.forEach(row => {
      console.log(`      - ${row.ds_nacionalidade}: ${row.quantidade} candidatos`);
    });
    
    // Teste 4: Análise de despesas
    console.log('\n4️⃣ Análise de despesas...');
    const despesas = await db.query(`
      SELECT 
        nome,
        cargo,
        sigla_partido,
        vr_despesa_max_campanha,
        ds_detalhe_situacao_cand
      FROM candidatos 
      WHERE vr_despesa_max_campanha IS NOT NULL 
      AND vr_despesa_max_campanha > 0
      ORDER BY vr_despesa_max_campanha DESC
      LIMIT 5
    `);
    
    console.log('   💰 Top 5 despesas de campanha:');
    despesas.rows.forEach((row, i) => {
      console.log(`      ${i + 1}. ${row.nome} (${row.cargo}) - ${row.sigla_partido}`);
      console.log(`         Despesa: R$ ${parseFloat(row.vr_despesa_max_campanha).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`         Situação: ${row.ds_detalhe_situacao_cand}`);
    });
    
    // Teste 5: Análise por cargo
    console.log('\n5️⃣ Análise por cargo...');
    const porCargo = await db.query(`
      SELECT 
        cargo,
        COUNT(*) as total,
        COUNT(CASE WHEN ds_detalhe_situacao_cand = 'DEFERIDO' THEN 1 END) as deferidos,
        COUNT(CASE WHEN ds_detalhe_situacao_cand = 'INDEFERIDO' THEN 1 END) as indeferidos,
        ROUND(
          COUNT(CASE WHEN ds_detalhe_situacao_cand = 'DEFERIDO' THEN 1 END) * 100.0 / COUNT(*), 2
        ) as percentual_deferidos
      FROM candidatos 
      WHERE cargo IS NOT NULL
      GROUP BY cargo
      ORDER BY total DESC
    `);
    
    console.log('   🏛️ Candidatos por cargo:');
    porCargo.rows.forEach(row => {
      console.log(`      - ${row.cargo}: ${row.total} candidatos`);
      console.log(`        Deferidos: ${row.deferidos} (${row.percentual_deferidos}%)`);
      console.log(`        Indeferidos: ${row.indeferidos}`);
    });
    
    // Teste 6: Verificar dados de um candidato específico
    console.log('\n6️⃣ Exemplo de candidato com dados complementares...');
    const candidatoExemplo = await db.query(`
      SELECT 
        nome,
        nome_urna,
        cargo,
        sigla_partido,
        ds_detalhe_situacao_cand,
        ds_nacionalidade,
        nm_municipio_nascimento,
        vr_despesa_max_campanha,
        st_reeleicao,
        st_declarar_bens
      FROM candidatos 
      WHERE ds_detalhe_situacao_cand IS NOT NULL
      LIMIT 1
    `);
    
    if (candidatoExemplo.rows.length > 0) {
      const c = candidatoExemplo.rows[0];
      console.log(`   👤 Candidato: ${c.nome} (${c.nome_urna})`);
      console.log(`      Cargo: ${c.cargo}`);
      console.log(`      Partido: ${c.sigla_partido}`);
      console.log(`      Situação: ${c.ds_detalhe_situacao_cand}`);
      console.log(`      Nacionalidade: ${c.ds_nacionalidade}`);
      console.log(`      Município nascimento: ${c.nm_municipio_nascimento}`);
      console.log(`      Despesa máxima: R$ ${parseFloat(c.vr_despesa_max_campanha || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
      console.log(`      Reeleição: ${c.st_reeleicao}`);
      console.log(`      Declarar bens: ${c.st_declarar_bens}`);
    }
    
    console.log('\n✅ Teste concluído com sucesso!');
    console.log('\n🎯 Próximos passos implementados:');
    console.log('   ✅ Perfil do candidato atualizado com dados complementares');
    console.log('   ✅ Filtros avançados por situação da candidatura');
    console.log('   ✅ Análise demográfica (nacionalidade, município nascimento)');
    console.log('   ✅ Análise de despesas de campanha');
    console.log('   ✅ Relatórios por situação e cargo');
    console.log('   ✅ API para estatísticas complementares');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testarAnaliseComplementar();
