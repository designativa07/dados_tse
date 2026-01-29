const db = require('./config/database');

async function investigarFotosGovernadoresSenadores() {
  try {
    console.log('🔍 Investigando fotos de Governadores e Senadores...\n');
    
    // Buscar governadores e senadores
    const query = `
      SELECT id, nome, nome_urna, cargo, foto, sequencial_candidato, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (cargo ILIKE '%Governador%' OR cargo ILIKE '%Senador%')
      ORDER BY cargo, nome;
    `;
    
    const result = await db.query(query);
    
    console.log('📊 Governadores e Senadores:');
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
      const fotosGovernadoresSenadores = files.filter(file => 
        file.includes('FSC240001611') && 
        (file.includes('123') || file.includes('124') || file.includes('125') || 
         file.includes('126') || file.includes('127') || file.includes('128') ||
         file.includes('129') || file.includes('130') || file.includes('131') ||
         file.includes('132') || file.includes('133'))
      );
      
      console.log('Fotos encontradas para governadores/senadores:');
      fotosGovernadoresSenadores.forEach(file => {
        console.log(`   - ${file}`);
      });
    }
    
    // Verificar mapeamento atual
    console.log('\n📋 Verificando mapeamento atual...');
    const mapeamentoFile = path.join(__dirname, 'mapeamento-fotos-candidatos.json');
    if (fs.existsSync(mapeamentoFile)) {
      const mapeamento = JSON.parse(fs.readFileSync(mapeamentoFile, 'utf8'));
      const governadoresSenadoresMapeamento = mapeamento.filter(f => 
        f.cargo && (f.cargo.includes('Governador') || f.cargo.includes('Senador'))
      );
      
      console.log('Mapeamento atual para governadores/senadores:');
      governadoresSenadoresMapeamento.forEach(foto => {
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
  investigarFotosGovernadoresSenadores();
}

module.exports = investigarFotosGovernadoresSenadores;
