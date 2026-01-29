// Sistema de cache para melhorar performance
class CacheManager {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutos
    }

    // Armazenar dados no cache
    set(key, data, ttl = this.defaultTTL) {
        const item = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        };
        this.cache.set(key, item);
    }

    // Recuperar dados do cache
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            return null;
        }

        // Verificar se expirou
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    // Verificar se existe no cache
    has(key) {
        const item = this.cache.get(key);
        if (!item) return false;
        
        // Verificar se expirou
        if (Date.now() - item.timestamp > item.ttl) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    // Limpar cache
    clear() {
        this.cache.clear();
    }

    // Remover item específico
    delete(key) {
        this.cache.delete(key);
    }

    // Obter estatísticas do cache
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Instância global do cache
window.AppCache = new CacheManager();

// Funções utilitárias para cache
window.CacheUtils = {
    // Cache para estatísticas
    getEstatisticas: (eleicaoId) => {
        return window.AppCache.get(`estatisticas_${eleicaoId}`);
    },
    
    setEstatisticas: (eleicaoId, data) => {
        window.AppCache.set(`estatisticas_${eleicaoId}`, data, 10 * 60 * 1000); // 10 minutos
    },
    
    // Cache para candidatos
    getCandidatos: (filtros) => {
        const key = `candidatos_${JSON.stringify(filtros)}`;
        return window.AppCache.get(key);
    },
    
    setCandidatos: (filtros, data) => {
        const key = `candidatos_${JSON.stringify(filtros)}`;
        window.AppCache.set(key, data, 5 * 60 * 1000); // 5 minutos
    },
    
    // Cache para votos
    getVotos: (filtros) => {
        const key = `votos_${JSON.stringify(filtros)}`;
        return window.AppCache.get(key);
    },
    
    setVotos: (filtros, data) => {
        const key = `votos_${JSON.stringify(filtros)}`;
        window.AppCache.set(key, data, 5 * 60 * 1000); // 5 minutos
    },
    
    // Limpar cache relacionado a uma eleição
    clearEleicao: (eleicaoId) => {
        const keys = Array.from(window.AppCache.cache.keys());
        keys.forEach(key => {
            if (key.includes(`_${eleicaoId}`) || key.includes(`estatisticas_`) || key.includes(`candidatos_`) || key.includes(`votos_`)) {
                window.AppCache.delete(key);
            }
        });
    }
};
