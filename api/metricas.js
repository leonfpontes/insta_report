import { autorizado, responder, disparar } from "./_lib.js";

// "Atualizar números": roda a coleta de métricas fora da hora.
export default async function handler(req, res) {
  if (!autorizado(req, res, { acao: true })) return;
  try {
    await disparar("metricas.yml");
    responder(res, 202, { ok: true });
  } catch (error) {
    console.error(error);
    responder(res, 502, { erro: "Não consegui acionar a coleta agora." });
  }
}
