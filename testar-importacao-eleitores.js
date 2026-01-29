const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');

/**
 * Script de teste para validar a importação de dados de eleitores
 * Verifica configurações, conectividade e estrutura do banco
 */

async function testarConfiguracao() {
    console.log('🔧 Testando configuração...');
    
    // Verificar arquivo de configuração
    if (!fs.existsSync('.env') && !fs.existsSync('config.env')) {
        console.log('❌ Arquivo de configuração não encontrado!');
        console.log('   Crie um arquivo .env ou config.env com as configurações do banco');
        return false;
    }
    
    // Verificar variáveis de ambiente
    const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        console.log('❌ Variáveis de ambiente faltando:', missingVars.join(', '));
        return false;
    }
    
    console.log('✅ Configuração válida');
    return true;
}

async function testarConexaoBanco() {
    console.log('🔌 Testando conexão com banco de dados...');
    
    try {
        const result = await db.testConnection();
        if (result) {
            console.log('✅ Conexão com banco estabelecida');
            return true;
        } else {
            console.log('❌ Falha na conexão com banco de dados');
            return false;
        }
    } catch (error) {
        console.log('❌ Erro na conexão:', error.message);
        return false;
    }
}

async function testarEstruturaBanco() {
    console.log('🏗️  Testando estrutura do banco de dados...');
    
    try {
        // Verificar se as tabelas principais existem
        const tabelas = [
            'eleicoes',
            'municipios', 
            'perfil_eleitor_secao'
        ];
        
        for (const tabela of tabelas) {
            const result = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [tabela]);
            
            if (result.rows[0].exists) {
                console.log(`✅ Tabela ${tabela} existe`);
            } else {
                console.log(`❌ Tabela ${tabela} não encontrada`);
                return false;
            }
        }
        
        // Verificar se há dados nas tabelas de referência
        const eleicoes = await db.query('SELECT COUNT(*) as count FROM eleicoes');
        const municipios = await db.query('SELECT COUNT(*) as count FROM municipios');
        
        console.log(`📊 Eleições cadastradas: ${eleicoes.rows[0].count}`);
        console.log(`🏘️  Municípios cadastrados: ${municipios.rows[0].count}`);
        
        if (parseInt(municipios.rows[0].count) === 0) {
            console.log('⚠️  Nenhum município cadastrado. Execute primeiro a importação de municípios.');
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.log('❌ Erro ao verificar estrutura:', error.message);
        return false;
    }
}

async function testarArquivosCSV() {
    console.log('📁 Testando arquivos CSV...');
    
    const arquivos = [
        './perfil_eleitor_secao_2018_SC/perfil_eleitor_secao_2018_SC.csv',
        './perfil_eleitor_secao_2022_SC/perfil_eleitor_secao_2022_SC.csv'
    ];
    
    let todosExistem = true;
    
    for (const arquivo of arquivos) {
        if (fs.existsSync(arquivo)) {
            const stats = fs.statSync(arquivo);
            const tamanhoMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`✅ ${arquivo} (${tamanhoMB} MB)`);
        } else {
            console.log(`❌ ${arquivo} não encontrado`);
            todosExistem = false;
        }
    }
    
    return todosExistem;
}

async function testarSchemaPerfilEleitor() {
    console.log('📋 Testando schema da tabela perfil_eleitor_secao...');
    
    try {
        // Verificar se a tabela tem a estrutura correta
        const colunas = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'perfil_eleitor_secao'
            ORDER BY ordinal_position;
        `);
        
        const colunasEsperadas = [
            'id', 'dt_geracao', 'hh_geracao', 'ano_eleicao', 'sg_uf',
            'cd_municipio', 'nm_municipio', 'nr_zona', 'nr_secao',
            'cd_genero', 'ds_genero', 'qt_eleitores_perfil'
        ];
        
        const colunasEncontradas = colunas.rows.map(row => row.column_name);
        const colunasFaltando = colunasEsperadas.filter(col => !colunasEncontradas.includes(col));
        
        if (colunasFaltando.length > 0) {
            console.log('❌ Colunas faltando:', colunasFaltando.join(', '));
            return false;
        }
        
        console.log(`✅ Schema válido (${colunas.rows.length} colunas)`);
        return true;
        
    } catch (error) {
        console.log('❌ Erro ao verificar schema:', error.message);
        return false;
    }
}

async function testarImportacaoPequena() {
    console.log('🧪 Testando importação com dados de exemplo...');
    
    try {
        // Criar dados de teste
        const dadosTeste = {
            dt_geracao: '2024-01-01',
            hh_geracao: '10:00:00',
            ano_eleicao: 9999, // Ano de teste
            sg_uf: 'SC',
            cd_municipio: 99999, // Código de teste
            nm_municipio: 'TESTE',
            nr_zona: 1,
            nr_secao: 1,
            cd_genero: 2,
            ds_genero: 'MASCULINO',
            qt_eleitores_perfil: 100,
            municipio_id: null, // Será null para teste
            eleicao_id: null
        };
        
        // Inserir dados de teste
        await db.query(`
            INSERT INTO perfil_eleitor_secao (
                dt_geracao, hh_geracao, ano_eleicao, sg_uf, cd_municipio, nm_municipio,
                nr_zona, nr_secao, cd_genero, ds_genero, qt_eleitores_perfil,
                municipio_id, eleicao_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
            dadosTeste.dt_geracao, dadosTeste.hh_geracao, dadosTeste.ano_eleicao,
            dadosTeste.sg_uf, dadosTeste.cd_municipio, dadosTeste.nm_municipio,
            dadosTeste.nr_zona, dadosTeste.nr_secao, dadosTeste.cd_genero,
            dadosTeste.ds_genero, dadosTeste.qt_eleitores_perfil,
            dadosTeste.municipio_id, dadosTeste.eleicao_id
        ]);
        
        // Verificar se foi inserido
        const resultado = await db.query(
            'SELECT COUNT(*) as count FROM perfil_eleitor_secao WHERE ano_eleicao = $1',
            [9999]
        );
        
        if (parseInt(resultado.rows[0].count) > 0) {
            console.log('✅ Teste de inserção bem-sucedido');
            
            // Limpar dados de teste
            await db.query('DELETE FROM perfil_eleitor_secao WHERE ano_eleicao = $1', [9999]);
            console.log('🧹 Dados de teste removidos');
            
            return true;
        } else {
            console.log('❌ Falha no teste de inserção');
            return false;
        }
        
    } catch (error) {
        console.log('❌ Erro no teste de importação:', error.message);
        return false;
    }
}

