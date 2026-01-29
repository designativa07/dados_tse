const fs = require('fs');
const path = require('path');
require('dotenv').config();

const db = require('./config/database');

/**
 * Script para testar a importação de dados de perfil do eleitor
 */

async function testarImportacao() {
    try {
        console.log('🧪 Testando importação de dados de perfil do eleitor...\n');
        
        // 1. Verificar se a tabela existe
        console.log('1️⃣ Verificando se a tabela perfil_eleitor_secao existe...');
        const tabelaExiste = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'perfil_eleitor_secao'
            );
        `);
        
        if (tabelaExiste.rows[0].exists) {
            console.log('✅ Tabela perfil_eleitor_secao existe');
        } else {
            console.log('❌ Tabela perfil_eleitor_secao não existe');
            return;
        }
        
        // 2. Verificar estrutura da tabela
        console.log('\n2️⃣ Verificando estrutura da tabela...');
        const colunas = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'perfil_eleitor_secao'
            ORDER BY ordinal_position;
        `);
        
        console.log('📋 Colunas da tabela:');
        colunas.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
        
        // 3. Verificar índices
        console.log('\n3️⃣ Verificando índices...');
        const indices = await db.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'perfil_eleitor_secao';
        `);
        
        console.log('📊 Índices encontrados:');
        indices.rows.forEach(idx => {
            console.log(`   - ${idx.indexname}`);
        });
        
        // 4. Verificar se há dados
        console.log('\n4️⃣ Verificando dados na tabela...');
        const contagem = await db.query('SELECT COUNT(*) as total FROM perfil_eleitor_secao');
        console.log(`📊 Total de registros: ${contagem.rows[0].total}`);
        
        if (parseInt(contagem.rows[0].total) > 0) {
            // 5. Mostrar amostra de dados
            console.log('\n5️⃣ Amostra de dados:');
            const amostra = await db.query(`
                SELECT 
                    ano_eleicao, sg_uf, nm_municipio, nr_zona, nr_secao,
                    ds_genero, ds_faixa_etaria, ds_grau_escolaridade,
                    qt_eleitores_perfil
                FROM perfil_eleitor_secao 
                LIMIT 5
            `);
            
            console.log('📋 Primeiros 5 registros:');
            amostra.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.ano_eleicao} - ${row.nm_municipio} - Zona ${row.nr_zona}, Seção ${row.nr_secao}`);
                console.log(`      Gênero: ${row.ds_genero}, Idade: ${row.ds_faixa_etaria}, Escolaridade: ${row.ds_grau_escolaridade}`);
                console.log(`      Eleitores: ${row.qt_eleitores_perfil}`);
            });
            
            // 6. Estatísticas por ano
            console.log('\n6️⃣ Estatísticas por ano:');
            const statsAno = await db.query(`
                SELECT 
                    ano_eleicao,
                    COUNT(*) as registros,
                    SUM(qt_eleitores_perfil) as total_eleitores,
                    COUNT(DISTINCT cd_municipio) as municipios,
                    COUNT(DISTINCT nr_zona) as zonas,
                    COUNT(DISTINCT nr_secao) as secoes
                FROM perfil_eleitor_secao
                GROUP BY ano_eleicao
                ORDER BY ano_eleicao
            `);
            
            statsAno.rows.forEach(stat => {
                console.log(`   ${stat.ano_eleicao}: ${stat.registros} registros, ${stat.total_eleitores} eleitores`);
                console.log(`      ${stat.municipios} municípios, ${stat.zonas} zonas, ${stat.secoes} seções`);
            });
            
            // 7. Estatísticas demográficas
            console.log('\n7️⃣ Estatísticas demográficas (2022):');
            const statsDemo = await db.query(`
                SELECT 
                    ds_genero,
                    ds_faixa_etaria,
                    ds_grau_escolaridade,
                    SUM(qt_eleitores_perfil) as total_eleitores
                FROM perfil_eleitor_secao
                WHERE ano_eleicao = 2022
                GROUP BY ds_genero, ds_faixa_etaria, ds_grau_escolaridade
                ORDER BY total_eleitores DESC
                LIMIT 10
            `);
            
            console.log('📊 Top 10 perfis demográficos:');
            statsDemo.rows.forEach((stat, index) => {
                console.log(`   ${index + 1}. ${stat.ds_genero} - ${stat.ds_faixa_etaria} - ${stat.ds_grau_escolaridade}: ${stat.total_eleitores} eleitores`);
            });
        }
        
        console.log('\n✅ Teste concluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error);
    } finally {
        await db.end();
    }
}

// Executar teste
testarImportacao();
