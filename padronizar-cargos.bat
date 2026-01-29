@echo off
chcp 65001 > nul

echo ========================================
echo    PADRONIZAÇÃO DE CARGOS
echo ========================================
echo.

echo [1/3] Verificando cargos atuais...
node verificar-cargos.js
if %errorlevel% neq 0 (
    echo ERRO: Falha ao verificar cargos
    pause
    exit /b 1
)

echo.
echo [2/3] Aplicando padronização...
node padronizar-cargos.js
if %errorlevel% neq 0 (
    echo ERRO: Falha na padronização
    pause
    exit /b 1
)

echo.
echo [3/3] Verificando resultado...
node verificar-padronizacao.js
if %errorlevel% neq 0 (
    echo ERRO: Falha na verificação
    pause
    exit /b 1
)

echo.
echo ========================================
echo    PADRONIZAÇÃO CONCLUIDA COM SUCESSO!
echo ========================================
echo.
echo Os cargos foram padronizados para:
echo - Primeira letra maiúscula
echo - Resto minúsculo
echo - Tratamentos especiais para números ordinais
echo.
pause
