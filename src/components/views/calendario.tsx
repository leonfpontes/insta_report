import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, PostPhoto } from "@/components/bits";
import { QueueRow } from "@/components/views/fila";
import { usePainel } from "@/lib/ctx";
import { useDesktop } from "@/hooks/use-media";
import { ACC, CONTAS, DOW, FMT, MONTHS, cleanTitle, dayKey, dayTitle, hm, todayStr, type Row } from "@/lib/model";
import { cn } from "@/lib/utils";

function Legend() {
  const { acc } = usePainel();
  const i = "inline-block h-2.5 w-3.5 rounded-[3px] align-[-1px] mr-1.5";
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {acc === "all" && CONTAS.length > 1 ? CONTAS.map((k) => <span key={k} data-a={k}><i className={cn(i, "w-1 bg-[var(--c)]")} />{ACC[k].label}</span>) : null}
      <span><i className={cn(i, "border-[1.5px] border-input")} />Agendado</span>
      <span><i className={cn(i, "bg-ok-soft border border-ok/40")} />Publicado</span>
      <span><i className={cn(i, "border-[1.5px] border-dashed border-warn")} />Story à mão</span>
      <span><i className={cn(i, "border-[1.5px] border-crit bg-crit-soft")} />Falha ou atraso</span>
      <span><b className="text-ok">▲</b> <b className="text-crit">▼</b> acima ou abaixo da média</span>
    </div>
  );
}

function Ev({ r }: { r: Row }) {
  const { m, open } = usePainel();
  const c = r.eff === "publicado" ? m.cmpOfRow(r) : null;
  return (
    <button
      type="button"
      data-a={r.conta}
      onClick={() => open(r.id)}
      title={`${ACC[r.conta]?.label ?? r.conta} · ${cleanTitle(r.titulo, r.legenda)}`}
      className={cn(
        "flex w-full min-w-0 items-center gap-1.5 rounded-md border border-l-[3px] border-l-[var(--c)] bg-card p-1 text-left text-xs leading-tight hover:border-input focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        r.eff === "publicado" && "bg-ok-soft/60",
        (r.eff === "manual" || r.eff === "pendente") && "border-dashed border-l-solid",
        (r.eff === "falhou" || r.eff === "atrasado") && "border-crit bg-crit-soft",
      )}
    >
      <PostPhoto conta={r.conta} src={m.thumbOf(r)} size={26} avatar={null} />
      <span className="flex min-w-0 flex-col">
        <span className="num flex items-center gap-1 text-ink">
          {hm(r.quando)}
          {r.eff === "publicado" ? <Check className="size-3 text-ok" aria-label="publicado" /> : null}
          {c?.lvl === "up" ? <ArrowUp className="size-3 text-ok" aria-label="acima da média" /> : c?.lvl === "down" ? <ArrowDown className="size-3 text-crit" aria-label="abaixo da média" /> : null}
        </span>
        <span className="truncate text-muted-foreground">{FMT[r.formato] || r.formato} · {cleanTitle(r.titulo, r.legenda)}</span>
      </span>
    </button>
  );
}

