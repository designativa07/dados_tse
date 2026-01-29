const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');

// Cache simples para eleições
let cacheEleicoes = null;
let cacheTimestamp = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// Schema de validação para eleições
const eleicaoSchema = Joi.object({
  ano: Joi.number().integer().min(1990).max(2030).required(),
  tipo: Joi.string().max(100).required(),
  descricao: Joi.string().max(255).optional(),
  turno: Joi.number().integer().min(1).max(2).optional(),
  data_eleicao: Joi.date().optional(),
  data_geracao: Joi.date().optional()
});

// GET /api/eleicoes/dropdown - Listar eleições para dropdown (otimizado)
router.get('/dropdown', async (req, res) => {
  try {
    // Verificar cache
    const now = Date.now();
    if (cacheEleicoes && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('📦 Retornando eleições do cache');
      return res.json({
        success: true,
        data: cacheEleicoes,
        total: cacheEleicoes.length,
        cached: true
      });
    }

    console.log('🔄 Buscando eleições no banco de dados...');
    
    // Query otimizada - apenas dados essenciais para o dropdown
    const result = await db.query(`
      SELECT 
        id,
        ano,
        tipo,
        descricao,
        turno
      FROM eleicoes
      ORDER BY ano DESC, turno ASC
    `);
    
    // Atualizar cache
    cacheEleicoes = result.rows;
    cacheTimestamp = now;
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      cached: false
    });
  } catch (error) {
    console.error('Erro ao buscar eleições para dropdown:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/eleicoes - Listar todas as eleições (com estatísticas)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, ano, tipo } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    let params = [];
    let paramCount = 0;
    
    if (ano) {
      whereClause += ` WHERE ano = $${++paramCount}`;
      params.push(ano);
    }
    
    if (tipo) {
      whereClause += whereClause ? ` AND tipo ILIKE $${++paramCount}` : ` WHERE tipo ILIKE $${++paramCount}`;
      params.push(`%${tipo}%`);
    }
    
    // Query para contar total
    const countQuery = `SELECT COUNT(*) FROM eleicoes${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Query para buscar dados
    const dataQuery = `
      SELECT 
        e.*,
        COUNT(v.id) as total_votos,
        COUNT(DISTINCT v.municipio_id) as municipios_envolvidos,
        COUNT(DISTINCT v.candidato_id) as candidatos
      FROM eleicoes e
      LEFT JOIN votos v ON e.id = v.eleicao_id
      ${whereClause}
      GROUP BY e.id
      ORDER BY e.ano DESC, e.turno ASC
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
    console.error('Erro ao buscar eleições:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/eleicoes/clear-cache - Limpar cache das eleições
router.post('/clear-cache', (req, res) => {
  cacheEleicoes = null;
  cacheTimestamp = null;
  console.log('🗑️ Cache das eleições limpo');
  res.json({
    success: true,
    message: 'Cache limpo com sucesso'
  });
});

// GET /api/eleicoes/:id - Buscar eleição específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        e.*,
        COUNT(v.id) as total_votos,
        COUNT(DISTINCT v.municipio_id) as municipios_envolvidos,
        COUNT(DISTINCT v.candidato_id) as candidatos
      FROM eleicoes e
      LEFT JOIN votos v ON e.id = v.eleicao_id
      WHERE e.id = $1
      GROUP BY e.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Eleição não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar eleição:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/eleicoes - Criar nova eleição
router.post('/', async (req, res) => {
  try {
    const { error, value } = eleicaoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.details 
      });
    }
    
    const { ano, tipo, descricao, turno, data_eleicao, data_geracao } = value;
    
    const result = await db.query(`
      INSERT INTO eleicoes (ano, tipo, descricao, turno, data_eleicao, data_geracao)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [ano, tipo, descricao, turno, data_eleicao, data_geracao]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar eleição:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/eleicoes/:id - Atualizar eleição
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = eleicaoSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.details 
      });
    }
    
    const { ano, tipo, descricao, turno, data_eleicao, data_geracao } = value;
    
    const result = await db.query(`
      UPDATE eleicoes 
      SET ano = $1, tipo = $2, descricao = $3, turno = $4, 
          data_eleicao = $5, data_geracao = $6
      WHERE id = $7
      RETURNING *
    `, [ano, tipo, descricao, turno, data_eleicao, data_geracao, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Eleição não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar eleição:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/eleicoes/:id - Deletar eleição
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar se há votos associados
    const votosResult = await db.query('SELECT COUNT(*) FROM votos WHERE eleicao_id = $1', [id]);
    const totalVotos = parseInt(votosResult.rows[0].count);
    
    if (totalVotos > 0) {
      return res.status(400).json({ 
        error: 'Não é possível deletar eleição com votos associados',
        totalVotos 
      });
    }
    
    const result = await db.query('DELETE FROM eleicoes WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Eleição não encontrada' });
    }
    
    res.json({ message: 'Eleição deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar eleição:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/eleicoes/:id/estatisticas - Estatísticas da eleição
router.get('/:id/estatisticas', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        e.ano,
        e.tipo,
        e.descricao,
        COUNT(DISTINCT v.municipio_id) as total_municipios,
        COUNT(DISTINCT v.candidato_id) as total_candidatos,
        SUM(v.quantidade_votos) as total_votos,
        AVG(v.quantidade_votos) as media_votos_por_secao,
        MAX(v.quantidade_votos) as maior_quantidade_votos,
        MIN(v.quantidade_votos) as menor_quantidade_votos
      FROM eleicoes e
      LEFT JOIN votos v ON e.id = v.eleicao_id
      WHERE e.id = $1
      GROUP BY e.id, e.ano, e.tipo, e.descricao
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Eleição não encontrada' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
