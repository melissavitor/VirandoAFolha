const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const STATUS_EVENTO = {
  ORCAMENTO: { texto: "Orçamento", cor: "cor-lilas" },
  CONFIRMADO: { texto: "Confirmado", cor: "cor-verde" },
  CANCELADO: { texto: "Cancelado", cor: "cor-coral" },
};

async function iniciar() {
  const usuario = await usuarioPronto;

  const hora = new Date().getHours();
  const cumprimento = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  document.getElementById("saudacao").textContent = `${cumprimento}, ${usuario.nome}!`;
  document.getElementById("dataHoje").textContent = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  if (usuario.perfil === "RESPONSAVEL") return iniciarResponsavel(usuario);
  document.getElementById("areaEquipe").hidden = false;

  ["ic1:relogio", "ic2:mais", "ic3:maisUsuario", "ic4:festa"].forEach((par) => {
    const [id, nome] = par.split(":");
    document.getElementById(id).innerHTML = icone(nome);
  });

  carregarEscala();

  try {
    const p = await chamarApi("/painel");
    document.getElementById("nAndamento").textContent = p.em_andamento;
    document.getElementById("nReceber").textContent = formatarMoeda(p.a_receber);
    document.getElementById("rReceber").textContent =
      p.pagamentos_pendentes === 1 ? "a receber (1 pagamento)" : `a receber (${p.pagamentos_pendentes} pagamentos)`;
    document.getElementById("nConfirmados").textContent = p.eventos_confirmados;
    document.getElementById("nOrcamentos").textContent = p.orcamentos;

    const agora = document.getElementById("agora");
    agora.innerHTML = p.na_brinquedoteca.length
      ? `<div class="fichas">${p.na_brinquedoteca.map((c, i) => `
          <a class="ficha ${corDe(i)}" href="atendimentos.html" style="text-decoration:none;color:inherit">
            <strong>${escapar(c.crianca_nome)}</strong>
            <span class="hora">Entrou às ${formatarHora(c.hora_entrada)} - ${formatarDuracao(c.previa.minutos)}</span>
            <span class="valor numero">${formatarMoeda(c.previa.valor)}</span>
          </a>`).join("")}</div>`
      : `<div class="vazio"><strong>Ninguém por aqui ainda</strong><p>Quando uma criança chegar, registre a entrada e ela aparece aqui.</p>
         <a class="btn btn-primario" href="atendimentos.html">Registrar entrada</a></div>`;

    const eventos = document.getElementById("eventos");
    eventos.innerHTML = p.proximos_eventos.length
      ? `<ul class="lista-simples">${p.proximos_eventos.map((e) => {
          const [, mes, dia] = e.data.split("-");
          const st = STATUS_EVENTO[e.status];
          return `<li>
            <a class="item-evento" href="evento.html?id=${e.cod_evento}" style="text-decoration:none;color:inherit">
              <span class="data-bloco"><strong>${dia}</strong><span>${MESES[Number(mes) - 1]}</span></span>
              <span><span class="nome-forte">${escapar(e.tema || "Evento")}</span><br>
                <span class="suave pequeno">${escapar(e.responsavel_nome)} - ${formatarHora(e.horario)} - ${e.qtd_convidados} convidados</span></span>
            </a>
            <span class="selo ${st.cor}">${st.texto}</span></li>`;
        }).join("")}</ul>`
      : `<div class="vazio"><strong>Agenda livre</strong><p>Nenhum evento marcado para os próximos dias.</p>
         <a class="btn btn-primario" href="evento.html">Criar orçamento</a></div>`;
  } catch (erro) {
    avisar(erro.message, "erro");
  }
}

