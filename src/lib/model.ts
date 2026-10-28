/**
 * Modelo do painel: lê o que api/dados.js devolve (lib/painel.mjs → montar) e calcula status,
 * conexão e a comparação de cada post com os anteriores. Sem React aqui.
 */

/** Chave da conta como está em instagram/agenda.json (pontes_brain, GiraHub, ...). */
export type Conta = string;
export interface ContaInfo { label: string; user: string; short: string; cor: string }

/** Cores fixas das contas que já existem; as novas pegam a próxima da lista, na ordem da agenda. */
const COR_FIXA: Record<string, string> = { pontes_brain: "#14213d", GiraHub: "#7a5c2e", leopontesrp: "#4f6b5a" };
const CORES = ["#14213d", "#7a5c2e", "#4f6b5a", "#7b3b5a", "#2c5d8a", "#8a5a00"];

/** Contas do painel, montadas a partir dos dados (agenda + métricas). Mudam a cada leitura. */
export const CONTAS: Conta[] = [];
export const ACC: Record<Conta, ContaInfo> = {};

export function configurarContas(d: Pick<Dados, "agenda" | "metricas">) {
  const keys = [...new Set([...Object.keys(d.agenda?.contas || {}), ...Object.keys(d.metricas || {}), ...(d.agenda?.posts || []).map((p) => p.conta)])];
  CONTAS.splice(0, CONTAS.length, ...keys);
  const usadas = new Set(keys.map((k) => COR_FIXA[k]).filter(Boolean));
  const livres = CORES.filter((c) => !usadas.has(c));
  let css = "";
  keys.forEach((k, i) => {
    const cfg = (d.agenda?.contas?.[k] || {}) as { usuario?: string };
    const user = (d.metricas?.[k]?.perfil?.username || cfg.usuario || k).replace(/^@/, "");
    const cor = COR_FIXA[k] || livres.shift() || CORES[i % CORES.length];
    ACC[k] = { label: "@" + user, user, short: user.replace(/oficial$/, ""), cor };
    css += `[data-a="${k.replace(/["\\]/g, "")}"]{--c:${cor}}`;
  });
  if (typeof document !== "undefined") {
    let el = document.getElementById("cores-contas");
    if (!el) { el = document.createElement("style"); el.id = "cores-contas"; document.head.appendChild(el); }
    el.textContent = css;
  }
}

export const FMT: Record<string, string> = { post: "Post", carrossel: "Carrossel", story: "Story", "story-video": "Story em vídeo", reel: "Reel" };
export const IGFMT: Record<string, string> = { IMAGE: "Post", CAROUSEL_ALBUM: "Carrossel", VIDEO: "Vídeo", REELS: "Reel" };
export type Eff = "agendado" | "publicado" | "manual" | "pendente" | "falhou" | "atrasado";
export const STATUS: Record<Eff, string> = {
  agendado: "Agendado", publicado: "Publicado", manual: "Postar à mão", pendente: "Não postado", falhou: "Falhou", atrasado: "Atrasado",
};

export interface AgendaPost {
  id: string; conta: Conta; quando: string; formato: string; status: string; titulo: string;
  legenda?: string; nota?: string; link?: string; midiaId?: string; publicadoEm?: string; erro?: string; tentativas?: number; itens: number;
}
export interface IgMedia {
  id: string; tipo?: string; produto?: string; quando: string; link?: string; legenda?: string;
  curtidas?: number | null; comentarios?: number | null; itens?: number | null;
  insights?: Record<string, any>; serie?: (string | number | null)[][];
}
export interface ContaMet {
  geradoEm?: string; coletadoEm?: string | null; erro?: string | null; perfil?: any;
  resumo?: Record<string, any>; posts: IgMedia[]; stories: IgMedia[]; historico: { data: string; seguidores?: number }[];
  diario?: { reach?: { dia: string; valor: number }[] } & Record<string, any>; publico?: any;
  conexao?: { ok: boolean; verificadoEm?: string; erro?: string; tipo?: string } | null;
}
export interface GalItem { img?: string; video?: string; capa?: string }
export interface Dados {
  agenda: { contas: Record<string, { publicador?: string; usuario?: string }>; posts: AgendaPost[] };
  metricas: Partial<Record<Conta, ContaMet>>;
  imagens: Record<string, string>;
  galeria: Record<string, GalItem[]>;
  execucoes: { runs: { id: number; quando: string; evento: string; job: string; resultado: string; link: string }[] };
  lidoEm: string;
}

/** Linha da agenda (ou post que só existe no Instagram), já com o status efetivo. */
export interface Row extends Omit<AgendaPost, "itens"> { itens?: number; eff: Eff; kind: "agenda" | "ig" }

