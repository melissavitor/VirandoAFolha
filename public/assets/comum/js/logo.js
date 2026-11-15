// Logo da marca (casinha + palavra em blocos). Usado na tela de entrada e no menu.
function logoCasa() {
  return `
  <svg class="marca-casa" viewBox="0 0 100 100" role="img" aria-label="Brinquedoteca Barreiro">
    <path d="M24 80V51.5q0-5 4-8l18-14q4-3 8 0l18 14q4 3 4 8V80q0 5.5-5.5 5.5h-41Q24 85.5 24 80Z" fill="none" stroke="#679B72" stroke-width="6.5" stroke-linejoin="round"/>
    <path d="M50 72C38 63 35 55 41 51.5c4-2.2 7.5-.4 9 2.5 1.5-2.9 5-4.7 9-2.5 6 3.5 3 11.5-9 20.5Z" fill="none" stroke="#E86F63" stroke-width="5" stroke-linejoin="round"/>
    <path d="M50 8v9" stroke="#E86F63" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M32 12.5l4.5 7.5" stroke="#EDC047" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M68 12.5 63.5 20" stroke="#8F80A8" stroke-width="5.5" stroke-linecap="round"/>
  </svg>`;
}

// "BRINQUEDOTECA" em 13 blocos coloridos (as cores ficam no style.css)
function logoPalavra() {
  return `<span class="palavra" aria-hidden="true">${"BRINQUEDOTECA".split("").map((l) => `<b>${l}</b>`).join("")}</span>`;
}
