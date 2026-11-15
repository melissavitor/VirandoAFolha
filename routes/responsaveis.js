const express = require("express");
const db = require("../db");
const transacao = require("../utils/transacao");
const { erroHttp, tratarErro } = require("../utils/erros");
const {
  validarPessoa,
  normalizarTelefones,
  verificarCpfLivre,
  inserirPessoa,
  atualizarPessoa,
  salvarTelefonesPessoa,
  telefonesEmLista,
} = require("../utils/pessoa");

const router = express.Router();

// SELECT base: junta RESPONSAVEL com PESSOA e traz os telefones
const SELECT_RESPONSAVEL = `
  SELECT r.cod_responsavel, r.data_cadastro,
         p.cpf, p.primeiro_nome, p.sobrenome, p.sexo, p.data_nascimento,
         p.rua, p.numero, p.bairro, p.cidade,
         (SELECT GROUP_CONCAT(t.telefone ORDER BY t.telefone SEPARATOR ',')
            FROM TELEFONE_PESSOA t WHERE t.cpf = p.cpf) AS telefones
    FROM RESPONSAVEL r
    JOIN PESSOA p ON p.cpf = r.cpf`;

function formatar(linha) {
  return { ...linha, telefones: telefonesEmLista(linha.telefones) };
}

// READ - listar todos
router.get("/", async (req, res) => {
  try {
    const [linhas] = await db.query(SELECT_RESPONSAVEL + " ORDER BY p.primeiro_nome, p.sobrenome");
    res.json(linhas.map(formatar));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// READ - buscar um
router.get("/:id", async (req, res) => {
  try {
    const [linhas] = await db.query(SELECT_RESPONSAVEL + " WHERE r.cod_responsavel = ?", [req.params.id]);
    if (linhas.length === 0) {
      return res.status(404).json({ mensagem: "Responsável não encontrado" });
    }
    res.json(formatar(linhas[0]));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// CREATE - cadastra PESSOA + RESPONSAVEL + telefones (tudo ou nada)
router.post("/", async (req, res) => {
  try {
    const pessoa = validarPessoa(req.body, { exigirCpf: true });
    const telefones = normalizarTelefones(req.body.telefones);

    const codigo = await transacao(async (conn) => {
      await verificarCpfLivre(conn, pessoa.cpf);
      await inserirPessoa(conn, pessoa);
      const [r] = await conn.query("INSERT INTO RESPONSAVEL (cpf) VALUES (?)", [pessoa.cpf]);
      await salvarTelefonesPessoa(conn, pessoa.cpf, telefones);
      return r.insertId;
    });

    res.status(201).json({ mensagem: "Responsável cadastrado!", cod_responsavel: codigo });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// UPDATE - o CPF não muda; atualiza dados pessoais e telefones
router.put("/:id", async (req, res) => {
  try {
    const pessoa = validarPessoa(req.body, { exigirCpf: false });
    const telefones = normalizarTelefones(req.body.telefones);

    await transacao(async (conn) => {
      const [achou] = await conn.query("SELECT cpf FROM RESPONSAVEL WHERE cod_responsavel = ?", [req.params.id]);
      if (achou.length === 0) throw erroHttp(404, "Responsável não encontrado");

      const cpf = achou[0].cpf;
      await atualizarPessoa(conn, cpf, pessoa);
      await salvarTelefonesPessoa(conn, cpf, telefones);
    });

    res.json({ mensagem: "Responsável atualizado!" });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// DELETE - remove RESPONSAVEL e a PESSOA. Atenção: as crianças dele também são removidas.
router.delete("/:id", async (req, res) => {
  try {
    await transacao(async (conn) => {
      const [achou] = await conn.query("SELECT cpf FROM RESPONSAVEL WHERE cod_responsavel = ?", [req.params.id]);
      if (achou.length === 0) throw erroHttp(404, "Responsável não encontrado");

      await conn.query("DELETE FROM RESPONSAVEL WHERE cod_responsavel = ?", [req.params.id]);
      await conn.query("DELETE FROM PESSOA WHERE cpf = ?", [achou[0].cpf]);
    });

    res.json({ mensagem: "Responsável removido" });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

module.exports = router;