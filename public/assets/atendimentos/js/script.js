let usuario;
let config = { faixas: [], desconto_irmaos: 5 };
let criancas = [];
let emAndamento = [];

// abas
const ABAS = ["agora", "calculadora", "historico"];
function abrirAba(nome, mover = true) {
  if (!ABAS.includes(nome)) nome = "agora";
  ABAS.forEach((a) => {
    document.getElementById("painel-" + a).hidden = a !== nome;
    document.getElementById("aba-" + a).setAttribute("aria-selected", a === nome);
  });
  if (mover) history.replaceState(null, "", nome === "agora" ? "atendimentos.html" : "#" + nome);
  if (nome === "calculadora") calcular();
  if (nome === "historico") carregarHistorico();
}
ABAS.forEach((a) => document.getElementById("aba-" + a).addEventListener("click", () => abrirAba(a)));
document.querySelector(".abas").addEventListener("keydown", (e) => {
  const i = ABAS.findIndex((a) => document.getElementById("aba-" + a).getAttribute("aria-selected") === "true");
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    const prox = ABAS[(i + (e.key === "ArrowRight" ? 1 : ABAS.length - 1)) % ABAS.length];
    abrirAba(prox);
    document.getElementById("aba-" + prox).focus();
  }
});

// janela
const dialogo = document.getElementById("dialogo");
const dialogoCorpo = document.getElementById("dialogoCorpo");
function abrirDialogo(html) {
  dialogoCorpo.innerHTML = html;
  if (!dialogo.open) dialogo.showModal();
  dialogoCorpo.querySelectorAll("[data-fechar]").forEach((b) => (b.onclick = () => dialogo.close()));
}

// carregar listas
async function carregarBase() {
  const [monitores, recepcionistas, cfg, todasCriancas] = await Promise.all([
    chamarApi("/funcionarios/monitores"),
    chamarApi("/funcionarios/recepcionistas"),
    chamarApi("/configuracoes"),
    chamarApi("/criancas"),
  ]);
  config = cfg;
  criancas = todasCriancas;

  document.getElementById("monitores").innerHTML = monitores.length
    ? monitores.map((m) => `<label class="opcao"><input type="checkbox" name="monitor" value="${m.cod_monitor}"> ${escapar(m.nome)}</label>`).join("")
    : `<span class="suave">Nenhum monitor cadastrado. Marque um funcionário como monitor em Funcionários.</span>`;

  const sel = document.getElementById("recepcionista");
  sel.innerHTML = recepcionistas.map((r) => `<option value="${r.cod_recepcionista}">${escapar(r.nome)}</option>`).join("");
  if (usuario.cod_recepcionista) sel.value = usuario.cod_recepcionista;

  document.getElementById("regra").innerHTML =
    `Cobramos <strong>por minuto</strong>, sem arredondar. O valor da hora cai conforme a visita fica mais longa ` +
    `(veja a tabela de preços abaixo). Irmãos têm <strong>${config.desconto_irmaos}% de desconto</strong>.`;
  document.getElementById("tabelaFaixas").innerHTML = config.faixas.map((f) =>
    `<tr><td>${f.nome[0].toUpperCase() + f.nome.slice(1)}</td><td class="direita numero nome-forte">${formatarMoeda(f.valor_hora)}</td></tr>`).join("");
  document.getElementById("notaIrmaos").textContent = `Irmãos: ${config.desconto_irmaos}% de desconto no valor da hora.`;
}

function montarSelectCriancas() {
  const dentro = new Set(emAndamento.map((a) => a.cod_responsavel + "-" + a.num_sequencial));
  const sel = document.getElementById("crianca");
  const atual = sel.value;
  sel.innerHTML =
    `<option value="">Escolha a criança que chegou</option>` +
    criancas.map((c) => {
      const chave = c.cod_responsavel + "-" + c.num_sequencial;
      const ja = dentro.has(chave);
      return `<option value="${chave}" ${ja ? "disabled" : ""}>${escapar(c.nome)} - resp. ${escapar(c.responsavel_nome)}${ja ? " (já está aqui)" : ""}</option>`;
    }).join("");
  sel.value = atual;
}

