@echo off
echo ========================================
echo    TESTE DE DADOS DE PARTIDOS
echo ========================================
echo.

echo [1/1] Testando dados de partidos...
node testar-partidos.js
if %errorlevel% neq 0 (
    echo ERRO: Falha no teste de partidos
    pause
    exit /b 1
)

echo.
echo ========================================
echo    TESTE CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Se os dados de partido estao vazios, execute:
echo importar-candidatos-completo.bat
echo.
pause
