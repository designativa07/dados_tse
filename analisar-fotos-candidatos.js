const fs = require('fs');
const path = require('path');
const db = require('./config/database');

async function analisarFotosCandidatos() {
  try {
    console.log('🔍 Analisando fotos dos candidatos...\n');
    
    // Listar arquivos da pasta fotos_candidatos
    const fotosDir = './fotos_candidatos';
    const arquivos = fs.readdirSync(fotosDir);
    
    console.log(`📊 Total de arquivos de foto: ${arquivos.length}\n`);
    
    // Analisar padrão dos nomes
    console.log('📋 Análise do padrão dos nomes:');
    const padroes = {};
    
    arquivos.forEach(arquivo => {
      if (arquivo.endsWith('.jpg') || arquivo.endsWith('.jpeg') || arquivo.endsWith('.png')) {
        // Extrair código do nome do arquivo
        const match = arquivo.match(/^FSC(\d+)_div\.(jpg|jpeg|png)$/i);
        if (match) {
          const codigo = match[1];
          const extensao = match[2];
          
          if (!padroes[codigo]) {
            padroes[codigo] = [];
          }
          padroes[codigo].push(extensao);
        }
      }
    });
    
    console.log(`📊 Códigos únicos encontrados: ${Object.keys(padroes).length}\n`);
    
    // Mostrar alguns exemplos
    const exemplos = Object.keys(padroes).slice(0, 10);
    console.log('📋 Exemplos de códigos:');
    exemplos.forEach(codigo => {
      console.log(`   ${codigo} (${padroes[codigo].join(', ')})`);
    });
    
    // Verificar se esses códigos correspondem a sequenciais de candidatos
    console.log('\n🔍 Verificando correspondência com sequenciais de candidatos...');
    
    const codigosParaTestar = exemplos.slice(0, 5);
    for (const codigo of codigosParaTestar) {
      const candidato = await db.query(`
        SELECT id, nome, cargo, sequencial_candidato, eleicao_id
        FROM candidatos 
        WHERE sequencial_candidato = $1
      `, [parseInt(codigo)]);
      
      if (candidato.rows.length > 0) {
        const c = candidato.rows[0];
        console.log(`   ✅ Código ${codigo}: ${c.nome} (${c.cargo}) - Eleição ${c.eleicao_id}`);
      } else {
        console.log(`   ❌ Código ${codigo}: Nenhum candidato encontrado`);
      }
    }
    
    // Verificar quantos candidatos têm sequencial_candidato preenchido
    console.log('\n📊 Estatísticas de sequenciais:');
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_candidatos,
        COUNT(sequencial_candidato) as com_sequencial,
        COUNT(*) - COUNT(sequencial_candidato) as sem_sequencial
      FROM candidatos
    `);
    
    const total = parseInt(stats.rows[0].total_candidatos);
    const comSequencial = parseInt(stats.rows[0].com_sequencial);
    const semSequencial = parseInt(stats.rows[0].sem_sequencial);
    
    console.log(`   Total de candidatos: ${total}`);
    console.log(`   Com sequencial: ${comSequencial} (${((comSequencial/total)*100).toFixed(1)}%)`);
    console.log(`   Sem sequencial: ${semSequencial} (${((semSequencial/total)*100).toFixed(1)}%)`);
    
    // Verificar se há correspondência entre fotos e candidatos
    console.log('\n🔍 Verificando correspondência entre fotos e candidatos...');
    let correspondencias = 0;
    
    for (const codigo of Object.keys(padroes)) {
      const candidato = await db.query(`
        SELECT id, nome, cargo, sequencial_candidato
        FROM candidatos 
        WHERE sequencial_candidato = $1
      `, [parseInt(codigo)]);
      
      if (candidato.rows.length > 0) {
        correspondencias++;
      }
    }
    
    console.log(`   Correspondências encontradas: ${correspondencias}/${Object.keys(padroes).length}`);
    console.log(`   Taxa de correspondência: ${((correspondencias/Object.keys(padroes).length)*100).toFixed(1)}%`);
    
    // Sugerir implementação
    console.log('\n💡 Sugestão de implementação:');
    console.log('1. Adicionar coluna "foto" na tabela candidatos');
    console.log('2. Criar função para buscar foto por sequencial_candidato');
    console.log('3. Exibir foto no perfil do candidato');
    console.log('4. Usar fallback para candidatos sem foto');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

analisarFotosCandidatos();
