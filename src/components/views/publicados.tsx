import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, ExternalLink, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Delta, Empty, PostPhoto, Verdict } from "@/components/bits";
import { usePainel } from "@/lib/ctx";
import { useDesktop } from "@/hooks/use-media";
import { ACC, DIA, IGFMT, cleanTitle, ddmmhm, lvlM, n, pct, val, type Cmp, type Conta, type IgMedia } from "@/lib/model";
import { cn } from "@/lib/utils";

type P = IgMedia & { conta: Conta };
const fmtOf = (p: IgMedia) => IGFMT[p.produto === "REELS" ? "REELS" : p.tipo || ""] || p.tipo || "";
const COLS: { k: string; l: string }[] = [
  { k: "views", l: "Visualizações" }, { k: "reach", l: "Alcance" }, { k: "total_interactions", l: "Interações" },
  { k: "curtidas", l: "Curtidas" }, { k: "comentarios", l: "Coment." }, { k: "saved", l: "Salvos" }, { k: "shares", l: "Compart." }, { k: "taxa", l: "Engajamento" },
];
const SORTS: [string, string][] = [["quando", "Mais recentes"], ["score", "Desempenho"], ["views", "Visualizações"], ["reach", "Alcance"], ["total_interactions", "Interações"], ["curtidas", "Curtidas"], ["saved", "Salvos"], ["shares", "Compartilhamentos"]];

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "crit" | "muted" }) {
  return (
    <Card className="gap-0.5 px-4 py-3">
      <span className="num text-2xl font-medium" style={{ color: tone === "ok" ? "var(--ok)" : tone === "crit" ? "var(--crit)" : tone === "muted" ? "var(--muted-foreground)" : "var(--ink)" }}>{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </Card>
  );
}

function Metodo() {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-3 hover:underline">
        <Info className="size-4" aria-hidden /> Como a comparação funciona <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 text-sm text-muted-foreground">
        Cada post é comparado com a média dos 5 posts anteriores da mesma conta (ou dos que houver), quando eles tinham a mesma idade. Verde ▲ é 15% ou mais acima, vermelho ▼ é 15% ou mais abaixo; o resto conta como na média. O selo geral junta visualizações, alcance e interações. Os números vêm do Instagram de hora em hora.
      </CollapsibleContent>
    </Collapsible>
  );
}

function NumCell({ p, c, k }: { p: P; c: Cmp; k: string }) {
  const m = c.m[k];
  const l = m ? lvlM(m) : "flat";
  return (
    <TableCell className={cn("num text-right align-top", l === "up" && "bg-ok-soft/70", l === "down" && "bg-crit-soft/70")}>
      <div className="text-ink">{k === "taxa" ? pct(p.insights?.total_interactions, p.insights?.reach) : n(val(p, k))}</div>
      <Delta m={m} />
    </TableCell>
  );
}

