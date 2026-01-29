@echo off
echo ========================================
echo    IMPORTACAO COMPLETA DE CANDIDATOS
echo    Arquivo: consulta_cand_2022_SC.csv
echo ========================================
echo.

echo [1/4] Adicionando colunas necessarias ao banco de dados...
node scripts/adicionar-colunas-candidatos.js
if %errorlevel% neq 0 (
    echo ERRO: Falha ao adicionar colunas ao banco de dados
    pause
    exit /b 1
)

echo.
echo [2/4] Corrigindo tipos de dados para valores grandes...
node scripts/corrigir-tipos-dados.js
if %errorlevel% neq 0 (
    echo ERRO: Falha ao corrigir tipos de dados
    pause
    exit /b 1
)

echo.
echo [2.5/4] Corrigindo coluna codigo_ue...
node scripts/corrigir-codigo-ue.js
if %errorlevel% neq 0 (
    echo ERRO: Falha ao corrigir coluna codigo_ue
    pause
    exit /b 1
)

echo.
echo [3/4] Verificando e limpando duplicatas...
node scripts/verificar-duplicatas-candidatos.js
if %errorlevel% neq 0 (
    echo ERRO: Falha ao verificar duplicatas
    pause
    exit /b 1
)

echo.
echo [4/4] Importando dados completos dos candidatos...
node scripts/import-candidatos-completo.js
if %errorlevel% neq 0 (
    echo ERRO: Falha ao importar dados dos candidatos
    pause
    exit /b 1
)

echo.
echo [5/5] Verificando importacao...
echo.
echo ========================================
echo    IMPORTACAO CONCLUIDA COM SUCESSO!
echo ========================================
echo.
echo Os dados dos candidatos foram importados com todas as colunas
echo do arquivo consulta_cand_2022_SC.csv vinculadas corretamente.
echo.
pause
