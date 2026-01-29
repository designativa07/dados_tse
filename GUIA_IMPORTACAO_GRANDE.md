# 📊 Guia de Importação para Arquivos CSV Grandes

## 🚀 Como Importar Arquivos Grandes

Para importar arquivos CSV muito grandes (como `votacao_secao_2018_sc.csv`), use o script otimizado que processa os dados em lotes.

### 📋 Pré-requisitos

1. **Arquivo CSV** no formato TSE
2. **Banco de dados** inicializado
3. **Servidor** rodando (opcional, mas recomendado)

### 🔧 Método 1: Importação Direta (Recomendado)

```bash
# Comando básico
npm run import-large-csv votacao_secao_2018_sc.csv

# Comando completo com parâmetros
npm run import-large-csv votacao_secao_2018_sc.csv 2018 "Eleição Ordinária" "Eleições Gerais 2018"
```

### 📊 Parâmetros do Comando

- **Arquivo**: Caminho para o arquivo CSV (obrigatório)
- **Ano**: Ano da eleição (padrão: 2018)
- **Tipo**: Tipo da eleição (padrão: "Eleição Ordinária")
- **Descrição**: Descrição da eleição (padrão: "Eleições {ano}")

### 🔍 Monitoramento da Importação

Em outro terminal, execute o monitor para acompanhar o progresso:

```bash
# Terminal 1: Importação
npm run import-large-csv votacao_secao_2018_sc.csv

# Terminal 2: Monitoramento
node scripts/monitor-import.js
```

### ⚡ Características do Script Otimizado

- **Processamento em lotes**: 1000 registros por vez
- **Memória eficiente**: Não carrega todo o arquivo na memória
- **Transações seguras**: Cada lote é uma transação
- **Tratamento de erros**: Continua mesmo com erros
- **Progresso em tempo real**: Mostra estatísticas
- **Recuperação automática**: Pode ser executado novamente

### 📈 Exemplo de Execução

```bash
PS C:\Users\arm10892\Documents\MAPA VOTACOES> npm run import-large-csv votacao_secao_2018_sc.csv 2018 "Eleição Ordinária" "Eleições Gerais 2018"

> mapa-votacoes-tse@1.0.0 import-large-csv
> node scripts/import-large-csv.js votacao_secao_2018_sc.csv 2018 "Eleição Ordinária" "Eleições Gerais 2018"

🚀 Iniciando importação de arquivo grande...
📁 Arquivo: votacao_secao_2018_sc.csv
📊 Tamanho do lote: 1000 registros
✅ Eleição criada com ID: 1
📦 Processando lote de 1000 registros...
✅ Lote processado. Total: 1000 registros
📦 Processando lote de 1000 registros...
✅ Lote processado. Total: 2000 registros
...
🎉 Importação concluída!
📊 Total processado: 50000 registros
❌ Total de erros: 5
```

### 🛠️ Solução de Problemas

#### Erro de Memória
```bash
# Reduza o tamanho do lote editando o arquivo
# scripts/import-large-csv.js, linha 8:
this.batchSize = 500; // Reduzir de 1000 para 500
```

#### Erro de Conexão
```bash
# Verifique se o banco está rodando
npm run init-db

# Verifique as configurações no .env
type .env
```

#### Arquivo Muito Grande
```bash
# Divida o arquivo em partes menores
# Use ferramentas como split no Linux ou PowerShell no Windows
```

### 📊 Verificação Pós-Importação

Após a importação, verifique os dados:

```bash
# Verificar estatísticas
curl http://localhost:3000/api/votos/estatisticas

# Verificar eleições
curl http://localhost:3000/api/eleicoes

# Verificar municípios
curl http://localhost:3000/api/municipios/estatisticas/gerais
```

### 🎯 Dicas de Performance

1. **Feche outros programas** durante a importação
2. **Use SSD** se possível (mais rápido que HD)
3. **Monitore o banco** durante a importação
4. **Faça backup** antes de importar
5. **Execute fora do horário de pico**

### 📝 Logs e Monitoramento

O script gera logs detalhados:
- ✅ Registros processados com sucesso
- ❌ Erros encontrados
- 📊 Estatísticas em tempo real
- ⏱️ Tempo de processamento

### 🔄 Reimportação

Se precisar reimportar:
1. **Delete os dados** da eleição específica
2. **Execute novamente** o comando de importação
3. **O script detecta** e atualiza registros existentes

### 📞 Suporte

Se encontrar problemas:
1. Verifique os logs de erro
2. Confirme se o arquivo CSV está no formato correto
3. Verifique se o banco de dados está funcionando
4. Consulte a documentação do sistema

---

**🎉 Com este script, você pode importar arquivos de qualquer tamanho de forma segura e eficiente!**