async function gerarRelatorioSistema() {
    console.log('\n📊 RELATÓRIO DO SISTEMA:');
    console.log('='.repeat(50));
    
    try {
        // Informações do Node.js
        console.log(`🟢 Node.js: ${process.version}`);
        console.log(`💾 Memória disponível: ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`);
        
        // Informações do banco
        const bancoInfo = await db.query('SELECT version()');
        console.log(`🗄️  PostgreSQL: ${bancoInfo.rows[0].version.split(' ')[0]}`);
        
        // Estatísticas das tabelas
        const stats = await db.query(`
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes
            FROM pg_stat_user_tables 
            WHERE tablename IN ('eleicoes', 'municipios', 'perfil_eleitor_secao')
            ORDER BY tablename;
        `);
        
        console.log('\n📈 Estatísticas das tabelas:');
        stats.rows.forEach(stat => {
            console.log(`   ${stat.tablename}: ${stat.inserts} inserções`);
        });
        
    } catch (error) {
        console.log('❌ Erro ao gerar relatório:', error.message);
    }
}

async function main() {
    console.log('🧪 TESTE DE VALIDAÇÃO - IMPORTAÇÃO DE ELEITORES');
    console.log('='.repeat(60));
    console.log();
    
    const testes = [
        { nome: 'Configuração', funcao: testarConfiguracao },
        { nome: 'Conexão com Banco', funcao: testarConexaoBanco },
        { nome: 'Estrutura do Banco', funcao: testarEstruturaBanco },
        { nome: 'Arquivos CSV', funcao: testarArquivosCSV },
        { nome: 'Schema da Tabela', funcao: testarSchemaPerfilEleitor },
        { nome: 'Teste de Importação', funcao: testarImportacaoPequena }
    ];
    
    let testesPassaram = 0;
    let totalTestes = testes.length;
    
    for (const teste of testes) {
        console.log(`\n🔍 ${teste.nome}:`);
        try {
            const resultado = await teste.funcao();
            if (resultado) {
                testesPassaram++;
            }
        } catch (error) {
            console.log(`❌ Erro no teste: ${error.message}`);
        }
    }
    
    // Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESULTADO DOS TESTES:');
    console.log('='.repeat(60));
    console.log(`✅ Testes passaram: ${testesPassaram}/${totalTestes}`);
    console.log(`❌ Testes falharam: ${totalTestes - testesPassaram}/${totalTestes}`);
    
    if (testesPassaram === totalTestes) {
        console.log('\n🎉 TODOS OS TESTES PASSARAM!');
        console.log('✅ Sistema pronto para importação de dados de eleitores');
        console.log('\n💡 Para executar a importação, use:');
        console.log('   node importar-dados-eleitores.js');
        console.log('   ou');
        console.log('   importar-eleitores.bat');
    } else {
        console.log('\n⚠️  ALGUNS TESTES FALHARAM!');
        console.log('❌ Corrija os problemas antes de executar a importação');
    }
    
    // Gerar relatório do sistema
    await gerarRelatorioSistema();
    
    console.log('\n' + '='.repeat(60));
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Erro durante os testes:', error);
        process.exit(1);
    }).finally(() => {
        db.closePool();
    });
}

module.exports = {
    testarConfiguracao,
    testarConexaoBanco,
    testarEstruturaBanco,
    testarArquivosCSV,
    testarSchemaPerfilEleitor,
    testarImportacaoPequena
};

