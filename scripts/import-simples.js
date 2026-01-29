const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/database');

// Função para processar uma linha do CSV
function processarLinhaCSV(data, lineNumber) {
  try {
    // Mapear colunas do TSE
    const municipio = data.NM_MUNICIPIO?.trim().toUpperCase();
    const codigoMunicipio = parseInt(data.CD_MUNICIPIO?.replace(/[^\d]/g, '') || '0');
    const votos = parseInt(data.QT_VOTOS?.replace(/[^\d]/g, '') || '0');
    const candidato = data.NM_VOTAVEL?.trim();
    const cargo = data.DS_CARGO?.trim();
    const numero = parseInt(data.NR_VOTAVEL?.replace(/[^\d]/g, '') || '0');
    const uf = data.SG_UF?.trim().toUpperCase();
    const zona = parseInt(data.NR_ZONA?.replace(/[^\d]/g, '') || '0');
    const secao = parseInt(data.NR_SECAO?.replace(/[^\d]/g, '') || '0');
    const localVotacao = data.NM_LOCAL_VOTACAO?.trim();
    const enderecoLocal = data.DS_LOCAL_VOTACAO_ENDERECO?.trim();
    const ano = parseInt(data.ANO_ELEICAO?.replace(/[^\d]/g, '') || '0');
    const tipo = data.NM_TIPO_ELEICAO?.trim();
    const turno = parseInt(data.NR_TURNO?.replace(/[^\d]/g, '') || '1');
    const dataEleicao = data.DT_ELEICAO?.trim();
    const dataGeracao = data.DT_GERACAO?.trim();

    // Validações básicas
    if (!municipio || !candidato || votos <= 0) {
      return null;
    }

    return {
      municipio,
      codigoMunicipio,
      votos,
      candidato,
      cargo,
      numero,
      uf,
      zona,
      secao,
      localVotacao,
      enderecoLocal,
      ano,
      tipo,
      turno,
      dataEleicao,
      dataGeracao
    };
  } catch (error) {
    console.error(`Erro na linha ${lineNumber}:`, error.message);
    return null;
  }
}

// Função para corrigir caracteres especiais
function corrigirCaracteres(texto) {
  if (!texto) return texto;
  
  return texto
    .replace(/JOO/g, 'JOÃO')
    .replace(/SO/g, 'SÃO')
    .replace(/CRICIMA/g, 'CRICIÚMA')
    .replace(/FLORIANPOLIS/g, 'FLORIANÓPOLIS')
    .replace(/ESPERIDIO/g, 'ESPERIDIÃO')
    .replace(/JOAABA/g, 'JOAÇABA')
    .replace(/SO LUDGERO/g, 'SÃO LUDGERO')
    .replace(/PRESIDENTE GETLIO/g, 'PRESIDENTE GETÚLIO');
}

