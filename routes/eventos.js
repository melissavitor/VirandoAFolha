const express = require("express");
const db = require("../db");
const transacao = require("../utils/transacao");
const { erroHttp, tratarErro } = require("../utils/erros");

const router = express.Router();

const CHECKLIST_PADRAO = {
  PRE: [
    "Confirmar data, horário e endereço com o responsável",
    "Conferir a lista de convidados",
    "Separar decoração, brinquedos e materiais",
    "Avisar a equipe escalada",
  ],
  POS: [
    "Recolher decoração e materiais",
    "Conferir pendências e danos",
    "Registrar o pagamento final",
    "Agradecer ao responsável",
  ],
};

const SELECT_EVENTO = `
  SELECT e.cod_evento, e.data, e.horario, e.qtd_convidados, e.rua, e.numero, e.bairro, e.cidade,
         e.cod_responsavel, e.status,
         CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS responsavel_nome,
         b.tema, b.observacoes,
         COALESCE((SELECT SUM(c.quantidade * c.valor_servico) FROM CONTRATACAO c
                    WHERE c.cod_evento = e.cod_evento), 0) AS total
    FROM EVENTO e
    JOIN RESPONSAVEL r ON r.cod_responsavel = e.cod_responsavel
    JOIN PESSOA p ON p.cpf = r.cpf
    LEFT JOIN FICHA_BRIEFING b ON b.cod_evento = e.cod_evento`;

function numeros(linha) {
  return { ...linha, total: Number(linha.total) };
}

// validação do corpo (criar e editar usam a mesma)
function validarEvento(corpo) {
  const e = {
    data: corpo.data,
    horario: corpo.horario,
    qtd_convidados: Number(corpo.qtd_convidados),
    rua: (corpo.rua || "").trim(),
    numero: String(corpo.numero ?? "").trim(),
    bairro: (corpo.bairro || "").trim(),
    cidade: (corpo.cidade || "").trim(),
    cod_responsavel: Number(corpo.cod_responsavel),
    tema: (corpo.tema || "").trim(),
    observacoes: (corpo.observacoes || "").trim() || null,
  };
  if (!e.cod_responsavel) throw erroHttp(400, "Escolha o responsável pelo evento.");
  if (!e.data || !/^\d{4}-\d{2}-\d{2}$/.test(e.data)) throw erroHttp(400, "Informe a data do evento.");
  if (!e.horario) throw erroHttp(400, "Informe o horário do evento.");
  if (!(e.qtd_convidados > 0)) throw erroHttp(400, "Informe quantos convidados são esperados.");
  if (!e.rua || !e.numero || !e.bairro || !e.cidade) throw erroHttp(400, "Informe o endereço completo do evento.");
  if (!e.tema) throw erroHttp(400, "Informe o tema da festa (ficha de briefing).");

  e.servicos = (corpo.servicos || []).map((s) => ({
    cod_servico: Number(s.cod_servico),
    quantidade: Number(s.quantidade) || 1,
    valor_servico: s.valor_servico === "" || s.valor_servico == null ? null : Number(s.valor_servico),
  }));
  if (e.servicos.some((s) => !s.cod_servico || s.quantidade < 1 || (s.valor_servico !== null && s.valor_servico < 0))) {
    throw erroHttp(400, "Confira a quantidade e o valor dos serviços.");
  }
  if (new Set(e.servicos.map((s) => s.cod_servico)).size !== e.servicos.length) {
    throw erroHttp(400, "O mesmo serviço foi escolhido duas vezes. Some as quantidades.");
  }

  e.equipe = (corpo.equipe || []).map((m) => ({
    cod_funcionario: Number(m.cod_funcionario),
    funcao_evento: (m.funcao_evento || "").trim(),
    horario_atuacao: m.horario_atuacao,
  }));
  if (e.equipe.some((m) => !m.cod_funcionario || !m.funcao_evento || !m.horario_atuacao)) {
    throw erroHttp(400, "Cada pessoa da equipe precisa de função e horário.");
  }
  if (new Set(e.equipe.map((m) => m.cod_funcionario)).size !== e.equipe.length) {
    throw erroHttp(400, "A mesma pessoa foi escalada duas vezes.");
  }
  return e;
}

