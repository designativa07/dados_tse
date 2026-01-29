# 🚀 Instruções Rápidas - Sistema TSE

## ✅ Sistema Completo Criado!

Criei um sistema completo de análise eleitoral com banco de dados PostgreSQL, API Node.js e interface web moderna.

## 📋 O que foi criado:

### 🗄️ Banco de Dados
- ✅ Schema completo com todas as tabelas
- ✅ Dados iniciais de estados brasileiros
- ✅ Municípios de SC com coordenadas
- ✅ Índices para performance

### 🔧 Backend (Node.js + Express)
- ✅ API REST completa
- ✅ Upload e processamento de CSV
- ✅ Sistema de relatórios
- ✅ Validação de dados
- ✅ Tratamento de erros

### 🎨 Frontend (HTML + CSS + JavaScript)
- ✅ Interface moderna e responsiva
- ✅ Dashboard com estatísticas
- ✅ Upload de arquivos CSV
- ✅ Tabelas configuráveis
- ✅ Mapas de calor interativos
- ✅ Sistema de relatórios

## 🚀 Como usar:

### 1. Configurar Banco de Dados
```sql
-- No PgAdmin ou psql, execute:
CREATE DATABASE dados_tse;
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na pasta do projeto:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dados_tse
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3000
```

### 3. Inicializar Sistema
```bash
# Instalar dependências (já feito)
npm install

# Inicializar banco de dados
npm run init-db

# Iniciar servidor
npm start
```

### 4. Acessar Sistema
Abra: http://localhost:3000

## 📊 Funcionalidades Principais:

### 1. **Upload de Dados**
- Faça upload do seu CSV do TSE
- Sistema processa automaticamente
- Valida e organiza os dados

### 2. **Tabelas Configuráveis**
- Escolha quais colunas exibir
- Ordene por qualquer campo
- Filtre e pagine os dados

### 3. **Mapas de Calor**
- Visualização geográfica dos votos
- Cores graduais (azul → vermelho)
- Círculos proporcionais
- Marcadores interativos

### 4. **Relatórios**
- Crie relatórios personalizados
- Salve e reutilize
- Exporte para CSV

## 🎯 Próximos Passos:

1. **Configure o banco**: Crie o banco `dados_tse` no PostgreSQL
2. **Configure o .env**: Copie `config.env.example` para `.env`
3. **Inicialize**: Execute `npm run init-db`
4. **Inicie**: Execute `npm start`
5. **Acesse**: http://localhost:3000

## 📁 Arquivos Importantes:

- `server.js` - Servidor principal
- `config/database.js` - Configuração do banco
- `database/schema.sql` - Estrutura do banco
- `public/index.html` - Interface web
- `public/app.js` - JavaScript da aplicação
- `routes/` - APIs do sistema

## 🔧 Comandos Úteis:

```bash
# Iniciar servidor
npm start

# Modo desenvolvimento
npm run dev

# Inicializar banco
npm run init-db

# Verificar status
curl http://localhost:3000/api/health
```

## 🎉 Sistema Pronto!

O sistema está completo e pronto para uso. Ele oferece:

- ✅ **Upload automático** de dados CSV do TSE
- ✅ **Processamento inteligente** dos dados
- ✅ **Visualizações interativas** (tabelas, gráficos, mapas)
- ✅ **Relatórios personalizáveis**
- ✅ **Interface moderna** e responsiva
- ✅ **Performance otimizada** com índices no banco
- ✅ **Segurança** com validação e rate limiting

**Agora é só configurar o banco e começar a usar!** 🚀