async function importarCSVSimples(caminhoArquivo) {
  console.log('🚀 Iniciando importação simples...');
  console.log(`📁 Arquivo: ${caminhoArquivo}`);

  const startTime = Date.now();
  let totalProcessados = 0;
  let totalInseridos = 0;
  let totalErros = 0;

  // Cache para evitar duplicações
  const candidatosMap = new Map();
  const municipiosMap = new Map();
  let eleicaoId = null;

  return new Promise((resolve, reject) => {
    const dados = [];
    let lineNumber = 0;

    fs.createReadStream(caminhoArquivo, { encoding: 'utf8' })
      .pipe(csv({ separator: ';' }))
      .on('data', (data) => {
        lineNumber++;
        const dadoProcessado = processarLinhaCSV(data, lineNumber);
        if (dadoProcessado) {
          dados.push(dadoProcessado);
        } else {
          totalErros++;
        }

        // Processar em lotes de 1000
        if (dados.length >= 1000) {
          processarLote(dados.splice(0, 1000));
        }
      })
      .on('end', async () => {
        try {
          // Processar dados restantes
          if (dados.length > 0) {
            await processarLote(dados);
          }

          const endTime = Date.now();
          const tempoTotal = (endTime - startTime) / 1000;

          console.log('\n🎉 Importação concluída!');
          console.log(`📊 Estatísticas:`);
          console.log(`   • Total processados: ${totalProcessados}`);
          console.log(`   • Total inseridos: ${totalInseridos}`);
          console.log(`   • Total erros: ${totalErros}`);
          console.log(`   • Tempo total: ${tempoTotal.toFixed(2)}s`);
          console.log(`   • Velocidade: ${(totalProcessados / tempoTotal).toFixed(2)} registros/segundo`);

          resolve({
            totalProcessados,
            totalInseridos,
            totalErros,
            tempoTotal
          });
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);

    // Função para processar um lote
    async function processarLote(dadosLote) {
      try {
        console.log(`📦 Processando lote (${dadosLote.length} registros)...`);
        
        // Criar eleição se não existir
        if (!eleicaoId) {
          const primeiroDado = dadosLote[0];
          const eleicaoResult = await db.query(`
            INSERT INTO eleicoes (ano, tipo, turno, data_eleicao, data_geracao)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
          `, [primeiroDado.ano, primeiroDado.tipo, primeiroDado.turno, primeiroDado.dataEleicao, primeiroDado.dataGeracao]);
          eleicaoId = eleicaoResult.rows[0].id;
          console.log(`✅ Eleição criada com ID: ${eleicaoId}`);
        }

        // Processar candidatos
        for (const dado of dadosLote) {
          const keyCandidato = `${dado.numero}-${eleicaoId}`;
          if (!candidatosMap.has(keyCandidato)) {
            const candidatoCorrigido = {
              numero: dado.numero,
              nome: corrigirCaracteres(dado.candidato),
              cargo: corrigirCaracteres(dado.cargo),
              eleicao_id: eleicaoId
            };

            try {
              const candidatoResult = await db.query(`
                INSERT INTO candidatos (numero, nome, cargo, eleicao_id)
                VALUES ($1, $2, $3, $4)
                RETURNING id
              `, [candidatoCorrigido.numero, candidatoCorrigido.nome, candidatoCorrigido.cargo, candidatoCorrigido.eleicao_id]);
              
              candidatosMap.set(keyCandidato, candidatoResult.rows[0].id);
            } catch (error) {
              // Candidato já existe, buscar ID
              const existingCandidato = await db.query(`
                SELECT id FROM candidatos WHERE numero = $1 AND eleicao_id = $2
              `, [dado.numero, eleicaoId]);
              
              if (existingCandidato.rows.length > 0) {
                candidatosMap.set(keyCandidato, existingCandidato.rows[0].id);
              }
            }
          }
        }

        // Processar municípios
        for (const dado of dadosLote) {
          const nomeMunicipioCorrigido = corrigirCaracteres(dado.municipio);
          const keyMunicipio = `${nomeMunicipioCorrigido}-${dado.uf}`;
          
          if (!municipiosMap.has(keyMunicipio)) {
            try {
              const municipioResult = await db.query(`
                INSERT INTO municipios (codigo, nome, sigla_uf)
                VALUES ($1, $2, $3)
                RETURNING id
              `, [dado.codigoMunicipio, nomeMunicipioCorrigido, dado.uf]);
              
              municipiosMap.set(keyMunicipio, municipioResult.rows[0].id);
            } catch (error) {
              // Município já existe, buscar ID
              const existingMunicipio = await db.query(`
                SELECT id FROM municipios WHERE nome = $1 AND sigla_uf = $2
              `, [nomeMunicipioCorrigido, dado.uf]);
              
              if (existingMunicipio.rows.length > 0) {
                municipiosMap.set(keyMunicipio, existingMunicipio.rows[0].id);
              }
            }
          }
        }

        // Processar votos
        for (const dado of dadosLote) {
          const keyCandidato = `${dado.numero}-${eleicaoId}`;
          const nomeMunicipioCorrigido = corrigirCaracteres(dado.municipio);
          const keyMunicipio = `${nomeMunicipioCorrigido}-${dado.uf}`;
          
          const candidatoId = candidatosMap.get(keyCandidato);
          const municipioId = municipiosMap.get(keyMunicipio);
          
          if (candidatoId && municipioId) {
            try {
              await db.query(`
                INSERT INTO votos (eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              `, [eleicaoId, municipioId, candidatoId, dado.zona, dado.secao, dado.localVotacao, dado.enderecoLocal, dado.votos]);
              
              totalInseridos++;
            } catch (error) {
              // Voto já existe ou erro, continuar
              console.warn(`Erro ao inserir voto: ${error.message}`);
            }
          }
        }

        totalProcessados += dadosLote.length;
        console.log(`✅ Lote processado: ${dadosLote.length} registros`);

      } catch (error) {
        console.error(`❌ Erro no lote:`, error.message);
        totalErros += dadosLote.length;
      }
    }
  });
}

// Executar se chamado diretamente
if (require.main === module) {
  const arquivo = process.argv[2] || 'votacao_secao_2018_SC.csv';

  if (!fs.existsSync(arquivo)) {
    console.error(`❌ Arquivo não encontrado: ${arquivo}`);
    process.exit(1);
  }

  importarCSVSimples(arquivo)
    .then(resultado => {
      console.log('✅ Importação concluída com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro na importação:', error);
      process.exit(1);
    });
}

module.exports = { importarCSVSimples };
