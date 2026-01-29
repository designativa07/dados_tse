const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/ranking/top-candidatos
// Retorna os top N candidatos mais votados por município e cargo
router.get('/top-candidatos', async (req, res) => {
    try {
        const {
            eleicao_id,
            municipio_id,
            limit = 10
        } = req.query;

        // Se nenhum ID de eleição for fornecido, tente pegar o mais recente ou retorne erro
        // Por enquanto vamos deixar opcional, mas o ideal é filtrar

        let whereConditions = [];
        let params = [];
        let paramCount = 0;

        // Filtro por cargos fixos conforme pedido
        const cargosFiltro = ['Deputado Estadual', 'Deputado Federal'];

        let baseQuery = `
      WITH RankedVotes AS (
        SELECT 
          m.id AS municipio_id,
          m.nome AS municipio_nome,
          c.id AS candidato_id,
          c.nome AS candidato_nome,
          c.nome_urna,
          c.partido AS candidato_partido,
          c.sigla_partido,
          c.cargo AS candidato_cargo,
          c.foto AS candidato_foto,
          SUM(v.quantidade_votos) AS total_votos,
          ROW_NUMBER() OVER (
            PARTITION BY m.id, c.cargo 
            ORDER BY SUM(v.quantidade_votos) DESC
          ) as rank
        FROM votos v
        JOIN candidatos c ON v.candidato_id = c.id
        JOIN municipios m ON v.municipio_id = m.id
        WHERE c.cargo IN ('Deputado Estadual', 'Deputado Federal')
    `;

        // params.push(cargosFiltro); // Removido temporariamente
        // paramCount = 1; // Ajustar contagem de parametros
        paramCount = 0;

        if (eleicao_id) {
            paramCount++;
            baseQuery += ` AND c.eleicao_id = $${paramCount}`;
            params.push(eleicao_id);
        }

        if (municipio_id) {
            paramCount++;
            baseQuery += ` AND m.id = $${paramCount}`;
            params.push(municipio_id);
        }

        // Filtros para evitar nulos ou brancos se necessário, mas geralmente eles tem cargo vazio ou nomes específicos
        // Vou assumir que cargo='DEPUTADO ESTADUAL' já filtra brancos/nulos da tabela de candidatos se estiverem cadastrados assim

        baseQuery += `
        GROUP BY m.id, m.nome, c.id, c.nome, c.nome_urna, c.partido, c.sigla_partido, c.cargo, c.foto
      )
      SELECT * FROM RankedVotes 
      WHERE rank <= $${paramCount + 1}
      ORDER BY municipio_nome, candidato_cargo, rank
    `;

        params.push(limit);

        console.log('Executando query de ranking...');
        const result = await db.query(baseQuery, params);

        // Agrupar o resultado por município para facilitar o frontend
        const agrupado = result.rows.reduce((acc, row) => {
            const munId = row.municipio_id;
            if (!acc[munId]) {
                acc[munId] = {
                    id: munId,
                    nome: row.municipio_nome,
                    cargos: {
                        'DEPUTADO ESTADUAL': [],
                        'DEPUTADO FEDERAL': []
                    }
                };
            }

            const cargoKey = row.candidato_cargo.toUpperCase();
            if (acc[munId].cargos[cargoKey]) {
                acc[munId].cargos[cargoKey].push({
                    id: row.candidato_id,
                    nome: row.candidato_nome,
                    nome_urna: row.nome_urna,
                    partido: row.sigla_partido || row.candidato_partido,
                    votos: parseInt(row.total_votos),
                    rank: parseInt(row.rank),
                    foto: row.candidato_foto
                });
            }
            return acc;
        }, {});

        res.json({
            success: true,
            data: Object.values(agrupado)
        });

    } catch (error) {
        console.error('Erro ao buscar ranking:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor ao buscar ranking'
        });
    }
});

module.exports = router;