// aba 1: quem está aqui
async function carregarAgora() {
  emAndamento = await chamarApi("/atendimentos?situacao=andamento");
  montarSelectCriancas();
  montarSelectCalc();

  document.getElementById("resumoAgora").textContent =
    emAndamento.length === 0 ? "Ninguém no momento." : emAndamento.length === 1 ? "1 criança no momento." : `${emAndamento.length} crianças no momento.`;

  const area = document.getElementById("agora");
  if (emAndamento.length === 0) {
    area.innerHTML = `<div class="vazio"><strong>Tudo calmo</strong><p>Quando uma criança chegar, registre a entrada ao lado.</p></div>`;
    return;
  }
  area.innerHTML = `<div class="fichas" style="grid-template-columns:1fr">${emAndamento.map((a, i) => `
    <div class="ficha ${corDe(i)}">
      <strong>${escapar(a.crianca_nome)}</strong>
      <span class="hora">Resp.: ${escapar(a.responsavel_nome)}${a.responsavel_telefones[0] ? " - " + formatarTelefone(a.responsavel_telefones[0]) : ""}</span>
      <span class="hora">Entrou às ${formatarHora(a.hora_entrada)} - ${formatarDuracao(a.previa.minutos)} - Monitor(es): ${escapar(a.monitores || "—")}</span>
      ${a.crianca_observacoes ? `<span class="hora">Atenção: ${escapar(a.crianca_observacoes)}</span>` : ""}
      <span class="valor numero">${formatarMoeda(a.previa.valor)} <small style="font-family:var(--fonte-texto);font-size:0.8rem;font-weight:300">até agora</small></span>
      <div class="acoes" style="margin-top:10px">
        <button class="btn btn-primario btn-pequeno" data-saida="${a.cod_atendimento}">Registrar saída</button>
        <button class="btn btn-perigo btn-pequeno" data-desfazer="${a.cod_atendimento}">Entrada por engano</button>
      </div>
    </div>`).join("")}</div>`;

  area.querySelectorAll("[data-saida]").forEach((b) => (b.onclick = () => registrarSaida(Number(b.dataset.saida))));
  area.querySelectorAll("[data-desfazer]").forEach((b) => (b.onclick = () => desfazerEntrada(Number(b.dataset.desfazer))));
}

document.getElementById("formEntrada").addEventListener("submit", async (e) => {
  e.preventDefault();
  const [cod, num] = document.getElementById("crianca").value.split("-").map(Number);
  const monitores = [...document.querySelectorAll("input[name=monitor]:checked")].map((i) => Number(i.value));
  const botao = document.getElementById("botaoEntrada");
  try {
    await comBotaoOcupado(botao, async () => {
      const r = await chamarApi("/atendimentos", "POST", {
        cod_responsavel: cod,
        num_sequencial: num,
        monitores,
        cod_recepcionista: Number(document.getElementById("recepcionista").value),
      });
      avisar(r.mensagem);
    });
    e.target.reset();
    document.getElementById("recepcionista").value = usuario.cod_recepcionista || document.getElementById("recepcionista").value;
    carregarAgora();
  } catch (erro) {
    avisar(erro.message, "erro");
  }
});

async function desfazerEntrada(id) {
  if (!(await confirmar("Desfazer esta entrada?", "Use só se a entrada foi registrada por engano. O registro será apagado.", "Desfazer entrada"))) return;
  try {
    avisar((await chamarApi("/atendimentos/" + id, "DELETE")).mensagem);
    carregarAgora();
  } catch (erro) {
    avisar(erro.message, "erro");
  }
}

// saída -> valor -> pagamento
function registrarSaida(id) {
  const a = emAndamento.find((x) => x.cod_atendimento === id);
  abrirDialogo(`
    <header><h2>Registrar saída</h2><button class="fechar" data-fechar aria-label="Fechar">×</button></header>
    <p><strong>${escapar(a.crianca_nome)}</strong> entrou às ${formatarHora(a.hora_entrada)}. Vamos registrar a saída agora e calcular o valor.</p>
    <label class="campo">
      <span>Saiu em outro horário? (opcional)</span>
      <input type="time" id="saidaManual">
      <small>Deixe em branco para usar o horário atual.</small>
    </label>
    <div class="rodape-form" style="margin-top:0">
      <button class="btn btn-primario" id="confirmarSaida">Calcular e registrar saída</button>
      <button class="btn btn-suave" data-fechar>Voltar</button>
    </div>`);

  document.getElementById("confirmarSaida").onclick = async (ev) => {
    try {
      const manual = document.getElementById("saidaManual").value;
      const r = await comBotaoOcupado(ev.target, () =>
        chamarApi(`/atendimentos/${id}/saida`, "POST", manual ? { hora_saida: manual } : {})
      );
      mostrarConta(id, a, r);
      carregarAgora();
    } catch (erro) {
      avisar(erro.message, "erro");
    }
  };
}

