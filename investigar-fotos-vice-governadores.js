const db = require('./config/database');

async function investigarFotosViceGovernadores() {
  try {
    console.log('🔍 Investigando fotos dos Vice-Governadores...\n');
    
    // Buscar vice-governadores
    const query = `
      SELECT id, nome, nome_urna, cargo, foto, sequencial_candidato, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND cargo ILIKE '%Vice%'
      ORDER BY nome;
    `;
    
    const result = await db.query(query);
    
    console.log('📊 Vice-Governadores:');
    console.log('='.repeat(80));
    
    result.rows.forEach(candidato => {
      const nomeExibir = candidato.nome_urna && candidato.nome_urna !== 'N/A' 
          ? candidato.nome_urna 
          : candidato.nome;
      const fotoStatus = candidato.foto ? '✅' : '❌';
      const partido = candidato.sigla_partido || 'N/A';
      
      console.log(`${fotoStatus} ID: ${candidato.id}`);
      console.log(`   Nome: ${nomeExibir}`);
      console.log(`   Cargo: ${candidato.cargo}`);
      console.log(`   Partido: ${partido} | Número: ${candidato.numero}`);
      console.log(`   Foto: ${candidato.foto || 'N/A'}`);
      console.log(`   Sequencial: ${candidato.sequencial_candidato || 'N/A'}`);
      console.log('');
    });
    
    // Verificar fotos disponíveis na pasta
    console.log('📸 Verificando fotos disponíveis na pasta...');
    const fs = require('fs');
    const path = require('path');
    const fotosDir = path.join(__dirname, 'fotos_candidatos');
    
    if (fs.existsSync(fotosDir)) {
      const files = fs.readdirSync(fotosDir);
      const fotosViceGovernadores = files.filter(file => 
        file.includes('FSC240001611') && 
        (file.includes('129') || file.includes('130') || file.includes('131') ||
         file.includes('132') || file.includes('133'))
      );
      
      console.log('Fotos encontradas para vice-governadores:');
      fotosViceGovernadores.forEach(file => {
        console.log(`   - ${file}`);
      });
    }
    
    // Verificar mapeamento atual
    console.log('\n📋 Verificando mapeamento atual...');
    const mapeamentoFile = path.join(__dirname, 'mapeamento-fotos-candidatos.json');
    if (fs.existsSync(mapeamentoFile)) {
      const mapeamento = JSON.parse(fs.readFileSync(mapeamentoFile, 'utf8'));
      const viceGovernadoresMapeamento = mapeamento.filter(f => 
        f.cargo && f.cargo.includes('Vice')
      );
      
      console.log('Mapeamento atual para vice-governadores:');
      viceGovernadoresMapeamento.forEach(foto => {
        console.log(`   ID: ${foto.candidato_id} | ${foto.nome} | ${foto.cargo} | ${foto.foto_arquivo}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (db.end && typeof db.end === 'function') {
      await db.end();
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  investigarFotosViceGovernadores();
}

module.exports = investigarFotosViceGovernadores;
