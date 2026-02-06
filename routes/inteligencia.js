const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/inteligencia/oportunidades
router.get('/oportunidades', async (req, res) => {
    try {
        const {
            candidato_id,
            eleicao_id,
            ano_eleicao, // ano da base demográfica (ex: 2022)
            criterio, // 'faixa_etaria', 'escolaridade', 'genero'
            valor, // ex: '21 A 24 ANOS'
            min_perfil_pct = 20, // mínimo % da população com esse perfil
            max_votos_pct = 10,   // máximo % de votos obtidos
            min_eleitorado = 1000 // ignorar cidades muito pequenas
        } = req.query;

        if (!candidato_id || !eleicao_id || !criterio || !valor) {
            return res.status(400).json({ error: 'Parâmetros obrigatórios: candidato_id, eleicao_id, criterio, valor' });
        }

        // Mapear critério para coluna do banco
        const colunaMap = {
            'faixa_etaria': 'ds_faixa_etaria',
            'escolaridade': 'ds_grau_escolaridade',
            'genero': 'ds_genero'
        };
        const coluna = colunaMap[criterio];

        if (!coluna) {
            return res.status(400).json({ error: 'Critério inválido' });
        }

        const query = `
            WITH stats_eleitorado AS (
                -- Total de eleitores e total do perfil alvo por município
                SELECT 
                    cd_municipio,
                    SUM(qt_eleitores_perfil) as total_eleitores,
                    SUM(CASE WHEN ${coluna} ILIKE $1 THEN qt_eleitores_perfil ELSE 0 END) as total_perfil
                FROM perfil_eleitor_secao
                WHERE ano_eleicao = $2
                GROUP BY cd_municipio
            ),
            stats_votos AS (
                -- Total de votos do candidato e total de votos da eleição por município
                SELECT 
                    m.codigo as cd_municipio_tse,
                    SUM(CASE WHEN v.candidato_id = $3 THEN v.quantidade_votos ELSE 0 END) as votos_candidato,
                    SUM(v.quantidade_votos) as total_votos_cidade
                FROM votos v
                JOIN municipios m ON v.municipio_id = m.id
                WHERE v.eleicao_id = $4
                GROUP BY m.codigo
            )
            SELECT 
                m.nome as municipio,
                m.sigla_uf,
                s.total_eleitores,
                s.total_perfil,
                ROUND((s.total_perfil::numeric / NULLIF(s.total_eleitores, 0)) * 100, 2) as perfil_pct,
                COALESCE(v.votos_candidato, 0) as votos_candidato,
                COALESCE(v.total_votos_cidade, 0) as total_votos_cidade,
                ROUND((COALESCE(v.votos_candidato, 0)::numeric / NULLIF(COALESCE(v.total_votos_cidade, 0), 0)) * 100, 2) as votos_pct
            FROM stats_eleitorado s
            JOIN municipios m ON m.codigo = s.cd_municipio
            LEFT JOIN stats_votos v ON v.cd_municipio_tse = s.cd_municipio
            WHERE 
                s.total_eleitores >= $5 AND
                (s.total_perfil::numeric / NULLIF(s.total_eleitores, 0)) * 100 >= $6 AND
                (COALESCE(v.votos_candidato, 0)::numeric / NULLIF(COALESCE(v.total_votos_cidade, 0), 0)) * 100 <= $7
            ORDER BY perfil_pct DESC
            LIMIT 50;
        `;

        // Adiciona wildcards para busca parcial case-insensitive
        const valorBusca = `%${valor}%`;

        // Converter para números
        const numAnoEleicao = ano_eleicao || '2022';
        const numMinEleitorado = parseInt(min_eleitorado) || 1000;
        const numMinPerfilPct = parseFloat(min_perfil_pct) || 5;
        const numMaxVotosPct = parseFloat(max_votos_pct) || 50;

        console.log('🔍 Busca de oportunidades:', {
            candidato_id,
            eleicao_id,
            ano_eleicao: numAnoEleicao,
            criterio,
            coluna,
            valor,
            valorBusca,
            min_eleitorado: numMinEleitorado,
            min_perfil_pct: numMinPerfilPct,
            max_votos_pct: numMaxVotosPct
        });

        const params = [
            valorBusca,
            numAnoEleicao,
            candidato_id,
            eleicao_id,
            numMinEleitorado,
            numMinPerfilPct,
            numMaxVotosPct
        ];

        const result = await db.query(query, params);

        console.log('📊 Oportunidades encontradas:', result.rows.length);

        res.json({
            success: true,
            data: result.rows,
            meta: {
                criterio,
                valor,
                min_perfil_pct,
                max_votos_pct
            }
        });

    } catch (error) {
        console.error('Erro em oportunidades:', error);
        res.status(500).json({ error: 'Erro interno ao processar oportunidades' });
    }
});