export function CalendarioView() {
  const { m, acc } = usePainel();
  const desktop = useDesktop();
  const today = todayStr();
  const [ym, setYm] = useState(() => ({ y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 }));
  const [antes, setAntes] = useState(false);
  const todayRef = useRef<HTMLDivElement>(null);
  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    m.rows(acc).forEach((r) => { const k = dayKey(r.quando); map.set(k, [...(map.get(k) || []), r]); });
    map.forEach((a) => a.sort((p, q) => p.quando.localeCompare(q.quando)));
    return map;
  }, [m, acc]);
  const { y, m: mo } = ym;
  const isThisMonth = today.slice(0, 7) === `${y}-${String(mo + 1).padStart(2, "0")}`;
  const go = (d: number) => setYm(({ y, m }) => { let nm = m + d, ny = y; if (nm < 0) { nm = 11; ny--; } if (nm > 11) { nm = 0; ny++; } return { y: ny, m: nm }; });
  const goToday = () => { setYm({ y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 }); setTimeout(() => todayRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 50); };
  useEffect(() => { if (isThisMonth && desktop) todayRef.current?.scrollIntoView({ block: "nearest" }); }, [desktop]); // eslint-disable-line

  const first = new Date(Date.UTC(y, mo, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const cells: string[] = [];
  for (let i = 0; i < Math.ceil((lead + days) / 7) * 7; i++) cells.push(new Date(Date.UTC(y, mo, 1 + i - lead)).toISOString().slice(0, 10));
  const monthKeys = cells.filter((d) => +d.slice(5, 7) - 1 === mo);
  // No computador, as semanas vazias que já passaram somem para hoje ficar à vista.
  let weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  if (isThisMonth) {
    const wToday = weeks.findIndex((w) => w.includes(today));
    const firstBusy = weeks.findIndex((w) => w.some((d) => byDay.get(d)?.length));
    const start = Math.max(0, Math.min(wToday, firstBusy < 0 ? wToday : firstBusy));
    if (!antes) weeks = weeks.slice(start);
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={() => go(-1)} aria-label="Mês anterior"><ChevronLeft aria-hidden /></Button>
        <h2 className="min-w-[9.5em] text-center text-lg font-medium text-ink capitalize" aria-live="polite">{MONTHS[mo]} {y}</h2>
        <Button variant="outline" size="icon" onClick={() => go(1)} aria-label="Próximo mês"><ChevronRight aria-hidden /></Button>
        <Button variant="secondary" onClick={goToday} disabled={isThisMonth && !antes}>Hoje</Button>
      </div>
      <Legend />
    </div>
  );

  if (!desktop) {
    const list = monthKeys.filter((d) => byDay.get(d)?.length);
    const past = isThisMonth ? list.filter((d) => d < today) : [];
    const visible = isThisMonth && !antes ? list.filter((d) => d >= today) : list;
    return (
      <div className="flex flex-col gap-4">
        {header}
        {past.length && !antes ? <Button variant="ghost" onClick={() => setAntes(true)}>Mostrar {past.length} dias anteriores deste mês</Button> : null}
        {!visible.length ? <Empty>Nada marcado neste mês.</Empty> : null}
        {visible.map((d) => (
          <section key={d} ref={d === today ? todayRef : undefined} className="flex scroll-mt-32 flex-col gap-2" aria-label={dayTitle(d)}>
            <h3 className={cn("text-sm font-medium tracking-wide uppercase", d === today ? "text-bronze-ink" : "text-muted-foreground")}>{dayTitle(d)}{d !== today ? "" : ` · ${+d.slice(8)}/${d.slice(5, 7)}`}</h3>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">{byDay.get(d)!.map((r) => <QueueRow key={r.id} r={r} />)}</ul>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      {isThisMonth && !antes && weeks.length < cells.length / 7 ? (
        <Button variant="ghost" className="self-start" onClick={() => setAntes(true)}>Mostrar o começo do mês</Button>
      ) : null}
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-7 border-b">{DOW.map((d) => <div key={d} className="px-2.5 py-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">{d}</div>)}</div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((d) => {
            const inM = +d.slice(5, 7) - 1 === mo;
            const evs = byDay.get(d) || [];
            return (
              <div key={d} ref={d === today ? todayRef : undefined} className={cn("flex min-h-28 min-w-0 flex-col gap-1 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0", !inM && "bg-muted/60", d === today && "bg-accent")}>
                <div className="num flex justify-between text-xs text-muted-foreground">
                  <b className={cn("font-medium", !inM && "opacity-50", d === today && "rounded-sm bg-bronze px-1.5 text-white")}>{+d.slice(8)}</b>
                </div>
                {evs.map((r) => <Ev key={r.id} r={r} />)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
