let familias = [];

function semAcento(t) {
  return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function desenhar() {
  const termo = semAcento(document.getElementById("busca").value.trim());
  const digitos = termo.replace(/\D/g, "");

  const visiveis = familias.filter((f) => {
    if (!termo) return true;
    const texto = semAcento([f.primeiro_nome, f.sobrenome, ...f.criancas.map((c) => c.nome)].join(" "));
    if (texto.includes(termo)) return true;
    if (digitos.length >= 3) {
      return f.cpf.includes(digitos) || f.telefones.some((t) => t.includes(digitos));
    }
    return false;
  });

  document.getElementById("resumo").textContent =
    `${familias.length} ${familias.length === 1 ? "família cadastrada" : "famílias cadastradas"}.`;

  const lista = document.getElementById("lista");
  if (visiveis.length === 0) {
    lista.innerHTML = `<div class="cartao vazio"><strong>${termo ? "Ninguém encontrado" : "Nenhum cliente ainda"}</strong>
      <p>${termo ? "Confira a escrita ou tente só uma parte do nome." : "Comece cadastrando o primeiro responsável e suas crianças."}</p>
      ${termo ? "" : '<a class="btn btn-primario" href="cadastro.html">Novo cadastro</a>'}</div>`;
    return;
  }

  lista.innerHTML = visiveis.map((f) => `
    <article class="cartao familia ${corDe(f.cod_responsavel)}">
      <div class="familia-topo">
        <span class="avatar-familia" aria-hidden="true">${escapar(f.primeiro_nome.charAt(0))}</span>
        <div class="dados">
          <h3>${escapar(f.primeiro_nome)} ${escapar(f.sobrenome)}</h3>
          <p class="suave pequeno">CPF ${formatarCpf(f.cpf)}${f.telefones.length ? " - " + escapar(f.telefones.map(formatarTelefone).join(" / ")) : ""}</p>
          <p class="suave pequeno">${escapar(f.rua)}, ${escapar(f.numero)} - ${escapar(f.bairro)}, ${escapar(f.cidade)}</p>
        </div>
        <div class="acoes">
          <a class="btn btn-suave btn-pequeno" href="cadastro.html?resp=${f.cod_responsavel}&nova=1">Adicionar criança</a>
          <a class="btn btn-suave btn-pequeno" href="cadastro.html?resp=${f.cod_responsavel}">Editar</a>
          <button class="btn btn-perigo btn-pequeno" data-excluir="${f.cod_responsavel}">Excluir</button>
        </div>
      </div>
      <div class="familia-criancas">
        ${f.criancas.length
          ? f.criancas.map((c) => `
            <span class="crianca-pilula">${escapar(c.nome)} <span class="pequeno">· ${idadeTexto(c.data_nascimento)}</span>
              <button type="button" onclick="location.href='cadastro.html?resp=${f.cod_responsavel}'" aria-label="Editar ${escapar(c.nome)}">Editar</button></span>`).join("")
          : `<span class="suave pequeno">Nenhuma criança cadastrada.</span>`}
      </div>
    </article>`).join("");

  lista.querySelectorAll("[data-excluir]").forEach((b) => (b.onclick = () => excluir(Number(b.dataset.excluir))));
}

async function excluir(cod) {
  const f = familias.find((x) => x.cod_responsavel === cod);
  const aviso = f.criancas.length
    ? `${f.primeiro_nome} e ${f.criancas.length === 1 ? "a criança vinculada" : "as " + f.criancas.length + " crianças vinculadas"} serão removidos. Se já houver atendimentos ou eventos, a exclusão não é permitida.`
    : `${f.primeiro_nome} ${f.sobrenome} será removido(a).`;
  if (!(await confirmar("Excluir este cadastro?", aviso, "Excluir"))) return;
  try {
    avisar((await chamarApi("/responsaveis/" + cod, "DELETE")).mensagem);
  } catch (erro) {
    avisar(erro.message, "erro");
  }
  carregar();
}

async function carregar() {
  try {
    const [responsaveis, criancas] = await Promise.all([chamarApi("/responsaveis"), chamarApi("/criancas")]);
    familias = responsaveis.map((r) => ({ ...r, criancas: criancas.filter((c) => c.cod_responsavel === r.cod_responsavel) }));
    desenhar();
  } catch (erro) {
    avisar(erro.message, "erro");
  }
}

(async function iniciar() {
  await usuarioPronto;
  const aviso = sessionStorage.getItem("avisoClientes");
  if (aviso) { avisar(aviso); sessionStorage.removeItem("avisoClientes"); }
  document.getElementById("busca").addEventListener("input", debounce(desenhar, 150));
  carregar();
})();