// GET /api/inteligencia/similares/:municipio_id
router.get('/similares/:municipio_id', async (req, res) => {
    try {
        const { municipio_id } = req.params;
        const { ano_eleicao = '2022' } = req.query;

        // 1. Buscar perfil demográfico de TODAS as cidades
        // Criar vetor: [pct_masculino, pct_superior, pct_jovem, pct_idoso]
        const query = `
            SELECT 
                m.id, 
                m.nome, 
                m.sigla_uf,
                SUM(p.qt_eleitores_perfil) as total,
                SUM(CASE WHEN p.ds_genero = 'MASCULINO' THEN p.qt_eleitores_perfil ELSE 0 END)::numeric / NULLIF(SUM(p.qt_eleitores_perfil), 0) as pct_masc,
                SUM(CASE WHEN p.ds_grau_escolaridade IN ('SUPERIOR COMPLETO', 'SUPERIOR INCOMPLETO') THEN p.qt_eleitores_perfil ELSE 0 END)::numeric / NULLIF(SUM(p.qt_eleitores_perfil), 0) as pct_superior,
                SUM(CASE WHEN p.ds_faixa_etaria IN ('16 A 17 ANOS', '18 A 20 ANOS', '21 A 24 ANOS') THEN p.qt_eleitores_perfil ELSE 0 END)::numeric / NULLIF(SUM(p.qt_eleitores_perfil), 0) as pct_jovem,
                SUM(CASE WHEN p.ds_faixa_etaria IN ('60 A 69 ANOS', '70 A 79 ANOS', '79 ANOS') THEN p.qt_eleitores_perfil ELSE 0 END)::numeric / NULLIF(SUM(p.qt_eleitores_perfil), 0) as pct_idoso
            FROM perfil_eleitor_secao p
            JOIN municipios m ON p.cd_municipio = m.codigo
            WHERE p.ano_eleicao = $1
            GROUP BY m.id, m.nome, m.sigla_uf
            HAVING SUM(p.qt_eleitores_perfil) > 0
        `;

        const result = await db.query(query, [ano_eleicao]);
        const cidades = result.rows;

        // 2. Encontrar cidade alvo
        const alvo = cidades.find(c => c.id == municipio_id);

        if (!alvo) {
            return res.status(404).json({ error: 'Município não encontrado na base demográfica' });
        }

        // 3. Calcular distâncias
        const similares = cidades
            .filter(c => c.id != municipio_id)
            .map(c => {
                const dist = Math.sqrt(
                    Math.pow(c.pct_masc - alvo.pct_masc, 2) +
                    Math.pow(c.pct_superior - alvo.pct_superior, 2) +
                    Math.pow(c.pct_jovem - alvo.pct_jovem, 2) +
                    Math.pow(c.pct_idoso - alvo.pct_idoso, 2)
                );
                return { ...c, distancia: dist };
            })
            .sort((a, b) => a.distancia - b.distancia)
            .slice(0, 10); // Top 10

        res.json({
            success: true,
            alvo,
            similares
        });

    } catch (error) {
        console.error('Erro em similares:', error);
        res.status(500).json({ error: 'Erro interno ao buscar cidades similares' });
    }
});

// GET /api/inteligencia/eficiencia
router.get('/eficiencia', async (req, res) => {
    try {
        const { eleicao_id, cargo_filtro, ordenar_por = 'custo_crescente' } = req.query;

        // Query principal juntando votos e candidatos
        const query = `
            SELECT 
                c.id,
                c.nome_urna,
                c.sigla_partido,
                c.cargo,
                c.vr_despesa_max_campanha as despesa,
                SUM(v.quantidade_votos) as votos,
                (c.vr_despesa_max_campanha::numeric / NULLIF(SUM(v.quantidade_votos), 0)) as custo_por_voto
            FROM votos v
            JOIN candidatos c ON v.candidato_id = c.id
            WHERE c.vr_despesa_max_campanha IS NOT NULL AND c.vr_despesa_max_campanha > 0
            ${eleicao_id ? `AND v.eleicao_id = $1` : ''}
            ${cargo_filtro ? `AND c.cargo ILIKE $${eleicao_id ? 2 : 1}` : ''}
            GROUP BY c.id, c.nome_urna, c.sigla_partido, c.cargo, c.vr_despesa_max_campanha
            HAVING SUM(v.quantidade_votos) > 0
            ORDER BY custo_por_voto ${ordenar_por === 'custo_decrescente' ? 'DESC' : 'ASC'}
            LIMIT 50
        `;

        const params = [];
        if (eleicao_id) params.push(eleicao_id);
        if (cargo_filtro) params.push(`%${cargo_filtro}%`);

        const result = await db.query(query, params);

        res.json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Erro em eficiência:', error);
        res.status(500).json({ error: 'Erro interno ao calcular eficiência' });
    }
});

