const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');

// Configuração otimizada para grandes volumes
const CONFIG = {
    BATCH_SIZE: 500, // Reduzido para evitar timeout
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 segundo
    CONNECTION_TIMEOUT: 30000, // 30 segundos
    QUERY_TIMEOUT: 60000 // 60 segundos
};

/**
 * Script para importar dados de perfil do eleitor por seção
 * Processa arquivos CSV do TSE com dados demográficos detalhados
 */

async function importarPerfilEleitor(arquivoCsv, anoEleicao) {
    console.log(`🚀 Iniciando importação do perfil do eleitor ${anoEleicao}...`);
    console.log(`📁 Arquivo: ${arquivoCsv}`);
    
    let linhasProcessadas = 0;
    let linhasInseridas = 0;
    let linhasComErro = 0;
    const batchSize = CONFIG.BATCH_SIZE;
    let batch = [];
    
    // Cache para municípios (evita consultas repetidas)
    const municipiosCache = new Map();
    
    // Verificar se a eleição existe
    const eleicao = await db.query(
        'SELECT id FROM eleicoes WHERE ano = $1',
        [anoEleicao]
    );
    
    if (eleicao.rows.length === 0) {
        console.log(`⚠️  Eleição ${anoEleicao} não encontrada. Criando...`);
        await db.query(
            'INSERT INTO eleicoes (ano, tipo, descricao) VALUES ($1, $2, $3)',
            [anoEleicao, 'Geral', `Eleição Geral ${anoEleicao}`]
        );
        console.log(`✅ Eleição ${anoEleicao} criada.`);
    }
    
    const eleicaoId = eleicao.rows[0]?.id || (await db.query('SELECT id FROM eleicoes WHERE ano = $1', [anoEleicao])).rows[0].id;
    
    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(arquivoCsv)
            .pipe(csv({
                separator: ';',
                headers: [
                    'DT_GERACAO', 'HH_GERACAO', 'ANO_ELEICAO', 'SG_UF', 'CD_MUNICIPIO', 'NM_MUNICIPIO',
                    'NR_ZONA', 'NR_SECAO', 'NR_LOCAL_VOTACAO', 'NM_LOCAL_VOTACAO', 'CD_GENERO', 'DS_GENERO',
                    'CD_ESTADO_CIVIL', 'DS_ESTADO_CIVIL', 'CD_FAIXA_ETARIA', 'DS_FAIXA_ETARIA',
                    'CD_GRAU_ESCOLARIDADE', 'DS_GRAU_ESCOLARIDADE', 'CD_RACA_COR', 'DS_RACA_COR',
                    'CD_IDENTIDADE_GENERO', 'DS_IDENTIDADE_GENERO', 'CD_QUILOMBOLA', 'DS_QUILOMBOLA',
                    'CD_INTERPRETE_LIBRAS', 'DS_INTERPRETE_LIBRAS', 'TP_OBRIGATORIEDADE_VOTO',
                    'QT_ELEITORES_PERFIL', 'QT_ELEITORES_BIOMETRIA', 'QT_ELEITORES_DEFICIENCIA', 'QT_ELEITORES_INC_NM_SOCIAL'
                ]
            }));

        stream.on('data', async (row) => {
            try {
                linhasProcessadas++;
                
                // Limpar e converter dados
                const dados = {
                    dt_geracao: converterData(row.DT_GERACAO),
                    hh_geracao: row.HH_GERACAO,
                    ano_eleicao: parseInt(row.ANO_ELEICAO),
                    sg_uf: row.SG_UF?.trim(),
                    cd_municipio: parseInt(row.CD_MUNICIPIO),
                    nm_municipio: row.NM_MUNICIPIO?.trim(),
                    nr_zona: parseInt(row.NR_ZONA),
                    nr_secao: parseInt(row.NR_SECAO),
                    nr_local_votacao: row.NR_LOCAL_VOTACAO ? parseInt(row.NR_LOCAL_VOTACAO) : null,
                    nm_local_votacao: row.NM_LOCAL_VOTACAO?.trim() || null,
                    cd_genero: row.CD_GENERO ? parseInt(row.CD_GENERO) : null,
                    ds_genero: row.DS_GENERO?.trim() || null,
                    cd_estado_civil: row.CD_ESTADO_CIVIL ? parseInt(row.CD_ESTADO_CIVIL) : null,
                    ds_estado_civil: row.DS_ESTADO_CIVIL?.trim() || null,
                    cd_faixa_etaria: row.CD_FAIXA_ETARIA ? parseInt(row.CD_FAIXA_ETARIA) : null,
                    ds_faixa_etaria: row.DS_FAIXA_ETARIA?.trim() || null,
                    cd_grau_escolaridade: row.CD_GRAU_ESCOLARIDADE ? parseInt(row.CD_GRAU_ESCOLARIDADE) : null,
                    ds_grau_escolaridade: row.DS_GRAU_ESCOLARIDADE?.trim() || null,
                    cd_raca_cor: row.CD_RACA_COR ? parseInt(row.CD_RACA_COR) : null,
                    ds_raca_cor: row.DS_RACA_COR?.trim() || null,
                    cd_identidade_genero: row.CD_IDENTIDADE_GENERO ? parseInt(row.CD_IDENTIDADE_GENERO) : null,
                    ds_identidade_genero: row.DS_IDENTIDADE_GENERO?.trim() || null,
                    cd_quilombola: row.CD_QUILOMBOLA ? parseInt(row.CD_QUILOMBOLA) : null,
                    ds_quilombola: row.DS_QUILOMBOLA?.trim() || null,
                    cd_interprete_libras: row.CD_INTERPRETE_LIBRAS ? parseInt(row.CD_INTERPRETE_LIBRAS) : null,
                    ds_interprete_libras: row.DS_INTERPRETE_LIBRAS?.trim() || null,
                    tp_obrigatoriedade_voto: row.TP_OBRIGATORIEDADE_VOTO?.trim() || null,
                    qt_eleitores_perfil: parseInt(row.QT_ELEITORES_PERFIL) || 0,
                    qt_eleitores_biometria: parseInt(row.QT_ELEITORES_BIOMETRIA) || 0,
                    qt_eleitores_deficiencia: parseInt(row.QT_ELEITORES_DEFICIENCIA) || 0,
                    qt_eleitores_inc_nm_social: parseInt(row.QT_ELEITORES_INC_NM_SOCIAL) || 0,
                    eleicao_id: eleicaoId
                };

                // Buscar municipio_id (com cache)
                if (!municipiosCache.has(dados.cd_municipio)) {
                    const municipio = await executarComRetry(async () => {
                        return await db.query('SELECT id FROM municipios WHERE codigo = $1', [dados.cd_municipio]);
                    });
                    
                    if (municipio.rows.length > 0) {
                        municipiosCache.set(dados.cd_municipio, municipio.rows[0].id);
                    } else {
                        municipiosCache.set(dados.cd_municipio, null);
                        console.log(`⚠️  Município não encontrado: ${dados.cd_municipio} - ${dados.nm_municipio}`);
                    }
                }
                
                dados.municipio_id = municipiosCache.get(dados.cd_municipio);

                batch.push(dados);

                // Processar batch quando atingir o tamanho
                if (batch.length >= batchSize) {
                    await processarBatch(batch);
                    linhasInseridas += batch.length;
                    batch = [];
                    
                    if (linhasProcessadas % 10000 === 0) {
                        console.log(`📊 Processadas: ${linhasProcessadas} linhas`);
                    }
                }

            } catch (error) {
                linhasComErro++;
                console.error(`❌ Erro na linha ${linhasProcessadas}:`, error.message);
            }
        });

        stream.on('end', async () => {
            try {
                // Processar batch restante
                if (batch.length > 0) {
                    await processarBatch(batch);
                    linhasInseridas += batch.length;
                }

                console.log('\n✅ Importação concluída!');
                console.log(`📊 Estatísticas:`);
                console.log(`   - Linhas processadas: ${linhasProcessadas}`);
                console.log(`   - Linhas inseridas: ${linhasInseridas}`);
                console.log(`   - Linhas com erro: ${linhasComErro}`);
                
                resolve({
                    linhasProcessadas,
                    linhasInseridas,
                    linhasComErro
                });
            } catch (error) {
                reject(error);
            }
        });

        stream.on('error', (error) => {
            console.error('❌ Erro no stream:', error);
            reject(error);
        });
    });
}

