const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/database');
const path = require('path');

class ImportadorCSVGrande {
    constructor() {
        this.batchSize = 1000; // Processar 1000 registros por vez
        this.totalProcessados = 0;
        this.totalErros = 0;
        this.erros = [];
        this.eleicaoId = null;
    }

    async importarArquivo(caminhoArquivo, dadosEleicao) {
        console.log('🚀 Iniciando importação de arquivo grande...');
        console.log(`📁 Arquivo: ${caminhoArquivo}`);
        console.log(`📊 Tamanho do lote: ${this.batchSize} registros`);
        
        try {
            // Criar eleição primeiro
            this.eleicaoId = await this.criarEleicao(dadosEleicao);
            console.log(`✅ Eleição criada com ID: ${this.eleicaoId}`);

            // Processar arquivo em lotes
            await this.processarArquivoEmLotes(caminhoArquivo);
            
            console.log('\n🎉 Importação concluída!');
            console.log(`📊 Total processado: ${this.totalProcessados} registros`);
            console.log(`❌ Total de erros: ${this.totalErros}`);
            
            if (this.erros.length > 0) {
                console.log('\n⚠️  Primeiros 10 erros:');
                this.erros.slice(0, 10).forEach((erro, index) => {
                    console.log(`${index + 1}. Linha ${erro.linha}: ${erro.mensagem}`);
                });
            }

        } catch (error) {
            console.error('❌ Erro durante importação:', error.message);
            throw error;
        }
    }

