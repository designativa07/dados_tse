const fs = require('fs');
const csv = require('csv-parser');
const db = require('./config/database');

async function verificarDadosComplementares() {
  try {
    console.log('🔍 Verificando dados complementares...\n');
    
    // Verificar candidatos que têm dados complementares
    const candidatosComDados = await db.query(`
      SELECT id, nome, cargo, eleicao_id
      FROM candidatos 
      WHERE nome_urna IS NOT NULL 
      OR nome_social IS NOT NULL 
      OR cpf IS NOT NULL 
      OR email IS NOT NULL
      ORDER BY eleicao_id, nome
      LIMIT 10
    `);
    
    console.log('📋 Candidatos com dados complementares:');
    candidatosComDados.rows.forEach((candidato, i) => {
      console.log(`${i + 1}. ${candidato.nome} (${candidato.cargo}) - Eleição ${candidato.eleicao_id}`);
    });
    
    // Verificar se o candidato 581 tem dados complementares
    const candidato581 = await db.query(`
      SELECT id, nome, cargo, eleicao_id, nome_urna, nome_social, cpf, email
      FROM candidatos 
      WHERE id = 581
    `);
    
    console.log('\n🔍 Candidato ID 581:');
    if (candidato581.rows.length > 0) {
      const c = candidato581.rows[0];
      console.log(`   Nome: ${c.nome}`);
      console.log(`   Cargo: ${c.cargo}`);
      console.log(`   Eleição: ${c.eleicao_id}`);
      console.log(`   Nome na Urna: ${c.nome_urna || 'NULL'}`);
      console.log(`   Nome Social: ${c.nome_social || 'NULL'}`);
      console.log(`   CPF: ${c.cpf || 'NULL'}`);
      console.log(`   Email: ${c.email || 'NULL'}`);
    }
    
    // Verificar arquivo complementar
    console.log('\n🔍 Verificando arquivo complementar...');
    const candidatosComplementares = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream('./DADOS/consulta_cand_complementar_2022_SC.csv')
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          if (row.SQ_CANDIDATO && row.SQ_CANDIDATO.trim() !== '') {
            candidatosComplementares.push({
              sq_candidato: row.SQ_CANDIDATO.trim(),
              nome: row.NM_CANDIDATO?.trim(),
              cpf: row.NR_CPF_CANDIDATO?.trim(),
              email: row.DS_EMAIL?.trim(),
              nome_urna: row.NM_URNA_CANDIDATO?.trim(),
              nome_social: row.NM_SOCIAL_CANDIDATO?.trim()
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`📊 Total de candidatos no arquivo complementar: ${candidatosComplementares.length}`);
    
    // Procurar o candidato 581 no arquivo complementar
    const candidato581Complementar = candidatosComplementares.find(c => 
      c.nome && c.nome.includes('CARLOS MOISÉS')
    );
    
    if (candidato581Complementar) {
      console.log('\n✅ Candidato 581 encontrado no arquivo complementar:');
      console.log(`   SQ_CANDIDATO: ${candidato581Complementar.sq_candidato}`);
      console.log(`   Nome: ${candidato581Complementar.nome}`);
      console.log(`   CPF: ${candidato581Complementar.cpf || 'N/A'}`);
      console.log(`   Email: ${candidato581Complementar.email || 'N/A'}`);
      console.log(`   Nome na Urna: ${candidato581Complementar.nome_urna || 'N/A'}`);
      console.log(`   Nome Social: ${candidato581Complementar.nome_social || 'N/A'}`);
    } else {
      console.log('\n❌ Candidato 581 não encontrado no arquivo complementar');
    }
    
    // Verificar quantos candidatos têm dados complementares
    const candidatosComDadosComplementares = candidatosComplementares.filter(c => 
      c.cpf || c.email || c.nome_urna || c.nome_social
    );
    
    console.log(`\n📊 Candidatos com dados complementares no arquivo: ${candidatosComDadosComplementares.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificarDadosComplementares();
