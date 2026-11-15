const express = require("express");
const db = require("../db");
const { tratarErro } = require("../utils/erros");
const { lerConfiguracao, paraMinutos, calcular } = require("../utils/cobranca");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const cfg = await lerConfiguracao();

    const [[contagens]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM ATENDIMENTO WHERE hora_saida IS NULL)                              AS em_andamento,
        (SELECT COUNT(*) FROM ATENDIMENTO WHERE data = CURRENT_DATE)                             AS atendimentos_hoje,
        (SELECT COUNT(*) FROM ATENDIMENTO WHERE hora_saida IS NOT NULL AND pago = FALSE)         AS pagamentos_pendentes,
        (SELECT COUNT(*) FROM EVENTO WHERE status = 'ORCAMENTO')                                 AS orcamentos,
        (SELECT COUNT(*) FROM EVENTO WHERE status = 'CONFIRMADO' AND data >= CURRENT_DATE)       AS eventos_confirmados`);

    // valores: calculados pelo tempo de cada atendimento encerrado
    const [encerrados] = await db.query(`
      SELECT pago, data = CURRENT_DATE AS hoje,
             TIME_TO_SEC(TIMEDIFF(hora_saida, hora_entrada)) / 60 AS minutos
        FROM ATENDIMENTO WHERE hora_saida IS NOT NULL`);
    let recebido = 0;
    let aReceber = 0;
    encerrados.forEach((a) => {
      const valor = calcular(Number(a.minutos), cfg).valor;
      if (!a.pago) aReceber += valor;
      else if (a.hoje) recebido += valor;
    });

    const [proximos] = await db.query(`
      SELECT e.cod_evento, e.data, e.horario, e.qtd_convidados, e.status, b.tema,
             CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS responsavel_nome
        FROM EVENTO e
        JOIN RESPONSAVEL r ON r.cod_responsavel = e.cod_responsavel
        JOIN PESSOA p ON p.cpf = r.cpf
        LEFT JOIN FICHA_BRIEFING b ON b.cod_evento = e.cod_evento
       WHERE e.status <> 'CANCELADO' AND e.data >= CURRENT_DATE
       ORDER BY e.data, e.horario LIMIT 4`);

    const [dentro] = await db.query(`
      SELECT a.cod_atendimento, a.hora_entrada, c.nome AS crianca_nome,
             TIMESTAMPDIFF(MINUTE, TIMESTAMP(a.data, a.hora_entrada), NOW()) AS minutos_dentro
        FROM ATENDIMENTO a
        JOIN CRIANCA c ON c.cod_responsavel = a.cod_responsavel AND c.num_sequencial = a.num_sequencial
       WHERE a.hora_saida IS NULL ORDER BY a.hora_entrada LIMIT 6`);

    res.json({
      ...contagens,
      recebido_hoje: Math.round(recebido * 100) / 100,
      a_receber: Math.round(aReceber * 100) / 100,
      proximos_eventos: proximos,
      na_brinquedoteca: dentro.map((d) => ({
        cod_atendimento: d.cod_atendimento,
        crianca_nome: d.crianca_nome,
        hora_entrada: d.hora_entrada,
        previa: calcular(Number(d.minutos_dentro), cfg),
      })),
    });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

module.exports = router;
