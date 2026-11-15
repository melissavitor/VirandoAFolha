const db = require("../db");

// Executa vários comandos SQL como um só: ou tudo dá certo, ou nada é gravado.
// Uso:  await transacao(async (conn) => { await conn.query(...); await conn.query(...); });
async function transacao(callback) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await callback(conn);
    await conn.commit();
    return resultado;
  } catch (erro) {
    await conn.rollback();
    throw erro;
  } finally {
    conn.release();
  }
}

module.exports = transacao;
