// Dados mockados das eleições para melhorar performance
// Evita consultas desnecessárias ao banco de dados

const ELEICOES_MOCK = [
    {
        id: 3,
        ano: 2022,
        tipo: "ELEIÇÃO ORDINÁRIA",
        turno: 1,
        descricao: "2022 - ELEIÇÃO ORDINÁRIA (1° Turno)"
    },
    {
        id: 4,
        ano: 2014,
        tipo: "Eleição Ordinária",
        turno: 1,
        descricao: "Eleições Gerais 2014"
    }
];

// Função para obter as eleições mockadas
function getEleicoesMock() {
    return ELEICOES_MOCK;
}

// Função para obter uma eleição específica por ID
function getEleicaoMock(id) {
    return ELEICOES_MOCK.find(eleicao => eleicao.id === parseInt(id));
}

// Função para obter a eleição mais recente (2022)
function getEleicaoAtual() {
    return ELEICOES_MOCK.find(eleicao => eleicao.ano === 2022);
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.EleicoesMock = {
        getEleicoes: getEleicoesMock,
        getEleicao: getEleicaoMock,
        getEleicaoAtual: getEleicaoAtual
    };
}
