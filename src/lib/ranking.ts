import { DIA, val, type Conta, type IgMedia, type Model } from "@/lib/model";

/** Métricas que dá para ranquear. `taxa` é interações ÷ alcance. */
export const RMET: { k: string; l: string; curto: string }[] = [
  { k: "reach", l: "Alcance", curto: "Alcance" },
  { k: "views", l: "Visualizações", curto: "Visualiz." },
  { k: "total_interactions", l: "Interações", curto: "Interações" },
  { k: "shares", l: "Compartilhamentos", curto: "Compart." },
  { k: "saved", l: "Salvamentos", curto: "Salvos" },
  { k: "taxa", l: "Engajamento", curto: "Engaj." },
];
const LABEL = Object.fromEntries(RMET.map((r) => [r.k, r.curto]));

export type Nivel = "viral" | "fora" | "normal" | "flop" | "cedo" | "sembase";
export const NIVEL: Record<Nivel, string> = {
  viral: "Viralizou", fora: "Fora da curva", normal: "No normal", flop: "Flopou", cedo: "Ainda subindo", sembase: "Sem base",
};
/** Limites, em vezes o normal da conta (a mediana dos outros posts dela). */
export const LIM = { viral: 3, fora: 2, flop: 0.5 };
/** Antes disso o post ainda está ganhando alcance: não conta como flop. */
export const MADURO = 3 * DIA;

type P = IgMedia & { conta: Conta };
export interface RankItem {
  p: P;
  v: number;
  /** Normal da conta: mediana da métrica nos outros posts dela. */
  base: number | null;
  /** Quantas vezes o normal (1 = igual). */
  x: number | null;
  nivel: Nivel;
  maduro: boolean;
  /** As outras métricas contra o normal, da que mais subiu para a que mais caiu. */
  puxou: { k: string; l: string; x: number }[];
}

const mediana = (a: number[]) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};

/** Normal da conta para um post: mediana dos outros posts da conta (precisa de pelo menos 2). */
function normal(todos: P[], p: P, k: string) {
  const vals = todos.filter((q) => q.id !== p.id).map((q) => val(q, k)).filter((x): x is number => typeof x === "number");
  return vals.length >= 2 ? mediana(vals) : null;
}
const vezes = (v: number, base: number | null) => (base == null ? null : base > 0 ? v / base : v > 0 ? LIM.viral : 1);

function nivelDe(k: string, v: number, base: number | null, x: number | null, maduro: boolean): Nivel {
  if (x == null || base == null) return "sembase";
  // Com números pequenos, poucas pessoas não são tendência: pede uma diferença mínima.
  const dif = k === "taxa" ? Math.abs(v - base) >= 0.01 : Math.abs(v - base) >= 5;
  if (x >= LIM.viral && dif) return "viral";
  if (x >= LIM.fora && dif) return "fora";
  if (!maduro) return "cedo";
  if (x <= LIM.flop && dif) return "flop";
  return "normal";
}

export function ranking(m: Model, contas: Conta[], k: string, dias: number | null, formato: string, busca: string) {
  const porConta = new Map(contas.map((c) => [c, m.igPosts(c).map((p) => ({ ...p, conta: c }) as P)]));
  const desde = dias ? Date.now() - dias * DIA : 0;
  const itens: RankItem[] = [];
  let semNumeros = 0;
  for (const [, todos] of porConta) for (const p of todos) {
    if (+new Date(p.quando) < desde) continue;
    if (formato !== "todos" && tipo(p) !== formato) continue;
    if (busca && !(p.legenda || "").toLowerCase().includes(busca)) continue;
    const v = val(p, k);
    if (typeof v !== "number") { semNumeros++; continue; }
    const maduro = Date.now() - +new Date(p.quando) >= MADURO;
    const base = normal(todos, p, k);
    const x = vezes(v, base);
    const puxou = RMET.filter((r) => r.k !== k && r.k !== "taxa").map((r) => {
      const vv = val(p, r.k);
      const b = typeof vv === "number" ? normal(todos, p, r.k) : null;
      // Normal zero não dá proporção: a etiqueta só sai quando há base.
      const xx = typeof vv === "number" && b ? vv / b : null;
      return { k: r.k, l: LABEL[r.k], x: xx };
    }).filter((r): r is { k: string; l: string; x: number } => r.x != null)
      .sort((a, b) => b.x - a.x);
    itens.push({ p, v, base, x, nivel: nivelDe(k, v, base, x, maduro), maduro, puxou });
  }
  // Ordena por "vezes o normal", para comparar contas de tamanhos diferentes; sem base vai para o fim.
  itens.sort((a, b) => (b.x ?? -1) - (a.x ?? -1) || b.v - a.v);
  const flops = itens.filter((i) => i.nivel === "flop").sort((a, b) => (a.x ?? 0) - (b.x ?? 0));
  const cont = { viral: 0, fora: 0, normal: 0, flop: 0, cedo: 0, sembase: 0 } as Record<Nivel, number>;
  itens.forEach((i) => cont[i.nivel]++);
  return { itens, flops, cont, semNumeros };
}

export const tipo = (p: IgMedia) => (p.produto === "REELS" ? "reel" : p.tipo === "CAROUSEL_ALBUM" ? "carrossel" : p.tipo === "VIDEO" ? "reel" : "post");

export const fmtX = (x: number | null) => (x == null ? "–" : (x >= 10 ? Math.round(x).toString() : x.toLocaleString("pt-BR", { maximumFractionDigits: 1 })) + "×");
