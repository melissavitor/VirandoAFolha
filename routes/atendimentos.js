const express = require("express");
const db = require("../db");
const transacao = require("../utils/transacao");
const { erroHttp, tratarErro } = require("../utils/erros");
const { lerConfiguracao, paraMinutos, calcular } = require("../utils/cobranca");

const router = express.Router();

// SELECT base: atendimento + criança + responsável + recepcionista + monitores
const SELECT_ATENDIMENTO = `
  SELECT a.cod_atendimento, a.data, a.hora_entrada, a.hora_saida, a.pago,
         a.cod_responsavel, a.num_sequencial, a.cod_recepcionista,
         c.nome AS crianca_nome, c.data_nascimento AS crianca_nascimento, c.observacoes AS crianca_observacoes,
         CONCAT(pr.primeiro_nome, ' ', pr.sobrenome) AS responsavel_nome,
         (SELECT GROUP_CONCAT(t.telefone ORDER BY t.telefone SEPARATOR ',')
            FROM TELEFONE_PESSOA t WHERE t.cpf = pr.cpf) AS responsavel_telefones,
         CONCAT(pc.primeiro_nome, ' ', pc.sobrenome) AS recepcionista_nome,
         (SELECT GROUP_CONCAT(pm.primeiro_nome ORDER BY pm.primeiro_nome SEPARATOR ', ')
            FROM ACOMPANHA ac
            JOIN MONITOR mo ON mo.cod_monitor = ac.cod_monitor
            JOIN FUNCIONARIO fm ON fm.cod_funcionario = mo.cod_funcionario
            JOIN PESSOA pm ON pm.cpf = fm.cpf
           WHERE ac.cod_atendimento = a.cod_atendimento) AS monitores,
         TIMESTAMPDIFF(MINUTE, TIMESTAMP(a.data, a.hora_entrada), NOW()) AS minutos_dentro,
         TIME_TO_SEC(TIMEDIFF(a.hora_saida, a.hora_entrada)) / 60 AS minutos_total
    FROM ATENDIMENTO a
    JOIN CRIANCA c ON c.cod_responsavel = a.cod_responsavel AND c.num_sequencial = a.num_sequencial
    JOIN RESPONSAVEL r ON r.cod_responsavel = a.cod_responsavel
    JOIN PESSOA pr ON pr.cpf = r.cpf
    JOIN RECEPCIONISTA rc ON rc.cod_recepcionista = a.cod_recepcionista
    JOIN FUNCIONARIO fc ON fc.cod_funcionario = rc.cod_funcionario
    JOIN PESSOA pc ON pc.cpf = fc.cpf`;

// Acrescenta "previa" (quanto custa se sair agora) nos atendimentos em andamento
function formatar(linha, cfg) {
  const { minutos_dentro, minutos_total, responsavel_telefones, ...resto } = linha;
  const saida = {
    ...resto,
    pago: !!linha.pago,
    em_andamento: linha.hora_saida === null,
    responsavel_telefones: responsavel_telefones ? responsavel_telefones.split(",") : [],
    monitores: linha.monitores || "",
  };
  if (saida.em_andamento) {
    saida.previa = calcular(Number(minutos_dentro), cfg);
  } else {
    // o valor não fica gravado: é calculado pelo tempo (e pelo preço atual)
    saida.valor_cobrado = calcular(Number(minutos_total), cfg).valor;
  }
  return saida;
}

