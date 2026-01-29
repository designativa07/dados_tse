@echo off
echo ========================================
echo   IMPORTACAO PERFIL ELEITOR OTIMIZADA
echo ========================================
echo.

echo Verificando arquivos...
if not exist "perfil_eleitor_secao_2018_SC\perfil_eleitor_secao_2018_SC.csv" (
    echo ERRO: Arquivo de 2018 nao encontrado!
    echo Caminho esperado: perfil_eleitor_secao_2018_SC\perfil_eleitor_secao_2018_SC.csv
    pause
    exit /b 1
)

if not exist "perfil_eleitor_secao_2022_SC\perfil_eleitor_secao_2022_SC.csv" (
    echo ERRO: Arquivo de 2022 nao encontrado!
    echo Caminho esperado: perfil_eleitor_secao_2022_SC\perfil_eleitor_secao_2022_SC.csv
    pause
    exit /b 1
)

echo Arquivos encontrados!
echo.

echo Configuracoes otimizadas:
echo - Batch size: 200 registros
echo - Timeout: 5 minutos
echo - Retry: 5 tentativas
echo - Pausa entre batches: 100ms
echo.

echo Iniciando importacao otimizada...
node importar-perfil-eleitor-otimizado.js

echo.
echo Importacao concluida!
echo.

echo Deseja testar a importacao? (S/N)
set /p resposta=
if /i "%resposta%"=="S" (
    echo Executando teste...
    node testar-importacao-perfil.js
)

echo.
echo Pressione qualquer tecla para sair...
pause >nul
