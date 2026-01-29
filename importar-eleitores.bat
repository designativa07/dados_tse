@echo off
echo ========================================
echo   IMPORTACAO DE DADOS DE ELEITORES
echo ========================================
echo.

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js antes de continuar.
    pause
    exit /b 1
)

REM Verificar se o arquivo de configuração existe
if not exist "config.env" (
    echo AVISO: Arquivo config.env nao encontrado!
    echo Criando arquivo de exemplo...
    copy config.env.example config.env
    echo.
    echo IMPORTANTE: Configure o arquivo config.env com suas credenciais do banco de dados
    echo antes de executar a importacao novamente.
    pause
    exit /b 1
)

REM Verificar se os arquivos CSV existem
if not exist "perfil_eleitor_secao_2018_SC\perfil_eleitor_secao_2018_SC.csv" (
    echo AVISO: Arquivo de dados de 2018 nao encontrado!
    echo Certifique-se de que o arquivo esta na pasta correta.
)

if not exist "perfil_eleitor_secao_2022_SC\perfil_eleitor_secao_2022_SC.csv" (
    echo AVISO: Arquivo de dados de 2022 nao encontrado!
    echo Certifique-se de que o arquivo esta na pasta correta.
)

echo Iniciando importacao dos dados de eleitores...
echo.

REM Executar o script de importacao
node importar-dados-eleitores.js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   IMPORTACAO CONCLUIDA COM SUCESSO!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   ERRO DURANTE A IMPORTACAO!
    echo ========================================
)

echo.
pause

