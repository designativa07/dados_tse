const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');

/**
 * Script memory-safe para importar dados de perfil do eleitor por seção
 * Versão otimizada para evitar problemas de memória e conexão
 */

// Configuração ultra-conservadora para evitar problemas
const CONFIG = {
    BATCH_SIZE: 100, // Muito pequeno para evitar problemas de memória
    MAX_RETRIES: 3,
    RETRY_DELAY: 15000, // 15 segundos entre tentativas
    CONNECTION_TIMEOUT: 30000,
    QUERY_TIMEOUT: 60000,
    PROGRESS_INTERVAL: 500, // Mostrar progresso a cada 500 linhas
    VALIDATE_DATA: true,
    SKIP_DUPLICATES: false, // Desabilitado para economizar memória
    BATCH_DELAY: 3000, // 3 segundos entre batches
    MEMORY_CLEANUP_INTERVAL: 1000 // Limpar cache a cada 1000 linhas
};

// Cache mínimo para otimização
const cache = {
    municipios: new Map(),
    eleicoes: new Map()
};

/**
 * Função principal para importar dados de eleitores
 */
async function importarDadosEleitoresMemorySafe(arquivoCsv, anoEleicao, opcoes = {}) {
    console.log(`🚀 Iniciando importação MEMORY-SAFE dos dados de eleitores ${anoEleicao}...`);
    console.log(`📁 Arquivo: ${arquivoCsv}`);
    console.log(`⚙️  Configurações ultra-conservadoras:`, {
        batchSize: CONFIG.BATCH_SIZE,
        batchDelay: CONFIG.BATCH_DELAY,
        skipDuplicates: CONFIG.SKIP_DUPLICATES
    });
    
    const inicio = Date.now();
    let estatisticas = {
        linhasProcessadas: 0,
        linhasInseridas: 0,
        linhasComErro: 0,
        linhasValidadas: 0,
        linhasInvalidas: 0,
        municipiosNaoEncontrados: 0,
        erros: [],
        batchesProcessados: 0
    };
    
    const batchSize = opcoes.batchSize || CONFIG.BATCH_SIZE;
    let batch = [];
    
    try {
        // Verificar se arquivo existe
        if (!fs.existsSync(arquivoCsv)) {
            throw new Error(`Arquivo não encontrado: ${arquivoCsv}`);
        }
        
        // Preparar ambiente
        await prepararAmbienteMemorySafe(anoEleicao);
        
        // Processar arquivo CSV
        await processarArquivoCSVMemorySafe(arquivoCsv, anoEleicao, batchSize, estatisticas, batch);
        
        // Processar batch restante
        if (batch.length > 0) {
            await processarBatchMemorySafe(batch, estatisticas);
            estatisticas.linhasInseridas += batch.length;
        }
        
        // Gerar relatório final
        const tempoTotal = Date.now() - inicio;
        gerarRelatorioFinal(estatisticas, tempoTotal);
        
        return estatisticas;
        
    } catch (error) {
        console.error('❌ Erro durante a importação:', error);
        throw error;
    }
}

/**
 * Preparar ambiente
 */
async function prepararAmbienteMemorySafe(anoEleicao) {
    console.log('🔧 Preparando ambiente memory-safe...');
    
    // Verificar/criar eleição
    const eleicao = await executarComRetryMemorySafe(async () => {
        return await db.query('SELECT id FROM eleicoes WHERE ano = $1', [anoEleicao]);
    });
    
    if (eleicao.rows.length === 0) {
        console.log(`⚠️  Eleição ${anoEleicao} não encontrada. Criando...`);
        await executarComRetryMemorySafe(async () => {
            return await db.query(
                'INSERT INTO eleicoes (ano, tipo, descricao) VALUES ($1, $2, $3) RETURNING id',
                [anoEleicao, 'Geral', `Eleição Geral ${anoEleicao}`]
            );
        });
        console.log(`✅ Eleição ${anoEleicao} criada.`);
    }
    
    const eleicaoId = eleicao.rows[0]?.id || 
        (await db.query('SELECT id FROM eleicoes WHERE ano = $1', [anoEleicao])).rows[0].id;
    
    cache.eleicoes.set(anoEleicao, eleicaoId);
    
    // Carregar cache de municípios
    await carregarCacheMunicipiosMemorySafe();
    
    console.log('✅ Ambiente preparado com sucesso!');
}

/**
 * Carregar cache de municípios
 */
