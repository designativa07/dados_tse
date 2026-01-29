const fs = require('fs');
const csv = require('csv-parser');

async function testarArquivoCSV() {
  try {
    console.log('Testando leitura do arquivo CSV...\n');
    
    const arquivo = './DADOS/consulta_cand_2022_SC.csv';
    
    // Verificar se arquivo existe
    if (!fs.existsSync(arquivo)) {
      console.error('❌ Arquivo não encontrado:', arquivo);
      return;
    }
    
    console.log('✅ Arquivo encontrado');
    
    // Ler primeiras linhas
    const linhas = [];
    let contador = 0;
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(arquivo)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          if (contador < 3) {
            linhas.push(row);
            contador++;
          } else {
            resolve();
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    console.log(`\nPrimeiras ${linhas.length} linhas:`);
    linhas.forEach((linha, index) => {
      console.log(`\nLinha ${index + 1}:`);
      console.log(`- Nome: ${linha.NM_CANDIDATO}`);
      console.log(`- Número: ${linha.NR_CANDIDATO}`);
      console.log(`- Cargo: ${linha.DS_CARGO}`);
      console.log(`- Partido: ${linha.NM_PARTIDO}`);
      console.log(`- Sigla Partido: ${linha.SG_PARTIDO}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
}

testarArquivoCSV();

