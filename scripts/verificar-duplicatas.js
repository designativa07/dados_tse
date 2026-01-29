const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function verificarDuplicatas() {
  console.log('🔍 Verificando duplicatas nos dados do TSE...\n');
  
  // Procurar arquivos CSV na pasta DADOS
  const dadosDir = path.join(__dirname, '..', 'DADOS');
  const files = fs.readdirSync(dadosDir).filter(f => f.endsWith('.csv'));
  
  if (files.length === 0) {
    console.log('❌ Nenhum arquivo CSV encontrado na pasta DADOS');
    return;
  }
  
  const filePath = path.join(dadosDir, files[0]);
  console.log(`📁 Analisando arquivo: ${files[0]}\n`);
  
  const registros = new Map();
  const duplicatas = [];
  let totalLinhas = 0;
  
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath, { encoding: 'utf8' })
      .pipe(csv({ 
        separator: ';',
        quote: '"',
        escape: '"',
        skipEmptyLines: true,
        skipLinesWithError: true,
        headers: true
      }))
      .on('data', (data) => {
        totalLinhas++;
        
        // Criar chave única: municipio + zona + secao + candidato
        const chave = `${data.CD_MUNICIPIO}-${data.NR_ZONA}-${data.NR_SECAO}-${data.NR_VOTAVEL}`;
        
        if (registros.has(chave)) {
          duplicatas.push({
            chave,
            primeiro: registros.get(chave),
            duplicata: {
              municipio: data.NM_MUNICIPIO,
              zona: data.NR_ZONA,
              secao: data.NR_SECAO,
              candidato: data.NM_VOTAVEL,
              votos: data.QT_VOTOS,
              local: data.NR_LOCAL_VOTACAO
            }
          });
        } else {
          registros.set(chave, {
            municipio: data.NM_MUNICIPIO,
            zona: data.NR_ZONA,
            secao: data.NR_SECAO,
            candidato: data.NM_VOTAVEL,
            votos: data.QT_VOTOS,
            local: data.NR_LOCAL_VOTACAO
          });
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`📊 Total de linhas processadas: ${totalLinhas.toLocaleString()}`);
  console.log(`📊 Registros únicos: ${registros.size.toLocaleString()}`);
  console.log(`📊 Duplicatas encontradas: ${duplicatas.length}\n`);
  
  if (duplicatas.length > 0) {
    console.log('🔍 Primeiras 10 duplicatas encontradas:\n');
    duplicatas.slice(0, 10).forEach((dup, index) => {
      console.log(`${index + 1}. ${dup.chave}`);
      console.log(`   Primeiro: ${dup.primeiro.municipio} - Zona ${dup.primeiro.zona}, Seção ${dup.primeiro.secao} - ${dup.primeiro.candidato} (${dup.primeiro.votos} votos) - Local ${dup.primeiro.local}`);
      console.log(`   Duplicata: ${dup.duplicata.municipio} - Zona ${dup.duplicata.zona}, Seção ${dup.duplicata.secao} - ${dup.duplicata.candidato} (${dup.duplicata.votos} votos) - Local ${dup.duplicata.local}`);
      console.log('');
    });
    
    if (duplicatas.length > 10) {
      console.log(`... e mais ${duplicatas.length - 10} duplicatas\n`);
    }
    
    // Analisar se são duplicatas legítimas (diferentes locais) ou erros
    const duplicatasMesmoLocal = duplicatas.filter(dup => 
      dup.primeiro.local === dup.duplicata.local
    );
    
    console.log(`📈 Duplicatas com mesmo local: ${duplicatasMesmoLocal.length}`);
    console.log(`📈 Duplicatas com locais diferentes: ${duplicatas.length - duplicatasMesmoLocal.length}`);
    
    if (duplicatasMesmoLocal.length > 0) {
      console.log('\n⚠️  ATENÇÃO: Existem duplicatas com o mesmo local - isso pode ser um erro nos dados!');
    } else {
      console.log('\n✅ Todas as duplicatas têm locais diferentes - isso é normal (múltiplos locais por seção)');
    }
  } else {
    console.log('✅ Nenhuma duplicata encontrada nos dados!');
  }
}

verificarDuplicatas().catch(console.error);
