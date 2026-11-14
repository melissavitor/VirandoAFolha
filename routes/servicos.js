const express = require("express");
const router = express.Router();

// dados de mentira, só até o banco ficar pronto
let servicos = [
  { cod_servico: 1, nome: "Decoração", descricao: "Decoração temática", valor: 300 },
  { cod_servico: 2, nome: "Recreação", descricao: "Recreadores", valor: 450 },
];
let proximoId = 3;

router.get("/", (req, res) => {
  res.json(servicos);
});

router.post("/", (req, res) => {
  const { nome, descricao, valor } = req.body;
  const novo = { cod_servico: proximoId++, nome, descricao, valor };
  servicos.push(novo);
  res.status(201).json(novo);
});

router.put("/:id", (req, res) => {
  const s = servicos.find((x) => x.cod_servico == req.params.id);
  if (!s) return res.status(404).json({ erro: "Serviço não encontrado" });
  Object.assign(s, req.body);
  res.json(s);
});

router.delete("/:id", (req, res) => {
  servicos = servicos.filter((x) => x.cod_servico != req.params.id);
  res.status(204).send();
});

module.exports = router;