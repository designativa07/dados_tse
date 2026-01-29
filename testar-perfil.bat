@echo off
echo ========================================
echo    TESTE DE PERFIL DE CANDIDATO
echo ========================================
echo.

echo [1/1] Testando funcionalidade de perfil...
node testar-perfil-candidato.js
if %errorlevel% neq 0 (
    echo ERRO: Falha no teste de perfil
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
echo 3. Clique no nome de um candidato na tabela
echo.
pause
