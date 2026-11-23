const express = require("express");
const db = require("../db");
const transacao = require("../utils/transacao");
const { erroHttp, tratarErro } = require("../utils/erros");
const {
  validarPessoa, normalizarTelefones, verificarCpfLivre, inserirPessoa, salvarTelefonesPessoa,
} = require("../utils/pessoa");
const { gerarHash } = require("../utils/sessao");
const acessos = require("../utils/acessos");

const router = express.Router();

// A chave da criança é composta: (cod_responsavel, num_sequencial).
// Por isso as rotas de uma criança são  /criancas/:cod_responsavel/:num_sequencial

// SELECT base: criança + responsável principal + 2º responsável (se existir)
const SELECT_CRIANCA = `
  SELECT c.cod_responsavel, c.num_sequencial, c.nome, c.data_nascimento, c.observacoes,
         CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS responsavel_nome,
         ra.cod_responsavel_adicional,
         CONCAT(pa.primeiro_nome, ' ', pa.sobrenome) AS responsavel_adicional_nome
    FROM CRIANCA c
    JOIN RESPONSAVEL r ON r.cod_responsavel = c.cod_responsavel
    JOIN PESSOA p ON p.cpf = r.cpf
    LEFT JOIN RESPONSAVEL_ADICIONAL ra
           ON ra.cod_responsavel = c.cod_responsavel AND ra.num_sequencial = c.num_sequencial
    LEFT JOIN RESPONSAVEL rad ON rad.cod_responsavel = ra.cod_responsavel_adicional
    LEFT JOIN PESSOA pa ON pa.cpf = rad.cpf`;

function validarCrianca(corpo) {
  const nome = (corpo.nome || "").trim();
  if (!nome) throw erroHttp(400, "O nome da criança é obrigatório.");
  if (!corpo.data_nascimento) throw erroHttp(400, "A data de nascimento é obrigatória.");
  return {
    nome,
    data_nascimento: corpo.data_nascimento,
    observacoes: (corpo.observacoes || "").trim() || null,
    // undefined = a tela não mexeu no 2º responsável (então não mexemos); null = tirar o 2º responsável
    adicional: corpo.cod_responsavel_adicional === undefined ? undefined : (corpo.cod_responsavel_adicional ? Number(corpo.cod_responsavel_adicional) : null),
  };
}

// Troca o 2º responsável (apaga o vínculo antigo e cria o novo, se foi informado)
async function salvarAdicional(conn, cod, num, adicional) {
  await conn.query(
    "DELETE FROM RESPONSAVEL_ADICIONAL WHERE cod_responsavel = ? AND num_sequencial = ?",
    [cod, num]
  );
  if (adicional) {
    await conn.query(
      "INSERT INTO RESPONSAVEL_ADICIONAL (cod_responsavel, num_sequencial, cod_responsavel_adicional) VALUES (?, ?, ?)",
      [cod, num, adicional]
    );
  }
}

