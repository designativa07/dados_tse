const db = require('../config/database');

async function debug() {
    try {
        console.log('Testing connection...');
        await db.query('SELECT 1');
        console.log('Connected.');

        // 1. Check verified candidate
        const candId = 2034; // Ana Campagnolo (Deputado Estadual 2022)
        const candRes = await db.query('SELECT * FROM candidatos WHERE id = $1', [candId]);
        console.log('Candidate:', candRes.rows[0].nome, candRes.rows[0].cargo, candRes.rows[0].eleicao_id);

        // 2. Check votes count
        const votosRes = await db.query('SELECT COUNT(*) FROM votos WHERE candidato_id = $1', [candId]);
        console.log('Total votes rows:', votosRes.rows[0].count);

        // 3. Check sample vote and municipality
        const sampleVote = await db.query('SELECT * FROM votos WHERE candidato_id = $1 LIMIT 1', [candId]);
        if (sampleVote.rows.length > 0) {
            console.log('Sample Vote:', sampleVote.rows[0]);
            const munId = sampleVote.rows[0].municipio_id;

            const munRes = await db.query('SELECT * FROM municipios WHERE id = $1', [munId]);
            console.log('Municipality:', munRes.rows[0]);
        } else {
            console.log('No votes found for candidate.');
        }

        // 4. Run the ranking query logic for this candidate
        const rankQuery = `
        SELECT 
          m.nome AS municipio_nome,
          c.nome AS candidato_nome,
          SUM(v.quantidade_votos) AS total_votos
        FROM votos v
        JOIN candidatos c ON v.candidato_id = c.id
        JOIN municipios m ON v.municipio_id = m.id
        WHERE c.id = $1
        GROUP BY m.nome, c.nome
        LIMIT 5
    `;
        const rankRes = await db.query(rankQuery, [candId]);
        console.log('Ranking Query Sample:', rankRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

debug();
