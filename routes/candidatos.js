const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/candidatos/cargos - Buscar todos os cargos disponíveis
router.get('/cargos', async (req, res) => {
  try {
    const cargosQuery = `
      SELECT DISTINCT cargo
      FROM candidatos
      WHERE cargo IS NOT NULL AND cargo != ''
      ORDER BY cargo ASC
    `;

    const result = await db.query(cargosQuery);

    res.json({
      cargos: result.rows.map(row => ({ cargo: row.cargo }))
    });
  } catch (error) {
    console.error('Erro ao buscar cargos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/candidatos/busca - Buscar candidatos por nome com sugestões
router.get('/busca', async (req, res) => {
  try {
    const { q, limite = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ candidatos: [] });
    }

    const buscaQuery = `
      SELECT DISTINCT 
        c.id,
        c.nome,
        c.cargo,
        c.numero,
        c.partido
      FROM candidatos c
      WHERE c.nome ILIKE $1
      ORDER BY c.nome ASC
      LIMIT $2
    `;

    const result = await db.query(buscaQuery, [`%${q}%`, limite]);

    res.json({
      candidatos: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar candidatos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/candidatos/:id - Buscar dados completos de um candidato
router.get('/:id', async (req, res) => {
  try {
    const candidatoId = req.params.id;

    if (!candidatoId || isNaN(candidatoId)) {
      return res.status(400).json({ error: 'ID do candidato inválido' });
    }

    // Buscar dados completos do candidato incluindo dados complementares e redes sociais
    const candidatoQuery = `
      SELECT 
        c.*,
        e.ano as eleicao_ano,
        e.tipo as eleicao_tipo,
        e.descricao as eleicao_descricao,
        e.turno as eleicao_turno,
        e.data_eleicao as eleicao_data
      FROM candidatos c
      JOIN eleicoes e ON c.eleicao_id = e.id
      WHERE c.id = $1
    `;

    const candidatoResult = await db.query(candidatoQuery, [candidatoId]);

    if (candidatoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }

    const candidato = candidatoResult.rows[0];

    // Buscar estatísticas de votos do candidato
    const statsQuery = `
      SELECT 
        SUM(v.quantidade_votos) as total_votos,
        COUNT(DISTINCT v.municipio_id) as total_municipios,
        COUNT(DISTINCT v.zona) as total_zonas,
        COUNT(DISTINCT v.secao) as total_secoes,
        AVG(v.quantidade_votos) as media_votos_por_secao
      FROM votos v
      WHERE v.candidato_id = $1
    `;

    const statsResult = await db.query(statsQuery, [candidatoId]);
    const stats = statsResult.rows[0];

    // Buscar redes sociais do candidato
    const redesSociaisQuery = `
      SELECT 
        tipo_rede_social,
        plataforma,
        url,
        ordem
      FROM candidatos_redes_sociais
      WHERE candidato_id = $1
      ORDER BY ordem, tipo_rede_social
    `;

    const redesResult = await db.query(redesSociaisQuery, [candidatoId]);

    // Combinar dados do candidato com estatísticas e redes sociais
    const candidatoCompleto = {
      ...candidato,
      total_votos: parseInt(stats.total_votos || 0),
      total_municipios: parseInt(stats.total_municipios || 0),
      total_zonas: parseInt(stats.total_zonas || 0),
      total_secoes: parseInt(stats.total_secoes || 0),
      media_votos_por_secao: parseFloat(stats.media_votos_por_secao || 0),
      redes_sociais: redesResult.rows
    };

    res.json(candidatoCompleto);
  } catch (error) {
    console.error('Erro ao buscar candidato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/candidatos - Listar candidatos com filtros
router.get('/', async (req, res) => {
  try {
    const {
      eleicao_id,
      partido,
      cargo,
      nome,
      limite = 50,
      pagina = 1
    } = req.query;

    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (eleicao_id) {
      whereConditions.push(`c.eleicao_id = $${++paramCount}`);
      params.push(eleicao_id);
    }

    if (partido) {
      whereConditions.push(`(c.sigla_partido ILIKE $${++paramCount} OR c.nome_partido ILIKE $${++paramCount})`);
      params.push(`%${partido}%`);
      params.push(`%${partido}%`);
    }

    if (cargo) {
      whereConditions.push(`c.cargo ILIKE $${++paramCount}`);
      params.push(`%${cargo}%`);
    }

    if (nome) {
      whereConditions.push(`c.nome ILIKE $${++paramCount}`);
      params.push(`%${nome}%`);
    }

    // Excluir VOTO BRANCO e VOTO NULO
    whereConditions.push(`c.nome NOT ILIKE '%VOTO BRANCO%'`);
    whereConditions.push(`c.nome NOT ILIKE '%VOTO NULO%'`);

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const offset = (pagina - 1) * limite;

    const query = `
      SELECT 
        c.id,
        c.nome,
        c.nome_urna,
        c.cargo,
        c.numero,
        c.partido,
        c.sigla_partido,
        c.nome_partido,
        c.descricao_situacao_candidatura,
        c.foto,
        e.ano as eleicao_ano,
        SUM(v.quantidade_votos) as total_votos
      FROM candidatos c
      JOIN eleicoes e ON c.eleicao_id = e.id
      LEFT JOIN votos v ON c.id = v.candidato_id
      ${whereClause}
      GROUP BY c.id, c.nome, c.nome_urna, c.cargo, c.numero, c.partido, c.sigla_partido, c.nome_partido, c.descricao_situacao_candidatura, c.foto, e.ano
      ORDER BY total_votos DESC NULLS LAST, c.nome
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    params.push(limite);
    params.push(offset);

    const result = await db.query(query, params);

    // Contar total para paginação
    const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      FROM candidatos c
      JOIN eleicoes e ON c.eleicao_id = e.id
      ${whereClause}
    `;

    const countResult = await db.query(countQuery, params.slice(0, -2)); // Remove limite e offset
    const total = parseInt(countResult.rows[0].total);

    res.json({
      data: result.rows,
      pagination: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite)
      }
    });
  } catch (error) {
    console.error('Erro ao listar candidatos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/candidatos/:id/votos - Buscar votos detalhados do candidato
router.get('/:id/votos', async (req, res) => {
  try {
    const candidatoId = req.params.id;
    const {
      limite = 100,
      pagina = 1,
      ordenar_por = 'votos',
      ordem = 'DESC'
    } = req.query;

    if (!candidatoId || isNaN(candidatoId)) {
      return res.status(400).json({ error: 'ID do candidato inválido' });
    }

    const offset = (pagina - 1) * limite;

    // Validar ordenação
    const allowedOrderFields = ['votos', 'municipio', 'zona', 'secao'];
    const orderField = allowedOrderFields.includes(ordenar_por) ? ordenar_por : 'votos';
    const orderDirection = ordem.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Mapear campo de ordenação
    const orderFieldMap = {
      'votos': 'v.quantidade_votos',
      'municipio': 'm.nome',
      'zona': 'v.zona',
      'secao': 'v.secao'
    };

    const realOrderField = orderFieldMap[orderField] || 'v.quantidade_votos';

    const query = `
      SELECT 
        m.nome as municipio,
        m.sigla_uf,
        v.zona,
        v.secao,
        v.local_votacao,
        v.endereco_local,
        v.quantidade_votos as votos
      FROM votos v
      JOIN municipios m ON v.municipio_id = m.id
      WHERE v.candidato_id = $1
      ORDER BY ${realOrderField} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [candidatoId, limite, offset]);

    // Contar total para paginação
    const countResult = await db.query(`
      SELECT COUNT(*) FROM votos v WHERE v.candidato_id = $1
    `, [candidatoId]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar votos do candidato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/candidatos/:id/rankings - Ranking de cidades do candidato
router.get('/:id/rankings', async (req, res) => {
  try {
    const candidatoId = req.params.id;

    // Buscar ano da eleição do candidato
    const candQuery = await db.query('SELECT eleicao_id FROM candidatos WHERE id = $1', [candidatoId]);
    if (candQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Candidato não encontrado' });
    }

    // Buscar ano da eleição para cruzar com perfil do eleitorado
    const eleicaoQuery = await db.query('SELECT ano FROM eleicoes WHERE id = $1', [candQuery.rows[0].eleicao_id]);
    const anoEleicao = eleicaoQuery.rows[0]?.ano;

    // 1. Top 20 cidades por votos absolutos
    const topVotosQuery = `
      SELECT 
        m.nome,
        m.sigla_uf, 
        SUM(v.quantidade_votos) as total_votos
      FROM votos v 
      JOIN municipios m ON v.municipio_id = m.id
      WHERE v.candidato_id = $1
      GROUP BY m.id, m.nome, m.sigla_uf
      ORDER BY total_votos DESC 
      LIMIT 20
    `;
    const topVotosResult = await db.query(topVotosQuery, [candidatoId]);

    // 2. Top 20 cidades por percentual de eleitores (votos / eleitorado)
    let topProporcionalResult = { rows: [] };

    if (anoEleicao) {
      const topProporcionalQuery = `
        WITH eleitorado AS (
            SELECT cd_municipio, SUM(qt_eleitores_perfil) as total_eleitores
            FROM perfil_eleitor_secao
            WHERE ano_eleicao = $2
            GROUP BY cd_municipio
        ),
        votos_cand AS (
            SELECT m.codigo, m.nome, m.sigla_uf, SUM(v.quantidade_votos) as total_votos
            FROM votos v JOIN municipios m ON v.municipio_id = m.id
            WHERE v.candidato_id = $1
            GROUP BY m.codigo, m.nome, m.sigla_uf
        )
        SELECT 
          v.nome, 
          v.sigla_uf,
          v.total_votos, 
          e.total_eleitores,
          (v.total_votos::float / NULLIF(e.total_eleitores, 0)) * 100 as percentual
        FROM votos_cand v
        JOIN eleitorado e ON v.codigo = e.cd_municipio
        WHERE e.total_eleitores > 0
        ORDER BY percentual DESC 
        LIMIT 20
      `;
      topProporcionalResult = await db.query(topProporcionalQuery, [candidatoId, anoEleicao]);
    }

    res.json({
      topVotos: topVotosResult.rows,
      topProporcional: topProporcionalResult.rows
    });

  } catch (error) {
    console.error('Erro ao buscar rankings do candidato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
