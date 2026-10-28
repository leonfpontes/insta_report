import { useEffect, useState } from "react";
import { CalendarDays, CircleCheck, CircleX, Clock, ExternalLink, Loader2, MinusCircle, TriangleAlert, X } from "lucide-react";
import { ptBR } from "react-day-picker/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty } from "@/components/bits";
import { QueueRow } from "@/components/views/fila";
import { usePainel } from "@/lib/ctx";
import { lerExecucoes, type Rodada, type Rodadas } from "@/lib/api";
import { ddmmhm, type Row } from "@/lib/model";
import { cn } from "@/lib/utils";

const JOB: Record<string, string> = { publicar: "Publicação", metricas: "Coleta de números", "renovar-token": "Renovação do token" };
const EV: Record<string, string> = { schedule: "automática", workflow_dispatch: "pedida no painel" };
const RES: Record<string, { txt: string; cls: string; Icon: typeof CircleCheck }> = {
  success: { txt: "Deu certo", cls: "text-ok", Icon: CircleCheck },
  failure: { txt: "Falhou", cls: "text-crit", Icon: CircleX },
  cancelled: { txt: "Cancelada", cls: "text-muted-foreground", Icon: MinusCircle },
  skipped: { txt: "Pulada", cls: "text-muted-foreground", Icon: MinusCircle },
  in_progress: { txt: "Rodando", cls: "text-ink", Icon: Loader2 },
  queued: { txt: "Na fila", cls: "text-ink", Icon: Clock },
};
const DIA = 86400000;
/** Data local do seletor → AAAA-MM-DD (o seletor trabalha no fuso do aparelho). */
const iso = (d?: Date) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : undefined);
const br = (d?: Date) => (d ? d.toLocaleDateString("pt-BR") : "");

function DataPicker({ label, value, onChange, min, max }: { label: string; value?: Date; onChange: (d?: Date) => void; min?: Date; max?: Date }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-10 flex-1 justify-start bg-card font-normal md:w-44 md:flex-none", !value && "text-muted-foreground")} aria-label={`${label}: ${value ? br(value) : "sem data"}`}>
          <CalendarDays aria-hidden />
          <span className="text-muted-foreground">{label}</span>
          <span className="num text-ink">{value ? br(value) : "–"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          locale={ptBR}
          selected={value}
          defaultMonth={value || max}
          onSelect={(d) => { onChange(d); setOpen(false); }}
          disabled={[...(min ? [{ before: min }] : []), ...(max ? [{ after: max }] : [])]}
        />
      </PopoverContent>
    </Popover>
  );
}

function RodadaRow({ r }: { r: Rodada }) {
  const res = RES[r.resultado] || { txt: r.resultado || "–", cls: "text-muted-foreground", Icon: Clock };
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <res.Icon className={cn("size-5 shrink-0", res.cls, r.resultado === "in_progress" && "animate-spin")} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium text-ink">{JOB[r.job] || r.job || "Rodada"}</span>
        <span className="text-sm text-muted-foreground"><span className="num">{r.quando ? ddmmhm(r.quando) : "–"}</span> · {EV[r.evento] || r.evento}</span>
      </div>
      <span className={cn("text-sm font-medium", res.cls)}>{res.txt}</span>
      {r.link ? <a href={r.link} target="_blank" rel="noopener" className="rounded-md p-2 text-ink hover:bg-accent" aria-label={`Ver log da rodada de ${r.quando ? ddmmhm(r.quando) : ""} no GitHub`}><ExternalLink className="size-4" aria-hidden /></a> : null}
    </div>
  );
}

/** Páginas visíveis: a primeira, a última e as vizinhas da atual. */
function paginas(at: number, tot: number): (number | "…")[] {
  const set = [...new Set([1, at - 1, at, at + 1, tot])].filter((p) => p >= 1 && p <= tot).sort((a, b) => a - b);
  return set.flatMap((p, i) => (i && p - set[i - 1] > 1 ? ["…" as const, p] : [p]));
}

