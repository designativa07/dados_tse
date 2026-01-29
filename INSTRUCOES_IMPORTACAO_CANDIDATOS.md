# Instruções para Importação Completa de Candidatos

## 📋 Visão Geral

Este guia explica como importar **todas as colunas** do arquivo `consulta_cand_2022_SC.csv` para o banco de dados, criando automaticamente as colunas necessárias na tabela `candidatos`.

## 🎯 O que será importado

O arquivo CSV contém **50 colunas** com informações completas dos candidatos:

### Dados Básicos
- Nome completo, nome na urna, nome social
- CPF, email, título eleitoral
- Data de nascimento, UF de nascimento

### Dados Eleitorais
- Número do candidato, cargo, situação da candidatura
- Partido, federação, coligação
- Tipo de agremiação

### Dados Pessoais
- Gênero, grau de instrução, estado civil
- Cor/raça, ocupação
- Situação na totalização

### Dados Técnicos TSE
- Códigos de eleição, cargo, partido
- Datas de geração e eleição
- Informações de abrangência

## 🚀 Como Executar

### Opção 1: Execução Automática (Recomendada)
```bash
# Execute o script batch que faz tudo automaticamente
importar-candidatos-completo.bat
```

### Opção 2: Execução Manual
```bash
# 1. Primeiro, adicione as colunas necessárias
node scripts/adicionar-colunas-candidatos.js

# 2. Depois, importe os dados completos
node scripts/import-candidatos-completo.js
```

## 📊 Estrutura do Banco de Dados

### Colunas Adicionadas à Tabela `candidatos`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `nome_urna` | VARCHAR(255) | Nome do candidato na urna |
| `nome_social` | VARCHAR(255) | Nome social do candidato |
| `cpf` | VARCHAR(20) | CPF do candidato |
| `email` | VARCHAR(255) | Email do candidato |
| `situacao_candidatura` | INTEGER | Código da situação da candidatura |
| `descricao_situacao_candidatura` | VARCHAR(100) | Descrição da situação |
| `tipo_agremiacao` | VARCHAR(50) | Tipo de agremiação (PARTIDO, FEDERAÇÃO, etc.) |
| `numero_partido` | INTEGER | Número do partido |
| `sigla_partido` | VARCHAR(20) | Sigla do partido |
| `nome_partido` | VARCHAR(100) | Nome completo do partido |
| `numero_federacao` | INTEGER | Número da federação |
| `nome_federacao` | VARCHAR(100) | Nome da federação |
| `sigla_federacao` | VARCHAR(20) | Sigla da federação |
| `composicao_federacao` | VARCHAR(255) | Composição da federação |
| `numero_coligacao` | INTEGER | Número da coligação |
| `nome_coligacao` | VARCHAR(100) | Nome da coligação |
| `composicao_coligacao` | VARCHAR(255) | Composição da coligação |
| `uf_nascimento` | VARCHAR(2) | UF de nascimento |
| `data_nascimento` | VARCHAR(20) | Data de nascimento |
| `titulo_eleitoral` | VARCHAR(20) | Título eleitoral |
| `genero` | INTEGER | Código do gênero |
| `descricao_genero` | VARCHAR(20) | Descrição do gênero |
| `grau_instrucao` | INTEGER | Código do grau de instrução |
| `descricao_grau_instrucao` | VARCHAR(50) | Descrição do grau de instrução |
| `estado_civil` | INTEGER | Código do estado civil |
| `descricao_estado_civil` | VARCHAR(30) | Descrição do estado civil |
| `cor_raca` | INTEGER | Código da cor/raça |
| `descricao_cor_raca` | VARCHAR(30) | Descrição da cor/raça |
| `ocupacao` | INTEGER | Código da ocupação |
| `descricao_ocupacao` | VARCHAR(100) | Descrição da ocupação |
| `situacao_totalizacao_turno` | INTEGER | Código da situação na totalização |
| `descricao_situacao_totalizacao_turno` | VARCHAR(50) | Descrição da situação na totalização |
| `sequencial_candidato` | BIGINT | Sequencial único do candidato no TSE |
| `codigo_cargo` | INTEGER | Código do cargo |
| `codigo_eleicao` | INTEGER | Código da eleição |
| `descricao_eleicao` | VARCHAR(255) | Descrição da eleição |
| `data_eleicao` | VARCHAR(20) | Data da eleição |
| `tipo_eleicao` | VARCHAR(50) | Tipo da eleição |
| `numero_turno` | INTEGER | Número do turno |
| `tipo_abrangencia` | VARCHAR(50) | Tipo de abrangência |
| `sigla_uf` | VARCHAR(2) | Sigla da UF |
| `codigo_ue` | INTEGER | Código da unidade eleitoral |
| `nome_ue` | VARCHAR(100) | Nome da unidade eleitoral |
| `data_geracao` | VARCHAR(20) | Data de geração do arquivo |
| `hora_geracao` | VARCHAR(20) | Hora de geração do arquivo |

## ✅ Verificações Pós-Importação

Após a importação, o sistema exibirá:

1. **Resumo da importação:**
   - Número de candidatos atualizados
   - Número de candidatos criados
   - Número de erros

2. **Lista dos candidatos importados:**
   - Nome, número, partido, situação
   - Total de votos (se houver dados de votação)

3. **Estatísticas por partido:**
   - Total de candidatos por partido
   - Candidatos aptos vs inaptos

## 🔍 Consultas Úteis

### Verificar candidatos por partido
```sql
SELECT 
  sigla_partido,
  nome_partido,
  COUNT(*) as total_candidatos,
  COUNT(CASE WHEN descricao_situacao_candidatura = 'APTO' THEN 1 END) as aptos
FROM candidatos c
JOIN eleicoes e ON c.eleicao_id = e.id
WHERE e.ano = 2022
GROUP BY sigla_partido, nome_partido
ORDER BY total_candidatos DESC;
```

### Verificar candidatos por cargo
```sql
SELECT 
  cargo,
  COUNT(*) as total_candidatos,
  COUNT(CASE WHEN descricao_situacao_candidatura = 'APTO' THEN 1 END) as aptos
FROM candidatos c
JOIN eleicoes e ON c.eleicao_id = e.id
WHERE e.ano = 2022
GROUP BY cargo
ORDER BY total_candidatos DESC;
```

### Verificar candidatos por gênero
```sql
SELECT 
  descricao_genero,
  COUNT(*) as total_candidatos
FROM candidatos c
JOIN eleicoes e ON c.eleicao_id = e.id
WHERE e.ano = 2022 AND descricao_genero IS NOT NULL
GROUP BY descricao_genero
ORDER BY total_candidatos DESC;
```

## ⚠️ Observações Importantes

1. **Backup:** Sempre faça backup do banco de dados antes de executar a importação
2. **Duplicatas:** O script verifica candidatos existentes por nome e número
3. **Validação:** Apenas candidatos válidos (com nome e número) são importados
4. **Performance:** A importação pode demorar alguns minutos dependendo do tamanho do arquivo

## 🐛 Solução de Problemas

### Erro: "Coluna não existe"
- Execute primeiro o script `adicionar-colunas-candidatos.js`

### Erro: "Eleição de 2022 não encontrada"
- Verifique se a eleição de 2022 foi criada no banco de dados

### Erro de conexão com banco
- Verifique as configurações em `config/database.js`
- Certifique-se de que o PostgreSQL está rodando

## 📞 Suporte

Se encontrar problemas, verifique:
1. Os logs de erro no console
2. A estrutura da tabela `candidatos`
3. A existência da eleição de 2022
4. As permissões do banco de dados
