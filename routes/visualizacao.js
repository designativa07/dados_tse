const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');

// GET /api/visualizacao/configuracoes - Listar configurações de visualização
router.get('/configuracoes', async (req, res) => {
  try {
    const { tipo, ativo } = req.query;

    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (tipo) {
      whereClause += ` WHERE tipo = $${++paramCount}`;
      params.push(tipo);
    }

    if (ativo !== undefined) {
      whereClause += whereClause ? ` AND ativo = $${++paramCount}` : ` WHERE ativo = $${++paramCount}`;
      params.push(ativo === 'true');
    }

    const result = await db.query(`
      SELECT * FROM configuracoes_visualizacao 
      ${whereClause}
      ORDER BY nome
    `, params);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/visualizacao/configuracoes - Criar configuração
router.post('/configuracoes', async (req, res) => {
  try {
    const { nome, tipo, configuracoes, ativo = true } = req.body;

    if (!nome || !tipo || !configuracoes) {
      return res.status(400).json({ error: 'Nome, tipo e configurações são obrigatórios' });
    }

    const result = await db.query(`
      INSERT INTO configuracoes_visualizacao (nome, tipo, configuracoes, ativo)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [nome, tipo, JSON.stringify(configuracoes), ativo]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar configuração:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/visualizacao/tabela - Dados para tabela configurável
router.get('/tabela', async (req, res) => {
  try {
    const {
      eleicao_id,
      colunas = 'municipio,votos,candidato',
      ordenar_por = 'votos',
      ordem = 'DESC',
      limite = 100,
      pagina = 1
    } = req.query;

    if (!eleicao_id) {
      return res.status(400).json({ error: 'eleicao_id é obrigatório' });
    }

    const offset = (pagina - 1) * limite;
    const colunasArray = colunas.split(',').map(c => c.trim());

    // Mapear colunas para campos do banco
    const colunasMap = {
      'municipio': 'm.nome as municipio',
      'votos': 'v.quantidade_votos as votos',
      'candidato': 'c.nome as candidato',
      'cargo': 'c.cargo',
      'numero': 'c.numero as candidato_numero',
      'partido': 'c.partido',
      'sigla_partido': 'c.sigla_partido',
      'nome_partido': 'c.nome_partido',
      'zona': 'v.zona',
      'secao': 'v.secao',
      'local': 'v.local_votacao as local_votacao',
      'endereco': 'v.endereco_local as endereco',
      'eleicao': 'e.ano as eleicao_ano',
      'tipo': 'e.tipo as eleicao_tipo',
      'turno': 'e.turno as eleicao_turno'
    };

    // Sempre incluir candidato_id para links
    const selectFields = colunasArray.map(col => colunasMap[col] || col).join(', ') + ', c.id as candidato_id';

    // Validar ordenação
    const allowedOrderFields = ['votos', 'municipio', 'candidato', 'zona', 'secao'];
    const orderField = allowedOrderFields.includes(ordenar_por) ? ordenar_por : 'votos';
    const orderDirection = ordem.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Mapear campo de ordenação para campo real do banco
    const orderFieldMap = {
      'votos': 'v.quantidade_votos',
      'municipio': 'm.nome',
      'candidato': 'c.nome',
      'zona': 'v.zona',
      'secao': 'v.secao'
    };

    const realOrderField = orderFieldMap[orderField] || 'v.quantidade_votos';

    const query = `
      SELECT 
        ${selectFields}
      FROM votos v
      JOIN municipios m ON v.municipio_id = m.id
      JOIN candidatos c ON v.candidato_id = c.id
      JOIN eleicoes e ON v.eleicao_id = e.id
      WHERE v.eleicao_id = $1
      ORDER BY ${realOrderField} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [eleicao_id, limite, offset]);

    // Contar total para paginação
    const countResult = await db.query(`
      SELECT COUNT(*) FROM votos v WHERE v.eleicao_id = $1
    `, [eleicao_id]);

    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      colunas: colunasArray,
      pagination: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total,
        paginas: Math.ceil(total / limite)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar dados da tabela:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/visualizacao/grafico - Dados para gráficos
router.get('/grafico', async (req, res) => {
  try {
    const {
      eleicao_id,
      tipo = 'bar',
      eixo_x = 'municipio',
      eixo_y = 'votos',
      agrupar_por = 'municipio',
      cargo = '',
      limite = 20
    } = req.query;

    if (!eleicao_id) {
      return res.status(400).json({ error: 'eleicao_id é obrigatório' });
    }

    let groupByField, selectFields;
    let whereConditions = ['v.eleicao_id = $1'];
    let params = [eleicao_id];
    let paramCount = 1;

    if (agrupar_por === 'municipio') {
      groupByField = 'm.id, m.nome';
      selectFields = 'm.nome as label, SUM(v.quantidade_votos) as value';
    } else if (agrupar_por === 'candidato') {
      groupByField = 'c.id, c.nome, c.cargo';
      selectFields = 'c.nome as label, SUM(v.quantidade_votos) as value, c.cargo';
    } else if (agrupar_por === 'cargo') {
      groupByField = 'c.cargo';
      selectFields = 'c.cargo as label, SUM(v.quantidade_votos) as value';
    } else {
      return res.status(400).json({ error: 'agrupar_por deve ser municipio, candidato ou cargo' });
    }

    // Adicionar filtro por cargo se especificado
    if (cargo) {
      whereConditions.push(`UPPER(c.cargo) = UPPER($${++paramCount})`);
      params.push(cargo);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    let query;

    // Query unificada para todos os tipos de agrupamento
    query = `
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
      tipo,
      dados: result.rows,
      eixo_x,
      eixo_y,
      agrupamento: agrupar_por,
      cargo: cargo || null
    });
  } catch (error) {
    console.error('Erro ao buscar dados do gráfico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/visualizacao/mapa - Dados para mapa de calor
router.get('/mapa', async (req, res) => {
  try {
    const {
      eleicao_id,
      candidato_id,
      tipo = 'heatmap'
    } = req.query;

    if (!eleicao_id) {
      return res.status(400).json({ error: 'eleicao_id é obrigatório' });
    }

    let whereClause = 'WHERE v.eleicao_id = $1';
    let params = [eleicao_id];
    let paramCount = 1;

    if (candidato_id) {
      whereClause += ` AND v.candidato_id = $${++paramCount}`;
      params.push(candidato_id);
    }

    const query = `
      SELECT 
        m.nome as municipio,
        m.latitude,
        m.longitude,
        SUM(v.quantidade_votos) as total_votos,
        c.nome as candidato,
        c.cargo,
        c.numero as candidato_numero,
        e.ano as eleicao_ano,
        e.tipo as eleicao_tipo
      FROM votos v
      JOIN municipios m ON v.municipio_id = m.id
      JOIN candidatos c ON v.candidato_id = c.id
      JOIN eleicoes e ON v.eleicao_id = e.id
      ${whereClause}
      GROUP BY m.id, m.nome, m.latitude, m.longitude, c.nome, c.cargo, c.numero, e.ano, e.tipo
      ORDER BY total_votos DESC
    `;

    const result = await db.query(query, params);

    // Frontend agora usa coordenadas hardcoded, então não filtramos aqui
    // Apenas retornamos todos os dados com os votos por município
    res.json({
      tipo,
      dados: result.rows,
      total_municipios: result.rows.length,
      total_votos: result.rows.reduce((sum, row) => sum + parseInt(row.total_votos), 0)
    });
  } catch (error) {
    console.error('Erro ao buscar dados do mapa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/visualizacao/estatisticas - Estatísticas gerais
router.get('/estatisticas', async (req, res) => {
  try {
    const { eleicao_id, candidato_id, municipio_id } = req.query;

    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (eleicao_id) {
      whereConditions.push(`v.eleicao_id = $${++paramCount}`);
      params.push(eleicao_id);
    }

    if (candidato_id) {
      whereConditions.push(`v.candidato_id = $${++paramCount}`);
      params.push(candidato_id);
    }

    if (municipio_id) {
      whereConditions.push(`v.municipio_id = $${++paramCount}`);
      params.push(municipio_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        COUNT(*) as total_registros,
        SUM(v.quantidade_votos) as total_votos,
        AVG(v.quantidade_votos) as media_votos,
        MAX(v.quantidade_votos) as max_votos,
        MIN(v.quantidade_votos) as min_votos,
        COUNT(DISTINCT v.municipio_id) as municipios_envolvidos,
        COUNT(DISTINCT v.candidato_id) as candidatos_envolvidos,
        COUNT(DISTINCT v.eleicao_id) as eleicoes_envolvidas,
        COUNT(DISTINCT v.zona) as total_zonas,
        COUNT(DISTINCT v.secao) as total_secoes
      FROM votos v
      ${whereClause}
    `;

    const result = await db.query(query, params);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/visualizacao/exportar - Exportar dados
router.post('/exportar', async (req, res) => {
  try {
    const {
      eleicao_id,
      formato = 'csv',
      colunas = ['municipio', 'votos', 'candidato'],
      filtros = {}
    } = req.body;

    if (!eleicao_id) {
      return res.status(400).json({ error: 'eleicao_id é obrigatório' });
    }

    // Construir query baseada nos filtros
    let whereConditions = ['v.eleicao_id = $1'];
    let params = [eleicao_id];
    let paramCount = 1;

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

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

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

    const selectFields = colunas.map(col => colunasMap[col] || col).join(', ');

    const query = `
      SELECT 
        ${selectFields}
      FROM votos v
      JOIN municipios m ON v.municipio_id = m.id
      JOIN candidatos c ON v.candidato_id = c.id
      JOIN eleicoes e ON v.eleicao_id = e.id
      ${whereClause}
      ORDER BY v.quantidade_votos DESC
    `;

    const result = await db.query(query, params);

    if (formato === 'csv') {
      // Gerar CSV
      const csvHeader = colunas.join(';');
      const csvRows = result.rows.map(row =>
        colunas.map(col => {
          const value = row[col] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(';')
      );

      const csvContent = [csvHeader, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="dados_exportados.csv"');
      res.send(csvContent);
    } else {
      res.json({
        formato,
        dados: result.rows,
        total_registros: result.rows.length
      });
    }
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
