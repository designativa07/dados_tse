const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');

// Schema de validação para relatórios
const relatorioSchema = Joi.object({
  nome: Joi.string().max(255).required(),
  descricao: Joi.string().allow('').optional(),
  filtros: Joi.object().optional(),
  visualizacao: Joi.object().optional(),
  eleicao_id: Joi.number().integer().optional(),
  tipo: Joi.string().valid('tabela', 'grafico', 'mapa').optional(),
  colunas: Joi.array().items(Joi.string()).optional()
});

// GET /api/relatorios - Listar relatórios
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, eleicao_id, nome } = req.query;
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    let params = [];
    let paramCount = 0;
    
    if (eleicao_id) {
      whereConditions.push(`r.eleicao_id = $${++paramCount}`);
      params.push(eleicao_id);
    }
    
    if (nome) {
      whereConditions.push(`r.nome ILIKE $${++paramCount}`);
      params.push(`%${nome}%`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Query para contar total
    const countQuery = `SELECT COUNT(*) FROM relatorios r ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);
    
    // Query para buscar dados
    const dataQuery = `
      SELECT 
        r.*,
        e.ano as eleicao_ano,
        e.tipo as eleicao_tipo,
        e.descricao as eleicao_descricao
      FROM relatorios r
      LEFT JOIN eleicoes e ON r.eleicao_id = e.id
      ${whereClause}
      ORDER BY r.created_at DESC
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
    console.error('Erro ao buscar relatórios:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/relatorios/:id - Buscar relatório específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(`
      SELECT 
        r.*,
        e.ano as eleicao_ano,
        e.tipo as eleicao_tipo,
        e.descricao as eleicao_descricao
      FROM relatorios r
      LEFT JOIN eleicoes e ON r.eleicao_id = e.id
      WHERE r.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/relatorios - Criar relatório
router.post('/', async (req, res) => {
  try {
    const { error, value } = relatorioSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.details 
      });
    }
    
    const { nome, descricao, filtros, visualizacao, eleicao_id, tipo, colunas } = value;
    
    // Processar dados para salvar
    const filtrosData = filtros || {};
    const visualizacaoData = {
      tipo: tipo || 'tabela',
      colunas: colunas || [],
      ...visualizacao
    };
    
    const result = await db.query(`
      INSERT INTO relatorios (nome, descricao, filtros, visualizacao, eleicao_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [nome, descricao, JSON.stringify(filtrosData), JSON.stringify(visualizacaoData), eleicao_id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/relatorios/:id - Atualizar relatório
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error, value } = relatorioSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.details 
      });
    }
    
    const { nome, descricao, filtros, visualizacao, eleicao_id, tipo, colunas } = value;
    
    // Processar dados para salvar
    const filtrosData = filtros || {};
    const visualizacaoData = {
      tipo: tipo || 'tabela',
      colunas: colunas || [],
      ...visualizacao
    };
    
    const result = await db.query(`
      UPDATE relatorios 
      SET nome = $1, descricao = $2, filtros = $3, visualizacao = $4, eleicao_id = $5
      WHERE id = $6
      RETURNING *
    `, [nome, descricao, JSON.stringify(filtrosData), JSON.stringify(visualizacaoData), eleicao_id, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/relatorios/:id - Deletar relatório
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query('DELETE FROM relatorios WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }
    
    res.json({ message: 'Relatório deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/relatorios/:id/executar - Executar relatório
router.get('/:id/executar', async (req, res) => {
  try {
    const { id } = req.params;
    const { formato = 'json' } = req.query;
    
    // Buscar relatório
    const relatorioResult = await db.query('SELECT * FROM relatorios WHERE id = $1', [id]);
    
    if (relatorioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }
    
    const relatorio = relatorioResult.rows[0];
    const filtros = relatorio.filtros || {};
    const visualizacao = relatorio.visualizacao || {};
    
    // Construir query baseada nos filtros
    let whereConditions = [];
    let params = [];
    let paramCount = 0;
    
    if (relatorio.eleicao_id) {
      whereConditions.push(`v.eleicao_id = $${++paramCount}`);
      params.push(relatorio.eleicao_id);
    }
    
    if (filtros.candidato_id) {
      whereConditions.push(`v.candidato_id = $${++paramCount}`);
      params.push(filtros.candidato_id);
    }
    
    if (filtros.municipio_id) {
      whereConditions.push(`v.municipio_id = $${++paramCount}`);
      params.push(filtros.municipio_id);
    }
    
    if (filtros.min_votos) {
      whereConditions.push(`v.quantidade_votos >= $${++paramCount}`);
      params.push(filtros.min_votos);
    }
    
    if (filtros.max_votos) {
      whereConditions.push(`v.quantidade_votos <= $${++paramCount}`);
      params.push(filtros.max_votos);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Determinar tipo de visualização
    const tipoVisualizacao = visualizacao.tipo || 'tabela';
    
    if (tipoVisualizacao === 'tabela') {
      const colunas = (visualizacao.colunas && visualizacao.colunas.length > 0) 
        ? visualizacao.colunas 
        : ['municipio', 'votos', 'candidato'];
      const ordenarPor = visualizacao.ordenar_por || 'votos';
      const ordem = visualizacao.ordem || 'DESC';
      const limite = visualizacao.limite || 100;
      
      // Mapear colunas
      const colunasMap = {
        'municipio': 'm.nome as municipio',
        'votos': 'v.quantidade_votos as votos',
        'candidato': 'c.nome as candidato',
        'cargo': 'c.cargo',
        'numero': 'c.numero as candidato_numero',
        'zona': 'v.zona',
        'secao': 'v.secao',
        'local': 'v.local_votacao as local_votacao',
        'endereco': 'v.endereco_local as endereco',
        'eleicao': 'e.ano as eleicao_ano',
        'tipo': 'e.tipo as eleicao_tipo',
        'turno': 'e.turno as eleicao_turno'
      };
      
      // Mapear campos para ordenação
      const ordenacaoMap = {
        'votos': 'v.quantidade_votos',
        'municipio': 'm.nome',
        'candidato': 'c.nome',
        'cargo': 'c.cargo',
        'numero': 'c.numero',
        'zona': 'v.zona',
        'secao': 'v.secao',
        'eleicao': 'e.ano',
        'tipo': 'e.tipo',
        'turno': 'e.turno'
      };
      
      const selectFields = colunas.map(col => colunasMap[col] || col).join(', ');
      const orderField = ordenacaoMap[ordenarPor] || 'v.quantidade_votos';
      
      const query = `
        SELECT 
          ${selectFields}
        FROM votos v
        JOIN municipios m ON v.municipio_id = m.id
        JOIN candidatos c ON v.candidato_id = c.id
        JOIN eleicoes e ON v.eleicao_id = e.id
        ${whereClause}
        ORDER BY ${orderField} ${ordem}
        LIMIT $${++paramCount}
      `;
      
      params.push(limite);
      const result = await db.query(query, params);
      
      if (formato === 'csv') {
        const csvHeader = colunas.join(';');
        const csvRows = result.rows.map(row => 
          colunas.map(col => {
            const value = row[col] || '';
            return `"${value.toString().replace(/"/g, '""')}"`;
          }).join(';')
        );
        
        const csvContent = [csvHeader, ...csvRows].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${relatorio.nome}.csv"`);
        res.send(csvContent);
      } else {
        res.json({
          relatorio: relatorio.nome,
          tipo: 'tabela',
          colunas,
          dados: result.rows,
          total_registros: result.rows.length
        });
      }
    } else if (tipoVisualizacao === 'grafico') {
      const agruparPor = visualizacao.agrupar_por || 'municipio';
      const limite = visualizacao.limite || 20;
      
      let groupByField, selectFields;
      
      if (agruparPor === 'municipio') {
        groupByField = 'm.id, m.nome';
        selectFields = 'm.nome as label, SUM(v.quantidade_votos) as value';
      } else if (agruparPor === 'candidato') {
        groupByField = 'c.id, c.nome';
        selectFields = 'c.nome as label, SUM(v.quantidade_votos) as value';
      } else if (agruparPor === 'cargo') {
        groupByField = 'c.cargo';
        selectFields = 'c.cargo as label, SUM(v.quantidade_votos) as value';
      }
      
      const query = `
        SELECT 
          ${selectFields}
        FROM votos v
        JOIN municipios m ON v.municipio_id = m.id
        JOIN candidatos c ON v.candidato_id = c.id
        ${whereClause}
        GROUP BY ${groupByField}
        ORDER BY value DESC
        LIMIT $${++paramCount}
      `;
      
      params.push(limite);
      const result = await db.query(query, params);
      
      res.json({
        relatorio: relatorio.nome,
        tipo: 'grafico',
        agrupamento: agruparPor,
        dados: result.rows
      });
    } else if (tipoVisualizacao === 'mapa') {
      const query = `
        SELECT 
          m.nome as municipio,
          m.latitude,
          m.longitude,
          SUM(v.quantidade_votos) as total_votos,
          c.nome as candidato,
          c.cargo
        FROM votos v
        JOIN municipios m ON v.municipio_id = m.id
        JOIN candidatos c ON v.candidato_id = c.id
        ${whereClause}
        GROUP BY m.id, m.nome, m.latitude, m.longitude, c.nome, c.cargo
        HAVING m.latitude IS NOT NULL AND m.longitude IS NOT NULL
        ORDER BY total_votos DESC
      `;
      
      const result = await db.query(query, params);
      
      res.json({
        relatorio: relatorio.nome,
        tipo: 'mapa',
        dados: result.rows,
        total_municipios: result.rows.length
      });
    }
  } catch (error) {
    console.error('Erro ao executar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/relatorios/:id/duplicar - Duplicar relatório
router.post('/:id/duplicar', async (req, res) => {
  try {
    const { id } = req.params;
    const { novo_nome } = req.body;
    
    if (!novo_nome) {
      return res.status(400).json({ error: 'novo_nome é obrigatório' });
    }
    
    // Buscar relatório original
    const relatorioResult = await db.query('SELECT * FROM relatorios WHERE id = $1', [id]);
    
    if (relatorioResult.rows.length === 0) {
      return res.status(404).json({ error: 'Relatório não encontrado' });
    }
    
    const relatorio = relatorioResult.rows[0];
    
    // Criar cópia
    const result = await db.query(`
      INSERT INTO relatorios (nome, descricao, filtros, visualizacao, eleicao_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      novo_nome,
      `${relatorio.descricao || ''} (cópia)`,
      relatorio.filtros,
      relatorio.visualizacao,
      relatorio.eleicao_id
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao duplicar relatório:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