function mostrarConta(id, a, r) {
  abrirDialogo(`
    <header><h2>Saída registrada</h2><button class="fechar" data-fechar aria-label="Fechar">×</button></header>
    <div class="resultado-calculo" style="min-height:0">
      <span class="nome-forte">${escapar(a.crianca_nome)} - valor a cobrar</span>
      <span class="grande numero">${formatarMoeda(r.valor)}</span>
      <dl>
        <dt>Permanência</dt><dd>${formatarDuracao(r.minutos)}</dd>
        <dt>Faixa</dt><dd>${r.faixa}</dd>
        <dt>Valor da hora</dt><dd>${formatarMoeda(r.valor_hora)}${r.irmaos ? " (com desconto de irmãos)" : ""}</dd>
      </dl>
    </div>
    <p class="suave">Informe o valor a <strong>${escapar(a.responsavel_nome)}</strong> e confirme quando o pagamento for feito.</p>
    <div class="rodape-form" style="margin-top:0">
      <button class="btn btn-ok" id="confirmarPagamento">Confirmar pagamento</button>
      <button class="btn btn-suave" data-fechar>Deixar pendente</button>
    </div>`);

  document.getElementById("confirmarPagamento").onclick = async (ev) => {
    try {
      const resp = await comBotaoOcupado(ev.target, () => chamarApi(`/atendimentos/${id}/pagamento`, "POST"));
      avisar(resp.mensagem);
      dialogo.close();
    } catch (erro) {
      avisar(erro.message, "erro");
    }
  };
}

// aba 2: calculadora
function montarSelectCalc() {
  const sel = document.getElementById("calcCrianca");
  const atual = sel.value;
  sel.innerHTML =
    `<option value="">Digitar os horários manualmente</option>` +
    emAndamento.map((a) => `<option value="${a.cod_atendimento}">${escapar(a.crianca_nome)} (entrou às ${formatarHora(a.hora_entrada)})</option>`).join("");
  sel.value = atual;
}

