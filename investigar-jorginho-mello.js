const db = require('./config/database');

async function investigarJorginhoMello() {
  try {
    console.log('🔍 Investigando dados do JORGINHO MELLO...\n');
    
    // Buscar todos os candidatos com nome JORGINHO MELLO
    console.log('1. Todos os candidatos JORGINHO MELLO:');
    const jorginhoQuery = `
      SELECT 
        id, nome, nome_urna, cargo, partido, sigla_partido, eleicao_id, numero
      FROM candidatos 
      WHERE nome ILIKE '%JORGINHO%MELLO%' OR nome ILIKE '%JORGINHO%SANTOS%'
      ORDER BY eleicao_id, cargo;
    `;
    
    const jorginhoResult = await db.query(jorginhoQuery);
    jorginhoResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Eleição: ${candidato.eleicao_id} | Número: ${candidato.numero}`);
    });
    
    // Buscar candidatos com nome DELEGADA MARILISA
    console.log('\n2. Candidatos DELEGADA MARILISA:');
    const marilisaQuery = `
      SELECT 
        id, nome, nome_urna, cargo, partido, sigla_partido, eleicao_id, numero
      FROM candidatos 
      WHERE nome_urna ILIKE '%DELEGADA MARILISA%' OR nome ILIKE '%DELEGADA MARILISA%'
      ORDER BY eleicao_id, cargo;
    `;
    
    const marilisaResult = await db.query(marilisaQuery);
    marilisaResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Eleição: ${candidato.eleicao_id} | Número: ${candidato.numero}`);
    });
    
    // Verificar candidatos Governador e Vice-Governador na eleição 2022
    console.log('\n3. Candidatos Governador e Vice-Governador (2022):');
    const governadoresQuery = `
      SELECT 
        id, nome, nome_urna, cargo, partido, sigla_partido, numero
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (cargo ILIKE '%Governador%' OR cargo ILIKE '%Vice%')
      ORDER BY cargo, nome;
    `;
    
    const governadoresResult = await db.query(governadoresQuery);
    governadoresResult.rows.forEach(candidato => {
      console.log(`   ID: ${candidato.id} | Nome: ${candidato.nome} | Nome Urna: ${candidato.nome_urna || 'N/A'} | Cargo: ${candidato.cargo} | Partido: ${candidato.sigla_partido} | Número: ${candidato.numero}`);
    });
    
    // Verificar se há problemas com os dados originais
    console.log('\n4. Verificando dados originais do CSV...');
    const fs = require('fs');
    const csv = require('csv-parser');
    
    // Ler algumas linhas do CSV original para verificar
    const csvPath = './DADOS/consulta_cand_2022_SC.csv';
    if (fs.existsSync(csvPath)) {
      console.log('   Lendo CSV original...');
      const linhas = [];
      
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv({ separator: ';' }))
          .on('data', (row) => {
            if (row.NM_CANDIDATO && (row.NM_CANDIDATO.includes('JORGINHO') || row.NM_CANDIDATO.includes('MARILISA'))) {
              linhas.push({
                nome: row.NM_CANDIDATO,
                nomeUrna: row.NM_URNA_CANDIDATO,
                cargo: row.DS_CARGO,
                partido: row.SG_PARTIDO,
                numero: row.NR_CANDIDATO
              });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });
      
      console.log('   Dados originais do CSV:');
      linhas.forEach(linha => {
        console.log(`   Nome: ${linha.nome} | Nome Urna: ${linha.nomeUrna} | Cargo: ${linha.cargo} | Partido: ${linha.partido} | Número: ${linha.numero}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

investigarJorginhoMello();
