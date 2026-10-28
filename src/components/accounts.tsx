import { useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronRight, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Lamp } from "@/components/bits";
import { TimeLine } from "@/components/timeline";
import { usePainel } from "@/lib/ctx";
import { useDesktop } from "@/hooks/use-media";
import { ACC, CONTAS, FMT, cleanTitle, ddmmhm, lvl, n, pctAbs, todayStr, type Conta } from "@/lib/model";
import { cn } from "@/lib/utils";

/** Variação da semana contra a média semanal das 3 semanas anteriores (só com 28 dias de dados). */
function weekDelta(r7: any, r28: any, key: string) {
  const v = r7?.[key], t = r28?.[key];
  if (v == null || t == null || r7.erro || r28.erro) return null;
  const base = (t - v) / 3;
  if (!(base > 0 && base >= v * 0.1)) return null;
  const d = (v - base) / base;
  return Math.abs(v - base) < 2 ? null : { d, l: lvl(d) };
}

function Fig({ label, value, delta }: { label: string; value: React.ReactNode; delta?: { d: number; l: string } | null }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dd className="num flex flex-wrap items-baseline gap-1.5 text-lg font-medium text-ink md:text-xl">
        {value}
        {delta && delta.l !== "flat" ? (
          <span className={cn("text-xs font-medium", delta.l === "up" ? "text-ok" : "text-crit")}>
            {delta.l === "up" ? "▲" : "▼"} {pctAbs(delta.d)}
          </span>
        ) : null}
      </dd>
      <dt className="order-first text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}

/** Números e alertas de uma conta, usados no cartão e na linha do resumo. */
function useConta(k: Conta) {
  const { m } = usePainel();
  const met = m.d.metricas[k];
  const pf = met?.perfil || {};
  const r7 = met?.resumo?.["7d"] || {}, r28 = met?.resumo?.["28d"] || {};
  const hist = met?.historico || [];
  let seg: number | null = null;
  if (hist.length > 1) {
    const ref = [...hist].reverse().find((h) => +new Date(todayStr()) - +new Date(h.data) >= 7 * 86400000) || hist[0];
    seg = (pf.followers_count ?? 0) - (ref.seguidores ?? 0) || null;
  }
  const all = (m.d.agenda?.posts || []).filter((p) => p.conta === k).map((p) => ({ ...p, eff: m.effStatus(p) }));
  const now = Date.now();
  const next = all.filter((p) => p.status === "agendado" && +new Date(p.quando) >= now).sort((a, b) => a.quando.localeCompare(b.quando))[0];
  const last = [...m.igPosts(k)].sort((a, b) => b.quando.localeCompare(a.quando))[0];
  const fails = all.filter((p) => p.eff === "falhou" || p.eff === "atrasado").length;
  const pend = all.filter((p) => p.eff === "pendente").length;
  const queued = all.filter((p) => p.status === "agendado").length;
  const cx = m.conexao(k);
  const photo = m.avatar(k);
  const reach = (met?.diario?.reach || []).filter((x) => x.dia);
  const reachPts = reach.map((x) => ({ t: new Date(x.dia + "T12:00:00Z").getTime(), v: x.valor || 0 }));
  const temReach = reach.filter((x) => x.valor > 0).length >= 3;
  return { met, pf, r7, r28, seg, next, last, fails, pend, queued, cx, photo, reach, reachPts, temReach };
}

function AccountCard({ k }: { k: Conta }) {
  const { setAcc } = usePainel();
  const desktop = useDesktop();
  const [open, setOpen] = useState(false);
  const { pf, r7, r28, seg, next, last, fails, pend, queued, cx, photo, reach, reachPts, temReach } = useConta(k);
  const show = desktop || open;

  return (
    <Card data-a={k} className="gap-0 overflow-hidden border-t-[3px] border-t-[var(--c)] py-0" aria-label={ACC[k].label}>
      <Collapsible open={show} onOpenChange={setOpen}>
        <div className="flex items-center gap-3 p-4">
          {photo ? <img src={photo} alt={`Foto do perfil ${ACC[k].label}`} className="size-12 shrink-0 rounded-full border-2 border-card object-cover shadow-[0_0_0_1.5px_var(--c)]" /> : <span className="size-12 shrink-0 rounded-full bg-muted" />}
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-medium text-ink">{pf.name || ACC[k].label}</span>
            <a href={`https://www.instagram.com/${ACC[k].user}/`} target="_blank" rel="noopener" className="inline-flex w-fit items-center gap-0.5 text-sm font-medium text-ink underline underline-offset-3">
              {ACC[k].label}<ArrowUpRight className="size-3.5" aria-hidden /><span className="sr-only"> (abre o Instagram)</span>
            </a>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", cx.cls === "off" ? "text-crit" : cx.cls === "velho" ? "text-warn" : "text-ok")}>
              <Lamp cls={cx.cls} />{cx.txt}
            </span>
            {cx.sub ? <span className="text-xs text-muted-foreground">checado {cx.sub}</span> : null}
          </div>
        </div>

        {/* Resumo de uma linha no celular; o cartão inteiro abre com um toque. */}
        {!desktop ? (
          <CollapsibleTrigger className="flex w-full items-center gap-4 border-t px-4 py-3 text-left text-sm focus-visible:bg-accent focus-visible:outline-none">
            <span><b className="num text-base font-medium text-ink">{n(pf.followers_count)}</b> <span className="text-muted-foreground">seguidores</span></span>
            <span><b className="num text-base font-medium text-ink">{n(r7.reach)}</b> <span className="text-muted-foreground">alcance 7 dias</span></span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-ink">
              {open ? "Menos" : "Números"}<ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
            </span>
          </CollapsibleTrigger>
        ) : null}

        {cx.cls === "off" || cx.cls === "velho" ? <p className="mx-4 mb-3 rounded-md bg-crit-soft px-3 py-2 text-sm text-crit">{cx.det}</p> : null}
        {fails || pend ? (
          <div className="mx-4 mb-3 flex flex-col gap-1 rounded-md bg-warn-soft px-3 py-2 text-sm">
            {fails ? <button type="button" className="inline-flex items-center gap-1.5 text-left font-medium text-crit underline-offset-3 hover:underline" onClick={() => { setAcc(k); location.hash = "fila"; }}><TriangleAlert className="size-4" aria-hidden />{fails} post{fails > 1 ? "s" : ""} com falha ou atraso. Ver na Fila.</button> : null}
            {pend ? <span className="text-warn">{pend} stor{pend > 1 ? "ies" : "y"} à mão sem registro de postagem.</span> : null}
          </div>
        ) : null}

        <CollapsibleContent className="flex flex-col gap-3 border-t px-4 pt-4 pb-4 md:border-t-0 md:pt-0">
          <dl className="grid grid-cols-3 gap-3">
            <Fig label="Seguidores" value={<>{n(pf.followers_count)}{seg ? <span className={cn("text-xs", seg > 0 ? "text-ok" : "text-crit")}>{seg > 0 ? "+" : ""}{n(seg)} em 7 dias</span> : null}</>} />
            <Fig label="Posts no perfil" value={n(pf.media_count)} />
            <Fig label="Na fila" value={n(queued)} />
          </dl>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Últimos 7 dias</h3>
            {r7.erro ? <p className="text-sm text-muted-foreground">Resumo indisponível: {r7.erro}</p> : (
              <dl className="grid grid-cols-3 gap-3">
                <Fig label="Contas alcançadas" value={n(r7.reach)} delta={weekDelta(r7, r28, "reach")} />
                <Fig label="Visualizações" value={n(r7.views)} delta={weekDelta(r7, r28, "views")} />
                <Fig label="Interações" value={n(r7.total_interactions)} delta={weekDelta(r7, r28, "total_interactions")} />
                <Fig label="Contas engajadas" value={n(r7.accounts_engaged)} delta={weekDelta(r7, r28, "accounts_engaged")} />
                <Fig label="Compartilhamentos" value={n(r7.shares)} delta={weekDelta(r7, r28, "shares")} />
                <Fig label="Salvamentos" value={n(r7.saves)} delta={weekDelta(r7, r28, "saves")} />
              </dl>
            )}
            {!["reach", "views", "total_interactions"].some((key) => weekDelta(r7, r28, key)) && !r7.erro ? (
              <p className="text-xs text-muted-foreground">A seta contra as semanas anteriores aparece quando a conta tiver um mês de números.</p>
            ) : null}
          </div>
          {temReach ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Contas alcançadas por dia · {reach.length} dias</h3>
              <TimeLine pts={reachPts} label="Contas alcançadas" modo="dia" height={desktop ? 110 : 140} />
            </div>
          ) : null}
          <div className="flex flex-col gap-1 border-t pt-3 text-sm">
            <p className="truncate">
              <span className="text-muted-foreground">Próximo: </span>
              {next ? (<><b className="num font-medium">{ddmmhm(next.quando)}</b> · {FMT[next.formato] || next.formato} · {cleanTitle(next.titulo.replace(/^(Carrossel|Reels?|Stories|Post)\s*[—-]\s*/i, ""), next.legenda)}</>) : <span className="text-muted-foreground">nada na fila</span>}
            </p>
            <p className="truncate">
              <span className="text-muted-foreground">Último no perfil: </span>
              {last ? (<><b className="num font-medium">{ddmmhm(last.quando)}</b> · <a href={last.link} target="_blank" rel="noopener" className="underline underline-offset-3">{cleanTitle((last.legenda || "post").split("\n")[0].slice(0, 70), last.legenda)}</a></>) : <span className="text-muted-foreground">sem dados ainda</span>}
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/** Uma linha por conta no modo "Todas": cabe qualquer número de contas sem empurrar a fila para baixo. */
function OverviewRow({ k }: { k: Conta }) {
  const { setAcc } = usePainel();
  const { pf, r7, r28, seg, next, fails, pend, queued, cx, photo } = useConta(k);
  const d = weekDelta(r7, r28, "reach");
  const tone = cx.cls === "off" ? "text-crit" : cx.cls === "velho" ? "text-warn" : "text-muted-foreground";
  return (
    <li data-a={k}>
      <button
        type="button"
        onClick={() => setAcc(k)}
        className="grid w-full grid-cols-[auto_1fr_auto_auto] items-center gap-x-3 gap-y-2 border-l-[3px] border-l-[var(--c)] px-4 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent focus-visible:outline-none md:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_minmax(0,1.6fr)_auto] md:gap-x-4"
        aria-label={`${ACC[k].label}: ${cx.txt}. ${n(pf.followers_count)} seguidores, ${n(r7.reach)} contas alcançadas em 7 dias. Ver só esta conta.`}
      >
        <span className="flex min-w-0 items-center gap-3 max-md:contents">
          {photo ? <img src={photo} alt="" className="size-10 shrink-0 rounded-full border-2 border-card object-cover shadow-[0_0_0_1.5px_var(--c)]" /> : <span className="size-10 shrink-0 rounded-full bg-muted" />}
          <span className="flex min-w-0 flex-col">
            <b className="truncate font-medium text-ink">{ACC[k].label}</b>
            <span className={cn("inline-flex items-center gap-1.5 text-xs", tone)}><Lamp cls={cx.cls} />{cx.txt}{cx.sub ? ` · ${cx.sub}` : ""}</span>
          </span>
        </span>
        {/* celular: seguidores e alcance à direita */}
        <span className="flex flex-col items-end text-right md:hidden">
          <span className="text-sm"><b className="num font-medium text-ink">{n(pf.followers_count)}</b> <span className="text-xs text-muted-foreground">seg.</span></span>
          <span className="text-sm"><b className="num font-medium text-ink">{n(r7.reach)}</b> <span className="text-xs text-muted-foreground">alc. 7d</span></span>
        </span>
        <Cell v={<>{n(pf.followers_count)}{seg ? <span className={cn("text-xs", seg > 0 ? "text-ok" : "text-crit")}> {seg > 0 ? "+" : ""}{n(seg)}</span> : null}</>} />
        <Cell v={<>{n(r7.reach)}{d && d.l !== "flat" ? <span className={cn("text-xs", d.l === "up" ? "text-ok" : "text-crit")}> {d.l === "up" ? "▲" : "▼"} {pctAbs(d.d)}</span> : null}</>} />
        <Cell v={n(r7.total_interactions)} />
        <Cell v={n(queued)} />
        <span className="hidden min-w-0 truncate text-sm md:block">
          {next ? <><b className="num font-medium">{ddmmhm(next.quando)}</b> <span className="text-muted-foreground">· {FMT[next.formato] || next.formato}</span></> : <span className="text-muted-foreground">nada na fila</span>}
        </span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
        {fails || pend || cx.cls === "off" ? (
          <span className="col-span-full flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-warn-soft px-3 py-1.5 text-sm md:col-span-full">
            {cx.cls === "off" ? <span className="font-medium text-crit">Token recusado: nada desta conta é publicado.</span> : null}
            {fails ? <span className="inline-flex items-center gap-1.5 font-medium text-crit"><TriangleAlert className="size-4" aria-hidden />{fails} com falha ou atraso</span> : null}
            {pend ? <span className="text-warn">{pend} stor{pend > 1 ? "ies" : "y"} sem registro</span> : null}
          </span>
        ) : null}
      </button>
    </li>
  );
}
function Cell({ v }: { v: React.ReactNode }) {
  return <span className="num hidden text-base font-medium text-ink md:block">{v}</span>;
}

export function Accounts() {
  const { m, acc } = usePainel();
  const cxs = CONTAS.map((k) => m.conexao(k).cls);
  const off = cxs.filter((c) => c === "off").length, on = cxs.filter((c) => c === "on").length;
  if (acc !== "all" || CONTAS.length < 2) {
    const k = acc === "all" ? CONTAS[0] : acc;
    return k ? <section aria-label="Conta"><AccountCard k={k} /></section> : null;
  }
  const H = ({ c, r }: { c: string; r?: boolean }) => <span className={cn("text-xs font-medium tracking-wide text-muted-foreground uppercase", r && "")}>{c}</span>;
  return (
    <Card className="gap-0 overflow-hidden py-0" aria-labelledby="contas-tit">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-2.5">
        <h2 id="contas-tit" className="text-sm font-medium text-ink">{CONTAS.length} contas <span className={cn("font-normal", off ? "text-crit" : "text-muted-foreground")}>· {off ? `${off} desconectada${off > 1 ? "s" : ""}` : `${on} conectada${on === 1 ? "" : "s"}`}</span></h2>
        <span className="text-xs text-muted-foreground max-md:hidden">Clique numa conta para ver os números dela</span>
      </div>
      <div className="hidden grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))_minmax(0,1.6fr)_auto] gap-x-4 border-b px-4 py-2 pl-[calc(1rem+3px)] md:grid" aria-hidden>
        <H c="Conta" /><H c="Seguidores · 7 dias" /><H c="Alcance 7 dias" /><H c="Interações 7 dias" /><H c="Na fila" /><H c="Próximo" /><span className="w-4" />
      </div>
      <ul className="divide-y">{CONTAS.map((k) => <OverviewRow key={k} k={k} />)}</ul>
    </Card>
  );
}
