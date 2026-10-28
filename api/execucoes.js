import { REPO, autorizado, responder, gh } from "./_lib.js";
import { execucao } from "../lib/painel.mjs";

const POR_PAGINA = 20;
const DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Histórico das rodadas do publicador, em páginas de 20.
 * GET /api/execucoes?pagina=1&de=2026-10-01&ate=2026-10-28 (datas no horário de Brasília, opcionais).
 */
export default async function handler(req, res) {
  if (!autorizado(req, res)) return;
  const url = new URL(req.url, "http://x");
  const pagina = Math.max(1, Math.min(50, parseInt(url.searchParams.get("pagina") || "1", 10) || 1));
  const de = url.searchParams.get("de") || "";
  const ate = url.searchParams.get("ate") || "";
  if ((de && !DIA.test(de)) || (ate && !DIA.test(ate))) return responder(res, 400, { erro: "Use datas no formato AAAA-MM-DD." });
  const ini = de ? `${de}T00:00:00-03:00` : "*";
  const fim = ate ? `${ate}T23:59:59-03:00` : "*";
  const filtro = de || ate ? `&created=${encodeURIComponent(`${ini}..${fim}`)}` : "";
  try {
    const j = await gh(`/repos/${REPO}/actions/runs?per_page=${POR_PAGINA}&page=${pagina}${filtro}`);
    responder(res, 200, {
      runs: (j.workflow_runs || []).map(execucao),
      total: j.total_count || 0,
      pagina,
      porPagina: POR_PAGINA,
    });
  } catch (error) {
    console.error(error);
    responder(res, 502, { erro: "Não consegui ler as rodadas no GitHub agora." });
  }
}
