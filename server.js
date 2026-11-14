require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.static("public"));

app.use("/servicos", require("./routes/servicos"));

const porta = process.env.PORT || 3000;
app.listen(porta, () => {
  console.log("Servidor rodando na porta " + porta);
});