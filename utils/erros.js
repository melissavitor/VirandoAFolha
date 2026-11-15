// Cria um erro "nosso" (validação) para ser devolvido ao front
function erroHttp(status, mensagem) {
  return { status, mensagem };
}

// Converte qualquer erro (nosso ou do MySQL) em uma resposta amigável
function tratarErro(erro, res) {
  // erro de validação criado com erroHttp()
  if (erro.status) {
    return res.status(erro.status).json({ mensagem: erro.mensagem });
  }

  // erro lançado por TRIGGER do banco (SIGNAL SQLSTATE '45000')
  if (erro.sqlState === "45000") {
    return res.status(400).json({ mensagem: erro.sqlMessage });
  }

  switch (erro.code) {
    case "ER_DUP_ENTRY":
      if (String(erro.sqlMessage).includes("PESSOA.PRIMARY")) {
        return res.status(400).json({ mensagem: "Este CPF já está cadastrado." });
      }
      return res.status(400).json({ mensagem: "Esse registro já existe." });

    case "ER_CHECK_CONSTRAINT_VIOLATED":
      return res.status(400).json({ mensagem: "Algum dado informado é inválido." });

    case "ER_ROW_IS_REFERENCED_2":
      return res.status(400).json({
        mensagem: "Não é possível remover: este registro está sendo usado em outro cadastro (por exemplo, atendimentos ou eventos).",
      });

    case "ER_NO_REFERENCED_ROW_2":
      return res.status(400).json({ mensagem: "Registro relacionado não encontrado. Confira os códigos informados." });
  }

  console.error(erro);
  return res.status(500).json({ mensagem: "Erro interno: " + erro.message });
}

module.exports = { erroHttp, tratarErro };
