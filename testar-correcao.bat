@echo off
echo ========================================
echo    TESTE RAPIDO DA CORRECAO
echo ========================================
echo.

echo [1/2] Corrigindo tipos de dados...
node scripts/corrigir-tipos-dados.js
if %errorlevel% neq 0 (
    echo ERRO: Falha ao corrigir tipos de dados
    pause
    exit /b 1
)

echo.
echo [2/2] Testando importacao com alguns candidatos...
node scripts/import-candidatos-completo.js
if %errorlevel% neq 0 (
    echo ERRO: Falha na importacao de teste
    pause
    exit /b 1
)

echo.
echo ========================================
echo    TESTE CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Agora voce pode executar a importacao completa com:
echo importar-candidatos-completo.bat
echo.
pause
