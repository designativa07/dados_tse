@echo off
echo ========================================
echo   Sistema de Analise Eleitoral TSE
echo ========================================
echo.

echo [1/5] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias
    pause
    exit /b 1
)

echo.
echo [2/5] Criando arquivo de configuracao...
if not exist .env (
    copy config.env.example .env
    echo Arquivo .env criado. Configure as credenciais do banco de dados.
) else (
    echo Arquivo .env ja existe.
)

echo.
echo [3/5] Verificando conexao com banco de dados...
echo Certifique-se de que o PostgreSQL esta rodando e o banco 'dados_tse' existe.

echo.
echo [4/5] Inicializando banco de dados...
call npm run init-db
if %errorlevel% neq 0 (
    echo ERRO: Falha ao inicializar banco de dados
    echo Verifique se o PostgreSQL esta rodando e as credenciais estao corretas
    pause
    exit /b 1
)

echo.
echo [5/5] Instalacao concluida!
echo.
echo Para iniciar o servidor, execute:
echo   npm start
echo.
echo Acesse: http://localhost:3000
echo.
pause
