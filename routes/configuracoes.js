const express = require("express");
const { tratarErro } = require("../utils/erros");
const { lerConfiguracao } = require("../utils/cobranca");

const router = express.Router();

// tabela de preços usada na cobrança (as faixas ficam em utils/cobranca.js)
router.get("/", async (req, res) => {
  try {
    res.json(await lerConfiguracao());
  } catch (erro) {
    tratarErro(erro, res);
  }
});

module.exports = router;
