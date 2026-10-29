import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ptBR } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePainel } from "@/lib/ctx";
import { useDesktop } from "@/hooks/use-media";
import { ACC, DOW, DOW_LONGO, FMT, MES, MONTHS, addDays, cleanTitle, dayKey, hm, todayStr, type Conta, type Row } from "@/lib/model";
import { cn } from "@/lib/utils";

type Modo = "mes" | "semana" | "dia";
const MODOS: { v: Modo; l: string }[] = [{ v: "mes", l: "Mês" }, { v: "semana", l: "Semana" }, { v: "dia", l: "Dia" }];
const KEY = "agenda-cal";
function lerModo(desktop: boolean): Modo {
  try { const v = localStorage.getItem(KEY); if (v === "mes" || v === "semana" || v === "dia") return v; } catch { /* sem armazenamento */ }
  return desktop ? "semana" : "dia";
}

/** Dia da semana com segunda = 0. */
const dow = (k: string) => (new Date(k + "T12:00:00Z").getUTCDay() + 6) % 7;
const segunda = (k: string) => addDays(k, -dow(k));
const minutos = (iso: string) => { const [h, mm] = hm(iso).split(":").map(Number); return h * 60 + mm; };
const keyToDate = (k: string) => new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
const dateToKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function titulo(modo: Modo, k: string) {
  const ano = k.slice(0, 4), mes = +k.slice(5, 7) - 1;
  if (modo === "mes") return `${MONTHS[mes]} de ${ano}`;
  if (modo === "dia") return `${DOW_LONGO[dow(k)]}, ${+k.slice(8)} de ${MONTHS[mes]} de ${ano}`;
  const a = segunda(k), b = addDays(a, 6);
  const ma = +a.slice(5, 7) - 1, mb = +b.slice(5, 7) - 1;
  return ma === mb ? `${+a.slice(8)} a ${+b.slice(8)} de ${MONTHS[ma]} de ${b.slice(0, 4)}` : `${+a.slice(8)} de ${MES[ma]} a ${+b.slice(8)} de ${MES[mb]} de ${b.slice(0, 4)}`;
}

function Legend() {
  const { ativas } = usePainel();
  const i = "mr-1.5 inline-block h-2.5 w-3.5 rounded-[3px] align-[-1px]";
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {ativas.length > 1 ? ativas.map((k) => <span key={k} data-a={k}><i className={cn(i, "w-1 bg-[var(--c)]")} />{ACC[k].label}</span>) : null}
      <span><i className={cn(i, "border-[1.5px] border-input")} />Agendado</span>
      <span><i className={cn(i, "border border-ok/40 bg-ok-soft")} />Publicado</span>
      <span><i className={cn(i, "border-[1.5px] border-dashed border-manual bg-manual-soft")} />Story à mão</span>
      <span><i className={cn(i, "border-[1.5px] border-crit bg-crit-soft")} />Falha ou atraso</span>
    </div>
  );
}

const tom = (r: Row) => cn(
  "border border-l-[3px] border-l-[var(--c)] bg-card",
  r.eff === "publicado" && "bg-ok-soft",
  (r.eff === "manual" || r.eff === "pendente") && "border-[1.5px] border-l-[3px] border-dashed border-manual border-l-[var(--c)] bg-manual-soft [border-left-style:solid]",
  (r.eff === "falhou" || r.eff === "atrasado") && "border-crit bg-crit-soft",
);

function Marcas({ r }: { r: Row }) {
  const { m } = usePainel();
  const c = r.eff === "publicado" ? m.cmpOfRow(r) : null;
  return (
    <>
      {r.eff === "publicado" ? <Check className="size-3 shrink-0 text-ok" aria-label="publicado" /> : null}
      {c?.lvl === "up" ? <ArrowUp className="size-3 shrink-0 text-ok" aria-label="acima da média" /> : c?.lvl === "down" ? <ArrowDown className="size-3 shrink-0 text-crit" aria-label="abaixo da média" /> : null}
    </>
  );
}

/* ---------------- Mês ---------------- */

