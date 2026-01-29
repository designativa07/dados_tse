const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');

/**
 * Script de importação com streaming para evitar problemas de memória
 * Processa o arquivo linha por linha sem carregar tudo na memória
 */

// Mapeamento das colunas do CSV para o banco
const MAPEAMENTO_COLUNAS = {
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

function limparValor(valor, tipo = 'string') {
  if (!valor || valor === '' || valor === 'null' || valor === 'undefined' || valor === '#NULO!' || valor === '#NE') {
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

// Função para processar uma linha do CSV
function processarLinhaCSVPerfil(data, lineNumber) {
  try {
    const dados = {};
    
    // Mapear todas as colunas do CSV
    for (const [csvCol, dbCol] of Object.entries(MAPEAMENTO_COLUNAS)) {
      const valor = data[csvCol];
      
      // Converter valores baseado no tipo
      if (dbCol === 'dt_geracao') {
        dados[dbCol] = converterData(valor);
      } else if (dbCol.includes('qt_') || dbCol.startsWith('cd_') || dbCol.startsWith('nr_')) {
        dados[dbCol] = limparValor(valor, 'integer');
      } else {
        dados[dbCol] = limparValor(valor, 'string');
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

// Cache para municípios
const municipiosCache = new Map();

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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
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

async function importarPerfilEleitorStreaming(arquivoCsv, anoEleicao) {
  console.log(`🚀 Iniciando importação streaming do perfil do eleitor ${anoEleicao}...`);
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
  
  let registrosProcessados = 0;
  let registrosInseridos = 0;
  let registrosIgnorados = 0;
  let errors = [];

  console.log('📁 Iniciando leitura streaming do arquivo CSV...');

  // Processar CSV em streaming
  await new Promise((resolve, reject) => {
    fs.createReadStream(arquivoCsv, { encoding: 'utf8' })
      .pipe(csv({ 
        separator: ';',
        quote: '"',
        escape: '"',
        skipEmptyLines: true,
        skipLinesWithError: true
      }))
      .on('data', async (data) => {
        registrosProcessados++;
        
        try {
          const processedData = processarLinhaCSVPerfil(data, registrosProcessados);
          if (processedData) {
            const municipioId = await getMunicipioId(processedData.cd_municipio, processedData.sg_uf);
            
            if (municipioId) {
              const inserido = await inserirRegistro(processedData, municipioId, eleicaoId);
              if (inserido) {
                registrosInseridos++;
              } else {
                registrosIgnorados++;
              }
            } else {
              registrosIgnorados++;
            }
          } else {
            registrosIgnorados++;
          }
          
          // Log de progresso
          if (registrosProcessados % 10000 === 0) {
            console.log(`📊 Processados: ${registrosProcessados} | Inseridos: ${registrosInseridos} | Ignorados: ${registrosIgnorados}`);
          }
          
        } catch (error) {
          errors.push({
            linha: registrosProcessados,
            erro: error.message
          });
          registrosIgnorados++;
        }
      })
      .on('end', () => {
        console.log(`✅ Leitura concluída: ${registrosProcessados} registros processados`);
        resolve();
      })
      .on('error', reject);
  });

  return {
    registrosProcessados,
    registrosInseridos,
    registrosIgnorados,
    errors: errors.length
  };
}

async function main() {
  try {
    console.log('🚀 Iniciando importação streaming dos dados de perfil do eleitor...\n');
    
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
      const resultado2018 = await importarPerfilEleitorStreaming(arquivo2018, 2018);
      console.log(`✅ 2018: ${resultado2018.registrosInseridos} registros inseridos de ${resultado2018.registrosProcessados} processados`);
    } else {
      console.log('⚠️  Arquivo de 2018 não encontrado');
    }

    // Importar dados de 2022
    const arquivo2022 = './perfil_eleitor_secao_2022_SC/perfil_eleitor_secao_2022_SC.csv';
    if (fs.existsSync(arquivo2022)) {
      console.log('\n📊 Importando dados de 2022...');
      const resultado2022 = await importarPerfilEleitorStreaming(arquivo2022, 2022);
      console.log(`✅ 2022: ${resultado2022.registrosInseridos} registros inseridos de ${resultado2022.registrosProcessados} processados`);
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

module.exports = { importarPerfilEleitorStreaming };
