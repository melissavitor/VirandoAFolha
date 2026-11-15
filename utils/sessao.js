// Login com sessão guardada na memória do servidor.
// O navegador recebe só um código aleatório (cookie "vf_sessao"); quem é o usuário fica aqui.
// Obs.: se o servidor reiniciar (npm run dev salva arquivo), todo mundo precisa entrar de novo.
const crypto = require("crypto");

const NOME_COOKIE = "vf_sessao";
const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas
const sessoes = new Map();

// senha (scrypt, já vem no node: não precisa instalar nada)
function gerarHash(senha) {
  const sal = crypto.randomBytes(16).toString("hex");
  return sal + ":" + crypto.scryptSync(senha, sal, 64).toString("hex");
}

function conferirSenha(senha, salvo) {
  const [sal, hash] = String(salvo).split(":");
  if (!sal || !hash) return false;
  const calculado = crypto.scryptSync(senha, sal, 64);
  const original = Buffer.from(hash, "hex");
  return original.length === calculado.length && crypto.timingSafeEqual(original, calculado);
}

// sessões
function criarSessao(usuario) {
  const token = crypto.randomBytes(32).toString("hex");
  sessoes.set(token, { ...usuario, expira: Date.now() + DURACAO_MS });
  return token;
}

function lerCookie(req) {
  const texto = req.headers.cookie || "";
  for (const parte of texto.split(";")) {
    const [nome, ...resto] = parte.trim().split("=");
    if (nome === NOME_COOKIE) return resto.join("=");
  }
  return null;
}

function sessaoDaRequisicao(req) {
  const token = lerCookie(req);
  const sessao = token && sessoes.get(token);
  if (!sessao) return null;
  if (sessao.expira < Date.now()) {
    sessoes.delete(token);
    return null;
  }
  return sessao;
}

function enviarCookie(res, token) {
  res.setHeader(
    "Set-Cookie",
    `${NOME_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${DURACAO_MS / 1000}`
  );
}

function limparCookie(res) {
  res.setHeader("Set-Cookie", `${NOME_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function encerrarSessao(req) {
  const token = lerCookie(req);
  if (token) sessoes.delete(token);
}

// middlewares
function exigirLogin(req, res, next) {
  const sessao = sessaoDaRequisicao(req);
  if (!sessao) return res.status(401).json({ mensagem: "Entre no sistema para continuar." });
  req.usuario = sessao;
  next();
}

function exigirAdmin(req, res, next) {
  if (!req.usuario || req.usuario.perfil !== "ADMIN") {
    return res.status(403).json({ mensagem: "Somente a coordenação pode fazer isso." });
  }
  next();
}

module.exports = {
  gerarHash,
  conferirSenha,
  criarSessao,
  enviarCookie,
  limparCookie,
  encerrarSessao,
  sessaoDaRequisicao,
  exigirLogin,
  exigirAdmin,
};
