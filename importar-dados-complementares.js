const fs = require('fs');
const csv = require('csv-parser');
const db = require('./config/database');

async function importarDadosComplementares() {
  try {
    console.log('🚀 Iniciando importação dos dados complementares...\n');
    
    const arquivo = './DADOS/consulta_cand_complementar_2022_SC.csv';
    let candidatosProcessados = 0;
    let candidatosAtualizados = 0;
    let erros = 0;
    
    // Ler arquivo CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(arquivo)
        .pipe(csv({ separator: ';' }))
        .on('data', async (row) => {
          try {
            candidatosProcessados++;
            
            // Processar dados do candidato
            const dadosComplementares = {
              // Detalhes da situação da candidatura
              cd_detalhe_situacao_cand: row.CD_DETALHE_SITUACAO_CAND ? parseInt(row.CD_DETALHE_SITUACAO_CAND.replace(/[^\d]/g, '') || '0') : null,
              ds_detalhe_situacao_cand: row.DS_DETALHE_SITUACAO_CAND?.trim() || null,
              
              // Nacionalidade
              cd_nacionalidade: row.CD_NACIONALIDADE ? parseInt(row.CD_NACIONALIDADE.replace(/[^\d]/g, '') || '0') : null,
              ds_nacionalidade: row.DS_NACIONALIDADE?.trim() || null,
              
              // Município de nascimento
              cd_municipio_nascimento: row.CD_MUNICIPIO_NASCIMENTO ? parseInt(row.CD_MUNICIPIO_NASCIMENTO.replace(/[^\d]/g, '') || '0') : null,
              nm_municipio_nascimento: row.NM_MUNICIPIO_NASCIMENTO?.trim() || null,
              
              // Idade e características
              nr_idade_data_posse: row.NR_IDADE_DATA_POSSE ? parseInt(row.NR_IDADE_DATA_POSSE.replace(/[^\d]/g, '') || '0') : null,
              st_quilombola: row.ST_QUILOMBOLA?.trim() || null,
              cd_etnia_indigena: row.CD_ETNIA_INDIGENA ? parseInt(row.CD_ETNIA_INDIGENA.replace(/[^\d]/g, '') || '0') : null,
              ds_etnia_indigena: row.DS_ETNIA_INDIGENA?.trim() || null,
              
              // Despesas e campanha
              vr_despesa_max_campanha: row.VR_DESPESA_MAX_CAMPANHA ? parseFloat(row.VR_DESPESA_MAX_CAMPANHA.replace(/[^\d.,]/g, '').replace(',', '.')) || null : null,
              st_reeleicao: row.ST_REELEICAO?.trim() || null,
              st_declarar_bens: row.ST_DECLARAR_BENS?.trim() || null,
              
              // Protocolos e processos
              nr_protocolo_candidatura: row.NR_PROTOCOLO_CANDIDATURA ? parseInt(row.NR_PROTOCOLO_CANDIDATURA.replace(/[^\d]/g, '') || '0') : null,
              nr_processo: row.NR_PROCESSO?.trim() || null,
              
              // Situações específicas
              cd_situacao_candidato_pleito: row.CD_SITUACAO_CANDIDATO_PLEITO ? parseInt(row.CD_SITUACAO_CANDIDATO_PLEITO.replace(/[^\d]/g, '') || '0') : null,
              ds_situacao_candidato_pleito: row.DS_SITUACAO_CANDIDATO_PLEITO?.trim() || null,
              cd_situacao_candidato_urna: row.CD_SITUACAO_CANDIDATO_URNA ? parseInt(row.CD_SITUACAO_CANDIDATO_URNA.replace(/[^\d]/g, '') || '0') : null,
              ds_situacao_candidato_urna: row.DS_SITUACAO_CANDIDATO_URNA?.trim() || null,
              st_candidato_inserido_urna: row.ST_CANDIDATO_INSERIDO_URNA?.trim() || null,
              nm_tipo_destinacao_votos: row.NM_TIPO_DESTINACAO_VOTOS?.trim() || null,
              cd_situacao_candidato_tot: row.CD_SITUACAO_CANDIDATO_TOT ? parseInt(row.CD_SITUACAO_CANDIDATO_TOT.replace(/[^\d]/g, '') || '0') : null,
              ds_situacao_candidato_tot: row.DS_SITUACAO_CANDIDATO_TOT?.trim() || null,
              
              // Prestação de contas e substituições
              st_prest_contas: row.ST_PREST_CONTAS?.trim() || null,
              st_substituido: row.ST_SUBSTITUIDO?.trim() || null,
              sq_substituido: row.SQ_SUBSTITUIDO ? parseInt(row.SQ_SUBSTITUIDO.replace(/[^\d]/g, '') || '0') : null,
              sq_ordem_suplencia: row.SQ_ORDEM_SUPLENCIA ? parseInt(row.SQ_ORDEM_SUPLENCIA.replace(/[^\d]/g, '') || '0') : null,
              
              // Datas importantes
              dt_aceite_candidatura: row.DT_ACEITE_CANDIDATURA?.trim() || null,
              
              // Julgamentos
              cd_situacao_julgamento: row.CD_SITUACAO_JULGAMENTO ? parseInt(row.CD_SITUACAO_JULGAMENTO.replace(/[^\d]/g, '') || '0') : null,
              ds_situacao_julgamento: row.DS_SITUACAO_JULGAMENTO?.trim() || null,
              cd_situacao_julgamento_pleito: row.CD_SITUACAO_JULGAMENTO_PLEITO ? parseInt(row.CD_SITUACAO_JULGAMENTO_PLEITO.replace(/[^\d]/g, '') || '0') : null,
              ds_situacao_julgamento_pleito: row.DS_SITUACAO_JULGAMENTO_PLEITO?.trim() || null,
              cd_situacao_julgamento_urna: row.CD_SITUACAO_JULGAMENTO_URNA ? parseInt(row.CD_SITUACAO_JULGAMENTO_URNA.replace(/[^\d]/g, '') || '0') : null,
              ds_situacao_julgamento_urna: row.DS_SITUACAO_JULGAMENTO_URNA?.trim() || null,
              
              // Cassações
              cd_situacao_cassacao: row.CD_SITUACAO_CASSACAO ? parseInt(row.CD_SITUACAO_CASSACAO.replace(/[^\d]/g, '') || '0') : null,
              ds_situacao_cassacao: row.DS_SITUACAO_CASSACAO?.trim() || null,
              cd_situacao_cassacao_midia: row.CD_SITUACAO_CASSACAO_MIDIA ? parseInt(row.CD_SITUACAO_CASSACAO_MIDIA.replace(/[^\d]/g, '') || '0') : null,
              ds_situacao_cassacao_midia: row.DS_SITUACAO_CASSACAO_MIDIA?.trim() || null,
              
              // Diplomas
              cd_situacao_diploma: row.CD_SITUACAO_DIPLOMA ? parseInt(row.CD_SITUACAO_DIPLOMA.replace(/[^\d]/g, '') || '0') : null,
              ds_situacao_diploma: row.DS_SITUACAO_DIPLOMA?.trim() || null
            };
            
            // Buscar candidato pelo SQ_CANDIDATO
            const sqCandidato = row.SQ_CANDIDATO ? parseInt(row.SQ_CANDIDATO.replace(/[^\d]/g, '') || '0') : null;
            
            if (sqCandidato) {
              // Verificar se o candidato existe
              const candidatoExistente = await db.query(
                'SELECT id FROM candidatos WHERE sequencial_candidato = $1',
                [sqCandidato]
              );
              
              if (candidatoExistente.rows.length > 0) {
                // Atualizar candidato existente
                const candidatoId = candidatoExistente.rows[0].id;
                
                // Construir query de atualização dinamicamente
                const campos = Object.keys(dadosComplementares).filter(key => dadosComplementares[key] !== null);
                const valores = campos.map(key => dadosComplementares[key]);
                const setClause = campos.map((key, index) => `${key} = $${index + 2}`).join(', ');
                
                if (campos.length > 0) {
                  await db.query(
                    `UPDATE candidatos SET ${setClause} WHERE id = $1`,
                    [candidatoId, ...valores]
                  );
                  
                  candidatosAtualizados++;
                  
                  if (candidatosProcessados % 100 === 0) {
                    console.log(`📊 Processados: ${candidatosProcessados} | Atualizados: ${candidatosAtualizados}`);
                  }
                }
              } else {
                console.log(`⚠️  Candidato não encontrado: SQ_CANDIDATO ${sqCandidato}`);
              }
            }
            
          } catch (error) {
            erros++;
            console.error(`❌ Erro ao processar linha ${candidatosProcessados}:`, error.message);
          }
        })
        .on('end', () => {
          console.log('\n✅ Importação concluída!');
          console.log(`📊 Resumo:`);
          console.log(`   📄 Candidatos processados: ${candidatosProcessados}`);
          console.log(`   ✅ Candidatos atualizados: ${candidatosAtualizados}`);
          console.log(`   ❌ Erros: ${erros}`);
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Erro na importação:', error.message);
  }
}

importarDadosComplementares();
