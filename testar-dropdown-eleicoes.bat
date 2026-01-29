@echo off
echo ========================================
echo    TESTE DO DROPDOWN DE ELEICOES
echo ========================================
echo.

echo [1/1] Testando dropdown de eleições na aba candidatos...
node testar-dropdown-eleicoes.js
if %errorlevel% neq 0 (
    echo ERRO: Falha no teste do dropdown
    pause
    exit /b 1
)

echo.
echo ========================================
echo    TESTE CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Para testar a funcionalidade:
echo 1. Execute: npm start
echo 2. Acesse: http://localhost:3000
echo 3. Clique na aba "Candidatos"
echo 4. Verifique se o dropdown "Eleição" está populado
echo.
pause