async function carregarCacheMunicipiosMemorySafe() {
    console.log('📋 Carregando cache de municípios...');
    
    const municipios = await executarComRetryMemorySafe(async () => {
        return await db.query('SELECT id, codigo FROM municipios');
    });
    
    municipios.rows.forEach(municipio => {
        cache.municipios.set(municipio.codigo, municipio.id);
    });
    
    console.log(`✅ Cache carregado: ${municipios.rows.length} municípios`);
}

/**
 * Processar arquivo CSV com controle de memória
 */
async function processarArquivoCSVMemorySafe(arquivoCsv, anoEleicao, batchSize, estatisticas, batch) {
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
                estatisticas.linhasProcessadas++;
                
                // Processar linha
                const dados = processarLinhaMemorySafe(row, anoEleicao, estatisticas);
                
                if (dados) {
                    batch.push(dados);
                    
                    // Processar batch quando atingir o tamanho
                    if (batch.length >= batchSize) {
                        await processarBatchMemorySafe(batch, estatisticas);
                        estatisticas.linhasInseridas += batch.length;
                        batch.length = 0; // Limpar batch
                        
                        // Delay entre batches
                        await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
                        
                        // Limpeza de memória periódica
                        if (estatisticas.linhasProcessadas % CONFIG.MEMORY_CLEANUP_INTERVAL === 0) {
                            if (global.gc) {
                                global.gc();
                            }
                        }
                        
                        // Mostrar progresso
                        if (estatisticas.linhasProcessadas % CONFIG.PROGRESS_INTERVAL === 0) {
                            mostrarProgresso(estatisticas);
                        }
                    }
                }

            } catch (error) {
                estatisticas.linhasComErro++;
                estatisticas.erros.push({
                    linha: estatisticas.linhasProcessadas,
                    erro: error.message
                });
                console.error(`❌ Erro na linha ${estatisticas.linhasProcessadas}:`, error.message);
            }
        });

        stream.on('end', () => {
            console.log('📄 Arquivo CSV processado completamente');
            resolve();
        });

        stream.on('error', (error) => {
            console.error('❌ Erro no stream:', error);
            reject(error);
        });
    });
}

/**
 * Processar uma linha do CSV
 */
function processarLinhaMemorySafe(row, anoEleicao, estatisticas) {
    try {
        // Validar dados obrigatórios
        if (CONFIG.VALIDATE_DATA && !validarDadosObrigatorios(row)) {
            estatisticas.linhasInvalidas++;
            return null;
        }
        
        estatisticas.linhasValidadas++;
        
        // Limpar e converter dados
        const dados = {
            dt_geracao: converterData(row.DT_GERACAO),
            hh_geracao: row.HH_GERACAO?.trim(),
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
            municipio_id: cache.municipios.get(parseInt(row.CD_MUNICIPIO)),
            eleicao_id: cache.eleicoes.get(anoEleicao)
        };
        
        // Verificar se município foi encontrado
        if (!dados.municipio_id && !isNaN(dados.cd_municipio)) {
            estatisticas.municipiosNaoEncontrados++;
            console.log(`⚠️  Município não encontrado: ${dados.cd_municipio} - ${dados.nm_municipio}`);
        }
        
        return dados;
        
    } catch (error) {
        estatisticas.linhasComErro++;
        throw error;
    }
}

/**
 * Validar dados obrigatórios
 */
function validarDadosObrigatorios(row) {
    const camposObrigatorios = [
        'ANO_ELEICAO', 'SG_UF', 'CD_MUNICIPIO', 'NM_MUNICIPIO',
        'NR_ZONA', 'NR_SECAO', 'QT_ELEITORES_PERFIL'
    ];
    
    return camposObrigatorios.every(campo => {
        const valor = row[campo];
        return valor !== null && valor !== undefined && valor.toString().trim() !== '';
    });
}

/**
 * Processar batch com query corrigida
 */
