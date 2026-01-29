const fs = require('fs');
const csv = require('csv-parser');

async function analisarDadosComplementares() {
  try {
    console.log('🔍 Analisando estrutura do arquivo consulta_cand_complementar_2022_SC.csv...\n');
    
    const arquivo = './DADOS/consulta_cand_complementar_2022_SC.csv';
    let contador = 0;
    let colunas = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(arquivo)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
          contador++;
          
          // Capturar colunas do cabeçalho
          if (contador === 1) {
            colunas = Object.keys(row);
            console.log(`📊 Total de colunas: ${colunas.length}`);
            console.log('\n📋 Colunas encontradas:');
            colunas.forEach((col, i) => {
              console.log(`${i + 1}. ${col}`);
            });
          }
          
          // Mostrar apenas as primeiras 3 linhas de dados
          if (contador <= 3) {
            console.log(`\n📄 Linha ${contador}:`);
            Object.keys(row).forEach(key => {
              if (row[key] && row[key].trim() !== '') {
                console.log(`   ${key}: ${row[key]}`);
              }
            });
          }
        })
        .on('end', () => {
          console.log(`\n📈 Total de linhas processadas: ${contador}`);
          resolve();
        })
        .on('error', reject);
    });
    
  } catch (error) {
    console.error('❌ Erro ao analisar arquivo:', error.message);
  }
}

analisarDadosComplementares();