export const TZ = "America/Sao_Paulo";
export const HORA = 3600000, DIA = 86400000;
const nf = new Intl.NumberFormat("pt-BR");
export const n = (v: number | null | undefined) => (v == null ? "–" : nf.format(v));
export const pct = (a?: number | null, b?: number | null) => (a == null || !b ? "–" : (100 * a / b).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%");
export const dayKey = (d: string | number | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(d));
export const hm = (d: string | number | Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(d));
export const ddmm = (d: string | number | Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(new Date(d));
export const ddmmhm = (d: string | number | Date) => `${ddmm(d)} ${hm(d)}`;
export const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
export const DOW_LONGO = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"];
export const todayStr = () => dayKey(Date.now());
export const dLabel = (t: number | string) => { const k = dayKey(t); return `${+k.slice(8, 10)} de ${MES[+k.slice(5, 7) - 1]}`; };
export const addDays = (key: string, d: number) => new Date(Date.parse(key + "T12:00:00Z") + d * DIA).toISOString().slice(0, 10);
/** "Hoje", "Amanhã" ou "qui, 30/10". */
export function dayTitle(key: string) {
  const t = todayStr();
  if (key === t) return "Hoje";
  if (key === addDays(t, 1)) return "Amanhã";
  if (key === addDays(t, -1)) return "Ontem";
  const dt = new Date(key + "T12:00:00Z");
  return `${DOW_LONGO[(dt.getUTCDay() + 6) % 7]}, ${key.slice(8, 10)}/${key.slice(5, 7)}`;
}

/** Títulos da agenda vêm cortados em 90 caracteres: termina na última palavra inteira, com reticências. */
export function cleanTitle(t: string, legenda?: string) {
  const s = (t || "").trim();
  if (!s) return "Post sem legenda";
  const full = (legenda || "").split("\n")[0].trim();
  if (full.length > s.length && full.startsWith(s) && !/[\s.!?…]$/.test(s)) {
    const cut = s.replace(/\s+\S*$/, "");
    return (cut || s) + "…";
  }
  return s;
}

export class Model {
  d: Dados;
  private cmp = new Map<string, Cmp>();
  constructor(d: Dados) { this.d = d; configurarContas(d); }

  igPosts(c: Conta) { return this.d.metricas[c]?.posts || []; }
  igStories(c: Conta) { return this.d.metricas[c]?.stories || []; }
  igById(id: string): IgMedia | null {
    for (const c of CONTAS) { const p = this.igPosts(c).find((x) => x.id === id) || this.igStories(c).find((x) => x.id === id); if (p) return p; }
    return null;
  }
  detectedStory(p: { formato: string; conta: Conta; quando: string }) {
    if (!(p.formato || "").startsWith("story")) return null;
    return this.igStories(p.conta).filter((s) => dayKey(s.quando) === dayKey(p.quando)).sort((a, b) => a.quando.localeCompare(b.quando))[0] || null;
  }
  effStatus(p: AgendaPost): Eff {
    if (p.status === "publicado") return "publicado";
    if (p.status === "falhou") return "falhou";
    if (p.status === "manual") {
      if (this.detectedStory(p)) return "publicado";
      return dayKey(p.quando) < todayStr() ? "pendente" : "manual";
    }
    if (p.status === "agendado" && Date.now() - +new Date(p.quando) > 20 * 60000) return "atrasado";
    return p.status as Eff;
  }
  /** Agenda + posts que só aparecem no Instagram, filtrados por conta. */
  rows(acc: Conta | "all"): Row[] {
    const ag = this.d.agenda?.posts || [];
    const out: Row[] = ag.map((p) => ({ ...p, eff: this.effStatus(p), kind: "agenda" as const }));
    const known = new Set(ag.map((p) => p.midiaId).filter(Boolean));
    for (const c of CONTAS) for (const m of this.igPosts(c)) {
      if (known.has(m.id)) continue;
      out.push({
        id: "ig:" + m.id, conta: c, quando: m.quando, formato: m.produto === "REELS" ? "reel" : m.tipo === "CAROUSEL_ALBUM" ? "carrossel" : "post",
        status: "publicado", eff: "publicado", titulo: (m.legenda || "").split("\n")[0].slice(0, 90) || "Post sem legenda",
        legenda: m.legenda, link: m.link, midiaId: m.id, kind: "ig", itens: m.itens ?? undefined,
      });
    }
    return out.filter((r) => acc === "all" || r.conta === acc);
  }
  rowById(id: string): Row | null { return this.rows("all").find((r) => r.id === id) || null; }
  thumbOf(r: Row) {
    const det = r.kind === "agenda" ? this.detectedStory(r) : null;
    return this.d.imagens[r.id] || (r.midiaId && this.d.imagens["ig:" + r.midiaId]) || (det && this.d.imagens["ig:" + det.id]) || null;
  }
  avatar(c: Conta) { return this.d.imagens["perfil:" + c] || null; }
  igOfRow(r: Row) {
    const det = r.kind === "agenda" ? this.detectedStory(r) : null;
    return (r.midiaId ? this.igById(r.midiaId) : null) || det;
  }
  gallery(r: Row) { return this.d.galeria[r.id] || (r.midiaId && this.d.galeria["ig:" + r.midiaId]) || null; }
  canPublish(r: Row) { return r.kind === "agenda" && (r.status === "agendado" || r.status === "falhou") && this.d.agenda?.contas?.[r.conta]?.publicador === "proprio"; }
  /** "Já postei" só vale para story de hoje ou de dias anteriores. */
  canMark(r: Row) { return r.kind === "agenda" && r.status === "manual" && r.eff !== "publicado" && dayKey(r.quando) <= todayStr(); }

  /* ---------- conexão ---------- */
  conexao(k: Conta): Conexao {
    const c = this.d.metricas[k]?.conexao;
    if (!c?.verificadoEm) return { cls: "none", txt: "Sem checagem", sub: "", det: "A primeira checagem do token chega com a próxima coleta de números." };
    const sub = dayKey(c.verificadoEm) === todayStr() ? hm(c.verificadoEm) : ddmmhm(c.verificadoEm);
    if (!c.ok && c.tipo !== "api") return { cls: "off", txt: "Desconectado", sub, det: `O Instagram recusou o token desta conta (${c.erro || "sem detalhe"}). Nada desta conta é publicado até o token ser renovado.` };
    if (!c.ok) return { cls: "velho", txt: "Instagram não respondeu", sub, det: `O token não foi recusado, mas a última chamada à API falhou: ${c.erro || "sem detalhe"}.` };
    if (Date.now() - +new Date(c.verificadoEm) > 3 * HORA) return { cls: "velho", txt: "Sem checagem recente", sub, det: "A coleta de hora em hora não rodou nas últimas 3 horas. Toque em Checar agora." };
    return { cls: "on", txt: "Conectado", sub, det: `Token aceito pelo Instagram na checagem das ${hm(c.verificadoEm)}.` };
  }

  /* ---------- séries e comparação ---------- */
  seriesOf(p: IgMedia, k: string) {
    const pts = (p.serie || []).map((a) => ({ t: new Date(a[0] as string).getTime(), v: a[SER[k]] as number | null, origem: false })).filter((x) => x.v != null) as Pt[];
    const t0 = new Date(p.quando).getTime();
    if (!pts.length || pts[0].t > t0) pts.unshift({ t: t0, v: 0, origem: true });
    return pts;
  }
  atAge(q: IgMedia, k: string, age: number): number | null {
    const t0 = new Date(q.quando).getTime();
    if (Date.now() - t0 < age) return null;
    const cur = val(q, k);
    if (age >= 7 * DIA) return cur;
    const pts = this.seriesOf(q, k).filter((x) => !x.origem).map((x) => ({ a: x.t - t0, v: x.v }));
    let lo: { a: number; v: number } | null = null, hi: { a: number; v: number } | null = null;
    for (const p of pts) { if (p.a <= age) lo = p; else if (!hi) hi = p; }
    if (lo && hi) return lo.v + (hi.v - lo.v) * (age - lo.a) / ((hi.a - lo.a) || 1);
    if (!lo && hi && hi.a <= Math.max(2 * age, age + 3 * HORA)) return hi.v * age / hi.a;
    if (lo && !hi && age - lo.a < 6 * HORA) return lo.v;
    return age >= 3 * DIA ? cur : null;
  }
  /** Cada número do post contra a média dos 5 posts anteriores da conta, na mesma idade. */
  compare(p: IgMedia, conta: Conta): Cmp {
    const key = conta + "|" + p.id; const hit = this.cmp.get(key); if (hit) return hit;
    const t = new Date(p.quando).getTime(), age = Date.now() - t;
    const prev = this.igPosts(conta).filter((q) => q.id !== p.id && new Date(q.quando).getTime() < t).sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 5);
    const out: Cmp = { age, n: prev.length, m: {}, d: null, lvl: "cedo" };
    if (age >= HORA) for (const [k] of CMPK) {
      const v = val(p, k); if (v == null) continue;
      const vals = prev.map((q) => this.atAge(q, k, age)).filter((x): x is number => x != null);
      if (!vals.length) continue;
      const base = vals.reduce((s, x) => s + x, 0) / vals.length;
      out.m[k] = { v, base, d: base > 0 ? (v - base) / base : v > 0 ? 1 : 0, n: vals.length };
    }
    fechar(out, ["views", "reach", "total_interactions"]);
    this.cmp.set(key, out); return out;
  }
  /** Story contra os 5 stories anteriores da conta (stories duram 24 h, então são números finais). */
  compareStory(s: IgMedia, conta: Conta): Cmp {
    const key = conta + "|s|" + s.id; const hit = this.cmp.get(key); if (hit) return hit;
    const t = new Date(s.quando).getTime();
    const prev = this.igStories(conta).filter((q) => q.id !== s.id && new Date(q.quando).getTime() < t).sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 5);
    const out: Cmp = { age: Date.now() - t, n: prev.length, m: {}, story: true, d: null, lvl: "cedo" };
    for (const [k] of STK) {
      const v = s.insights?.[k]; if (v == null) continue;
      const vals = prev.map((q) => q.insights?.[k]).filter((x) => x != null) as number[];
      if (!vals.length) continue;
      const base = vals.reduce((a, x) => a + x, 0) / vals.length;
      out.m[k] = { v, base, d: base > 0 ? (v - base) / base : v > 0 ? 1 : 0, n: vals.length };
    }
    fechar(out, ["views", "reach"]);
    this.cmp.set(key, out); return out;
  }
  cmpOf(ig: IgMedia | null, conta: Conta) { if (!ig) return null; return ig.produto === "STORY" ? this.compareStory(ig, conta) : this.compare(ig, conta); }
  cmpOfRow(r: Row) { return this.cmpOf(this.igOfRow(r), r.conta); }
}