export function PublicadosView() {
  const { m, ativas, open, q } = usePainel();
  const desktop = useDesktop();
  const [sort, setSort] = useState<{ k: string; dir: 1 | -1 }>({ k: "quando", dir: -1 });
  const contas = ativas;
  const posts: P[] = useMemo(() => contas.flatMap((c) => m.igPosts(c).map((p) => ({ ...p, conta: c }))), [m, ativas.join()]); // eslint-disable-line
  const cmps = useMemo(() => new Map(posts.map((p) => [p.id, m.compare(p, p.conta)])), [posts, m]);
  const busca = q.trim().toLowerCase();
  const list = posts.filter((p) => !busca || (p.legenda || "").toLowerCase().includes(busca));
  const get = (p: P, k: string) => (k === "score" ? cmps.get(p.id)!.d : val(p, k));
  list.sort((a, b) => { const x = get(a, sort.k), y = get(b, sort.k); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  const cont = { up: 0, flat: 0, down: 0, cedo: 0 };
  posts.filter((p) => Date.now() - +new Date(p.quando) < 30 * DIA).forEach((p) => cont[cmps.get(p.id)!.lvl]++);
  const stories = contas.flatMap((c) => m.igStories(c).map((s) => ({ ...s, conta: c }))).sort((a, b) => b.quando.localeCompare(a.quando));
  const openP = (p: P) => { const a = (m.d.agenda?.posts || []).find((x) => x.midiaId === p.id); open(a ? a.id : "ig:" + p.id); };
  const sortBy = (k: string) => setSort((s) => ({ k, dir: s.k === k ? (-s.dir as 1 | -1) : -1 }));
  const aria = (k: string) => (sort.k === k ? (sort.dir > 0 ? "ascending" : "descending") : undefined);
  const SortHead = ({ k, l, right }: { k: string; l: string; right?: boolean }) => (
    <TableHead aria-sort={aria(k)} className={cn(right && "text-right")}>
      <button type="button" onClick={() => sortBy(k)} className={cn("inline-flex items-center gap-1 text-xs font-medium tracking-wide uppercase hover:text-ink", sort.k === k ? "text-ink" : "text-muted-foreground")}>
        {l}{sort.k === k ? (sort.dir > 0 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />) : null}
      </button>
    </TableHead>
  );

  if (!posts.length) return <Empty>Os números dos posts publicados aparecem aqui depois da primeira coleta de métricas.</Empty>;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3" aria-label="Posts dos últimos 30 dias">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Últimos 30 dias, perto dos anteriores</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="acima da média" value={cont.up} tone="ok" />
          <Stat label="na média" value={cont.flat} />
          <Stat label="abaixo da média" value={cont.down} tone="crit" />
          <Stat label="sem comparação ainda" value={cont.cedo} tone="muted" />
        </div>
        <Metodo />
      </section>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        {!desktop ? (
          <Select value={sort.k} onValueChange={(k) => setSort({ k, dir: -1 })}>
            <SelectTrigger className="h-10 w-full bg-card" aria-label="Ordenar por"><span className="text-muted-foreground">Ordenar:</span> <SelectValue /></SelectTrigger>
            <SelectContent>{SORTS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
          </Select>
        ) : null}
      </div>

      {!list.length ? <Empty>Nenhum post com essa busca.</Empty> : desktop ? (
        <Card className="gap-0 overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[42%]">Post</TableHead>
                <SortHead k="score" l="Desempenho" />
                <SortHead k="quando" l="Data" />
                {COLS.map((c) => <SortHead key={c.k} k={c.k} l={c.l} right />)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const c = cmps.get(p.id)!;
                return (
                  <TableRow key={p.id} data-a={p.conta}>
                    <TableCell className="whitespace-normal">
                      <div className="flex items-center gap-3">
                        <PostPhoto conta={p.conta} src={m.d.imagens["ig:" + p.id]} label={fmtOf(p)} size={44} avatar={m.avatar(p.conta)} />
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <button type="button" onClick={() => openP(p)} className="line-clamp-2 text-left font-medium text-ink hover:underline">{cleanTitle((p.legenda || "(sem legenda)").split("\n")[0])}</button>
                          <span className="text-xs text-muted-foreground">{fmtOf(p)}{p.itens && p.itens > 1 ? ` · ${p.itens} itens` : ""}{contas.length > 1 ? ` · ${ACC[p.conta].label}` : ""}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top"><Verdict c={c} compact /></TableCell>
                    <TableCell className="num align-top text-ink">{ddmmhm(p.quando)}</TableCell>
                    {COLS.map((col) => <NumCell key={col.k} p={p} c={c} k={col.k} />)}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {list.map((p) => {
            const c = cmps.get(p.id)!;
            return (
              <Card key={p.id} data-a={p.conta} className={cn("gap-3 border-l-[3px] px-3 py-3", c.lvl === "up" ? "border-l-ok" : c.lvl === "down" ? "border-l-crit" : "border-l-[var(--c)]")}>
                <button type="button" onClick={() => openP(p)} className="flex items-start gap-3 text-left">
                  <PostPhoto conta={p.conta} src={m.d.imagens["ig:" + p.id]} label={fmtOf(p)} size={60} avatar={m.avatar(p.conta)} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="line-clamp-2 font-medium text-ink">{cleanTitle((p.legenda || "(sem legenda)").split("\n")[0])}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground"><Verdict c={c} compact /><span>{fmtOf(p)} · <span className="num">{ddmmhm(p.quando)}</span></span></span>
                  </span>
                </button>
                <dl className="grid grid-cols-3 gap-1.5">
                  {[["views", "Visualizações"], ["reach", "Alcance"], p.insights?.total_interactions == null ? ["curtidas", "Curtidas"] : ["total_interactions", "Interações"]].map(([k, l]) => {
                    const mm = c.m[k]; const L = mm ? lvlM(mm) : "flat";
                    return (
                      <div key={k} className={cn("flex flex-col gap-0.5 rounded-md bg-background px-2 py-1.5", L === "up" && "bg-ok-soft", L === "down" && "bg-crit-soft")}>
                        <dd className="num flex flex-wrap items-baseline gap-1 font-medium text-ink">{n(val(p, k))} <Delta m={mm} /></dd>
                        <dt className="order-first text-xs text-muted-foreground">{l}</dt>
                      </div>
                    );
                  })}
                </dl>
              </Card>
            );
          })}
        </div>
      )}

      <section className="flex flex-col gap-3" aria-label="Stories">
        <h2 className="text-base font-medium text-ink">Stories dos últimos 30 dias</h2>
        {!stories.length ? <Empty>Nenhum story registrado ainda.</Empty> : (
          <div className="grid gap-2 md:grid-cols-2">
            {stories.map((s) => {
              const c = m.compareStory(s, s.conta);
              return (
                <Card key={s.id} data-a={s.conta} className="flex-row items-center gap-3 px-3 py-2.5">
                  <PostPhoto conta={s.conta} src={m.d.imagens["ig:" + s.id]} label="Story" size={44} avatar={m.avatar(s.conta)} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm"><span className="num text-ink">{ddmmhm(s.quando)}</span><Verdict c={c} compact />{contas.length > 1 ? <span className="text-muted-foreground">{ACC[s.conta].label}</span> : null}</span>
                    <span className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
                      <span><b className="num font-medium text-ink">{n(s.insights?.views)}</b> visualizações <Delta m={c.m.views} /></span>
                      <span><b className="num font-medium text-ink">{n(s.insights?.reach)}</b> alcance <Delta m={c.m.reach} /></span>
                      <span><b className="num font-medium text-ink">{n(s.insights?.replies)}</b> respostas</span>
                    </span>
                  </div>
                  {s.link ? <a href={s.link} target="_blank" rel="noopener" className="rounded-md p-2 text-ink hover:bg-accent" aria-label="Abrir story no Instagram"><ExternalLink className="size-4" aria-hidden /></a> : null}
                </Card>
              );
            })}
          </div>
        )}
        <p className="text-sm text-muted-foreground">Stories são comparados com os 5 stories anteriores da conta. O Instagram só entrega stories por 24 horas; o painel guarda os números de cada story que viu no ar.</p>
      </section>
    </div>
  );
}

