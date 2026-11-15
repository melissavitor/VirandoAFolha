document.getElementById("logoCasa").innerHTML = logoCasa();
document.getElementById("logoPalavra").innerHTML = logoPalavra();

// quem já está logado vai direto para o início
fetch("/auth/eu").then((r) => { if (r.ok) location.href = "index.html"; });

const formulario = document.getElementById("formulario");
const caixaErro = document.getElementById("erro");

formulario.addEventListener("submit", async (e) => {
  e.preventDefault();
  caixaErro.hidden = true;
  const botao = document.getElementById("botaoEntrar");

  botao.disabled = true;
  botao.textContent = "Entrando...";
  try {
    await chamarApi("/auth/login", "POST", {
      cpf: document.getElementById("cpf").value,
      senha: document.getElementById("senha").value,
    });
    location.href = "index.html";
  } catch (erro) {
    caixaErro.textContent = erro.message;
    caixaErro.hidden = false;
    document.getElementById("senha").value = "";
    document.getElementById("senha").focus();
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
});

mascarar(document.getElementById("cpf"), mascaraCpf, 11);

// atalhos de teste: clicar no nome preenche o CPF e a senha de exemplo
document.querySelectorAll("[data-cpf]").forEach((botao) =>
  botao.addEventListener("click", () => {
    document.getElementById("cpf").value = botao.dataset.cpf;
    document.getElementById("senha").value = "folha123";
    document.getElementById("botaoEntrar").focus();
  })
);
