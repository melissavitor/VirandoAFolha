// Funções de apoio usadas por todas as telas (carregue ANTES do js da tela)

// chamar a api
// Chama o back-end e já trata o erro (a mensagem vem do back-end).
// Se a sessão acabou (401), volta para a tela de entrada.
async function chamarApi(url, metodo = "GET", corpo) {
  const opcoes = { method: metodo, headers: {} };
  if (corpo !== undefined) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(corpo);
  }
  const resposta = await fetch(url, opcoes);
  let dados = {};
  try { dados = await resposta.json(); } catch (e) { /* resposta sem corpo */ }

  if (resposta.status === 401 && !location.pathname.endsWith("login.html")) {
    location.href = "login.html";
    throw new Error("Sessão encerrada.");
  }
  if (!resposta.ok) throw new Error(dados.mensagem || "Não foi possível concluir. Tente de novo.");
  return dados;
}

// avisos (toast)
function avisar(texto, tipo = "ok") {
  let area = document.getElementById("toasts");
  if (!area) {
    area = document.createElement("div");
    area.id = "toasts";
    area.className = "toasts";
    area.setAttribute("role", "status");
    area.setAttribute("aria-live", "polite");
    document.body.appendChild(area);
  }
  const el = document.createElement("div");
  el.className = "toast " + (tipo === "erro" ? "erro" : "");
  el.innerHTML = `<span>${escapar(texto)}</span><button type="button" aria-label="Fechar aviso">×</button>`;
  el.querySelector("button").onclick = () => el.remove();
  area.appendChild(el);
  setTimeout(() => el.remove(), tipo === "erro" ? 8000 : 4000);
}

// compatível com a versão antiga das telas
function mostrarMensagem(texto, tipo) { avisar(texto, tipo); }

// janelas
// Confirmação no lugar do confirm() do navegador. Uso: if (!(await confirmar("Título", "Texto", "Excluir"))) return;
function confirmar(titulo, texto, rotulo = "Confirmar", perigo = true) {
  return new Promise((resolver) => {
    const d = document.createElement("dialog");
    d.innerHTML = `
      <div class="dialogo-corpo">
        <header><h2>${escapar(titulo)}</h2></header>
        <p>${escapar(texto)}</p>
        <div class="rodape-form" style="margin-top:0">
          <button class="btn ${perigo ? "btn-perigo" : "btn-primario"}" data-ok>${escapar(rotulo)}</button>
          <button class="btn btn-suave" data-cancelar>Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(d);
    const fim = (valor) => { d.close(); d.remove(); resolver(valor); };
    d.querySelector("[data-ok]").onclick = () => fim(true);
    d.querySelector("[data-cancelar]").onclick = () => fim(false);
    d.addEventListener("cancel", (e) => { e.preventDefault(); fim(false); });
    d.showModal();
    d.querySelector("[data-cancelar]").focus();
  });
}

// texto e formatos
// Evita que texto digitado vire HTML na tela
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto == null ? "" : texto;
  return div.innerHTML;
}

// "2020-05-20" -> "20/05/2020"
function formatarData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = String(iso).slice(0, 10).split("-");
  return dia + "/" + mes + "/" + ano;
}

// "14:30:00" -> "14:30"
function formatarHora(hora) { return hora ? String(hora).slice(0, 5) : ""; }

// 37.5 -> "R$ 37,50"
function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// "11122233301" -> "111.222.333-01"
function formatarCpf(cpf) {
  const d = String(cpf || "").replace(/\D/g, "");
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : cpf || "";
}

// "31988880001" -> "(31) 98888-0001"
function formatarTelefone(tel) {
  const d = String(tel || "").replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return tel || "";
}

// minutos -> "1h 25min"
function formatarDuracao(min) {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${String(m % 60).padStart(2, "0")}min` : `${m}min`;
}

// "2022-08-09" -> "3 anos" / "8 meses"
function idadeTexto(iso) {
  if (!iso) return "";
  const nasc = new Date(iso + "T00:00:00");
  const hoje = new Date();
  let meses = (hoje.getFullYear() - nasc.getFullYear()) * 12 + hoje.getMonth() - nasc.getMonth();
  if (hoje.getDate() < nasc.getDate()) meses--;
  if (meses < 12) return meses <= 1 ? "1 mês" : meses + " meses";
  const anos = Math.floor(meses / 12);
  return anos + (anos === 1 ? " ano" : " anos");
}

function hojeIso() { return new Date().toLocaleDateString("sv-SE"); }

// cor da marca por posição (para dar variedade a fichas e avatares)
const CORES_MARCA = ["azul", "verde", "coral", "lilas", "laranja", "amarelo"];
function corDe(n) { return "cor-" + CORES_MARCA[Math.abs(Number(n) || 0) % CORES_MARCA.length]; }

function debounce(fn, ms = 250) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Botão "ocupado" enquanto a chamada roda (evita clique duplo)
async function comBotaoOcupado(botao, tarefa) {
  const texto = botao.textContent;
  botao.disabled = true;
  try { return await tarefa(); } finally { botao.disabled = false; botao.textContent = texto; }
}

// máscaras simples para os campos de CPF e telefone
function mascarar(input, formatador, tamanhoMax) {
  input.addEventListener("input", () => {
    const d = input.value.replace(/\D/g, "").slice(0, tamanhoMax);
    input.value = formatador(d);
  });
}
const mascaraCpf = (d) => d.replace(/(\d{3})(\d{0,3})(\d{0,3})(\d{0,2}).*/, (_, a, b, c, e) => [a, b && "." + b, c && "." + c, e && "-" + e].filter(Boolean).join(""));

// ---------- tabelas no celular ----------
// Copia o título de cada coluna para o data-label das células; no celular o CSS
// transforma cada linha num cartãozinho e usa esse rótulo na frente do valor.
function rotularTabelas() {
  document.querySelectorAll("table").forEach((tabela) => {
    const titulos = [...tabela.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    tabela.querySelectorAll("tbody tr").forEach((linha) => {
      [...linha.children].forEach((celula, i) => {
        if (titulos[i] && !celula.dataset.label) celula.dataset.label = titulos[i];
      });
    });
  });
}
document.addEventListener("DOMContentLoaded", () => {
  rotularTabelas();
  new MutationObserver(rotularTabelas).observe(document.body, { childList: true, subtree: true });
});
