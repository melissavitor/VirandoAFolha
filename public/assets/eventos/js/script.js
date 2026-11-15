const STATUS = {
  ORCAMENTO: { texto: "Orçamento", cor: "cor-lilas" },
  CONFIRMADO: { texto: "Confirmado", cor: "cor-verde" },
  CANCELADO: { texto: "Cancelado", cor: "cor-coral" },
};
let filtro = "";
let ehResponsavel = false;

async function carregar() {
  if (ehResponsavel) STATUS.ORCAMENTO.texto = "Em análise";
  try {
    const lista = await chamarApi("/eventos" + (filtro ? "?status=" + filtro : ""));
    document.getElementById("vazio").hidden = lista.length > 0;
    document.getElementById("lista").innerHTML = lista.map((e) => {
      const st = STATUS[e.status];
      return `<tr>
        <td class="numero nome-forte">${formatarData(e.data)}<br><span class="suave pequeno" style="font-weight:400">${formatarHora(e.horario)}</span></td>
        <td class="nome-forte">${escapar(e.tema || "—")}</td>
        <td>${escapar(e.responsavel_nome)}</td>
        <td class="numero">${e.qtd_convidados}</td>
        <td class="direita numero">${formatarMoeda(e.total)}</td>
        <td><span class="selo ${st.cor}">${st.texto}</span></td>
        <td><div class="celula-acoes"><a class="btn btn-suave btn-pequeno" href="evento.html?id=${e.cod_evento}">Abrir</a></div></td>
      </tr>`;
    }).join("");
  } catch (erro) {
    avisar(erro.message, "erro");
  }
}

document.querySelectorAll("#filtros button").forEach((b) =>
  b.addEventListener("click", () => {
    filtro = b.dataset.filtro;
    document.querySelectorAll("#filtros button").forEach((x) => x.setAttribute("aria-selected", x === b));
    carregar();
  })
);

usuarioPronto.then((usuario) => {
  if (usuario.perfil === "RESPONSAVEL") {
    ehResponsavel = true;
    document.querySelector("h1").textContent = "Meus eventos";
    document.querySelector(".subtitulo").textContent = "Suas solicitações e festas confirmadas.";
    document.querySelector(".cabecalho-pagina .acoes a").textContent = "Solicitar evento";
    document.querySelector('[data-filtro="ORCAMENTO"]').textContent = "Em análise";
    document.querySelector("#vazio p").textContent = "Envie uma solicitação e a brinquedoteca confirma com você.";
    document.querySelector("#vazio a").textContent = "Solicitar evento";
    document.querySelector("th:nth-child(3)").textContent = "Responsável";
  }
  carregar();
});
