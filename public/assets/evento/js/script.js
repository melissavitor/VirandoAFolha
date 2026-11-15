const STATUS = {
  ORCAMENTO: { texto: "Orçamento", cor: "cor-lilas" },
  CONFIRMADO: { texto: "Confirmado", cor: "cor-verde" },
  CANCELADO: { texto: "Cancelado", cor: "cor-coral" },
};
const NOMES_PASSOS = ["Dados da festa", "Briefing", "Serviços", "Equipe"];

const codEvento = new URLSearchParams(location.search).get("id");
let evento = null;            // dados carregados (quando é edição)
let passo = 1;
let responsaveis = [];
let catalogo = [];
let funcionarios = [];
let contador = 0;
let ehResponsavel = false;   // responsável logado pede o evento; equipe e preços ficam com a coordenação
let ultimoPasso = 4;
let salvarTravado = false;
const camposSimples = ["cod_responsavel", "data", "horario", "qtd_convidados", "rua", "numero", "bairro", "cidade", "tema", "observacoes"];

// etapas
function desenharPassos() {
  const el = document.getElementById("passos");
  el.innerHTML = NOMES_PASSOS.slice(0, ultimoPasso).map((nome, i) => {
    const n = i + 1;
    return `<li><button type="button" data-passo="${n}" ${n === passo ? 'aria-current="step"' : ""} class="${n < passo ? "feito" : ""}">
      <span class="bolinha">${n < passo ? "✓" : n}</span>${nome}</button></li>`;
  }).join("");
  el.querySelectorAll("button").forEach((b) => (b.onclick = () => irPara(Number(b.dataset.passo))));
}

