// Regras do responsável logado (perfil RESPONSAVEL).
// Ele só mexe no que é dele: seu cadastro, suas crianças e seus eventos.
// Tudo que não está liberado aqui (atendimentos, painel, funcionários...) é negado.
const db = require("../db");

function negar(res, mensagem = "Essa área é só para a equipe da brinquedoteca.") {
  return res.status(403).json({ mensagem });
}

async function portalResponsavel(req, res, next) {
  try {
    if (req.usuario.perfil !== "RESPONSAVEL") return next();
    const meu = req.usuario.cod_responsavel;
    const partes = req.path.split("/").filter(Boolean);
    const [area, id, extra] = partes;
    const m = req.method;

    // catálogo de serviços (só leitura) e agenda (só mostra que o dia está ocupado)
    if (area === "servicos" && m === "GET") return next();

    if (area === "responsaveis" && id === String(meu) && partes.length === 2 && (m === "GET" || m === "PUT")) return next();

    if (area === "criancas") {
      if (m === "GET" && partes.length === 1) { req.filtroResponsavel = meu; return next(); }
      if (m === "POST" && partes.length === 1) { req.body.cod_responsavel = meu; return next(); }
      // consulta de CPF ao cadastrar o 2º responsável (devolve só o nome, ver routes/criancas.js)
      if (m === "GET" && id === "buscar-responsavel" && partes.length === 3) { req.filtroResponsavel = meu; return next(); }
      if (id === String(meu) && partes.length === 3 && ["GET", "PUT", "DELETE"].includes(m)) return next();
      // 2º responsável da criança dele
      if (id === String(meu) && partes.length === 4 && extra && partes[3] === "adicional" && ["PUT", "DELETE"].includes(m)) return next();
      return negar(res, "Você só pode mexer nas suas crianças.");
    }

    // o preço dos serviços vem sempre do catálogo; quem ajusta valor é a coordenação
    const travarPrecos = () => {
      if (Array.isArray(req.body.servicos)) req.body.servicos.forEach((sv) => (sv.valor_servico = null));
    };

    if (area === "eventos") {
      if (m === "GET" && id === "agenda") return next();
      if (m === "GET" && partes.length === 1) { req.filtroResponsavel = meu; return next(); }
      if (m === "POST" && partes.length === 1) {
        req.body.cod_responsavel = meu;
        req.body.equipe = [];   // a equipe quem escala é a coordenação
        travarPrecos();
        return next();
      }
      if (/^\d+$/.test(id || "") && (partes.length === 2 || (partes.length === 3 && extra === "status"))) {
        const [[evento]] = await db.query("SELECT cod_responsavel, status FROM EVENTO WHERE cod_evento = ?", [id]);
        if (!evento || evento.cod_responsavel !== meu) return negar(res, "Evento não encontrado.");
        if (m === "GET") return next();
        if (evento.status !== "ORCAMENTO") return negar(res, "Esse evento já foi confirmado ou cancelado. Fale com a brinquedoteca para mudar algo.");
        if (m === "PUT") {
          const [equipe] = await db.query(
            "SELECT cod_funcionario, funcao_evento, horario_atuacao FROM PARTICIPACAO WHERE cod_evento = ?", [id]);
          req.body.cod_responsavel = meu;
          req.body.equipe = equipe;   // mantém a equipe que a coordenação já escalou
          travarPrecos();
          return next();
        }
        if (m === "DELETE") return next();
        if (m === "POST" && extra === "status" && req.body.status === "CANCELADO") return next();
      }
    }

    return negar(res);
  } catch (erro) {
    next(erro);
  }
}

module.exports = portalResponsavel;