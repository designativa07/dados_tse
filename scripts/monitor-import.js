const db = require('../config/database');

class MonitorImportacao {
    constructor() {
        this.intervalId = null;
        this.startTime = Date.now();
    }

    async iniciarMonitoramento() {
        console.log('📊 Iniciando monitoramento da importação...');
        console.log('⏱️  Pressione Ctrl+C para parar o monitoramento\n');

        this.intervalId = setInterval(async () => {
            try {
                await this.exibirEstatisticas();
            } catch (error) {
                console.error('❌ Erro no monitoramento:', error.message);
            }
        }, 5000); // Atualizar a cada 5 segundos

        // Parar monitoramento com Ctrl+C
        process.on('SIGINT', () => {
            console.log('\n🛑 Parando monitoramento...');
            clearInterval(this.intervalId);
            process.exit(0);
        });
    }

    async exibirEstatisticas() {
        try {
            // Estatísticas de votos
            const votosResult = await db.query(`
                SELECT 
                    COUNT(*) as total_votos,
                    SUM(quantidade_votos) as soma_votos,
                    COUNT(DISTINCT municipio_id) as municipios,
                    COUNT(DISTINCT candidato_id) as candidatos
                FROM votos
            `);

            // Estatísticas de eleições
            const eleicoesResult = await db.query(`
                SELECT 
                    COUNT(*) as total_eleicoes,
                    MAX(ano) as ultimo_ano,
                    MIN(ano) as primeiro_ano
                FROM eleicoes
            `);

            // Estatísticas de candidatos
            const candidatosResult = await db.query(`
                SELECT 
                    COUNT(*) as total_candidatos,
                    COUNT(DISTINCT cargo) as total_cargos
                FROM candidatos
            `);

            // Estatísticas de municípios
            const municipiosResult = await db.query(`
                SELECT 
                    COUNT(*) as total_municipios,
                    COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as com_coordenadas
                FROM municipios
            `);

            const votos = votosResult.rows[0];
            const eleicoes = eleicoesResult.rows[0];
            const candidatos = candidatosResult.rows[0];
            const municipios = municipiosResult.rows[0];

            // Calcular tempo decorrido
            const tempoDecorrido = Math.floor((Date.now() - this.startTime) / 1000);
            const minutos = Math.floor(tempoDecorrido / 60);
            const segundos = tempoDecorrido % 60;

            // Limpar console e exibir estatísticas
            console.clear();
            console.log('📊 MONITOR DE IMPORTAÇÃO - SISTEMA TSE');
            console.log('=' .repeat(50));
            console.log(`⏱️  Tempo decorrido: ${minutos}m ${segundos}s`);
            console.log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR')}`);
            console.log('');
            
            console.log('📈 ESTATÍSTICAS GERAIS:');
            console.log(`   🗳️  Total de votos: ${parseInt(votos.total_votos).toLocaleString()}`);
            console.log(`   📊 Soma de votos: ${parseInt(votos.soma_votos).toLocaleString()}`);
            console.log(`   🏙️  Municípios: ${votos.municipios}`);
            console.log(`   👤 Candidatos: ${votos.candidatos}`);
            console.log('');
            
            console.log('📋 ELEIÇÕES:');
            console.log(`   📅 Total: ${eleicoes.total_eleicoes}`);
            console.log(`   📅 Período: ${eleicoes.primeiro_ano} - ${eleicoes.ultimo_ano}`);
            console.log('');
            
            console.log('👥 CANDIDATOS:');
            console.log(`   👤 Total: ${candidatos.total_candidatos}`);
            console.log(`   🏛️  Cargos: ${candidatos.total_cargos}`);
            console.log('');
            
            console.log('🏙️  MUNICÍPIOS:');
            console.log(`   📍 Total: ${municipios.total_municipios}`);
            console.log(`   🗺️  Com coordenadas: ${municipios.com_coordenadas}`);
            console.log('');
            
            console.log('💡 Dica: Pressione Ctrl+C para parar o monitoramento');
            console.log('=' .repeat(50));

        } catch (error) {
            console.error('❌ Erro ao buscar estatísticas:', error.message);
        }
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    const monitor = new MonitorImportacao();
    monitor.iniciarMonitoramento();
}

module.exports = MonitorImportacao;
