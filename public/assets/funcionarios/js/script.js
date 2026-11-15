const CAMPOS = ["cpf", "primeiro_nome", "sobrenome", "sexo", "data_nascimento", "rua", "numero", "bairro", "cidade", "telefones", "funcao", "cod_supervisor"];
let usuario;
let funcionarios = [];
const dialogo = document.getElementById("dialogo");
mascarar(document.getElementById("cpf"), mascaraCpf, 11);

async function carregar() {
  try {
    funcionarios = await chamarApi("/funcionarios");
    document.getElementById("vazio").hidden = funcionarios.length > 0;
    document.getElementById("lista").innerHTML = funcionarios.map((f) => {
      const papeis = [f.recepcionista ? `<span class="selo cor-verde">Recepção</span>` : "", f.monitor ? `<span class="selo cor-lilas">Monitoria</span>` : ""].join(" ") || `<span class="suave">—</span>`;
      const acesso = f.tem_acesso
        ? `<span class="selo ${f.perfil === "ADMIN" ? "cor-azul" : "cor-amarelo"}">${f.perfil === "ADMIN" ? "Coordenação" : "Funcionário"}</span>`
        : `<span class="suave">Sem acesso</span>`;
      return `<tr>
        <td><span class="nome-forte">${escapar(f.primeiro_nome)} ${escapar(f.sobrenome)}</span><br><span class="suave pequeno">${escapar(f.telefones.map(formatarTelefone).join(" / "))}</span></td>
        <td>${escapar(f.funcao)}</td>
        <td>${papeis}</td>
        <td>${escapar(f.supervisor_nome || "—")}</td>
        <td>${acesso}</td>
        <td><div class="celula-acoes">
          <button class="btn btn-suave btn-pequeno" data-editar="${f.cod_funcionario}">Editar</button>
          <button class="btn btn-perigo btn-pequeno" data-excluir="${f.cod_funcionario}">Excluir</button></div></td>
      </tr>`;
    }).join("");
    document.querySelectorAll("[data-editar]").forEach((b) => (b.onclick = () => abrir(Number(b.dataset.editar))));
    document.querySelectorAll("[data-excluir]").forEach((b) => (b.onclick = () => excluir(Number(b.dataset.excluir))));
  } catch (erro) {
    avisar(erro.message, "erro");
  }
}

function abrir(cod) {
  const f = funcionarios.find((x) => x.cod_funcionario === cod);
  document.getElementById("formulario").reset();
  document.getElementById("cod_funcionario").value = f ? f.cod_funcionario : "";
  document.getElementById("tituloDialogo").textContent = f ? "Editar funcionário" : "Novo funcionário";
  document.getElementById("cpf").readOnly = !!f;

  // supervisor: qualquer funcionário, menos ele mesmo
  document.getElementById("cod_supervisor").innerHTML =
    `<option value="">Sem supervisor</option>` +
    funcionarios.filter((x) => x.cod_funcionario !== cod).map((x) => `<option value="${x.cod_funcionario}">${escapar(x.primeiro_nome + " " + x.sobrenome)}</option>`).join("");

  if (f) {
    CAMPOS.forEach((c) => {
      const el = document.getElementById(c);
      el.value = c === "telefones" ? f.telefones.map(formatarTelefone).join(", ") : c === "cpf" ? formatarCpf(f.cpf) : f[c] ?? "";
    });
    document.getElementById("recepcionista").checked = f.recepcionista;
    document.getElementById("monitor").checked = f.monitor;
    document.getElementById("perfil").value = f.perfil || "FUNCIONARIO";
    document.getElementById("dicaSenha").textContent = f.tem_acesso ? "Deixe em branco para manter a senha atual." : "Mínimo 6 caracteres.";
  } else {
    document.getElementById("cidade").value = "Belo Horizonte";
    document.getElementById("dicaSenha").textContent = "Mínimo 6 caracteres.";
  }
  dialogo.showModal();
  document.getElementById("primeiro_nome").focus();
}

document.getElementById("botaoNovo").onclick = () => abrir();
document.getElementById("fechar").onclick = () => dialogo.close();
document.getElementById("cancelar").onclick = () => dialogo.close();

document.getElementById("formulario").addEventListener("submit", async (e) => {
  e.preventDefault();
  const invalido = [...e.target.querySelectorAll("input, select")].find((el) => !el.checkValidity());
  if (invalido) return invalido.reportValidity();

  const id = document.getElementById("cod_funcionario").value;
  const dados = {};
  CAMPOS.forEach((c) => (dados[c] = document.getElementById(c).value));
  dados.recepcionista = document.getElementById("recepcionista").checked;
  dados.monitor = document.getElementById("monitor").checked;

  const senha = document.getElementById("senha").value;

  try {
    await comBotaoOcupado(document.getElementById("botaoSalvar"), async () => {
      const r = await chamarApi(id ? "/funcionarios/" + id : "/funcionarios", id ? "PUT" : "POST", dados);
      const cod = id || r.cod_funcionario;
      const jaTemAcesso = id && funcionarios.find((x) => String(x.cod_funcionario) === String(id)).tem_acesso;
      if (senha || jaTemAcesso) {
        try {
          await chamarApi(`/funcionarios/${cod}/acesso`, "PUT", { senha, perfil: document.getElementById("perfil").value });
        } catch (erro) {
          avisar("Funcionário salvo, mas o acesso não: " + erro.message, "erro");
          dialogo.close();
          carregar();
          throw new Error("tratado");
        }
      }
      avisar(r.mensagem);
    });
    dialogo.close();
    carregar();
  } catch (erro) {
    if (erro.message !== "tratado") avisar(erro.message, "erro");
  }
});

async function excluir(cod) {
  const f = funcionarios.find((x) => x.cod_funcionario === cod);
  if (!(await confirmar("Excluir este funcionário?", `${f.primeiro_nome} ${f.sobrenome} será removido(a), junto com o acesso ao sistema. Se já houver atendimentos ou eventos com a pessoa, a exclusão não é permitida.`, "Excluir"))) return;
  try {
    avisar((await chamarApi("/funcionarios/" + cod, "DELETE")).mensagem);
  } catch (erro) {
    avisar(erro.message, "erro");
  }
  carregar();
}

(async function iniciar() {
  usuario = await usuarioPronto;
  if (usuario.perfil !== "ADMIN") { location.href = "index.html"; return; }
  carregar();
})();