function Mes({ k, byDay, irDia }: { k: string; byDay: Map<string, Row[]>; irDia: (k: string) => void }) {
  const { open } = usePainel();
  const desktop = useDesktop();
  const today = todayStr();
  const ini = segunda(k.slice(0, 8) + "01");
  const mes = k.slice(0, 7);
  const nDias = new Date(Date.UTC(+k.slice(0, 4), +k.slice(5, 7), 0)).getUTCDate();
  const semanas = Math.ceil((dow(k.slice(0, 8) + "01") + nDias) / 7);
  const dias = Array.from({ length: semanas * 7 }, (_, i) => addDays(ini, i));
  const lim = desktop ? 4 : 3;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b">{DOW.map((d) => <div key={d} className="px-2 py-2 text-center text-xs font-medium tracking-wider text-muted-foreground uppercase md:text-left">{d}</div>)}</div>
      <div className="grid grid-cols-7">
        {dias.map((d) => {
          const fora = d.slice(0, 7) !== mes;
          const evs = byDay.get(d) || [];
          const extra = evs.length - lim;
          return (
            <div key={d} className={cn("flex min-h-20 min-w-0 flex-col gap-0.5 border-r border-b p-1 md:min-h-32 md:p-1.5 [&:nth-child(7n)]:border-r-0", fora && "bg-muted/50")}>
              <button type="button" onClick={() => irDia(d)} className="mx-auto mb-0.5 rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none md:mx-0" aria-label={`Ver o dia ${+d.slice(8)} de ${MONTHS[+d.slice(5, 7) - 1]}`}>
                <span className={cn("num flex size-7 items-center justify-center rounded-full text-xs font-medium hover:bg-accent", fora ? "text-muted-foreground" : "text-ink", d === today && "bg-primary text-primary-foreground hover:bg-primary")}>{+d.slice(8)}</span>
              </button>
              {evs.slice(0, extra > 0 ? lim - 1 : lim).map((r) => desktop ? (
                <button key={r.id} type="button" data-a={r.conta} onClick={() => open(r.id)} title={`${ACC[r.conta]?.label} · ${cleanTitle(r.titulo, r.legenda)}`}
                  className={cn("flex w-full min-w-0 items-center gap-1.5 rounded-sm px-1 py-0.5 text-left text-xs hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none", (r.eff === "falhou" || r.eff === "atrasado") && "bg-crit-soft text-crit")}>
                  <span className={cn("size-2 shrink-0 rounded-full bg-[var(--c)]", (r.eff === "manual" || r.eff === "pendente") && "border-[1.5px] border-dashed border-manual bg-manual-soft")} aria-hidden />
                  <span className="num shrink-0 text-muted-foreground">{hm(r.quando)}</span>
                  <span className="truncate text-ink">{cleanTitle(r.titulo, r.legenda)}</span>
                  <Marcas r={r} />
                </button>
              ) : (
                <button key={r.id} type="button" data-a={r.conta} onClick={() => open(r.id)} aria-label={`${hm(r.quando)} ${ACC[r.conta]?.label}: ${cleanTitle(r.titulo, r.legenda)}`}
                  className={cn("h-1.5 w-full rounded-full bg-[var(--c)]", r.eff === "publicado" && "opacity-50", (r.eff === "manual" || r.eff === "pendente") && "border border-dashed border-manual bg-manual-soft", (r.eff === "falhou" || r.eff === "atrasado") && "bg-crit")} />
              ))}
              {extra > 0 ? (
                <button type="button" onClick={() => irDia(d)} className="rounded-sm px-1 text-left text-xs font-medium text-ink hover:bg-accent max-md:text-center">
                  {desktop ? `Mais ${extra + 1}` : `+${extra + 1}`}
                </button>
              ) : null}
              {!desktop && evs.length ? <span className="sr-only">{evs.length} posts</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Semana e Dia (grade de horas) ---------------- */

const HORA_PX_D = 56, HORA_PX_M = 52;
const DUR = 45; // cada post ocupa 45 minutos na grade, só para ter onde clicar

/** Distribui posts próximos lado a lado, como a agenda do Google faz com eventos que se cruzam. */
function lanes(rows: Row[]) {
  const evs = rows.map((r) => ({ r, ini: minutos(r.quando), lane: 0, de: 1 })).sort((a, b) => a.ini - b.ini);
  let grupo: typeof evs = [], fimGrupo = -1;
  const fecha = () => { const n = Math.max(...grupo.map((e) => e.lane)) + 1; grupo.forEach((e) => (e.de = n)); grupo = []; };
  for (const e of evs) {
    if (grupo.length && e.ini >= fimGrupo) fecha();
    const ocupadas = new Set(grupo.filter((g) => g.ini + DUR > e.ini).map((g) => g.lane));
    while (ocupadas.has(e.lane)) e.lane++;
    grupo.push(e); fimGrupo = Math.max(fimGrupo, e.ini + DUR);
  }
  if (grupo.length) fecha();
  return evs;
}

function Bloco({ e, h0, px, grande }: { e: ReturnType<typeof lanes>[number]; h0: number; px: number; grande: boolean }) {
  const { m, open, ativas } = usePainel();
  const { r } = e;
  const top = ((e.ini - h0 * 60) / 60) * px;
  const alto = Math.max(26, (DUR / 60) * px - 2);
  const thumb = m.thumbOf(r);
  // No Dia cada coluna já é uma conta; na Semana as contas se misturam e a foto de perfil diz de quem é.
  const foto = !grande && ativas.length !== 1 && e.de <= 2 ? m.avatar(r.conta) : null;
  const t = Math.min(alto - 8, 34);
  return (
    <button
      type="button"
      data-a={r.conta}
      onClick={() => open(r.id)}
      title={`${hm(r.quando)} · ${ACC[r.conta]?.label} · ${cleanTitle(r.titulo, r.legenda)}`}
      aria-label={`${hm(r.quando)}, ${ACC[r.conta]?.label}, ${FMT[r.formato] || r.formato}: ${cleanTitle(r.titulo, r.legenda)}`}
      className={cn("absolute flex min-w-0 items-start gap-1.5 overflow-hidden rounded-md p-1 text-left max-md:p-0.5 text-xs leading-tight shadow-xs hover:z-10 hover:shadow-md focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none", tom(r))}
      style={{ top, height: alto, left: `calc(${(e.lane / e.de) * 100}% + 2px)`, width: `calc(${100 / e.de}% - 4px)` }}
    >
      {grande && thumb ? <img src={thumb} alt="" loading="lazy" className="shrink-0 rounded-md border object-cover" style={{ width: t, height: t }} /> : null}
      {/* Semana no celular: coluna estreita demais para texto, fica só a miniatura, com a foto da conta no canto. */}
      {!grande && thumb ? (
        <span className="relative size-full md:hidden">
          <img src={thumb} alt="" className="size-full rounded-sm object-cover" />
          {foto ? <img src={foto} alt="" className="absolute right-0.5 bottom-0.5 size-3.5 rounded-full object-cover ring-1 ring-card" /> : null}
        </span>
      ) : null}
      <span className={cn("flex min-w-0 flex-col", !grande && thumb && "max-md:hidden")}>
        <span className="num flex items-center gap-1 font-medium text-ink">
          {foto ? <img src={foto} alt="" className="size-3.5 shrink-0 rounded-full object-cover ring-1 ring-[var(--c)] max-md:hidden" /> : null}
          {hm(r.quando)}<Marcas r={r} />
        </span>
        <span className="truncate text-muted-foreground max-md:hidden">{FMT[r.formato] || r.formato} · {cleanTitle(r.titulo, r.legenda)}</span>
        {grande ? <span className="truncate text-muted-foreground md:hidden">{FMT[r.formato] || r.formato}</span> : null}
      </span>
    </button>
  );
}

function Grade({ colunas, cabecalho, rowsDe, hoje, foco }: {
  colunas: string[];
  cabecalho: (c: string) => React.ReactNode;
  rowsDe: (c: string) => Row[];
  hoje: (c: string) => boolean;
  /** Muda quando a data mostrada muda, para a grade rolar de novo até o começo do dia. */
  foco: string;
}) {
  const desktop = useDesktop();
  const px = desktop ? HORA_PX_D : HORA_PX_M;
  const todos = colunas.flatMap(rowsDe);
  const mins = todos.map((r) => minutos(r.quando));
  const h0 = Math.min(7, ...mins.map((x) => Math.floor(x / 60)));
  const h1 = Math.max(23, ...mins.map((x) => Math.ceil((x + DUR) / 60)));
  const horas = Array.from({ length: h1 - h0 }, (_, i) => h0 + i);
  const box = useRef<HTMLDivElement>(null);
  const [agora, setAgora] = useState(() => minutos(new Date().toISOString()));
  useEffect(() => { const t = setInterval(() => setAgora(minutos(new Date().toISOString())), 60_000); return () => clearInterval(t); }, []);
  // Abre perto da hora atual (ou do primeiro post), como a agenda do Google.
  useLayoutEffect(() => {
    const alvo = colunas.some(hoje) ? agora - 90 : (Math.min(...mins, 9 * 60) - 30);
    box.current?.scrollTo({ top: Math.max(0, ((alvo - h0 * 60) / 60) * px) });
  }, [colunas.join(), foco]); // eslint-disable-line
  const grande = colunas.length <= 3;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div ref={box} className="max-h-[calc(100dvh-17rem)] min-h-96 overflow-auto md:max-h-[calc(100dvh-16rem)]">
        <div className="sticky top-0 z-20 grid border-b bg-card" style={{ gridTemplateColumns: `3rem repeat(${colunas.length}, minmax(0, 1fr))` }}>
          <div className="flex items-end justify-center pb-1 text-[0.75rem] text-muted-foreground">GMT-3</div>
          {colunas.map((c) => <div key={c} className="min-w-0 border-l px-1 py-2">{cabecalho(c)}</div>)}
        </div>
        <div className="relative grid" style={{ gridTemplateColumns: `3rem repeat(${colunas.length}, minmax(0, 1fr))`, height: horas.length * px }}>
          <div className="relative">
            {horas.map((h, i) => <span key={h} className="num absolute right-1.5 -translate-y-1/2 text-xs text-muted-foreground" style={{ top: i * px }}>{i ? `${String(h).padStart(2, "0")}h` : ""}</span>)}
          </div>
          {colunas.map((c) => (
            <div key={c} className={cn("relative border-l", hoje(c) && "bg-accent/40")}>
              {horas.map((h, i) => <div key={h} className="absolute inset-x-0 border-t border-border/70" style={{ top: i * px }} />)}
              {lanes(rowsDe(c)).map((e) => <Bloco key={e.r.id} e={e} h0={h0} px={px} grande={grande} />)}
              {hoje(c) && agora >= h0 * 60 && agora <= h1 * 60 ? (
                <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: ((agora - h0 * 60) / 60) * px }} aria-hidden>
                  <span className="-ml-1 size-2.5 rounded-full bg-crit" /><span className="h-0.5 flex-1 bg-crit" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CabDia({ d, onClick }: { d: string; onClick?: () => void }) {
  const today = d === todayStr();
  return (
    <button type="button" onClick={onClick} className="flex w-full flex-col items-center gap-0.5 rounded-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none" aria-label={`Ver o dia ${+d.slice(8)}`}>
      <span className={cn("text-xs font-medium uppercase", today ? "text-ink" : "text-muted-foreground")}>{DOW[dow(d)]}</span>
      <span className={cn("num flex size-8 items-center justify-center rounded-full text-base font-medium md:size-9 md:text-lg", today ? "bg-primary text-primary-foreground" : "text-ink hover:bg-accent")}>{+d.slice(8)}</span>
    </button>
  );
}

function CabConta({ k }: { k: Conta }) {
  const { m } = usePainel();
  const av = m.avatar(k);
  return (
    <div data-a={k} className="flex min-w-0 flex-col items-center gap-1 text-center">
      {av ? <img src={av} alt="" className="size-8 rounded-full object-cover shadow-[0_0_0_2px_var(--c)]" /> : <span className="size-8 rounded-full bg-[var(--c)]" />}
      <span className="w-full truncate text-xs font-medium text-ink">{ACC[k].label}</span>
    </div>
  );
}

/* ---------------- Visão ---------------- */

export function CalendarioView() {
  const { m, ativas, q } = usePainel();
  const desktop = useDesktop();
  const [modo, setModoS] = useState<Modo>(() => lerModo(desktop));
  const [k, setK] = useState(todayStr);
  const [pick, setPick] = useState(false);
  const setModo = (v: Modo) => { setModoS(v); try { localStorage.setItem(KEY, v); } catch { /* ignora */ } };

  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    const busca = q.trim().toLowerCase();
    m.rows(ativas).filter((r) => !busca || (r.titulo + " " + (r.legenda || "")).toLowerCase().includes(busca))
      // Post antecipado ou atrasado aparece na hora em que saiu, não na marcada.
      .map((r) => ({ ...r, quando: m.noAr(r) })).forEach((r) => { const d = dayKey(r.quando); map.set(d, [...(map.get(d) || []), r]); });
    map.forEach((a) => a.sort((p, x) => p.quando.localeCompare(x.quando)));
    return map;
  }, [m, ativas.join(), q]); // eslint-disable-line

  const passo = (n: number) => {
    if (modo === "dia") return setK((x) => addDays(x, n));
    if (modo === "semana") return setK((x) => addDays(x, 7 * n));
    setK((x) => { const d = new Date(Date.UTC(+x.slice(0, 4), +x.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 10); });
  };
  const irDia = (d: string) => { setK(d); setModo("dia"); };
  const today = todayStr();
  const naHoje = modo === "mes" ? k.slice(0, 7) === today.slice(0, 7) : modo === "semana" ? segunda(k) === segunda(today) : k === today;
  const semana = Array.from({ length: 7 }, (_, i) => addDays(segunda(k), i));
  const doDia = byDay.get(k) || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setK(today)} aria-disabled={naHoje} className={cn(naHoje && "text-muted-foreground")}>Hoje</Button>
        <Button variant="ghost" size="icon" onClick={() => passo(-1)} aria-label={modo === "mes" ? "Mês anterior" : modo === "semana" ? "Semana anterior" : "Dia anterior"}><ChevronLeft aria-hidden /></Button>
        <Button variant="ghost" size="icon" onClick={() => passo(1)} aria-label={modo === "mes" ? "Próximo mês" : modo === "semana" ? "Próxima semana" : "Próximo dia"}><ChevronRight aria-hidden /></Button>
        <Popover open={pick} onOpenChange={setPick}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-10 min-w-0 px-2 text-base font-medium text-ink md:text-xl" aria-live="polite">
              <span className="truncate first-letter:uppercase">{titulo(modo, k)}</span><ChevronDown className="opacity-60" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" locale={ptBR} selected={keyToDate(k)} defaultMonth={keyToDate(k)} onSelect={(d) => { if (d) { setK(dateToKey(d)); setPick(false); } }} />
          </PopoverContent>
        </Popover>
        <ToggleGroup type="single" variant="outline" value={modo} onValueChange={(v) => v && setModo(v as Modo)} aria-label="Visão do calendário" className="ml-auto [&>*]:bg-card [&>*[data-state=on]]:bg-accent max-md:w-full">
          {MODOS.map(({ v, l }) => <ToggleGroupItem key={v} value={v} className="h-10 px-4 max-md:flex-1">{l}</ToggleGroupItem>)}
        </ToggleGroup>
      </div>

      {modo === "mes" ? <Mes k={k} byDay={byDay} irDia={irDia} /> : null}
      {modo === "semana" ? (
        <Grade colunas={semana} cabecalho={(d) => <CabDia d={d} onClick={() => irDia(d)} />} rowsDe={(d) => byDay.get(d) || []} hoje={(d) => d === today} foco={segunda(k)} />
      ) : null}
      {modo === "dia" ? (
        <>
          {!doDia.length ? <p className="text-sm text-muted-foreground">Nada marcado neste dia{q ? " com essa busca" : ""}.</p> : null}
          <Grade colunas={ativas} cabecalho={(c) => <CabConta k={c} />} rowsDe={(c) => doDia.filter((r) => r.conta === c)} hoje={() => k === today} foco={k} />
        </>
      ) : null}
      <Legend />
    </div>
  );
}
