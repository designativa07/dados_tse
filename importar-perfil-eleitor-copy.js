const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config();

const db = require('./config/database-otimizado');

/**
 * Script ultra-otimizado usando COPY do PostgreSQL
 * Abordagem mais eficiente para grandes volumes de dados
 */

async function importarPerfilEleitor(arquivoCsv, anoEleicao) {
    console.log(`🚀 Iniciando importação via COPY do perfil do eleitor ${anoEleicao}...`);
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
    
    // Criar arquivo temporário para COPY
    const tempFile = `temp_perfil_${anoEleicao}.csv`;
    const writeStream = fs.createWriteStream(tempFile);
    
    let linhasProcessadas = 0;
    let linhasInseridas = 0;
    let linhasComErro = 0;
    
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

        stream.on('data', (row) => {
            try {
                linhasProcessadas++;
                
                // Limpar e converter dados
                const dados = [
                    converterData(row.DT_GERACAO),
                    limparValor(row.HH_GERACAO),
                    limparValor(row.ANO_ELEICAO, 'integer'),
                    limparValor(row.SG_UF),
                    limparValor(row.CD_MUNICIPIO, 'integer'),
                    limparValor(row.NM_MUNICIPIO),
                    limparValor(row.NR_ZONA, 'integer'),
                    limparValor(row.NR_SECAO, 'integer'),
                    limparValor(row.NR_LOCAL_VOTACAO, 'integer'),
                    limparValor(row.NM_LOCAL_VOTACAO),
                    limparValor(row.CD_GENERO, 'integer'),
                    limparValor(row.DS_GENERO),
                    limparValor(row.CD_ESTADO_CIVIL, 'integer'),
                    limparValor(row.DS_ESTADO_CIVIL),
                    limparValor(row.CD_FAIXA_ETARIA, 'integer'),
                    limparValor(row.DS_FAIXA_ETARIA),
                    limparValor(row.CD_GRAU_ESCOLARIDADE, 'integer'),
                    limparValor(row.DS_GRAU_ESCOLARIDADE),
                    limparValor(row.CD_RACA_COR, 'integer'),
                    limparValor(row.DS_RACA_COR),
                    limparValor(row.CD_IDENTIDADE_GENERO, 'integer'),
                    limparValor(row.DS_IDENTIDADE_GENERO),
                    limparValor(row.CD_QUILOMBOLA, 'integer'),
                    limparValor(row.DS_QUILOMBOLA),
                    limparValor(row.CD_INTERPRETE_LIBRAS, 'integer'),
                    limparValor(row.DS_INTERPRETE_LIBRAS),
                    limparValor(row.TP_OBRIGATORIEDADE_VOTO),
                    limparValor(row.QT_ELEITORES_PERFIL, 'integer') || 0,
                    limparValor(row.QT_ELEITORES_BIOMETRIA, 'integer') || 0,
                    limparValor(row.QT_ELEITORES_DEFICIENCIA, 'integer') || 0,
                    limparValor(row.QT_ELEITORES_INC_NM_SOCIAL, 'integer') || 0,
                    null, // municipio_id será preenchido depois
                    eleicaoId
                ];

                // Escrever linha no arquivo temporário
                const linha = dados.map(valor => {
                    if (valor === null || valor === undefined) return '\\N';
                    if (typeof valor === 'string') return `"${valor.replace(/"/g, '""')}"`;
                    return valor;
                }).join(',') + '\n';
                
                writeStream.write(linha);
                
                if (linhasProcessadas % 10000 === 0) {
                    console.log(`📊 Processadas: ${linhasProcessadas} linhas`);
                }

            } catch (error) {
                linhasComErro++;
                console.error(`❌ Erro na linha ${linhasProcessadas}:`, error.message);
            }
        });

        stream.on('end', async () => {
            try {
                writeStream.end();
                
                console.log('📝 Arquivo temporário criado. Iniciando COPY...');
                
                // Usar COPY para inserir dados
                const copyQuery = `
                    COPY perfil_eleitor_secao (
                        dt_geracao, hh_geracao, ano_eleicao, sg_uf, cd_municipio, nm_municipio,
                        nr_zona, nr_secao, nr_local_votacao, nm_local_votacao, cd_genero, ds_genero,
                        cd_estado_civil, ds_estado_civil, cd_faixa_etaria, ds_faixa_etaria,
                        cd_grau_escolaridade, ds_grau_escolaridade, cd_raca_cor, ds_raca_cor,
                        cd_identidade_genero, ds_identidade_genero, cd_quilombola, ds_quilombola,
                        cd_interprete_libras, ds_interprete_libras, tp_obrigatoriedade_voto,
                        qt_eleitores_perfil, qt_eleitores_biometria, qt_eleitores_deficiencia, qt_eleitores_inc_nm_social,
                        municipio_id, eleicao_id
                    ) FROM '${path.resolve(tempFile)}' WITH (FORMAT csv, HEADER false, DELIMITER ',', QUOTE '"', ESCAPE '"')
                `;
                
                await db.query(copyQuery);
                linhasInseridas = linhasProcessadas - linhasComErro;
                
                // Atualizar municipio_id usando JOIN
                console.log('🔄 Atualizando municipio_id...');
                await db.query(`
                    UPDATE perfil_eleitor_secao 
                    SET municipio_id = m.id 
                    FROM municipios m 
                    WHERE perfil_eleitor_secao.cd_municipio = m.codigo 
                    AND perfil_eleitor_secao.municipio_id IS NULL
                `);
                
                // Limpar arquivo temporário
                fs.unlinkSync(tempFile);
                
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
                // Limpar arquivo temporário em caso de erro
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
                reject(error);
            }
        });

        stream.on('error', (error) => {
            console.error('❌ Erro no stream:', error);
            reject(error);
        });
    });
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
        console.log('🚀 Iniciando importação via COPY dos dados de perfil do eleitor...\n');
        
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
        await db.closePool();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { importarPerfilEleitor };
