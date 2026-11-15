const CAMPOS = ["cpf", "primeiro_nome", "sobrenome", "sexo", "data_nascimento", "rua", "numero", "bairro", "cidade", "telefones"];
const params = new URLSearchParams(location.search);
let codEdicao = params.get("resp");   // se existir, estamos editando
let ehResponsavel = false;          // responsável logado edita só o próprio cadastro
let contador = 0;                         // dá um id único a cada bloco de criança

document.getElementById("data_nascimento").max = hojeIso();
mascarar(document.getElementById("cpf"), mascaraCpf, 11);

// blocos de criança
function adicionarCrianca(dados = {}) {
  const n = ++contador;
  const bloco = document.createElement("div");
  bloco.className = "bloco-crianca";
  bloco.dataset.num = dados.num_sequencial || "";   // vazio = criança nova
  bloco.innerHTML = `
    <div class="bloco-crianca-topo">
      <h3>${dados.nome ? escapar(dados.nome) : "Nova criança"}</h3>
      <button type="button" class="btn btn-perigo btn-pequeno" data-remover>${dados.num_sequencial ? "Excluir criança" : "Tirar"}</button>
    </div>
    <div class="grade-form">
      <label class="campo c6"><span>Nome completo</span><input type="text" data-c="nome" value="${escapar(dados.nome || "")}" required></label>
      <label class="campo c6"><span>Data de nascimento</span><input type="date" data-c="data_nascimento" max="${hojeIso()}" value="${dados.data_nascimento || ""}" required></label>
      <div class="campo c12 segundo-resp">
        <span>Segundo responsável</span>
        <div class="segundo-resp-linha">
          <strong data-adic-nome></strong>
          <button type="button" class="btn btn-suave btn-pequeno" data-adic-novo></button>
          <button type="button" class="btn btn-suave btn-pequeno" data-adic-remover>Remover</button>
        </div>
        <small data-adic-dica></small>
      </div>
      <label class="campo c12"><span>Observações sobre a criança</span><textarea data-c="observacoes" rows="2" placeholder="Alergias, medicamentos, cuidados especiais, o que ela gosta...">${escapar(dados.observacoes || "")}</textarea></label>
    </div>`;
  document.getElementById("criancas").appendChild(bloco);
  configurarSegundoResponsavel(bloco, dados);

  bloco.querySelector("[data-remover]").onclick = async () => {
    if (bloco.dataset.num) {
      if (!(await confirmar("Excluir esta criança?", "Os dados dela serão apagados. Se ela já tem atendimentos, não será possível excluir.", "Excluir"))) return;
      try {
        avisar((await chamarApi(`/criancas/${codEdicao}/${bloco.dataset.num}`, "DELETE")).mensagem);
      } catch (erro) { return avisar(erro.message, "erro"); }
    }
    bloco.remove();
  };
  return bloco;
}

// criança de outro responsável em que esta pessoa é o segundo responsável (só leitura)
function mostrarCriancaCompartilhada(f) {
  const bloco = document.createElement("div");
  bloco.className = "bloco-crianca";
  bloco.innerHTML = `
    <div class="bloco-crianca-topo"><h3>${escapar(f.nome)}</h3><span class="selo cor-lilas">Você é o segundo responsável</span></div>
    <p class="suave" style="margin:0">${idadeTexto(f.data_nascimento)} · Responsável principal: ${escapar(f.responsavel_nome)}</p>
    ${f.observacoes ? `<p style="margin:8px 0 0">${escapar(f.observacoes)}</p>` : ""}
    <p class="suave pequeno" style="margin:8px 0 0">Só o responsável principal pode alterar os dados desta criança.</p>`;
  document.getElementById("criancas").appendChild(bloco);
}

