const express = require("express");
const db = require("../db");

const router = express.Router();

// READ - listar todos
router.get("/", async (req, res) => {
  try {
    const [servicos] = await db.query("SELECT * FROM SERVICO ORDER BY nome");
    res.json(servicos);
  } catch (erro) {
    res.status(500).json({ mensagem: erro.message });
  }
});

// READ - buscar um
router.get("/:id", async (req, res) => {
  try {
    const [linhas] = await db.query(
      "SELECT * FROM SERVICO WHERE cod_servico = ?",
      [req.params.id]
    );
    if (linhas.length === 0) {
      return res.status(404).json({ mensagem: "Serviço não encontrado" });
    }
    res.json(linhas[0]);
  } catch (erro) {
    res.status(500).json({ mensagem: erro.message });
  }
});

// CREATE
router.post("/", async (req, res) => {
  const { nome, descricao, valor } = req.body;

  if (!nome || valor === undefined || valor === "") {
    return res.status(400).json({ mensagem: "Nome e valor são obrigatórios" });
  }

  try {
    const [r] = await db.query(
      "INSERT INTO SERVICO (nome, descricao, valor) VALUES (?, ?, ?)",
      [nome, descricao || null, valor]
    );
    res.status(201).json({ cod_servico: r.insertId, nome, descricao, valor });
  } catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ mensagem: "Já existe um serviço com esse nome" });
    }
    if (erro.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
      return res.status(400).json({ mensagem: "O valor não pode ser negativo" });
    }
    res.status(500).json({ mensagem: erro.message });
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  const { nome, descricao, valor } = req.body;

  if (!nome || valor === undefined || valor === "") {
    return res.status(400).json({ mensagem: "Nome e valor são obrigatórios" });
  }

  try {
    const [r] = await db.query(
      "UPDATE SERVICO SET nome = ?, descricao = ?, valor = ? WHERE cod_servico = ?",
      [nome, descricao || null, valor, req.params.id]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Serviço não encontrado" });
    }
    res.json({ cod_servico: Number(req.params.id), nome, descricao, valor });
  } catch (erro) {
    if (erro.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ mensagem: "Já existe um serviço com esse nome" });
    }
    if (erro.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
      return res.status(400).json({ mensagem: "O valor não pode ser negativo" });
    }
    res.status(500).json({ mensagem: erro.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const [r] = await db.query(
      "DELETE FROM SERVICO WHERE cod_servico = ?",
      [req.params.id]
    );
    if (r.affectedRows === 0) {
      return res.status(404).json({ mensagem: "Serviço não encontrado" });
    }
    res.json({ mensagem: "Serviço removido" });
  } catch (erro) {
    if (erro.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(400).json({ mensagem: "Este serviço está contratado em algum evento e não pode ser removido" });
    }
    res.status(500).json({ mensagem: erro.message });
  }
});

module.exports = router;