// eventos em que o funcionário logado está escalado
async function carregarEscala() {
  try {
    const lista = await chamarApi("/eventos/minha-escala");
    if (lista.length === 0) return;
    document.getElementById("cartaoEscala").hidden = false;
    document.getElementById("escala").innerHTML = `<ul class="lista-simples">${lista.map((e) => {
      const [, mes, dia] = e.data.split("-");
      const confirmado = e.status === "CONFIRMADO";
      return `<li><a class="item-evento" href="evento.html?id=${e.cod_evento}" style="text-decoration:none;color:inherit">
        <span class="data-bloco"><strong>${dia}</strong><span>${MESES[Number(mes) - 1]}</span></span>
        <span><span class="nome-forte">${escapar(e.tema || "Evento")}</span><br>
          <span class="suave pequeno">${escapar(e.funcao_evento)} - chega às ${formatarHora(e.horario_atuacao)} (festa às ${formatarHora(e.horario)})</span></span></a>
        <span class="selo ${confirmado ? (e.itens_pendentes ? "cor-amarelo" : "cor-verde") : "cor-lilas"}">${
          confirmado ? (e.itens_pendentes ? e.itens_pendentes + " itens no checklist" : "Checklist completo") : "Orçamento"}</span></li>`;
    }).join("")}</ul>`;
  } catch (erro) { /* a escala é um extra, não trava o início */ }
}

// início de quem criou conta pelo site: suas crianças e seus eventos
async function iniciarResponsavel(usuario) {
  STATUS_EVENTO.ORCAMENTO.texto = "Em análise";
  document.getElementById("areaEquipe").hidden = true;
  document.getElementById("areaResponsavel").hidden = false;
  ["ir1:maisUsuario", "ir2:festa", "ir3:cracha"].forEach((par) => {
    const [id, nome] = par.split(":");
    document.getElementById(id).innerHTML = icone(nome);
  });
  const aviso = sessionStorage.getItem("avisoInicio");
  if (aviso) { avisar(aviso); sessionStorage.removeItem("avisoInicio"); }

  try {
    const [criancas, eventos] = await Promise.all([chamarApi("/criancas"), chamarApi("/eventos")]);

    document.getElementById("minhasCriancas").innerHTML = criancas.length
      ? `<ul class="lista-simples">${criancas.map((c) => `<li><span><span class="nome-forte">${escapar(c.nome)}</span><br>
          <span class="suave pequeno">${idadeTexto(c.data_nascimento)}${c.observacoes ? " - " + escapar(c.observacoes) : ""}${String(c.cod_responsavel) !== String(usuario.cod_responsavel) ? " - responsável principal: " + escapar(c.responsavel_nome) : ""}</span></span></li>`).join("")}</ul>`
      : `<div class="vazio"><strong>Nenhuma criança cadastrada</strong><p>Cadastre quem vai frequentar a brinquedoteca.</p>
         <a class="btn btn-primario" href="cadastro.html?nova=1">Cadastrar criança</a></div>`;

    document.getElementById("meusEventos").innerHTML = eventos.length
      ? `<ul class="lista-simples">${eventos.slice(0, 5).map((e) => {
          const [, mes, dia] = e.data.split("-");
          const st = STATUS_EVENTO[e.status];
          return `<li><a class="item-evento" href="evento.html?id=${e.cod_evento}" style="text-decoration:none;color:inherit">
            <span class="data-bloco"><strong>${dia}</strong><span>${MESES[Number(mes) - 1]}</span></span>
            <span><span class="nome-forte">${escapar(e.tema || "Evento")}</span><br>
              <span class="suave pequeno">${formatarHora(e.horario)} - ${e.qtd_convidados} convidados - ${formatarMoeda(e.total)}</span></span></a>
            <span class="selo ${st.cor}">${st.texto}</span></li>`;
        }).join("")}</ul>`
      : `<div class="vazio"><strong>Nenhum evento ainda</strong><p>Envie uma solicitação e a brinquedoteca confirma com você.</p>
         <a class="btn btn-primario" href="evento.html">Solicitar evento</a></div>`;
  } catch (erro) {
    avisar(erro.message, "erro");
  }
}

iniciar();