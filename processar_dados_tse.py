import pandas as pd
import folium
from folium.plugins import HeatMap
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
import numpy as np
from geopy.geocoders import Nominatim
import time

class ProcessadorDadosTSE:
    def __init__(self, arquivo_csv):
        """
        Inicializa o processador com o arquivo CSV do TSE
        """
        self.df = pd.read_csv(arquivo_csv, sep=';', encoding='utf-8')
        self.geocoder = Nominatim(user_agent="mapa_votacoes_tse")
        
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
    
    def obter_coordenadas(self, municipio, uf):
        """
        Obtém coordenadas geográficas do município
        """
        try:
            # Tentar obter coordenadas do município
            localizacao = f"{municipio}, {uf}, Brasil"
            geocode = self.geocoder.geocode(localizacao, timeout=10)
            
            if geocode:
                return geocode.latitude, geocode.longitude
            else:
                print(f"Coordenadas não encontradas para: {municipio}, {uf}")
                return None, None
                
        except Exception as e:
            print(f"Erro ao obter coordenadas para {municipio}, {uf}: {e}")
            return None, None
    
    def criar_mapa_calor_folium(self, dados_processados):
        """
        Cria mapa de calor usando Folium
        """
        print("Criando mapa de calor com Folium...")
        
        # Coordenadas aproximadas de Santa Catarina
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
            uf = row['SG_UF']
            votos = row['QT_VOTOS']
            
            # Obter coordenadas
            lat, lon = self.obter_coordenadas(municipio, uf)
            
            if lat and lon:
                # Adicionar ponto ao mapa de calor
                dados_heatmap.append([lat, lon, votos])
                
                # Adicionar marcador individual
                folium.CircleMarker(
                    location=[lat, lon],
                    radius=max(5, min(20, votos / 100)),  # Tamanho baseado nos votos
                    popup=f"{municipio}<br>Votos: {votos:,}",
                    color='red',
                    fill=True,
                    fillColor='red',
                    fillOpacity=0.6
                ).add_to(mapa)
            
            # Pequena pausa para não sobrecarregar o serviço de geocoding
            time.sleep(0.1)
        
        # Adicionar camada de calor
        if dados_heatmap:
            HeatMap(
                dados_heatmap,
                name='Mapa de Calor',
                min_opacity=0.2,
                max_zoom=18,
                radius=25,
                blur=15,
                gradient={0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red'}
            ).add_to(mapa)
        
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
        
        # Gráfico de barras - Top 20 municípios
        top_20 = dados_processados.head(20)
        
        fig_barras = px.bar(
            top_20,
            x='QT_VOTOS',
            y='NM_MUNICIPIO',
            orientation='h',
            title='Top 20 Municípios por Número de Votos',
            labels={'QT_VOTOS': 'Número de Votos', 'NM_MUNICIPIO': 'Município'},
            color='QT_VOTOS',
            color_continuous_scale='Reds'
        )
        
        fig_barras.update_layout(
            height=600,
            yaxis={'categoryorder': 'total ascending'}
        )
        
        # Gráfico de pizza - Distribuição por faixas de votos
        dados_processados['Faixa_Votos'] = pd.cut(
            dados_processados['QT_VOTOS'],
            bins=[0, 100, 500, 1000, 2000, float('inf')],
            labels=['0-100', '101-500', '501-1000', '1001-2000', '2000+']
        )
        
        faixas = dados_processados['Faixa_Votos'].value_counts()
        
        fig_pizza = px.pie(
            values=faixas.values,
            names=faixas.index,
            title='Distribuição de Municípios por Faixa de Votos'
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
        
        Estatísticas Gerais:
        - Total de municípios: {len(dados_processados):,}
        - Total de votos: {dados_processados['QT_VOTOS'].sum():,}
        - Média de votos por município: {dados_processados['QT_VOTOS'].mean():.1f}
        - Mediana de votos por município: {dados_processados['QT_VOTOS'].median():.1f}
        - Desvio padrão: {dados_processados['QT_VOTOS'].std():.1f}
        
        Top 10 Municípios:
        """
        
        for i, (_, row) in enumerate(dados_processados.head(10).iterrows(), 1):
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
    print("=== PROCESSADOR DE DADOS TSE - MAPA DE CALOR ===\n")
    
    # Nome do arquivo CSV (ajuste conforme necessário)
    arquivo_csv = "dados_tse.csv"
    
    try:
        # Inicializar processador
        processador = ProcessadorDadosTSE(arquivo_csv)
        
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