function irPara(n, validar = true) {
  if (validar && n > passo && !passoValido(passo)) return;
  passo = n;
  document.querySelectorAll("[data-passo].cartao").forEach((s) => (s.hidden = Number(s.dataset.passo) !== passo));
  document.getElementById("voltar").hidden = passo === 1;
  document.getElementById("proximo").hidden = passo === ultimoPasso;
  document.getElementById("salvar").hidden = !(passo === ultimoPasso || codEvento) || salvarTravado;
  desenharPassos();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// valida só os campos da etapa atual (o navegador mostra qual falta)
function passoValido(n) {
  const secao = document.getElementById("passo-" + n);
  for (const el of secao.querySelectorAll("input, select, textarea")) {
    if (!el.checkValidity()) { el.reportValidity(); return false; }
  }
  if (n === 3 && document.querySelectorAll("#servicos .linha-item").length === 0) {
    avisar("Inclua pelo menos um serviço na solicitação.", "erro");
    return false;
  }
  return true;
}

document.getElementById("proximo").onclick = () => irPara(passo + 1);
document.getElementById("voltar").onclick = () => irPara(passo - 1, false);

// serviços
function escolhidos(exceto) {
  return [...document.querySelectorAll("#servicos select")].filter((s) => s !== exceto).map((s) => s.value);
}

function opcoesServico(selecionado, exceto) {
  const usados = escolhidos(exceto);
  return `<option value="">Escolha o serviço</option>` + catalogo.map((s) =>
    `<option value="${s.cod_servico}" ${String(s.cod_servico) === String(selecionado) ? "selected" : ""} ${usados.includes(String(s.cod_servico)) ? "disabled" : ""}>${escapar(s.nome)}</option>`).join("");
}

function travarPreco(linha) {
  if (ehResponsavel) linha.querySelector("[data-s=valor_servico]").readOnly = true;
}

function adicionarServico(d = {}) {
  const n = ++contador;
  const linha = document.createElement("div");
  linha.className = "linha-item";
  linha.innerHTML = `
    <label class="campo"><span>Serviço</span><select data-s="cod_servico" required>${opcoesServico(d.cod_servico)}</select></label>
    <label class="campo"><span>Qtd.</span><input type="number" data-s="quantidade" min="1" value="${d.quantidade || 1}" required></label>
    <label class="campo"><span>Valor unit. (R$)</span><input type="number" data-s="valor_servico" min="0" step="0.01" value="${d.valor_servico ?? ""}" required></label>
    <div class="total-linha numero" data-sub>R$ 0,00</div>
    <button type="button" class="btn btn-perigo btn-icone" aria-label="Remover serviço">${icone("lixo")}</button>`;
  document.getElementById("servicos").appendChild(linha);
  travarPreco(linha);

  const sel = linha.querySelector("select");
  sel.addEventListener("change", () => {
    const item = catalogo.find((c) => String(c.cod_servico) === sel.value);
    if (item) linha.querySelector("[data-s=valor_servico]").value = Number(item.valor).toFixed(2);
    atualizarOpcoes();
    recalcular();
  });
  linha.querySelectorAll("input").forEach((i) => i.addEventListener("input", recalcular));
  linha.querySelector("button").onclick = () => { linha.remove(); atualizarOpcoes(); recalcular(); };
  recalcular();
  return linha;
}

function atualizarOpcoes() {
  document.querySelectorAll("#servicos select").forEach((s) => {
    const v = s.value;
    s.innerHTML = opcoesServico(v, s);
    s.value = v;
  });
}

function recalcular() {
  let total = 0;
  document.querySelectorAll("#servicos .linha-item").forEach((l) => {
    const q = Number(l.querySelector("[data-s=quantidade]").value) || 0;
    const v = Number(l.querySelector("[data-s=valor_servico]").value) || 0;
    l.querySelector("[data-sub]").textContent = formatarMoeda(q * v);
    total += q * v;
  });
  document.getElementById("total").textContent = formatarMoeda(total);
}

document.getElementById("addServico").onclick = () => adicionarServico().querySelector("select").focus();

// equipe
function adicionarEquipe(d = {}) {
  const linha = document.createElement("div");
  linha.className = "linha-equipe";
  linha.innerHTML = `
    <label class="campo"><span>Pessoa</span><select data-e="cod_funcionario" required>
      <option value="">Escolha</option>${funcionarios.map((f) => `<option value="${f.cod_funcionario}">${escapar(f.nome)} (${escapar(f.funcao)})</option>`).join("")}</select></label>
    <label class="campo"><span>Função na festa</span><input type="text" data-e="funcao_evento" list="funcoesFesta" value="${escapar(d.funcao_evento || "")}" required></label>
    <label class="campo"><span>Chega às</span><input type="time" data-e="horario_atuacao" value="${formatarHora(d.horario_atuacao)}" required></label>
    <button type="button" class="btn btn-perigo btn-icone" aria-label="Remover pessoa da equipe">${icone("lixo")}</button>`;
  document.getElementById("equipe").appendChild(linha);
  linha.querySelector("select").value = d.cod_funcionario || "";
  linha.querySelector("button").onclick = () => { linha.remove(); equipeVazia(); };
  equipeVazia();
  return linha;
}
function equipeVazia() {
  document.getElementById("equipeVazia").hidden = document.querySelectorAll("#equipe .linha-equipe").length > 0;
}
document.getElementById("addEquipe").onclick = () => adicionarEquipe().querySelector("select").focus();

const lista = document.createElement("datalist");
lista.id = "funcoesFesta";
lista.innerHTML = ["Coordenação", "Recreação", "Decoração", "Animação", "Apoio"].map((f) => `<option value="${f}">`).join("");
document.body.appendChild(lista);

// endereço do responsável
document.getElementById("usarEndereco").onclick = () => {
  const r = responsaveis.find((x) => String(x.cod_responsavel) === document.getElementById("cod_responsavel").value);
  if (!r) return avisar("Escolha o responsável primeiro.", "erro");
  ["rua", "numero", "bairro", "cidade"].forEach((c) => (document.getElementById(c).value = r[c]));
};

// salvar
function montarCorpo() {
  const corpo = {};
  camposSimples.forEach((c) => (corpo[c] = document.getElementById(c).value));
  corpo.servicos = [...document.querySelectorAll("#servicos .linha-item")].map((l) => ({
    cod_servico: l.querySelector("[data-s=cod_servico]").value,
    quantidade: l.querySelector("[data-s=quantidade]").value,
    valor_servico: l.querySelector("[data-s=valor_servico]").value,
  }));
  corpo.equipe = [...document.querySelectorAll("#equipe .linha-equipe")].map((l) => ({
    cod_funcionario: l.querySelector("[data-e=cod_funcionario]").value,
    funcao_evento: l.querySelector("[data-e=funcao_evento]").value,
    horario_atuacao: l.querySelector("[data-e=horario_atuacao]").value,
  }));
  return corpo;
}

document.getElementById("formulario").addEventListener("submit", async (e) => {
  e.preventDefault();
  for (let n = 1; n <= ultimoPasso; n++) {
    if (!passoValido(n)) { irPara(n, false); passoValido(n); return; }
  }
  const botao = document.getElementById("salvar");
  try {
    const r = await comBotaoOcupado(botao, () =>
      chamarApi(codEvento ? "/eventos/" + codEvento : "/eventos", codEvento ? "PUT" : "POST", montarCorpo())
    );
    avisar(r.mensagem);
    if (!codEvento) { location.href = "evento.html?id=" + r.cod_evento; return; }
    await carregarEvento();
  } catch (erro) {
    avisar(erro.message, "erro");
  }
});

// status
async function mudarStatus(status, titulo, texto, rotulo, perigo) {
  if (!(await confirmar(titulo, texto, rotulo, perigo))) return;
  try {
    avisar((await chamarApi(`/eventos/${codEvento}/status`, "POST", { status })).mensagem);
    await carregarEvento();
  } catch (erro) {
    avisar(erro.message, "erro");
  }
}

function desenharAcoes() {
  const area = document.getElementById("acoesStatus");
  const botoes = [`<a class="btn btn-suave" href="eventos.html">${ehResponsavel ? "Voltar para meus eventos" : "Voltar para eventos"}</a>`];
  if (evento) {
    if (evento.status === "ORCAMENTO" && !ehResponsavel) botoes.unshift(`<button type="button" class="btn btn-ok" id="bConfirmar">Confirmar evento</button>`);
    if (ehResponsavel && evento.status === "CONFIRMADO") { /* confirmado: só a brinquedoteca altera */ }
    else if (evento.status !== "CANCELADO") botoes.push(`<button type="button" class="btn btn-perigo" id="bCancelar">Cancelar evento</button>`);
    if (evento.status !== "CONFIRMADO" && !(ehResponsavel && evento.status === "CANCELADO")) botoes.push(`<button type="button" class="btn btn-perigo" id="bExcluir">Excluir</button>`);
  }
  area.innerHTML = botoes.join("");
  const ligar = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  ligar("bConfirmar", () => mudarStatus("CONFIRMADO", "Confirmar este evento?", "O orçamento foi aprovado pela família. Vamos gerar os checklists de antes e depois da festa.", "Confirmar evento", false));
  ligar("bCancelar", () => mudarStatus("CANCELADO", "Cancelar este evento?", "Um evento cancelado não pode ser editado nem reaberto.", "Cancelar evento", true));
  ligar("bExcluir", async () => {
    if (!(await confirmar("Excluir este evento?", "O orçamento, a equipe e os serviços serão apagados de vez.", "Excluir"))) return;
    try { await chamarApi("/eventos/" + codEvento, "DELETE"); location.href = "eventos.html"; }
    catch (erro) { avisar(erro.message, "erro"); }
  });
}

// checklist
// o responsável só enxerga quem foi escalado e o horário de chegada (não mexe na equipe)
function desenharEquipeLeitura() {
  const area = document.getElementById("areaEquipeLeitura");
  area.hidden = !(ehResponsavel && evento && evento.status !== "CANCELADO");
  if (area.hidden) return;
  document.getElementById("equipeLeitura").innerHTML = evento.equipe.length
    ? `<ul class="lista-simples">${evento.equipe.map((m) => `<li>
        <span><span class="nome-forte">${escapar(m.nome)}</span><br><span class="suave pequeno">${escapar(m.funcao_evento)}</span></span>
        <span class="selo cor-azul">Chega às ${formatarHora(m.horario_atuacao)}</span></li>`).join("")}</ul>`
    : `<div class="vazio"><strong>Equipe ainda não definida</strong><p>A brinquedoteca escolhe a equipe quando confirma o evento. Volte aqui depois para ver os horários.</p></div>`;
}

function desenharChecklist() {
  const area = document.getElementById("areaChecklist");
  area.hidden = ehResponsavel || !(evento && evento.status === "CONFIRMADO");
  if (area.hidden) return;
  ["PRE", "POS"].forEach((tipo) => {
    const itens = evento.checklist.filter((c) => c.tipo === tipo);
    document.getElementById("lista" + tipo).innerHTML = itens.length
      ? itens.map((c) => `<li><label><input type="checkbox" data-check="${c.cod_checklist}" ${c.concluido ? "checked" : ""}><span>${escapar(c.item)}</span></label>
          <button type="button" class="btn btn-suave btn-pequeno btn-icone" data-tirar="${c.cod_checklist}" aria-label="Remover item">${icone("lixo")}</button></li>`).join("")
      : `<li class="suave">Nenhum item.</li>`;
  });
  area.querySelectorAll("[data-check]").forEach((i) => (i.onchange = async () => {
    try { await chamarApi(`/eventos/${codEvento}/checklist/${i.dataset.check}`, "PUT", { concluido: i.checked }); }
    catch (erro) { avisar(erro.message, "erro"); i.checked = !i.checked; }
  }));
  area.querySelectorAll("[data-tirar]").forEach((b) => (b.onclick = async () => {
    try { await chamarApi(`/eventos/${codEvento}/checklist/${b.dataset.tirar}`, "DELETE"); await carregarEvento(false); }
    catch (erro) { avisar(erro.message, "erro"); }
  }));
}

document.querySelectorAll("form[data-novo]").forEach((f) =>
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const campo = f.querySelector("input");
    try {
      await chamarApi(`/eventos/${codEvento}/checklist`, "POST", { tipo: f.dataset.novo, item: campo.value });
      campo.value = "";
      await carregarEvento(false);
    } catch (erro) { avisar(erro.message, "erro"); }
  })
);

