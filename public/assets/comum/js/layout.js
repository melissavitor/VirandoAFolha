// Monta o menu lateral e confere o login. Cada tela só precisa de:
//   <body class="carregando" data-pagina="clientes">
//     <main class="conteudo"> ... </main>
//     <script src="util.js"></script><script src="layout.js"></script><script src="clientes.js"></script>
// e, no js da tela:  const usuario = await usuarioPronto;
// (se não houver login, a pessoa é levada para login.html e o resto do código nem roda)

const ICONES = {
  casa: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5V14h4v5.5"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  maisUsuario: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M19 8v6M16 11h6"/>',
  usuarios: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M17 14c2.6 0 4.5 1.7 4.5 4.5"/>',
  festa: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m12 13 1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2-1.6-1.6L11 15z"/>',
  presente: '<rect x="3.5" y="9" width="17" height="11" rx="2"/><path d="M12 9v11M3.5 13h17"/><path d="M12 9C9 9 7 7.8 7 6.2 7 4.8 8.2 4 9.5 4 11 4 12 6 12 9Zm0 0c3 0 5-1.2 5-2.8C17 4.8 15.8 4 14.5 4 13 4 12 6 12 9Z"/>',
  cracha: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="9" cy="11" r="2.3"/><path d="M5.8 16.2c.5-1.5 1.7-2.2 3.2-2.2s2.7.7 3.2 2.2M14.5 9.5h4M14.5 13h3"/>',
  sair: '<path d="M10 4.5H6.5A2.5 2.5 0 0 0 4 7v10a2.5 2.5 0 0 0 2.5 2.5H10"/><path d="M15 8l4 4-4 4M19 12H9.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  lixo: '<path d="M4.5 7h15M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5"/>',
};

function icone(nome) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;
}

const ITENS_MENU = [
  { id: "inicio",       href: "index.html",        nome: "Início",         cor: "azul",    icone: "casa" },
  { id: "atendimentos", href: "atendimentos.html", nome: "Atendimentos",   cor: "verde",   icone: "relogio" },
  { id: "cadastro",     href: "cadastro.html",     nome: "Novo cadastro",  cor: "coral",   icone: "maisUsuario" },
  { id: "clientes",     href: "clientes.html",     nome: "Clientes",       cor: "lilas",   icone: "usuarios" },
  { id: "eventos",      href: "eventos.html",      nome: "Eventos",        cor: "laranja", icone: "festa" },
  { id: "servicos",     href: "servicos.html",     nome: "Serviços",       cor: "amarelo", icone: "presente" },
  { id: "funcionarios", href: "funcionarios.html", nome: "Funcionários",   cor: "azul",    icone: "cracha", soAdmin: true },
];

// menu do responsável (quem criou conta pelo site): só o que é dele
const ITENS_RESPONSAVEL = [
  { id: "inicio",   href: "index.html",    nome: "Início",                 cor: "azul",    icone: "casa" },
  { id: "cadastro", href: "cadastro.html", nome: "Meus dados e crianças",  cor: "coral",   icone: "maisUsuario" },
  { id: "eventos",  href: "eventos.html",  nome: "Meus eventos",           cor: "laranja", icone: "festa" },
  { id: "solicitar", href: "evento.html",  nome: "Solicitar evento",       cor: "amarelo", icone: "presente" },
];

function marcaMenu() {
  return `<a class="menu-marca" href="index.html" aria-label="Virando a Folha, ir para o início">
    ${logoCasa()}
    <div><strong>Virando a Folha</strong><span>Brinquedoteca Barreiro</span></div>
  </a>`;
}

let _resolverUsuario;
const usuarioPronto = new Promise((resolve) => (_resolverUsuario = resolve));

async function montarCasca() {
  let usuario;
  try {
    const r = await fetch("/auth/eu");
    if (!r.ok) throw new Error("sem login");
    usuario = await r.json();
  } catch (e) {
    location.href = "login.html";
    return;
  }

  const paginaAtual = document.body.dataset.pagina;
  const principal = document.querySelector("main.conteudo");

  const ehResponsavel = usuario.perfil === "RESPONSAVEL";
  // responsável que tenta abrir uma tela da equipe volta para o início
  if (ehResponsavel && !ITENS_RESPONSAVEL.some((i) => i.id === paginaAtual)) {
    location.href = "index.html";
    return;
  }
  const itens = ehResponsavel ? ITENS_RESPONSAVEL : ITENS_MENU.filter((i) => !i.soAdmin || usuario.perfil === "ADMIN");
  const menu = document.createElement("aside");
  menu.className = "menu";
  menu.id = "menu";
  menu.innerHTML = `
    <button type="button" class="menu-fechar" id="menuFechar" aria-label="Fechar menu">×</button>
    ${marcaMenu()}
    <nav aria-label="Menu principal">
      <ul class="menu-lista">
        ${itens.map((i) => `
          <li><a href="${i.href}" class="cor-${i.cor}" ${i.id === paginaAtual ? 'aria-current="page"' : ""}>
            <span class="icone">${icone(i.icone)}</span>${i.nome}</a></li>`).join("")}
      </ul>
    </nav>
    <div class="menu-rodape">
      <div class="usuario">
        <span class="avatar" aria-hidden="true">${escapar(usuario.nome.charAt(0).toUpperCase())}</span>
        <div><strong>${escapar(usuario.nome)}</strong><span>${escapar(usuario.funcao)}</span></div>
      </div>
      <button type="button" class="btn btn-suave btn-pequeno" id="botaoSair">${icone("sair")} Sair</button>
    </div>`;

  const topo = document.createElement("header");
  topo.className = "barra-topo";
  topo.innerHTML = `${marcaMenu()}
    <button type="button" class="btn btn-suave btn-pequeno" id="botaoMenu" aria-controls="menu" aria-expanded="false">${icone("menu")} Menu</button>`;

  const casca = document.createElement("div");
  casca.className = "casca";
  const area = document.createElement("div");
  area.className = "conteudo-area";
  area.append(topo, principal);
  casca.append(menu, area);
  document.body.prepend(casca);

  const botaoMenu = topo.querySelector("#botaoMenu");
  botaoMenu.addEventListener("click", (e) => {
    e.stopPropagation();   // senão o clique sobe até a área e fecha o menu na hora
    const aberto = document.body.classList.toggle("menu-aberto");
    botaoMenu.setAttribute("aria-expanded", aberto);
  });
  const fecharMenu = () => { document.body.classList.remove("menu-aberto"); botaoMenu.setAttribute("aria-expanded", "false"); };
  area.addEventListener("click", fecharMenu);
  menu.querySelector("#menuFechar").addEventListener("click", fecharMenu);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.body.classList.remove("menu-aberto"); });

  menu.querySelector("#botaoSair").addEventListener("click", async () => {
    await fetch("/auth/logout", { method: "POST" });
    location.href = "login.html";
  });

  document.body.classList.remove("carregando");
  _resolverUsuario(usuario);
}

montarCasca();
