let usuario;
let servicos = [];
const dialogo = document.getElementById("dialogo");

async function carregar() {
  try {
    servicos = await chamarApi("/servicos");
    document.getElementById("vazio").hidden = servicos.length > 0;
    const admin = usuario.perfil === "ADMIN";
    document.getElementById("lista").innerHTML = servicos.map((s) => `
      <tr>
        <td class="nome-forte">${escapar(s.nome)}</td>
        <td class="suave">${escapar(s.descricao || "—")}</td>
        <td class="direita numero nome-forte">${formatarMoeda(s.valor)}</td>
        <td>${admin ? `<div class="celula-acoes">
          <button class="btn btn-suave btn-pequeno" data-editar="${s.cod_servico}">Editar</button>
          <button class="btn btn-perigo btn-pequeno" data-excluir="${s.cod_servico}">Excluir</button></div>` : ""}</td>
      </tr>`).join("");
    document.querySelectorAll("[data-editar]").forEach((b) => (b.onclick = () => abrir(Number(b.dataset.editar))));
    document.querySelectorAll("[data-excluir]").forEach((b) => (b.onclick = () => excluir(Number(b.dataset.excluir))));
  } catch (erro) {
    avisar(erro.message, "erro");
  }
}

function abrir(cod) {
  const s = servicos.find((x) => x.cod_servico === cod);
  document.getElementById("formulario").reset();
  document.getElementById("cod_servico").value = s ? s.cod_servico : "";
  document.getElementById("tituloDialogo").textContent = s ? "Editar serviço" : "Novo serviço";
  if (s) {
    document.getElementById("nome").value = s.nome;
    document.getElementById("descricao").value = s.descricao || "";
    document.getElementById("valor").value = Number(s.valor).toFixed(2);
  }
  dialogo.showModal();
  document.getElementById("nome").focus();
}

document.getElementById("botaoNovo").onclick = () => abrir();
document.getElementById("fechar").onclick = () => dialogo.close();
document.getElementById("cancelar").onclick = () => dialogo.close();

document.getElementById("formulario").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("cod_servico").value;
  const dados = {
    nome: document.getElementById("nome").value,
    descricao: document.getElementById("descricao").value,
    valor: document.getElementById("valor").value,
  };
  try {
    const r = await comBotaoOcupado(document.getElementById("botaoSalvar"), () =>
      chamarApi(id ? "/servicos/" + id : "/servicos", id ? "PUT" : "POST", dados));
    avisar(r.mensagem);
    dialogo.close();
    carregar();
  } catch (erro) {
    avisar(erro.message, "erro");
  }
});

async function excluir(cod) {
  const s = servicos.find((x) => x.cod_servico === cod);
  if (!(await confirmar("Excluir este serviço?", `"${s.nome}" sai do catálogo. Se já foi contratado em algum evento, não será possível excluir.`, "Excluir"))) return;
  try {
    avisar((await chamarApi("/servicos/" + cod, "DELETE")).mensagem);
  } catch (erro) {
    avisar(erro.message, "erro");
  }
  carregar();
}

(async function iniciar() {
  usuario = await usuarioPronto;
  document.getElementById("botaoNovo").hidden = usuario.perfil !== "ADMIN";
  carregar();
})();
