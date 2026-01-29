@echo off
echo ========================================
echo    TESTE DA ABA CANDIDATOS
echo ========================================
echo.

echo [1/1] Testando funcionalidade da aba candidatos...
node testar-aba-candidatos.js
if %errorlevel% neq 0 (
    echo ERRO: Falha no teste da aba candidatos
    pause
    exit /b 1
)

echo.
echo ========================================
echo    TESTE CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Para testar a funcionalidade completa:
echo 1. Execute: npm start
echo 2. Acesse: http://localhost:3000
echo 3. Clique na aba "Candidatos"
echo 4. Configure os filtros e busque candidatos
echo.
pause
