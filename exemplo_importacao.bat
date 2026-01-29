@echo off
echo ========================================
echo   IMPORTACAO DE ARQUIVO CSV GRANDE
echo ========================================
echo.

echo [1/3] Verificando se o arquivo existe...
if not exist "votacao_secao_2018_sc.csv" (
    echo ERRO: Arquivo votacao_secao_2018_sc.csv nao encontrado!
    echo.
    echo Coloque o arquivo CSV na pasta do projeto e tente novamente.
    pause
    exit /b 1
)

echo ✅ Arquivo encontrado!
echo.

echo [2/3] Iniciando importacao...
echo ⚠️  IMPORTANTE: Esta operacao pode demorar varios minutos!
echo ⚠️  Nao feche esta janela durante a importacao.
echo.

echo Executando comando:
echo npm run import-large-csv votacao_secao_2018_sc.csv 2018 "Eleicao Ordinaria" "Eleicoes Gerais 2018"
echo.

npm run import-large-csv votacao_secao_2018_sc.csv 2018 "Eleicao Ordinaria" "Eleicoes Gerais 2018"

echo.
echo [3/3] Importacao concluida!
echo.
echo Para verificar os dados, acesse: http://localhost:3000
echo.
pause
