import { REPO, autorizado, responder, gh, lerJson } from "./_lib.js";
import { montar } from "../lib/painel.mjs";

export default async function handler(req, res) {
  if (!autorizado(req, res)) return;
  try {
    const [agenda, metricas, runs, pedidos] = await Promise.all([
      lerJson("instagram/agenda.json"),
      lerJson("instagram/metricas.json").catch(() => ({ dados: { contas: {} } })),
      gh(`/repos/${REPO}/actions/runs?per_page=30`).catch(() => ({ workflow_runs: [] })),
      lerJson("instagram/pedidos.json").catch(() => ({ dados: { pedidos: [] } })),
    ]);
    responder(res, 200, montar({ agenda: agenda.dados, metricas: metricas.dados, runs: runs.workflow_runs, repo: REPO, pedidos: pedidos.dados }));
  } catch (error) {
    console.error(error);
    responder(res, 502, { erro: "Não consegui ler a agenda no GitHub agora." });
  }
}
