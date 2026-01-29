const fs = require('fs');
const csv = require('csv-parser');
const db = require('./config/database');

// Configurações otimizadas
const CONFIG = {
    BATCH_SIZE: 1000, // Tamanho do batch
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000, // 2 segundos
    PROGRESS_INTERVAL: 5000, // Mostrar progresso a cada 5000 linhas
    BATCH_DELAY: 500 // Delay entre batches
};

// Cache para IDs de municípios e eleições
const cacheMunicipios = new Map();
const cacheEleicoes = new Map();

// Estatísticas
const estatisticas = {
    linhasProcessadas: 0,
    linhasInseridas: 0,
    erros: 0,
    inicio: Date.now()
};

// Função para executar com retry
async function executarComRetry(fn, maxRetries = CONFIG.MAX_RETRIES) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.log(`⚠️ Tentativa ${i + 1} falhou, tentando novamente em ${CONFIG.RETRY_DELAY}ms...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
        }
    }
}

// Função para obter ID do município
async function obterMunicipioId(codigoMunicipio, nomeMunicipio) {
    const chave = `${codigoMunicipio}-${nomeMunicipio}`;
    
    if (cacheMunicipios.has(chave)) {
        return cacheMunicipios.get(chave);
    }
    
    const resultado = await executarComRetry(async () => {
        const query = 'SELECT id FROM municipios WHERE codigo_ibge = $1 AND nome = $2';
        const result = await db.query(query, [codigoMunicipio, nomeMunicipio]);
        return result.rows[0]?.id;
    });
    
    cacheMunicipios.set(chave, resultado);
    return resultado;
}

// Função para obter ID da eleição
async function obterEleicaoId(anoEleicao) {
    if (cacheEleicoes.has(anoEleicao)) {
        return cacheEleicoes.get(anoEleicao);
    }
    
    const resultado = await executarComRetry(async () => {
        const query = 'SELECT id FROM eleicoes WHERE ano = $1';
        const result = await db.query(query, [anoEleicao]);
        return result.rows[0]?.id;
    });
    
    cacheEleicoes.set(anoEleicao, resultado);
    return resultado;
}

// Função para processar um batch
async function processarBatch(batch) {
    if (batch.length === 0) return;
    
    const query = `
        INSERT INTO perfil_eleitor_secao (
            dt_geracao, hh_geracao, ano_eleicao, sg_uf, cd_municipio, nm_municipio,
            nr_zona, nr_secao, cd_genero, ds_genero, qt_eleitores_perfil,
            municipio_id, eleicao_id
        ) VALUES ${batch.map((_, i) => 
            `($${i * 13 + 1}, $${i * 13 + 2}, $${i * 13 + 3}, $${i * 13 + 4}, $${i * 13 + 5}, $${i * 13 + 6}, $${i * 13 + 7}, $${i * 13 + 8}, $${i * 13 + 9}, $${i * 13 + 10}, $${i * 13 + 11}, $${i * 13 + 12}, $${i * 13 + 13})`
        ).join(', ')}
    `;
    
    const valores = batch.flat();
    
    await executarComRetry(async () => {
        await db.query(query, valores);
    });
}

// Função para mostrar progresso
function mostrarProgresso() {
    const tempoDecorrido = Date.now() - estatisticas.inicio;
    const linhasPorSegundo = estatisticas.linhasProcessadas / (tempoDecorrido / 1000);
    
    console.log(`📊 Progresso: ${estatisticas.linhasProcessadas.toLocaleString()} linhas processadas | ` +
                `${estatisticas.linhasInseridas.toLocaleString()} inseridas | ` +
                `${estatisticas.erros} erros | ` +
                `${linhasPorSegundo.toFixed(0)} linhas/seg`);
}

// Função para limpar dados de teste
async function limparDadosTeste() {
    console.log('🧹 Limpando dados de teste...');
    await db.query('DELETE FROM perfil_eleitor_secao WHERE ano_eleicao = 2018 AND nm_municipio = $1', ['FLORIANOPOLIS']);
    console.log('✅ Dados de teste removidos');
}

// Função principal
async function importarDados() {
    console.log('🚀 Iniciando importação de dados de eleitores...');
    
    try {
        // Verificar se o arquivo existe
        const arquivo = 'perfil_eleitor_secao_2018_SC/perfil_eleitor_secao_2018_SC.csv';
        if (!fs.existsSync(arquivo)) {
            throw new Error(`Arquivo não encontrado: ${arquivo}`);
        }
        
        console.log(`📁 Arquivo encontrado: ${arquivo}`);
        
        // Limpar dados de teste anteriores
        await limparDadosTeste();
        
        // Verificar conexão com banco
        await executarComRetry(async () => {
            await db.query('SELECT 1');
            console.log('📊 Conectado ao PostgreSQL');
        });
        
        let batch = [];
        let linhaAtual = 0;
        
        return new Promise((resolve, reject) => {
            fs.createReadStream(arquivo)
                .pipe(csv())
                .on('data', async (linha) => {
                    linhaAtual++;
                    estatisticas.linhasProcessadas++;
                    
                    try {
                        // Obter IDs necessários
                        const municipioId = await obterMunicipioId(
                            parseInt(linha.CD_MUNICIPIO), 
                            linha.NM_MUNICIPIO
                        );
                        
                        const eleicaoId = await obterEleicaoId(parseInt(linha.ANO_ELEICAO));
                        
                        if (!municipioId || !eleicaoId) {
                            console.log(`⚠️ Linha ${linhaAtual}: Município ou eleição não encontrado`);
                            estatisticas.erros++;
                            return;
                        }
                        
                        // Preparar dados com valores padrão para campos obrigatórios
                        const dados = [
                            linha.DT_GERACAO || '2018-01-01', // Data padrão se nula
                            linha.HH_GERACAO || '00:00:00',   // Hora padrão se nula
                            parseInt(linha.ANO_ELEICAO),
                            linha.SG_UF,
                            parseInt(linha.CD_MUNICIPIO),
                            linha.NM_MUNICIPIO,
                            parseInt(linha.NR_ZONA),
                            parseInt(linha.NR_SECAO),
                            parseInt(linha.CD_GENERO),
                            linha.DS_GENERO,
                            parseInt(linha.QT_ELEITORES_PERFIL) || 0,
                            municipioId,
                            eleicaoId
                        ];
                        
                        batch.push(dados);
                        
                        // Processar batch quando atingir o tamanho
                        if (batch.length >= CONFIG.BATCH_SIZE) {
                            await processarBatch(batch);
                            estatisticas.linhasInseridas += batch.length;
                            batch = [];
                            
                            // Delay entre batches
                            await new Promise(resolve => setTimeout(resolve, CONFIG.BATCH_DELAY));
                            
                            // Mostrar progresso
                            if (estatisticas.linhasProcessadas % CONFIG.PROGRESS_INTERVAL === 0) {
                                mostrarProgresso();
                            }
                        }
                        
                    } catch (error) {
                        console.error(`❌ Erro na linha ${linhaAtual}:`, error.message);
                        estatisticas.erros++;
                    }
                })
                .on('end', async () => {
                    try {
                        // Processar batch final
                        if (batch.length > 0) {
                            await processarBatch(batch);
                            estatisticas.linhasInseridas += batch.length;
                        }
                        
                        // Mostrar estatísticas finais
                        const tempoTotal = Date.now() - estatisticas.inicio;
                        console.log('\n🎉 Importação concluída!');
                        console.log(`📊 Estatísticas finais:`);
                        console.log(`   • Linhas processadas: ${estatisticas.linhasProcessadas.toLocaleString()}`);
                        console.log(`   • Linhas inseridas: ${estatisticas.linhasInseridas.toLocaleString()}`);
                        console.log(`   • Erros: ${estatisticas.erros}`);
                        console.log(`   • Tempo total: ${(tempoTotal / 1000).toFixed(2)} segundos`);
                        console.log(`   • Taxa média: ${(estatisticas.linhasProcessadas / (tempoTotal / 1000)).toFixed(0)} linhas/seg`);
                        
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', reject);
        });
        
    } catch (error) {
        console.error('❌ Erro na importação:', error);
        throw error;
    } finally {
        await db.closePool();
    }
}

// Executar importação
importarDados()
    .then(() => {
        console.log('✅ Importação finalizada com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Erro fatal:', error);
        process.exit(1);
    });

