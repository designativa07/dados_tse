const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Joi = require('joi');
const db = require('../config/database');

const router = express.Router();

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `tse-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos CSV são permitidos'), false);
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB
  }
});

// Schema de validação para eleição
const eleicaoSchema = Joi.object({
  ano: Joi.number().integer().min(1990).max(2030).required(),
  tipo: Joi.string().min(1).max(100).required(),
  descricao: Joi.string().max(255).optional(),
  turno: Joi.number().integer().min(1).max(2).required(),
  data_eleicao: Joi.string().optional(),
  data_geracao: Joi.string().optional()
});

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

// Função para processar e inserir dados no banco (versão otimizada)
async function processarDadosOtimizado(dados, eleicaoId) {
  console.log('🚀 Iniciando processamento otimizado...');
  
  const startTime = Date.now();
  let votosInseridos = 0;
  let candidatosCriados = 0;
  let municipiosEncontrados = 0;

  // Agrupar dados por eleição se não foi fornecida
  const eleicoes = {};
  if (!eleicaoId) {
    for (const dado of dados) {
      const key = `${dado.ano}-${dado.tipo}-${dado.turno}`;
      if (!eleicoes[key]) {
        eleicoes[key] = {
          ano: dado.ano,
          tipo: dado.tipo,
          turno: dado.turno,
          data_eleicao: dado.dataEleicao,
          data_geracao: dado.dataGeracao
        };
      }
    }
  }

  // Processar cada eleição
  for (const [key, eleicaoData] of Object.entries(eleicoes)) {
    if (!eleicaoId) {
      const eleicaoResult = await db.query(`
        INSERT INTO eleicoes (ano, tipo, turno, data_eleicao, data_geracao)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (ano, tipo, turno) DO UPDATE SET
          data_eleicao = EXCLUDED.data_eleicao,
          data_geracao = EXCLUDED.data_geracao
        RETURNING id
      `, [eleicaoData.ano, eleicaoData.tipo, eleicaoData.turno, eleicaoData.data_eleicao, eleicaoData.data_geracao]);
      eleicaoId = eleicaoResult.rows[0].id;
    }

    // Filtrar dados desta eleição
    const dadosEleicao = dados.filter(d => 
      d.ano === eleicaoData.ano && 
      d.tipo === eleicaoData.tipo && 
      d.turno === eleicaoData.turno
    );

    console.log(`📊 Processando ${dadosEleicao.length} registros para eleição ${eleicaoData.ano}`);

    // Processar em lotes de 2000
    const BATCH_SIZE = 2000;
    for (let i = 0; i < dadosEleicao.length; i += BATCH_SIZE) {
      const lote = dadosEleicao.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processando lote ${Math.floor(i / BATCH_SIZE) + 1} (${lote.length} registros)...`);
      
      const resultadoLote = await processarLote(lote, eleicaoId);
      votosInseridos += resultadoLote.votosInseridos;
      candidatosCriados += resultadoLote.candidatosCriados;
      municipiosEncontrados += resultadoLote.municipiosEncontrados;
    }
  }

  const endTime = Date.now();
  const tempoTotal = (endTime - startTime) / 1000;
  
  console.log(`✅ Processamento concluído em ${tempoTotal.toFixed(2)}s`);
  console.log(`📊 Votos inseridos: ${votosInseridos}`);
  console.log(`👥 Candidatos criados: ${candidatosCriados}`);
  console.log(`🏙️ Municípios encontrados: ${municipiosEncontrados}`);

  return {
    votosInseridos,
    candidatosCriados,
    municipiosEncontrados
  };
}

