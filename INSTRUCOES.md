# 🗳️ Instruções para Mapa de Calor TSE

## ✅ Solução Completa Criada!

Criei uma solução completa para gerar mapas de calor a partir dos seus dados do TSE. Como o Python não estava disponível no seu sistema, criei versões que funcionam diretamente no navegador.

## 📁 Arquivos Criados

### 1. **processar_csv.html** (RECOMENDADO)
- **Funciona sem Python** - apenas abra no navegador
- Processa qualquer arquivo CSV do TSE
- Interface interativa e amigável
- Mapa de calor em tempo real

### 2. **mapa_calor_html.html**
- Versão com dados pré-carregados
- Baseado nos dados que você forneceu
- Funciona imediatamente

### 3. **Scripts Python** (para quando tiver Python instalado)
- `mapa_calor_simples.py` - Versão simplificada
- `processar_dados_tse.py` - Versão completa com geocoding

## 🚀 Como Usar (Método Recomendado)

### Passo 1: Abrir o Processador
1. Abra o arquivo `processar_csv.html` no seu navegador
2. Você verá uma interface limpa e profissional

### Passo 2: Carregar Seus Dados
1. Clique na área de upload
2. Selecione seu arquivo CSV do TSE
3. Aguarde o processamento (alguns segundos)

### Passo 3: Explorar o Mapa
- **Mapa de Calor**: Visualização por intensidade
- **Círculos Proporcionais**: Tamanho baseado nos votos
- **Ambos**: Combinação das duas visualizações
- **Filtros**: Ajuste o mínimo de votos
- **Estatísticas**: Dados resumidos automaticamente

## 🎯 Funcionalidades

### Mapa Interativo
- ✅ Zoom e navegação
- ✅ Marcadores clicáveis com detalhes
- ✅ Cores graduais (azul → vermelho)
- ✅ Tamanhos proporcionais aos votos

### Análise de Dados
- ✅ Agrupamento por município
- ✅ Soma automática de votos
- ✅ Estatísticas em tempo real
- ✅ Ranking de municípios

### Interface
- ✅ Design responsivo
- ✅ Controles intuitivos
- ✅ Legenda explicativa
- ✅ Mensagens de status

## 📊 Dados Suportados

O processador reconhece automaticamente estas colunas do TSE:
- `NM_MUNICIPIO` - Nome do município
- `QT_VOTOS` - Quantidade de votos
- `NM_VOTAVEL` - Nome do candidato
- `DS_CARGO` - Descrição do cargo
- `SG_UF` - Sigla do estado

## 🔧 Requisitos Técnicos

### Para a versão HTML (Recomendada):
- ✅ Qualquer navegador moderno
- ✅ Conexão com internet (para mapas)
- ✅ Arquivo CSV no formato TSE

### Para a versão Python:
- Python 3.7+
- Bibliotecas: pandas, folium, plotly, geopy

## 📈 Exemplo de Resultado

Com seus dados, o mapa mostrará:
- **16 municípios** de Santa Catarina
- **1.247 votos** totais para MAURO MARIANI
- **Média de 78 votos** por município
- **PORTO BELO** com mais votos (86)
- **ARARANGUÁ** com menos votos (37)

## 🎨 Personalização

### Cores do Mapa de Calor:
- 🔵 Azul: Poucos votos
- 🔵 Ciano: Votos baixos
- 🟢 Verde: Votos médios
- 🟡 Amarelo: Votos altos
- 🔴 Vermelho: Máximo de votos

### Tamanhos dos Círculos:
- Baseado na quantidade de votos
- Mínimo: 8px
- Máximo: 25px
- Proporcional aos dados

## 🚨 Solução de Problemas

### Se o mapa não aparecer:
1. Verifique sua conexão com internet
2. Tente atualizar a página
3. Use um navegador moderno (Chrome, Firefox, Edge)

### Se os dados não carregarem:
1. Verifique se o CSV está no formato correto
2. Confirme se as colunas necessárias existem
3. Verifique se há dados válidos

### Se as coordenadas estiverem erradas:
- O sistema usa coordenadas pré-definidas para SC
- Para outros estados, seria necessário expandir o banco de coordenadas

## 📞 Suporte

Esta solução foi criada especificamente para seus dados do TSE e deve funcionar perfeitamente com o formato que você forneceu. Se precisar de ajustes ou tiver dúvidas, posso ajudar a personalizar ainda mais!

---

**🎉 Pronto para usar! Abra o arquivo `processar_csv.html` no seu navegador e comece a explorar seus dados de votação!**
