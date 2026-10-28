import { cookieSair, responder } from "./_lib.js";

export default function handler(req, res) {
  if (req.method !== "POST") return responder(res, 405, { erro: "Use o botão do painel." });
  res.setHeader("Set-Cookie", cookieSair);
  responder(res, 200, { ok: true });
}
