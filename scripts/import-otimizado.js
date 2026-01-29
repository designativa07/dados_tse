const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/database');

// Configurações de performance
const BATCH_SIZE = 5000; // Processar 5000 registros por vez
const MAX_CONCURRENT_BATCHES = 3; // Máximo de 3 lotes simultâneos

// Cache para evitar consultas repetidas
const cache = {
  candidatos: new Map(),
  municipios: new Map(),
  eleicoes: new Map()
};

// Função para processar uma linha do CSV
function processarLinhaCSV(data, lineNumber) {
  try {
    // Mapear colunas do TSE
    const municipio = data.NM_MUNICIPIO?.trim().toUpperCase();
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
      return null; // Retorna null para dados inválidos
    }

    return {
      municipio,
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
    .replace(/Ã/g, 'Ã')
    .replace(/Â/g, 'Â')
    .replace(/Á/g, 'Á')
    .replace(/À/g, 'À')
    .replace(/É/g, 'É')
    .replace(/Ê/g, 'Ê')
    .replace(/Í/g, 'Í')
    .replace(/Ó/g, 'Ó')
    .replace(/Ô/g, 'Ô')
    .replace(/Õ/g, 'Õ')
    .replace(/Ú/g, 'Ú')
    .replace(/Ç/g, 'Ç')
    .replace(/ã/g, 'ã')
    .replace(/â/g, 'â')
    .replace(/á/g, 'á')
    .replace(/à/g, 'à')
    .replace(/é/g, 'é')
    .replace(/ê/g, 'ê')
    .replace(/í/g, 'í')
    .replace(/ó/g, 'ó')
    .replace(/ô/g, 'ô')
    .replace(/õ/g, 'õ')
    .replace(/ú/g, 'ú')
    .replace(/ç/g, 'ç')
    .replace(/JOO/g, 'JOÃO')
    .replace(/SO/g, 'SÃO')
    .replace(/CRICIMA/g, 'CRICIÚMA')
    .replace(/FLORIANPOLIS/g, 'FLORIANÓPOLIS')
    .replace(/ESPERIDIO/g, 'ESPERIDIÃO')
    .replace(/JOAABA/g, 'JOAÇABA')
    .replace(/SO LUDGERO/g, 'SÃO LUDGERO')
    .replace(/PRESIDENTE GETLIO/g, 'PRESIDENTE GETÚLIO');
}

// Função para processar candidatos em lote
async function processarCandidatosLote(candidatos, eleicaoId) {
  const candidatosParaInserir = [];
  const candidatosParaAtualizar = [];

  for (const [key, candidato] of candidatos.entries()) {
    const candidatoCorrigido = {
      ...candidato,
      nome: corrigirCaracteres(candidato.nome),
      cargo: corrigirCaracteres(candidato.cargo)
    };

    if (cache.candidatos.has(key)) {
      candidatosParaAtualizar.push({
        id: cache.candidatos.get(key),
        ...candidatoCorrigido
      });
    } else {
      candidatosParaInserir.push({
        ...candidatoCorrigido,
        eleicao_id: eleicaoId
      });
    }
  }

  // Inserir novos candidatos
  if (candidatosParaInserir.length > 0) {
    const values = candidatosParaInserir.map((c, i) => 
      `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
    ).join(', ');
    
    const params = candidatosParaInserir.flatMap(c => [c.numero, c.nome, c.cargo, c.eleicao_id]);
    
    const result = await db.query(`
      INSERT INTO candidatos (numero, nome, cargo, eleicao_id)
      VALUES ${values}
      ON CONFLICT (numero, eleicao_id) DO UPDATE SET
        nome = EXCLUDED.nome,
        cargo = EXCLUDED.cargo
      RETURNING id, numero, eleicao_id
    `, params);

    // Atualizar cache
    result.rows.forEach(row => {
      const key = `${row.numero}-${row.eleicao_id}`;
      cache.candidatos.set(key, row.id);
    });
  }

  return candidatosParaInserir.length + candidatosParaAtualizar.length;
}

// Função para processar municípios em lote
async function processarMunicipiosLote(municipios) {
  const municipiosParaInserir = [];

  for (const [nome, dados] of municipios.entries()) {
    if (!cache.municipios.has(nome)) {
      municipiosParaInserir.push({
        nome: corrigirCaracteres(nome),
        sigla_uf: dados.uf
      });
    }
  }

  // Inserir novos municípios
  if (municipiosParaInserir.length > 0) {
    const values = municipiosParaInserir.map((m, i) => 
      `($${i * 2 + 1}, $${i * 2 + 2})`
    ).join(', ');
    
    const params = municipiosParaInserir.flatMap(m => [m.nome, m.sigla_uf]);
    
    const result = await db.query(`
      INSERT INTO municipios (nome, sigla_uf)
      VALUES ${values}
      ON CONFLICT (nome, sigla_uf) DO NOTHING
      RETURNING id, nome, sigla_uf
    `, params);

    // Atualizar cache
    result.rows.forEach(row => {
      const key = `${row.nome}-${row.sigla_uf}`;
      cache.municipios.set(key, row.id);
    });
  }

  return municipiosParaInserir.length;
}

// Função para processar votos em lote
async function processarVotosLote(votos, eleicaoId) {
  if (votos.length === 0) return 0;

  const values = votos.map((v, i) => 
    `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`
  ).join(', ');

  const params = votos.flatMap(v => [
    eleicaoId,
    v.municipio_id,
    v.candidato_id,
    v.zona,
    v.secao,
    v.local_votacao,
    v.endereco_local,
    v.quantidade_votos
  ]);

  await db.query(`
    INSERT INTO votos (eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos)
    VALUES ${values}
    ON CONFLICT (eleicao_id, municipio_id, candidato_id, zona, secao) DO UPDATE SET
      quantidade_votos = EXCLUDED.quantidade_votos,
      local_votacao = EXCLUDED.local_votacao,
      endereco_local = EXCLUDED.endereco_local
  `, params);

  return votos.length;
}

// Função principal de importação
async function importarCSVOtimizado(caminhoArquivo, eleicaoId = null) {
  console.log('🚀 Iniciando importação otimizada...');
  console.log(`📁 Arquivo: ${caminhoArquivo}`);
  console.log(`📊 Tamanho do lote: ${BATCH_SIZE} registros`);

  const startTime = Date.now();
  let totalProcessados = 0;
  let totalInseridos = 0;
  let totalErros = 0;
  let loteAtual = 0;

  // Limpar cache
  cache.candidatos.clear();
  cache.municipios.clear();
  cache.eleicoes.clear();

  // Carregar cache existente
  console.log('📋 Carregando cache existente...');
  const candidatosExistentes = await db.query('SELECT id, numero, eleicao_id FROM candidatos');
  candidatosExistentes.rows.forEach(row => {
    const key = `${row.numero}-${row.eleicao_id}`;
    cache.candidatos.set(key, row.id);
  });

  const municipiosExistentes = await db.query('SELECT id, nome, sigla_uf FROM municipios');
  municipiosExistentes.rows.forEach(row => {
    const key = `${row.nome}-${row.sigla_uf}`;
    cache.municipios.set(key, row.id);
  });

  const eleicoesExistentes = await db.query('SELECT id, ano, tipo, turno FROM eleicoes');
  eleicoesExistentes.rows.forEach(row => {
    const key = `${row.ano}-${row.tipo}-${row.turno}`;
    cache.eleicoes.set(key, row.id);
  });

  console.log(`✅ Cache carregado: ${cache.candidatos.size} candidatos, ${cache.municipios.size} municípios, ${cache.eleicoes.size} eleições`);

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

        // Processar lote quando atingir o tamanho
        if (dados.length >= BATCH_SIZE) {
          processarLote(dados.splice(0, BATCH_SIZE), eleicaoId, ++loteAtual);
        }
      })
      .on('end', async () => {
        try {
          // Processar dados restantes
          if (dados.length > 0) {
            await processarLote(dados, eleicaoId, ++loteAtual);
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
  });

  // Função para processar um lote
  async function processarLote(dadosLote, eleicaoId, numeroLote) {
    try {
      console.log(`📦 Processando lote ${numeroLote} (${dadosLote.length} registros)...`);
      
      const startLote = Date.now();
      
      // Agrupar dados
      const candidatos = new Map();
      const municipios = new Map();
      const votos = [];

      for (const dado of dadosLote) {
        // Processar candidato
        const keyCandidato = `${dado.numero}-${eleicaoId}`;
        if (!candidatos.has(keyCandidato)) {
          candidatos.set(keyCandidato, {
            numero: dado.numero,
            nome: dado.candidato,
            cargo: dado.cargo
          });
        }

        // Processar município
        const keyMunicipio = `${dado.municipio}-${dado.uf}`;
        if (!municipios.has(dado.municipio)) {
          municipios.set(dado.municipio, {
            uf: dado.uf
          });
        }

        // Preparar voto
        votos.push({
          municipio_id: null, // Será preenchido depois
          candidato_id: null, // Será preenchido depois
          zona: dado.zona,
          secao: dado.secao,
          local_votacao: dado.localVotacao,
          endereco_local: dado.enderecoLocal,
          quantidade_votos: dado.votos
        });
      }

      // Processar candidatos
      await processarCandidatosLote(candidatos, eleicaoId);

      // Processar municípios
      await processarMunicipiosLote(municipios);

      // Preencher IDs nos votos
      for (let i = 0; i < votos.length; i++) {
        const dado = dadosLote[i];
        const keyCandidato = `${dado.numero}-${eleicaoId}`;
        const keyMunicipio = `${corrigirCaracteres(dado.municipio)}-${dado.uf}`;
        
        votos[i].candidato_id = cache.candidatos.get(keyCandidato);
        votos[i].municipio_id = cache.municipios.get(keyMunicipio);
      }

      // Processar votos
      const votosInseridos = await processarVotosLote(votos, eleicaoId);

      totalProcessados += dadosLote.length;
      totalInseridos += votosInseridos;

      const tempoLote = (Date.now() - startLote) / 1000;
      console.log(`✅ Lote ${numeroLote} concluído em ${tempoLote.toFixed(2)}s (${votosInseridos} votos inseridos)`);

    } catch (error) {
      console.error(`❌ Erro no lote ${numeroLote}:`, error.message);
      totalErros += dadosLote.length;
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const arquivo = process.argv[2];
  const eleicaoId = process.argv[3] ? parseInt(process.argv[3]) : null;

  if (!arquivo) {
    console.error('❌ Uso: node import-otimizado.js <caminho-arquivo> [eleicao-id]');
    process.exit(1);
  }

  if (!fs.existsSync(arquivo)) {
    console.error(`❌ Arquivo não encontrado: ${arquivo}`);
    process.exit(1);
  }

  importarCSVOtimizado(arquivo, eleicaoId)
    .then(resultado => {
      console.log('✅ Importação concluída com sucesso!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Erro na importação:', error);
      process.exit(1);
    });
}

module.exports = { importarCSVOtimizado };