// Função para processar um lote de dados
async function processarLote(dadosLote, eleicaoId) {
  let votosInseridos = 0;
  let candidatosCriados = 0;
  let municipiosEncontrados = 0;

  // Agrupar candidatos únicos
  const candidatos = new Map();
  for (const dado of dadosLote) {
    const key = `${dado.numero}-${dado.candidato}`;
    if (!candidatos.has(key)) {
      candidatos.set(key, {
        numero: dado.numero,
        nome: corrigirCaracteres(dado.candidato),
        cargo: corrigirCaracteres(dado.cargo)
      });
    }
  }

  // Inserir candidatos em lote
  if (candidatos.size > 0) {
    const candidatosArray = Array.from(candidatos.values());
    const values = candidatosArray.map((c, i) => 
      `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`
    ).join(', ');
    
    const params = candidatosArray.flatMap(c => [c.numero, c.nome, c.cargo, eleicaoId]);
    
    const result = await db.query(`
      INSERT INTO candidatos (numero, nome, cargo, eleicao_id)
      VALUES ${values}
      ON CONFLICT (numero, eleicao_id) DO UPDATE SET
        nome = EXCLUDED.nome,
        cargo = EXCLUDED.cargo
      RETURNING id, numero
    `, params);

    // Mapear IDs dos candidatos
    const candidatosMap = new Map();
    result.rows.forEach(row => {
      const key = `${row.numero}-${eleicaoId}`;
      candidatosMap.set(key, row.id);
    });

    // Agrupar municípios únicos
    const municipios = new Map();
    for (const dado of dadosLote) {
      const nomeCorrigido = corrigirCaracteres(dado.municipio);
      if (!municipios.has(nomeCorrigido)) {
        municipios.set(nomeCorrigido, dado.uf);
      }
    }

    // Inserir municípios em lote
    if (municipios.size > 0) {
      const municipiosArray = Array.from(municipios.entries());
      const values = municipiosArray.map(([nome, uf], i) => 
        `($${i * 2 + 1}, $${i * 2 + 2})`
      ).join(', ');
      
      const params = municipiosArray.flatMap(([nome, uf]) => [nome, uf]);
      
      const result = await db.query(`
        INSERT INTO municipios (nome, sigla_uf)
        VALUES ${values}
        ON CONFLICT (nome, sigla_uf) DO NOTHING
        RETURNING id, nome, sigla_uf
      `, params);

      // Buscar municípios existentes
      const municipiosExistentes = await db.query(`
        SELECT id, nome, sigla_uf FROM municipios 
        WHERE (nome, sigla_uf) IN (${municipiosArray.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ')})
      `, municipiosArray.flatMap(([nome, uf]) => [nome, uf]));

      // Mapear IDs dos municípios
      const municipiosMap = new Map();
      municipiosExistentes.rows.forEach(row => {
        const key = `${row.nome}-${row.sigla_uf}`;
        municipiosMap.set(key, row.id);
      });

      // Preparar votos para inserção em lote
      const votos = [];
      for (const dado of dadosLote) {
        const keyCandidato = `${dado.numero}-${eleicaoId}`;
        const nomeMunicipioCorrigido = corrigirCaracteres(dado.municipio);
        const keyMunicipio = `${nomeMunicipioCorrigido}-${dado.uf}`;
        
        const candidatoId = candidatosMap.get(keyCandidato);
        const municipioId = municipiosMap.get(keyMunicipio);
        
        if (candidatoId && municipioId) {
          votos.push({
            eleicao_id: eleicaoId,
            municipio_id: municipioId,
            candidato_id: candidatoId,
            zona: dado.zona,
            secao: dado.secao,
            local_votacao: dado.localVotacao,
            endereco_local: dado.enderecoLocal,
            quantidade_votos: dado.votos
          });
        }
      }

      // Inserir votos em lote
      if (votos.length > 0) {
        const values = votos.map((v, i) => 
          `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`
        ).join(', ');

        const params = votos.flatMap(v => [
          v.eleicao_id, v.municipio_id, v.candidato_id, v.zona, v.secao,
          v.local_votacao, v.endereco_local, v.quantidade_votos
        ]);

        await db.query(`
          INSERT INTO votos (eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos)
          VALUES ${values}
          ON CONFLICT (eleicao_id, municipio_id, candidato_id, zona, secao) DO UPDATE SET
            quantidade_votos = EXCLUDED.quantidade_votos,
            local_votacao = EXCLUDED.local_votacao,
            endereco_local = EXCLUDED.endereco_local
        `, params);

        votosInseridos = votos.length;
        candidatosCriados = candidatos.size;
        municipiosEncontrados = municipios.size;
      }
    }
  }

  return {
    votosInseridos,
    candidatosCriados,
    municipiosEncontrados
  };
}

// POST /api/upload-otimizado/csv - Upload e processamento otimizado de CSV
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

    console.log('📁 Iniciando leitura do arquivo CSV...');

    // Processar CSV
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath, { encoding: 'utf8' })
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => {
          lineNumber++;
          try {
            const processedData = processarLinhaCSV(data, lineNumber);
            if (processedData) {
              results.push(processedData);
            }
          } catch (error) {
            errors.push({
              line: lineNumber,
              error: error.message,
              data: data
            });
          }
        })
        .on('end', () => {
          console.log(`✅ Leitura concluída: ${results.length} registros válidos, ${errors.length} erros`);
          resolve();
        })
        .on('error', reject);
    });

    if (results.length === 0) {
      return res.status(400).json({ 
        error: 'Nenhum dado válido encontrado no arquivo',
        errors: errors.slice(0, 10) // Mostrar apenas os primeiros 10 erros
      });
    }

    console.log('🔄 Iniciando processamento dos dados...');

    // Processar dados
    const resultado = await processarDadosOtimizado(results, eleicaoData?.id);

    // Limpar arquivo temporário
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Arquivo processado com sucesso',
      stats: {
        total_linhas: lineNumber,
        registros_validos: results.length,
        erros: errors.length,
        votos_inseridos: resultado.votosInseridos,
        candidatos_criados: resultado.candidatosCriados,
        municipios_encontrados: resultado.municipiosEncontrados
      },
      errors: errors.slice(0, 10) // Mostrar apenas os primeiros 10 erros
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    
    // Limpar arquivo temporário em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// GET /api/upload-otimizado/template - Download do template CSV
router.get('/template', (req, res) => {
  const template = `DT_GERACAO;HH_GERACAO;ANO_ELEICAO;CD_TIPO_ELEICAO;NM_TIPO_ELEICAO;NR_TURNO;CD_ELEICAO;DS_ELEICAO;DT_ELEICAO;TP_ABRANGENCIA;SG_UF;SG_UE;NM_UE;CD_MUNICIPIO;NM_MUNICIPIO;NR_ZONA;NR_SECAO;CD_CARGO;DS_CARGO;NR_VOTAVEL;NM_VOTAVEL;QT_VOTOS;NR_LOCAL_VOTACAO;SQ_CANDIDATO;NM_LOCAL_VOTACAO;DS_LOCAL_VOTACAO_ENDERECO
15/07/2021;10:53:12;2018;2;Eleição Ordinária;1;297;Eleições Gerais Estaduais 2018;07/10/2018;E;SC;SC;SANTA CATARINA;80896;CRICIÚMA;10;499;3;Governador;15;MAURO MARIANI;44;1210;240000609537;E. M. E. E ENSINO FUNDAMENTAL JOSÉ CESÁRIO DA SILVA;RUA INDAIAL, S/N`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="template_tse.csv"');
  res.send(template);
});

module.exports = router;
