const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../config/database');
const Joi = require('joi');

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `tse-${uniqueSuffix}.csv`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'), false);
    }
  }
});

// Schema de validação para dados de eleição
const eleicaoSchema = Joi.object({
  ano: Joi.number().integer().required(),
  tipo: Joi.string().required(),
  descricao: Joi.string().optional(),
  turno: Joi.number().integer().optional(),
  data_eleicao: Joi.string().optional(),
  data_geracao: Joi.string().optional()
});

// POST /api/upload/csv - Upload e processamento de CSV
router.post('/csv', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo CSV é obrigatório' });
  }

  const { eleicao } = req.body;
  let eleicaoData;
  
  try {
    // Validar dados da eleição
    if (eleicao) {
      eleicaoData = JSON.parse(eleicao);
      const { error } = eleicaoSchema.validate(eleicaoData);
      if (error) {
        return res.status(400).json({ 
          error: 'Dados da eleição inválidos', 
          details: error.details 
        });
      }
    }

    const filePath = req.file.path;
    const results = [];
    const errors = [];
    let lineNumber = 0;

    // Processar CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({ 
          separator: ';',
          quote: '"',
          escape: '"',
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('data', (data) => {
          lineNumber++;
          
          // Debug: mostrar primeiras linhas processadas
          if (lineNumber <= 3) {
            console.log(`🔍 Linha ${lineNumber} processada:`, Object.keys(data));
            console.log(`🔍 Dados da linha ${lineNumber}:`, data);
          }
          
          try {
            // Limpar e processar dados
            const processedData = processarLinhaCSV(data, lineNumber);
            if (processedData) {
              results.push(processedData);
              
              // Debug: mostrar primeiros dados processados
              if (results.length <= 3) {
                console.log(`✅ Dados processados ${results.length}:`, processedData);
              }
            }
          } catch (error) {
            // Debug: mostrar primeiros erros
            if (errors.length < 5) {
              console.log(`❌ Erro na linha ${lineNumber}:`, error.message);
              console.log(`❌ Dados da linha:`, data);
            }
            
            errors.push({
              linha: lineNumber,
              erro: error.message,
              dados: data
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ 
        error: 'Nenhum dado válido encontrado no CSV',
        erros: errors
      });
    }

    // Detectar dados da eleição automaticamente do CSV
    let eleicaoId;
    if (results.length > 0) {
      const primeiroDado = results[0];
      console.log(`🔍 Detectando eleição automaticamente do CSV...`);
      console.log(`📊 Dados detectados: ${primeiroDado.ano} - ${primeiroDado.tipo} - ${primeiroDado.turno}º Turno`);
      
      // Verificar se a eleição já existe
      const eleicaoExistente = await db.query(`
        SELECT id FROM eleicoes 
        WHERE ano = $1 AND tipo = $2 AND turno = $3
      `, [primeiroDado.ano, primeiroDado.tipo, primeiroDado.turno]);
      
      if (eleicaoExistente.rows.length > 0) {
        eleicaoId = eleicaoExistente.rows[0].id;
        console.log(`✅ Eleição já existe com ID: ${eleicaoId}`);
      } else {
        // Criar nova eleição automaticamente
        const eleicaoResult = await db.query(`
          INSERT INTO eleicoes (ano, tipo, descricao, turno, data_eleicao, data_geracao)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          primeiroDado.ano,
          primeiroDado.tipo,
          `Eleições ${primeiroDado.ano}`,
          primeiroDado.turno,
          primeiroDado.dataEleicao,
          primeiroDado.dataGeracao
        ]);
        eleicaoId = eleicaoResult.rows[0].id;
        console.log(`✅ Nova eleição criada com ID: ${eleicaoId}`);
      }
    }

    // Processar e inserir dados
    console.log(`🔄 Iniciando processamento de ${results.length} registros...`);
    const processamentoResult = await processarDados(results, eleicaoId);
    console.log(`✅ Processamento concluído:`, processamentoResult);

    // Limpar arquivo temporário
    fs.unlinkSync(filePath);

    res.json({
      message: 'CSV processado com sucesso',
      estatisticas: {
        total_linhas: lineNumber,
        linhas_processadas: results.length,
        erros: errors.length,
        eleicao_criada: !!eleicaoId,
        votos_inseridos: processamentoResult.votosInseridos,
        candidatos_criados: processamentoResult.candidatosCriados,
        municipios_encontrados: processamentoResult.municipiosEncontrados
      },
      erros: errors.slice(0, 10), // Primeiros 10 erros
      eleicao_id: eleicaoId
    });

  } catch (error) {
    console.error('Erro ao processar CSV:', error);
    
    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Erro ao processar CSV',
      message: error.message
    });
  }
});

// Função para processar uma linha do CSV
function processarLinhaCSV(data, lineNumber) {
  // Mapear TODAS as 26 colunas do TSE
  const dtGeracao = data.DT_GERACAO?.trim();
  const hhGeracao = data.HH_GERACAO?.trim();
  const anoEleicao = parseInt(data.ANO_ELEICAO?.replace(/[^\d]/g, '') || '0');
  const cdTipoEleicao = parseInt(data.CD_TIPO_ELEICAO?.replace(/[^\d]/g, '') || '0');
  const nmTipoEleicao = data.NM_TIPO_ELEICAO?.trim();
  const nrTurno = parseInt(data.NR_TURNO?.replace(/[^\d]/g, '') || '1');
  const cdEleicao = parseInt(data.CD_ELEICAO?.replace(/[^\d]/g, '') || '0');
  const dsEleicao = data.DS_ELEICAO?.trim();
  const dtEleicao = data.DT_ELEICAO?.trim();
  const tpAbrangencia = data.TP_ABRANGENCIA?.trim();
  const sgUf = data.SG_UF?.trim().toUpperCase();
  const sgUe = data.SG_UE?.trim();
  const nmUe = data.NM_UE?.trim();
  const cdMunicipio = parseInt(data.CD_MUNICIPIO?.replace(/[^\d]/g, '') || '0');
  const nmMunicipio = data.NM_MUNICIPIO?.trim().toUpperCase();
  const nrZona = parseInt(data.NR_ZONA?.replace(/[^\d]/g, '') || '0');
  const nrSecao = parseInt(data.NR_SECAO?.replace(/[^\d]/g, '') || '0');
  const cdCargo = parseInt(data.CD_CARGO?.replace(/[^\d]/g, '') || '0');
  const dsCargo = data.DS_CARGO?.trim();
  const nrVotavel = parseInt(data.NR_VOTAVEL?.replace(/[^\d]/g, '') || '0');
  const nmVotavel = data.NM_VOTAVEL?.trim();
  const qtVotos = parseInt(data.QT_VOTOS?.replace(/[^\d]/g, '') || '0');
  const nrLocalVotacao = parseInt(data.NR_LOCAL_VOTACAO?.replace(/[^\d]/g, '') || '0');
  const sqCandidato = parseInt(data.SQ_CANDIDATO?.replace(/[^\d]/g, '') || '0');
  const nmLocalVotacao = data.NM_LOCAL_VOTACAO?.trim();
  const dsLocalVotacaoEndereco = data.DS_LOCAL_VOTACAO_ENDERECO?.trim();

  // Manter compatibilidade com código existente
  const municipio = nmMunicipio;
  const votos = qtVotos;
  const candidato = nmVotavel;
  const cargo = dsCargo;
  const numero = nrVotavel;
  const uf = sgUf;
  const zona = nrZona;
  const secao = nrSecao;
  const localVotacao = nmLocalVotacao;
  const enderecoLocal = dsLocalVotacaoEndereco;
  const ano = anoEleicao;
  const tipo = nmTipoEleicao;
  const turno = nrTurno;
  const dataEleicao = dtEleicao;
  const dataGeracao = dtGeracao;

  // Validações básicas
  if (!municipio || !candidato || votos <= 0) {
    throw new Error(`Dados obrigatórios ausentes: municipio=${municipio}, candidato=${candidato}, votos=${votos}`);
  }

  return {
    // Dados originais (compatibilidade)
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
    dataGeracao,
    
    // Todas as 26 colunas do TSE
    dt_geracao: dtGeracao,
    hh_geracao: hhGeracao,
    ano_eleicao: anoEleicao,
    cd_tipo_eleicao: cdTipoEleicao,
    nm_tipo_eleicao: nmTipoEleicao,
    nr_turno: nrTurno,
    cd_eleicao: cdEleicao,
    ds_eleicao: dsEleicao,
    dt_eleicao: dtEleicao,
    tp_abrangencia: tpAbrangencia,
    sg_uf: sgUf,
    sg_ue: sgUe,
    nm_ue: nmUe,
    cd_municipio: cdMunicipio,
    nm_municipio: nmMunicipio,
    nr_zona: nrZona,
    nr_secao: nrSecao,
    cd_cargo: cdCargo,
    ds_cargo: dsCargo,
    nr_votavel: nrVotavel,
    nm_votavel: nmVotavel,
    qt_votos: qtVotos,
    nr_local_votacao: nrLocalVotacao,
    sq_candidato: sqCandidato,
    nm_local_votacao: nmLocalVotacao,
    ds_local_votacao_endereco: dsLocalVotacaoEndereco
  };
}

// Função para processar e inserir dados no banco
async function processarDados(dados, eleicaoId) {
  console.log(`🔍 processarDados chamada com ${dados.length} dados, eleicaoId: ${eleicaoId}`);
  let votosInseridos = 0;
  let candidatosCriados = 0;
  let municipiosEncontrados = 0;

  // Se eleicaoId foi fornecido, processar todos os dados para essa eleição
  if (eleicaoId) {
    console.log(`🔄 Processando ${dados.length} dados para eleição ID ${eleicaoId}`);
    const dadosEleicao = dados; // Todos os dados são para esta eleição

    // Processar candidatos
    const candidatos = {};
    for (const dado of dadosEleicao) {
      const key = `${dado.numero}-${dado.candidato}`;
      if (!candidatos[key]) {
        candidatos[key] = {
          numero: dado.numero,
          nome: dado.candidato,
          cargo: dado.cargo,
          eleicao_id: eleicaoId
        };
      }
    }

    // Inserir candidatos
    console.log(`🔄 Inserindo ${Object.keys(candidatos).length} candidatos...`);
    for (const candidato of Object.values(candidatos)) {
      try {
        await db.query(`
          INSERT INTO candidatos (numero, nome, cargo, eleicao_id)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (numero, eleicao_id) DO UPDATE SET
            nome = EXCLUDED.nome,
            cargo = EXCLUDED.cargo
        `, [candidato.numero, candidato.nome, candidato.cargo, candidato.eleicao_id]);
        candidatosCriados++;
      } catch (error) {
        console.error(`❌ Erro ao inserir candidato ${candidato.nome}:`, error.message);
        throw error;
      }
    }
    console.log(`✅ ${candidatosCriados} candidatos inseridos`);

    // Processar votos em lotes para otimizar performance
    console.log(`🔄 Processando ${dadosEleicao.length} votos em lotes...`);
    const batchSize = 10000; // Processar 10.000 votos por vez (otimizado)
    const totalBatches = Math.ceil(dadosEleicao.length / batchSize);
    
    for (let i = 0; i < dadosEleicao.length; i += batchSize) {
      const batch = dadosEleicao.slice(i, i + batchSize);
      const currentBatch = Math.floor(i/batchSize) + 1;
      const processedRecords = i + batch.length;
      const percentage = Math.round((processedRecords / dadosEleicao.length) * 100);
      
      console.log(`🔄 Processando lote ${currentBatch}/${totalBatches} (${batch.length} votos) - ${percentage}% concluído...`);
      
      // Otimização: buscar todos os municípios e candidatos do lote de uma vez
      const municipiosUnicos = [...new Set(batch.map(d => `${d.municipio}|${d.uf}`))];
      const candidatosUnicos = [...new Set(batch.map(d => `${d.numero}|${eleicaoId}`))];
      
      // Buscar municípios em lote
      const municipiosMap = new Map();
      for (const municipioUf of municipiosUnicos) {
        const [municipio, uf] = municipioUf.split('|');
        const result = await db.query(
          'SELECT id FROM municipios WHERE nome = $1 AND sigla_uf = $2',
          [municipio, uf]
        );
        
        if (result.rows.length === 0) {
          // Criar município se não existir
          const codigoMunicipio = Math.abs(municipio.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0));
          
          const newResult = await db.query(`
            INSERT INTO municipios (codigo, nome, sigla_uf)
            VALUES ($1, $2, $3)
            ON CONFLICT (nome, sigla_uf) DO UPDATE SET
              codigo = EXCLUDED.codigo
            RETURNING id
          `, [codigoMunicipio, municipio, uf]);
          municipiosMap.set(municipioUf, newResult.rows[0].id);
        } else {
          municipiosMap.set(municipioUf, result.rows[0].id);
        }
        municipiosEncontrados++;
      }
      
      // Buscar candidatos em lote
      const candidatosMap = new Map();
      for (const candidatoEleicao of candidatosUnicos) {
        const [numero, eleicao] = candidatoEleicao.split('|');
        const result = await db.query(
          'SELECT id FROM candidatos WHERE numero = $1 AND eleicao_id = $2',
          [numero, eleicao]
        );
        
        if (result.rows.length > 0) {
          candidatosMap.set(candidatoEleicao, result.rows[0].id);
        }
      }
      
      // Preparar dados para inserção em lote
      const votosParaInserir = [];
      
      for (const dado of batch) {
        const municipioKey = `${dado.municipio}|${dado.uf}`;
        const candidatoKey = `${dado.numero}|${eleicaoId}`;
        
        const municipioId = municipiosMap.get(municipioKey);
        const candidatoId = candidatosMap.get(candidatoKey);
        
        if (!candidatoId) {
          console.warn(`Candidato não encontrado: ${dado.numero} - ${dado.candidato}`);
          continue;
        }
        
        // Debug: verificar se há valores undefined ou null
        if (!eleicaoId || !municipioId || !candidatoId || !dado.zona || !dado.secao) {
          console.warn(`⚠️ Valores inválidos: eleicaoId=${eleicaoId}, municipioId=${municipioId}, candidatoId=${candidatoId}, zona=${dado.zona}, secao=${dado.secao}`);
          continue;
        }
        
        // Preparar dados do voto
        const votoData = [
          eleicaoId, municipioId, candidatoId, dado.zona, dado.secao, 
          dado.localVotacao, dado.enderecoLocal, dado.votos,
          dado.dt_geracao, dado.hh_geracao, dado.ano_eleicao, dado.cd_tipo_eleicao, 
          dado.nm_tipo_eleicao, dado.nr_turno, dado.cd_eleicao, dado.ds_eleicao, 
          dado.dt_eleicao, dado.tp_abrangencia, dado.sg_uf, dado.sg_ue, dado.nm_ue, 
          dado.cd_municipio, dado.nm_municipio, dado.nr_zona, dado.nr_secao, 
          dado.cd_cargo, dado.ds_cargo, dado.nr_votavel, dado.nm_votavel, dado.qt_votos, 
          dado.nr_local_votacao, dado.sq_candidato, dado.nm_local_votacao, dado.ds_local_votacao_endereco
        ];
        
        // Adicionar voto diretamente (não há duplicatas reais nos dados do TSE)
        votosParaInserir.push(votoData);
      }
      
      // Votos já estão no array votosParaInserir
      
      // Inserir votos em sub-lotes para evitar limite de parâmetros do PostgreSQL
      if (votosParaInserir.length > 0) {
        const subBatchSize = 200; // Máximo 200 votos por query (34 colunas × 200 = 6800 parâmetros)
        
        for (let j = 0; j < votosParaInserir.length; j += subBatchSize) {
          const subBatch = votosParaInserir.slice(j, j + subBatchSize);
          
          const values = subBatch.map((_, index) => {
            const offset = index * 34; // 34 colunas totais (8 originais + 26 novas)
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27}, $${offset + 28}, $${offset + 29}, $${offset + 30}, $${offset + 31}, $${offset + 32}, $${offset + 33}, $${offset + 34})`;
          }).join(',');
          
          const flatValues = subBatch.flat();
          
          await db.query(`
            INSERT INTO votos (
              eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos,
              dt_geracao, hh_geracao, ano_eleicao, cd_tipo_eleicao, nm_tipo_eleicao, nr_turno, cd_eleicao, ds_eleicao, 
              dt_eleicao, tp_abrangencia, sg_uf, sg_ue, nm_ue, cd_municipio, nm_municipio, nr_zona, nr_secao, 
              cd_cargo, ds_cargo, nr_votavel, nm_votavel, qt_votos, nr_local_votacao, sq_candidato, 
              nm_local_votacao, ds_local_votacao_endereco
            )
            VALUES ${values}
            ON CONFLICT (eleicao_id, municipio_id, candidato_id, zona, secao) DO UPDATE SET
              quantidade_votos = EXCLUDED.quantidade_votos,
              local_votacao = EXCLUDED.local_votacao,
              endereco_local = EXCLUDED.endereco_local,
              dt_geracao = EXCLUDED.dt_geracao,
              hh_geracao = EXCLUDED.hh_geracao,
              ano_eleicao = EXCLUDED.ano_eleicao,
              cd_tipo_eleicao = EXCLUDED.cd_tipo_eleicao,
              nm_tipo_eleicao = EXCLUDED.nm_tipo_eleicao,
              nr_turno = EXCLUDED.nr_turno,
              cd_eleicao = EXCLUDED.cd_eleicao,
              ds_eleicao = EXCLUDED.ds_eleicao,
              dt_eleicao = EXCLUDED.dt_eleicao,
              tp_abrangencia = EXCLUDED.tp_abrangencia,
              sg_uf = EXCLUDED.sg_uf,
              sg_ue = EXCLUDED.sg_ue,
              nm_ue = EXCLUDED.nm_ue,
              cd_municipio = EXCLUDED.cd_municipio,
              nm_municipio = EXCLUDED.nm_municipio,
              nr_zona = EXCLUDED.nr_zona,
              nr_secao = EXCLUDED.nr_secao,
              cd_cargo = EXCLUDED.cd_cargo,
              ds_cargo = EXCLUDED.ds_cargo,
              nr_votavel = EXCLUDED.nr_votavel,
              nm_votavel = EXCLUDED.nm_votavel,
              qt_votos = EXCLUDED.qt_votos,
              nr_local_votacao = EXCLUDED.nr_local_votacao,
              sq_candidato = EXCLUDED.sq_candidato,
              nm_local_votacao = EXCLUDED.nm_local_votacao,
              ds_local_votacao_endereco = EXCLUDED.ds_local_votacao_endereco
          `, flatValues);
        }
        
        votosInseridos += votosParaInserir.length;
      }
      
      // Log de progresso detalhado
      console.log(`✅ Lote ${currentBatch}/${totalBatches} concluído: ${votosInseridos} votos inseridos até agora`);
      
      // Pequena pausa entre lotes para não sobrecarregar
      if (i + batchSize < dadosEleicao.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    console.log(`✅ Processamento finalizado: ${votosInseridos} votos, ${candidatosCriados} candidatos, ${municipiosEncontrados} municípios`);
  } else {
    console.log(`❌ Nenhum eleicaoId fornecido, não há dados para processar`);
  }

  return {
    votosInseridos,
    candidatosCriados,
    municipiosEncontrados
  };
}

// GET /api/upload/template - Download do template CSV
router.get('/template', (req, res) => {
  const template = `DT_GERACAO;HH_GERACAO;ANO_ELEICAO;CD_TIPO_ELEICAO;NM_TIPO_ELEICAO;NR_TURNO;CD_ELEICAO;DS_ELEICAO;DT_ELEICAO;TP_ABRANGENCIA;SG_UF;SG_UE;NM_UE;CD_MUNICIPIO;NM_MUNICIPIO;NR_ZONA;NR_SECAO;CD_CARGO;DS_CARGO;NR_VOTAVEL;NM_VOTAVEL;QT_VOTOS;NR_LOCAL_VOTACAO;SQ_CANDIDATO;NM_LOCAL_VOTACAO;DS_LOCAL_VOTACAO_ENDERECO
15/07/2021;10:53:12;2018;2;Eleição Ordinária;1;297;Eleições Gerais Estaduais 2018;07/10/2018;E;SC;SC;SANTA CATARINA;80896;CRICIÚMA;10;499;3;Governador;15;MAURO MARIANI;44;1210;240000609537;E. M. E. E ENSINO FUNDAMENTAL JOSÉ CESÁRIO DA SILVA;RUA INDAIAL, S/N`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="template_tse.csv"');
  res.send(template);
});

// POST /api/upload/csv-progress - Upload com progresso em tempo real
router.post('/csv-progress', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo CSV é obrigatório' });
  }

  const { eleicao } = req.body;
  let eleicaoData;
  
  try {
    // Validar dados da eleição
    if (eleicao) {
      eleicaoData = JSON.parse(eleicao);
      const { error } = eleicaoSchema.validate(eleicaoData);
      if (error) {
        return res.status(400).json({ 
          error: 'Dados da eleição inválidos', 
          details: error.details 
        });
      }
    }

    // Configurar Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const filePath = req.file.path;
    const results = [];
    const errors = [];
    let lineNumber = 0;

    // Função para enviar progresso via SSE
    const sendProgress = (current, total, text, stage = 'reading') => {
      res.write(`data: ${JSON.stringify({
        current,
        total,
        text,
        stage,
        percentage: total > 0 ? Math.round((current / total) * 100) : 0
      })}\n\n`);
    };

    sendProgress(0, 0, 'Iniciando processamento...', 'reading');

    // Primeiro, contar o total de linhas para progresso preciso
    let totalLines = 0;
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({ 
          separator: ';',
          quote: '"',
          escape: '"',
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('data', () => totalLines++)
        .on('end', resolve)
        .on('error', reject);
    });

    sendProgress(0, totalLines, `Arquivo lido: ${totalLines} linhas encontradas`, 'reading');

    // Processar CSV com progresso
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({ 
          separator: ';',
          quote: '"',
          escape: '"',
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('data', (data) => {
          lineNumber++;
          
          // Enviar progresso a cada 100 linhas ou no final
          if (lineNumber % 100 === 0 || lineNumber === totalLines) {
            sendProgress(lineNumber, totalLines, `Processando linha ${lineNumber} de ${totalLines}...`, 'reading');
          }
          
          try {
            const processedData = processarLinhaCSV(data, lineNumber);
            if (processedData) {
              results.push(processedData);
            }
          } catch (error) {
            errors.push({
              linha: lineNumber,
              erro: error.message,
              dados: data
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (results.length === 0) {
      res.write(`data: ${JSON.stringify({
        error: 'Nenhum dado válido encontrado no CSV',
        erros: errors
      })}\n\n`);
      res.end();
      return;
    }

    sendProgress(totalLines, totalLines, 'Leitura concluída, iniciando processamento no banco...', 'processing');

    // Detectar dados da eleição automaticamente do CSV
    let eleicaoId;
    if (results.length > 0) {
      const primeiroRegistro = results[0];
      const ano = primeiroRegistro.ano_eleicao;
      const tipo = primeiroRegistro.nm_tipo_eleicao;
      const turno = primeiroRegistro.nr_turno;

      // Verificar se já existe eleição
      const eleicaoExistente = await db.query(
        'SELECT id FROM eleicoes WHERE ano = $1 AND tipo = $2 AND turno = $3',
        [ano, tipo, turno]
      );

      if (eleicaoExistente.rows.length > 0) {
        eleicaoId = eleicaoExistente.rows[0].id;
        sendProgress(totalLines, totalLines, `Eleição existente encontrada (ID: ${eleicaoId})`, 'processing');
      } else {
        // Criar nova eleição
        const novaEleicao = await db.query(
          'INSERT INTO eleicoes (ano, tipo, turno, data_eleicao, descricao) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [ano, tipo, turno, primeiroRegistro.dt_eleicao, primeiroRegistro.ds_eleicao]
        );
        eleicaoId = novaEleicao.rows[0].id;
        sendProgress(totalLines, totalLines, `Nova eleição criada (ID: ${eleicaoId})`, 'processing');
      }
    }

    // Processar dados com progresso
    const processamentoResult = await processarDadosComProgresso(results, eleicaoId, sendProgress);

    // Limpar arquivo temporário
    fs.unlinkSync(filePath);

    // Enviar resultado final
    res.write(`data: ${JSON.stringify({
      success: true,
      message: 'CSV processado com sucesso',
      estatisticas: {
        total_linhas: lineNumber,
        linhas_processadas: results.length,
        erros: errors.length,
        eleicao_criada: !!eleicaoId,
        votos_inseridos: processamentoResult.votosInseridos,
        candidatos_criados: processamentoResult.candidatosCriados,
        municipios_encontrados: processamentoResult.municipiosEncontrados
      },
      erros: errors.slice(0, 10),
      eleicao_id: eleicaoId
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('Erro ao processar CSV:', error);
    
    // Limpar arquivo em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.write(`data: ${JSON.stringify({
      error: 'Erro ao processar CSV',
      message: error.message
    })}\n\n`);
    res.end();
  }
});

// Função para processar dados com progresso
async function processarDadosComProgresso(dados, eleicaoId, sendProgress) {
  let votosInseridos = 0;
  let candidatosCriados = 0;
  let municipiosEncontrados = 0;

  if (eleicaoId) {
    // Agrupar dados por eleição
    const dadosEleicao = dados.filter(d => d.ano_eleicao && d.nm_tipo_eleicao && d.nr_turno);
    
    if (dadosEleicao.length > 0) {
      sendProgress(0, dadosEleicao.length, 'Processando candidatos e municípios...', 'processing');

      // Processar candidatos e municípios em lote
      const candidatosMap = new Map();
      const municipiosMap = new Map();

      // Buscar candidatos existentes
      const candidatosExistentes = await db.query(
        'SELECT id, numero, eleicao_id FROM candidatos WHERE eleicao_id = $1',
        [eleicaoId]
      );
      
      candidatosExistentes.rows.forEach(c => {
        candidatosMap.set(`${c.numero}|${c.eleicao_id}`, c.id);
      });

      // Buscar municípios existentes
      const municipiosExistentes = await db.query(
        'SELECT id, codigo, nome, sigla_uf FROM municipios'
      );
      
      municipiosExistentes.rows.forEach(m => {
        municipiosMap.set(`${m.nome}|${m.sigla_uf}`, m.id);
      });

      // Processar candidatos únicos
      const candidatosUnicos = new Map();
      const municipiosUnicos = new Map();

      dadosEleicao.forEach(dado => {
        const candidatoKey = `${dado.numero}|${eleicaoId}`;
        const municipioKey = `${dado.municipio}|${dado.uf}`;

        if (!candidatosUnicos.has(candidatoKey)) {
          candidatosUnicos.set(candidatoKey, {
            eleicao_id: eleicaoId,
            nome: dado.candidato,
            cargo: dado.cargo,
            numero: dado.numero
          });
        }

        if (!municipiosUnicos.has(municipioKey)) {
          municipiosUnicos.set(municipioKey, {
            codigo: dado.cd_municipio,
            nome: dado.municipio,
            sigla_uf: dado.uf
          });
        }
      });

      // Inserir candidatos
      for (const [key, candidato] of candidatosUnicos) {
        if (!candidatosMap.has(key)) {
          await db.query(
            'INSERT INTO candidatos (eleicao_id, nome, cargo, numero) VALUES ($1, $2, $3, $4)',
            [candidato.eleicao_id, candidato.nome, candidato.cargo, candidato.numero]
          );
          candidatosCriados++;
        }
      }

      // Inserir municípios
      for (const [key, municipio] of municipiosUnicos) {
        if (!municipiosMap.has(key)) {
          await db.query(
            'INSERT INTO municipios (codigo, nome, sigla_uf) VALUES ($1, $2, $3)',
            [municipio.codigo, municipio.nome, municipio.sigla_uf]
          );
          municipiosEncontrados++;
        }
      }

      // Atualizar mapas com novos IDs
      const novosCandidatos = await db.query(
        'SELECT id, numero, eleicao_id FROM candidatos WHERE eleicao_id = $1',
        [eleicaoId]
      );
      
      novosCandidatos.rows.forEach(c => {
        candidatosMap.set(`${c.numero}|${c.eleicao_id}`, c.id);
      });

      const novosMunicipios = await db.query(
        'SELECT id, codigo, nome, sigla_uf FROM municipios'
      );
      
      novosMunicipios.rows.forEach(m => {
        municipiosMap.set(`${m.nome}|${m.sigla_uf}`, m.id);
      });

      // Processar votos em lotes
      const batchSize = 1000;
      const totalBatches = Math.ceil(dadosEleicao.length / batchSize);
      
      for (let i = 0; i < dadosEleicao.length; i += batchSize) {
        const batch = dadosEleicao.slice(i, i + batchSize);
        const votosParaInserir = [];

        for (const dado of batch) {
          const municipioKey = `${dado.municipio}|${dado.uf}`;
          const candidatoKey = `${dado.numero}|${eleicaoId}`;

          const municipioId = municipiosMap.get(municipioKey);
          const candidatoId = candidatosMap.get(candidatoKey);

          if (!municipioId || !candidatoId) {
            continue;
          }

          const votoData = [
            eleicaoId, municipioId, candidatoId, dado.zona, dado.secao, 
            dado.localVotacao, dado.enderecoLocal, dado.votos,
            dado.dt_geracao, dado.hh_geracao, dado.ano_eleicao, dado.cd_tipo_eleicao, 
            dado.nm_tipo_eleicao, dado.nr_turno, dado.cd_eleicao, dado.ds_eleicao, 
            dado.dt_eleicao, dado.tp_abrangencia, dado.sg_uf, dado.sg_ue, dado.nm_ue, 
            dado.cd_municipio, dado.nm_municipio, dado.nr_zona, dado.nr_secao, 
            dado.cd_cargo, dado.ds_cargo, dado.nr_votavel, dado.nm_votavel, dado.qt_votos, 
            dado.nr_local_votacao, dado.sq_candidato, dado.nm_local_votacao, dado.ds_local_votacao_endereco
          ];

          votosParaInserir.push(votoData);
        }

        // Inserir votos em sub-lotes
        if (votosParaInserir.length > 0) {
          const subBatchSize = 200;
          
          for (let j = 0; j < votosParaInserir.length; j += subBatchSize) {
            const subBatch = votosParaInserir.slice(j, j + subBatchSize);
            
            // Remover duplicatas dentro do mesmo lote baseado na chave única
            const votosUnicos = new Map();
            subBatch.forEach(voto => {
              const chave = `${voto[0]}-${voto[1]}-${voto[2]}-${voto[3]}-${voto[4]}`; // eleicao_id-municipio_id-candidato_id-zona-secao
              if (!votosUnicos.has(chave)) {
                votosUnicos.set(chave, voto);
              }
            });
            
            const votosFiltrados = Array.from(votosUnicos.values());
            
            if (votosFiltrados.length > 0) {
              const values = votosFiltrados.map((_, index) => {
                const offset = index * 34;
                return `(${Array.from({length: 34}, (_, i) => `$${offset + i + 1}`).join(', ')})`;
              }).join(', ');

              const flatValues = votosFiltrados.flat();

              await db.query(`
                INSERT INTO votos (
                  eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos,
                  dt_geracao, hh_geracao, ano_eleicao, cd_tipo_eleicao, nm_tipo_eleicao, nr_turno, cd_eleicao, ds_eleicao, 
                  dt_eleicao, tp_abrangencia, sg_uf, sg_ue, nm_ue, cd_municipio, nm_municipio, nr_zona, nr_secao, 
                  cd_cargo, ds_cargo, nr_votavel, nm_votavel, qt_votos, nr_local_votacao, sq_candidato, 
                  nm_local_votacao, ds_local_votacao_endereco
                )
                VALUES ${values}
                ON CONFLICT (eleicao_id, municipio_id, candidato_id, zona, secao) DO UPDATE SET
                  quantidade_votos = EXCLUDED.quantidade_votos,
                  local_votacao = EXCLUDED.local_votacao,
                  endereco_local = EXCLUDED.endereco_local,
                  dt_geracao = EXCLUDED.dt_geracao,
                  hh_geracao = EXCLUDED.hh_geracao,
                  ano_eleicao = EXCLUDED.ano_eleicao,
                  cd_tipo_eleicao = EXCLUDED.cd_tipo_eleicao,
                  nm_tipo_eleicao = EXCLUDED.nm_tipo_eleicao,
                  nr_turno = EXCLUDED.nr_turno,
                  cd_eleicao = EXCLUDED.cd_eleicao,
                  ds_eleicao = EXCLUDED.ds_eleicao,
                  dt_eleicao = EXCLUDED.dt_eleicao,
                  tp_abrangencia = EXCLUDED.tp_abrangencia,
                  sg_uf = EXCLUDED.sg_uf,
                  sg_ue = EXCLUDED.sg_ue,
                  nm_ue = EXCLUDED.nm_ue,
                  cd_municipio = EXCLUDED.cd_municipio,
                  nm_municipio = EXCLUDED.nm_municipio,
                  nr_zona = EXCLUDED.nr_zona,
                  nr_secao = EXCLUDED.nr_secao,
                  cd_cargo = EXCLUDED.cd_cargo,
                  ds_cargo = EXCLUDED.ds_cargo,
                  nr_votavel = EXCLUDED.nr_votavel,
                  nm_votavel = EXCLUDED.nm_votavel,
                  qt_votos = EXCLUDED.qt_votos,
                  nr_local_votacao = EXCLUDED.nr_local_votacao,
                  sq_candidato = EXCLUDED.sq_candidato,
                  nm_local_votacao = EXCLUDED.nm_local_votacao,
                  ds_local_votacao_endereco = EXCLUDED.ds_local_votacao_endereco
              `, flatValues);

              votosInseridos += votosFiltrados.length;
            }
          }
        }

        // Enviar progresso do lote
        const currentBatch = Math.floor(i / batchSize) + 1;
        sendProgress(i + batch.length, dadosEleicao.length, 
          `Processando lote ${currentBatch} de ${totalBatches} (${votosInseridos} votos inseridos)...`, 'processing');

        // Pequena pausa para não sobrecarregar o banco
        if (i + batchSize < dadosEleicao.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    }
  }

  return {
    votosInseridos,
    candidatosCriados,
    municipiosEncontrados
  };
}

// Função para processar linha CSV de perfil do eleitor
function processarLinhaCSVPerfil(data, lineNumber) {
  try {
    const dados = {};
    
    // Mapear todas as colunas do CSV para o banco
    const mapeamento = {
      'DT_GERACAO': 'dt_geracao',
      'HH_GERACAO': 'hh_geracao',
      'ANO_ELEICAO': 'ano_eleicao',
      'SG_UF': 'sg_uf',
      'CD_MUNICIPIO': 'cd_municipio',
      'NM_MUNICIPIO': 'nm_municipio',
      'NR_ZONA': 'nr_zona',
      'NR_SECAO': 'nr_secao',
      'NR_LOCAL_VOTACAO': 'nr_local_votacao',
      'NM_LOCAL_VOTACAO': 'nm_local_votacao',
      'CD_GENERO': 'cd_genero',
      'DS_GENERO': 'ds_genero',
      'CD_ESTADO_CIVIL': 'cd_estado_civil',
      'DS_ESTADO_CIVIL': 'ds_estado_civil',
      'CD_FAIXA_ETARIA': 'cd_faixa_etaria',
      'DS_FAIXA_ETARIA': 'ds_faixa_etaria',
      'CD_GRAU_ESCOLARIDADE': 'cd_grau_escolaridade',
      'DS_GRAU_ESCOLARIDADE': 'ds_grau_escolaridade',
      'CD_RACA_COR': 'cd_raca_cor',
      'DS_RACA_COR': 'ds_raca_cor',
      'CD_IDENTIDADE_GENERO': 'cd_identidade_genero',
      'DS_IDENTIDADE_GENERO': 'ds_identidade_genero',
      'CD_QUILOMBOLA': 'cd_quilombola',
      'DS_QUILOMBOLA': 'ds_quilombola',
      'CD_INTERPRETE_LIBRAS': 'cd_interprete_libras',
      'DS_INTERPRETE_LIBRAS': 'ds_interprete_libras',
      'TP_OBRIGATORIEDADE_VOTO': 'tp_obrigatoriedade_voto',
      'QT_ELEITORES_PERFIL': 'qt_eleitores_perfil',
      'QT_ELEITORES_BIOMETRIA': 'qt_eleitores_biometria',
      'QT_ELEITORES_DEFICIENCIA': 'qt_eleitores_deficiencia',
      'QT_ELEITORES_INC_NM_SOCIAL': 'qt_eleitores_inc_nm_social'
    };
    
    // Converter dados
    for (const [csvCol, dbCol] of Object.entries(mapeamento)) {
      const valor = data[csvCol];
      
      if (dbCol === 'dt_geracao') {
        // Converter data DD/MM/YYYY para YYYY-MM-DD
        if (valor && valor.includes('/')) {
          const partes = valor.split('/');
          dados[dbCol] = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        } else {
          dados[dbCol] = null;
        }
      } else if (dbCol.includes('qt_') || dbCol.startsWith('cd_') || dbCol.startsWith('nr_')) {
        // Converter para integer
        const num = valor ? parseInt(valor.toString().trim()) : null;
        dados[dbCol] = isNaN(num) ? null : num;
      } else {
        // Manter como string
        dados[dbCol] = valor ? valor.toString().trim() : null;
      }
    }

    // Validação básica
    if (!dados.cd_municipio || !dados.nr_zona || !dados.nr_secao || !dados.ano_eleicao) {
      return null;
    }

    return dados;
  } catch (error) {
    console.error(`❌ Erro na linha ${lineNumber}:`, error.message);
    return null;
  }
}

// Função para processar dados de perfil do eleitor
async function processarDadosPerfil(dados, eleicaoId) {
  console.log(`🔍 processarDadosPerfil chamada com ${dados.length} dados, eleicaoId: ${eleicaoId}`);
  let registrosInseridos = 0;
  let municipiosEncontrados = 0;

  if (eleicaoId) {
    console.log(`🔄 Processando ${dados.length} registros de perfil para eleição ID ${eleicaoId}`);
    
    // Processar em lotes para otimizar performance
    const batchSize = 1000;
    const totalBatches = Math.ceil(dados.length / batchSize);
    
    for (let i = 0; i < dados.length; i += batchSize) {
      const batch = dados.slice(i, i + batchSize);
      const currentBatch = Math.floor(i/batchSize) + 1;
      
      console.log(`🔄 Processando lote ${currentBatch}/${totalBatches} (${batch.length} registros)...`);
      
      // Buscar municípios em lote
      const municipiosUnicos = [...new Set(batch.map(d => `${d.cd_municipio}|${d.sg_uf}`))];
      const municipiosMap = new Map();
      
      for (const municipioUf of municipiosUnicos) {
        const [cdMunicipio, uf] = municipioUf.split('|');
        const result = await db.query(
          'SELECT id FROM municipios WHERE codigo = $1 AND sigla_uf = $2',
          [cdMunicipio, uf]
        );
        
        if (result.rows.length > 0) {
          municipiosMap.set(municipioUf, result.rows[0].id);
          municipiosEncontrados++;
        }
      }
      
      // Preparar dados para inserção
      const registrosParaInserir = [];
      
      for (const dado of batch) {
        const municipioKey = `${dado.cd_municipio}|${dado.sg_uf}`;
        const municipioId = municipiosMap.get(municipioKey);
        
        if (!municipioId) continue;
        
        // Preparar dados do perfil - 32 valores (31 do CSV + municipio_id + eleicao_id)
        const perfilData = [
          dado.dt_geracao, dado.hh_geracao, dado.ano_eleicao, dado.sg_uf, dado.cd_municipio,
          dado.nm_municipio, dado.nr_zona, dado.nr_secao, dado.nr_local_votacao, dado.nm_local_votacao,
          dado.cd_genero, dado.ds_genero, dado.cd_estado_civil, dado.ds_estado_civil, dado.cd_faixa_etaria,
          dado.ds_faixa_etaria, dado.cd_grau_escolaridade, dado.ds_grau_escolaridade, dado.cd_raca_cor, dado.ds_raca_cor,
          dado.cd_identidade_genero, dado.ds_identidade_genero, dado.cd_quilombola, dado.ds_quilombola,
          dado.cd_interprete_libras, dado.ds_interprete_libras, dado.tp_obrigatoriedade_voto,
          dado.qt_eleitores_perfil, dado.qt_eleitores_biometria, dado.qt_eleitores_deficiencia, dado.qt_eleitores_inc_nm_social,
          municipioId, eleicaoId
        ];
        
        registrosParaInserir.push(perfilData);
      }
      
      // Inserir registros em sub-lotes
      if (registrosParaInserir.length > 0) {
        const subBatchSize = 100;
        
        for (let j = 0; j < registrosParaInserir.length; j += subBatchSize) {
          const subBatch = registrosParaInserir.slice(j, j + subBatchSize);
          
          const values = subBatch.map((_, index) => {
            const offset = index * 32;
            return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27}, $${offset + 28}, $${offset + 29}, $${offset + 30}, $${offset + 31}, $${offset + 32})`;
          }).join(',');
          
          const flatValues = subBatch.flat();
          
          await db.query(`
            INSERT INTO perfil_eleitor_secao (
              dt_geracao, hh_geracao, ano_eleicao, sg_uf, cd_municipio, nm_municipio,
              nr_zona, nr_secao, nr_local_votacao, nm_local_votacao, cd_genero, ds_genero,
              cd_estado_civil, ds_estado_civil, cd_faixa_etaria, ds_faixa_etaria,
              cd_grau_escolaridade, ds_grau_escolaridade, cd_raca_cor, ds_raca_cor,
              cd_identidade_genero, ds_identidade_genero, cd_quilombola, ds_quilombola,
              cd_interprete_libras, ds_interprete_libras, tp_obrigatoriedade_voto,
              qt_eleitores_perfil, qt_eleitores_biometria, qt_eleitores_deficiencia, qt_eleitores_inc_nm_social,
              municipio_id, eleicao_id
            )
            VALUES ${values}
            ON CONFLICT (ano_eleicao, sg_uf, cd_municipio, nr_zona, nr_secao, cd_genero, cd_estado_civil, cd_faixa_etaria, cd_grau_escolaridade, cd_raca_cor) DO UPDATE SET
              qt_eleitores_perfil = EXCLUDED.qt_eleitores_perfil,
              qt_eleitores_biometria = EXCLUDED.qt_eleitores_biometria,
              qt_eleitores_deficiencia = EXCLUDED.qt_eleitores_deficiencia,
              qt_eleitores_inc_nm_social = EXCLUDED.qt_eleitores_inc_nm_social,
              municipio_id = EXCLUDED.municipio_id
          `, flatValues);
        }
        
        registrosInseridos += registrosParaInserir.length;
      }
      
      console.log(`✅ Lote ${currentBatch}/${totalBatches} concluído: ${registrosInseridos} registros inseridos até agora`);
    }
    
    console.log(`✅ Processamento finalizado: ${registrosInseridos} registros, ${municipiosEncontrados} municípios`);
  }

  return {
    registrosInseridos,
    municipiosEncontrados
  };
}

// POST /api/upload/perfil-eleitor - Upload e processamento de CSV de perfil do eleitor (STREAMING)
router.post('/perfil-eleitor', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Arquivo CSV é obrigatório' });
  }

  try {
    const filePath = req.file.path;
    let lineNumber = 0;
    let registrosProcessados = 0;
    let registrosInseridos = 0;
    let municipiosEncontrados = 0;
    let registrosIgnorados = 0;
    let errors = [];
    let anoEleicao = null;
    let eleicaoId = null;

    console.log('📁 Iniciando processamento streaming do arquivo CSV de perfil do eleitor...');

    // Cache para municípios
    const municipiosCache = new Map();

    // Função para buscar município com cache
    async function getMunicipioId(cdMunicipio, sgUf) {
      const key = `${cdMunicipio}|${sgUf}`;
      
      if (municipiosCache.has(key)) {
        return municipiosCache.get(key);
      }
      
      try {
        const result = await db.query(
          'SELECT id FROM municipios WHERE codigo = $1 AND sigla_uf = $2',
          [cdMunicipio, sgUf]
        );
        
        if (result.rows.length > 0) {
          municipiosCache.set(key, result.rows[0].id);
          municipiosEncontrados++;
          return result.rows[0].id;
        } else {
          console.warn(`⚠️ Município não encontrado: ${cdMunicipio} - ${sgUf}`);
          return null;
        }
      } catch (error) {
        console.error(`❌ Erro ao buscar município ${cdMunicipio}:`, error.message);
        return null;
      }
    }

    // Função para inserir um registro
    async function inserirRegistro(dados, municipioId, eleicaoId) {
      try {
        // Inserir apenas as colunas que não são auto-geradas (excluindo id e created_at)
        // Total: 33 colunas (35 - 2 auto-geradas)
        await db.query(`
          INSERT INTO perfil_eleitor_secao (
            dt_geracao, hh_geracao, ano_eleicao, sg_uf, cd_municipio, nm_municipio,
            nr_zona, nr_secao, nr_local_votacao, nm_local_votacao, cd_genero, ds_genero,
            cd_estado_civil, ds_estado_civil, cd_faixa_etaria, ds_faixa_etaria,
            cd_grau_escolaridade, ds_grau_escolaridade, cd_raca_cor, ds_raca_cor,
            cd_identidade_genero, ds_identidade_genero, cd_quilombola, ds_quilombola,
            cd_interprete_libras, ds_interprete_libras, tp_obrigatoriedade_voto,
            qt_eleitores_perfil, qt_eleitores_biometria, qt_eleitores_deficiencia, qt_eleitores_inc_nm_social,
            municipio_id, eleicao_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)
          ON CONFLICT (ano_eleicao, sg_uf, cd_municipio, nr_zona, nr_secao, cd_genero, cd_estado_civil, cd_faixa_etaria, cd_grau_escolaridade, cd_raca_cor) DO UPDATE SET
            qt_eleitores_perfil = EXCLUDED.qt_eleitores_perfil,
            qt_eleitores_biometria = EXCLUDED.qt_eleitores_biometria,
            qt_eleitores_deficiencia = EXCLUDED.qt_eleitores_deficiencia,
            qt_eleitores_inc_nm_social = EXCLUDED.qt_eleitores_inc_nm_social,
            municipio_id = EXCLUDED.municipio_id
        `, [
          dados.dt_geracao, dados.hh_geracao, dados.ano_eleicao, dados.sg_uf, dados.cd_municipio,
          dados.nm_municipio, dados.nr_zona, dados.nr_secao, dados.nr_local_votacao, dados.nm_local_votacao,
          dados.cd_genero, dados.ds_genero, dados.cd_estado_civil, dados.ds_estado_civil, dados.cd_faixa_etaria,
          dados.ds_faixa_etaria, dados.cd_grau_escolaridade, dados.ds_grau_escolaridade, dados.cd_raca_cor, dados.ds_raca_cor,
          dados.cd_identidade_genero, dados.ds_identidade_genero, dados.cd_quilombola, dados.ds_quilombola,
          dados.cd_interprete_libras, dados.ds_interprete_libras, dados.tp_obrigatoriedade_voto,
          dados.qt_eleitores_perfil, dados.qt_eleitores_biometria, dados.qt_eleitores_deficiencia, dados.qt_eleitores_inc_nm_social,
          municipioId, eleicaoId
        ]);
        
        return true;
      } catch (error) {
        console.error(`❌ Erro ao inserir registro:`, error.message);
        return false;
      }
    }

    // Processar CSV em streaming com lotes pequenos para evitar problemas de memória
    const batchSize = 500; // Processar 500 registros por vez
    let currentBatch = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({ 
          separator: ';',
          quote: '"',
          escape: '"',
          skipEmptyLines: true,
          skipLinesWithError: true
        }))
        .on('data', (data) => {
          lineNumber++;
          
          try {
            const processedData = processarLinhaCSVPerfil(data, lineNumber);
            if (processedData) {
              currentBatch.push(processedData);
              
              // Detectar ano da eleição no primeiro registro válido
              if (!anoEleicao) {
                anoEleicao = processedData.ano_eleicao;
              }
              
              // Processar lote quando atingir o tamanho
              if (currentBatch.length >= batchSize) {
                // Processar de forma síncrona para evitar acúmulo
                processarLote(currentBatch).catch(error => {
                  console.error('❌ Erro ao processar lote:', error.message);
                  registrosIgnorados += currentBatch.length;
                });
                currentBatch = [];
              }
              
            } else {
              registrosIgnorados++;
            }
            
          } catch (error) {
            errors.push({
              linha: lineNumber,
              erro: error.message
            });
            registrosIgnorados++;
          }
        })
        .on('end', async () => {
          // Processar lote final
          if (currentBatch.length > 0) {
            await processarLote(currentBatch);
          }
          
          console.log(`✅ Processamento streaming concluído: ${registrosProcessados} registros processados`);
          resolve();
        })
        .on('error', reject);
    });
    
    // Função para processar um lote de registros (método otimizado)
    async function processarLote(batch) {
      try {
        console.log(`🔄 Processando lote de ${batch.length} registros...`);
        
        // Verificar/criar eleição se necessário
        if (!eleicaoId && anoEleicao) {
          try {
            const eleicao = await db.query('SELECT id FROM eleicoes WHERE ano = $1', [anoEleicao]);
            
            if (eleicao.rows.length === 0) {
              console.log(`⚠️  Eleição ${anoEleicao} não encontrada. Criando...`);
              await db.query(
                'INSERT INTO eleicoes (ano, tipo, descricao) VALUES ($1, $2, $3)',
                [anoEleicao, 'Geral', `Eleição Geral ${anoEleicao}`]
              );
              console.log(`✅ Eleição ${anoEleicao} criada.`);
            }
            
            eleicaoId = eleicao.rows[0]?.id || (await db.query('SELECT id FROM eleicoes WHERE ano = $1', [anoEleicao])).rows[0].id;
          } catch (error) {
            console.error('❌ Erro ao verificar/criar eleição:', error.message);
            return;
          }
        }
        
        // Buscar municípios em lote (otimização)
        const municipiosUnicos = [...new Set(batch.map(d => `${d.cd_municipio}|${d.sg_uf}`))];
        
        // Buscar municípios em lote com retry
        for (const municipioUf of municipiosUnicos) {
          const [cdMunicipio, uf] = municipioUf.split('|');
          const key = `${cdMunicipio}|${uf}`;
          
          if (!municipiosCache.has(key)) {
            let tentativas = 0;
            let sucesso = false;
            
            while (tentativas < 3 && !sucesso) {
              try {
                const result = await db.query(
                  'SELECT id FROM municipios WHERE codigo = $1 AND sigla_uf = $2',
                  [cdMunicipio, uf]
                );
                
                if (result.rows.length > 0) {
                  municipiosCache.set(key, result.rows[0].id);
                  municipiosEncontrados++;
                }
                sucesso = true;
              } catch (error) {
                tentativas++;
                console.warn(`⚠️ Tentativa ${tentativas} falhou para município ${cdMunicipio}:`, error.message);
                if (tentativas < 3) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * tentativas));
                }
              }
            }
          }
        }
        
        // Preparar dados para inserção em lote
        const registrosParaInserir = [];
        
        for (const dados of batch) {
          const municipioKey = `${dados.cd_municipio}|${dados.sg_uf}`;
          const municipioId = municipiosCache.get(municipioKey);
          
          if (!municipioId) {
            registrosIgnorados++;
            continue;
          }
          
          // Preparar dados do perfil - 33 valores (excluindo id e created_at)
          const perfilData = [
            dados.dt_geracao, dados.hh_geracao, dados.ano_eleicao, dados.sg_uf, dados.cd_municipio,
            dados.nm_municipio, dados.nr_zona, dados.nr_secao, dados.nr_local_votacao, dados.nm_local_votacao,
            dados.cd_genero, dados.ds_genero, dados.cd_estado_civil, dados.ds_estado_civil, dados.cd_faixa_etaria,
            dados.ds_faixa_etaria, dados.cd_grau_escolaridade, dados.ds_grau_escolaridade, dados.cd_raca_cor, dados.ds_raca_cor,
            dados.cd_identidade_genero, dados.ds_identidade_genero, dados.cd_quilombola, dados.ds_quilombola,
            dados.cd_interprete_libras, dados.ds_interprete_libras, dados.tp_obrigatoriedade_voto,
            dados.qt_eleitores_perfil, dados.qt_eleitores_biometria, dados.qt_eleitores_deficiencia, dados.qt_eleitores_inc_nm_social,
            municipioId, eleicaoId
          ];
          
          registrosParaInserir.push(perfilData);
        }
        
        // Inserir registros em sub-lotes menores para evitar timeout
        if (registrosParaInserir.length > 0) {
          const subBatchSize = 25; // Reduzido para 25 registros por query
          
          for (let j = 0; j < registrosParaInserir.length; j += subBatchSize) {
            const subBatch = registrosParaInserir.slice(j, j + subBatchSize);
            
            const values = subBatch.map((_, index) => {
              const offset = index * 33; // 33 valores por registro
              return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27}, $${offset + 28}, $${offset + 29}, $${offset + 30}, $${offset + 31}, $${offset + 32}, $${offset + 33})`;
            }).join(',');
            
            const flatValues = subBatch.flat();
            
            // Inserir com retry
            let tentativas = 0;
            let sucesso = false;
            
            while (tentativas < 3 && !sucesso) {
              try {
                await db.query(`
                  INSERT INTO perfil_eleitor_secao (
                    dt_geracao, hh_geracao, ano_eleicao, sg_uf, cd_municipio, nm_municipio,
                    nr_zona, nr_secao, nr_local_votacao, nm_local_votacao, cd_genero, ds_genero,
                    cd_estado_civil, ds_estado_civil, cd_faixa_etaria, ds_faixa_etaria,
                    cd_grau_escolaridade, ds_grau_escolaridade, cd_raca_cor, ds_raca_cor,
                    cd_identidade_genero, ds_identidade_genero, cd_quilombola, ds_quilombola,
                    cd_interprete_libras, ds_interprete_libras, tp_obrigatoriedade_voto,
                    qt_eleitores_perfil, qt_eleitores_biometria, qt_eleitores_deficiencia, qt_eleitores_inc_nm_social,
                    municipio_id, eleicao_id
                  )
                  VALUES ${values}
                  ON CONFLICT (ano_eleicao, sg_uf, cd_municipio, nr_zona, nr_secao, cd_genero, cd_estado_civil, cd_faixa_etaria, cd_grau_escolaridade, cd_raca_cor) DO UPDATE SET
                    qt_eleitores_perfil = EXCLUDED.qt_eleitores_perfil,
                    qt_eleitores_biometria = EXCLUDED.qt_eleitores_biometria,
                    qt_eleitores_deficiencia = EXCLUDED.qt_eleitores_deficiencia,
                    qt_eleitores_inc_nm_social = EXCLUDED.qt_eleitores_inc_nm_social,
                    municipio_id = EXCLUDED.municipio_id
                `, flatValues);
                sucesso = true;
              } catch (error) {
                tentativas++;
                console.warn(`⚠️ Tentativa ${tentativas} de inserção falhou:`, error.message);
                if (tentativas < 3) {
                  await new Promise(resolve => setTimeout(resolve, 2000 * tentativas));
                } else {
                  throw error;
                }
              }
            }
          }
          
          registrosInseridos += registrosParaInserir.length;
        }
        
        registrosProcessados += batch.length;
        
        // Log de progresso
        console.log(`✅ Lote processado: ${registrosProcessados} registros processados, ${registrosInseridos} inseridos`);
        
      } catch (error) {
        console.error('❌ Erro ao processar lote:', error.message);
        registrosIgnorados += batch.length;
      }
    }

    // Limpar arquivo temporário
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      stats: {
        total_linhas: lineNumber,
        linhas_processadas: registrosProcessados,
        perfil_inseridos: registrosInseridos,
        municipios_encontrados: municipiosEncontrados,
        registros_ignorados: registrosIgnorados,
        erros: errors.length
      },
      message: `Importação concluída: ${registrosInseridos} registros de perfil inseridos`
    });

  } catch (error) {
    console.error('❌ Erro durante o processamento:', error);
    
    // Limpar arquivo temporário em caso de erro
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Erro ao remover arquivo temporário:', unlinkError);
      }
    }
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

module.exports = router;
