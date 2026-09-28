const bairros = {

  ibura: {
    cidade: "Recife",
    latitude: -8.1067,
    longitude: -34.9295
  }

};

const pontosRisco = [
  {
    nome: "Ibura",
    cidade: "Recife",
    latitude: -8.1067,
    longitude: -34.9295,
    nivel: "Alto",
    descricao: "Área com histórico de alagamentos."
  },
  {
    nome: "Imbiribeira",
    cidade: "Recife",
    latitude: -8.1147,
    longitude: -34.9072,
    nivel: "Médio",
    descricao: "Ponto de atenção em períodos de chuva intensa."
  },
  {
    nome: "Areias",
    cidade: "Recife",
    latitude: -8.1169,
    longitude: -34.9236,
    nivel: "Alto",
    descricao: "Área de atenção para alagamentos."
  }
];

module.exports = {
  bairros,
  pontosRisco
};