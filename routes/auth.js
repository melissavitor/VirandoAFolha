const express = require("express");
const db = require("../db");
const { erroHttp, tratarErro } = require("../utils/erros");
const transacao = require("../utils/transacao");
const { validarPessoa, normalizarTelefones, verificarCpfLivre, inserirPessoa, salvarTelefonesPessoa } = require("../utils/pessoa");
const sessao = require("../utils/sessao");
const acessos = require("../utils/acessos");

const router = express.Router();

// Dados do usuário que vão para o navegador (nunca a senha)
function dadosPublicos(s) {
  return {
    login: s.login,
    perfil: s.perfil,
    nome: s.nome,
    funcao: s.funcao,
    cod_funcionario: s.cod_funcionario,
    cod_recepcionista: s.cod_recepcionista,
    cod_monitor: s.cod_monitor,
    cod_responsavel: s.cod_responsavel,
  };
}

router.post("/login", async (req, res) => {
  try {
    const cpf = String(req.body.cpf || "").replace(/\D/g, "");
    const senha = String(req.body.senha || "");
    if (!cpf || !senha) {
      return res.status(400).json({ mensagem: "Informe o CPF e a senha." });
    }

    const [linhas] = await db.query(
      `SELECT f.cod_funcionario, f.funcao, p.cpf, p.primeiro_nome,
              rc.cod_recepcionista, m.cod_monitor
         FROM FUNCIONARIO f
         JOIN PESSOA p ON p.cpf = f.cpf
         LEFT JOIN RECEPCIONISTA rc ON rc.cod_funcionario = f.cod_funcionario
         LEFT JOIN MONITOR m ON m.cod_funcionario = f.cod_funcionario
        WHERE f.cpf = ?`,
      [cpf]
    );

    const u = linhas[0];
    const acesso = await acessos.buscar(cpf);

    // mesma mensagem para "usuário não existe" e "senha errada"
    if (!acesso || !sessao.conferirSenha(senha, acesso.senha_hash)) {
      return res.status(401).json({ mensagem: "Usuário ou senha incorretos." });
    }

    // não é funcionário: pode ser um responsável que criou a conta
    if (!u) {
      const [resp] = await db.query(
        `SELECT r.cod_responsavel, p.cpf, p.primeiro_nome FROM RESPONSAVEL r JOIN PESSOA p ON p.cpf = r.cpf WHERE r.cpf = ?`, [cpf]);
      if (!resp[0] || acesso.perfil !== "RESPONSAVEL") {
        return res.status(401).json({ mensagem: "Usuário ou senha incorretos." });
      }
      const dadosResp = {
        login: cpf, perfil: "RESPONSAVEL", nome: resp[0].primeiro_nome, funcao: "Responsável",
        cod_responsavel: resp[0].cod_responsavel,
      };
      sessao.enviarCookie(res, sessao.criarSessao(dadosResp));
      return res.json(dadosPublicos(dadosResp));
    }

    const dados = {
      login: u.cpf,
      perfil: acesso.perfil,
      nome: u.primeiro_nome,
      funcao: u.funcao,
      cod_funcionario: u.cod_funcionario,
      cod_recepcionista: u.cod_recepcionista,
      cod_monitor: u.cod_monitor,
    };
    sessao.enviarCookie(res, sessao.criarSessao(dados));
    res.json(dadosPublicos(dados));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

// Responsável criando a própria conta (tela pública "Criar conta")
router.post("/cadastro", async (req, res) => {
  try {
    const pessoa = validarPessoa(req.body, { exigirCpf: true });
    const telefones = normalizarTelefones(req.body.telefones);
    const senha = String(req.body.senha || "");
    if (senha.length < 6) throw erroHttp(400, "A senha precisa ter pelo menos 6 caracteres.");

    const codigo = await transacao(async (conn) => {
      await verificarCpfLivre(conn, pessoa.cpf);
      await inserirPessoa(conn, pessoa);
      const [r] = await conn.query("INSERT INTO RESPONSAVEL (cpf) VALUES (?)", [pessoa.cpf]);
      await salvarTelefonesPessoa(conn, pessoa.cpf, telefones);
      // a senha entra na mesma transação: ou grava tudo, ou nada
      await acessos.definir(pessoa.cpf, { senha_hash: sessao.gerarHash(senha), perfil: "RESPONSAVEL" }, conn);
      return r.insertId;
    });

    const dados = {
      login: pessoa.cpf, perfil: "RESPONSAVEL", nome: pessoa.primeiro_nome, funcao: "Responsável", cod_responsavel: codigo,
    };
    sessao.enviarCookie(res, sessao.criarSessao(dados));
    res.status(201).json(dadosPublicos(dados));
  } catch (erro) {
    tratarErro(erro, res);
  }
});

router.post("/logout", (req, res) => {
  sessao.encerrarSessao(req);
  sessao.limparCookie(res);
  res.json({ mensagem: "Você saiu do sistema." });
});

// Quem está logado? (as telas chamam isso ao abrir)
router.get("/eu", (req, res) => {
  const s = sessao.sessaoDaRequisicao(req);
  if (!s) return res.status(401).json({ mensagem: "Entre no sistema para continuar." });
  res.json(dadosPublicos(s));
});

// Troca da própria senha
router.post("/senha", sessao.exigirLogin, async (req, res) => {
  try {
    const { senha_atual, senha_nova } = req.body;
    if (!senha_nova || String(senha_nova).length < 6) {
      return res.status(400).json({ mensagem: "A nova senha precisa ter pelo menos 6 caracteres." });
    }
    const acesso = await acessos.buscar(req.usuario.login);
    if (!acesso || !sessao.conferirSenha(String(senha_atual || ""), acesso.senha_hash)) {
      return res.status(400).json({ mensagem: "A senha atual está incorreta." });
    }
    await acessos.definir(req.usuario.login, { senha_hash: sessao.gerarHash(String(senha_nova)) });
    res.json({ mensagem: "Senha alterada!" });
  } catch (erro) {
    tratarErro(erro, res);
  }
});

module.exports = router;