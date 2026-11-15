document.getElementById("logoCasa").innerHTML = logoCasa();
document.getElementById("logoPalavra").innerHTML = logoPalavra();

mascarar(document.getElementById("cpf"), mascaraCpf, 11);
document.getElementById("data_nascimento").max = hojeIso();

const caixaErro = document.getElementById("erro");
const CAMPOS = ["cpf", "primeiro_nome", "sobrenome", "sexo", "data_nascimento", "telefones", "rua", "numero", "bairro", "cidade", "senha"];

document.getElementById("formulario").addEventListener("submit", async (e) => {
  e.preventDefault();
  caixaErro.hidden = true;

  const invalido = [...e.target.querySelectorAll("input, select")].find((el) => !el.checkValidity());
  if (invalido) { invalido.reportValidity(); return; }
  if (document.getElementById("senha").value !== document.getElementById("senha2").value) {
    caixaErro.textContent = "As duas senhas não são iguais.";
    caixaErro.hidden = false;
    return;
  }

  const dados = {};
  CAMPOS.forEach((c) => (dados[c] = document.getElementById(c).value));
  const botao = document.getElementById("botaoCriar");
  try {
    await comBotaoOcupado(botao, () => chamarApi("/auth/cadastro", "POST", dados));
    // conta criada e já logada: o próximo passo é cadastrar as crianças
    sessionStorage.setItem("avisoBoasVindas", "Conta criada! Agora cadastre as crianças.");
    location.href = "cadastro.html?nova=1";
  } catch (erro) {
    caixaErro.textContent = erro.message;
    caixaErro.hidden = false;
    caixaErro.scrollIntoView({ block: "center" });
  }
});