// grava briefing + serviços + equipe (apaga o que havia e grava de novo)
async function gravarDetalhes(conn, cod, e) {
  await conn.query("DELETE FROM FICHA_BRIEFING WHERE cod_evento = ?", [cod]);
  await conn.query("INSERT INTO FICHA_BRIEFING (tema, observacoes, cod_evento) VALUES (?, ?, ?)", [e.tema, e.observacoes, cod]);

  await conn.query("DELETE FROM CONTRATACAO WHERE cod_evento = ?", [cod]);
  for (const s of e.servicos) {
    const [[cat]] = await conn.query("SELECT valor FROM SERVICO WHERE cod_servico = ?", [s.cod_servico]);
    if (!cat) throw erroHttp(400, "Serviço não encontrado no catálogo.");
    await conn.query(
      "INSERT INTO CONTRATACAO (cod_evento, cod_servico, quantidade, valor_servico) VALUES (?, ?, ?, ?)",
      [cod, s.cod_servico, s.quantidade, s.valor_servico ?? cat.valor]
    );
  }

  await conn.query("DELETE FROM PARTICIPACAO WHERE cod_evento = ?", [cod]);
  for (const m of e.equipe) {
    await conn.query(
      "INSERT INTO PARTICIPACAO (cod_funcionario, cod_evento, funcao_evento, horario_atuacao) VALUES (?, ?, ?, ?)",
      [m.cod_funcionario, cod, m.funcao_evento, m.horario_atuacao]
    );
  }
}

