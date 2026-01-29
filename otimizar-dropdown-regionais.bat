@echo off
echo ========================================
echo   OTIMIZACAO DROPDOWNS - REGIONAIS E ELEICOES
echo ========================================
echo.

echo 1. Aplicando indices para regionais...
node aplicar-indices-regionais.js
echo.

echo 2. Aplicando indices para eleicoes...
node aplicar-indices-eleicoes.js
echo.

echo 3. Testando performance (certifique-se de que o servidor esta rodando)...
echo    Pressione qualquer tecla para continuar ou Ctrl+C para cancelar
pause >nul

echo.
echo Testando dropdown Regional PSDB...
node testar-performance-regionais.js
echo.

echo Testando dropdown Eleicoes...
node testar-performance-eleicoes.js
echo.

echo 4. Otimizacoes concluidas!
echo    - Indices criados para melhorar performance
echo    - Queries otimizadas (removidos JOINs desnecessarios)
echo    - Cache implementado (5-10 minutos)
echo    - Endpoints de detalhes separados para analises
echo.

echo Para testar manualmente:
echo - Acesse: http://localhost:3000
echo - Abra os dropdowns "Regional PSDB" e "Eleicao"
echo - Devem carregar muito mais rapido agora!
echo.

pause
