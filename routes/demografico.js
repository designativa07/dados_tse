// Routes para análise demográfica do eleitorado
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/demografico/resumo - Resumo geral demográfico
router.get('/resumo', async (req, res) => {
  try {
    const { ano_eleicao } = req.query;

    // Totais por gênero
    const generoQuery = `
      SELECT 
        ds_genero,
        ano_eleicao,
        SUM(qt_eleitores_perfil) as total
      FROM perfil_eleitor_secao
      ${ano_eleicao ? 'WHERE ano_eleicao = $1' : ''}
      GROUP BY ds_genero, ano_eleicao
      ORDER BY ano_eleicao, total DESC
    `;
    const generoResult = await db.query(generoQuery, ano_eleicao ? [ano_eleicao] : []);

    // Totais por escolaridade
    const escolaridadeQuery = `
      SELECT 
        ds_grau_escolaridade,
        ano_eleicao,
        SUM(qt_eleitores_perfil) as total
      FROM perfil_eleitor_secao
      ${ano_eleicao ? 'WHERE ano_eleicao = $1' : ''}
      GROUP BY ds_grau_escolaridade, ano_eleicao
      ORDER BY ano_eleicao, total DESC
    `;
    const escolaridadeResult = await db.query(escolaridadeQuery, ano_eleicao ? [ano_eleicao] : []);

    // Totais por faixa etária
    const faixaEtariaQuery = `
      SELECT 
        ds_faixa_etaria,
        ano_eleicao,
        SUM(qt_eleitores_perfil) as total
      FROM perfil_eleitor_secao
      ${ano_eleicao ? 'WHERE ano_eleicao = $1' : ''}
      GROUP BY ds_faixa_etaria, ano_eleicao
      ORDER BY ano_eleicao, ds_faixa_etaria
    `;
    const faixaEtariaResult = await db.query(faixaEtariaQuery, ano_eleicao ? [ano_eleicao] : []);

    // Totais por estado civil
    const estadoCivilQuery = `
      SELECT 
        ds_estado_civil,
        ano_eleicao,
        SUM(qt_eleitores_perfil) as total
      FROM perfil_eleitor_secao
      ${ano_eleicao ? 'WHERE ano_eleicao = $1' : ''}
      GROUP BY ds_estado_civil, ano_eleicao
      ORDER BY ano_eleicao, total DESC
    `;
    const estadoCivilResult = await db.query(estadoCivilQuery, ano_eleicao ? [ano_eleicao] : []);

    // Total geral por ano
    const totalQuery = `
      SELECT 
        ano_eleicao,
        SUM(qt_eleitores_perfil) as total,
        COUNT(DISTINCT cd_municipio) as municipios
      FROM perfil_eleitor_secao
      GROUP BY ano_eleicao
      ORDER BY ano_eleicao
    `;
    const totalResult = await db.query(totalQuery);

    res.json({
      success: true,
      resumo: {
        totais: totalResult.rows,
        genero: generoResult.rows,
        escolaridade: escolaridadeResult.rows,
        faixa_etaria: faixaEtariaResult.rows,
        estado_civil: estadoCivilResult.rows
      }
    });
  } catch (error) {
    console.error('Erro ao buscar resumo demográfico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/demografico/municipio/:id - Perfil demográfico de um município
router.get('/municipio/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ano_eleicao } = req.query;

    // Buscar código do município
    const municipioQuery = await db.query(
      'SELECT codigo, nome, sigla_uf FROM municipios WHERE id = $1',
      [id]
    );

    if (municipioQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Município não encontrado' });
    }

    const municipio = municipioQuery.rows[0];

    // Buscar perfil demográfico
    const baseWhere = `cd_municipio = $1 AND sg_uf = $2 ${ano_eleicao ? 'AND ano_eleicao = $3' : ''}`;
    const params = ano_eleicao ? [municipio.codigo, municipio.sigla_uf, ano_eleicao] : [municipio.codigo, municipio.sigla_uf];

    // Gênero
    const generoResult = await db.query(`
      SELECT ds_genero, ano_eleicao, SUM(qt_eleitores_perfil) as total
      FROM perfil_eleitor_secao
      WHERE ${baseWhere}
      GROUP BY ds_genero, ano_eleicao
      ORDER BY ano_eleicao, total DESC
    `, params);

    // Escolaridade
    const escolaridadeResult = await db.query(`
      SELECT ds_grau_escolaridade, ano_eleicao, SUM(qt_eleitores_perfil) as total
      FROM perfil_eleitor_secao
      WHERE ${baseWhere}
      GROUP BY ds_grau_escolaridade, ano_eleicao
      ORDER BY ano_eleicao, total DESC
    `, params);

    // Faixa etária
    const faixaEtariaResult = await db.query(`
      SELECT ds_faixa_etaria, ano_eleicao, SUM(qt_eleitores_perfil) as total
      FROM perfil_eleitor_secao
      WHERE ${baseWhere}
      GROUP BY ds_faixa_etaria, ano_eleicao
      ORDER BY ano_eleicao, ds_faixa_etaria
    `, params);

    // Total
    const totalResult = await db.query(`
      SELECT ano_eleicao, SUM(qt_eleitores_perfil) as total
      FROM perfil_eleitor_secao
      WHERE ${baseWhere}
      GROUP BY ano_eleicao
      ORDER BY ano_eleicao
    `, params);

    res.json({
      success: true,
      municipio: municipio,
      perfil: {
        totais: totalResult.rows,
        genero: generoResult.rows,
        escolaridade: escolaridadeResult.rows,
        faixa_etaria: faixaEtariaResult.rows
      }
    });
  } catch (error) {
    console.error('Erro ao buscar perfil do município:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/demografico/correlacao-votos/:candidatoId - Perfil demográfico ponderado pelas seções onde candidato teve votos
router.get('/correlacao-votos/:candidatoId', async (req, res) => {
  try {
    const { candidatoId } = req.params;

    // Buscar ano da eleicao do candidato primeiro
    const candidatoQuery = await db.query(
      'SELECT c.id, e.ano FROM candidatos c JOIN eleicoes e ON c.eleicao_id = e.id WHERE c.id = $1',
      [candidatoId]
    );

    if (candidatoQuery.rows.length === 0) {
      return res.json({
        success: false,
        error: 'Candidato não encontrado'
      });
    }

    const anoEleicao = candidatoQuery.rows[0].ano;

    // Primeiro, buscar total de votos do candidato
    const totalVotosQuery = await db.query(
      'SELECT SUM(quantidade_votos) as total FROM votos WHERE candidato_id = $1',
      [candidatoId]
    );
    const totalVotos = parseInt(totalVotosQuery.rows[0]?.total) || 0;

    // Buscar votos ponderados por perfil demográfico
    // Para cada seção, calcula a proporção de cada grupo demográfico e multiplica pelos votos
    const correlacaoQuery = `
      WITH votos_secao AS (
        SELECT 
          v.municipio_id,
          v.zona,
          v.secao,
          v.quantidade_votos,
          m.codigo as cd_municipio
        FROM votos v
        INNER JOIN municipios m ON v.municipio_id = m.id
        WHERE v.candidato_id = $1
      ),
      perfil_secao AS (
        SELECT 
          p.cd_municipio,
          p.nr_zona,
          p.nr_secao,
          p.ds_genero,
          p.ds_grau_escolaridade,
          p.ds_faixa_etaria,
          p.qt_eleitores_perfil,
          SUM(p.qt_eleitores_perfil) OVER (PARTITION BY p.cd_municipio, p.nr_zona, p.nr_secao) as total_secao
        FROM perfil_eleitor_secao p
        WHERE p.ano_eleicao = $2
      )
      SELECT 
        ps.ds_genero,
        ps.ds_grau_escolaridade,
        ps.ds_faixa_etaria,
        -- Votos ponderados pela proporção do grupo na seção
        SUM(vs.quantidade_votos * (ps.qt_eleitores_perfil::float / NULLIF(ps.total_secao, 0))) as votos_ponderados
      FROM votos_secao vs
      INNER JOIN perfil_secao ps 
        ON vs.cd_municipio = ps.cd_municipio 
        AND vs.zona = ps.nr_zona 
        AND vs.secao = ps.nr_secao
      GROUP BY ps.ds_genero, ps.ds_grau_escolaridade, ps.ds_faixa_etaria
    `;

    const result = await db.query(correlacaoQuery, [candidatoId, anoEleicao]);

    // Agregar por categoria
    const porGenero = {};
    const porEscolaridade = {};
    const porFaixaEtaria = {};

    result.rows.forEach(row => {
      const votos = Math.round(parseFloat(row.votos_ponderados) || 0);

      // Por gênero
      if (row.ds_genero) {
        if (!porGenero[row.ds_genero]) {
          porGenero[row.ds_genero] = 0;
        }
        porGenero[row.ds_genero] += votos;
      }

      // Por escolaridade
      if (row.ds_grau_escolaridade) {
        if (!porEscolaridade[row.ds_grau_escolaridade]) {
          porEscolaridade[row.ds_grau_escolaridade] = 0;
        }
        porEscolaridade[row.ds_grau_escolaridade] += votos;
      }

      // Por faixa etária
      if (row.ds_faixa_etaria) {
        if (!porFaixaEtaria[row.ds_faixa_etaria]) {
          porFaixaEtaria[row.ds_faixa_etaria] = 0;
        }
        porFaixaEtaria[row.ds_faixa_etaria] += votos;
      }
    });

    res.json({
      success: true,
      candidato_id: candidatoId,
      ano_eleicao: anoEleicao,
      total_votos: totalVotos,
      nota: 'Estimativa de votos baseada na composição demográfica das seções',
      correlacao: {
        genero: Object.entries(porGenero).map(([k, v]) => ({ categoria: k, votos: v })),
        escolaridade: Object.entries(porEscolaridade).map(([k, v]) => ({ categoria: k, votos: v })),
        faixa_etaria: Object.entries(porFaixaEtaria).map(([k, v]) => ({ categoria: k, votos: v }))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar correlação de votos:', error);
    res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  }
});

// GET /api/demografico/ranking-crescimento - Top municípios por crescimento
router.get('/ranking-crescimento', async (req, res) => {
  try {
    const crescimentoQuery = `
      WITH dados_2018 AS (
        SELECT cd_municipio, nm_municipio, SUM(qt_eleitores_perfil) as total_2018
        FROM perfil_eleitor_secao
        WHERE ano_eleicao = 2018
        GROUP BY cd_municipio, nm_municipio
      ),
      dados_2022 AS (
        SELECT cd_municipio, nm_municipio, SUM(qt_eleitores_perfil) as total_2022
        FROM perfil_eleitor_secao
        WHERE ano_eleicao = 2022
        GROUP BY cd_municipio, nm_municipio
      )
      SELECT 
        m.nome as municipio,
        COALESCE(d18.total_2018, 0) as eleitores_2018,
        COALESCE(d22.total_2022, 0) as eleitores_2022,
        COALESCE(d22.total_2022, 0) - COALESCE(d18.total_2018, 0) as crescimento_absoluto,
        CASE 
          WHEN COALESCE(d18.total_2018, 0) > 0 
          THEN ROUND(((COALESCE(d22.total_2022, 0) - d18.total_2018) * 100.0 / d18.total_2018)::numeric, 2)
          ELSE 0 
        END as crescimento_percentual
      FROM dados_2022 d22
      FULL OUTER JOIN dados_2018 d18 ON d22.cd_municipio = d18.cd_municipio
      LEFT JOIN municipios m ON m.codigo::text = COALESCE(d22.cd_municipio, d18.cd_municipio)::text
      ORDER BY crescimento_absoluto DESC
      LIMIT 20
    `;

    const result = await db.query(crescimentoQuery);

    res.json({
      success: true,
      ranking: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar ranking de crescimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/demografico/mapa-tematico/:indicador - Dados para mapa temático
router.get('/mapa-tematico/:indicador', async (req, res) => {
  try {
    const { indicador } = req.params;
    const { ano_eleicao } = req.query;

    let query;

    switch (indicador) {
      case 'escolaridade':
        // Percentual com ensino superior por município
        query = `
          SELECT 
            m.nome as municipio,
            cd_municipio,
            SUM(CASE WHEN ds_grau_escolaridade ILIKE '%SUPERIOR%' THEN qt_eleitores_perfil ELSE 0 END) * 100.0 / 
              NULLIF(SUM(qt_eleitores_perfil), 0) as valor,
            SUM(qt_eleitores_perfil) as total_eleitores
          FROM perfil_eleitor_secao
          LEFT JOIN municipios m ON m.codigo::text = cd_municipio::text
          ${ano_eleicao ? 'WHERE ano_eleicao = $1' : ''}
          GROUP BY m.nome, cd_municipio
          ORDER BY valor DESC
        `;
        break;

      case 'jovens':
        // Percentual de jovens (16-24 anos) por município
        query = `
          SELECT 
            m.nome as municipio,
            cd_municipio,
            SUM(CASE WHEN ds_faixa_etaria ILIKE '%16%' OR ds_faixa_etaria ILIKE '%17%' 
                      OR ds_faixa_etaria ILIKE '%18%' OR ds_faixa_etaria ILIKE '%19%' 
                      OR ds_faixa_etaria ILIKE '%20%' OR ds_faixa_etaria ILIKE '%21 a 24%'
                THEN qt_eleitores_perfil ELSE 0 END) * 100.0 / 
              NULLIF(SUM(qt_eleitores_perfil), 0) as valor,
            SUM(qt_eleitores_perfil) as total_eleitores
          FROM perfil_eleitor_secao
          LEFT JOIN municipios m ON m.codigo::text = cd_municipio::text
          ${ano_eleicao ? 'WHERE ano_eleicao = $1' : ''}
          GROUP BY m.nome, cd_municipio
          ORDER BY valor DESC
        `;
        break;

      case 'idosos':
        // Percentual de idosos (60+) por município
        query = `
          SELECT 
            m.nome as municipio,
            cd_municipio,
            SUM(CASE WHEN ds_faixa_etaria ILIKE '%60%' OR ds_faixa_etaria ILIKE '%65%' 
                      OR ds_faixa_etaria ILIKE '%70%' OR ds_faixa_etaria ILIKE '%75%'
                      OR ds_faixa_etaria ILIKE '%79%' OR ds_faixa_etaria ILIKE '%superior%'
                THEN qt_eleitores_perfil ELSE 0 END) * 100.0 / 
              NULLIF(SUM(qt_eleitores_perfil), 0) as valor,
            SUM(qt_eleitores_perfil) as total_eleitores
          FROM perfil_eleitor_secao
          LEFT JOIN municipios m ON m.codigo::text = cd_municipio::text
          ${ano_eleicao ? 'WHERE ano_eleicao = $1' : ''}
          GROUP BY m.nome, cd_municipio
          ORDER BY valor DESC
        `;
        break;

      case 'mulheres':
        // Percentual de mulheres por município
        query = `
          SELECT 
            m.nome as municipio,
            cd_municipio,
            SUM(CASE WHEN ds_genero = 'FEMININO' THEN qt_eleitores_perfil ELSE 0 END) * 100.0 / 
              NULLIF(SUM(qt_eleitores_perfil), 0) as valor,
            SUM(qt_eleitores_perfil) as total_eleitores
          FROM perfil_eleitor_secao
          LEFT JOIN municipios m ON m.codigo::text = cd_municipio::text
          ${ano_eleicao ? 'WHERE ano_eleicao = $1' : ''}
          GROUP BY m.nome, cd_municipio
          ORDER BY valor DESC
        `;
        break;

      default:
        return res.status(400).json({ error: 'Indicador inválido. Use: escolaridade, jovens, idosos, mulheres' });
    }

    const result = await db.query(query, ano_eleicao ? [ano_eleicao] : []);

    res.json({
      success: true,
      indicador,
      ano_eleicao: ano_eleicao || 'todos',
      dados: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar dados do mapa temático:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/demografico/comparativo-temporal - Comparativo 2018 vs 2022
router.get('/comparativo-temporal', async (req, res) => {
  try {
    // Comparativo por gênero
    const generoQuery = `
      SELECT 
        ds_genero,
        SUM(CASE WHEN ano_eleicao = 2018 THEN qt_eleitores_perfil ELSE 0 END) as total_2018,
        SUM(CASE WHEN ano_eleicao = 2022 THEN qt_eleitores_perfil ELSE 0 END) as total_2022
      FROM perfil_eleitor_secao
      WHERE ano_eleicao IN (2018, 2022)
      GROUP BY ds_genero
      ORDER BY total_2022 DESC
    `;
    const generoResult = await db.query(generoQuery);

    // Comparativo por escolaridade
    const escolaridadeQuery = `
      SELECT 
        ds_grau_escolaridade,
        SUM(CASE WHEN ano_eleicao = 2018 THEN qt_eleitores_perfil ELSE 0 END) as total_2018,
        SUM(CASE WHEN ano_eleicao = 2022 THEN qt_eleitores_perfil ELSE 0 END) as total_2022
      FROM perfil_eleitor_secao
      WHERE ano_eleicao IN (2018, 2022)
      GROUP BY ds_grau_escolaridade
      ORDER BY total_2022 DESC
    `;
    const escolaridadeResult = await db.query(escolaridadeQuery);

    // Comparativo por faixa etária
    const faixaEtariaQuery = `
      SELECT 
        ds_faixa_etaria,
        SUM(CASE WHEN ano_eleicao = 2018 THEN qt_eleitores_perfil ELSE 0 END) as total_2018,
        SUM(CASE WHEN ano_eleicao = 2022 THEN qt_eleitores_perfil ELSE 0 END) as total_2022
      FROM perfil_eleitor_secao
      WHERE ano_eleicao IN (2018, 2022)
      GROUP BY ds_faixa_etaria
      ORDER BY ds_faixa_etaria
    `;
    const faixaEtariaResult = await db.query(faixaEtariaQuery);

    // Totais gerais
    const totalQuery = `
      SELECT 
        SUM(CASE WHEN ano_eleicao = 2018 THEN qt_eleitores_perfil ELSE 0 END) as total_2018,
        SUM(CASE WHEN ano_eleicao = 2022 THEN qt_eleitores_perfil ELSE 0 END) as total_2022
      FROM perfil_eleitor_secao
      WHERE ano_eleicao IN (2018, 2022)
    `;
    const totalResult = await db.query(totalQuery);

    const total2018 = parseInt(totalResult.rows[0].total_2018) || 0;
    const total2022 = parseInt(totalResult.rows[0].total_2022) || 0;
    const crescimento = total2018 > 0 ? ((total2022 - total2018) / total2018 * 100).toFixed(2) : 0;

    res.json({
      success: true,
      comparativo: {
        totais: {
          eleitores_2018: total2018,
          eleitores_2022: total2022,
          crescimento_percentual: parseFloat(crescimento)
        },
        genero: generoResult.rows,
        escolaridade: escolaridadeResult.rows,
        faixa_etaria: faixaEtariaResult.rows
      }
    });
  } catch (error) {
    console.error('Erro ao buscar comparativo temporal:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