// Função para retry com backoff exponencial
async function executarComRetry(operacao, maxTentativas = CONFIG.MAX_RETRIES) {
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
            return await operacao();
        } catch (error) {
            if (tentativa === maxTentativas) {
                throw error;
            }
            
            const delay = CONFIG.RETRY_DELAY * Math.pow(2, tentativa - 1);
            console.log(`⚠️  Tentativa ${tentativa} falhou, tentando novamente em ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function processarBatch(batch) {
    if (batch.length === 0) return;

    await executarComRetry(async () => {
        const values = [];
        const placeholders = [];
        
        batch.forEach((dados, index) => {
            const baseIndex = index * 32; // 32 campos
            placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14}, $${baseIndex + 15}, $${baseIndex + 16}, $${baseIndex + 17}, $${baseIndex + 18}, $${baseIndex + 19}, $${baseIndex + 20}, $${baseIndex + 21}, $${baseIndex + 22}, $${baseIndex + 23}, $${baseIndex + 24}, $${baseIndex + 25}, $${baseIndex + 26}, $${baseIndex + 27}, $${baseIndex + 28}, $${baseIndex + 29}, $${baseIndex + 30}, $${baseIndex + 31}, $${baseIndex + 32})`);
            
            values.push(
                dados.dt_geracao, dados.hh_geracao, dados.ano_eleicao, dados.sg_uf, dados.cd_municipio,
                dados.nm_municipio, dados.nr_zona, dados.nr_secao, dados.nr_local_votacao, dados.nm_local_votacao,
                dados.cd_genero, dados.ds_genero, dados.cd_estado_civil, dados.ds_estado_civil, dados.cd_faixa_etaria,
                dados.ds_faixa_etaria, dados.cd_grau_escolaridade, dados.ds_grau_escolaridade, dados.cd_raca_cor, dados.ds_raca_cor,
                dados.cd_identidade_genero, dados.ds_identidade_genero, dados.cd_quilombola, dados.ds_quilombola,
                dados.cd_interprete_libras, dados.ds_interprete_libras, dados.tp_obrigatoriedade_voto,
                dados.qt_eleitores_perfil, dados.qt_eleitores_biometria, dados.qt_eleitores_deficiencia, dados.qt_eleitores_inc_nm_social,
                dados.municipio_id, dados.eleicao_id
            );
        });

        const query = `
            INSERT INTO perfil_eleitor_secao (
                dt_geracao, hh_geracao, ano_eleicao, sg_uf, cd_municipio, nm_municipio,
                nr_zona, nr_secao, nr_local_votacao, nm_local_votacao, cd_genero, ds_genero,
                cd_estado_civil, ds_estado_civil, cd_faixa_etaria, ds_faixa_etaria,
                cd_grau_escolaridade, ds_grau_escolaridade, cd_raca_cor, ds_raca_cor,
                cd_identidade_genero, ds_identidade_genero, cd_quilombola, ds_quilombola,
                cd_interprete_libras, ds_interprete_libras, tp_obrigatoriedade_voto,
                qt_eleitores_perfil, qt_eleitores_biometria, qt_eleitores_deficiencia, qt_eleitores_inc_nm_social,
                municipio_id, eleicao_id
            ) VALUES ${placeholders.join(', ')}
        `;

        await db.query(query, values);
    });
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

async function main() {
    try {
        console.log('🚀 Iniciando importação dos dados de perfil do eleitor...\n');
        
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
            console.log(`✅ 2018: ${resultado2018.linhasInseridas} registros inseridos`);
        } else {
            console.log('⚠️  Arquivo de 2018 não encontrado');
        }

        // Importar dados de 2022
        const arquivo2022 = './perfil_eleitor_secao_2022_SC/perfil_eleitor_secao_2022_SC.csv';
        if (fs.existsSync(arquivo2022)) {
            console.log('\n📊 Importando dados de 2022...');
            const resultado2022 = await importarPerfilEleitor(arquivo2022, 2022);
            console.log(`✅ 2022: ${resultado2022.linhasInseridas} registros inseridos`);
        } else {
            console.log('⚠️  Arquivo de 2022 não encontrado');
        }

        console.log('\n🎉 Importação concluída com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante a importação:', error);
    } finally {
        await db.end();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { importarPerfilEleitor };
