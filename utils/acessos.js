// Quem pode entrar no sistema: CPF + senha (em hash) + perfil, guardados na tabela ACESSO do banco.
// perfil: ADMIN (coordenação), FUNCIONARIO ou RESPONSAVEL (cliente que criou conta pelo site).
// Todas as funções aceitam uma conexão opcional, para entrar numa transação.
const db = require("../db");

async function buscar(cpf, conn = db) {
  const [linhas] = await conn.query("SELECT cpf, senha_hash, perfil FROM ACESSO WHERE cpf = ?", [cpf]);
  return linhas[0] || null;
}

// { cpf: perfil } de todo mundo que tem acesso (usado na lista de funcionários)
async function perfis(conn = db) {
  const [linhas] = await conn.query("SELECT cpf, perfil FROM ACESSO");
  return Object.fromEntries(linhas.map((l) => [l.cpf, l.perfil]));
}

// cria o acesso ou atualiza o que veio em `mudancas` ({ senha_hash, perfil })
async function definir(cpf, mudancas, conn = db) {
  const atual = await buscar(cpf, conn);
  const senhaHash = mudancas.senha_hash ?? atual?.senha_hash;
  const perfil = mudancas.perfil ?? atual?.perfil;
  await conn.query(
    `INSERT INTO ACESSO (cpf, senha_hash, perfil) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE senha_hash = VALUES(senha_hash), perfil = VALUES(perfil)`,
    [cpf, senhaHash, perfil]
  );
}

async function remover(cpf, conn = db) {
  await conn.query("DELETE FROM ACESSO WHERE cpf = ?", [cpf]);
}

module.exports = { buscar, perfis, definir, remover };