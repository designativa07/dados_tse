const fs = require('fs');
const csv = require('csv-parser');

async function verificarCSVOriginal() {
  try {
    console.log('🔍 Verificando dados originais do CSV...\n');
    
    const csvPath = 'DADOS/consulta_cand_2022_SC.csv';
    
    if (!fs.existsSync(csvPath)) {
      console.log('❌ Arquivo CSV não encontrado:', csvPath);
      return;
    }
    
    console.log('📊 Buscando candidatos com número 22 e 222...\n');
    
    const candidatos22 = [];
    const candidatos222 = [];
    const candidatosJorginho = [];
    const candidatosMarilisa = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          const numero = row.NR_CANDIDATO?.trim();
          const nome = row.NM_CANDIDATO?.trim();
          const nomeUrna = row.NM_URNA?.trim();
          const cargo = row.DS_CARGO?.trim();
          const sequencial = row.SQ_CANDIDATO?.trim();
          
          // Candidatos com número 22
          if (numero === '22') {
            candidatos22.push({
              sequencial,
              nome,
              nomeUrna,
              cargo,
              numero,
              partido: row.SG_PARTIDO?.trim(),
              situacao: row.DS_SITUACAO_CANDIDATURA?.trim()
            });
          }
          
          // Candidatos com número 222
          if (numero === '222') {
            candidatos222.push({
              sequencial,
              nome,
              nomeUrna,
              cargo,
              numero,
              partido: row.SG_PARTIDO?.trim(),
              situacao: row.DS_SITUACAO_CANDIDATURA?.trim()
            });
          }
          
          // Candidatos com nome Jorginho
          if (nome && nome.toLowerCase().includes('jorginho')) {
            candidatosJorginho.push({
              sequencial,
              nome,
              nomeUrna,
              cargo,
              numero,
              partido: row.SG_PARTIDO?.trim(),
              situacao: row.DS_SITUACAO_CANDIDATURA?.trim()
            });
          }
          
          // Candidatos com nome Marilisa
          if (nome && nome.toLowerCase().includes('marilisa')) {
            candidatosMarilisa.push({
              sequencial,
              nome,
              nomeUrna,
              cargo,
              numero,
              partido: row.SG_PARTIDO?.trim(),
              situacao: row.DS_SITUACAO_CANDIDATURA?.trim()
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log('📊 Candidatos com número 22:');
    console.log('='.repeat(80));
    candidatos22.forEach((candidato, index) => {
      console.log(`\n${index + 1}. Sequencial: ${candidato.sequencial}`);
      console.log(`   Nome: ${candidato.nome}`);
      console.log(`   Nome na Urna: ${candidato.nomeUrna}`);
      console.log(`   Cargo: ${candidato.cargo}`);
      console.log(`   Número: ${candidato.numero}`);
      console.log(`   Partido: ${candidato.partido}`);
      console.log(`   Situação: ${candidato.situacao}`);
    });
    
    console.log('\n\n📊 Candidatos com número 222:');
    console.log('='.repeat(80));
    candidatos222.forEach((candidato, index) => {
      console.log(`\n${index + 1}. Sequencial: ${candidato.sequencial}`);
      console.log(`   Nome: ${candidato.nome}`);
      console.log(`   Nome na Urna: ${candidato.nomeUrna}`);
      console.log(`   Cargo: ${candidato.cargo}`);
      console.log(`   Número: ${candidato.numero}`);
      console.log(`   Partido: ${candidato.partido}`);
      console.log(`   Situação: ${candidato.situacao}`);
    });
    
    console.log('\n\n📊 Candidatos com nome Jorginho:');
    console.log('='.repeat(80));
    candidatosJorginho.forEach((candidato, index) => {
      console.log(`\n${index + 1}. Sequencial: ${candidato.sequencial}`);
      console.log(`   Nome: ${candidato.nome}`);
      console.log(`   Nome na Urna: ${candidato.nomeUrna}`);
      console.log(`   Cargo: ${candidato.cargo}`);
      console.log(`   Número: ${candidato.numero}`);
      console.log(`   Partido: ${candidato.partido}`);
      console.log(`   Situação: ${candidato.situacao}`);
    });
    
    console.log('\n\n📊 Candidatos com nome Marilisa:');
    console.log('='.repeat(80));
    candidatosMarilisa.forEach((candidato, index) => {
      console.log(`\n${index + 1}. Sequencial: ${candidato.sequencial}`);
      console.log(`   Nome: ${candidato.nome}`);
      console.log(`   Nome na Urna: ${candidato.nomeUrna}`);
      console.log(`   Cargo: ${candidato.cargo}`);
      console.log(`   Número: ${candidato.numero}`);
      console.log(`   Partido: ${candidato.partido}`);
      console.log(`   Situação: ${candidato.situacao}`);
    });
    
    // Verificar fotos correspondentes
    console.log('\n\n📸 Verificando fotos correspondentes:');
    console.log('='.repeat(80));
    
    const fotosDir = 'fotos_candidatos';
    if (fs.existsSync(fotosDir)) {
      const files = fs.readdirSync(fotosDir);
      
      // Buscar fotos para os sequenciais encontrados
      const sequenciais = [
        ...candidatos22.map(c => c.sequencial),
        ...candidatos222.map(c => c.sequencial),
        ...candidatosJorginho.map(c => c.sequencial),
        ...candidatosMarilisa.map(c => c.sequencial)
      ].filter(s => s);
      
      sequenciais.forEach(sequencial => {
        const foto = files.find(f => f.includes(sequencial));
        if (foto) {
          console.log(`\nSequencial ${sequencial}: ${foto}`);
        } else {
          console.log(`\nSequencial ${sequencial}: ❌ Foto não encontrada`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

verificarCSVOriginal();

