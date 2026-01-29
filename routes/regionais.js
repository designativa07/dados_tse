const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Cache simples para regionais PSDB
let cacheRegionais = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// GET /api/regionais/mesorregioes - Listar todas as mesorregiões
router.get('/mesorregioes', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        m.id,
        m.nome,
        COUNT(mr.id) as total_municipios,
        SUM(mr.populacao_2024) as populacao_total,
        SUM(mr.eleitores_2024) as eleitores_total
      FROM mesorregioes m
      LEFT JOIN municipios_regionais mr ON m.id = mr.mesorregiao_id
      GROUP BY m.id, m.nome
      ORDER BY m.nome
    `);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar mesorregiões:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/regionais/regionais-psdb - Listar todas as regionais PSDB (otimizado com cache)
router.get('/regionais-psdb', async (req, res) => {
  try {
    // Verificar cache
    const now = Date.now();
    if (cacheRegionais && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('📦 Retornando regionais do cache');
      return res.json({
        success: true,
        data: cacheRegionais,
        total: cacheRegionais.length,
        cached: true
      });
    }

    console.log('🔄 Buscando regionais no banco de dados...');
    
    // Query otimizada - apenas dados essenciais para o dropdown
    const result = await db.query(`
      SELECT 
        r.id,
        r.nome,
        m.nome as mesorregiao
      FROM regionais_psdb r
      INNER JOIN mesorregioes m ON r.mesorregiao_id = m.id
      ORDER BY r.nome
    `);
    
    // Atualizar cache
    cacheRegionais = result.rows;
    cacheTimestamp = now;
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      cached: false
    });
  } catch (error) {
    console.error('Erro ao buscar regionais PSDB:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/regionais/regionais-psdb/detalhes - Listar regionais com estatísticas (para análises)
router.get('/regionais-psdb/detalhes', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.id,
        r.nome,
        m.nome as mesorregiao,
        COUNT(DISTINCT mr.id) as total_municipios,
        SUM(DISTINCT mr.filiados_psdb_2024) as total_filiados,
        SUM(DISTINCT mr.populacao_2024) as populacao_total,
        SUM(DISTINCT mr.eleitores_2024) as eleitores_total,
        COUNT(DISTINCT CASE WHEN v.quantidade_votos > 0 THEN c.id END) as candidatos_com_votos,
        COALESCE(SUM(v.quantidade_votos), 0) as total_votos
      FROM regionais_psdb r
      LEFT JOIN mesorregioes m ON r.mesorregiao_id = m.id
      LEFT JOIN municipios_regionais mr ON r.id = mr.regional_psdb_id
      LEFT JOIN municipios mun ON mr.nome = mun.nome
      LEFT JOIN votos v ON mun.id = v.municipio_id
      LEFT JOIN candidatos c ON v.candidato_id = c.id
      GROUP BY r.id, r.nome, m.nome
      ORDER BY total_votos DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes das regionais PSDB:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// POST /api/regionais/clear-cache - Limpar cache das regionais
router.post('/clear-cache', (req, res) => {
  cacheRegionais = null;
  cacheTimestamp = null;
  console.log('🗑️ Cache das regionais limpo');
  res.json({
    success: true,
    message: 'Cache limpo com sucesso'
  });
});

// GET /api/regionais/municipios - Listar municípios por região
router.get('/municipios', async (req, res) => {
  try {
    const { mesorregiao_id, regional_id, search } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (mesorregiao_id) {
      paramCount++;
      whereClause += ` AND mr.mesorregiao_id = $${paramCount}`;
      params.push(mesorregiao_id);
    }
    
    if (regional_id) {
      paramCount++;
      whereClause += ` AND mr.regional_psdb_id = $${paramCount}`;
      params.push(regional_id);
    }
    
    if (search) {
      paramCount++;
      whereClause += ` AND mr.nome ILIKE $${paramCount}`;
      params.push(`%${search}%`);
    }
    
    const result = await db.query(`
      SELECT 
        mr.id,
        mr.nome,
        m.nome as mesorregiao,
        r.nome as regional_psdb,
        mr.filiados_psdb_2024,
        mr.populacao_2024,
        mr.eleitores_2024
      FROM municipios_regionais mr
      LEFT JOIN mesorregioes m ON mr.mesorregiao_id = m.id
      LEFT JOIN regionais_psdb r ON mr.regional_psdb_id = r.id
      ${whereClause}
      ORDER BY mr.nome
      LIMIT 100
    `, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar municípios:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/regionais/votos-por-mesorregiao/:candidato_id - Votos de um candidato por mesorregião
router.get('/votos-por-mesorregiao/:candidato_id', async (req, res) => {
  try {
    const { candidato_id } = req.params;
    
    // Primeiro, buscar dados do candidato
    const candidatoResult = await db.query(`
      SELECT c.nome, c.cargo, c.sigla_partido
      FROM candidatos c
      WHERE c.id = $1
    `, [candidato_id]);
    
    if (candidatoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidato não encontrado'
      });
    }
    
    const candidato = candidatoResult.rows[0];
    
    // Buscar votos por mesorregião
    const votosResult = await db.query(`
      SELECT 
        m.id as mesorregiao_id,
        m.nome as mesorregiao,
        COALESCE(SUM(v.quantidade_votos), 0) as total_votos,
        COUNT(DISTINCT v.municipio_id) as municipios_com_votos,
        COUNT(DISTINCT mr.id) as total_municipios_regiao,
        ROUND(
          CASE 
            WHEN COUNT(DISTINCT mr.id) > 0 
            THEN (COUNT(DISTINCT v.municipio_id)::DECIMAL / COUNT(DISTINCT mr.id)) * 100 
            ELSE 0 
          END, 2
        ) as percentual_municipios_atendidos
      FROM mesorregioes m
      LEFT JOIN municipios_regionais mr ON m.id = mr.mesorregiao_id
      LEFT JOIN municipios mun ON mr.nome = mun.nome
      LEFT JOIN votos v ON mun.id = v.municipio_id AND v.candidato_id = $1
      GROUP BY m.id, m.nome
      ORDER BY total_votos DESC
    `, [candidato_id]);
    
    res.json({
      success: true,
      candidato: candidato,
      data: votosResult.rows,
      total: votosResult.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar votos por mesorregião:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/regionais/votos-por-regional/:candidato_id - Votos de um candidato por regional PSDB
router.get('/votos-por-regional/:candidato_id', async (req, res) => {
  try {
    const { candidato_id } = req.params;
    
    // Primeiro, buscar dados do candidato
    const candidatoResult = await db.query(`
      SELECT c.nome, c.cargo, c.sigla_partido
      FROM candidatos c
      WHERE c.id = $1
    `, [candidato_id]);
    
    if (candidatoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidato não encontrado'
      });
    }
    
    const candidato = candidatoResult.rows[0];
    
    // Buscar votos por regional PSDB
    const votosResult = await db.query(`
      SELECT 
        r.id as regional_id,
        r.nome as regional_psdb,
        m.nome as mesorregiao,
        COALESCE(SUM(v.quantidade_votos), 0) as total_votos,
        COUNT(DISTINCT v.municipio_id) as municipios_com_votos,
        COUNT(DISTINCT mr.id) as total_municipios_regional,
        ROUND(
          CASE 
            WHEN COUNT(DISTINCT mr.id) > 0 
            THEN (COUNT(DISTINCT v.municipio_id)::DECIMAL / COUNT(DISTINCT mr.id)) * 100 
            ELSE 0 
          END, 2
        ) as percentual_municipios_atendidos
      FROM regionais_psdb r
      LEFT JOIN mesorregioes m ON r.mesorregiao_id = m.id
      LEFT JOIN municipios_regionais mr ON r.id = mr.regional_psdb_id
      LEFT JOIN votos v ON mr.id = v.municipio_id AND v.candidato_id = $1
      GROUP BY r.id, r.nome, m.nome
      ORDER BY total_votos DESC
    `, [candidato_id]);
    
    res.json({
      success: true,
      candidato: candidato,
      data: votosResult.rows,
      total: votosResult.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar votos por regional:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/regionais/candidatos-por-regiao - Candidatos com votos em uma região específica
router.get('/candidatos-por-regiao', async (req, res) => {
  try {
    const { mesorregiao_id, regional_id, cargo, partido } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (mesorregiao_id) {
      paramCount++;
      whereClause += ` AND mr.mesorregiao_id = $${paramCount}`;
      params.push(mesorregiao_id);
    }
    
    if (regional_id) {
      paramCount++;
      whereClause += ` AND mr.regional_psdb_id = $${paramCount}`;
      params.push(regional_id);
    }
    
    if (cargo) {
      paramCount++;
      whereClause += ` AND c.cargo = $${paramCount}`;
      params.push(cargo);
    }
    
    if (partido) {
      paramCount++;
      whereClause += ` AND c.sigla_partido = $${paramCount}`;
      params.push(partido);
    }
    
    const result = await db.query(`
      SELECT 
        c.id,
        c.nome,
        c.cargo,
        c.sigla_partido,
        COALESCE(SUM(v.quantidade_votos), 0) as total_votos,
        COUNT(DISTINCT v.municipio_id) as municipios_com_votos,
        m.nome as mesorregiao,
        r.nome as regional_psdb
      FROM candidatos c
      LEFT JOIN votos v ON c.id = v.candidato_id
      LEFT JOIN municipios_regionais mr ON v.municipio_id = mr.id
      LEFT JOIN mesorregioes m ON mr.mesorregiao_id = m.id
      LEFT JOIN regionais_psdb r ON mr.regional_psdb_id = r.id
      ${whereClause}
      GROUP BY c.id, c.nome, c.cargo, c.sigla_partido, m.nome, r.nome
      HAVING COALESCE(SUM(v.quantidade_votos), 0) > 0
      ORDER BY total_votos DESC
      LIMIT 50
    `, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar candidatos por região:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/regionais/candidatos-por-regional/:regional_id - Candidatos com votos em uma regional específica
router.get('/candidatos-por-regional/:regional_id', async (req, res) => {
  try {
    const { regional_id } = req.params;
    const { eleicao_id, cargo } = req.query;
    
    // Buscar dados da regional
    const regionalResult = await db.query(`
      SELECT 
        r.id,
        r.nome as regional,
        m.nome as mesorregiao,
        COUNT(DISTINCT mr.id) as total_municipios,
        SUM(mr.filiados_psdb_2024) as total_filiados,
        SUM(mr.populacao_2024) as populacao_total,
        SUM(mr.eleitores_2024) as eleitores_total
      FROM regionais_psdb r
      LEFT JOIN mesorregioes m ON r.mesorregiao_id = m.id
      LEFT JOIN municipios_regionais mr ON r.id = mr.regional_psdb_id
      WHERE r.id = $1
      GROUP BY r.id, r.nome, m.nome
    `, [regional_id]);
    
    if (regionalResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Regional não encontrada'
      });
    }
    
    const regional = regionalResult.rows[0];
    
    // Buscar municípios da regional
    const municipiosResult = await db.query(`
      SELECT 
        mr.id,
        mr.nome as municipio,
        mr.filiados_psdb_2024,
        mr.populacao_2024,
        mr.eleitores_2024
      FROM municipios_regionais mr
      WHERE mr.regional_psdb_id = $1
      ORDER BY mr.nome
    `, [regional_id]);
    
    // Buscar candidatos com votos na regional
    let candidatosQuery = `
      SELECT 
        c.id,
        c.nome,
        c.cargo,
        c.sigla_partido,
        COALESCE(SUM(v.quantidade_votos), 0) as total_votos,
        COUNT(DISTINCT v.municipio_id) as municipios_com_votos,
        ROUND(
          CASE 
            WHEN $2 > 0 
            THEN (COUNT(DISTINCT v.municipio_id)::DECIMAL / $2) * 100 
            ELSE 0 
          END, 2
        ) as percentual_municipios_atendidos
      FROM candidatos c
      LEFT JOIN votos v ON c.id = v.candidato_id
      LEFT JOIN municipios_regionais mr ON v.municipio_id = mr.id AND mr.regional_psdb_id = $1
      WHERE 1=1
    `;
    
    const params = [regional_id, regional.total_municipios];
    
    if (eleicao_id) {
      candidatosQuery += ` AND c.eleicao_id = $${params.length + 1}`;
      params.push(eleicao_id);
    }
    
    if (cargo) {
      candidatosQuery += ` AND c.cargo = $${params.length + 1}`;
      params.push(cargo);
    }
    
    candidatosQuery += `
      GROUP BY c.id, c.nome, c.cargo, c.sigla_partido
      HAVING COALESCE(SUM(v.quantidade_votos), 0) > 0
      ORDER BY total_votos DESC
    `;
    
    const candidatosResult = await db.query(candidatosQuery, params);
    
    // Estatísticas da regional
    const statsResult = await db.query(`
      SELECT 
        COUNT(DISTINCT c.id) as total_candidatos,
        COALESCE(SUM(v.quantidade_votos), 0) as total_votos,
        COUNT(DISTINCT v.municipio_id) as municipios_com_votos
      FROM candidatos c
      LEFT JOIN votos v ON c.id = v.candidato_id
      LEFT JOIN municipios_regionais mr ON v.municipio_id = mr.id AND mr.regional_psdb_id = $1
      WHERE 1=1 ${eleicao_id ? 'AND c.eleicao_id = $2' : ''}
    `, eleicao_id ? [regional_id, eleicao_id] : [regional_id]);
    
    // Contar candidatos que realmente receberam votos (com votos > 0)
    const candidatosComVotosResult = await db.query(`
      SELECT COUNT(DISTINCT c.id) as candidatos_com_votos
      FROM candidatos c
      INNER JOIN votos v ON c.id = v.candidato_id
      INNER JOIN municipios_regionais mr ON v.municipio_id = mr.id AND mr.regional_psdb_id = $1
      WHERE v.quantidade_votos > 0 ${eleicao_id ? 'AND c.eleicao_id = $2' : ''}
    `, eleicao_id ? [regional_id, eleicao_id] : [regional_id]);
    
    const stats = statsResult.rows[0];
    const candidatosComVotos = candidatosComVotosResult.rows[0].candidatos_com_votos;
    
    res.json({
      success: true,
      regional: regional,
      municipios: municipiosResult.rows,
      candidatos: candidatosResult.rows,
      estatisticas: {
        ...stats,
        candidatos_com_votos: candidatosComVotos
      },
      total: candidatosResult.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar candidatos por regional:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/regionais/estatisticas-gerais - Estatísticas gerais das regiões
router.get('/estatisticas-gerais', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM mesorregioes) as total_mesorregioes,
        (SELECT COUNT(*) FROM regionais_psdb) as total_regionais,
        (SELECT COUNT(*) FROM municipios_regionais) as total_municipios,
        (SELECT SUM(populacao_2024) FROM municipios_regionais) as populacao_total,
        (SELECT SUM(eleitores_2024) FROM municipios_regionais) as eleitores_total,
        (SELECT SUM(filiados_psdb_2024) FROM municipios_regionais) as filiados_psdb_total
    `);
    
    const mesorregioesStats = await db.query(`
      SELECT 
        m.nome as mesorregiao,
        COUNT(mr.id) as total_municipios,
        SUM(mr.populacao_2024) as populacao,
        SUM(mr.eleitores_2024) as eleitores,
        SUM(mr.filiados_psdb_2024) as filiados_psdb
      FROM mesorregioes m
      LEFT JOIN municipios_regionais mr ON m.id = mr.mesorregiao_id
      GROUP BY m.id, m.nome
      ORDER BY populacao DESC
    `);
    
    res.json({
      success: true,
      estatisticas_gerais: stats.rows[0],
      mesorregioes: mesorregioesStats.rows
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas gerais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/regionais/votos-por-municipio/:candidato_id/:mesorregiao_id - Votos de um candidato por município em uma mesorregião específica
router.get('/votos-por-municipio/:candidato_id/:mesorregiao_id', async (req, res) => {
  try {
    const { candidato_id, mesorregiao_id } = req.params;
    
    // Primeiro, buscar dados do candidato
    const candidatoResult = await db.query(`
      SELECT c.nome, c.cargo, c.sigla_partido
      FROM candidatos c
      WHERE c.id = $1
    `, [candidato_id]);
    
    if (candidatoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Candidato não encontrado'
      });
    }
    
    const candidato = candidatoResult.rows[0];
    
    // Buscar dados da mesorregião
    const mesorregiaoResult = await db.query(`
      SELECT nome FROM mesorregioes WHERE id = $1
    `, [mesorregiao_id]);
    
    if (mesorregiaoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Mesorregião não encontrada'
      });
    }
    
    const mesorregiao = mesorregiaoResult.rows[0];
    
    // Buscar votos por município na mesorregião
    const votosResult = await db.query(`
      SELECT 
        mr.id as municipio_id,
        mr.nome as municipio,
        COALESCE(SUM(v.quantidade_votos), 0) as total_votos,
        COUNT(DISTINCT v.municipio_id) as secoes_com_votos,
        mr.eleitores_2024,
        mr.populacao_2024,
        m.latitude,
        m.longitude,
        ROUND(
          CASE 
            WHEN mr.eleitores_2024 > 0 
            THEN (COALESCE(SUM(v.quantidade_votos), 0)::DECIMAL / mr.eleitores_2024) * 100 
            ELSE 0 
          END, 2
        ) as percentual_eleitores
      FROM municipios_regionais mr
      LEFT JOIN municipios m ON mr.nome = m.nome
      LEFT JOIN votos v ON m.id = v.municipio_id AND v.candidato_id = $1
      WHERE mr.mesorregiao_id = $2
      GROUP BY mr.id, mr.nome, mr.eleitores_2024, mr.populacao_2024, m.latitude, m.longitude
      HAVING COALESCE(SUM(v.quantidade_votos), 0) > 0
      ORDER BY total_votos DESC
    `, [candidato_id, mesorregiao_id]);
    
    res.json({
      success: true,
      candidato: candidato,
      mesorregiao: mesorregiao,
      data: votosResult.rows,
      total: votosResult.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar votos por município:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/regionais/estatisticas-todas-regionais - Estatísticas de todas as regionais
router.get('/estatisticas-todas-regionais', async (req, res) => {
  try {
    const { eleicao_id, cargo, mesorregiao_id } = req.query;
    
    // Construir parâmetros dinamicamente
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;
    
    if (eleicao_id) {
      paramCount++;
      whereClause += ` AND c.eleicao_id = $${paramCount}`;
      params.push(eleicao_id);
    }
    
    if (cargo) {
      paramCount++;
      whereClause += ` AND c.cargo = $${paramCount}`;
      params.push(cargo);
    }
    
    if (mesorregiao_id) {
      paramCount++;
      whereClause += ` AND m.id = $${paramCount}`;
      params.push(mesorregiao_id);
    }
    
    // Buscar estatísticas de todas as regionais
    const regionaisStats = await db.query(`
      SELECT 
        r.id,
        r.nome as regional,
        m.nome as mesorregiao,
        COUNT(DISTINCT mr.id) as total_municipios,
        SUM(DISTINCT mr.filiados_psdb_2024) as total_filiados,
        SUM(DISTINCT mr.populacao_2024) as populacao_total,
        SUM(DISTINCT mr.eleitores_2024) as eleitores_total,
        COUNT(DISTINCT CASE WHEN v.quantidade_votos > 0 THEN c.id END) as candidatos_com_votos,
        COALESCE(SUM(v.quantidade_votos), 0) as total_votos
      FROM regionais_psdb r
      LEFT JOIN mesorregioes m ON r.mesorregiao_id = m.id
      LEFT JOIN municipios_regionais mr ON r.id = mr.regional_psdb_id
      LEFT JOIN municipios mun ON mr.nome = mun.nome
      LEFT JOIN votos v ON mun.id = v.municipio_id
      LEFT JOIN candidatos c ON v.candidato_id = c.id
      ${whereClause}
      GROUP BY r.id, r.nome, m.nome
      ORDER BY total_votos DESC
    `, params);
    
    // Calcular totais gerais
    const totais = regionaisStats.rows.reduce((acc, regional) => {
      acc.total_municipios += parseInt(regional.total_municipios);
      acc.total_filiados += parseInt(regional.total_filiados);
      acc.populacao_total += parseInt(regional.populacao_total);
      acc.eleitores_total += parseInt(regional.eleitores_total);
      acc.total_candidatos_com_votos += parseInt(regional.candidatos_com_votos);
      acc.total_votos += parseInt(regional.total_votos);
      return acc;
    }, {
      total_municipios: 0,
      total_filiados: 0,
      populacao_total: 0,
      eleitores_total: 0,
      total_candidatos_com_votos: 0,
      total_votos: 0
    });
    
    res.json({
      success: true,
      data: regionaisStats.rows,
      regionais: regionaisStats.rows,
      totais: totais,
      total: regionaisStats.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas de todas as regionais:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/regionais/candidatos-municipio/:municipio_id - Candidatos que receberam votos em um município específico
router.get('/candidatos-municipio/:municipio_id', async (req, res) => {
  try {
    const { municipio_id } = req.params;
    
    // Buscar dados do município
    const municipioResult = await db.query(`
      SELECT 
        mr.id,
        mr.nome as municipio,
        mr.eleitores_2024,
        mr.populacao_2024,
        mr.filiados_psdb_2024,
        r.nome as regional_psdb,
        m.nome as mesorregiao
      FROM municipios_regionais mr
      LEFT JOIN regionais_psdb r ON mr.regional_psdb_id = r.id
      LEFT JOIN mesorregioes m ON mr.mesorregiao_id = m.id
      WHERE mr.id = $1
    `, [municipio_id]);
    
    if (municipioResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Município não encontrado'
      });
    }
    
    const municipio = municipioResult.rows[0];
    
    // Buscar candidatos que receberam votos no município
    // Primeiro, encontrar o ID correspondente na tabela municipios
    const municipioMapping = await db.query(`
      SELECT m.id as municipio_id
      FROM municipios m
      JOIN municipios_regionais mr ON m.nome = mr.nome
      WHERE mr.id = $1
    `, [municipio_id]);
    
    if (municipioMapping.rows.length === 0) {
      return res.json({
        success: true,
        municipio: municipio,
        candidatos: [],
        total: 0
      });
    }
    
    const municipioId = municipioMapping.rows[0].municipio_id;
    
    const candidatosResult = await db.query(`
      SELECT 
        c.id,
        c.nome,
        c.cargo,
        c.sigla_partido,
        SUM(v.quantidade_votos) as total_votos,
        ROUND(
          CASE 
            WHEN mr.eleitores_2024 > 0 
            THEN (SUM(v.quantidade_votos)::DECIMAL / mr.eleitores_2024) * 100 
            ELSE 0 
          END, 2
        ) as percentual_eleitores
      FROM candidatos c
      INNER JOIN votos v ON c.id = v.candidato_id
      INNER JOIN municipios_regionais mr ON mr.id = $1
      WHERE v.municipio_id = $2 AND v.quantidade_votos > 0
      GROUP BY c.id, c.nome, c.cargo, c.sigla_partido, mr.eleitores_2024
      ORDER BY total_votos DESC
    `, [municipio_id, municipioId]);
    
    // Calcular percentual de votos para cada candidato
    const totalVotos = candidatosResult.rows.reduce((sum, c) => sum + parseInt(c.total_votos), 0);
    const candidatos = candidatosResult.rows.map(candidato => ({
      ...candidato,
      percentual_votos: totalVotos > 0 ? ((parseInt(candidato.total_votos) / totalVotos) * 100).toFixed(1) : 0
    }));
    
    res.json({
      success: true,
      municipio: municipio,
      candidatos: candidatos,
      total: candidatos.length
    });
  } catch (error) {
    console.error('Erro ao buscar candidatos do município:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

module.exports = router;
