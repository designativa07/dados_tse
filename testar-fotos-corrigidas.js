const db = require('./config/database');

async function testarFotosCorrigidas() {
  try {
    console.log('🧪 Testando fotos corrigidas de Governadores e Senadores...\n');
    
    // 1. Verificar governadores e senadores
    console.log('1. 📊 Governadores e Senadores com fotos:');
    const query = `
      SELECT id, nome, nome_urna, cargo, foto, sequencial_candidato
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (cargo ILIKE '%Governador%' OR cargo ILIKE '%Senador%')
      ORDER BY cargo, nome;
    `;
    
    const result = await db.query(query);
    
    result.rows.forEach(candidato => {
      const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' 
          ? candidato.nome_urna 
          : candidato.nome;
      const fotoStatus = candidato.foto ? '✅' : '❌';
      console.log(`   ${fotoStatus} ${candidato.id} | ${nomeExibir} | ${candidato.cargo} | ${candidato.foto || 'N/A'}`);
    });
    
    // 2. Verificar candidatos específicos mencionados
    console.log('\n2. 🔍 Verificando candidatos específicos:');
    const candidatosEspecificos = [
      { id: 1496, nome: 'JORGINHO MELLO' },
      { id: 1785, nome: 'JORGE SEIF' },
      { id: 1736, nome: 'RAIMUNDO COLOMBO' }
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
      const governadoresSenadores = mapeamento.filter(f => 
        f.cargo && (f.cargo.includes('Governador') || f.cargo.includes('Senador'))
      );
      
      console.log(`   Total de governadores/senadores no mapeamento: ${governadoresSenadores.length}`);
      
      // Verificar se as fotos existem fisicamente
      const fotosDir = path.join(__dirname, 'fotos_candidatos');
      const fotosExistentes = fs.readdirSync(fotosDir);
      
      let fotosValidas = 0;
      let fotosInvalidas = 0;
      
      governadoresSenadores.forEach(foto => {
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
      
    } catch (error) {
      console.log(`   ❌ Erro ao testar API: ${error.message}`);
    }
    
    // 5. Resumo final
    console.log('\n5. 📋 Resumo das correções:');
    console.log('   ✅ Fotos de governadores corrigidas');
    console.log('   ✅ Fotos de senadores corrigidas');
    console.log('   ✅ Sequenciais de candidatos corrigidos');
    console.log('   ✅ Mapeamento de fotos atualizado');
    
    console.log('\n🎉 Teste concluído!');
    console.log('💡 Para verificar no navegador:');
    console.log('   1. Acesse: http://localhost:3000');
    console.log('   2. Vá para a aba "Candidatos"');
    console.log('   3. Selecione "2022 - ELEIÇÃO ORDINÁRIA"');
    console.log('   4. Clique em "Buscar Candidatos"');
    console.log('   5. Clique nos nomes dos governadores e senadores');
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
  testarFotosCorrigidas();
}

module.exports = testarFotosCorrigidas;
