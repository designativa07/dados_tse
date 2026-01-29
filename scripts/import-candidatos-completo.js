const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/database');

// Função para padronizar cargos
function padronizarCargo(cargo) {
  if (!cargo) return cargo;
  
  // Converter para minúsculo primeiro
  let cargoPadronizado = cargo.toLowerCase();
  
  // Capitalizar primeira letra de cada palavra
  cargoPadronizado = cargoPadronizado.replace(/\b\w/g, l => l.toUpperCase());
  
  // Tratamentos especiais
  cargoPadronizado = cargoPadronizado
    .replace(/\b1º\b/g, '1º')
    .replace(/\b2º\b/g, '2º')
    .replace(/\bSuplente\b/g, 'Suplente')
    .replace(/\bVice\b/g, 'Vice')
    .replace(/\bGovernador\b/g, 'Governador')
    .replace(/\bDeputado\b/g, 'Deputado')
    .replace(/\bFederal\b/g, 'Federal')
    .replace(/\bEstadual\b/g, 'Estadual')
    .replace(/\bSenador\b/g, 'Senador');
  
  return cargoPadronizado;
}

async function importarCandidatosCompleto() {
  try {
    console.log('🚀 Iniciando importação completa de candidatos 2022...\n');
    
    const arquivo = './DADOS/consulta_cand_2022_SC.csv';
    const candidatos = [];
    
    // Ler arquivo CSV
    console.log('📖 Lendo arquivo CSV...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(arquivo)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          // Processar linha do CSV
          const candidato = {
            // Dados da eleição
            dt_geracao: row.DT_GERACAO?.trim(),
            hh_geracao: row.HH_GERACAO?.trim(),
            ano_eleicao: parseInt(row.ANO_ELEICAO?.replace(/[^\d]/g, '') || '0'),
            cd_tipo_eleicao: parseInt(row.CD_TIPO_ELEICAO?.replace(/[^\d]/g, '') || '0'),
            nm_tipo_eleicao: row.NM_TIPO_ELEICAO?.trim(),
            nr_turno: parseInt(row.NR_TURNO?.replace(/[^\d]/g, '') || '0'),
            cd_eleicao: row.CD_ELEICAO ? parseInt(row.CD_ELEICAO.replace(/[^\d]/g, '') || '0') : null,
            ds_eleicao: row.DS_ELEICAO?.trim(),
            dt_eleicao: row.DT_ELEICAO?.trim(),
            tp_abrangencia: row.TP_ABRANGENCIA?.trim(),
            sg_uf: row.SG_UF?.trim(),
            sg_ue: row.SG_UE?.trim(),
            nm_ue: row.NM_UE?.trim(),
            
            // Dados do cargo
            cd_cargo: parseInt(row.CD_CARGO?.replace(/[^\d]/g, '') || '0'),
            ds_cargo: padronizarCargo(row.DS_CARGO?.trim()),
            
            // Dados do candidato
            sq_candidato: row.SQ_CANDIDATO ? parseInt(row.SQ_CANDIDATO.replace(/[^\d]/g, '') || '0') : null,
            nr_candidato: parseInt(row.NR_CANDIDATO?.replace(/[^\d]/g, '') || '0'),
            nm_candidato: row.NM_CANDIDATO?.trim(),
            nm_urna_candidato: row.NM_URNA_CANDIDATO?.trim(),
            nm_social_candidato: row.NM_SOCIAL_CANDIDATO?.trim(),
            nr_cpf_candidato: row.NR_CPF_CANDIDATO?.trim(),
            ds_email: row.DS_EMAIL?.trim(),
            
            // Situação da candidatura
            cd_situacao_candidatura: parseInt(row.CD_SITUACAO_CANDIDATURA?.replace(/[^\d]/g, '') || '0'),
            ds_situacao_candidatura: row.DS_SITUACAO_CANDIDATURA?.trim(),
            
            // Dados do partido/agremiação
            tp_agremiacao: row.TP_AGREMIACAO?.trim(),
            nr_partido: parseInt(row.NR_PARTIDO?.replace(/[^\d]/g, '') || '0'),
            sg_partido: row.SG_PARTIDO?.trim(),
            nm_partido: row.NM_PARTIDO?.trim(),
            
            // Dados da federação
            nr_federacao: row.NR_FEDERACAO ? (row.NR_FEDERACAO === '-1' || row.NR_FEDERACAO === '#NULO' ? null : parseInt(row.NR_FEDERACAO.replace(/[^\d]/g, '') || '0')) : null,
            nm_federacao: row.NM_FEDERACAO?.trim(),
            sg_federacao: row.SG_FEDERACAO?.trim(),
            ds_composicao_federacao: row.DS_COMPOSICAO_FEDERACAO?.trim(),
            
            // Dados da coligação
            sq_coligacao: row.SQ_COLIGACAO ? (row.SQ_COLIGACAO === '-1' || row.SQ_COLIGACAO === '#NULO' ? null : parseInt(row.SQ_COLIGACAO.replace(/[^\d]/g, '') || '0')) : null,
            nm_coligacao: row.NM_COLIGACAO?.trim(),
            ds_composicao_coligacao: row.DS_COMPOSICAO_COLIGACAO?.trim(),
            
            // Dados pessoais
            sg_uf_nascimento: row.SG_UF_NASCIMENTO?.trim(),
            dt_nascimento: row.DT_NASCIMENTO?.trim(),
            nr_titulo_eleitoral_candidato: row.NR_TITULO_ELEITORAL_CANDIDATO?.trim(),
            
            // Gênero
            cd_genero: parseInt(row.CD_GENERO?.replace(/[^\d]/g, '') || '0'),
            ds_genero: row.DS_GENERO?.trim(),
            
            // Grau de instrução
            cd_grau_instrucao: parseInt(row.CD_GRAU_INSTRUCAO?.replace(/[^\d]/g, '') || '0'),
            ds_grau_instrucao: row.DS_GRAU_INSTRUCAO?.trim(),
            
            // Estado civil
            cd_estado_civil: parseInt(row.CD_ESTADO_CIVIL?.replace(/[^\d]/g, '') || '0'),
            ds_estado_civil: row.DS_ESTADO_CIVIL?.trim(),
            
            // Cor/raça
            cd_cor_raca: parseInt(row.CD_COR_RACA?.replace(/[^\d]/g, '') || '0'),
            ds_cor_raca: row.DS_COR_RACA?.trim(),
            
            // Ocupação
            cd_ocupacao: parseInt(row.CD_OCUPACAO?.replace(/[^\d]/g, '') || '0'),
            ds_ocupacao: row.DS_OCUPACAO?.trim(),
            
            // Situação na totalização
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
    
    console.log(`✅ Encontrados ${candidatos.length} candidatos no arquivo`);
    
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
    
    // Processar candidatos
    let atualizados = 0;
    let criados = 0;
    let erros = 0;
    
    console.log('\n🔄 Processando candidatos...');
    
    for (let i = 0; i < candidatos.length; i++) {
      const candidato = candidatos[i];
      
      try {
        // Mostrar progresso
        if ((i + 1) % 50 === 0 || i === candidatos.length - 1) {
          console.log(`Processando... ${i + 1}/${candidatos.length} (${Math.round(((i + 1) / candidatos.length) * 100)}%)`);
        }
        
        // Buscar candidato existente por número (mais confiável)
        const candidatoExistenteQuery = `
          SELECT id, nome, cargo, numero, partido
          FROM candidatos c
          WHERE c.eleicao_id = $1 
            AND c.numero = $2
        `;
        
        const candidatoExistente = await db.query(candidatoExistenteQuery, [
          eleicaoId,
          candidato.nr_candidato
        ]);
        
        if (candidatoExistente.rows.length > 0) {
          // Atualizar candidato existente
          const updateQuery = `
            UPDATE candidatos 
            SET 
              nome_urna = $1,
              nome_social = $2,
              cpf = $3,
              email = $4,
              situacao_candidatura = $5,
              descricao_situacao_candidatura = $6,
              tipo_agremiacao = $7,
              numero_partido = $8,
              sigla_partido = $9,
              nome_partido = $10,
              numero_federacao = $11,
              nome_federacao = $12,
              sigla_federacao = $13,
              composicao_federacao = $14,
              numero_coligacao = $15,
              nome_coligacao = $16,
              composicao_coligacao = $17,
              uf_nascimento = $18,
              data_nascimento = $19,
              titulo_eleitoral = $20,
              genero = $21,
              descricao_genero = $22,
              grau_instrucao = $23,
              descricao_grau_instrucao = $24,
              estado_civil = $25,
              descricao_estado_civil = $26,
              cor_raca = $27,
              descricao_cor_raca = $28,
              ocupacao = $29,
              descricao_ocupacao = $30,
              situacao_totalizacao_turno = $31,
              descricao_situacao_totalizacao_turno = $32,
              sequencial_candidato = $33,
              codigo_cargo = $34,
              codigo_eleicao = $35,
              descricao_eleicao = $36,
              data_eleicao = $37,
              tipo_eleicao = $38,
              numero_turno = $39,
              tipo_abrangencia = $40,
              sigla_uf = $41,
              codigo_ue = $42,
              nome_ue = $43,
              data_geracao = $44,
              hora_geracao = $45,
              partido = $46,
              cargo = $47
            WHERE id = $48
            RETURNING id, nome, partido
          `;
          
          const updateResult = await db.query(updateQuery, [
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
            candidato.sq_candidato || null,
            candidato.cd_cargo || null,
            candidato.cd_eleicao || null,
            candidato.ds_eleicao || null,
            candidato.dt_eleicao || null,
            candidato.nm_tipo_eleicao || null,
            candidato.nr_turno || null,
            candidato.tp_abrangencia || null,
            candidato.sg_uf || null,
            candidato.sg_ue || null,
            candidato.nm_ue || null,
            candidato.dt_geracao || null,
            candidato.hh_geracao || null,
            candidato.nm_partido || null,
            candidato.ds_cargo || null,
            candidatoExistente.rows[0].id
          ]);
          
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
              descricao_situacao_totalizacao_turno, sequencial_candidato,
              codigo_cargo, codigo_eleicao, descricao_eleicao, data_eleicao,
              tipo_eleicao, numero_turno, tipo_abrangencia, sigla_uf,
              codigo_ue, nome_ue, data_geracao, hora_geracao
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
              $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
              $41, $42, $43, $44, $45, $46, $47, $48, $49, $50
            )
            RETURNING id, nome, partido
          `;
          
          const insertResult = await db.query(insertQuery, [
            candidato.nm_candidato,
            candidato.ds_cargo,
            candidato.nr_candidato,
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
            candidato.ds_sit_tot_turno || null,
            candidato.sq_candidato || null,
            candidato.cd_cargo || null,
            candidato.cd_eleicao || null,
            candidato.ds_eleicao || null,
            candidato.dt_eleicao || null,
            candidato.nm_tipo_eleicao || null,
            candidato.nr_turno || null,
            candidato.tp_abrangencia || null,
            candidato.sg_uf || null,
            candidato.sg_ue || null,
            candidato.nm_ue || null,
            candidato.dt_geracao || null,
            candidato.hh_geracao || null
          ]);
          
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
        c.sigla_partido,
        c.descricao_situacao_candidatura,
        COUNT(v.id) as registros_votos,
        SUM(v.quantidade_votos) as total_votos
      FROM candidatos c
      LEFT JOIN votos v ON c.id = v.candidato_id
      JOIN eleicoes e ON c.eleicao_id = e.id
      WHERE e.ano = 2022
      GROUP BY c.id, c.nome, c.partido, c.cargo, c.numero, c.sigla_partido, c.descricao_situacao_candidatura
      ORDER BY total_votos DESC NULLS LAST, c.nome
      LIMIT 20
    `;
    
    const verificacao = await db.query(verificacaoQuery);
    console.log('\n📊 Verificação - Candidatos importados:');
    verificacao.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.nome} (${row.numero}) - ${row.sigla_partido || 'N/A'} - ${row.descricao_situacao_candidatura || 'N/A'} - ${parseInt(row.total_votos || 0).toLocaleString('pt-BR')} votos`);
    });
    
    // Estatísticas por partido
    const statsPartidoQuery = `
      SELECT 
        c.sigla_partido,
        c.nome_partido,
        COUNT(*) as total_candidatos,
        COUNT(CASE WHEN c.descricao_situacao_candidatura = 'APTO' THEN 1 END) as aptos,
        COUNT(CASE WHEN c.descricao_situacao_candidatura = 'INAPTO' THEN 1 END) as inaptos
      FROM candidatos c
      JOIN eleicoes e ON c.eleicao_id = e.id
      WHERE e.ano = 2022 AND c.sigla_partido IS NOT NULL
      GROUP BY c.sigla_partido, c.nome_partido
      ORDER BY total_candidatos DESC
      LIMIT 10
    `;
    
    const statsPartido = await db.query(statsPartidoQuery);
    console.log('\n📈 Estatísticas por partido:');
    statsPartido.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.sigla_partido} - ${row.nome_partido} - ${row.total_candidatos} candidatos (${row.aptos} aptos, ${row.inaptos} inaptos)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erro geral:', error);
    process.exit(1);
  }
}

importarCandidatosCompleto();