export interface Conexao { cls: "on" | "off" | "velho" | "none"; txt: string; sub: string; det: string }
export interface Pt { t: number; v: number; origem?: boolean }
export interface Metric { v: number; base: number; d: number; n: number }
export interface Cmp { age: number; n: number; m: Record<string, Metric>; d: number | null; lvl: "up" | "down" | "flat" | "cedo"; story?: boolean }

export const SER: Record<string, number> = { t: 0, views: 1, reach: 2, curtidas: 3, total_interactions: 4, saved: 5, shares: 6, comentarios: 7 };
export const CMPK: [string, string, string][] = [
  ["views", "Visualizações", "Visualiz."], ["reach", "Alcance", "Alcance"], ["total_interactions", "Interações", "Interações"],
  ["curtidas", "Curtidas", "Curtidas"], ["saved", "Salvamentos", "Salvos"], ["shares", "Compartilhamentos", "Compart."], ["comentarios", "Comentários", "Coment."],
];
export const STK: [string, string][] = [["views", "Visualizações"], ["reach", "Alcance"], ["replies", "Respostas"], ["shares", "Compartilhamentos"], ["total_interactions", "Interações"]];

export const lvl = (d: number) => (d >= 0.15 ? "up" : d <= -0.15 ? "down" : "flat") as "up" | "down" | "flat";
// Com números pequenos, 1 curtida a mais não é tendência: diferença menor que 2 conta como na média.
export const lvlM = (m: Metric) => (Math.abs(m.v - m.base) < 2 ? "flat" : lvl(m.d));
export const pctAbs = (d: number) => { const v = Math.round(Math.abs(d) * 100); return v > 999 ? ">999%" : v + "%"; };
function fechar(out: Cmp, keys: string[]) {
  const main = keys.map((k) => out.m[k]).filter(Boolean).map((m) => (lvlM(m) === "flat" && Math.abs(m.v - m.base) < 2 ? 0 : m.d));
  out.d = main.length ? main.reduce((s, x) => s + x, 0) / main.length : null;
  out.lvl = out.d == null ? "cedo" : lvl(out.d);
}

export const val = (p: IgMedia & { conta?: Conta }, k: string): any =>
  k === "quando" ? p.quando
    : k === "curtidas" || k === "comentarios" ? (p as any)[k]
    : k === "taxa" ? (p.insights?.reach ? (p.insights.total_interactions || 0) / p.insights.reach : null)
    : p.insights?.[k];

export const idadeTxt = (a: number) => (a >= 7 * DIA ? "números finais" : a < 48 * HORA ? `com ${Math.max(1, Math.round(a / HORA))} h de vida` : `com ${Math.round(a / DIA)} dias de vida`);

/** Por que não há comparação, em palavras. */
export function semBaseTxt(c: Cmp | null) {
  if (!c) return "Ainda sem números do Instagram para este post.";
  if (c.age < HORA) return "Com menos de 1 hora no ar ainda não dá para comparar.";
  if (!c.n) return c.story ? "É o primeiro story registrado desta conta." : "É o primeiro post desta conta com números.";
  return c.story
    ? "Os stories anteriores não têm esses números registrados."
    : `Os ${c.n} posts anteriores saíram antes da coleta de hora em hora, então não há números deles ${idadeTxt(c.age)}. A comparação aparece quando este post fizer 3 dias.`;
}
