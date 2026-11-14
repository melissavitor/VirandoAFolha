fetch("/servicos")
  .then((r) => r.json())
  .then((dados) => {
    const lista = document.getElementById("lista");
    dados.forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s.nome + " - R$ " + s.valor;
      lista.appendChild(li);
    });
  });