const db = require('./config/database');

async function verificarCandidatos2022() {
  try {
    console.log('🔍 Verificando candidatos da eleição 2022 com dados complementares...\n');
    
    const candidatos2022 = await db.query(`
      SELECT id, nome, cargo, nome_urna, nome_social, cpf, email, 
             data_nascimento, uf_nascimento, genero, descricao_genero,
             grau_instrucao, descricao_grau_instrucao, estado_civil, 
             descricao_estado_civil, cor_raca, descricao_cor_raca,
             ocupacao, descricao_ocupacao, titulo_eleitoral
      FROM candidatos 
      WHERE eleicao_id = 3 
      AND (nome_urna IS NOT NULL OR nome_social IS NOT NULL OR cpf IS NOT NULL OR email IS NOT NULL)
      ORDER BY nome
      LIMIT 5
    `);
    
    console.log(`📊 Candidatos da eleição 2022 com dados complementares: ${candidatos2022.rows.length}\n`);
    
    candidatos2022.rows.forEach((candidato, i) => {
      console.log(`${i + 1}. ${candidato.nome} (${candidato.cargo})`);
      console.log(`   ID: ${candidato.id}`);
      console.log(`   Nome na Urna: ${candidato.nome_urna || 'N/A'}`);
      console.log(`   Nome Social: ${candidato.nome_social || 'N/A'}`);
      console.log(`   CPF: ${candidato.cpf || 'N/A'}`);
      console.log(`   Email: ${candidato.email || 'N/A'}`);
      console.log(`   Data Nascimento: ${candidato.data_nascimento || 'N/A'}`);
      console.log(`   UF Nascimento: ${candidato.uf_nascimento || 'N/A'}`);
      console.log(`   Gênero: ${candidato.descricao_genero || 'N/A'}`);
      console.log(`   Grau Instrução: ${candidato.descricao_grau_instrucao || 'N/A'}`);
      console.log(`   Estado Civil: ${candidato.descricao_estado_civil || 'N/A'}`);
      console.log(`   Cor/Raça: ${candidato.descricao_cor_raca || 'N/A'}`);
      console.log(`   Ocupação: ${candidato.descricao_ocupacao || 'N/A'}`);
      console.log(`   Título Eleitoral: ${candidato.titulo_eleitoral || 'N/A'}`);
      console.log('');
    });
    
    // Sugerir um candidato para testar
    if (candidatos2022.rows.length > 0) {
      const candidatoTeste = candidatos2022.rows[0];
      console.log(`💡 Sugestão: Teste o perfil do candidato ID ${candidatoTeste.id} (${candidatoTeste.nome})`);
      console.log(`   URL: http://localhost:3000/perfil-candidato.html?id=${candidatoTeste.id}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

verificarCandidatos2022();
