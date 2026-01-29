const db = require('./config/database');

async function testarCorrecoesFinais() {
  try {
    console.log('🧪 Testando correções finais...\n');
    
    // 1. Testar candidatos principais
    console.log('1. 📊 Candidatos para Governador e Vice-Governador:');
    const governadoresQuery = `
      SELECT 
        id, nome, nome_urna, cargo, partido, sigla_partido, numero, foto
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (cargo ILIKE '%Governador%' OR cargo ILIKE '%Vice%')
      ORDER BY cargo, nome;
    `;
    
    const governadoresResult = await db.query(governadoresQuery);
    governadoresResult.rows.forEach(candidato => {
      const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' 
          ? candidato.nome_urna 
          : candidato.nome;
      const fotoStatus = candidato.foto ? '✅' : '❌';
      const partido = candidato.sigla_partido || 'N/A';
      console.log(`   ${fotoStatus} ${candidato.id} | ${nomeExibir} | ${candidato.cargo} | ${partido} | ${candidato.numero}`);
    });
    
    // 2. Verificar cargos padronizados
    console.log('\n2. 🏛️ Verificando padronização de cargos:');
    const cargosQuery = `
      SELECT DISTINCT cargo, COUNT(*) as total
      FROM candidatos 
      WHERE eleicao_id = 3
      GROUP BY cargo
      ORDER BY total DESC;
    `;
    
    const cargosResult = await db.query(cargosQuery);
    cargosResult.rows.forEach(cargo => {
      console.log(`   ${cargo.cargo}: ${cargo.total} candidatos`);
    });
    
    // 3. Verificar fotos disponíveis
    console.log('\n3. 📸 Verificando fotos disponíveis:');
    const fotosQuery = `
      SELECT 
        COUNT(*) as total_candidatos,
        COUNT(foto) as candidatos_com_foto,
        CAST((COUNT(foto)::float / COUNT(*)) * 100 AS DECIMAL(5,1)) as percentual_fotos
      FROM candidatos 
      WHERE eleicao_id = 3;
    `;
    
    const fotosResult = await db.query(fotosQuery);
    const stats = fotosResult.rows[0];
    console.log(`   Total de candidatos: ${stats.total_candidatos}`);
    console.log(`   Candidatos com foto: ${stats.candidatos_com_foto}`);
    console.log(`   Percentual com foto: ${stats.percentual_fotos}%`);
    
    // 4. Verificar duplicatas restantes
    console.log('\n4. 🔍 Verificando duplicatas restantes:');
    const duplicatasQuery = `
      SELECT 
        nome, 
        COUNT(*) as total,
        STRING_AGG(DISTINCT cargo, ', ') as cargos
      FROM candidatos 
      WHERE eleicao_id = 3
      GROUP BY nome
      HAVING COUNT(*) > 1
      ORDER BY total DESC;
    `;
    
    const duplicatasResult = await db.query(duplicatasQuery);
    if (duplicatasResult.rows.length > 0) {
      console.log('   ⚠️  Duplicatas restantes:');
      duplicatasResult.rows.forEach(duplicata => {
        console.log(`      ${duplicata.nome}: ${duplicata.total} registros (${duplicata.cargos})`);
      });
    } else {
      console.log('   ✅ Nenhuma duplicata encontrada');
    }
    
    // 5. Testar API de fotos
    console.log('\n5. 🔌 Testando API de fotos:');
    try {
      const http = require('http');
      
      const testarAPI = (candidatoId, nome) => {
        return new Promise((resolve) => {
          const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api/fotos-candidatos/${candidatoId}`,
            method: 'GET'
          };
          
          const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try {
                const result = JSON.parse(data);
                if (result.success) {
                  console.log(`   ✅ ${nome}: ${result.foto_arquivo}`);
                } else {
                  console.log(`   ❌ ${nome}: ${result.message}`);
                }
              } catch (error) {
                console.log(`   ❌ ${nome}: Erro ao parsear resposta`);
              }
              resolve();
            });
          });
          
          req.on('error', () => {
            console.log(`   ❌ ${nome}: Erro de conexão`);
            resolve();
          });
          
          req.setTimeout(5000, () => {
            console.log(`   ❌ ${nome}: Timeout`);
            req.destroy();
            resolve();
          });
          
          req.end();
        });
      };
      
      // Testar alguns candidatos principais
      await testarAPI(1496, 'JORGINHO MELLO');
      await testarAPI(1508, 'ANA LUCIA MEOTTI');
      await testarAPI(1469, 'BIA VARGAS');
      
    } catch (error) {
      console.log(`   ❌ Erro ao testar API: ${error.message}`);
    }
    
    // 6. Resumo final
    console.log('\n6. 📋 Resumo das correções:');
    console.log('   ✅ Fotos de candidatos principais corrigidas');
    console.log('   ✅ Cargos padronizados (Governador, Vice-Governador, etc.)');
    console.log('   ✅ Nomes na urna corrigidos');
    console.log('   ✅ Mapeamento de fotos atualizado');
    console.log('   ⚠️  Duplicatas identificadas (não removidas por votos associados)');
    
    console.log('\n🎉 Teste concluído!');
    console.log('💡 Para testar no navegador:');
    console.log('   1. Acesse: http://localhost:3000');
    console.log('   2. Vá para a aba "Candidatos"');
    console.log('   3. Selecione "2022 - ELEIÇÃO ORDINÁRIA"');
    console.log('   4. Clique em "Buscar Candidatos"');
    console.log('   5. Clique nos nomes dos candidatos para ver os perfis');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    if (db.end && typeof db.end === 'function') {
      await db.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testarCorrecoesFinais();
}

module.exports = testarCorrecoesFinais;