// GET /api/inteligencia/projecao
router.get('/projecao', async (req, res) => {
    try {
        const { meta_votos, eleicao_id, candidato_id } = req.query;

        if (!meta_votos || !eleicao_id || !candidato_id) {
            return res.status(400).json({ error: 'Parâmetros obrigatórios: meta_votos, eleicao_id, candidato_id' });
        }

        const meta = parseInt(meta_votos);

        // 1. Buscar distribuição de votos atual (Baseline)
        const query = `
            SELECT 
                m.nome as municipio,
                m.sigla_uf,
                SUM(v.quantidade_votos) as votos_atuais
            FROM votos v
            JOIN municipios m ON v.municipio_id = m.id
            WHERE v.eleicao_id = $1 AND v.candidato_id = $2
            GROUP BY m.nome, m.sigla_uf
            ORDER BY votos_atuais DESC
        `;

        const result = await db.query(query, [eleicao_id, candidato_id]);

        if (result.rows.length === 0) {
            return res.json({ success: true, data: [], message: 'Sem histórico de votos para gerar base.' });
        }

        // 2. Calcular total atual
        const totalAtual = result.rows.reduce((acc, r) => acc + parseInt(r.votos_atuais), 0);

        // 3. Projetar meta
        const projecao = result.rows.map(r => {
            const peso = parseInt(r.votos_atuais) / totalAtual; // % de contribuição do município
            const metaMunicipal = Math.round(meta * peso);
            const crescimento = metaMunicipal - parseInt(r.votos_atuais);

            return {
                municipio: r.municipio,
                uf: r.sigla_uf,
                votos_base: parseInt(r.votos_atuais),
                contribuicao_pct: (peso * 100).toFixed(2),
                meta_votos: metaMunicipal,
                necessario_adicional: Math.max(0, crescimento)
            };
        });

        res.json({
            success: true,
            total_base: totalAtual,
            meta_global: meta,
            fator_crescimento: (meta / totalAtual).toFixed(2),
            data: projecao
        });

    } catch (error) {
        console.error('Erro em projeção:', error);
        res.status(500).json({ error: 'Erro interno ao gerar projeção' });
    }
});

// GET /api/inteligencia/migracao
router.get('/migracao', async (req, res) => {
    try {
        const { eleicao_a, candidato_a, eleicao_b, candidato_b } = req.query;

        if (!eleicao_a || !candidato_a || !eleicao_b || !candidato_b) {
            return res.status(400).json({ error: 'Parâmetros obrigatórios: eleicao_a, candidato_a, eleicao_b, candidato_b' });
        }

        const query = `
            WITH votos_a AS (
                SELECT 
                    m.codigo as cod_tse,
                    m.nome,
                    m.sigla_uf,
                    SUM(v.quantidade_votos) as votos
                FROM votos v
                JOIN municipios m ON v.municipio_id = m.id
                WHERE v.eleicao_id = $1 AND v.candidato_id = $2
                GROUP BY m.codigo, m.nome, m.sigla_uf
            ),
            votos_b AS (
                SELECT 
                    m.codigo as cod_tse,
                    SUM(v.quantidade_votos) as votos
                FROM votos v
                JOIN municipios m ON v.municipio_id = m.id
                WHERE v.eleicao_id = $3 AND v.candidato_id = $4
                GROUP BY m.codigo
            )
            SELECT 
                a.nome as municipio,
                a.sigla_uf,
                COALESCE(a.votos, 0) as votos_antigos,
                COALESCE(b.votos, 0) as votos_novos,
                (COALESCE(b.votos, 0) - COALESCE(a.votos, 0)) as variacao_absoluta,
                CASE 
                    WHEN COALESCE(a.votos, 0) = 0 THEN 100 
                    ELSE ROUND(((COALESCE(b.votos, 0) - COALESCE(a.votos, 0))::numeric / a.votos) * 100, 2)
                END as variacao_perc
            FROM votos_a a
            FULL OUTER JOIN votos_b b ON a.cod_tse = b.cod_tse
            WHERE COALESCE(a.votos, 0) > 0 OR COALESCE(b.votos, 0) > 0
            ORDER BY variacao_absoluta DESC
        `;

        const result = await db.query(query, [eleicao_a, candidato_a, eleicao_b, candidato_b]);

        // Calcular totais
        const totalA = result.rows.reduce((sum, r) => sum + parseInt(r.votos_antigos), 0);
        const totalB = result.rows.reduce((sum, r) => sum + parseInt(r.votos_novos), 0);

        res.json({
            success: true,
            total_anterior: totalA,
            total_atual: totalB,
            variacao_total_perc: totalA > 0 ? (((totalB - totalA) / totalA) * 100).toFixed(2) : 100,
            data: result.rows
        });

    } catch (error) {
        console.error('Erro em migração:', error);
        res.status(500).json({ error: 'Erro interno ao gerar matriz de migração' });
    }
});

module.exports = router;