// calculadora (não grava nada)
// POST /atendimentos/calcular   { "entrada": "14:00", "saida": "16:10", "irmaos": false }
router.post("/calcular", async (req, res) => {
  try {
    const { entrada, saida } = req.body;
    const formato = /^\d{1,2}:\d{2}(:\d{2})?$/;
    if (!formato.test(entrada || "") || !formato.test(saida || "")) {
      throw erroHttp(400, "Informe os horários de entrada e de saída.");
    }
    const minutos = paraMinutos(saida) - paraMinutos(entrada);
    if (minutos <= 0) throw erroHttp(400, "A saída precisa ser depois da entrada.");
    res.json(calcular(minutos, await lerConfiguracao(), { irmaos: req.body.irmaos === true }));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// listar
// /atendimentos?situacao=andamento | hoje | pendentes | todos   (padrão: hoje)
router.get("/", async (req, res) => {
  try {
    const filtros = {
      andamento: "WHERE a.hora_saida IS NULL",
      hoje: "WHERE a.data = CURRENT_DATE OR a.hora_saida IS NULL",
      pendentes: "WHERE a.hora_saida IS NOT NULL AND a.pago = FALSE",
      todos: "",
    };
    const filtro = filtros[req.query.situacao] ?? filtros.hoje;
    const cfg = await lerConfiguracao();
    const [linhas] = await db.query(
      `${SELECT_ATENDIMENTO} ${filtro} ORDER BY (a.hora_saida IS NULL) DESC, a.data DESC, a.hora_entrada DESC LIMIT 300`
    );
    res.json(linhas.map((l) => formatar(l, cfg)));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [linhas] = await db.query(`${SELECT_ATENDIMENTO} WHERE a.cod_atendimento = ?`, [req.params.id]);
    if (linhas.length === 0) return res.status(404).json({ mensagem: "Atendimento não encontrado." });
    res.json(formatar(linhas[0], await lerConfiguracao()));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// registrar entrada
router.post("/", async (req, res) => {
  try {
    const cod = Number(req.body.cod_responsavel);
    const num = Number(req.body.num_sequencial);
    if (!cod || !num) throw erroHttp(400, "Escolha a criança que está chegando.");

    const monitores = [...new Set((req.body.monitores || []).map(Number).filter(Boolean))];
    if (monitores.length === 0) throw erroHttp(400, "Escolha pelo menos um monitor para acompanhar.");

    // quem recebeu: o próprio usuário (se for recepcionista) ou o escolhido na tela
    const recepcionista = Number(req.body.cod_recepcionista) || req.usuario.cod_recepcionista;
    if (!recepcionista) throw erroHttp(400, "Escolha a recepcionista responsável pela entrada.");

    const codigo = await transacao(async (conn) => {
      const [crianca] = await conn.query(
        "SELECT 1 FROM CRIANCA WHERE cod_responsavel = ? AND num_sequencial = ?",
        [cod, num]
      );
      if (crianca.length === 0) throw erroHttp(404, "Criança não encontrada.");

      const [aberto] = await conn.query(
        "SELECT 1 FROM ATENDIMENTO WHERE cod_responsavel = ? AND num_sequencial = ? AND hora_saida IS NULL",
        [cod, num]
      );
      if (aberto.length > 0) throw erroHttp(400, "Esta criança já está na brinquedoteca. Registre a saída antes de uma nova entrada.");

      const [r] = await conn.query(
        `INSERT INTO ATENDIMENTO (data, hora_entrada, cod_responsavel, num_sequencial, cod_recepcionista)
         VALUES (CURRENT_DATE, CURTIME(), ?, ?, ?)`,
        [cod, num, recepcionista]
      );
      for (const m of monitores) {
        await conn.query("INSERT INTO ACOMPANHA (cod_atendimento, cod_monitor) VALUES (?, ?)", [r.insertId, m]);
      }
      return r.insertId;
    });

    res.status(201).json({ mensagem: "Entrada registrada!", cod_atendimento: codigo });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// registrar saída (calcula e grava o valor)
// corpo opcional: { "hora_saida": "16:30" }  -> para corrigir quando esqueceram de registrar na hora
router.post("/:id/saida", async (req, res) => {
  try {
    const cfg = await lerConfiguracao();
    const resultado = await transacao(async (conn) => {
      const [[a]] = await conn.query(
        "SELECT hora_entrada, hora_saida, TIME_FORMAT(CURTIME(), '%H:%i:%s') AS agora FROM ATENDIMENTO WHERE cod_atendimento = ? FOR UPDATE",
        [req.params.id]
      );
      if (!a) throw erroHttp(404, "Atendimento não encontrado.");
      if (a.hora_saida !== null) throw erroHttp(400, "A saída deste atendimento já foi registrada.");

      let saida = a.agora;
      if (req.body.hora_saida) {
        if (!/^\d{2}:\d{2}$/.test(req.body.hora_saida)) throw erroHttp(400, "Horário de saída inválido.");
        saida = req.body.hora_saida + ":00";
      }
      const minutos = paraMinutos(saida) - paraMinutos(a.hora_entrada);
      if (minutos <= 0) throw erroHttp(400, "A saída precisa ser depois da entrada (" + a.hora_entrada.slice(0, 5) + ").");

      const conta = calcular(minutos, cfg);
      await conn.query(
        "UPDATE ATENDIMENTO SET hora_saida = ? WHERE cod_atendimento = ?",
        [saida, req.params.id]
      );
      return { ...conta, hora_saida: saida };
    });

    res.json({ mensagem: "Saída registrada!", ...resultado });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// confirmar pagamento
router.post("/:id/pagamento", async (req, res) => {
  try {
    const [[a]] = await db.query("SELECT hora_saida, pago FROM ATENDIMENTO WHERE cod_atendimento = ?", [req.params.id]);
    if (!a) throw erroHttp(404, "Atendimento não encontrado.");
    if (a.hora_saida === null) throw erroHttp(400, "Registre a saída antes de confirmar o pagamento.");
    if (a.pago) throw erroHttp(400, "O pagamento já foi confirmado.");
    await db.query("UPDATE ATENDIMENTO SET pago = TRUE WHERE cod_atendimento = ?", [req.params.id]);
    res.json({ mensagem: "Pagamento confirmado!" });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// cancelar entrada registrada por engano (só enquanto em andamento)
router.delete("/:id", async (req, res) => {
  try {
    const [[a]] = await db.query("SELECT hora_saida FROM ATENDIMENTO WHERE cod_atendimento = ?", [req.params.id]);
    if (!a) throw erroHttp(404, "Atendimento não encontrado.");
    if (a.hora_saida !== null && req.usuario.perfil !== "ADMIN") {
      throw erroHttp(403, "Só a coordenação pode apagar um atendimento já encerrado.");
    }
    await db.query("DELETE FROM ATENDIMENTO WHERE cod_atendimento = ?", [req.params.id]);
    res.json({ mensagem: "Atendimento removido." });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

module.exports = router;