export function ExecucoesView() {
  const { m, ativas, q } = usePainel();
  const [de, setDe] = useState<Date>();
  const [ate, setAte] = useState<Date>();
  const [pag, setPag] = useState(1);
  const [dados, setDados] = useState<Rodadas | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    setCarregando(true); setErro("");
    lerExecucoes(pag, iso(de), iso(ate))
      .then((j) => { if (vivo) setDados(j); })
      .catch((e) => { if (vivo) setErro((e as Error).message); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [pag, de, ate]);
  useEffect(() => setPag(1), [de, ate]);

  // O alerta de falha só vale para as últimas 24 horas; depois some.
  const agora = Date.now();
  const recentes = m.d.execucoes?.runs || [];
  const runsRuins = recentes.filter((r) => r.resultado === "failure" && agora - +new Date(r.quando) < DIA);
  const busca = q.trim().toLowerCase();
  const fails: Row[] = m.rows(ativas).filter((r) =>
    r.kind === "agenda" && (r.status === "falhou" || (r.erro && r.status !== "publicado")) &&
    agora - +new Date(r.quando) < DIA && (!busca || (r.titulo + " " + (r.legenda || "")).toLowerCase().includes(busca)));

  const runs = dados?.runs ?? (pag === 1 && !de && !ate ? recentes.slice(0, 20) : []);
  const total = dados?.total ?? runs.length;
  const nPag = Math.max(1, Math.min(50, Math.ceil(total / (dados?.porPagina || 20))));
  const hoje = new Date();
  const ir = (p: number) => (e: React.MouseEvent) => { e.preventDefault(); if (p >= 1 && p <= nPag) setPag(p); };

  return (
    <div className="flex flex-col gap-6">
      {runsRuins.length || fails.length ? (
        <section className="flex flex-col gap-2 rounded-xl border border-crit/40 bg-crit-soft p-4" aria-label="Falhas nas últimas 24 horas">
          <h2 className="inline-flex items-center gap-2 font-medium text-crit"><TriangleAlert className="size-5" aria-hidden />Falhas nas últimas 24 horas</h2>
          {runsRuins.length ? <p className="text-sm text-crit">{runsRuins.length} rodada{runsRuins.length > 1 ? "s" : ""} com falha. O motivo está no log de cada uma, no GitHub.</p> : null}
          {fails.length ? <ul className="divide-y overflow-hidden rounded-lg border bg-card">{fails.map((r) => <QueueRow key={r.id} r={r} showDate />)}</ul> : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-3" aria-label="Rodadas">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-medium text-ink">Rodadas do publicador</h2>
          <div className="flex flex-wrap items-center gap-2">
            <DataPicker label="De" value={de} onChange={setDe} max={ate || hoje} />
            <DataPicker label="Até" value={ate} onChange={setAte} min={de} max={hoje} />
            {de || ate ? <Button variant="ghost" onClick={() => { setDe(undefined); setAte(undefined); }}><X aria-hidden />Limpar datas</Button> : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {carregando && !dados ? "Carregando…" : `${total} rodada${total === 1 ? "" : "s"}${de || ate ? " no período" : ""}${nPag > 1 ? ` · página ${pag} de ${nPag}` : ""}`}
          {total > 1000 ? " (o GitHub mostra as 1000 mais recentes)" : ""}
        </p>
        {erro ? <p className="rounded-md bg-crit-soft px-3 py-2 text-sm text-crit">{erro}</p> : null}
        {carregando && !runs.length ? (
          <Card className="gap-0 divide-y overflow-hidden py-0">{Array.from({ length: 5 }, (_, i) => <div key={i} className="px-4 py-3"><Skeleton className="h-10 w-full" /></div>)}</Card>
        ) : !runs.length ? (
          <Empty>{de || ate ? "Nenhuma rodada nesse período." : "Nenhuma rodada do publicador ainda."}</Empty>
        ) : (
          <Card className={cn("gap-0 divide-y overflow-hidden py-0 transition-opacity", carregando && "opacity-60")} aria-busy={carregando}>
            {runs.map((r) => <RodadaRow key={r.id} r={r} />)}
          </Card>
        )}
        {nPag > 1 ? (
          <Pagination aria-label="Páginas das rodadas">
            <PaginationContent>
              <PaginationItem><PaginationPrevious href="#" onClick={ir(pag - 1)} aria-disabled={pag === 1} className={cn(pag === 1 && "pointer-events-none opacity-50")} /></PaginationItem>
              {paginas(pag, nPag).map((p, i) => (
                <PaginationItem key={i} className={cn(p !== pag && "max-md:hidden")}>
                  {p === "…" ? <PaginationEllipsis /> : <PaginationLink href="#" isActive={p === pag} onClick={ir(p)} aria-label={`Página ${p}`}>{p}</PaginationLink>}
                </PaginationItem>
              ))}
              <PaginationItem><PaginationNext href="#" onClick={ir(pag + 1)} aria-disabled={pag === nPag} className={cn(pag === nPag && "pointer-events-none opacity-50")} /></PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
        <p className="text-sm text-muted-foreground">O publicador roda no GitHub Actions a cada 10 minutos, coleta números de hora em hora e renova os tokens toda segunda. Se um post falhar 3 vezes, chega um e-mail de alerta.</p>
      </section>
    </div>
  );
}
