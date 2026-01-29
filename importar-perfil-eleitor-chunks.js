const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const db = require('./config/database-otimizado');

/**
 * Script otimizado que processa em chunks pequenos
 * Evita problemas de memória e permissões
 */

const CONFIG = {
    CHUNK_SIZE: 1000, // Processar 1000 linhas por vez
    BATCH_SIZE: 50,    // Inserir 50 registros por batch
    PAUSE_BETWEEN_CHUNKS: 100 // Pausa entre chunks
};

async function importarPerfilEleitor(arquivoCsv, anoEleicao) {
    console.log(`🚀 Iniciando importação em chunks do perfil do eleitor ${anoEleicao}...`);
    console.log(`📁 Arquivo: ${arquivoCsv}`);
    console.log(`⚙️  Configuração: Chunk ${CONFIG.CHUNK_SIZE}, Batch ${CONFIG.BATCH_SIZE}`);
    
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
    
    let linhasProcessadas = 0;
    let linhasInseridas = 0;
    let linhasComErro = 0;
    let chunk = [];
    
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
                    hh_geracao: limparValor(row.HH_GERACAO),
                    ano_eleicao: limparValor(row.ANO_ELEICAO, 'integer'),
                    sg_uf: limparValor(row.SG_UF),
                    cd_municipio: limparValor(row.CD_MUNICIPIO, 'integer'),
                    nm_municipio: limparValor(row.NM_MUNICIPIO),
                    nr_zona: limparValor(row.NR_ZONA, 'integer'),
                    nr_secao: limparValor(row.NR_SECAO, 'integer'),
                    nr_local_votacao: limparValor(row.NR_LOCAL_VOTACAO, 'integer'),
                    nm_local_votacao: limparValor(row.NM_LOCAL_VOTACAO),
                    cd_genero: limparValor(row.CD_GENERO, 'integer'),
                    ds_genero: limparValor(row.DS_GENERO),
                    cd_estado_civil: limparValor(row.CD_ESTADO_CIVIL, 'integer'),
                    ds_estado_civil: limparValor(row.DS_ESTADO_CIVIL),
                    cd_faixa_etaria: limparValor(row.CD_FAIXA_ETARIA, 'integer'),
                    ds_faixa_etaria: limparValor(row.DS_FAIXA_ETARIA),
                    cd_grau_escolaridade: limparValor(row.CD_GRAU_ESCOLARIDADE, 'integer'),
                    ds_grau_escolaridade: limparValor(row.DS_GRAU_ESCOLARIDADE),
                    cd_raca_cor: limparValor(row.CD_RACA_COR, 'integer'),
                    ds_raca_cor: limparValor(row.DS_RACA_COR),
                    cd_identidade_genero: limparValor(row.CD_IDENTIDADE_GENERO, 'integer'),
                    ds_identidade_genero: limparValor(row.DS_IDENTIDADE_GENERO),
                    cd_quilombola: limparValor(row.CD_QUILOMBOLA, 'integer'),
                    ds_quilombola: limparValor(row.DS_QUILOMBOLA),
                    cd_interprete_libras: limparValor(row.CD_INTERPRETE_LIBRAS, 'integer'),
                    ds_interprete_libras: limparValor(row.DS_INTERPRETE_LIBRAS),
                    tp_obrigatoriedade_voto: limparValor(row.TP_OBRIGATORIEDADE_VOTO),
                    qt_eleitores_perfil: limparValor(row.QT_ELEITORES_PERFIL, 'integer') || 0,
                    qt_eleitores_biometria: limparValor(row.QT_ELEITORES_BIOMETRIA, 'integer') || 0,
                    qt_eleitores_deficiencia: limparValor(row.QT_ELEITORES_DEFICIENCIA, 'integer') || 0,
                    qt_eleitores_inc_nm_social: limparValor(row.QT_ELEITORES_INC_NM_SOCIAL, 'integer') || 0,
                    eleicao_id: eleicaoId
                };

                chunk.push(dados);

                // Processar chunk quando atingir o tamanho
                if (chunk.length >= CONFIG.CHUNK_SIZE) {
                    await processarChunk(chunk);
                    linhasInseridas += chunk.length;
                    chunk = [];
                    
                    // Pausa entre chunks
                    await new Promise(resolve => setTimeout(resolve, CONFIG.PAUSE_BETWEEN_CHUNKS));
                    
                    if (linhasProcessadas % 10000 === 0) {
                        console.log(`📊 Processadas: ${linhasProcessadas} linhas | Inseridas: ${linhasInseridas}`);
                    }
                }

            } catch (error) {
                linhasComErro++;
                console.error(`❌ Erro na linha ${linhasProcessadas}:`, error.message);
            }
        });

        stream.on('end', async () => {
            try {
                // Processar chunk restante
                if (chunk.length > 0) {
                    await processarChunk(chunk);
                    linhasInseridas += chunk.length;
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

async function processarChunk(chunk) {
    if (chunk.length === 0) return;

    // Processar em batches menores
    for (let i = 0; i < chunk.length; i += CONFIG.BATCH_SIZE) {
        const batch = chunk.slice(i, i + CONFIG.BATCH_SIZE);
        await processarBatch(batch);
        
        // Pequena pausa entre batches
        await new Promise(resolve => setTimeout(resolve, 10));
    }
}

async function processarBatch(batch) {
    if (batch.length === 0) return;

    try {
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
                null, // municipio_id será preenchido depois
                dados.eleicao_id
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
    } catch (error) {
        console.error('❌ Erro no batch:', error.message);
        throw error;
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

async function main() {
    try {
        console.log('🚀 Iniciando importação em chunks dos dados de perfil do eleitor...\n');
        
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
            console.log(`✅ 2018: ${resultado2018.linhasInseridas} registros inseridos`);
            
            // Atualizar municipio_id
            console.log('🔄 Atualizando municipio_id para 2018...');
            await db.query(`
                UPDATE perfil_eleitor_secao 
                SET municipio_id = m.id 
                FROM municipios m 
                WHERE perfil_eleitor_secao.cd_municipio = m.codigo 
                AND perfil_eleitor_secao.municipio_id IS NULL
                AND perfil_eleitor_secao.ano_eleicao = 2018
            `);
        } else {
            console.log('⚠️  Arquivo de 2018 não encontrado');
        }

        // Importar dados de 2022
        const arquivo2022 = './perfil_eleitor_secao_2022_SC/perfil_eleitor_secao_2022_SC.csv';
        if (fs.existsSync(arquivo2022)) {
            console.log('\n📊 Importando dados de 2022...');
            const resultado2022 = await importarPerfilEleitor(arquivo2022, 2022);
            console.log(`✅ 2022: ${resultado2022.linhasInseridas} registros inseridos`);
            
            // Atualizar municipio_id
            console.log('🔄 Atualizando municipio_id para 2022...');
            await db.query(`
                UPDATE perfil_eleitor_secao 
                SET municipio_id = m.id 
                FROM municipios m 
                WHERE perfil_eleitor_secao.cd_municipio = m.codigo 
                AND perfil_eleitor_secao.municipio_id IS NULL
                AND perfil_eleitor_secao.ano_eleicao = 2022
            `);
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
