const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/analise-complementar/estatisticas - Estatísticas gerais dos dados complementares
router.get('/estatisticas', async (req, res) => {
  try {
    // Estatísticas básicas
    const totalCandidatos = await db.query('SELECT COUNT(*) as total FROM candidatos');
    
    // Situações dos candidatos
    const situacoes = await db.query(`
      SELECT 
        ds_detalhe_situacao_cand,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_detalhe_situacao_cand IS NOT NULL
      GROUP BY ds_detalhe_situacao_cand
      ORDER BY quantidade DESC
    `);
    
    // Nacionalidades
    const nacionalidades = await db.query(`
      SELECT 
        ds_nacionalidade,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_nacionalidade IS NOT NULL
      GROUP BY ds_nacionalidade
      ORDER BY quantidade DESC
    `);
    
    // Despesas de campanha
    const despesas = await db.query(`
      SELECT 
        AVG(vr_despesa_max_campanha) as media,
        MIN(vr_despesa_max_campanha) as minima,
        MAX(vr_despesa_max_campanha) as maxima,
        COUNT(*) as total_com_despesa
      FROM candidatos 
      WHERE vr_despesa_max_campanha IS NOT NULL 
      AND vr_despesa_max_campanha > 0
    `);
    
    // Reeleições
    const reeleicoes = await db.query(`
      SELECT COUNT(*) as total
      FROM candidatos 
      WHERE st_reeleicao = 'S'
    `);
    
    // Candidatos por cargo
    const candidatosPorCargo = await db.query(`
      SELECT 
        cargo,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE cargo IS NOT NULL
      GROUP BY cargo
      ORDER BY quantidade DESC
    `);
    
    // Idade média dos candidatos
    const idadeMedia = await db.query(`
      SELECT 
        AVG(nr_idade_data_posse) as media_idade
      FROM candidatos 
      WHERE nr_idade_data_posse IS NOT NULL 
      AND nr_idade_data_posse > 0
    `);
    
    // Processar dados
    const situacoesMap = {};
    situacoes.rows.forEach(row => {
      situacoesMap[row.ds_detalhe_situacao_cand] = parseInt(row.quantidade);
    });
    
    const nacionalidadesMap = {};
    nacionalidades.rows.forEach(row => {
      nacionalidadesMap[row.ds_nacionalidade] = parseInt(row.quantidade);
    });
    
    const candidatosPorCargoMap = {};
    candidatosPorCargo.rows.forEach(row => {
      candidatosPorCargoMap[row.cargo] = parseInt(row.quantidade);
    });
    
    const despesaData = despesas.rows[0];
    const despesaMedia = despesaData ? parseFloat(despesaData.media || 0) : 0;
    
    res.json({
      total_candidatos: parseInt(totalCandidatos.rows[0].total),
      candidatos_deferidos: situacoesMap['DEFERIDO'] || 0,
      candidatos_indeferidos: situacoesMap['INDEFERIDO'] || 0,
      candidatos_renuncia: situacoesMap['RENÚNCIA'] || 0,
      candidatos_cancelados: situacoesMap['CANCELADO'] || 0,
      reeleicoes: parseInt(reeleicoes.rows[0].total),
      despesa_media: despesaMedia.toLocaleString('pt-BR', {minimumFractionDigits: 2}),
      despesa_minima: despesaData ? parseFloat(despesaData.minima || 0) : 0,
      despesa_maxima: despesaData ? parseFloat(despesaData.maxima || 0) : 0,
      total_com_despesa: parseInt(despesaData?.total_com_despesa || 0),
      idade_media: idadeMedia.rows[0] ? parseFloat(idadeMedia.rows[0].media_idade || 0) : 0,
      situacoes: situacoesMap,
      nacionalidades: nacionalidadesMap,
      candidatos_por_cargo: candidatosPorCargoMap
    });
    
  } catch (error) {
    console.error('Erro ao buscar estatísticas complementares:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/analise-complementar/despesas - Análise de despesas de campanha
router.get('/despesas', async (req, res) => {
  try {
    const { cargo, partido, limite = 20 } = req.query;
    
    let whereConditions = ['vr_despesa_max_campanha IS NOT NULL', 'vr_despesa_max_campanha > 0'];
    let params = [];
    let paramCount = 0;
    
    if (cargo) {
      whereConditions.push(`cargo ILIKE $${++paramCount}`);
      params.push(`%${cargo}%`);
    }
    
    if (partido) {
      whereConditions.push(`(sigla_partido ILIKE $${++paramCount} OR nome_partido ILIKE $${++paramCount})`);
      params.push(`%${partido}%`);
      params.push(`%${partido}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    const query = `
      SELECT 
        nome,
        nome_urna,
        cargo,
        sigla_partido,
        vr_despesa_max_campanha,
        ds_detalhe_situacao_cand,
        st_reeleicao
      FROM candidatos 
      ${whereClause}
      ORDER BY vr_despesa_max_campanha DESC
      LIMIT $${++paramCount}
    `;
    
    params.push(limite);
    
    const result = await db.query(query, params);
    
    res.json({
      data: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Erro ao buscar dados de despesas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/analise-complementar/demograficos - Análise demográfica
router.get('/demograficos', async (req, res) => {
  try {
    // Análise por gênero
    const genero = await db.query(`
      SELECT 
        ds_genero,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_genero IS NOT NULL
      GROUP BY ds_genero
      ORDER BY quantidade DESC
    `);
    
    // Análise por grau de instrução
    const instrucao = await db.query(`
      SELECT 
        ds_grau_instrucao,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_grau_instrucao IS NOT NULL
      GROUP BY ds_grau_instrucao
      ORDER BY quantidade DESC
    `);
    
    // Análise por cor/raça
    const corRaca = await db.query(`
      SELECT 
        ds_cor_raca,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_cor_raca IS NOT NULL
      GROUP BY ds_cor_raca
      ORDER BY quantidade DESC
    `);
    
    // Análise por ocupação
    const ocupacao = await db.query(`
      SELECT 
        ds_ocupacao,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_ocupacao IS NOT NULL
      GROUP BY ds_ocupacao
      ORDER BY quantidade DESC
      LIMIT 10
    `);
    
    // Análise por município de nascimento
    const municipioNascimento = await db.query(`
      SELECT 
        nm_municipio_nascimento,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE nm_municipio_nascimento IS NOT NULL
      GROUP BY nm_municipio_nascimento
      ORDER BY quantidade DESC
      LIMIT 15
    `);
    
    res.json({
      genero: genero.rows,
      instrucao: instrucao.rows,
      cor_raca: corRaca.rows,
      ocupacao: ocupacao.rows,
      municipio_nascimento: municipioNascimento.rows
    });
    
  } catch (error) {
    console.error('Erro ao buscar dados demográficos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/analise-complementar/situacoes - Análise detalhada de situações
router.get('/situacoes', async (req, res) => {
  try {
    // Situações por cargo
    const situacoesPorCargo = await db.query(`
      SELECT 
        cargo,
        ds_detalhe_situacao_cand,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_detalhe_situacao_cand IS NOT NULL
      GROUP BY cargo, ds_detalhe_situacao_cand
      ORDER BY cargo, quantidade DESC
    `);
    
    // Situações por partido
    const situacoesPorPartido = await db.query(`
      SELECT 
        sigla_partido,
        ds_detalhe_situacao_cand,
        COUNT(*) as quantidade
      FROM candidatos 
      WHERE ds_detalhe_situacao_cand IS NOT NULL 
      AND sigla_partido IS NOT NULL
      GROUP BY sigla_partido, ds_detalhe_situacao_cand
      ORDER BY sigla_partido, quantidade DESC
    `);
    
    // Evolução temporal (se houver dados de diferentes eleições)
    const evolucaoTemporal = await db.query(`
      SELECT 
        e.ano,
        ds_detalhe_situacao_cand,
        COUNT(*) as quantidade
      FROM candidatos c
      JOIN eleicoes e ON c.eleicao_id = e.id
      WHERE ds_detalhe_situacao_cand IS NOT NULL
      GROUP BY e.ano, ds_detalhe_situacao_cand
      ORDER BY e.ano, quantidade DESC
    `);
    
    res.json({
      por_cargo: situacoesPorCargo.rows,
      por_partido: situacoesPorPartido.rows,
      evolucao_temporal: evolucaoTemporal.rows
    });
    
  } catch (error) {
    console.error('Erro ao buscar dados de situações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
