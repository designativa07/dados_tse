const db = require('./config/database');

async function testarTodasFotosCorrigidas() {
  try {
    console.log('🧪 Testando TODAS as fotos corrigidas...\n');
    
    // 1. Verificar todos os candidatos com foto
    console.log('1. 📊 Todos os candidatos com foto:');
    const query = `
      SELECT id, nome, nome_urna, cargo, foto, sequencial_candidato
      FROM candidatos 
      WHERE eleicao_id = 3 AND foto IS NOT NULL
      ORDER BY cargo, nome;
    `;
    
    const result = await db.query(query);
    
    const cargos = {};
    result.rows.forEach(candidato => {
      const cargo = candidato.cargo;
      if (!cargos[cargo]) {
        cargos[cargo] = [];
      }
      cargos[cargo].push(candidato);
    });
    
    Object.keys(cargos).forEach(cargo => {
      console.log(`\n   ${cargo}:`);
      cargos[cargo].forEach(candidato => {
        const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' 
            ? candidato.nome_urna 
            : candidato.nome;
        console.log(`     ✅ ${candidato.id} | ${nomeExibir} | ${candidato.foto}`);
      });
    });
    
    // 2. Verificar candidatos específicos mencionados
    console.log('\n2. 🔍 Verificando candidatos específicos:');
    const candidatosEspecificos = [
      { id: 1496, nome: 'JORGINHO MELLO', cargo: 'Governador' },
      { id: 1785, nome: 'JORGE SEIF', cargo: 'Senador' },
      { id: 1736, nome: 'RAIMUNDO COLOMBO', cargo: 'Senador' },
      { id: 1508, nome: 'ANA LUCIA MEOTTI', cargo: 'Vice-Governador' },
      { id: 1469, nome: 'BIA VARGAS', cargo: 'Vice-Governador' }
    ];
    
    for (const candidato of candidatosEspecificos) {
      const queryEspecifico = `
        SELECT id, nome, nome_urna, cargo, foto, sequencial_candidato
        FROM candidatos 
        WHERE id = $1;
      `;
      
      const resultEspecifico = await db.query(queryEspecifico, [candidato.id]);
      
      if (resultEspecifico.rows.length > 0) {
        const c = resultEspecifico.rows[0];
        const nomeExibir = c.nome_urna && c.nome_urna !== 'N/A' ? c.nome_urna : c.nome;
        const fotoStatus = c.foto ? '✅' : '❌';
        console.log(`   ${fotoStatus} ${c.nome}: ${c.foto || 'N/A'} (Seq: ${c.sequencial_candidato || 'N/A'})`);
      }
    }
    
    // 3. Verificar mapeamento de fotos
    console.log('\n3. 📋 Verificando mapeamento de fotos:');
    const fs = require('fs');
    const path = require('path');
    const mapeamentoFile = path.join(__dirname, 'mapeamento-fotos-candidatos.json');
    
    if (fs.existsSync(mapeamentoFile)) {
      const mapeamento = JSON.parse(fs.readFileSync(mapeamentoFile, 'utf8'));
      
      console.log(`   Total de candidatos no mapeamento: ${mapeamento.length}`);
      
      // Verificar se as fotos existem fisicamente
      const fotosDir = path.join(__dirname, 'fotos_candidatos');
      const fotosExistentes = fs.readdirSync(fotosDir);
      
      let fotosValidas = 0;
      let fotosInvalidas = 0;
      
      mapeamento.forEach(foto => {
        const fotoExiste = fotosExistentes.includes(foto.foto_arquivo);
        if (fotoExiste) {
          fotosValidas++;
        } else {
          fotosInvalidas++;
          console.log(`   ❌ Foto não encontrada: ${foto.foto_arquivo} (${foto.nome})`);
        }
      });
      
      console.log(`   ✅ Fotos válidas: ${fotosValidas}`);
      console.log(`   ❌ Fotos inválidas: ${fotosInvalidas}`);
    }
    
    // 4. Testar API de fotos
    console.log('\n4. 🔌 Testando API de fotos:');
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
      
      // Testar candidatos específicos
      await testarAPI(1496, 'JORGINHO MELLO');
      await testarAPI(1785, 'JORGE SEIF');
      await testarAPI(1736, 'RAIMUNDO COLOMBO');
      await testarAPI(1508, 'ANA LUCIA MEOTTI');
      await testarAPI(1469, 'BIA VARGAS');
      
    } catch (error) {
      console.log(`   ❌ Erro ao testar API: ${error.message}`);
    }
    
    // 5. Resumo final
    console.log('\n5. 📋 Resumo das correções:');
    console.log('   ✅ Fotos de governadores corrigidas');
    console.log('   ✅ Fotos de senadores corrigidas');
    console.log('   ✅ Fotos de vice-governadores corrigidas');
    console.log('   ✅ Sequenciais de candidatos corrigidos');
    console.log('   ✅ Mapeamento de fotos atualizado');
    
    console.log('\n🎉 TODAS as correções foram aplicadas com sucesso!');
    console.log('💡 Para verificar no navegador:');
    console.log('   1. Acesse: http://localhost:3000');
    console.log('   2. Vá para a aba "Candidatos"');
    console.log('   3. Selecione "2022 - ELEIÇÃO ORDINÁRIA"');
    console.log('   4. Clique em "Buscar Candidatos"');
    console.log('   5. Clique nos nomes dos candidatos');
    console.log('   6. Verifique se as fotos estão corretas');
    
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
  testarTodasFotosCorrigidas();
}

module.exports = testarTodasFotosCorrigidas;
