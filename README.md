# Mapa de Calor - Dados TSE

Este projeto cria mapas de calor interativos a partir de dados de votação fornecidos pelo TSE (Tribunal Superior Eleitoral).

## Funcionalidades

- **Mapa de Calor Interativo**: Visualização geográfica dos votos por município
- **Gráficos Estatísticos**: Análise de distribuição de votos
- **Relatório Detalhado**: Estatísticas completas dos dados
- **Interface Web**: Visualização em navegador

## Instalação

1. Instale as dependências Python:
```bash
pip install -r requirements.txt
```

## Uso

### Opção 1: Script Simples (Recomendado)
```bash
python mapa_calor_simples.py
```

### Opção 2: Script Completo (com geocoding)
```bash
python processar_dados_tse.py
```

## Arquivos Gerados

Após a execução, os seguintes arquivos serão criados:

- `mapa_calor_votacoes.html` - Mapa interativo com calor
- `grafico_barras_votacoes.html` - Gráfico de barras dos municípios
- `grafico_pizza_votacoes.html` - Gráfico de pizza por faixas de votos
- `relatorio_votacoes.txt` - Relatório estatístico completo

## Estrutura dos Dados

O arquivo CSV deve conter as seguintes colunas (formato TSE):
- `NM_MUNICIPIO`: Nome do município
- `SG_UF`: Sigla do estado
- `QT_VOTOS`: Quantidade de votos
- `NM_VOTAVEL`: Nome do candidato
- `DS_CARGO`: Descrição do cargo

## Exemplo de Uso

1. Coloque seu arquivo CSV na pasta do projeto
2. Execute o script Python
3. Abra o arquivo `mapa_calor_votacoes.html` no navegador
4. Explore os gráficos e relatórios gerados

## Características do Mapa

- **Cores**: Gradiente de azul (baixo) para vermelho (alto)
- **Tamanho dos Círculos**: Proporcional ao número de votos
- **Interatividade**: Clique nos marcadores para ver detalhes
- **Camadas**: Mapa de calor + marcadores individuais

## Dependências

- pandas: Manipulação de dados
- folium: Criação de mapas interativos
- plotly: Gráficos interativos
- geopy: Geocoding (apenas no script completo)

## Suporte

Para dúvidas ou problemas, verifique:
1. Se o arquivo CSV está no formato correto
2. Se todas as dependências foram instaladas
3. Se o arquivo CSV contém dados válidos
