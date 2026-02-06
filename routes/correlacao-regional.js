// Routes para correlação regional - Análise PSDB
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/correlacao-regional/potencial-crescimento
// Cruza filiados PSDB com perfil demográfico para identificar potencial de crescimento
router.get('/potencial-crescimento', async (req, res) => {
  try {
    const query = `
      WITH demografico AS (
        SELECT 
          cd_municipio,
          nm_municipio,
          SUM(qt_eleitores_perfil) as total_eleitores,
          SUM(CASE WHEN ds_grau_escolaridade ILIKE '%SUPERIOR%' THEN qt_eleitores_perfil ELSE 0 END) * 100.0 / 
            NULLIF(SUM(qt_eleitores_perfil), 0) as pct_superior,
          SUM(CASE WHEN ds_faixa_etaria ILIKE '%25%' OR ds_faixa_etaria ILIKE '%34%' 
                    OR ds_faixa_etaria ILIKE '%35%' OR ds_faixa_etaria ILIKE '%44%'
              THEN qt_eleitores_perfil ELSE 0 END) * 100.0 / 
            NULLIF(SUM(qt_eleitores_perfil), 0) as pct_adultos_jovens
        FROM perfil_eleitor_secao
        WHERE ano_eleicao = 2022
        GROUP BY cd_municipio, nm_municipio
      ),
      regionais AS (
        SELECT 
          m.codigo,
          m.nome,
          rp.nome as regional,
          mr.filiados_psdb_2024 as filiados,
          mr.populacao_2024 as populacao
        FROM municipios m
        LEFT JOIN municipios_regionais mr ON m.nome = mr.nome
        LEFT JOIN regionais_psdb rp ON mr.regional_psdb_id = rp.id
      )
      SELECT 
        COALESCE(r.nome, d.nm_municipio) as municipio,
        r.regional,
        d.total_eleitores,
        COALESCE(r.filiados, 0) as filiados,
        CASE WHEN d.total_eleitores > 0 
          THEN ROUND((COALESCE(r.filiados, 0) * 1000.0 / d.total_eleitores)::numeric, 2)
          ELSE 0 
        END as taxa_filiacao_por_mil,
        ROUND(d.pct_superior::numeric, 1) as pct_superior,
        ROUND(d.pct_adultos_jovens::numeric, 1) as pct_adultos_jovens,
        CASE 
          WHEN d.pct_superior > 15 AND d.pct_adultos_jovens > 30 AND COALESCE(r.filiados, 0) * 1000.0 / NULLIF(d.total_eleitores, 0) < 2 
            THEN 'ALTO'
          WHEN d.pct_superior > 10 AND d.pct_adultos_jovens > 25 
            THEN 'MÉDIO'
          ELSE 'BAIXO'
        END as potencial_crescimento
      FROM demografico d
      LEFT JOIN regionais r ON d.cd_municipio::text = r.codigo::text
      WHERE d.total_eleitores > 10000
      ORDER BY 
        CASE 
          WHEN d.pct_superior > 15 AND d.pct_adultos_jovens > 30 THEN 1
          WHEN d.pct_superior > 10 THEN 2
          ELSE 3
        END,
        d.total_eleitores DESC
      LIMIT 30
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      potencial_crescimento: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar potencial de crescimento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/correlacao-regional/comparativo
// Compara regionais por indicadores demográficos
router.get('/comparativo', async (req, res) => {
  try {
    const query = `
      SELECT 
        rp.nome as regional,
        COUNT(DISTINCT m.id) as total_municipios,
        SUM(mr.filiados_psdb_2024) as total_filiados,
        SUM(mr.populacao_2024) as total_populacao,
        ROUND(SUM(mr.filiados_psdb_2024) * 1000.0 / NULLIF(SUM(mr.populacao_2024), 0), 2) as taxa_filiacao_por_mil
      FROM municipios m
      INNER JOIN municipios_regionais mr ON m.nome = mr.nome
      INNER JOIN regionais_psdb rp ON mr.regional_psdb_id = rp.id
      WHERE rp.nome IS NOT NULL
      GROUP BY rp.nome
      ORDER BY total_filiados DESC
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      comparativo_regionais: result.rows
    });
  } catch (error) {
    console.error('Erro ao buscar comparativo de regionais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/correlacao-regional/demografico-regional/:regional
// Perfil demográfico de uma regional PSDB
router.get('/demografico-regional/:regional', async (req, res) => {
  try {
    const { regional } = req.params;

    const query = `
      WITH municipios_regional AS (
        SELECT m.codigo
        FROM municipios_regionais mr
        JOIN regionais_psdb rp ON mr.regional_psdb_id = rp.id
        JOIN municipios m ON mr.nome = m.nome
        WHERE rp.nome = $1
      )
      SELECT 
        ds_genero,
        ds_grau_escolaridade,
        ds_faixa_etaria,
        SUM(qt_eleitores_perfil) as total
      FROM perfil_eleitor_secao p
      WHERE p.cd_municipio::text IN (SELECT codigo::text FROM municipios_regional)
        AND p.ano_eleicao = 2022
      GROUP BY ds_genero, ds_grau_escolaridade, ds_faixa_etaria
      ORDER BY total DESC
    `;

    const result = await db.query(query, [regional]);

    // Agregar por categoria
    const porGenero = {};
    const porEscolaridade = {};
    const porFaixaEtaria = {};

    result.rows.forEach(row => {
      const total = parseInt(row.total);

      if (!porGenero[row.ds_genero]) porGenero[row.ds_genero] = 0;
      porGenero[row.ds_genero] += total;

      if (!porEscolaridade[row.ds_grau_escolaridade]) porEscolaridade[row.ds_grau_escolaridade] = 0;
      porEscolaridade[row.ds_grau_escolaridade] += total;

      if (!porFaixaEtaria[row.ds_faixa_etaria]) porFaixaEtaria[row.ds_faixa_etaria] = 0;
      porFaixaEtaria[row.ds_faixa_etaria] += total;
    });

    res.json({
      success: true,
      regional,
      perfil: {
        genero: Object.entries(porGenero).map(([k, v]) => ({ categoria: k, total: v })),
        escolaridade: Object.entries(porEscolaridade).map(([k, v]) => ({ categoria: k, total: v })),
        faixa_etaria: Object.entries(porFaixaEtaria).map(([k, v]) => ({ categoria: k, total: v }))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar perfil demográfico da regional:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