    async criarEleicao(dadosEleicao) {
        const { ano, tipo, descricao, turno, data_eleicao, data_geracao } = dadosEleicao;
        
        // Primeiro, verificar se a eleição já existe
        let result = await db.query(`
            SELECT id FROM eleicoes 
            WHERE ano = $1 AND tipo = $2 AND turno = $3
        `, [ano, tipo, turno]);

        if (result.rows.length > 0) {
            // Eleição já existe, usar o ID existente
            result = { rows: [{ id: result.rows[0].id }] };
        } else {
            // Criar nova eleição
            result = await db.query(`
                INSERT INTO eleicoes (ano, tipo, descricao, turno, data_eleicao, data_geracao)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [ano, tipo, descricao, turno, data_eleicao, data_geracao]);
        }
        
        return result.rows[0].id;
    }

    async processarArquivoEmLotes(caminhoArquivo) {
        return new Promise((resolve, reject) => {
            let loteAtual = [];
            let numeroLinha = 0;
            let cabecalho = null;

            const stream = fs.createReadStream(caminhoArquivo)
                .pipe(csv({ separator: ';' }))
                .on('data', async (linha) => {
                    numeroLinha++;
                    
                    // Pular linha de cabeçalho
                    if (numeroLinha === 1) {
                        cabecalho = Object.keys(linha);
                        return;
                    }

                    loteAtual.push({ linha, numeroLinha });

                    // Processar lote quando atingir o tamanho
                    if (loteAtual.length >= this.batchSize) {
                        stream.pause(); // Pausar leitura
                        await this.processarLote(loteAtual);
                        loteAtual = [];
                        stream.resume(); // Retomar leitura
                    }
                })
                .on('end', async () => {
                    try {
                        // Processar último lote
                        if (loteAtual.length > 0) {
                            await this.processarLote(loteAtual);
                        }
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', reject);
        });
    }

    async processarLote(lote) {
        console.log(`📦 Processando lote de ${lote.length} registros...`);
        
        const candidatos = new Map();
        const municipios = new Map();
        const votos = [];

        // Processar cada linha do lote
        for (const { linha, numeroLinha } of lote) {
            try {
                const dados = this.processarLinha(linha);
                
                if (dados) {
                    // Agrupar candidatos
                    const keyCandidato = `${dados.numero}-${dados.candidato}`;
                    if (!candidatos.has(keyCandidato)) {
                        candidatos.set(keyCandidato, {
                            numero: dados.numero,
                            nome: dados.candidato,
                            cargo: dados.cargo,
                            eleicao_id: this.eleicaoId
                        });
                    }

                    // Agrupar municípios
                    const keyMunicipio = `${dados.municipio}-${dados.uf}`;
                    if (!municipios.has(keyMunicipio)) {
                        municipios.set(keyMunicipio, {
                            codigo: dados.codigoMunicipio,
                            nome: dados.municipio,
                            sigla_uf: dados.uf
                        });
                    }

                    // Preparar voto
                    votos.push({
                        eleicao_id: this.eleicaoId,
                        municipio_nome: dados.municipio,
                        municipio_uf: dados.uf,
                        candidato_numero: dados.numero,
                        candidato_nome: dados.candidato,
                        zona: dados.zona,
                        secao: dados.secao,
                        local_votacao: dados.localVotacao,
                        endereco_local: dados.enderecoLocal,
                        quantidade_votos: dados.votos
                    });
                }
            } catch (error) {
                this.totalErros++;
                this.erros.push({
                    linha: numeroLinha,
                    mensagem: error.message
                });
            }
        }

        // Inserir dados no banco
        await this.inserirDadosNoBanco(candidatos, municipios, votos);
        
        this.totalProcessados += lote.length;
        console.log(`✅ Lote processado. Total: ${this.totalProcessados} registros`);
    }

    processarLinha(linha) {
        const municipio = linha.NM_MUNICIPIO?.trim().toUpperCase();
        const codigoMunicipio = parseInt(linha.CD_MUNICIPIO?.replace(/[^\d]/g, '') || '0');
        const votos = parseInt(linha.QT_VOTOS?.replace(/[^\d]/g, '') || '0');
        const candidato = linha.NM_VOTAVEL?.trim();
        const cargo = linha.DS_CARGO?.trim();
        const numero = parseInt(linha.NR_VOTAVEL?.replace(/[^\d]/g, '') || '0');
        const uf = linha.SG_UF?.trim().toUpperCase();
        const zona = parseInt(linha.NR_ZONA?.replace(/[^\d]/g, '') || '0');
        const secao = parseInt(linha.NR_SECAO?.replace(/[^\d]/g, '') || '0');
        const localVotacao = linha.NM_LOCAL_VOTACAO?.trim();
        const enderecoLocal = linha.DS_LOCAL_VOTACAO_ENDERECO?.trim();

        // Validações básicas
        if (!municipio || !candidato || votos <= 0) {
            throw new Error(`Dados obrigatórios ausentes: municipio=${municipio}, candidato=${candidato}, votos=${votos}`);
        }

        return {
            municipio,
            codigoMunicipio,
            votos,
            candidato,
            cargo,
            numero,
            uf,
            zona,
            secao,
            localVotacao,
            enderecoLocal
        };
    }

    async inserirDadosNoBanco(candidatos, municipios, votos) {
        try {
            await db.transaction(async (client) => {
                // Inserir candidatos
                for (const candidato of candidatos.values()) {
                    // Verificar se candidato já existe
                    let candidatoResult = await client.query(`
                        SELECT id FROM candidatos 
                        WHERE numero = $1 AND eleicao_id = $2
                    `, [candidato.numero, candidato.eleicao_id]);

                    if (candidatoResult.rows.length === 0) {
                        // Criar novo candidato
                        await client.query(`
                            INSERT INTO candidatos (numero, nome, cargo, eleicao_id)
                            VALUES ($1, $2, $3, $4)
                        `, [candidato.numero, candidato.nome, candidato.cargo, candidato.eleicao_id]);
                    }
                }

                // Inserir municípios e obter IDs
                const municipioIds = new Map();
                for (const [key, municipio] of municipios) {
                    let result = await client.query(
                        'SELECT id FROM municipios WHERE codigo = $1 OR (nome = $2 AND sigla_uf = $3)',
                        [municipio.codigo, municipio.nome, municipio.sigla_uf]
                    );

                    if (result.rows.length === 0) {
                        // Gerar código único se não tiver
                        const codigo = municipio.codigo || Math.floor(Math.random() * 1000000);
                        result = await client.query(`
                            INSERT INTO municipios (codigo, nome, sigla_uf)
                            VALUES ($1, $2, $3)
                            RETURNING id
                        `, [codigo, municipio.nome, municipio.sigla_uf]);
                    }

                    municipioIds.set(key, result.rows[0].id);
                }

                // Inserir votos
                for (const voto of votos) {
                    const municipioId = municipioIds.get(`${voto.municipio_nome}-${voto.municipio_uf}`);
                    
                    const candidatoResult = await client.query(
                        'SELECT id FROM candidatos WHERE numero = $1 AND eleicao_id = $2',
                        [voto.candidato_numero, this.eleicaoId]
                    );

                    if (candidatoResult.rows.length > 0) {
                        // Verificar se voto já existe
                        const votoExistente = await client.query(`
                            SELECT id FROM votos 
                            WHERE eleicao_id = $1 AND municipio_id = $2 AND candidato_id = $3 AND zona = $4 AND secao = $5
                        `, [voto.eleicao_id, municipioId, candidatoResult.rows[0].id, voto.zona, voto.secao]);

                        if (votoExistente.rows.length > 0) {
                            // Atualizar voto existente
                            await client.query(`
                                UPDATE votos 
                                SET quantidade_votos = $1, local_votacao = $2, endereco_local = $3
                                WHERE id = $4
                            `, [voto.quantidade_votos, voto.local_votacao, voto.endereco_local, votoExistente.rows[0].id]);
                        } else {
                            // Inserir novo voto
                            await client.query(`
                                INSERT INTO votos (eleicao_id, municipio_id, candidato_id, zona, secao, local_votacao, endereco_local, quantidade_votos)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            `, [
                                voto.eleicao_id,
                                municipioId,
                                candidatoResult.rows[0].id,
                                voto.zona,
                                voto.secao,
                                voto.local_votacao,
                                voto.endereco_local,
                                voto.quantidade_votos
                            ]);
                        }
                    }
                }
            });
        } catch (error) {
            console.error('❌ Erro ao inserir dados no banco:', error);
            throw error;
        }
    }
}

// Função principal
async function importarCSVGrande() {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
        console.log('❌ Uso: node import-large-csv.js <caminho-do-arquivo> [ano] [tipo] [descricao]');
        console.log('📝 Exemplo: node import-large-csv.js votacao_secao_2018_sc.csv 2018 "Eleição Ordinária" "Eleições Gerais 2018"');
        process.exit(1);
    }

    const caminhoArquivo = args[0];
    const ano = parseInt(args[1]) || 2018;
    const tipo = args[2] || 'Eleição Ordinária';
    const descricao = args[3] || `Eleições ${ano}`;

    // Verificar se arquivo existe
    if (!fs.existsSync(caminhoArquivo)) {
        console.error(`❌ Arquivo não encontrado: ${caminhoArquivo}`);
        process.exit(1);
    }

    const dadosEleicao = {
        ano,
        tipo,
        descricao,
        turno: 1,
        data_eleicao: `${ano}-10-07`,
        data_geracao: new Date().toISOString()
    };

    const importador = new ImportadorCSVGrande();
    
    try {
        await importador.importarArquivo(caminhoArquivo, dadosEleicao);
        console.log('\n🎉 Importação concluída com sucesso!');
    } catch (error) {
        console.error('\n❌ Erro na importação:', error.message);
        process.exit(1);
    } finally {
        await db.closePool();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    importarCSVGrande();
}

module.exports = ImportadorCSVGrande;
