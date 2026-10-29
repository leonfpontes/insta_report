import { lazy, Suspense, useMemo, useState } from "react";
import { ChevronDown, Flame, Info, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Empty, PostPhoto } from "@/components/bits";
import { usePainel } from "@/lib/ctx";
import { useDesktop } from "@/hooks/use-media";
import { ACC, IGFMT, cleanTitle, ddmm, n } from "@/lib/model";
import { LIM, NIVEL, RMET, fmtX, ranking, type Nivel, type RankItem } from "@/lib/ranking";
import { cn } from "@/lib/utils";

// O gráfico (recharts) carrega só quando a aba abre.
const RankChart = lazy(() => import("@/components/ranking-chart").then((m) => ({ default: m.RankChart })));

const PERIODOS: [string, string][] = [["30", "Últimos 30 dias"], ["90", "Últimos 90 dias"], ["tudo", "Desde o início"]];
const FORMATOS: [string, string][] = [["todos", "Todos os formatos"], ["reel", "Reels"], ["carrossel", "Carrosséis"], ["post", "Posts de 1 foto"]];
const KEY = "agenda-ranking";

const NIVEL_CLS: Record<Nivel, string> = {
  viral: "border-transparent bg-ok text-white",
  fora: "border-ok/40 bg-ok-soft text-ok",
  normal: "border-input/60 bg-card text-muted-foreground",
  flop: "border-crit/40 bg-crit-soft text-crit",
  cedo: "border-dashed border-input/70 bg-card text-muted-foreground",
  sembase: "border-dashed border-input/70 bg-card text-muted-foreground",
};

function lerPrefs() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") as { k?: string; per?: string; fmt?: string }; } catch { return {}; }
}

function NivelBadge({ nivel }: { nivel: Nivel }) {
  return <Badge variant="outline" className={cn("font-medium", NIVEL_CLS[nivel])}>{nivel === "viral" ? <Flame aria-hidden /> : null}{NIVEL[nivel]}</Badge>;
}

function Stat({ label, sub, value, tone, Icon }: { label: string; sub: string; value: number; tone: "ok" | "okSoft" | "crit" | "ink"; Icon?: typeof Flame }) {
  const cor = tone === "crit" ? "var(--crit)" : tone === "ink" ? "var(--ink)" : "var(--ok)";
  return (
    <Card className={cn("gap-0.5 px-4 py-3", tone === "ok" && "border-ok/40 bg-ok-soft")}>
      <span className="num flex items-center gap-1.5 text-2xl font-medium" style={{ color: cor }}>{Icon ? <Icon className="size-5" aria-hidden /> : null}{value}</span>
      <span className="text-sm font-medium text-ink">{label}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </Card>
  );
}

