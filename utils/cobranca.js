// Regra de cobrança do atendimento (a mesma para a tela de saída e para a calculadora).
// Segue a tabela de preços do site da Brinquedoteca (abrinquedoteca.com):
//
//   - o tempo é contado por MINUTO, sem arredondar (1h40 = 100 minutos);
//   - o valor da hora depende do tempo total da visita (tabela abaixo);
//   - valor = minutos / 60 × valor da hora;
//   - irmãos têm 5% de desconto no valor da hora.
//
// Exemplo do próprio site: 1h40 (menos de 2h, R$ 35/h) = R$ 58,33.

// a faixa vale para a visita inteira: 2h ou mais já paga R$ 32/h, 3h ou mais R$ 31/h, e assim por diante
const FAIXAS = [
  { ate_minutos: 120, valor_hora: 35, nome: "menos de 2 horas" },
  { ate_minutos: 180, valor_hora: 32, nome: "de 2h a menos de 3h" },
  { ate_minutos: 240, valor_hora: 31, nome: "de 3h a menos de 4h" },
  { ate_minutos: 300, valor_hora: 30, nome: "de 4h a menos de 5h" },
  { ate_minutos: Infinity, valor_hora: 28, nome: "5 horas ou mais" },
];
const DESCONTO_IRMAOS = 5; // por cento

// fica numa função para as rotas continuarem iguais (e dar para trocar por dados do banco depois)
async function lerConfiguracao() {
  return {
    faixas: FAIXAS.map((f) => ({ ...f, ate_minutos: f.ate_minutos === Infinity ? null : f.ate_minutos })),
    desconto_irmaos: DESCONTO_IRMAOS,
  };
}

// "14:30" ou "14:30:00" -> minutos desde 00:00 (aceita segundos)
function paraMinutos(hora) {
  const [h, m, s] = String(hora).split(":").map(Number);
  return h * 60 + (m || 0) + (s || 0) / 60;
}

function calcular(minutos, config, { irmaos = false } = {}) {
  const tempo = Math.max(1, minutos);   // cobra no mínimo 1 minuto
  const faixa = FAIXAS.find((f) => tempo < f.ate_minutos);
  const valorHora = irmaos ? faixa.valor_hora * (1 - DESCONTO_IRMAOS / 100) : faixa.valor_hora;
  return {
    minutos: Math.round(tempo),
    valor: Math.round((tempo / 60) * valorHora * 100) / 100,
    valor_hora: Math.round(valorHora * 100) / 100,
    faixa: faixa.nome,
    irmaos: !!irmaos,
  };
}

module.exports = { lerConfiguracao, paraMinutos, calcular };
