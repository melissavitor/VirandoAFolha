require("dotenv").config();
const express = require("express");
const db = require("./db");
const { exigirLogin, exigirAdmin } = require("./utils/sessao");
const portalResponsavel = require("./utils/portal");

const app = express();

app.use(express.json());
app.use(express.static("public"));

// login (livre)
app.use("/auth", require("./routes/auth"));

// daqui para baixo, só usuário logado
// só a coordenação (ADMIN) pode alterar; funcionário comum só consulta
function somenteAdminParaAlterar(req, res, next) {
  if (req.method === "GET") return next();
  return exigirAdmin(req, res, next);
}

// funcionários: só a coordenação, exceto as listas de apoio usadas em Atendimentos/Eventos
function funcionariosPermissoes(req, res, next) {
  const listaDeApoio = req.method === "GET" && /^\/(recepcionistas|monitores)$/.test(req.path);
  if (listaDeApoio) return next();
  if (req.method === "GET" && req.path === "/equipe") return next();
  return exigirAdmin(req, res, next);
}

// responsável logado só alcança o que é dele (ver utils/portal.js)
app.use(exigirLogin, portalResponsavel);

app.use("/painel", exigirLogin, require("./routes/painel"));
app.use("/responsaveis", exigirLogin, require("./routes/responsaveis"));  // Cadastros
app.use("/criancas", exigirLogin, require("./routes/criancas"));          // Cadastros
app.use("/atendimentos", exigirLogin, require("./routes/atendimentos"));  // Atendimentos
app.use("/eventos", exigirLogin, require("./routes/eventos"));            // Eventos
app.use("/servicos", exigirLogin, somenteAdminParaAlterar, require("./routes/servicos"));
app.use("/configuracoes", exigirLogin, require("./routes/configuracoes"));
app.use("/funcionarios", exigirLogin, funcionariosPermissoes, require("./routes/funcionarios"));

// rota não encontrada -> JSON (e não a página de erro em HTML)
app.use((req, res) => res.status(404).json({ mensagem: "Página ou rota não encontrada." }));

// erro que escapou das rotas (ex.: JSON mal formado no corpo da requisição)
app.use((erro, req, res, next) => {
  if (erro.type === "entity.parse.failed") {
    return res.status(400).json({ mensagem: "O corpo da requisição não é um JSON válido." });
  }
  console.error(erro);
  res.status(500).json({ mensagem: "Erro interno: " + erro.message });
});

const porta = process.env.PORT || 3000;
app.listen(porta, async () => {
  console.log("Servidor rodando em http://localhost:" + porta);
  try {
    await db.query("SELECT 1");
    console.log("Conectado ao MySQL");
  } catch (erro) {
    console.log("Não conectou ao MySQL: " + erro.message);
    console.log("Confira o arquivo .env e se o banco 'brinquedoteca' foi criado (database/schema.sql).");
  }
});
