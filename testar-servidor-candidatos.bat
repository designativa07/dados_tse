@echo off
echo ========================================
echo    TESTE DO SERVIDOR E ROTAS DE CANDIDATOS
echo ========================================
echo.

echo [1/1] Testando servidor e rotas de candidatos...
node testar-servidor-candidatos.js
if %errorlevel% neq 0 (
    echo ERRO: Falha no teste do servidor
    pause
    exit /b 1
)

echo.
echo ========================================
echo    TESTE CONCLUIDO!
echo ========================================
echo.
pause
