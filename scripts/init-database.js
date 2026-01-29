const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function inicializarBanco() {
    console.log('🚀 Inicializando banco de dados...');
    
    try {
        // Testar conexão
        const conectado = await db.testConnection();
        if (!conectado) {
            console.error('❌ Falha na conexão com o banco de dados');
            process.exit(1);
        }

        // Executar schema
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        await db.query(schema);
        console.log('✅ Schema executado com sucesso');

        // Verificar se as tabelas foram criadas
        const tabelas = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        console.log('📊 Tabelas criadas:');
        tabelas.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        // Verificar dados iniciais
        const estados = await db.query('SELECT COUNT(*) FROM estados');
        const municipios = await db.query('SELECT COUNT(*) FROM municipios');
        const configuracoes = await db.query('SELECT COUNT(*) FROM configuracoes_visualizacao');

        console.log('\n📈 Dados iniciais:');
        console.log(`  - Estados: ${estados.rows[0].count}`);
        console.log(`  - Municípios: ${municipios.rows[0].count}`);
        console.log(`  - Configurações: ${configuracoes.rows[0].count}`);

        console.log('\n🎉 Banco de dados inicializado com sucesso!');
        console.log('💡 Agora você pode executar: npm start');

    } catch (error) {
        console.error('❌ Erro ao inicializar banco de dados:', error.message);
        process.exit(1);
    } finally {
        await db.closePool();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    inicializarBanco();
}

module.exports = inicializarBanco;
