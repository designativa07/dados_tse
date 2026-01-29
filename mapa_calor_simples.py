import pandas as pd
import folium
from folium.plugins import HeatMap
import plotly.express as px
import plotly.graph_objects as go
import json

class MapaCalorTSE:
    def __init__(self, arquivo_csv):
        """
        Inicializa o processador com o arquivo CSV do TSE
        """
        self.df = pd.read_csv(arquivo_csv, sep=';', encoding='utf-8')
        
        # Coordenadas aproximadas dos municípios de SC (lat, lon)
        self.coordenadas_sc = {
            'CRICIÚMA': [-28.6775, -49.3697],
            'SÃO JOSÉ': [-27.6136, -48.6366],
            'FLORIANÓPOLIS': [-27.5954, -48.5480],
            'LAGES': [-27.8161, -50.3259],
            'SÃO JOAQUIM': [-28.2939, -49.9317],
            'VIDEIRA': [-27.0089, -51.1517],
            'SÃO DOMINGOS': [-26.5581, -52.5317],
            'INDAIAL': [-26.8989, -49.2317],
            'SIDERÓPOLIS': [-28.5981, -49.4267],
            'BALNEÁRIO CAMBORIÚ': [-26.9906, -48.6342],
            'FRAIBURGO': [-27.0256, -50.8075],
            'PORTO BELO': [-27.1567, -48.5450],
            'OURO VERDE': [-26.6917, -52.3100],
            'SCHROEDER': [-26.4117, -49.0733],
            'ARARANGUÁ': [-28.9356, -49.4958]
        }
        
    def processar_dados(self):
        """
        Processa os dados do CSV e prepara para visualização
        """
        print("Processando dados do TSE...")
        
        # Limpar e preparar dados
        self.df['QT_VOTOS'] = pd.to_numeric(self.df['QT_VOTOS'], errors='coerce')
        self.df['NM_MUNICIPIO'] = self.df['NM_MUNICIPIO'].str.upper().str.strip()
        
        # Agrupar votos por município
        votos_por_municipio = self.df.groupby(['NM_MUNICIPIO', 'SG_UF']).agg({
            'QT_VOTOS': 'sum',
            'CD_MUNICIPIO': 'first',
            'NM_UE': 'first'
        }).reset_index()
        
        # Ordenar por quantidade de votos
        votos_por_municipio = votos_por_municipio.sort_values('QT_VOTOS', ascending=False)
        
        print(f"Total de municípios: {len(votos_por_municipio)}")
        print(f"Total de votos processados: {votos_por_municipio['QT_VOTOS'].sum():,}")
        
        return votos_por_municipio
    
    def criar_mapa_calor_folium(self, dados_processados):
        """
        Cria mapa de calor usando Folium
        """
        print("Criando mapa de calor com Folium...")
        
        # Coordenadas do centro de Santa Catarina
        centro_sc = [-27.2423, -50.2189]
        
        # Criar mapa base
        mapa = folium.Map(
            location=centro_sc,
            zoom_start=7,
            tiles='OpenStreetMap'
        )
        
        # Preparar dados para o mapa de calor
        dados_heatmap = []
        
        for _, row in dados_processados.iterrows():
            municipio = row['NM_MUNICIPIO']
            votos = row['QT_VOTOS']
            
            # Obter coordenadas do dicionário
            if municipio in self.coordenadas_sc:
                lat, lon = self.coordenadas_sc[municipio]
                
                # Adicionar ponto ao mapa de calor
                dados_heatmap.append([lat, lon, votos])
                
                # Adicionar marcador individual
                folium.CircleMarker(
                    location=[lat, lon],
                    radius=max(8, min(25, votos / 50)),  # Tamanho baseado nos votos
                    popup=f"""
                    <b>{municipio}</b><br>
                    Votos: {votos:,}<br>
                    Candidato: MAURO MARIANI
                    """,
                    color='red',
                    fill=True,
                    fillColor='red',
                    fillOpacity=0.7
                ).add_to(mapa)
            else:
                print(f"Coordenadas não encontradas para: {municipio}")
        
        # Adicionar camada de calor
        if dados_heatmap:
            HeatMap(
                dados_heatmap,
                name='Mapa de Calor',
                min_opacity=0.3,
                max_zoom=18,
                radius=30,
                blur=20,
                gradient={0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
            ).add_to(mapa)
        
        # Adicionar título
        title_html = '''
        <h3 align="center" style="font-size:20px"><b>Mapa de Calor - Votos para Governador (SC) 2018</b></h3>
        <p align="center">Candidato: MAURO MARIANI</p>
        '''
        mapa.get_root().html.add_child(folium.Element(title_html))
        
        # Adicionar controle de camadas
        folium.LayerControl().add_to(mapa)
        
        # Salvar mapa
        mapa.save('mapa_calor_votacoes.html')
        print("Mapa salvo como 'mapa_calor_votacoes.html'")
        
        return mapa
    
    def criar_graficos_plotly(self, dados_processados):
        """
        Cria gráficos interativos usando Plotly
        """
        print("Criando gráficos interativos...")
        
        # Gráfico de barras - Top municípios
        fig_barras = px.bar(
            dados_processados,
            x='QT_VOTOS',
            y='NM_MUNICIPIO',
            orientation='h',
            title='Votos por Município - MAURO MARIANI (Governador SC 2018)',
            labels={'QT_VOTOS': 'Número de Votos', 'NM_MUNICIPIO': 'Município'},
            color='QT_VOTOS',
            color_continuous_scale='Reds'
        )
        
        fig_barras.update_layout(
            height=500,
            yaxis={'categoryorder': 'total ascending'},
            showlegend=False
        )
        
        # Gráfico de pizza - Distribuição por faixas de votos
        dados_processados['Faixa_Votos'] = pd.cut(
            dados_processados['QT_VOTOS'],
            bins=[0, 50, 100, 200, float('inf')],
            labels=['0-50', '51-100', '101-200', '200+']
        )
        
        faixas = dados_processados['Faixa_Votos'].value_counts()
        
        fig_pizza = px.pie(
            values=faixas.values,
            names=faixas.index,
            title='Distribuição de Municípios por Faixa de Votos',
            color_discrete_sequence=px.colors.qualitative.Set3
        )
        
        # Salvar gráficos
        fig_barras.write_html('grafico_barras_votacoes.html')
        fig_pizza.write_html('grafico_pizza_votacoes.html')
        
        print("Gráficos salvos como HTML")
        
        return fig_barras, fig_pizza
    
    def gerar_relatorio(self, dados_processados):
        """
        Gera relatório estatístico dos dados
        """
        print("Gerando relatório estatístico...")
        
        relatorio = f"""
        RELATÓRIO DE ANÁLISE DOS DADOS DE VOTAÇÃO - TSE
        ================================================
        Eleição: Governador de Santa Catarina 2018
        Candidato: MAURO MARIANI
        
        Estatísticas Gerais:
        - Total de municípios: {len(dados_processados):,}
        - Total de votos: {dados_processados['QT_VOTOS'].sum():,}
        - Média de votos por município: {dados_processados['QT_VOTOS'].mean():.1f}
        - Mediana de votos por município: {dados_processados['QT_VOTOS'].median():.1f}
        - Desvio padrão: {dados_processados['QT_VOTOS'].std():.1f}
        - Município com mais votos: {dados_processados.iloc[0]['NM_MUNICIPIO']} ({dados_processados.iloc[0]['QT_VOTOS']:,} votos)
        - Município com menos votos: {dados_processados.iloc[-1]['NM_MUNICIPIO']} ({dados_processados.iloc[-1]['QT_VOTOS']:,} votos)
        
        Ranking de Municípios:
        """
        
        for i, (_, row) in enumerate(dados_processados.iterrows(), 1):
            relatorio += f"{i:2d}. {row['NM_MUNICIPIO']:<25} - {row['QT_VOTOS']:>6,} votos\n"
        
        relatorio += f"""
        
        Distribuição por Faixas de Votos:
        """
        
        faixas = dados_processados['Faixa_Votos'].value_counts().sort_index()
        for faixa, count in faixas.items():
            relatorio += f"- {faixa}: {count} municípios\n"
        
        # Salvar relatório
        with open('relatorio_votacoes.txt', 'w', encoding='utf-8') as f:
            f.write(relatorio)
        
        print("Relatório salvo como 'relatorio_votacoes.txt'")
        print(relatorio)

def main():
    """
    Função principal para executar o processamento
    """
    print("=== MAPA DE CALOR - DADOS TSE ===\n")
    
    # Nome do arquivo CSV
    arquivo_csv = "dados_tse.csv"
    
    try:
        # Inicializar processador
        processador = MapaCalorTSE(arquivo_csv)
        
        # Processar dados
        dados_processados = processador.processar_dados()
        
        # Criar visualizações
        print("\n1. Criando mapa de calor...")
        mapa = processador.criar_mapa_calor_folium(dados_processados)
        
        print("\n2. Criando gráficos interativos...")
        fig_barras, fig_pizza = processador.criar_graficos_plotly(dados_processados)
        
        print("\n3. Gerando relatório...")
        processador.gerar_relatorio(dados_processados)
        
        print("\n=== PROCESSAMENTO CONCLUÍDO ===")
        print("Arquivos gerados:")
        print("- mapa_calor_votacoes.html (mapa interativo)")
        print("- grafico_barras_votacoes.html (gráfico de barras)")
        print("- grafico_pizza_votacoes.html (gráfico de pizza)")
        print("- relatorio_votacoes.txt (relatório estatístico)")
        
    except FileNotFoundError:
        print(f"Erro: Arquivo '{arquivo_csv}' não encontrado!")
        print("Certifique-se de que o arquivo CSV está no mesmo diretório do script.")
    except Exception as e:
        print(f"Erro durante o processamento: {e}")

if __name__ == "__main__":
    main()