function Metodo() {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-3 hover:underline">
        <Info className="size-4" aria-hidden /> Como o ranking funciona <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-1.5 pt-2 text-sm text-muted-foreground">
        <p>Cada post é medido contra o normal da própria conta, que é a mediana da mesma métrica nos outros posts dela. Assim uma conta pequena e uma grande entram no mesmo ranking: 2× quer dizer o dobro do que aquela conta costuma ter.</p>
        <p><b className="font-medium text-ink">Viralizou</b> é {LIM.viral}× ou mais, <b className="font-medium text-ink">fora da curva</b> é de {LIM.fora}× a {LIM.viral}×, e <b className="font-medium text-ink">flopou</b> é metade do normal ou menos. Diferenças de menos de 5 pessoas não contam.</p>
        <p>Post com menos de 3 dias ainda está ganhando alcance: pode entrar como fora da curva, mas não como flop. A conta precisa de pelo menos 3 posts com números para ter um normal. As etiquetas embaixo de cada post mostram as outras métricas que mais puxaram o resultado (ou que mais caíram, nos flops).</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

function Linha({ it, pos, valor, contas, onOpen, flop }: { it: RankItem; pos?: number; valor: string; contas: number; onOpen: () => void; flop?: boolean }) {
  const { m } = usePainel();
  const p = it.p;
  const titulo = cleanTitle((p.legenda || "(sem legenda)").split("\n")[0]);
  const fmt = IGFMT[p.produto === "REELS" ? "REELS" : p.tipo || ""] || "Post";
  return (
    <li data-a={p.conta}>
      <button type="button" onClick={onOpen} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none md:px-4">
        {pos != null ? <span className={cn("num w-6 shrink-0 text-center text-base font-medium", pos <= 3 && !flop ? "text-bronze" : "text-muted-foreground")}>{pos}</span> : null}
        <PostPhoto conta={p.conta} src={m.d.imagens["ig:" + p.id]} label={fmt} size={48} avatar={contas > 1 ? m.avatar(p.conta) : null} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 text-sm font-medium text-ink">{titulo}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <NivelBadge nivel={it.nivel} />
            <span>{fmt} · <span className="num">{ddmm(p.quando)}</span>{contas > 1 ? ` · ${ACC[p.conta].label}` : ""}</span>
          </span>
          <span className="num flex items-baseline gap-2 text-sm md:hidden">
            <b className="font-medium text-ink">{valor}</b>
            <span className={cn("text-xs font-medium", (it.x ?? 1) >= LIM.fora ? "text-ok" : (it.x ?? 1) <= LIM.flop ? "text-crit" : "text-muted-foreground")}>{fmtX(it.x)} o normal</span>
          </span>
          {it.puxou.length ? (
            <span className="flex flex-wrap gap-1 text-xs" aria-label={flop ? "O que mais caiu" : "O que mais puxou"}>
              {(flop ? it.puxou.slice(-2).reverse() : it.puxou.slice(0, 2)).map((q) => (
                <span key={q.k} className={cn("num rounded-sm px-1.5 py-0.5", q.x >= LIM.fora ? "bg-ok-soft text-ok" : q.x <= LIM.flop ? "bg-crit-soft text-crit" : "bg-secondary text-muted-foreground")}>{q.l} {fmtX(q.x)}</span>
              ))}
            </span>
          ) : null}
        </span>
        <span className="hidden shrink-0 flex-col items-end gap-0.5 md:flex">
          <span className="num text-base font-medium text-ink">{valor}</span>
          <span className={cn("num text-xs font-medium", (it.x ?? 1) >= LIM.fora ? "text-ok" : (it.x ?? 1) <= LIM.flop ? "text-crit" : "text-muted-foreground")}>{fmtX(it.x)} o normal</span>
        </span>
      </button>
    </li>
  );
}

export function RankingView() {
  const { m, ativas, open, q } = usePainel();
  const desktop = useDesktop();
  const ini = lerPrefs();
  const [k, setKS] = useState(ini.k && RMET.some((r) => r.k === ini.k) ? ini.k : "reach");
  const [per, setPerS] = useState(ini.per || "90");
  const [fmt, setFmtS] = useState(ini.fmt || "todos");
  const [todos, setTodos] = useState(false);
  const salvar = (o: { k?: string; per?: string; fmt?: string }) => { try { localStorage.setItem(KEY, JSON.stringify({ k, per, fmt, ...o })); } catch { /* ignora */ } };
  const setK = (v: string) => { setKS(v); salvar({ k: v }); };
  const setPer = (v: string) => { setPerS(v); salvar({ per: v }); };
  const setFmt = (v: string) => { setFmtS(v); salvar({ fmt: v }); };

  const busca = q.trim().toLowerCase();
  const r = useMemo(() => ranking(m, ativas, k, per === "tudo" ? null : +per, fmt, busca), [m, ativas.join(), k, per, fmt, busca]); // eslint-disable-line
  const met = RMET.find((x) => x.k === k)!;
  const valor = (it: RankItem) => (k === "taxa" ? (it.v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : n(it.v));
  const openP = (it: RankItem) => { const a = (m.d.agenda?.posts || []).find((x) => x.midiaId === it.p.id); open(a ? a.id : "ig:" + it.p.id); };
  const comBase = r.itens.filter((i) => i.x != null);
  const melhores = comBase.filter((i) => i.nivel !== "flop");
  const lista = todos ? melhores : melhores.slice(0, 10);
  const semPosts = !ativas.some((c) => m.igPosts(c).length);

  if (semPosts) return <Empty>O ranking aparece depois da primeira coleta de métricas.</Empty>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        {desktop ? (
          <ToggleGroup type="single" variant="outline" value={k} onValueChange={(v) => v && setK(v)} aria-label="Métrica do ranking" className="[&>*]:bg-card [&>*[data-state=on]]:bg-accent">
            {RMET.map((x) => <ToggleGroupItem key={x.k} value={x.k} className="h-10 px-3">{x.l}</ToggleGroupItem>)}
          </ToggleGroup>
        ) : (
          <Select value={k} onValueChange={setK}>
            <SelectTrigger className="h-10 w-full bg-card" aria-label="Métrica do ranking"><span className="text-muted-foreground">Métrica:</span> <SelectValue /></SelectTrigger>
            <SelectContent>{RMET.map((x) => <SelectItem key={x.k} value={x.k}>{x.l}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <div className="grid grid-cols-2 gap-2 md:ml-auto md:flex">
          <Select value={per} onValueChange={setPer}>
            <SelectTrigger className="h-10 w-full bg-card md:w-44" aria-label="Período"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODOS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={fmt} onValueChange={setFmt}>
            <SelectTrigger className="h-10 w-full bg-card md:w-44" aria-label="Formato"><SelectValue /></SelectTrigger>
            <SelectContent>{FORMATOS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Resumo">
        <Stat label="Viralizaram" sub={`${LIM.viral}× o normal ou mais`} value={r.cont.viral} tone="ok" Icon={Flame} />
        <Stat label="Fora da curva" sub={`de ${LIM.fora}× a ${LIM.viral}× o normal`} value={r.cont.fora} tone="okSoft" Icon={TrendingUp} />
        <Stat label="Floparam" sub="metade do normal ou menos" value={r.cont.flop} tone="crit" Icon={TrendingDown} />
        <Stat label="No ranking" sub={r.cont.cedo ? `${r.cont.cedo} ainda subindo` : "posts com números"} value={comBase.length} tone="ink" />
      </section>

      <Card className="gap-3 px-3 py-4 md:px-5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-medium text-ink">{met.l} de cada post contra o normal da conta</h2>
          <p className="text-sm text-muted-foreground">Cada ponto é um post. Acima da faixa verde, fora da curva; abaixo da vermelha, flop. Toque num ponto para abrir.</p>
        </div>
        <Suspense fallback={<Skeleton className="w-full" style={{ height: desktop ? 300 : 240 }} />}>
          <RankChart itens={r.itens} contas={ativas} valor={valor} onPick={openP} height={desktop ? 300 : 240} />
        </Suspense>
        {ativas.length > 1 ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {ativas.map((c) => <span key={c} data-a={c} className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-[var(--c)]" aria-hidden />{ACC[c].label}</span>)}
          </div>
        ) : null}
      </Card>

      {!comBase.length ? (
        <Empty>{busca ? "Nenhum post com essa busca." : "Ainda não há posts com números suficientes neste filtro."}</Empty>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[3fr_2fr]">
          <Card className="gap-0 overflow-hidden py-0">
            <div className="flex items-baseline justify-between gap-2 border-b px-3 py-3 md:px-4">
              <h2 className="text-base font-medium text-ink">Melhores por {met.l.toLowerCase()}</h2>
              <span className="text-sm text-muted-foreground">{melhores.length} posts</span>
            </div>
            <ol className="divide-y">
              {lista.map((it, i) => <Linha key={it.p.id} it={it} pos={i + 1} valor={valor(it)} contas={ativas.length} onOpen={() => openP(it)} />)}
            </ol>
            {melhores.length > 10 ? (
              <div className="border-t p-2">
                <Button variant="ghost" className="w-full" onClick={() => setTodos((t) => !t)}>{todos ? "Mostrar só os 10 primeiros" : `Mostrar todos os ${melhores.length}`}</Button>
              </div>
            ) : null}
          </Card>

          <Card className="gap-0 overflow-hidden py-0">
            <div className="flex items-baseline justify-between gap-2 border-b px-3 py-3 md:px-4">
              <h2 className="inline-flex items-center gap-1.5 text-base font-medium text-ink"><TrendingDown className="size-4 text-crit" aria-hidden />Floparam</h2>
              <span className="text-sm text-muted-foreground">{r.flops.length} posts</span>
            </div>
            {r.flops.length ? (
              <ol className="divide-y">
                {r.flops.map((it) => <Linha key={it.p.id} it={it} valor={valor(it)} contas={ativas.length} onOpen={() => openP(it)} flop />)}
              </ol>
            ) : <p className="px-4 py-6 text-sm text-muted-foreground">Nenhum post ficou na metade do normal ou abaixo neste filtro.</p>}
          </Card>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Metodo />
        {r.semNumeros ? <p className="text-sm text-muted-foreground">{r.semNumeros} post{r.semNumeros > 1 ? "s" : ""} sem {met.l.toLowerCase()} no Instagram ficaram de fora. Posts de antes de a conta virar profissional não têm esses números.</p> : null}
      </div>
    </div>
  );
}