// ---- segundo responsável (cada criança pode ter até 2 responsáveis) ----
function configurarSegundoResponsavel(bloco, dados) {
  const codCrianca = () => bloco.dataset.num;
  const nomeEl = bloco.querySelector("[data-adic-nome]");
  const novo = bloco.querySelector("[data-adic-novo]");
  const remover = bloco.querySelector("[data-adic-remover]");
  const dica = bloco.querySelector("[data-adic-dica]");
  let atual = dados.cod_responsavel_adicional || null;

  const desenhar = (nome) => {
    const salva = !!codCrianca();
    nomeEl.textContent = atual ? nome : "Nenhum";
    novo.textContent = atual ? "Trocar" : "Adicionar responsável";
    novo.disabled = !salva;
    remover.style.display = atual ? "" : "none";
    dica.textContent = salva
      ? "Outra pessoa que também responde por esta criança (pai, mãe, avó...). No máximo um segundo responsável."
      : "Salve o cadastro primeiro; depois você poderá adicionar o segundo responsável.";
  };
  desenhar(dados.responsavel_adicional_nome);

  novo.onclick = async () => {
    const r = await abrirFormularioResponsavel();
    if (!r) return;
    try {
      const resp = await chamarApi(`/criancas/${codEdicao}/${codCrianca()}/adicional`, "PUT", r);
      atual = resp.cod_responsavel;
      desenhar(resp.nome);
      avisar(resp.mensagem);
    } catch (erro) { avisar(erro.message, "erro"); }
  };
  remover.onclick = async () => {
    if (!(await confirmar("Remover segundo responsável?", "A pessoa continua cadastrada, só deixa de estar ligada a esta criança.", "Remover"))) return;
    try {
      avisar((await chamarApi(`/criancas/${codEdicao}/${codCrianca()}/adicional`, "DELETE")).mensagem);
      atual = null;
      desenhar();
    } catch (erro) { avisar(erro.message, "erro"); }
  };
  bloco.recarregarSegundo = (cod, nome) => { atual = cod; desenhar(nome); };
}

