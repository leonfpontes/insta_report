// Chamadas às rotas do painel (api/*.js). As ações mandam o cabeçalho X-Painel, que a rota exige.
import type { Dados } from "./model";

export class SemSessao extends Error {}

export async function lerDados(): Promise<Dados> {
  const r = await fetch("/api/dados", { credentials: "same-origin", cache: "no-store" });
  if (r.status === 401) throw new SemSessao();
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || "Não consegui ler a agenda agora.");
  return j as Dados;
}

export async function acao(rota: string, corpo?: unknown) {
  const r = await fetch(rota, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Painel": "1" },
    body: JSON.stringify(corpo || {}),
    credentials: "same-origin",
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new SemSessao(j.erro || "Entre de novo.");
  if (!r.ok) throw new Error(j.erro || "Não deu certo agora. Tente de novo em instantes.");
  return j;
}

export async function entrar(senha: string) {
  const r = await fetch("/api/entrar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ senha }),
    credentials: "same-origin",
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.erro || "Não consegui entrar.");
  }
}

export type Rodada = Dados["execucoes"]["runs"][number];
export interface Rodadas { runs: Rodada[]; total: number; pagina: number; porPagina: number }

/** Histórico das rodadas, em páginas; de e ate são datas AAAA-MM-DD no horário de Brasília. */
export async function lerExecucoes(pagina: number, de?: string, ate?: string): Promise<Rodadas> {
  const p = new URLSearchParams({ pagina: String(pagina) });
  if (de) p.set("de", de);
  if (ate) p.set("ate", ate);
  const r = await fetch("/api/execucoes?" + p, { credentials: "same-origin", cache: "no-store" });
  if (r.status === 401) throw new SemSessao();
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || "Não consegui ler as rodadas agora.");
  return j as Rodadas;
}
