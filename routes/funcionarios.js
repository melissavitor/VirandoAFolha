const express = require("express");
const db = require("../db");
const transacao = require("../utils/transacao");
const { erroHttp, tratarErro } = require("../utils/erros");
const { gerarHash } = require("../utils/sessao");
const acessos = require("../utils/acessos");
const {
  eVerdadeiro,
  validarPessoa,
  normalizarTelefones,
  verificarCpfLivre,
  inserirPessoa,
  atualizarPessoa,
  salvarTelefonesPessoa,
  telefonesEmLista,
} = require("../utils/pessoa");

const router = express.Router();

// SELECT base: funcionário + pessoa + supervisor + papéis (recepcionista / monitor) + telefones
const SELECT_FUNCIONARIO = `
  SELECT f.cod_funcionario, f.data_cadastro, f.funcao, f.cod_supervisor,
         CONCAT(ps.primeiro_nome, ' ', ps.sobrenome) AS supervisor_nome,
         p.cpf, p.primeiro_nome, p.sobrenome, p.sexo, p.data_nascimento,
         p.rua, p.numero, p.bairro, p.cidade,
         rc.cod_recepcionista, m.cod_monitor,
         (SELECT GROUP_CONCAT(t.telefone ORDER BY t.telefone SEPARATOR ',')
            FROM TELEFONE_PESSOA t WHERE t.cpf = p.cpf) AS telefones
    FROM FUNCIONARIO f
    JOIN PESSOA p ON p.cpf = f.cpf
    LEFT JOIN FUNCIONARIO fs ON fs.cod_funcionario = f.cod_supervisor
    LEFT JOIN PESSOA ps ON ps.cpf = fs.cpf
    LEFT JOIN RECEPCIONISTA rc ON rc.cod_funcionario = f.cod_funcionario
    LEFT JOIN MONITOR m ON m.cod_funcionario = f.cod_funcionario`;

function formatar(linha, perfis = {}) {
  return {
    ...linha,
    telefones: telefonesEmLista(linha.telefones),
    tem_acesso: !!perfis[linha.cpf],
    perfil: perfis[linha.cpf] || null,
    recepcionista: linha.cod_recepcionista !== null,
    monitor: linha.cod_monitor !== null,
  };
}

// Liga ou desliga os papéis do funcionário (um mesmo funcionário pode ter os dois)
async function sincronizarPapel(conn, tabela, codFuncionario, querTer) {
  const [existe] = await conn.query(`SELECT 1 FROM ${tabela} WHERE cod_funcionario = ?`, [codFuncionario]);
  if (querTer && existe.length === 0) {
    await conn.query(`INSERT INTO ${tabela} (cod_funcionario) VALUES (?)`, [codFuncionario]);
  }
  if (!querTer && existe.length > 0) {
    await conn.query(`DELETE FROM ${tabela} WHERE cod_funcionario = ?`, [codFuncionario]);
  }
}

// listas de apoio para os módulos de atendimentos e eventos
// (ficam ANTES de "/:id", senão o Express acharia que "recepcionistas" é um id)

router.get("/recepcionistas", async (req, res) => {
  try {
    const [linhas] = await db.query(
      `SELECT rc.cod_recepcionista, rc.cod_funcionario,
              CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS nome
         FROM RECEPCIONISTA rc
         JOIN FUNCIONARIO f ON f.cod_funcionario = rc.cod_funcionario
         JOIN PESSOA p ON p.cpf = f.cpf
        ORDER BY nome`
    );
    res.json(linhas);
  } catch (erro) {
    tratarErro(erro, res);
  }
});