// janela para cadastrar o segundo responsável. Devolve os dados ou null se cancelar.
// Se o CPF já estiver cadastrado, só ele basta (a pessoa é apenas ligada à criança).
function abrirFormularioResponsavel() {
  const principal = {
    rua: document.getElementById("rua").value, numero: document.getElementById("numero").value,
    bairro: document.getElementById("bairro").value, cidade: document.getElementById("cidade").value,
  };
  return new Promise((resolver) => {
    const d = document.createElement("dialog");
    d.innerHTML = `
      <form class="dialogo-corpo" novalidate>
        <header><div><h2>Segundo responsável</h2>
          <p>Digite o CPF: se a pessoa já tem cadastro, os dados aparecem sozinhos. Se não, preencha os dados dela.</p></div></header>
        <div class="grade-form">
          <label class="campo c12"><span>CPF</span><input type="text" name="cpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" required></label>
          <p class="c12 aviso-achou" data-achou hidden></p>
          <div class="c12 grade-form" data-novos style="padding:0">
            <label class="campo c6"><span>Primeiro nome</span><input type="text" name="primeiro_nome" autocomplete="off"></label>
            <label class="campo c6"><span>Sobrenome</span><input type="text" name="sobrenome" autocomplete="off"></label>
            <label class="campo c6"><span>Sexo</span><select name="sexo"><option value="">Escolha</option><option value="F">Feminino</option><option value="M">Masculino</option><option value="O">Outro</option></select></label>
            <label class="campo c6"><span>Data de nascimento</span><input type="date" name="data_nascimento" max="${hojeIso()}"></label>
            <label class="campo c12"><span>Telefones</span><input type="text" name="telefones" inputmode="tel" placeholder="(31) 98888-0001"><small>Separe vários por vírgula.</small></label>
            <p class="c12" style="margin:0;color:var(--tinta-suave,#666)"><small>O endereço será o mesmo do responsável principal.</small></p>
            <label class="campo c12"><span>Senha para entrar no site (opcional)</span><input type="password" name="senha" autocomplete="new-password" placeholder="Mínimo 6 caracteres"><small>Com senha, essa pessoa também poderá entrar com o CPF e acompanhar a criança.</small></label>
          </div>
        </div>
        <div class="rodape-form" style="margin-top:0">
          <button type="submit" class="btn btn-primario">Salvar responsável</button>
          <button type="button" class="btn btn-suave" data-cancelar>Cancelar</button>
        </div>
      </form>`;
    document.body.appendChild(d);
    const f = d.querySelector("form");
    const cpf = f.elements.cpf;
    mascarar(cpf, mascaraCpf, 11);
    const fim = (v) => { d.close(); d.remove(); resolver(v); };

    // ao completar o CPF, procura se a pessoa já está cadastrada e preenche
    const campos = ["primeiro_nome", "sobrenome", "sexo", "data_nascimento", "telefones", "senha"];
    const aviso = d.querySelector("[data-achou]");
    let cpfBuscado = "";
    const liberar = () => campos.forEach((c) => { f.elements[c].disabled = false; });
    cpf.addEventListener("input", async () => {
      const num = cpf.value.replace(/\D/g, "");
      if (num.length < 11) { cpfBuscado = ""; aviso.hidden = true; liberar(); return; }
      if (num === cpfBuscado) return;
      cpfBuscado = num;
      try {
        const r = await chamarApi("/criancas/buscar-responsavel/" + num);
        if (num !== cpfBuscado) return;
        if (r.encontrado) {
          f.elements.primeiro_nome.value = r.primeiro_nome;
          f.elements.sobrenome.value = r.sobrenome;
          if (r.sexo) f.elements.sexo.value = r.sexo;
          if (r.data_nascimento) f.elements.data_nascimento.value = r.data_nascimento;
          campos.forEach((c) => { f.elements[c].disabled = true; });
          aviso.textContent = `${r.primeiro_nome} ${r.sobrenome} já tem cadastro. É só salvar para ligar à criança.`;
          aviso.hidden = false;
        } else { aviso.hidden = true; liberar(); f.elements.primeiro_nome.focus(); }
      } catch (erro) { aviso.hidden = true; liberar(); avisar(erro.message, "erro"); }
    });

    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const dados = {};
      new FormData(f).forEach((v, k) => (dados[k] = v));
      dados.cpf = dados.cpf.replace(/\D/g, "");
      if (dados.cpf.length !== 11) { cpf.focus(); return avisar("Informe o CPF com 11 dígitos.", "erro"); }
      fim(dados);
    });
    d.querySelector("[data-cancelar]").onclick = () => fim(null);
    d.addEventListener("cancel", (e) => { e.preventDefault(); fim(null); });
    d.showModal();
    cpf.focus();
  });
}

document.getElementById("botaoAddCrianca").addEventListener("click", () => {
  const b = adicionarCrianca();
  b.querySelector("input").focus();
});

function lerBloco(bloco) {
  const d = {};
  bloco.querySelectorAll("[data-c]").forEach((el) => (d[el.dataset.c] = el.value));
  return d;
}

