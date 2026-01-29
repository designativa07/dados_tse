@echo off
echo ========================================
echo   TESTE DE VALIDACAO - ELEITORES
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
    echo antes de executar os testes novamente.
    pause
    exit /b 1
)

echo Executando testes de validacao...
echo.

REM Executar os testes
node testar-importacao-eleitores.js

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   TESTES CONCLUIDOS COM SUCESSO!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   ALGUNS TESTES FALHARAM!
    echo ========================================
)

echo.
pause