// READ - listar (opcional: /criancas?responsavel=1 lista só as crianças daquele responsável)
router.get("/", async (req, res) => {
  try {
    let sql = SELECT_CRIANCA;
    const parametros = [];
    const doResponsavel = req.filtroResponsavel || req.query.responsavel;
    if (req.filtroResponsavel) {
      // as crianças dele e também aquelas em que ele é o 2º responsável
      sql += " WHERE c.cod_responsavel = ? OR ra.cod_responsavel_adicional = ?";
      parametros.push(doResponsavel, doResponsavel);
    } else if (doResponsavel) {
      sql += " WHERE c.cod_responsavel = ?";
      parametros.push(doResponsavel);
    }
    const [linhas] = await db.query(sql + " ORDER BY c.nome", parametros);
    res.json(linhas);
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// BUSCAR responsável pelo CPF (usado ao cadastrar o 2º responsável).
// Para o responsável logado devolve só o nome (privacidade); a equipe recebe os dados completos.
router.get("/buscar-responsavel/:cpf", async (req, res) => {
  try {
    const cpf = String(req.params.cpf).replace(/\D/g, "");
    if (cpf.length !== 11) throw erroHttp(400, "CPF deve ter 11 dígitos.");
    const [[r]] = await db.query(
      `SELECT r.cod_responsavel, p.cpf, p.primeiro_nome, p.sobrenome, p.sexo, p.data_nascimento
         FROM RESPONSAVEL r JOIN PESSOA p ON p.cpf = r.cpf WHERE r.cpf = ?`, [cpf]);
    if (!r) {
      const [[outra]] = await db.query("SELECT 1 AS x FROM PESSOA WHERE cpf = ?", [cpf]);
      if (outra) throw erroHttp(400, "Esse CPF pertence a um funcionário e não pode ser responsável.");
      return res.json({ encontrado: false });
    }
    if (req.filtroResponsavel) return res.json({ encontrado: true, primeiro_nome: r.primeiro_nome, sobrenome: r.sobrenome });
    res.json({ encontrado: true, ...r });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// 2º RESPONSÁVEL: cadastra uma pessoa nova (ou liga uma que já existe, pelo CPF) a uma criança.
// Uma criança tem no máximo 2 responsáveis (regra do banco). Se já houver um 2º, ele é trocado.
// corpo: { cpf, primeiro_nome, sobrenome, sexo, data_nascimento, telefones, rua..., senha }
//   - se o CPF já é de um responsável, só o CPF basta;
//   - endereço em branco = usa o do responsável principal;
//   - senha (opcional, 6+ caracteres) cria o login para ele usar o site.
router.put("/:cod_responsavel/:num_sequencial/adicional", async (req, res) => {
  try {
    const { cod_responsavel: cod, num_sequencial: num } = req.params;
    const cpf = String(req.body.cpf || "").replace(/\D/g, "");
    if (cpf.length !== 11) throw erroHttp(400, "Informe o CPF do segundo responsável (11 dígitos).");
    const senha = String(req.body.senha || "");
    if (senha && senha.length < 6) throw erroHttp(400, "A senha precisa ter pelo menos 6 caracteres.");

    const resultado = await transacao(async (conn) => {
      const [[principal]] = await conn.query(
        `SELECT r.cpf, p.rua, p.numero, p.bairro, p.cidade
           FROM CRIANCA c JOIN RESPONSAVEL r ON r.cod_responsavel = c.cod_responsavel JOIN PESSOA p ON p.cpf = r.cpf
          WHERE c.cod_responsavel = ? AND c.num_sequencial = ?`, [cod, num]);
      if (!principal) throw erroHttp(404, "Criança não encontrada.");
      if (principal.cpf === cpf) throw erroHttp(400, "Esse é o próprio responsável principal. Informe outra pessoa.");

      let [[existente]] = await conn.query(
        `SELECT r.cod_responsavel, CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS nome
           FROM RESPONSAVEL r JOIN PESSOA p ON p.cpf = r.cpf WHERE r.cpf = ?`, [cpf]);

      if (!existente) {
        const [[jaPessoa]] = await conn.query("SELECT cpf FROM PESSOA WHERE cpf = ?", [cpf]);
        if (jaPessoa) throw erroHttp(400, "Esse CPF já está cadastrado como funcionário da brinquedoteca e não pode ser responsável.");
        // pessoa nova: cadastra PESSOA + RESPONSAVEL (+ telefones e, se pediram, o login)
        const dados = { ...req.body, cpf };
        for (const campo of ["rua", "numero", "bairro", "cidade"]) {
          if (!String(dados[campo] ?? "").trim()) dados[campo] = principal[campo];
        }
        const pessoa = validarPessoa(dados, { exigirCpf: true });
        await verificarCpfLivre(conn, pessoa.cpf);
        await inserirPessoa(conn, pessoa);
        const [r] = await conn.query("INSERT INTO RESPONSAVEL (cpf) VALUES (?)", [pessoa.cpf]);
        await salvarTelefonesPessoa(conn, pessoa.cpf, normalizarTelefones(req.body.telefones));
        if (senha) await acessos.definir(pessoa.cpf, { senha_hash: gerarHash(senha), perfil: "RESPONSAVEL" }, conn);
        existente = { cod_responsavel: r.insertId, nome: `${pessoa.primeiro_nome} ${pessoa.sobrenome}` };
      }

      await salvarAdicional(conn, cod, num, existente.cod_responsavel);
      return existente;
    });

    res.json({ mensagem: `${resultado.nome} agora é o segundo responsável.`, ...resultado });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// tirar o 2º responsável (a pessoa continua cadastrada)
router.delete("/:cod_responsavel/:num_sequencial/adicional", async (req, res) => {
  try {
    await transacao((conn) => salvarAdicional(conn, req.params.cod_responsavel, req.params.num_sequencial, null));
    res.json({ mensagem: "Segundo responsável removido." });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// READ - buscar uma criança
router.get("/:cod_responsavel/:num_sequencial", async (req, res) => {
  try {
    const [linhas] = await db.query(
      SELECT_CRIANCA + " WHERE c.cod_responsavel = ? AND c.num_sequencial = ?",
      [req.params.cod_responsavel, req.params.num_sequencial]
    );
    if (linhas.length === 0) {
      return res.status(404).json({ mensagem: "Criança não encontrada" });
    }
    res.json(linhas[0]);
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// CREATE - o num_sequencial é gerado sozinho pelo banco (trigger)
router.post("/", async (req, res) => {
  try {
    const cod = Number(req.body.cod_responsavel);
    if (!cod) throw erroHttp(400, "Escolha o responsável principal.");
    const c = validarCrianca(req.body);

    const num = await transacao(async (conn) => {
      await conn.query(
        "INSERT INTO CRIANCA (cod_responsavel, nome, data_nascimento, observacoes) VALUES (?, ?, ?, ?)",
        [cod, c.nome, c.data_nascimento, c.observacoes]
      );
      const [[ultimo]] = await conn.query(
        "SELECT MAX(num_sequencial) AS num FROM CRIANCA WHERE cod_responsavel = ?",
        [cod]
      );
      if (c.adicional !== undefined) await salvarAdicional(conn, cod, ultimo.num, c.adicional);
      return ultimo.num;
    });

    res.status(201).json({ mensagem: "Criança cadastrada!", cod_responsavel: cod, num_sequencial: num });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// UPDATE - o responsável principal e o número não mudam
router.put("/:cod_responsavel/:num_sequencial", async (req, res) => {
  try {
    const { cod_responsavel: cod, num_sequencial: num } = req.params;
    const c = validarCrianca(req.body);

    await transacao(async (conn) => {
      const [achou] = await conn.query(
        "SELECT 1 FROM CRIANCA WHERE cod_responsavel = ? AND num_sequencial = ?",
        [cod, num]
      );
      if (achou.length === 0) throw erroHttp(404, "Criança não encontrada");

      await conn.query(
        "UPDATE CRIANCA SET nome = ?, data_nascimento = ?, observacoes = ? WHERE cod_responsavel = ? AND num_sequencial = ?",
        [c.nome, c.data_nascimento, c.observacoes, cod, num]
      );
      if (c.adicional !== undefined) await salvarAdicional(conn, cod, num, c.adicional);
    });

    res.json({ mensagem: "Criança atualizada!" });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// DELETE - o 2º responsável sai junto (CASCADE); atendimentos impedem
router.delete("/:cod_responsavel/:num_sequencial", async (req, res) => {
  try {
    const [r] = await db.query(
      "DELETE FROM CRIANCA WHERE cod_responsavel = ? AND num_sequencial = ?",
      [req.params.cod_responsavel, req.params.num_sequencial]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Criança não encontrada" });
    }
    res.json({ mensagem: "Criança removida" });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

module.exports = router;