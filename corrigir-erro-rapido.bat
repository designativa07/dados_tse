@echo off
echo ========================================
echo    CORRECAO RAPIDA DO ERRO
echo ========================================
echo.

echo [1/2] Corrigindo coluna codigo_ue...
node scripts/corrigir-codigo-ue.js
if %errorlevel% neq 0 (
    echo ERRO: Falha ao corrigir coluna codigo_ue
    pause
    exit /b 1
)

echo.
echo [2/2] Testando importacao...
node scripts/import-candidatos-completo.js
if %errorlevel% neq 0 (
    echo ERRO: Falha na importacao
    pause
    exit /b 1
)

echo.
echo ========================================
echo    CORRECAO CONCLUIDA COM SUCESSO!
echo ========================================
echo.
pause
