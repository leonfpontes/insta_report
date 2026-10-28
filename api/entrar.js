import { senhaConfere, cookieSessao, responder } from "./_lib.js";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use o formulário." });
  if (!senhaConfere(req.body?.senha)) {
    await espera(1200); // freia tentativa em série
    return responder(res, 401, { erro: "Senha incorreta." });
  }
  res.setHeader("Set-Cookie", cookieSessao());
  responder(res, 200, { ok: true });
}
