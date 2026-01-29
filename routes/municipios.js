const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');

// Schema de validação para municípios
const municipioSchema = Joi.object({
  codigo: Joi.number().integer().required(),
  nome: Joi.string().max(100).required(),
  sigla_uf: Joi.string().length(2).required(),
  latitude: Joi.number().optional(),
  longitude: Joi.number().optional()
});

// GET /api/municipios - Listar municípios
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      uf, 
      nome, 
      com_coordenadas,
      ordenar_por = 'nome',
      ordem = 'ASC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Construir WHERE clause
    let whereConditions = [];
    let params = [];
    let paramCount = 0;
    
    if (uf) {
      whereConditions.push(`sigla_uf = $${++paramCount}`);
      params.push(uf.toUpperCase());
    }
    
    if (nome) {
      whereConditions.push(`nome ILIKE $${++paramCount}`);
      params.push(`%${nome}%`);
    }
    
    if (com_coordenadas === 'true') {
      whereConditions.push(`latitude IS NOT NULL AND longitude IS NOT NULL`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Validar ordenação
    const allowedOrderFields = ['nome', 'codigo', 'sigla_uf', 'latitude', 'longitude'];
    const orderField = allowedOrderFields.includes(ordenar_por) ? ordenar_por : 'nome';
    const orderDirection = ordem.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    // Query para contar total
    const countQuery = `SELECT COUNT(*) FROM municipios ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Query para buscar dados
    const dataQuery = `
      SELECT 
        m.*,
        e.nome as estado_nome,
        COUNT(v.id) as total_votos,
        SUM(v.quantidade_votos) as soma_votos
      FROM municipios m
      LEFT JOIN estados e ON m.sigla_uf = e.sigla
      LEFT JOIN votos v ON m.id = v.municipio_id
      ${whereClause}
      GROUP BY m.id, m.codigo, m.nome, m.sigla_uf, m.latitude, m.longitude, e.nome
      ORDER BY m.${orderField} ${orderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    
    params.push(limit, offset);
    const result = await db.query(dataQuery, params);
    
    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar municípios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/municipios/estatisticas - Estatísticas gerais
router.get('/estatisticas/gerais', async (req, res) => {
  try {
    const { uf } = req.query;
    
    let whereClause = '';
    let params = [];
    
    if (uf) {
      whereClause = 'WHERE sigla_uf = $1';
      params.push(uf.toUpperCase());
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_municipios,
        COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as municipios_com_coordenadas,
        COUNT(DISTINCT sigla_uf) as total_estados,
        AVG(CASE WHEN latitude IS NOT NULL THEN latitude END) as latitude_media,
        AVG(CASE WHEN longitude IS NOT NULL THEN longitude END) as longitude_media
      FROM municipios
      ${whereClause}
    `;
    
    const result = await db.query(query, params);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/municipios/busca - Busca indexada de municípios com candidatos
router.get('/busca', async (req, res) => {
  try {
    const { 
      q, // termo de busca
      eleicao_id,
      page = 1, 
      limit = 20
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Construir WHERE clause
    let whereConditions = [];
    let params = [];
    let paramCount = 0;
    
    // Busca por termo (nome do município)
    if (q && q.trim()) {
      whereConditions.push(`m.nome ILIKE $${++paramCount}`);
      params.push(`%${q.trim()}%`);
    }
    
    // Filtro por eleição
    if (eleicao_id) {
      whereConditions.push(`v.eleicao_id = $${++paramCount}`);
      params.push(eleicao_id);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query para contar total
    const countQuery = `
      SELECT COUNT(DISTINCT m.id)
      FROM municipios m
      LEFT JOIN votos v ON m.id = v.municipio_id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Query principal para buscar municípios com candidatos
    const dataQuery = `
      SELECT 
        m.id,
        m.codigo,
        m.nome,
        m.sigla_uf,
        m.latitude,
        m.longitude,
        COUNT(DISTINCT v.candidato_id) as total_candidatos,
        COALESCE(SUM(v.quantidade_votos), 0) as total_votos,
        COUNT(DISTINCT v.eleicao_id) as total_eleicoes,
        ARRAY_AGG(DISTINCT c.nome ORDER BY c.nome) FILTER (WHERE c.nome IS NOT NULL) as candidatos_nomes,
        ARRAY_AGG(DISTINCT c.cargo ORDER BY c.cargo) FILTER (WHERE c.cargo IS NOT NULL) as cargos,
        ARRAY_AGG(DISTINCT e.ano ORDER BY e.ano) FILTER (WHERE e.ano IS NOT NULL) as anos_eleicoes
      FROM municipios m
      LEFT JOIN votos v ON m.id = v.municipio_id
      LEFT JOIN candidatos c ON v.candidato_id = c.id
      LEFT JOIN eleicoes e ON v.eleicao_id = e.id
      ${whereClause}
      GROUP BY m.id, m.codigo, m.nome, m.sigla_uf, m.latitude, m.longitude
      ORDER BY m.nome ASC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    
    params.push(limit, offset);
    const result = await db.query(dataQuery, params);
    
    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar municípios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/municipios/:id - Buscar município específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        m.*,
        e.nome as estado_nome,
        COUNT(v.id) as total_registros_votos,
        SUM(v.quantidade_votos) as total_votos,
        COUNT(DISTINCT v.eleicao_id) as eleicoes_participou,
        COUNT(DISTINCT v.candidato_id) as candidatos_votados
      FROM municipios m
      LEFT JOIN estados e ON m.sigla_uf = e.sigla
      LEFT JOIN votos v ON m.id = v.municipio_id
      WHERE m.id = $1
      GROUP BY m.id, m.codigo, m.nome, m.sigla_uf, m.latitude, m.longitude, e.nome
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar município:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/municipios/:id/candidatos - Candidatos de um município específico
router.get('/:id/candidatos', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      eleicao_id,
      cargo,
      page = 1, 
      limit = 50,
      ordenar_por = 'quantidade_votos',
      ordem = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = ['v.municipio_id = $1'];
    let params = [id];
    let paramCount = 1;
    
    if (eleicao_id) {
      whereConditions.push(`v.eleicao_id = $${++paramCount}`);
      params.push(eleicao_id);
    }
    
    if (cargo) {
      whereConditions.push(`c.cargo = $${++paramCount}`);
      params.push(cargo);
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // Validar ordenação
    const allowedOrderFields = ['quantidade_votos', 'candidato_nome', 'cargo', 'numero'];
    const orderField = allowedOrderFields.includes(ordenar_por) ? ordenar_por : 'quantidade_votos';
    const orderDirection = ordem.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Mapear campos de ordenação para colunas SQL
    const orderFieldMap = {
      'quantidade_votos': 'total_votos',
      'candidato_nome': 'c.nome',
      'cargo': 'c.cargo',
      'numero': 'c.numero'
    };
    const sqlOrderField = orderFieldMap[orderField] || 'total_votos';
    
    // Query para contar total
    const countQuery = `
      SELECT COUNT(DISTINCT v.candidato_id)
      FROM votos v
      JOIN candidatos c ON v.candidato_id = c.id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Query para buscar candidatos (simplificada para debug)
    const dataQuery = `
      SELECT 
        c.id,
        c.nome as candidato_nome,
        c.numero,
        c.cargo,
        c.partido,
        c.situacao_candidatura,
        c.foto,
        SUM(v.quantidade_votos) as total_votos,
        e.ano as eleicao_ano
      FROM votos v
      JOIN candidatos c ON v.candidato_id = c.id
      JOIN eleicoes e ON v.eleicao_id = e.id
      ${whereClause}
      GROUP BY c.id, c.nome, c.numero, c.cargo, c.partido, c.situacao_candidatura, c.foto, e.ano
      ORDER BY ${sqlOrderField} ${orderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    
    params.push(limit, offset);
    const result = await db.query(dataQuery, params);
    
    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar candidatos do município:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/municipios - Criar município
router.post('/', async (req, res) => {
  try {
    const { error, value } = municipioSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.details 
      });
    }
    
    const { codigo, nome, sigla_uf, latitude, longitude } = value;
    
    const result = await db.query(`
      INSERT INTO municipios (codigo, nome, sigla_uf, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [codigo, nome, sigla_uf.toUpperCase(), latitude, longitude]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Município com este código já existe' });
    }
    console.error('Erro ao criar município:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/municipios/:id - Atualizar município
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = municipioSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.details 
      });
    }
    
    const { codigo, nome, sigla_uf, latitude, longitude } = value;
    
    const result = await db.query(`
      UPDATE municipios 
      SET codigo = $1, nome = $2, sigla_uf = $3, latitude = $4, longitude = $5
      WHERE id = $6
      RETURNING *
    `, [codigo, nome, sigla_uf.toUpperCase(), latitude, longitude, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar município:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/municipios/:id - Deletar município
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se há votos associados
    const votosResult = await db.query('SELECT COUNT(*) FROM votos WHERE municipio_id = $1', [id]);
    const totalVotos = parseInt(votosResult.rows[0].count);
    
    if (totalVotos > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar município com votos associados',
        totalVotos 
      });
    }
    
    const result = await db.query('DELETE FROM municipios WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }
    
    res.json({ message: 'Município deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar município:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/municipios/:id/votos - Votos do município
router.get('/:id/votos', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      eleicao_id,
      candidato_id,
      ordenar_por = 'quantidade_votos',
      ordem = 'DESC'
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = ['v.municipio_id = $1'];
    let params = [id];
    let paramCount = 1;
    
    if (eleicao_id) {
      whereConditions.push(`v.eleicao_id = $${++paramCount}`);
      params.push(eleicao_id);
    }
    
    if (candidato_id) {
      whereConditions.push(`v.candidato_id = $${++paramCount}`);
      params.push(candidato_id);
    }
    
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    
    // Validar ordenação
    const allowedOrderFields = ['quantidade_votos', 'candidato', 'eleicao', 'zona', 'secao'];
    const orderField = allowedOrderFields.includes(ordenar_por) ? ordenar_por : 'quantidade_votos';
    const orderDirection = ordem.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) 
      FROM votos v
      JOIN candidatos c ON v.candidato_id = c.id
      JOIN eleicoes e ON v.eleicao_id = e.id
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Query para buscar dados
    const dataQuery = `
      SELECT 
        v.*,
        c.nome as candidato_nome,
        c.cargo,
        c.numero as candidato_numero,
        e.ano as eleicao_ano,
        e.tipo as eleicao_tipo,
        e.turno as eleicao_turno
      FROM votos v
      JOIN candidatos c ON v.candidato_id = c.id
      JOIN eleicoes e ON v.eleicao_id = e.id
      ${whereClause}
      ORDER BY v.${orderField} ${orderDirection}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    
    params.push(limit, offset);
    const result = await db.query(dataQuery, params);
    
    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar votos do município:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
