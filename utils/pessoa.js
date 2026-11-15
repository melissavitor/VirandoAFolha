// Funções compartilhadas por Responsáveis e Funcionários (os dois são PESSOA)
const { erroHttp } = require("./erros");

function somenteDigitos(texto) {
  return String(texto ?? "").replace(/\D/g, "");
}

function eVerdadeiro(valor) {
  return valor === true || valor === "true" || valor === 1 || valor === "1" || valor === "on";
}

// Confere os campos obrigatórios de PESSOA e devolve os dados já limpos
function validarPessoa(corpo, { exigirCpf }) {
  const pessoa = {
    cpf: somenteDigitos(corpo.cpf),
    primeiro_nome: (corpo.primeiro_nome || "").trim(),
    sobrenome: (corpo.sobrenome || "").trim(),
    sexo: corpo.sexo,
    data_nascimento: corpo.data_nascimento,
    rua: (corpo.rua || "").trim(),
    numero: String(corpo.numero ?? "").trim(),
    bairro: (corpo.bairro || "").trim(),
    cidade: (corpo.cidade || "").trim(),
  };

  if (exigirCpf && pessoa.cpf.length !== 11) {
    throw erroHttp(400, "O CPF deve ter 11 dígitos.");
  }
  if (!pessoa.primeiro_nome || !pessoa.sobrenome) {
    throw erroHttp(400, "Nome e sobrenome são obrigatórios.");
  }
  if (!["M", "F", "O"].includes(pessoa.sexo)) {
    throw erroHttp(400, "Sexo deve ser M, F ou O.");
  }
  if (!pessoa.data_nascimento) {
    throw erroHttp(400, "A data de nascimento é obrigatória.");
  }
  if (!pessoa.rua || !pessoa.numero || !pessoa.bairro || !pessoa.cidade) {
    throw erroHttp(400, "Endereço completo (rua, número, bairro e cidade) é obrigatório.");
  }
  return pessoa;
}

// Aceita ["3199...", "3133..."] ou "3199..., 3133..." e devolve só números, sem repetição
function normalizarTelefones(telefones) {
  if (!telefones) return [];
  const lista = Array.isArray(telefones) ? telefones : String(telefones).split(/[,;\n]/);
  const limpos = lista.map(somenteDigitos).filter((t) => t.length > 0);
  limpos.forEach((t) => {
    if (t.length > 15) throw erroHttp(400, "Telefone com mais de 15 dígitos: " + t);
  });
  return [...new Set(limpos)];
}

// Antes de cadastrar, garante que o CPF não é de outro responsável/funcionário
async function verificarCpfLivre(conn, cpf) {
  const [f] = await conn.query("SELECT 1 FROM FUNCIONARIO WHERE cpf = ?", [cpf]);
  if (f.length > 0) throw erroHttp(400, "Este CPF já pertence a um funcionário.");
  const [r] = await conn.query("SELECT 1 FROM RESPONSAVEL WHERE cpf = ?", [cpf]);
  if (r.length > 0) throw erroHttp(400, "Este CPF já pertence a um responsável.");
  const [p] = await conn.query("SELECT 1 FROM PESSOA WHERE cpf = ?", [cpf]);
  if (p.length > 0) throw erroHttp(400, "Este CPF já está cadastrado.");
}

async function inserirPessoa(conn, p) {
  await conn.query(
    `INSERT INTO PESSOA (cpf, primeiro_nome, sobrenome, sexo, data_nascimento, rua, numero, bairro, cidade)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p.cpf, p.primeiro_nome, p.sobrenome, p.sexo, p.data_nascimento, p.rua, p.numero, p.bairro, p.cidade]
  );
}

async function atualizarPessoa(conn, cpf, p) {
  await conn.query(
    `UPDATE PESSOA
        SET primeiro_nome = ?, sobrenome = ?, sexo = ?, data_nascimento = ?,
            rua = ?, numero = ?, bairro = ?, cidade = ?
      WHERE cpf = ?`,
    [p.primeiro_nome, p.sobrenome, p.sexo, p.data_nascimento, p.rua, p.numero, p.bairro, p.cidade, cpf]
  );
}

// Troca a lista de telefones da pessoa pela lista nova
async function salvarTelefonesPessoa(conn, cpf, telefones) {
  await conn.query("DELETE FROM TELEFONE_PESSOA WHERE cpf = ?", [cpf]);
  for (const telefone of telefones) {
    await conn.query("INSERT INTO TELEFONE_PESSOA (cpf, telefone) VALUES (?, ?)", [cpf, telefone]);
  }
}

// O MySQL devolve os telefones como "a,b,c"; aqui vira lista
function telefonesEmLista(texto) {
  return texto ? texto.split(",") : [];
}

module.exports = {
  somenteDigitos,
  eVerdadeiro,
  validarPessoa,
  normalizarTelefones,
  verificarCpfLivre,
  inserirPessoa,
  atualizarPessoa,
  salvarTelefonesPessoa,
  telefonesEmLista,
};