// salvar
document.getElementById("formulario").addEventListener("submit", async (e) => {
  e.preventDefault();
  const botao = document.getElementById("botaoSalvar");

  // confere o que o navegador sabe conferir (campos obrigatórios) e mostra o primeiro problema
  const invalido = [...e.target.querySelectorAll("input, select, textarea")].find((el) => !el.checkValidity());
  if (invalido) { invalido.reportValidity(); return; }

  const dados = {};
  CAMPOS.forEach((c) => (dados[c] = document.getElementById(c).value));
  const blocos = [...document.querySelectorAll(".bloco-crianca")];

  let codigo = codEdicao;
  try {
    await comBotaoOcupado(botao, async () => {
      botao.textContent = "Salvando...";
      if (codEdicao) {
        await chamarApi("/responsaveis/" + codEdicao, "PUT", dados);
      } else {
        const r = await chamarApi("/responsaveis", "POST", dados);
        codigo = r.cod_responsavel;
      }

      // crianças: as que já existem são atualizadas; as novas, criadas
      for (const bloco of blocos) {
        const c = lerBloco(bloco);
        try {
          if (bloco.dataset.num) await chamarApi(`/criancas/${codigo}/${bloco.dataset.num}`, "PUT", c);
          else await chamarApi("/criancas", "POST", { ...c, cod_responsavel: codigo });
        } catch (erro) {
          // o responsável já foi gravado: segue para a edição, onde dá para corrigir a criança
          sessionStorage.setItem("avisoCadastro", `Responsável salvo, mas a criança "${c.nome}" não foi: ${erro.message}`);
          location.href = "cadastro.html?resp=" + codigo;
          throw new Error("redirecionando");
        }
      }
    });
    if (ehResponsavel) {
      sessionStorage.setItem("avisoInicio", "Dados salvos!");
      location.href = "index.html";
      return;
    }
    sessionStorage.setItem("avisoClientes", codEdicao ? "Cadastro atualizado!" : "Cadastro realizado!");
    location.href = "clientes.html";
  } catch (erro) {
    if (erro.message !== "redirecionando") avisar(erro.message, "erro");
  }
});

// início
(async function iniciar() {
  const usuario = await usuarioPronto;
  try {
    ehResponsavel = usuario.perfil === "RESPONSAVEL";
    if (ehResponsavel) {
      codEdicao = String(usuario.cod_responsavel);
      document.querySelectorAll('a[href="clientes.html"]').forEach((a) => (a.href = "index.html"));
      document.querySelector(".cabecalho-pagina .acoes a").textContent = "Voltar para o início";
      document.getElementById("tResp").textContent = "Meus dados";
      document.getElementById("botaoSalvar").textContent = "Salvar";
      const boasVindas = sessionStorage.getItem("avisoBoasVindas");
      if (boasVindas) { avisar(boasVindas); sessionStorage.removeItem("avisoBoasVindas"); }
    }

    const aviso = sessionStorage.getItem("avisoCadastro");
    if (aviso) { avisar(aviso, "erro"); sessionStorage.removeItem("avisoCadastro"); }

    if (codEdicao) {
      const r = await chamarApi("/responsaveis/" + codEdicao);
      document.getElementById("titulo").textContent = ehResponsavel ? "Meus dados e crianças" : "Editar cadastro";
      document.getElementById("subtitulo").textContent = ehResponsavel
        ? "Mantenha seus dados em dia e cadastre as crianças que vão frequentar a brinquedoteca."
        : `${r.primeiro_nome} ${r.sobrenome} e suas crianças.`;
      document.getElementById("cod_responsavel").value = r.cod_responsavel;
      CAMPOS.forEach((c) => {
        document.getElementById(c).value = c === "telefones" ? r.telefones.map(formatarTelefone).join(", ") : c === "cpf" ? formatarCpf(r.cpf) : r[c];
      });
      document.getElementById("cpf").readOnly = true;   // o CPF não muda

      const filhos = await chamarApi("/criancas?responsavel=" + codEdicao);
      // aqui só as crianças deste responsável (as em que ele é o 2º responsável ficam só para consulta)
      filhos.filter((f) => String(f.cod_responsavel) === String(codEdicao)).forEach((f) => adicionarCrianca(f));
      // crianças em que ele é o segundo responsável: aparecem só para consulta
      filhos.filter((f) => String(f.cod_responsavel) !== String(codEdicao)).forEach(mostrarCriancaCompartilhada);
      if (params.get("nova")) {
        const b = adicionarCrianca();
        b.scrollIntoView({ behavior: "smooth", block: "center" });
        b.querySelector("input").focus();
      }
    } else {
      adicionarCrianca();
    }
  } catch (erro) {
    avisar(erro.message, "erro");
  }
})();