async function processarBatchMemorySafe(batch, estatisticas) {
    if (batch.length === 0) return;
    
    estatisticas.batchesProcessados++;
    
    await executarComRetryMemorySafe(async () => {
        // Query corrigida - inserir um registro por vez para evitar problemas
        for (const dados of batch) {
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
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32)
            `;

            await db.query(query, [
                dados.dt_geracao, dados.hh_geracao, dados.ano_eleicao, dados.sg_uf, dados.cd_municipio,
                dados.nm_municipio, dados.nr_zona, dados.nr_secao, dados.nr_local_votacao, dados.nm_local_votacao,
                dados.cd_genero, dados.ds_genero, dados.cd_estado_civil, dados.ds_estado_civil, dados.cd_faixa_etaria,
                dados.ds_faixa_etaria, dados.cd_grau_escolaridade, dados.ds_grau_escolaridade, dados.cd_raca_cor, dados.ds_raca_cor,
                dados.cd_identidade_genero, dados.ds_identidade_genero, dados.cd_quilombola, dados.ds_quilombola,
                dados.cd_interprete_libras, dados.ds_interprete_libras, dados.tp_obrigatoriedade_voto,
                dados.qt_eleitores_perfil, dados.qt_eleitores_biometria, dados.qt_eleitores_deficiencia, dados.qt_eleitores_inc_nm_social,
                dados.municipio_id, dados.eleicao_id
            ]);
        }
    });
}

/**
 * Executar operação com retry
 */
async function executarComRetryMemorySafe(operacao, maxTentativas = CONFIG.MAX_RETRIES) {
    for (let tentativa = 1; tentativa <= maxTentativas; tentativa++) {
        try {
            return await operacao();
        } catch (error) {
            if (tentativa === maxTentativas) {
                throw error;
            }
            
            const delay = CONFIG.RETRY_DELAY;
            console.log(`⚠️  Tentativa ${tentativa} falhou, tentando novamente em ${delay}ms...`);
            console.log(`   Erro: ${error.message}`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * Mostrar progresso da importação
 */
function mostrarProgresso(estatisticas) {
    const porcentagem = ((estatisticas.linhasProcessadas / 1000000) * 100).toFixed(2);
    console.log(`📊 Progresso: ${estatisticas.linhasProcessadas} linhas processadas (${porcentagem}%)`);
    console.log(`   ✅ Inseridas: ${estatisticas.linhasInseridas}`);
    console.log(`   ❌ Erros: ${estatisticas.linhasComErro}`);
    console.log(`   📦 Batches: ${estatisticas.batchesProcessados}`);
}

/**
 * Gerar relatório final
 */
function gerarRelatorioFinal(estatisticas, tempoTotal) {
    console.log('\n🎉 Importação MEMORY-SAFE concluída!');
    console.log('='.repeat(50));
    console.log('📊 RELATÓRIO FINAL:');
    console.log('='.repeat(50));
    console.log(`⏱️  Tempo total: ${(tempoTotal / 1000).toFixed(2)} segundos`);
    console.log(`📄 Linhas processadas: ${estatisticas.linhasProcessadas}`);
    console.log(`✅ Linhas inseridas: ${estatisticas.linhasInseridas}`);
    console.log(`🔍 Linhas validadas: ${estatisticas.linhasValidadas}`);
    console.log(`❌ Linhas com erro: ${estatisticas.linhasComErro}`);
    console.log(`⚠️  Linhas inválidas: ${estatisticas.linhasInvalidas}`);
    console.log(`🏘️  Municípios não encontrados: ${estatisticas.municipiosNaoEncontrados}`);
    console.log(`📦 Batches processados: ${estatisticas.batchesProcessados}`);
    
    if (estatisticas.erros.length > 0) {
        console.log('\n❌ PRIMEIROS 10 ERROS:');
        estatisticas.erros.slice(0, 10).forEach(erro => {
            console.log(`   Linha ${erro.linha}: ${erro.erro}`);
        });
    }
    
    console.log('='.repeat(50));
}

/**
 * Converter data do formato brasileiro para ISO
 */
function converterData(dataStr) {
    if (!dataStr) return null;
    
    // Formato: DD/MM/YYYY
    const partes = dataStr.split('/');
    if (partes.length === 3) {
        return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
    }
    return null;
}

/**
 * Função principal
 */
async function main() {
    try {
        console.log('🚀 Iniciando importação MEMORY-SAFE dos dados de eleitores...\n');
        
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
            const resultado2018 = await importarDadosEleitoresMemorySafe(arquivo2018, 2018);
            console.log(`✅ 2018: ${resultado2018.linhasInseridas} registros inseridos`);
        } else {
            console.log('⚠️  Arquivo de 2018 não encontrado');
        }

        // Importar dados de 2022
        const arquivo2022 = './perfil_eleitor_secao_2022_SC/perfil_eleitor_secao_2022_SC.csv';
        if (fs.existsSync(arquivo2022)) {
            console.log('\n📊 Importando dados de 2022...');
            const resultado2022 = await importarDadosEleitoresMemorySafe(arquivo2022, 2022);
            console.log(`✅ 2022: ${resultado2022.linhasInseridas} registros inseridos`);
        } else {
            console.log('⚠️  Arquivo de 2022 não encontrado');
        }

        console.log('\n🎉 Importação MEMORY-SAFE concluída com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante a importação:', error);
        process.exit(1);
    } finally {
        await db.closePool();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { importarDadosEleitoresMemorySafe };

