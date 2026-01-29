@echo off
echo ========================================
echo    CORRECAO DE DUPLICATAS
echo ========================================
echo.

echo [1/2] Verificando e limpando duplicatas...
node scripts/verificar-duplicatas-candidatos.js
if %errorlevel% neq 0 (
    echo ERRO: Falha ao verificar duplicatas
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