// listar (/eventos?status=orcamento|confirmado|cancelado)
router.get("/", async (req, res) => {
  try {
    const parametros = [];
    const condicoes = [];
    if (["ORCAMENTO", "CONFIRMADO", "CANCELADO"].includes(req.query.status)) {
      condicoes.push("e.status = ?");
      parametros.push(req.query.status);
    }
    if (req.filtroResponsavel) {   // responsável logado só vê os eventos dele
      condicoes.push("e.cod_responsavel = ?");
      parametros.push(req.filtroResponsavel);
    }
    const filtro = condicoes.length ? " WHERE " + condicoes.join(" AND ") : "";
    const [linhas] = await db.query(`${SELECT_EVENTO}${filtro} ORDER BY e.data DESC, e.horario DESC`, parametros);
    res.json(linhas.map(numeros));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// minha escala: eventos em que o funcionário logado está escalado (a partir de hoje)
router.get("/minha-escala", async (req, res) => {
  try {
    if (!req.usuario.cod_funcionario) return res.json([]);
    const [linhas] = await db.query(
      `SELECT e.cod_evento, e.data, e.horario, e.status, b.tema,
              pa.funcao_evento, pa.horario_atuacao,
              (SELECT COUNT(*) FROM CHECKLIST_EVENTO c WHERE c.cod_evento = e.cod_evento AND c.concluido = 0) AS itens_pendentes
         FROM PARTICIPACAO pa
         JOIN EVENTO e ON e.cod_evento = pa.cod_evento
         LEFT JOIN FICHA_BRIEFING b ON b.cod_evento = e.cod_evento
        WHERE pa.cod_funcionario = ? AND e.status <> 'CANCELADO' AND e.data >= CURDATE()
        ORDER BY e.data, pa.horario_atuacao`,
      [req.usuario.cod_funcionario]
    );
    res.json(linhas.map((l) => ({ ...l, itens_pendentes: Number(l.itens_pendentes) })));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// agenda: o que já está marcado numa data (/eventos/agenda?data=2026-12-05)
// precisa vir antes de "/:id", senão o Express acha que "agenda" é um id
router.get("/agenda", async (req, res) => {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.data || "")) throw erroHttp(400, "Informe a data no formato aaaa-mm-dd.");
    const [linhas] = await db.query(
      `SELECT e.cod_evento, e.horario, e.status, b.tema,
              CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS responsavel_nome
         FROM EVENTO e
         JOIN RESPONSAVEL r ON r.cod_responsavel = e.cod_responsavel
         JOIN PESSOA p ON p.cpf = r.cpf
         LEFT JOIN FICHA_BRIEFING b ON b.cod_evento = e.cod_evento
        WHERE e.data = ? AND e.status <> 'CANCELADO'
        ORDER BY e.horario`,
      [req.query.data]
    );
    // o responsável só precisa saber que o horário está ocupado, não de quem é a festa
    if (req.usuario.perfil === "RESPONSAVEL") {
      return res.json(linhas.map((l) => ({ cod_evento: l.cod_evento, horario: l.horario, status: l.status })));
    }
    res.json(linhas);
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// detalhe: evento + serviços + equipe + checklists
router.get("/:id", async (req, res) => {
  try {
    const [linhas] = await db.query(`${SELECT_EVENTO} WHERE e.cod_evento = ?`, [req.params.id]);
    if (linhas.length === 0) return res.status(404).json({ mensagem: "Evento não encontrado." });

    const [servicos] = await db.query(
      `SELECT c.cod_servico, s.nome, c.quantidade, c.valor_servico, s.valor AS valor_catalogo,
              (c.quantidade * c.valor_servico) AS subtotal
         FROM CONTRATACAO c JOIN SERVICO s ON s.cod_servico = c.cod_servico
        WHERE c.cod_evento = ? ORDER BY s.nome`,
      [req.params.id]
    );
    const [equipe] = await db.query(
      `SELECT pa.cod_funcionario, CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS nome,
              pa.funcao_evento, pa.horario_atuacao
         FROM PARTICIPACAO pa
         JOIN FUNCIONARIO f ON f.cod_funcionario = pa.cod_funcionario
         JOIN PESSOA p ON p.cpf = f.cpf
        WHERE pa.cod_evento = ? ORDER BY pa.horario_atuacao, nome`,
      [req.params.id]
    );
    const [checklist] = await db.query(
      "SELECT cod_checklist, tipo, item, concluido FROM CHECKLIST_EVENTO WHERE cod_evento = ? ORDER BY cod_checklist",
      [req.params.id]
    );

    res.json({
      ...numeros(linhas[0]),
      servicos: servicos.map((s) => ({
        ...s,
        valor_servico: Number(s.valor_servico),
        valor_catalogo: Number(s.valor_catalogo),
        subtotal: Number(s.subtotal),
      })),
      equipe,
      checklist: checklist.map((c) => ({ ...c, concluido: !!c.concluido })),
    });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// criar (nasce como orcamento)
router.post("/", async (req, res) => {
  try {
    const e = validarEvento(req.body);
    const hoje = new Date().toLocaleDateString("sv-SE"); // aaaa-mm-dd no fuso do servidor
    if (e.data < hoje) throw erroHttp(400, "A data do evento não pode ser no passado.");

    const codigo = await transacao(async (conn) => {
      const [r] = await conn.query(
        `INSERT INTO EVENTO (data, horario, qtd_convidados, rua, numero, bairro, cidade, cod_responsavel)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.data, e.horario, e.qtd_convidados, e.rua, e.numero, e.bairro, e.cidade, e.cod_responsavel]
      );
      await gravarDetalhes(conn, r.insertId, e);
      return r.insertId;
    });
    const solicitacao = req.usuario.perfil === "RESPONSAVEL";
    res.status(201).json({
      mensagem: solicitacao ? "Solicitação enviada! A brinquedoteca vai analisar e confirmar com você." : "Orçamento criado!",
      cod_evento: codigo,
    });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// editar (não edita evento cancelado)
router.put("/:id", async (req, res) => {
  try {
    const e = validarEvento(req.body);
    await transacao(async (conn) => {
      const [[atual]] = await conn.query("SELECT status FROM EVENTO WHERE cod_evento = ? FOR UPDATE", [req.params.id]);
      if (!atual) throw erroHttp(404, "Evento não encontrado.");
      if (atual.status === "CANCELADO") throw erroHttp(400, "Evento cancelado não pode ser editado.");

      await conn.query(
        `UPDATE EVENTO SET data = ?, horario = ?, qtd_convidados = ?, rua = ?, numero = ?, bairro = ?,
                           cidade = ?, cod_responsavel = ? WHERE cod_evento = ?`,
        [e.data, e.horario, e.qtd_convidados, e.rua, e.numero, e.bairro, e.cidade, e.cod_responsavel, req.params.id]
      );
      await gravarDetalhes(conn, req.params.id, e);
    });
    res.json({ mensagem: "Evento atualizado!" });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// mudar status: confirmar (orçamento aprovado) ou cancelar
router.post("/:id/status", async (req, res) => {
  try {
    const novo = req.body.status;
    if (!["CONFIRMADO", "CANCELADO", "ORCAMENTO"].includes(novo)) throw erroHttp(400, "Status inválido.");

    await transacao(async (conn) => {
      const [[atual]] = await conn.query("SELECT status FROM EVENTO WHERE cod_evento = ? FOR UPDATE", [req.params.id]);
      if (!atual) throw erroHttp(404, "Evento não encontrado.");
      if (atual.status === novo) throw erroHttp(400, "O evento já está com este status.");
      if (atual.status === "CANCELADO") throw erroHttp(400, "Evento cancelado não pode voltar. Crie um novo orçamento.");

      if (novo === "CONFIRMADO") {
        const [[tot]] = await conn.query("SELECT COUNT(*) AS n FROM CONTRATACAO WHERE cod_evento = ?", [req.params.id]);
        if (tot.n === 0) throw erroHttp(400, "Inclua pelo menos um serviço antes de confirmar o evento.");

        // gera os checklists padrão na primeira confirmação
        const [[ja]] = await conn.query("SELECT COUNT(*) AS n FROM CHECKLIST_EVENTO WHERE cod_evento = ?", [req.params.id]);
        if (ja.n === 0) {
          for (const tipo of ["PRE", "POS"]) {
            for (const item of CHECKLIST_PADRAO[tipo]) {
              await conn.query("INSERT INTO CHECKLIST_EVENTO (cod_evento, tipo, item) VALUES (?, ?, ?)", [req.params.id, tipo, item]);
            }
          }
        }
      }
      await conn.query("UPDATE EVENTO SET status = ? WHERE cod_evento = ?", [novo, req.params.id]);
    });

    const frases = { CONFIRMADO: "Evento confirmado!", CANCELADO: "Evento cancelado.", ORCAMENTO: "Evento voltou para orçamento." };
    res.json({ mensagem: frases[novo] });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// excluir (só orçamento ou cancelado)
router.delete("/:id", async (req, res) => {
  try {
    const [[atual]] = await db.query("SELECT status FROM EVENTO WHERE cod_evento = ?", [req.params.id]);
    if (!atual) throw erroHttp(404, "Evento não encontrado.");
    if (atual.status === "CONFIRMADO") throw erroHttp(400, "Cancele o evento antes de excluir.");
    await db.query("DELETE FROM EVENTO WHERE cod_evento = ?", [req.params.id]);
    res.json({ mensagem: "Evento excluído." });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// checklist
router.post("/:id/checklist", async (req, res) => {
  try {
    const item = (req.body.item || "").trim();
    if (!item) throw erroHttp(400, "Escreva o item da lista.");
    if (!["PRE", "POS"].includes(req.body.tipo)) throw erroHttp(400, "Escolha se é antes ou depois do evento.");
    const [r] = await db.query("INSERT INTO CHECKLIST_EVENTO (cod_evento, tipo, item) VALUES (?, ?, ?)", [req.params.id, req.body.tipo, item]);
    res.status(201).json({ mensagem: "Item adicionado!", cod_checklist: r.insertId });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

router.put("/:id/checklist/:cod", async (req, res) => {
  try {
    const [r] = await db.query(
      "UPDATE CHECKLIST_EVENTO SET concluido = ? WHERE cod_checklist = ? AND cod_evento = ?",
      [req.body.concluido ? 1 : 0, req.params.cod, req.params.id]
    );
    if (r.affectedRows === 0) throw erroHttp(404, "Item não encontrado.");
    res.json({ mensagem: "Item atualizado." });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

router.delete("/:id/checklist/:cod", async (req, res) => {
  try {
    await db.query("DELETE FROM CHECKLIST_EVENTO WHERE cod_checklist = ? AND cod_evento = ?", [req.params.cod, req.params.id]);
    res.json({ mensagem: "Item removido." });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

module.exports = router;
