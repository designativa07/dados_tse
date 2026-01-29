# Importação de Dados de Eleitores

Este documento descreve como usar o script otimizado para importar dados de perfil do eleitor por seção eleitoral.

## 📋 Pré-requisitos

1. **Node.js** (versão 16 ou superior)
2. **PostgreSQL** configurado e rodando
3. **Arquivos CSV** dos dados de eleitores do TSE
4. **Configuração do banco** no arquivo `config.env`

## 📁 Estrutura de Arquivos

```
MAPA VOTACOES/
├── importar-dados-eleitores.js    # Script principal de importação
├── importar-eleitores.bat         # Script batch para Windows
├── config.env                     # Configurações do banco de dados
├── perfil_eleitor_secao_2018_SC/
│   └── perfil_eleitor_secao_2018_SC.csv
└── perfil_eleitor_secao_2022_SC/
    └── perfil_eleitor_secao_2022_SC.csv
```

## ⚙️ Configuração

### 1. Configurar Banco de Dados

Edite o arquivo `config.env` com suas credenciais:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mapa_votacoes
DB_USER=postgres
DB_PASSWORD=sua_senha
```

### 2. Preparar Arquivos CSV

Certifique-se de que os arquivos CSV estão nas pastas corretas:
- `perfil_eleitor_secao_2018_SC/perfil_eleitor_secao_2018_SC.csv`
- `perfil_eleitor_secao_2022_SC/perfil_eleitor_secao_2022_SC.csv`

## 🚀 Execução

### Opção 1: Script Batch (Windows)
```bash
importar-eleitores.bat
```

### Opção 2: Comando Direto
```bash
node importar-dados-eleitores.js
```

## 📊 Funcionalidades do Script

### ✅ Validação de Dados
- Verifica campos obrigatórios
- Valida formatos de data
- Limpa dados inválidos

### 🔄 Tratamento de Erros
- Retry automático com backoff exponencial
- Log detalhado de erros
- Continuação após falhas

### 📈 Otimizações
- Processamento em lotes (batches)
- Cache de municípios e eleições
- Detecção de duplicatas
- Índices automáticos

### 📋 Relatórios
- Progresso em tempo real
- Estatísticas detalhadas
- Relatório final completo

## 📊 Configurações Avançadas

Você pode modificar as configurações no início do arquivo `importar-dados-eleitores.js`:

```javascript
const CONFIG = {
    BATCH_SIZE: 1000,              // Tamanho do lote
    MAX_RETRIES: 5,                // Máximo de tentativas
    RETRY_DELAY: 2000,             // Delay entre tentativas (ms)
    PROGRESS_INTERVAL: 5000,       // Intervalo de progresso
    VALIDATE_DATA: true,           // Validar dados
    SKIP_DUPLICATES: true          // Pular duplicatas
};
```

## 🗃️ Estrutura da Tabela

A tabela `perfil_eleitor_secao` contém os seguintes campos:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `ano_eleicao` | INTEGER | Ano da eleição |
| `sg_uf` | VARCHAR(2) | Sigla do estado |
| `cd_municipio` | INTEGER | Código do município |
| `nm_municipio` | VARCHAR(100) | Nome do município |
| `nr_zona` | INTEGER | Número da zona eleitoral |
| `nr_secao` | INTEGER | Número da seção eleitoral |
| `cd_genero` | INTEGER | Código do gênero |
| `ds_genero` | VARCHAR(50) | Descrição do gênero |
| `cd_faixa_etaria` | INTEGER | Código da faixa etária |
| `ds_faixa_etaria` | VARCHAR(50) | Descrição da faixa etária |
| `cd_grau_escolaridade` | INTEGER | Código do grau de escolaridade |
| `ds_grau_escolaridade` | VARCHAR(100) | Descrição do grau de escolaridade |
| `cd_raca_cor` | INTEGER | Código da raça/cor |
| `ds_raca_cor` | VARCHAR(50) | Descrição da raça/cor |
| `qt_eleitores_perfil` | INTEGER | Quantidade de eleitores |

## 🔍 Monitoramento

Durante a importação, você verá:

```
🚀 Iniciando importação dos dados de eleitores 2018...
📁 Arquivo: ./perfil_eleitor_secao_2018_SC/perfil_eleitor_secao_2018_SC.csv
⚙️  Configurações: { batchSize: 1000, validateData: true, skipDuplicates: true }
🔧 Preparando ambiente...
📋 Carregando cache de municípios...
✅ Cache carregado: 295 municípios
✅ Ambiente preparado com sucesso!
📊 Progresso: 5000 linhas processadas (0.50%)
   ✅ Inseridas: 5000
   ❌ Erros: 0
   🔄 Duplicadas: 0
```

## ❌ Solução de Problemas

### Erro de Conexão com Banco
```
❌ Erro durante a importação: Error: connect ECONNREFUSED
```
**Solução**: Verifique se o PostgreSQL está rodando e as credenciais estão corretas.

### Arquivo CSV Não Encontrado
```
⚠️  Arquivo de 2018 não encontrado
```
**Solução**: Verifique se os arquivos CSV estão nas pastas corretas.

### Erro de Memória
```
❌ Erro: JavaScript heap out of memory
```
**Solução**: Reduza o `BATCH_SIZE` nas configurações ou aumente a memória do Node.js:
```bash
node --max-old-space-size=4096 importar-dados-eleitores.js
```

## 📈 Performance

### Tempos Estimados
- **2018**: ~2-3 minutos (dependendo do hardware)
- **2022**: ~3-4 minutos (dependendo do hardware)

### Otimizações Implementadas
- Processamento em lotes para reduzir overhead
- Cache de consultas frequentes
- Índices automáticos para consultas rápidas
- Validação prévia para evitar inserções inválidas

## 🔧 Manutenção

### Limpar Dados Duplicados
```sql
DELETE FROM perfil_eleitor_secao 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM perfil_eleitor_secao 
    GROUP BY ano_eleicao, cd_municipio, nr_zona, nr_secao, cd_genero, cd_faixa_etaria
);
```

### Verificar Estatísticas
```sql
SELECT 
    ano_eleicao,
    COUNT(*) as total_registros,
    SUM(qt_eleitores_perfil) as total_eleitores
FROM perfil_eleitor_secao 
GROUP BY ano_eleicao;
```

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs de erro
2. Confirme as configurações do banco
3. Valide os arquivos CSV
4. Consulte este documento

---

**Última atualização**: Dezembro 2024