router.get("/monitores", async (req, res) => {
  try {
    const [linhas] = await db.query(
      `SELECT m.cod_monitor, m.cod_funcionario,
              CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS nome
         FROM MONITOR m
         JOIN FUNCIONARIO f ON f.cod_funcionario = m.cod_funcionario
         JOIN PESSOA p ON p.cpf = f.cpf
        ORDER BY nome`
    );
    res.json(linhas);
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// todos os funcionários, só o básico (usado para escalar a equipe de um evento)
router.get("/equipe", async (req, res) => {
  try {
    const [linhas] = await db.query(
      `SELECT f.cod_funcionario, f.funcao, CONCAT(p.primeiro_nome, ' ', p.sobrenome) AS nome
         FROM FUNCIONARIO f JOIN PESSOA p ON p.cpf = f.cpf
        ORDER BY nome`
    );
    res.json(linhas);
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// crud
// READ - listar todos
router.get("/", async (req, res) => {
  try {
    const [linhas] = await db.query(SELECT_FUNCIONARIO + " ORDER BY p.primeiro_nome, p.sobrenome");
    const perfis = await acessos.perfis();
    res.json(linhas.map((l) => formatar(l, perfis)));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// READ - buscar um
router.get("/:id", async (req, res) => {
  try {
    const [linhas] = await db.query(SELECT_FUNCIONARIO + " WHERE f.cod_funcionario = ?", [req.params.id]);
    if (linhas.length === 0) {
      return res.status(404).json({ mensagem: "Funcionário não encontrado" });
    }
    res.json(formatar(linhas[0], await acessos.perfis()));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// CREATE - PESSOA + FUNCIONARIO + papéis + telefones (tudo ou nada)
router.post("/", async (req, res) => {
  try {
    const pessoa = validarPessoa(req.body, { exigirCpf: true });
    const telefones = normalizarTelefones(req.body.telefones);
    const funcao = (req.body.funcao || "").trim();
    if (!funcao) throw erroHttp(400, "A função é obrigatória.");
    const supervisor = req.body.cod_supervisor ? Number(req.body.cod_supervisor) : null;

    const codigo = await transacao(async (conn) => {
      await verificarCpfLivre(conn, pessoa.cpf);
      await inserirPessoa(conn, pessoa);

      const [r] = await conn.query(
        "INSERT INTO FUNCIONARIO (funcao, cpf, cod_supervisor) VALUES (?, ?, ?)",
        [funcao, pessoa.cpf, supervisor]
      );
      const cod = r.insertId;

      await sincronizarPapel(conn, "RECEPCIONISTA", cod, eVerdadeiro(req.body.recepcionista));
      await sincronizarPapel(conn, "MONITOR", cod, eVerdadeiro(req.body.monitor));
      await salvarTelefonesPessoa(conn, pessoa.cpf, telefones);
      return cod;
    });

    res.status(201).json({ mensagem: "Funcionário cadastrado!", cod_funcionario: codigo });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// UPDATE - o CPF não muda
router.put("/:id", async (req, res) => {
  try {
    const pessoa = validarPessoa(req.body, { exigirCpf: false });
    const telefones = normalizarTelefones(req.body.telefones);
    const funcao = (req.body.funcao || "").trim();
    if (!funcao) throw erroHttp(400, "A função é obrigatória.");
    const supervisor = req.body.cod_supervisor ? Number(req.body.cod_supervisor) : null;

    await transacao(async (conn) => {
      const [achou] = await conn.query("SELECT cpf FROM FUNCIONARIO WHERE cod_funcionario = ?", [req.params.id]);
      if (achou.length === 0) throw erroHttp(404, "Funcionário não encontrado");

      const cpf = achou[0].cpf;
      await atualizarPessoa(conn, cpf, pessoa);
      await conn.query(
        "UPDATE FUNCIONARIO SET funcao = ?, cod_supervisor = ? WHERE cod_funcionario = ?",
        [funcao, supervisor, req.params.id]
      );
      await sincronizarPapel(conn, "RECEPCIONISTA", req.params.id, eVerdadeiro(req.body.recepcionista));
      await sincronizarPapel(conn, "MONITOR", req.params.id, eVerdadeiro(req.body.monitor));
      await salvarTelefonesPessoa(conn, cpf, telefones);
    });

    res.json({ mensagem: "Funcionário atualizado!" });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// acesso ao sistema: o login e o CPF; aqui define a senha e o perfil
// corpo: { senha, perfil }  (senha em branco = mantem a atual)
router.put("/:id/acesso", async (req, res) => {
  try {
    const senha = String(req.body.senha || "");
    const perfil = req.body.perfil === "ADMIN" ? "ADMIN" : "FUNCIONARIO";
    if (Number(req.params.id) === req.usuario.cod_funcionario && perfil !== "ADMIN") {
      throw erroHttp(400, "Você não pode tirar a própria permissão de coordenação.");
    }
    const [[func]] = await db.query("SELECT cpf FROM FUNCIONARIO WHERE cod_funcionario = ?", [req.params.id]);
    if (!func) throw erroHttp(404, "Funcionário não encontrado");
    const atual = await acessos.buscar(func.cpf);

    if (senha && senha.length < 6) throw erroHttp(400, "A senha precisa ter pelo menos 6 caracteres.");
    if (!senha && !atual) throw erroHttp(400, "Defina uma senha de pelo menos 6 caracteres.");

    await acessos.definir(func.cpf, senha ? { senha_hash: gerarHash(senha), perfil } : { perfil });
    res.json({ mensagem: "Acesso salvo!" });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// DELETE - remove FUNCIONARIO (e seus papéis) e a PESSOA
router.delete("/:id", async (req, res) => {
  try {
    if (Number(req.params.id) === req.usuario.cod_funcionario) {
      throw erroHttp(400, "Você não pode excluir o próprio cadastro enquanto está logada.");
    }
    // o acesso (tabela ACESSO) some junto com a PESSOA, por causa do ON DELETE CASCADE
    await transacao(async (conn) => {
      const [achou] = await conn.query("SELECT cpf FROM FUNCIONARIO WHERE cod_funcionario = ?", [req.params.id]);
      if (achou.length === 0) throw erroHttp(404, "Funcionário não encontrado");

      await conn.query("DELETE FROM FUNCIONARIO WHERE cod_funcionario = ?", [req.params.id]);
      await conn.query("DELETE FROM PESSOA WHERE cpf = ?", [achou[0].cpf]);
    });

    res.json({ mensagem: "Funcionário removido" });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

module.exports = router;