const fs = require('fs');
const csv = require('csv-parser');
const db = require('./config/database');

async function importarDadosCandidatos() {
  try {
    console.log('Importando dados de candidatos de 2022...\n');
    
    const arquivo = './DADOS/consulta_cand_2022_SC.csv';
    const candidatos = [];
    
    // Ler arquivo CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(arquivo)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          // Processar linha do CSV
          const candidato = {
            ano_eleicao: parseInt(row.ANO_ELEICAO?.replace(/[^\d]/g, '') || '0'),
            cd_cargo: parseInt(row.CD_CARGO?.replace(/[^\d]/g, '') || '0'),
            ds_cargo: row.DS_CARGO?.trim(),
            sq_candidato: parseInt(row.SQ_CANDIDATO?.replace(/[^\d]/g, '') || '0'),
            nr_candidato: parseInt(row.NR_CANDIDATO?.replace(/[^\d]/g, '') || '0'),
            nm_candidato: row.NM_CANDIDATO?.trim(),
            nm_urna_candidato: row.NM_URNA_CANDIDATO?.trim(),
            nm_social_candidato: row.NM_SOCIAL_CANDIDATO?.trim(),
            nr_cpf_candidato: row.NR_CPF_CANDIDATO?.trim(),
            ds_email: row.DS_EMAIL?.trim(),
            cd_situacao_candidatura: parseInt(row.CD_SITUACAO_CANDIDATURA?.replace(/[^\d]/g, '') || '0'),
            ds_situacao_candidatura: row.DS_SITUACAO_CANDIDATURA?.trim(),
            tp_agremiacao: row.TP_AGREMIACAO?.trim(),
            nr_partido: parseInt(row.NR_PARTIDO?.replace(/[^\d]/g, '') || '0'),
            sg_partido: row.SG_PARTIDO?.trim(),
            nm_partido: row.NM_PARTIDO?.trim(),
            nr_federacao: parseInt(row.NR_FEDERACAO?.replace(/[^\d]/g, '') || '0'),
            nm_federacao: row.NM_FEDERACAO?.trim(),
            sg_federacao: row.SG_FEDERACAO?.trim(),
            ds_composicao_federacao: row.DS_COMPOSICAO_FEDERACAO?.trim(),
            sq_coligacao: parseInt(row.SQ_COLIGACAO?.replace(/[^\d]/g, '') || '0'),
            nm_coligacao: row.NM_COLIGACAO?.trim(),
            ds_composicao_coligacao: row.DS_COMPOSICAO_COLIGACAO?.trim(),
            sg_uf_nascimento: row.SG_UF_NASCIMENTO?.trim(),
            dt_nascimento: row.DT_NASCIMENTO?.trim(),
            nr_titulo_eleitoral_candidato: row.NR_TITULO_ELEITORAL_CANDIDATO?.trim(),
            cd_genero: parseInt(row.CD_GENERO?.replace(/[^\d]/g, '') || '0'),
            ds_genero: row.DS_GENERO?.trim(),
            cd_grau_instrucao: parseInt(row.CD_GRAU_INSTRUCAO?.replace(/[^\d]/g, '') || '0'),
            ds_grau_instrucao: row.DS_GRAU_INSTRUCAO?.trim(),
            cd_estado_civil: parseInt(row.CD_ESTADO_CIVIL?.replace(/[^\d]/g, '') || '0'),
            ds_estado_civil: row.DS_ESTADO_CIVIL?.trim(),
            cd_cor_raca: parseInt(row.CD_COR_RACA?.replace(/[^\d]/g, '') || '0'),
            ds_cor_raca: row.DS_COR_RACA?.trim(),
            cd_ocupacao: parseInt(row.CD_OCUPACAO?.replace(/[^\d]/g, '') || '0'),
            ds_ocupacao: row.DS_OCUPACAO?.trim(),
            cd_sit_tot_turno: parseInt(row.CD_SIT_TOT_TURNO?.replace(/[^\d]/g, '') || '0'),
            ds_sit_tot_turno: row.DS_SIT_TOT_TURNO?.trim()
          };
          
          // Filtrar apenas candidatos válidos
          if (candidato.ano_eleicao === 2022 && candidato.nm_candidato && candidato.nr_candidato > 0) {
            candidatos.push(candidato);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`Encontrados ${candidatos.length} candidatos no arquivo`);
    
    // Buscar eleição de 2022
    const eleicaoQuery = `
      SELECT id FROM eleicoes WHERE ano = 2022 ORDER BY id LIMIT 1
    `;
    
    const eleicao = await db.query(eleicaoQuery);
    if (eleicao.rows.length === 0) {
      console.error('❌ Eleição de 2022 não encontrada');
      process.exit(1);
    }
    
    const eleicaoId = eleicao.rows[0].id;
    console.log(`📊 Eleição 2022 encontrada - ID: ${eleicaoId}`);
    
    // Atualizar candidatos existentes com dados de partido
    let atualizados = 0;
    let criados = 0;
    let erros = 0;
    
    for (const candidato of candidatos) {
      try {
        // Buscar candidato existente por nome e número
        const candidatoExistenteQuery = `
          SELECT id, nome, cargo, numero, partido
          FROM candidatos c
          WHERE c.eleicao_id = $1 
            AND c.nome = $2 
            AND c.numero = $3
        `;
        
        const candidatoExistente = await db.query(candidatoExistenteQuery, [
          eleicaoId,
          candidato.nm_candidato,
          candidato.nr_candidato.toString()
        ]);
        
        if (candidatoExistente.rows.length > 0) {
          // Atualizar candidato existente
          const updateQuery = `
            UPDATE candidatos 
            SET partido = $1, 
                cargo = $2,
                nome_urna = $3,
                nome_social = $4,
                cpf = $5,
                email = $6,
                situacao_candidatura = $7,
                descricao_situacao_candidatura = $8,
                tipo_agremiacao = $9,
                numero_partido = $10,
                sigla_partido = $11,
                nome_partido = $12,
                numero_federacao = $13,
                nome_federacao = $14,
                sigla_federacao = $15,
                composicao_federacao = $16,
                numero_coligacao = $17,
                nome_coligacao = $18,
                composicao_coligacao = $19,
                uf_nascimento = $20,
                data_nascimento = $21,
                titulo_eleitoral = $22,
                genero = $23,
                descricao_genero = $24,
                grau_instrucao = $25,
                descricao_grau_instrucao = $26,
                estado_civil = $27,
                descricao_estado_civil = $28,
                cor_raca = $29,
                descricao_cor_raca = $30,
                ocupacao = $31,
                descricao_ocupacao = $32,
                situacao_totalizacao_turno = $33,
                descricao_situacao_totalizacao_turno = $34
            WHERE id = $35
            RETURNING id, nome, partido
          `;
          
          const updateResult = await db.query(updateQuery, [
            candidato.nm_partido || null,
            candidato.ds_cargo || null,
            candidato.nm_urna_candidato || null,
            candidato.nm_social_candidato || null,
            candidato.nr_cpf_candidato || null,
            candidato.ds_email || null,
            candidato.cd_situacao_candidatura || null,
            candidato.ds_situacao_candidatura || null,
            candidato.tp_agremiacao || null,
            candidato.nr_partido || null,
            candidato.sg_partido || null,
            candidato.nm_partido || null,
            candidato.nr_federacao || null,
            candidato.nm_federacao || null,
            candidato.sg_federacao || null,
            candidato.ds_composicao_federacao || null,
            candidato.sq_coligacao || null,
            candidato.nm_coligacao || null,
            candidato.ds_composicao_coligacao || null,
            candidato.sg_uf_nascimento || null,
            candidato.dt_nascimento || null,
            candidato.nr_titulo_eleitoral_candidato || null,
            candidato.cd_genero || null,
            candidato.ds_genero || null,
            candidato.cd_grau_instrucao || null,
            candidato.ds_grau_instrucao || null,
            candidato.cd_estado_civil || null,
            candidato.ds_estado_civil || null,
            candidato.cd_cor_raca || null,
            candidato.ds_cor_raca || null,
            candidato.cd_ocupacao || null,
            candidato.ds_ocupacao || null,
            candidato.cd_sit_tot_turno || null,
            candidato.ds_sit_tot_turno || null,
            candidatoExistente.rows[0].id
          ]);
          
          console.log(`✅ Atualizado: ${updateResult.rows[0].nome} - Partido: ${updateResult.rows[0].partido || 'N/A'}`);
          atualizados++;
          
        } else {
          // Criar novo candidato
          const insertQuery = `
            INSERT INTO candidatos (
              nome, cargo, numero, partido, eleicao_id,
              nome_urna, nome_social, cpf, email, situacao_candidatura,
              descricao_situacao_candidatura, tipo_agremiacao, numero_partido,
              sigla_partido, nome_partido, numero_federacao, nome_federacao,
              sigla_federacao, composicao_federacao, numero_coligacao,
              nome_coligacao, composicao_coligacao, uf_nascimento,
              data_nascimento, titulo_eleitoral, genero, descricao_genero,
              grau_instrucao, descricao_grau_instrucao, estado_civil,
              descricao_estado_civil, cor_raca, descricao_cor_raca,
              ocupacao, descricao_ocupacao, situacao_totalizacao_turno,
              descricao_situacao_totalizacao_turno
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
              $31, $32, $33, $34, $35, $36, $37, $38
            )
            RETURNING id, nome, partido
          `;
          
          const insertResult = await db.query(insertQuery, [
            candidato.nm_candidato,
            candidato.ds_cargo,
            candidato.nr_candidato.toString(),
            candidato.nm_partido || null,
            eleicaoId,
            candidato.nm_urna_candidato || null,
            candidato.nm_social_candidato || null,
            candidato.nr_cpf_candidato || null,
            candidato.ds_email || null,
            candidato.cd_situacao_candidatura || null,
            candidato.ds_situacao_candidatura || null,
            candidato.tp_agremiacao || null,
            candidato.nr_partido || null,
            candidato.sg_partido || null,
            candidato.nm_partido || null,
            candidato.nr_federacao || null,
            candidato.nm_federacao || null,
            candidato.sg_federacao || null,
            candidato.ds_composicao_federacao || null,
            candidato.sq_coligacao || null,
            candidato.nm_coligacao || null,
            candidato.ds_composicao_coligacao || null,
            candidato.sg_uf_nascimento || null,
            candidato.dt_nascimento || null,
            candidato.nr_titulo_eleitoral_candidato || null,
            candidato.cd_genero || null,
            candidato.ds_genero || null,
            candidato.cd_grau_instrucao || null,
            candidato.ds_grau_instrucao || null,
            candidato.cd_estado_civil || null,
            candidato.ds_estado_civil || null,
            candidato.cd_cor_raca || null,
            candidato.ds_cor_raca || null,
            candidato.cd_ocupacao || null,
            candidato.ds_ocupacao || null,
            candidato.cd_sit_tot_turno || null,
            candidato.ds_sit_tot_turno || null
          ]);
          
          console.log(`✅ Criado: ${insertResult.rows[0].nome} - Partido: ${insertResult.rows[0].partido || 'N/A'}`);
          criados++;
        }
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${candidato.nm_candidato}:`, error.message);
        erros++;
      }
    }
    
    console.log('\n🎉 Importação concluída!');
    console.log(`- Candidatos atualizados: ${atualizados}`);
    console.log(`- Candidatos criados: ${criados}`);
    console.log(`- Erros: ${erros}`);
    
    // Verificar resultado
    const verificacaoQuery = `
      SELECT 
        c.nome,
        c.partido,
        c.cargo,
        c.numero,
        COUNT(v.id) as registros_votos,
        SUM(v.quantidade_votos) as total_votos
      FROM candidatos c
      LEFT JOIN votos v ON c.id = v.candidato_id
      JOIN eleicoes e ON c.eleicao_id = e.id
      WHERE e.ano = 2022 AND c.partido IS NOT NULL
      GROUP BY c.id, c.nome, c.partido, c.cargo, c.numero
      ORDER BY total_votos DESC
      LIMIT 10
    `;
    
    const verificacao = await db.query(verificacaoQuery);
    console.log('\nVerificação - Candidatos com partido em 2022:');
    verificacao.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.nome} (${row.numero}) - ${row.partido} - ${parseInt(row.total_votos || 0).toLocaleString('pt-BR')} votos`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

importarDadosCandidatos();