// agenda: avisa se já existe evento marcado no mesmo dia
async function conferirAgenda() {
  const aviso = document.getElementById("avisoAgenda");
  const data = document.getElementById("data").value;
  aviso.hidden = true;
  if (!data) return;
  try {
    const marcados = (await chamarApi("/eventos/agenda?data=" + data)).filter((e) => String(e.cod_evento) !== String(codEvento));
    if (marcados.length === 0) return;
    aviso.textContent = ehResponsavel
      ? "Já existe festa marcada nesse dia, às " + marcados.map((e) => formatarHora(e.horario)).join(" e ") + ". Escolha um horário diferente ou fale com a brinquedoteca."
      : "Já tem evento nesse dia: " +
        marcados.map((e) => `${formatarHora(e.horario)} ${e.tema || "sem tema"} (${e.responsavel_nome})`).join("; ") +
        ". Confira se a equipe dá conta.";
    aviso.hidden = false;
  } catch (erro) { /* é só um aviso, não bloqueia o cadastro */ }
}
document.getElementById("data").addEventListener("change", conferirAgenda);

// carregar
async function carregarEvento(preencher = true) {
  evento = await chamarApi("/eventos/" + codEvento);
  const st = STATUS[evento.status];
  const selo = document.getElementById("selo");
  selo.hidden = false;
  selo.className = "selo " + st.cor;
  selo.textContent = st.texto;

  document.getElementById("titulo").textContent = evento.tema || "Evento";
  document.getElementById("subtitulo").textContent =
    `${evento.responsavel_nome} - ${formatarData(evento.data)} às ${formatarHora(evento.horario)} - ${formatarMoeda(evento.total)}`;
  document.getElementById("salvar").textContent = "Salvar alterações";
  if (ehResponsavel) document.getElementById("titulo").textContent = (evento.status === "ORCAMENTO" ? "Minha solicitação: " : "Meu evento: ") + (evento.tema || "evento");
  // cancelado ninguém edita; confirmado, o responsável só consulta
  const travado = evento.status === "CANCELADO" || (ehResponsavel && evento.status !== "ORCAMENTO");
  document.getElementById("campos").disabled = travado;
  salvarTravado = travado;
  if (travado) document.getElementById("salvar").hidden = true;

  if (preencher) {
    camposSimples.forEach((c) => (document.getElementById(c).value = evento[c] ?? ""));
    document.getElementById("horario").value = formatarHora(evento.horario);
    conferirAgenda();
    document.getElementById("servicos").innerHTML = "";
    document.getElementById("equipe").innerHTML = "";
    evento.servicos.forEach((s) => adicionarServico(s));
    evento.equipe.forEach((m) => adicionarEquipe(m));
    equipeVazia();
  }
  desenharAcoes();
  desenharEquipeLeitura();
  desenharChecklist();
}

