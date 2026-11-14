const express = require("express");
const db = require("../db");
const router = express.Router();

// listar
router.get("/", async (req, res) => {
  try {
    const [linhas] = await db.query("SELECT * FROM SERVICO");
    res.json(linhas);
  } catch (erro) {
    res.status(500).json({ erro: erro.message });
  }
});

// cadastrar
router.post("/", async (req, res) => {
  try {
    const { nome, descricao, valor } = req.body;
    const [r] = await db.query(
      "INSERT INTO SERVICO (nome, descricao, valor) VALUES (?, ?, ?)",
      [nome, descricao, valor]
    );
    res.status(201).json({ cod_servico: r.insertId });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// atualizar
router.put("/:id", async (req, res) => {
  try {
    const { nome, descricao, valor } = req.body;
    const [r] = await db.query(
      "UPDATE SERVICO SET nome = ?, descricao = ?, valor = ? WHERE cod_servico = ?",
      [nome, descricao, valor, req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ erro: "Serviço não encontrado" });
    res.json({ mensagem: "Atualizado" });
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

// excluir
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM SERVICO WHERE cod_servico = ?", [req.params.id]);
    res.status(204).send();
  } catch (erro) {
    // erro 1451 = serviço já usado em algum evento (ON DELETE RESTRICT)
    res.status(400).json({ erro: erro.message });
  }
});

module.exports = router;