function horaAgora() {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

async function calcular() {
  const entrada = document.getElementById("calcEntrada").value;
  const saida = document.getElementById("calcSaida").value;
  const erro = document.getElementById("calcErro");
  const valor = document.getElementById("calcValor");
  const detalhe = document.getElementById("calcDetalhe");
  erro.hidden = true;
  if (!entrada || !saida) { valor.textContent = formatarMoeda(0); detalhe.innerHTML = ""; return; }
  try {
    const r = await chamarApi("/atendimentos/calcular", "POST", { entrada, saida, irmaos: document.getElementById("calcIrmaos").checked });
    valor.textContent = formatarMoeda(r.valor);
    detalhe.innerHTML = `
      <dt>Permanência</dt><dd>${formatarDuracao(r.minutos)}</dd>
      <dt>Faixa</dt><dd>${r.faixa}</dd>
      <dt>Valor da hora</dt><dd>${formatarMoeda(r.valor_hora)}${r.irmaos ? " (com desconto de irmãos)" : ""}</dd>`;
  } catch (e) {
    valor.textContent = formatarMoeda(0);
    detalhe.innerHTML = "";
    erro.textContent = e.message;
    erro.hidden = false;
  }
}
const calcularComPausa = debounce(calcular, 200);
["calcEntrada", "calcSaida"].forEach((id) => document.getElementById(id).addEventListener("input", calcularComPausa));
document.getElementById("calcIrmaos").addEventListener("change", calcular);

document.getElementById("calcCrianca").addEventListener("change", (e) => {
  const a = emAndamento.find((x) => String(x.cod_atendimento) === e.target.value);
  const entrada = document.getElementById("calcEntrada");
  entrada.readOnly = !!a;
  if (a) {
    entrada.value = formatarHora(a.hora_entrada);
    document.getElementById("calcSaida").value = horaAgora();
  }
  calcular();
});

async function montarTabelaRapida() {
  const tempos = [["15 minutos", "00:15"], ["30 minutos", "00:30"], ["45 minutos", "00:45"], ["1 hora", "01:00"], ["1h 40min", "01:40"], ["2 horas", "02:00"], ["3 horas", "03:00"], ["4 horas", "04:00"], ["5 horas", "05:00"]];
  const resultados = await Promise.all(tempos.map(([, fim]) => chamarApi("/atendimentos/calcular", "POST", { entrada: "00:00", saida: fim })));
  document.getElementById("tabelaRapida").innerHTML = tempos
    .map(([nome], i) => `<tr><td>${nome}</td><td class="direita numero nome-forte">${formatarMoeda(resultados[i].valor)}</td></tr>`).join("");
}

// aba 3: histórico
async function carregarHistorico() {
  try {
    const lista = await chamarApi("/atendimentos?situacao=" + document.getElementById("filtroHistorico").value);
    document.getElementById("historicoVazio").hidden = lista.length > 0;
    document.getElementById("historico").innerHTML = lista.map((a) => {
      let selo;
      if (a.em_andamento) selo = `<span class="selo cor-azul">Na brinquedoteca</span>`;
      else if (a.pago) selo = `<span class="selo cor-verde">Pago</span>`;
      else selo = `<span class="selo cor-coral">Pendente</span>`;
      const valor = a.em_andamento ? `<span class="suave">${formatarMoeda(a.previa.valor)} até agora</span>` : formatarMoeda(a.valor_cobrado);
      const acoes = [];
      if (!a.em_andamento && !a.pago) acoes.push(`<button class="btn btn-ok btn-pequeno" data-pagar="${a.cod_atendimento}">Confirmar pagamento</button>`);
      if (usuario.perfil === "ADMIN" && !a.em_andamento) acoes.push(`<button class="btn btn-perigo btn-pequeno" data-apagar="${a.cod_atendimento}">Apagar</button>`);
      return `<tr>
        <td>${formatarData(a.data)}</td>
        <td class="nome-forte">${escapar(a.crianca_nome)}</td>
        <td>${escapar(a.responsavel_nome)}</td>
        <td class="numero">${formatarHora(a.hora_entrada)} – ${a.hora_saida ? formatarHora(a.hora_saida) : "…"}</td>
        <td class="direita numero">${valor}</td>
        <td>${selo}</td>
        <td><div class="celula-acoes">${acoes.join("")}</div></td></tr>`;
    }).join("");

    document.querySelectorAll("[data-pagar]").forEach((b) => (b.onclick = async () => {
      try { avisar((await chamarApi(`/atendimentos/${b.dataset.pagar}/pagamento`, "POST")).mensagem); carregarHistorico(); }
      catch (erro) { avisar(erro.message, "erro"); }
    }));
    document.querySelectorAll("[data-apagar]").forEach((b) => (b.onclick = async () => {
      if (!(await confirmar("Apagar atendimento?", "O registro e o valor cobrado serão removidos de vez.", "Apagar"))) return;
      try { avisar((await chamarApi("/atendimentos/" + b.dataset.apagar, "DELETE")).mensagem); carregarHistorico(); }
      catch (erro) { avisar(erro.message, "erro"); }
    }));
  } catch (erro) {
    avisar(erro.message, "erro");
  }
}
document.getElementById("filtroHistorico").addEventListener("change", carregarHistorico);

// início
(async function iniciar() {
  usuario = await usuarioPronto;
  // exemplo inicial: saída agora e entrada 1 hora antes (ou 00:00, se ainda for cedo)
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes();
  const antes = Math.max(0, agoraMin - 60);
  document.getElementById("calcSaida").value = horaAgora();
  document.getElementById("calcEntrada").value =
    String(Math.floor(antes / 60)).padStart(2, "0") + ":" + String(antes % 60).padStart(2, "0");
  try {
    await carregarBase();
    await carregarAgora();
    montarTabelaRapida();
  } catch (erro) {
    avisar(erro.message, "erro");
  }
  abrirAba(location.hash.replace("#", ""), false);
  window.addEventListener("hashchange", () => abrirAba(location.hash.replace("#", ""), false));
})();
