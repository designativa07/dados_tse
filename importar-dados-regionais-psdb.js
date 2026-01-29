const fs = require('fs');
const csv = require('csv-parser');
const db = require('./config/database');

async function importarDadosRegionaisPSDB() {
  try {
    console.log('🚀 Importando dados regionais do PSDB...\n');
    
    const arquivo = './DADOS/DADOS_REGIONAIS_PSDB_OK.csv';
    const dados = [];
    
    // 1. Ler arquivo CSV
    console.log('📖 Lendo arquivo CSV...');
    await new Promise((resolve, reject) => {
      fs.createReadStream(arquivo)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          // Processar linha do CSV
          const dadoRegional = {
            mesorregiao: row.REG_MESORREGIAO?.trim(),
            regionalPsdb: row.REG_REGIONAL_PSDB?.trim(),
            municipio: row.REG_MUNICIPIO?.trim(),
            filiadosPsdb2024: parseInt(row.REG_FILIADOS_PSDB_2024?.replace(/[^\d]/g, '') || '0'),
            populacao2024: parseInt(row.REG_POPULACAO_2024?.replace(/[^\d]/g, '') || '0'),
            eleitores2024: parseInt(row.REG_ELEITORES_2024?.replace(/[^\d]/g, '') || '0')
          };
          
          // Validar dados essenciais
          if (dadoRegional.mesorregiao && dadoRegional.regionalPsdb && dadoRegional.municipio) {
            dados.push(dadoRegional);
          } else {
            console.warn(`⚠️ Linha inválida ignorada: ${JSON.stringify(row)}`);
          }
        })
        .on('end', () => {
          console.log(`✅ ${dados.length} registros válidos lidos`);
          resolve();
        })
        .on('error', reject);
    });
    
    if (dados.length === 0) {
      console.log('❌ Nenhum dado válido encontrado no arquivo');
      return;
    }
    
    // 2. Limpar tabelas existentes (opcional - comentado para preservar)
    // console.log('\n🧹 Limpando tabelas existentes...');
    // await db.query('DELETE FROM municipios_regionais');
    // await db.query('DELETE FROM regionais_psdb');  
    // await db.query('DELETE FROM mesorregioes');
    
    // 3. Processar mesorregiões únicas
    console.log('\n📍 Processando mesorregiões...');
    const mesorregioes = [...new Set(dados.map(d => d.mesorregiao))];
    const mesorregiaoMap = new Map();
    
    for (const nome of mesorregioes) {
      try {
        // Verificar se já existe
        const existe = await db.query('SELECT id FROM mesorregioes WHERE nome = $1', [nome]);
        
        if (existe.rows.length > 0) {
          mesorregiaoMap.set(nome, existe.rows[0].id);
          console.log(`   ↻ ${nome} (já existe)`);
        } else {
          // Inserir nova mesorregião
          const result = await db.query(
            'INSERT INTO mesorregioes (nome) VALUES ($1) RETURNING id',
            [nome]
          );
          mesorregiaoMap.set(nome, result.rows[0].id);
          console.log(`   ✅ ${nome} (criada)`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar mesorregião ${nome}:`, error.message);
      }
    }
    
    // 4. Processar regionais PSDB únicas
    console.log('\n🏛️ Processando regionais PSDB...');
    const regionaisPsdb = [...new Set(dados.map(d => `${d.regionalPsdb}|${d.mesorregiao}`))];
    const regionalMap = new Map();
    
    for (const regionalInfo of regionaisPsdb) {
      const [nomeRegional, nomeMesorregiao] = regionalInfo.split('|');
      const mesorregiaoId = mesorregiaoMap.get(nomeMesorregiao);
      
      if (!mesorregiaoId) {
        console.error(`❌ Mesorregião não encontrada: ${nomeMesorregiao}`);
        continue;
      }
      
      try {
        // Verificar se já existe
        const existe = await db.query(
          'SELECT id FROM regionais_psdb WHERE nome = $1 AND mesorregiao_id = $2', 
          [nomeRegional, mesorregiaoId]
        );
        
        if (existe.rows.length > 0) {
          regionalMap.set(nomeRegional, existe.rows[0].id);
          console.log(`   ↻ ${nomeRegional} (${nomeMesorregiao}) (já existe)`);
        } else {
          // Inserir nova regional
          const result = await db.query(
            'INSERT INTO regionais_psdb (nome, mesorregiao_id) VALUES ($1, $2) RETURNING id',
            [nomeRegional, mesorregiaoId]
          );
          regionalMap.set(nomeRegional, result.rows[0].id);
          console.log(`   ✅ ${nomeRegional} (${nomeMesorregiao}) (criada)`);
        }
      } catch (error) {
        console.error(`❌ Erro ao processar regional ${nomeRegional}:`, error.message);
      }
    }
    
    // 5. Processar municípios regionais
    console.log('\n🏘️ Processando municípios regionais...');
    let municipiosInseridos = 0;
    let municipiosAtualizados = 0;
    
    for (const dado of dados) {
      const mesorregiaoId = mesorregiaoMap.get(dado.mesorregiao);
      const regionalId = regionalMap.get(dado.regionalPsdb);
      
      if (!mesorregiaoId || !regionalId) {
        console.error(`❌ IDs não encontrados para ${dado.municipio}: mesorregiao=${mesorregiaoId}, regional=${regionalId}`);
        continue;
      }
      
      try {
        // Verificar se município já existe
        const existe = await db.query(
          'SELECT id FROM municipios_regionais WHERE nome = $1 AND regional_psdb_id = $2',
          [dado.municipio, regionalId]
        );
        
        if (existe.rows.length > 0) {
          // Atualizar dados existentes
          await db.query(`
            UPDATE municipios_regionais 
            SET 
              mesorregiao_id = $1,
              filiados_psdb_2024 = $2,
              populacao_2024 = $3,
              eleitores_2024 = $4
            WHERE id = $5
          `, [mesorregiaoId, dado.filiadosPsdb2024, dado.populacao2024, dado.eleitores2024, existe.rows[0].id]);
          
          municipiosAtualizados++;
          if (municipiosAtualizados <= 5) {
            console.log(`   ↻ ${dado.municipio} (${dado.regionalPsdb}) (atualizado)`);
          }
        } else {
          // Inserir novo município
          await db.query(`
            INSERT INTO municipios_regionais (
              nome, mesorregiao_id, regional_psdb_id, 
              filiados_psdb_2024, populacao_2024, eleitores_2024
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            dado.municipio, mesorregiaoId, regionalId,
            dado.filiadosPsdb2024, dado.populacao2024, dado.eleitores2024
          ]);
          
          municipiosInseridos++;
          if (municipiosInseridos <= 5) {
            console.log(`   ✅ ${dado.municipio} (${dado.regionalPsdb}) (criado)`);
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao processar município ${dado.municipio}:`, error.message);
      }
    }
    
    // 6. Mostrar estatísticas finais
    console.log('\n📊 Estatísticas da importação:');
    
    const totalMesorregioes = await db.query('SELECT COUNT(*) as total FROM mesorregioes');
    const totalRegionais = await db.query('SELECT COUNT(*) as total FROM regionais_psdb');
    const totalMunicipios = await db.query('SELECT COUNT(*) as total FROM municipios_regionais');
    
    console.log(`   Mesorregiões: ${totalMesorregioes.rows[0].total}`);
    console.log(`   Regionais PSDB: ${totalRegionais.rows[0].total}`);
    console.log(`   Municípios regionais: ${totalMunicipios.rows[0].total}`);
    console.log(`   Municípios inseridos: ${municipiosInseridos}`);
    console.log(`   Municípios atualizados: ${municipiosAtualizados}`);
    
    // 7. Verificar alguns dados para validação
    console.log('\n✅ Amostra dos dados importados:');
    const amostra = await db.query(`
      SELECT 
        mes.nome as mesorregiao,
        rp.nome as regional_psdb,
        mr.nome as municipio,
        mr.filiados_psdb_2024,
        mr.populacao_2024,
        mr.eleitores_2024
      FROM municipios_regionais mr
      JOIN regionais_psdb rp ON mr.regional_psdb_id = rp.id
      JOIN mesorregioes mes ON mr.mesorregiao_id = mes.id
      ORDER BY mes.nome, rp.nome, mr.nome
      LIMIT 5
    `);
    
    amostra.rows.forEach(r => {
      console.log(`   ${r.mesorregiao} > ${r.regional_psdb} > ${r.municipio}`);
      console.log(`     Filiados: ${r.filiados_psdb_2024} | População: ${r.populacao_2024.toLocaleString()} | Eleitores: ${r.eleitores_2024.toLocaleString()}`);
    });
    
    console.log('\n🎉 Importação de dados regionais PSDB concluída com sucesso!');
    console.log('💡 Os dados agora estão disponíveis para análise regional no sistema.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a importação:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  importarDadosRegionaisPSDB();
}

module.exports = importarDadosRegionaisPSDB;
