const express = require('express');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');

// Schema de validação para votos
const votoSchema = Joi.object({
  eleicao_id: Joi.number().integer().required(),
  municipio_id: Joi.number().integer().required(),
  candidato_id: Joi.number().integer().required(),
  zona: Joi.number().integer().optional(),
  secao: Joi.number().integer().optional(),
  local_votacao: Joi.string().max(255).optional(),
  endereco_local: Joi.string().max(500).optional(),
  quantidade_votos: Joi.number().integer().min(0).required()
});

// GET /api/votos - Listar votos com filtros
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      eleicao_id,
      municipio_id,
      candidato_id,
      min_votos,
      max_votos,
      ordenar_por = 'quantidade_votos',
      ordem = 'DESC',
      agrupar_por = 'nenhum',
      busca_candidato = '',
      busca_municipio = ''
    } = req.query;

    const offset = (page - 1) * limit;

    // Construir WHERE clause dinamicamente
    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (eleicao_id) {
      whereConditions.push(`v.eleicao_id = $${++paramCount}`);
      params.push(eleicao_id);
    }

    if (municipio_id) {
      whereConditions.push(`v.municipio_id = $${++paramCount}`);
      params.push(municipio_id);
    }

    if (candidato_id) {
      whereConditions.push(`v.candidato_id = $${++paramCount}`);
      params.push(candidato_id);
    }

    if (min_votos) {
      whereConditions.push(`v.quantidade_votos >= $${++paramCount}`);
      params.push(min_votos);
    }

    if (max_votos) {
      whereConditions.push(`v.quantidade_votos <= $${++paramCount}`);
      params.push(max_votos);
    }

    // Adicionar filtros de busca
    if (busca_candidato) {
      whereConditions.push(`c.nome ILIKE $${++paramCount}`);
      params.push(`%${busca_candidato}%`);
    }

    if (busca_municipio) {
      whereConditions.push(`m.nome ILIKE $${++paramCount}`);
      params.push(`%${busca_municipio}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Validar ordenação
    const allowedOrderFields = ['quantidade_votos', 'municipio', 'candidato', 'zona', 'secao', 'cargo'];
    const orderField = allowedOrderFields.includes(ordenar_por) ? ordenar_por : 'quantidade_votos';
    const orderDirection = ordem.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Query para contar total
    let countQuery;
    if (agrupar_por !== 'nenhum') {
      // Para consultas agrupadas, contar registros únicos
      if (agrupar_por === 'candidato') {
        countQuery = `
          SELECT COUNT(DISTINCT c.id) 
          FROM votos v
          JOIN municipios m ON v.municipio_id = m.id
          JOIN candidatos c ON v.candidato_id = c.id
          ${whereClause}
        `;
      } else if (agrupar_por === 'municipio') {
        countQuery = `
          SELECT COUNT(DISTINCT m.id) 
          FROM votos v
          JOIN municipios m ON v.municipio_id = m.id
          JOIN candidatos c ON v.candidato_id = c.id
          ${whereClause}
        `;
      } else if (agrupar_por === 'cargo') {
        countQuery = `
          SELECT COUNT(DISTINCT c.cargo) 
          FROM votos v
          JOIN municipios m ON v.municipio_id = m.id
          JOIN candidatos c ON v.candidato_id = c.id
          ${whereClause}
        `;
      }
    } else {
      countQuery = `
        SELECT COUNT(*) 
        FROM votos v
        JOIN municipios m ON v.municipio_id = m.id
        JOIN candidatos c ON v.candidato_id = c.id
        ${whereClause}
      `;
    }
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Determinar se deve agrupar os dados
    let dataQuery;
    let groupByClause = '';
    let selectFields = `
      v.*,
      m.nome as municipio_nome,
      m.sigla_uf,
      c.nome as candidato_nome,
      c.cargo,
      c.numero as candidato_numero,
      e.ano as eleicao_ano,
      e.tipo as eleicao_tipo
    `;

    if (agrupar_por !== 'nenhum') {
      // Agrupar dados
      if (agrupar_por === 'candidato') {
        selectFields = `
          c.id as candidato_id,
          c.nome as candidato_nome,
          c.cargo,
          c.numero as candidato_numero,
          SUM(v.quantidade_votos) as total_votos,
          COUNT(*) as total_registros,
          COUNT(DISTINCT v.municipio_id) as municipios_envolvidos,
          AVG(v.quantidade_votos) as media_votos_por_secao
        `;
        groupByClause = 'GROUP BY c.id, c.nome, c.cargo, c.numero';
      } else if (agrupar_por === 'municipio') {
        selectFields = `
          m.id as municipio_id,
          m.nome as municipio_nome,
          m.sigla_uf,
          SUM(v.quantidade_votos) as total_votos,
          COUNT(*) as total_registros,
          COUNT(DISTINCT v.candidato_id) as candidatos_envolvidos,
          AVG(v.quantidade_votos) as media_votos_por_secao
        `;
        groupByClause = 'GROUP BY m.id, m.nome, m.sigla_uf';
      } else if (agrupar_por === 'cargo') {
        selectFields = `
          c.cargo,
          SUM(v.quantidade_votos) as total_votos,
          COUNT(*) as total_registros,
          COUNT(DISTINCT v.candidato_id) as candidatos_envolvidos,
          COUNT(DISTINCT v.municipio_id) as municipios_envolvidos,
          AVG(v.quantidade_votos) as media_votos_por_secao
        `;
        groupByClause = 'GROUP BY c.cargo';
      }
    }

    dataQuery = `
      SELECT ${selectFields}
      FROM votos v
      JOIN municipios m ON v.municipio_id = m.id
      JOIN candidatos c ON v.candidato_id = c.id
      JOIN eleicoes e ON v.eleicao_id = e.id
      ${whereClause}
      ${groupByClause}
      ORDER BY total_votos DESC
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
    console.error('Erro ao buscar votos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/votos/agregados - Votos agregados por município/candidato
router.get('/agregados', async (req, res) => {
  try {
    const {
      eleicao_id,
      agrupar_por = 'municipio',
      ordenar_por = 'total_votos',
      ordem = 'DESC',
      limite = 100
    } = req.query;

    // eleicao_id é opcional - se não fornecido, busca dados de todas as eleições

    let groupByField, orderByField;

    if (agrupar_por === 'municipio') {
      groupByField = 'm.id, m.nome, m.sigla_uf';
      orderByField = ordenar_por === 'municipio' ? 'm.nome' : 'total_votos';
    } else if (agrupar_por === 'candidato') {
      groupByField = 'c.id, c.nome, c.cargo, c.numero, c.partido, c.sigla_partido, c.nome_partido';
      orderByField = ordenar_por === 'candidato' ? 'c.nome' : 'total_votos';
    } else if (agrupar_por === 'cargo') {
      groupByField = 'c.cargo';
      orderByField = ordenar_por === 'cargo' ? 'c.cargo' : 'total_votos';
    } else {
      return res.status(400).json({ error: 'agrupar_por deve ser "municipio", "candidato" ou "cargo"' });
    }

    const orderDirection = ordem.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Construir WHERE clause baseado na presença de eleicao_id
    let whereClause = '';
    let params = [];
    let paramCount = 0;

    if (eleicao_id) {
      whereClause = 'WHERE v.eleicao_id = $1';
      params.push(eleicao_id);
      paramCount = 1;
    }

    const query = `
      SELECT 
        ${groupByField},
        SUM(v.quantidade_votos) as total_votos,
        COUNT(DISTINCT v.zona) as total_zonas,
        COUNT(DISTINCT v.secao) as total_secoes,
        AVG(v.quantidade_votos) as media_votos_por_secao
      FROM votos v
      JOIN municipios m ON v.municipio_id = m.id
      JOIN candidatos c ON v.candidato_id = c.id
      ${whereClause}
      GROUP BY ${groupByField}
      ORDER BY ${orderByField} ${orderDirection}
      LIMIT $${++paramCount}
    `;

    params.push(limite);
    const result = await db.query(query, params);

    res.json({
      data: result.rows,
      agrupamento: agrupar_por,
      total_registros: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar votos agregados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/votos/mapa - Dados para mapa de calor
router.get('/mapa', async (req, res) => {
  try {
    const { eleicao_id, candidato_id } = req.query;

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
      data: result.rows,
      total_municipios: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar dados para mapa:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/votos - Criar novo voto
router.post('/', async (req, res) => {
  try {
    const { error, value } = votoSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: error.details
      });
    }

    const { eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos } = value;

    const result = await db.query(`
      INSERT INTO votos (eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar voto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/votos/batch - Inserir múltiplos votos
router.post('/batch', async (req, res) => {
  try {
    const { votos } = req.body;

    if (!Array.isArray(votos) || votos.length === 0) {
      return res.status(400).json({ error: 'Lista de votos é obrigatória' });
    }

    // Validar cada voto
    for (let i = 0; i < votos.length; i++) {
      const { error } = votoSchema.validate(votos[i]);
      if (error) {
        return res.status(400).json({
          error: `Voto ${i + 1} inválido`,
          details: error.details
        });
      }
    }

    // Usar transação para inserir todos os votos
    const result = await db.transaction(async (client) => {
      const insertedVotos = [];

      for (const voto of votos) {
        const { eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos } = voto;

        const votoResult = await client.query(`
          INSERT INTO votos (eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos]);

        insertedVotos.push(votoResult.rows[0]);
      }

      return insertedVotos;
    });

    res.status(201).json({
      message: `${result.length} votos inseridos com sucesso`,
      data: result
    });
  } catch (error) {
    console.error('Erro ao inserir votos em lote:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/votos/estatisticas - Estatísticas gerais
router.get('/estatisticas', async (req, res) => {
  try {
    const { eleicao_id } = req.query;

    let whereClause = '';
    let params = [];

    if (eleicao_id) {
      whereClause = 'WHERE eleicao_id = $1';
      params.push(eleicao_id);
    }

    const query = `
      SELECT 
        COUNT(*) as total_registros,
        SUM(quantidade_votos) as total_votos,
        AVG(quantidade_votos) as media_votos,
        MAX(quantidade_votos) as max_votos,
        MIN(quantidade_votos) as min_votos,
        COUNT(DISTINCT municipio_id) as municipios_envolvidos,
        COUNT(DISTINCT candidato_id) as candidatos_envolvidos,
        COUNT(DISTINCT eleicao_id) as eleicoes_envolvidas,
        -- Calcular estimativa de eleitores únicos (aproximação baseada em votos por seção)
        COUNT(DISTINCT CONCAT(municipio_id, '-', zona, '-', secao)) as secoes_eleitorais
      FROM votos
      ${whereClause}
    `;

    const result = await db.query(query, params);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/votos/estatisticas-por-cargo - Estatísticas separadas por cargo
router.get('/estatisticas-por-cargo', async (req, res) => {
  try {
    const { eleicao_id } = req.query;

    let whereClause = '';
    let params = [];

    if (eleicao_id) {
      whereClause = 'WHERE v.eleicao_id = $1';
      params.push(eleicao_id);
    }

    const query = `
      SELECT 
        c.cargo,
        COUNT(*) as total_registros,
        SUM(v.quantidade_votos) as total_votos,
        AVG(v.quantidade_votos) as media_votos,
        MAX(v.quantidade_votos) as max_votos,
        MIN(v.quantidade_votos) as min_votos,
        COUNT(DISTINCT v.municipio_id) as municipios_envolvidos,
        COUNT(DISTINCT v.candidato_id) as candidatos_envolvidos
      FROM votos v
      JOIN candidatos c ON v.candidato_id = c.id
      ${whereClause}
      GROUP BY c.cargo
      ORDER BY total_votos DESC
    `;

    const result = await db.query(query, params);

    res.json({
      cargos: result.rows,
      total_cargos: result.rows.length
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas por cargo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/votos/tabela-agrupada - Tabela com agrupamento
router.get('/tabela-agrupada', async (req, res) => {
  try {
    const {
      eleicao_id,
      agrupar_por = 'candidato',
      cargo = '',
      zona = '',
      secao = '',
      busca_candidato = '',
      busca_municipio = '',
      busca_numero = '',
      ordenar_por = 'total_votos',
      ordem = 'DESC',
      limite = 100,
      offset = 0
    } = req.query;

    if (!eleicao_id) {
      return res.status(400).json({ error: 'eleicao_id é obrigatório' });
    }

    // Construir WHERE clause
    let whereConditions = [`v.eleicao_id = $1`];
    let params = [eleicao_id];
    let paramCount = 1;

    // Filtros básicos
    if (cargo) {
      whereConditions.push(`UPPER(c.cargo) = UPPER($${++paramCount})`);
      params.push(cargo);
    }

    if (zona) {
      whereConditions.push(`v.zona = $${++paramCount}`);
      params.push(parseInt(zona));
    }

    if (secao) {
      whereConditions.push(`v.secao = $${++paramCount}`);
      params.push(parseInt(secao));
    }

    // Filtros de busca
    if (busca_candidato) {
      whereConditions.push(`c.nome ILIKE $${++paramCount}`);
      params.push(`%${busca_candidato}%`);
    }

    if (busca_municipio) {
      whereConditions.push(`m.nome ILIKE $${++paramCount}`);
      params.push(`%${busca_municipio}%`);
    }


    if (busca_numero) {
      whereConditions.push(`c.numero::text ILIKE $${++paramCount}`);
      params.push(`%${busca_numero}%`);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Determinar campos e agrupamento
    let selectFields, groupByClause, orderByClause;

    if (agrupar_por === 'candidato') {
      selectFields = `
        c.id as candidato_id,
        c.nome as candidato_nome,
        c.cargo,
        c.numero as candidato_numero,
        c.partido as candidato_partido,
        SUM(v.quantidade_votos) as total_votos,
        COUNT(*) as total_registros,
        COUNT(DISTINCT v.municipio_id) as municipios_envolvidos
      `;
      groupByClause = 'GROUP BY c.id, c.nome, c.cargo, c.numero, c.partido';
    } else if (agrupar_por === 'municipio') {
      selectFields = `
        m.id as municipio_id,
        m.nome as municipio_nome,
        m.sigla_uf,
        SUM(v.quantidade_votos) as total_votos,
        COUNT(*) as total_registros,
        COUNT(DISTINCT v.candidato_id) as candidatos_envolvidos
      `;
      groupByClause = 'GROUP BY m.id, m.nome, m.sigla_uf';
    } else if (agrupar_por === 'cargo') {
      selectFields = `
        c.cargo,
        SUM(v.quantidade_votos) as total_votos,
        COUNT(*) as total_registros,
        COUNT(DISTINCT v.candidato_id) as candidatos_envolvidos,
        COUNT(DISTINCT v.municipio_id) as municipios_envolvidos
      `;
      groupByClause = 'GROUP BY c.cargo';
    } else if (agrupar_por === 'partido') {
      selectFields = `
        c.partido,
        SUM(v.quantidade_votos) as total_votos,
        COUNT(*) as total_registros,
        COUNT(DISTINCT v.candidato_id) as candidatos_envolvidos,
        COUNT(DISTINCT v.municipio_id) as municipios_envolvidos
      `;
      groupByClause = 'GROUP BY c.partido';
    } else if (agrupar_por === 'zona') {
      selectFields = `
               v.zona,
               SUM(v.quantidade_votos) as total_votos,
               COUNT(*) as total_registros,
               COUNT(DISTINCT v.candidato_id) as candidatos_envolvidos,
               COUNT(DISTINCT v.municipio_id) as municipios_envolvidos
             `;
      groupByClause = 'GROUP BY v.zona';
    } else if (agrupar_por === 'partido') {
      selectFields = `
               c.partido,
               SUM(v.quantidade_votos) as total_votos,
               COUNT(*) as total_registros,
               COUNT(DISTINCT v.candidato_id) as candidatos_envolvidos,
               COUNT(DISTINCT v.municipio_id) as municipios_envolvidos
             `;
      groupByClause = 'GROUP BY c.partido';
    } else {
      // Nenhum agrupamento - dados detalhados
      selectFields = `
        v.*,
        m.nome as municipio_nome,
        m.sigla_uf,
        c.nome as candidato_nome,
        c.cargo,
        c.numero as candidato_numero,
        c.partido as candidato_partido,
        e.ano as eleicao_ano,
        e.tipo as eleicao_tipo,
        e.turno as eleicao_turno
      `;
      groupByClause = '';
    }

    // Validar compatibilidade entre agrupamento e ordenação
    let realOrdenarPor = ordenar_por;

    // Se agrupar por candidato, não pode ordenar por município
    if (agrupar_por === 'candidato' && ordenar_por === 'municipio') {
      realOrdenarPor = 'total_votos';
    }

    // Se agrupar por município, não pode ordenar por candidato
    if (agrupar_por === 'municipio' && ordenar_por === 'candidato') {
      realOrdenarPor = 'total_votos';
    }

    // Se agrupar por cargo, não pode ordenar por município nem candidato
    if (agrupar_por === 'cargo' && (ordenar_por === 'municipio' || ordenar_por === 'candidato')) {
      realOrdenarPor = 'total_votos';
    }

    // Construir ORDER BY
    if (agrupar_por === 'nenhum') {
      // Para dados detalhados, usar campos específicos
      const orderField = realOrdenarPor === 'votos' ? 'v.quantidade_votos' :
        realOrdenarPor === 'municipio' ? 'm.nome' :
          realOrdenarPor === 'candidato' ? 'c.nome' :
            realOrdenarPor === 'cargo' ? 'c.cargo' :
              realOrdenarPor === 'partido' ? 'c.partido' :
                realOrdenarPor === 'zona' ? 'v.zona' :
                  realOrdenarPor === 'secao' ? 'v.secao' :
                    realOrdenarPor === 'numero' ? 'c.numero' :
                      'v.quantidade_votos';
      orderByClause = `ORDER BY ${orderField} ${ordem}`;
    } else {
      // Para dados agrupados, usar total_votos ou campo específico
      const orderField = realOrdenarPor === 'votos' ? 'total_votos' :
        realOrdenarPor === 'municipio' ? 'municipio_nome' :
          realOrdenarPor === 'candidato' ? 'candidato_nome' :
            realOrdenarPor === 'cargo' ? 'cargo' :
              realOrdenarPor === 'partido' ? 'partido' :
                realOrdenarPor === 'zona' ? 'zona' :
                  'total_votos';
      orderByClause = `ORDER BY ${orderField} ${ordem}`;
    }

    const query = `
      SELECT ${selectFields}
      FROM votos v
      JOIN municipios m ON v.municipio_id = m.id
      JOIN candidatos c ON v.candidato_id = c.id
      JOIN eleicoes e ON v.eleicao_id = e.id
      ${whereClause}
      ${groupByClause}
      ${orderByClause}
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;

    params.push(parseInt(limite), parseInt(offset));
    const result = await db.query(query, params);

    // Contar total de registros para paginação
    let countQuery;
    if (agrupar_por === 'nenhum') {
      countQuery = `
        SELECT COUNT(*) 
        FROM votos v
        JOIN municipios m ON v.municipio_id = m.id
        JOIN candidatos c ON v.candidato_id = c.id
        JOIN eleicoes e ON v.eleicao_id = e.id
        ${whereClause}
      `;
    } else {
      countQuery = `
        SELECT COUNT(*) FROM (
          SELECT ${selectFields}
          FROM votos v
          JOIN municipios m ON v.municipio_id = m.id
          JOIN candidatos c ON v.candidato_id = c.id
          JOIN eleicoes e ON v.eleicao_id = e.id
          ${whereClause}
          ${groupByClause}
        ) as count_table
      `;
    }

    const countResult = await db.query(countQuery, params.slice(0, -2)); // Remove limite e offset
    const totalRegistros = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      agrupamento: agrupar_por,
      total_registros: totalRegistros,
      filtros_aplicados: {
        cargo,
        zona,
        secao,
        busca_candidato,
        busca_municipio,
        busca_numero
      }
    });
  } catch (error) {
    console.error('Erro ao buscar tabela agrupada:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/votos/candidato/:id - Votos de um candidato específico por município
router.get('/candidato/:id', async (req, res) => {
  try {
    const candidatoId = req.params.id;

    if (!candidatoId || isNaN(candidatoId)) {
      return res.status(400).json({ error: 'ID do candidato inválido' });
    }

    // Buscar votos do candidato agrupados por município
    const query = `
      SELECT 
        m.nome as municipio,
        m.sigla_uf,
        SUM(v.quantidade_votos) as total_votos,
        COUNT(DISTINCT v.zona) as total_zonas,
        COUNT(DISTINCT v.secao) as total_secoes,
        AVG(v.quantidade_votos) as media_votos_por_secao
      FROM votos v
      JOIN municipios m ON v.municipio_id = m.id
      WHERE v.candidato_id = $1
      GROUP BY m.id, m.nome, m.sigla_uf
      ORDER BY total_votos DESC
    `;

    const result = await db.query(query, [candidatoId]);

    // Calcular estatísticas gerais
    const totalVotos = result.rows.reduce((sum, row) => sum + parseInt(row.total_votos), 0);
    const totalMunicipios = result.rows.length;

    res.json({
      success: true,
      candidato_id: candidatoId,
      total_votos: totalVotos,
      total_municipios: totalMunicipios,
      votos: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar votos do candidato:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