(async function iniciar() {
  const usuario = await usuarioPronto;
  try {
    ehResponsavel = usuario.perfil === "RESPONSAVEL";
    if (ehResponsavel) {
      // o responsável é sempre ele mesmo e não escala equipe
      ultimoPasso = 3;
      document.getElementById("passo-4").style.display = "none";
      document.getElementById("cod_responsavel").closest(".campo").style.display = "none";
      STATUS.ORCAMENTO.texto = "Em análise";
      document.getElementById("titulo").textContent = "Solicitar evento";
      document.getElementById("subtitulo").textContent = "Conte como vai ser a festa. A brinquedoteca analisa a solicitação, monta o orçamento e confirma com você.";
      document.getElementById("salvar").textContent = "Enviar solicitação";
      [responsaveis, catalogo] = await Promise.all([
        chamarApi("/responsaveis/" + usuario.cod_responsavel).then((r) => [r]), chamarApi("/servicos"),
      ]);
    } else {
      [responsaveis, catalogo, funcionarios] = await Promise.all([
        chamarApi("/responsaveis"), chamarApi("/servicos"), chamarApi("/funcionarios/equipe"),
      ]);
    }
    document.getElementById("cod_responsavel").innerHTML =
      `<option value="">Escolha o responsável</option>` +
      responsaveis.map((r) => `<option value="${r.cod_responsavel}">${escapar(r.primeiro_nome + " " + r.sobrenome)} - CPF ${formatarCpf(r.cpf)}</option>`).join("");
    if (ehResponsavel) document.getElementById("cod_responsavel").value = usuario.cod_responsavel;

    if (codEvento) {
      await carregarEvento();
      conferirAgenda();
    } else {
      document.getElementById("data").min = hojeIso();
      adicionarServico();
      desenharAcoes();
    }
  } catch (erro) {
    avisar(erro.message, "erro");
  }
  irPara(1, false);
})();
