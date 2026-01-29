const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');

/**
 * Script baseado no método funcional de upload CSV
 * Adaptado para dados de perfil do eleitor
 */

// Função para processar uma linha do CSV de perfil do eleitor
function processarLinhaCSVPerfil(data, lineNumber) {
  try {
    // Limpar e converter dados
    const dados = {
      dt_geracao: converterData(data.DT_GERACAO),
      hh_geracao: limparValor(data.HH_GERACAO),
      ano_eleicao: limparValor(data.ANO_ELEICAO, 'integer'),
      sg_uf: limparValor(data.SG_UF),
      cd_municipio: limparValor(data.CD_MUNICIPIO, 'integer'),
      nm_municipio: limparValor(data.NM_MUNICIPIO),
      nr_zona: limparValor(data.NR_ZONA, 'integer'),
      nr_secao: limparValor(data.NR_SECAO, 'integer'),
      nr_local_votacao: limparValor(data.NR_LOCAL_VOTACAO, 'integer'),
      nm_local_votacao: limparValor(data.NM_LOCAL_VOTACAO),
      cd_genero: limparValor(data.CD_GENERO, 'integer'),
      ds_genero: limparValor(data.DS_GENERO),
      cd_estado_civil: limparValor(data.CD_ESTADO_CIVIL, 'integer'),
      ds_estado_civil: limparValor(data.DS_ESTADO_CIVIL),
      cd_faixa_etaria: limparValor(data.CD_FAIXA_ETARIA, 'integer'),
      ds_faixa_etaria: limparValor(data.DS_FAIXA_ETARIA),
      cd_grau_escolaridade: limparValor(data.CD_GRAU_ESCOLARIDADE, 'integer'),
      ds_grau_escolaridade: limparValor(data.DS_GRAU_ESCOLARIDADE),
      cd_raca_cor: limparValor(data.CD_RACA_COR, 'integer'),
      ds_raca_cor: limparValor(data.DS_RACA_COR),
      cd_identidade_genero: limparValor(data.CD_IDENTIDADE_GENERO, 'integer'),
      ds_identidade_genero: limparValor(data.DS_IDENTIDADE_GENERO),
      cd_quilombola: limparValor(data.CD_QUILOMBOLA, 'integer'),
      ds_quilombola: limparValor(data.DS_QUILOMBOLA),
      cd_interprete_libras: limparValor(data.CD_INTERPRETE_LIBRAS, 'integer'),
      ds_interprete_libras: limparValor(data.DS_INTERPRETE_LIBRAS),
      tp_obrigatoriedade_voto: limparValor(data.TP_OBRIGATORIEDADE_VOTO),
      qt_eleitores_perfil: limparValor(data.QT_ELEITORES_PERFIL, 'integer') || 0,
      qt_eleitores_biometria: limparValor(data.QT_ELEITORES_BIOMETRIA, 'integer') || 0,
      qt_eleitores_deficiencia: limparValor(data.QT_ELEITORES_DEFICIENCIA, 'integer') || 0,
      qt_eleitores_inc_nm_social: limparValor(data.QT_ELEITORES_INC_NM_SOCIAL, 'integer') || 0
    };

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

function limparValor(valor, tipo = 'string') {
  if (!valor || valor === '' || valor === 'null' || valor === 'undefined') {
    return null;
  }
  
  const valorLimpo = valor.toString().trim();
  
  if (tipo === 'integer') {
    const num = parseInt(valorLimpo);
    return isNaN(num) ? null : num;
  }
  
  return valorLimpo;
}

function converterData(dataStr) {
  if (!dataStr) return null;
  
  // Formato: DD/MM/YYYY
  const partes = dataStr.split('/');
  if (partes.length === 3) {
    return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
  }
  return null;
}

// Função principal baseada no método funcional
async function processarDadosPerfil(dados, eleicaoId) {
  console.log(`🔍 processarDadosPerfil chamada com ${dados.length} dados, eleicaoId: ${eleicaoId}`);
  let registrosInseridos = 0;
  let municipiosEncontrados = 0;

  if (eleicaoId) {
    console.log(`🔄 Processando ${dados.length} registros de perfil para eleição ID ${eleicaoId}`);
    const dadosEleicao = dados;

    // Processar em lotes para otimizar performance
    console.log(`🔄 Processando ${dadosEleicao.length} registros em lotes...`);
    const batchSize = 5000; // Processar 5.000 registros por vez
    const totalBatches = Math.ceil(dadosEleicao.length / batchSize);
    
    for (let i = 0; i < dadosEleicao.length; i += batchSize) {
      const batch = dadosEleicao.slice(i, i + batchSize);
      const currentBatch = Math.floor(i/batchSize) + 1;
      const processedRecords = i + batch.length;
      const percentage = Math.round((processedRecords / dadosEleicao.length) * 100);
      
      console.log(`🔄 Processando lote ${currentBatch}/${totalBatches} (${batch.length} registros) - ${percentage}% concluído...`);
      
      // Buscar municípios em lote (otimização)
      const municipiosUnicos = [...new Set(batch.map(d => `${d.cd_municipio}|${d.sg_uf}`))];
      
      // Buscar municípios em lote
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
        } else {
          console.warn(`⚠️ Município não encontrado: ${cdMunicipio} - ${uf}`);
        }
      }
      
      // Preparar dados para inserção em lote
      const registrosParaInserir = [];
      
      for (const dado of batch) {
        const municipioKey = `${dado.cd_municipio}|${dado.sg_uf}`;
        const municipioId = municipiosMap.get(municipioKey);
        
        if (!municipioId) {
          console.warn(`⚠️ Município não encontrado para: ${dado.cd_municipio} - ${dado.nm_municipio}`);
          continue;
        }
        
        // Preparar dados do perfil
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
      
      // Inserir registros em sub-lotes para evitar limite de parâmetros do PostgreSQL
      if (registrosParaInserir.length > 0) {
        const subBatchSize = 100; // Máximo 100 registros por query (32 colunas × 100 = 3200 parâmetros)
        
        for (let j = 0; j < registrosParaInserir.length; j += subBatchSize) {
          const subBatch = registrosParaInserir.slice(j, j + subBatchSize);
          
          const values = subBatch.map((_, index) => {
            const offset = index * 32; // 32 valores (excluindo id e created_at que são automáticos)
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
      
      // Log de progresso detalhado
      console.log(`✅ Lote ${currentBatch}/${totalBatches} concluído: ${registrosInseridos} registros inseridos até agora`);
      
      // Pequena pausa entre lotes para não sobrecarregar
      if (i + batchSize < dadosEleicao.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log(`✅ Processamento finalizado: ${registrosInseridos} registros, ${municipiosEncontrados} municípios`);
  } else {
    console.log(`❌ Nenhum eleicaoId fornecido, não há dados para processar`);
  }

  return {
    registrosInseridos,
    municipiosEncontrados
  };
}

async function importarPerfilEleitor(arquivoCsv, anoEleicao) {
  console.log(`🚀 Iniciando importação do perfil do eleitor ${anoEleicao}...`);
  console.log(`📁 Arquivo: ${arquivoCsv}`);
  
  // Verificar se a eleição existe
  const eleicao = await db.query('SELECT id FROM eleicoes WHERE ano = $1', [anoEleicao]);
  
  if (eleicao.rows.length === 0) {
    console.log(`⚠️  Eleição ${anoEleicao} não encontrada. Criando...`);
    await db.query(
      'INSERT INTO eleicoes (ano, tipo, descricao) VALUES ($1, $2, $3)',
      [anoEleicao, 'Geral', `Eleição Geral ${anoEleicao}`]
    );
    console.log(`✅ Eleição ${anoEleicao} criada.`);
  }
  
  const eleicaoId = eleicao.rows[0]?.id || (await db.query('SELECT id FROM eleicoes WHERE ano = $1', [anoEleicao])).rows[0].id;
  
  const results = [];
  const errors = [];
  let lineNumber = 0;

  console.log('📁 Iniciando leitura do arquivo CSV...');

  // Processar CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(arquivoCsv, { encoding: 'utf8' })
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
      .on('end', () => {
        console.log(`✅ Leitura concluída: ${results.length} registros válidos, ${errors.length} erros`);
        resolve();
      })
      .on('error', reject);
  });

  if (results.length === 0) {
    console.log('❌ Nenhum dado válido encontrado no arquivo');
    return { registrosInseridos: 0, municipiosEncontrados: 0 };
  }

  console.log('🔄 Iniciando processamento dos dados...');

  // Processar dados
  const resultado = await processarDadosPerfil(results, eleicaoId);

  return resultado;
}

async function main() {
  try {
    console.log('🚀 Iniciando importação dos dados de perfil do eleitor...\n');
    
    // Testar conexão
    const conectado = await db.testConnection();
    if (!conectado) {
      console.error('❌ Não foi possível conectar ao banco de dados');
      return;
    }
    
    // Verificar se a tabela existe
    const tabelaExiste = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'perfil_eleitor_secao'
      );
    `);
    
    if (!tabelaExiste.rows[0].exists) {
      console.log('📋 Criando tabela perfil_eleitor_secao...');
      const schema = fs.readFileSync('./database/perfil_eleitor_schema.sql', 'utf8');
      await db.query(schema);
      console.log('✅ Tabela criada com sucesso!');
    }

    // Importar dados de 2018
    const arquivo2018 = './perfil_eleitor_secao_2018_SC/perfil_eleitor_secao_2018_SC.csv';
    if (fs.existsSync(arquivo2018)) {
      console.log('\n📊 Importando dados de 2018...');
      const resultado2018 = await importarPerfilEleitor(arquivo2018, 2018);
      console.log(`✅ 2018: ${resultado2018.registrosInseridos} registros inseridos`);
    } else {
      console.log('⚠️  Arquivo de 2018 não encontrado');
    }

    // Importar dados de 2022
    const arquivo2022 = './perfil_eleitor_secao_2022_SC/perfil_eleitor_secao_2022_SC.csv';
    if (fs.existsSync(arquivo2022)) {
      console.log('\n📊 Importando dados de 2022...');
      const resultado2022 = await importarPerfilEleitor(arquivo2022, 2022);
      console.log(`✅ 2022: ${resultado2022.registrosInseridos} registros inseridos`);
    } else {
      console.log('⚠️  Arquivo de 2022 não encontrado');
    }

    console.log('\n🎉 Importação concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
  } finally {
    await db.closePool();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { importarPerfilEleitor };
