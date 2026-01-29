# 🗳️ Sistema de Análise Eleitoral TSE

Sistema completo para análise de dados eleitorais do TSE com mapa de calor interativo, tabelas configuráveis e relatórios personalizados.

## ✨ Funcionalidades

### 📊 Dashboard
- Estatísticas gerais dos dados
- Gráficos interativos (barras e pizza)
- Visão geral das eleições

### 📤 Upload de Dados
- Upload de arquivos CSV do TSE
- Processamento automático de dados
- Validação e tratamento de erros
- Template CSV para download

### 📋 Tabelas Configuráveis
- Visualização de dados em tabelas
- Seleção de colunas personalizável
- Ordenação e filtros
- Paginação automática
- Exportação para CSV

### 🗺️ Mapas de Calor
- Visualização geográfica dos votos
- Mapa de calor com gradiente de cores
- Círculos proporcionais ao número de votos
- Marcadores interativos com detalhes
- Filtros por eleição e candidato

### 📈 Relatórios
- Criação de relatórios personalizados
- Diferentes tipos de visualização
- Salvamento e reutilização
- Exportação de dados

## 🚀 Instalação

### Pré-requisitos
- Node.js 16+ 
- PostgreSQL 12+
- PgAdmin (opcional, para gerenciamento do banco)

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd mapa-votacoes
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o banco de dados
Crie um banco de dados PostgreSQL chamado `dados_tse`:
```sql
CREATE DATABASE dados_tse;
```

### 4. Configure as variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto:
```env
# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dados_tse
DB_USER=postgres
DB_PASSWORD=postgres

# Configurações do Servidor
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 5. Inicialize o banco de dados
```bash
npm run init-db
```

### 6. Inicie o servidor
```bash
npm start
```

### 7. Acesse a aplicação
Abra seu navegador em: http://localhost:3000

## 📁 Estrutura do Projeto

```
mapa-votacoes/
├── config/
│   └── database.js          # Configuração do banco
├── database/
│   └── schema.sql           # Schema do banco de dados
├── public/
│   ├── index.html           # Interface principal
│   ├── styles.css           # Estilos CSS
│   └── app.js               # JavaScript da aplicação
├── routes/
│   ├── eleicoes.js          # Rotas de eleições
│   ├── municipios.js        # Rotas de municípios
│   ├── votos.js             # Rotas de votos
│   ├── upload.js            # Rotas de upload
│   ├── visualizacao.js      # Rotas de visualização
│   └── relatorios.js        # Rotas de relatórios
├── scripts/
│   └── init-database.js     # Script de inicialização
├── server.js                # Servidor principal
├── package.json             # Dependências e scripts
└── README_SISTEMA.md        # Este arquivo
```

## 🎯 Como Usar

### 1. Upload de Dados
1. Acesse a aba "Upload CSV"
2. Baixe o template CSV clicando em "Baixar Template CSV"
3. Preencha o template com seus dados do TSE
4. Faça upload do arquivo
5. Configure as informações da eleição
6. Clique em "Processar CSV"

### 2. Visualizar Tabelas
1. Acesse a aba "Tabelas"
2. Selecione uma eleição
3. Escolha as colunas desejadas
4. Configure ordenação e limite
5. Clique em "Carregar Tabela"

### 3. Explorar Mapas
1. Acesse a aba "Mapas"
2. Selecione uma eleição
3. Opcionalmente, filtre por candidato
4. Escolha o tipo de visualização
5. Clique em "Carregar Mapa"

### 4. Criar Relatórios
1. Acesse a aba "Relatórios"
2. Clique em "Novo Relatório"
3. Preencha as informações
4. Configure o tipo de visualização
5. Salve o relatório

## 📊 Estrutura do Banco de Dados

### Tabelas Principais
- **eleicoes**: Informações das eleições
- **municipios**: Dados dos municípios com coordenadas
- **candidatos**: Informações dos candidatos
- **votos**: Registros de votação
- **estados**: Estados brasileiros
- **relatorios**: Relatórios salvos
- **configuracoes_visualizacao**: Configurações de visualização

### Relacionamentos
- `votos.eleicao_id` → `eleicoes.id`
- `votos.municipio_id` → `municipios.id`
- `votos.candidato_id` → `candidatos.id`
- `municipios.sigla_uf` → `estados.sigla`

## 🔧 API Endpoints

### Eleições
- `GET /api/eleicoes` - Listar eleições
- `POST /api/eleicoes` - Criar eleição
- `GET /api/eleicoes/:id` - Buscar eleição
- `PUT /api/eleicoes/:id` - Atualizar eleição
- `DELETE /api/eleicoes/:id` - Deletar eleição

### Votos
- `GET /api/votos` - Listar votos
- `GET /api/votos/agregados` - Votos agregados
- `GET /api/votos/mapa` - Dados para mapa
- `POST /api/votos` - Criar voto
- `POST /api/votos/batch` - Inserir múltiplos votos

### Upload
- `POST /api/upload/csv` - Upload de CSV
- `GET /api/upload/template` - Download do template

### Visualização
- `GET /api/visualizacao/tabela` - Dados para tabela
- `GET /api/visualizacao/grafico` - Dados para gráfico
- `GET /api/visualizacao/mapa` - Dados para mapa
- `POST /api/visualizacao/exportar` - Exportar dados

### Relatórios
- `GET /api/relatorios` - Listar relatórios
- `POST /api/relatorios` - Criar relatório
- `GET /api/relatorios/:id/executar` - Executar relatório
- `PUT /api/relatorios/:id` - Atualizar relatório
- `DELETE /api/relatorios/:id` - Deletar relatório

## 🛠️ Scripts Disponíveis

```bash
# Iniciar servidor
npm start

# Modo desenvolvimento (com nodemon)
npm run dev

# Inicializar banco de dados
npm run init-db

# Importar CSV específico
npm run import-csv
```

## 🔍 Solução de Problemas

### Erro de Conexão com Banco
1. Verifique se o PostgreSQL está rodando
2. Confirme as credenciais no arquivo `.env`
3. Teste a conexão: `psql -h localhost -U postgres -d dados_tse`

### Erro de Upload de CSV
1. Verifique se o arquivo está no formato correto
2. Confirme se as colunas obrigatórias estão presentes
3. Verifique o tamanho do arquivo (máximo 50MB)

### Erro de Visualização no Mapa
1. Verifique se os municípios têm coordenadas
2. Confirme se há dados para a eleição selecionada
3. Verifique a conexão com a internet (para carregar mapas)

## 📈 Performance

### Otimizações Implementadas
- Índices no banco de dados para consultas rápidas
- Paginação para grandes volumes de dados
- Cache de consultas frequentes
- Compressão de respostas HTTP
- Rate limiting para proteção

### Limites Recomendados
- Máximo 1000 registros por página em tabelas
- Máximo 50MB por arquivo CSV
- Máximo 100 requisições por minuto por IP

## 🔒 Segurança

### Medidas Implementadas
- Validação de entrada em todas as rotas
- Sanitização de dados SQL
- Rate limiting
- Headers de segurança (Helmet)
- Validação de tipos de arquivo

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a seção de Solução de Problemas
2. Consulte os logs do servidor
3. Abra uma issue no repositório

---

**🎉 Sistema pronto para uso! Aproveite a análise dos seus dados eleitorais!**
