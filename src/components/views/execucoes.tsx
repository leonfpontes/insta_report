import { CircleCheck, CircleX, Clock, ExternalLink, Loader2, MinusCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Empty } from "@/components/bits";
import { QueueRow } from "@/components/views/fila";
import { usePainel } from "@/lib/ctx";
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

export function ExecucoesView() {
  const { m, acc } = usePainel();
  const runs = m.d.execucoes?.runs || [];
  const fails: Row[] = m.rows(acc).filter((r) => r.kind === "agenda" && (r.status === "falhou" || (r.erro && r.status !== "publicado")));
  const ruins = runs.filter((r) => r.resultado === "failure").length;
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2" aria-label="Posts com erro">
        <h2 className="text-base font-medium text-ink">Posts com erro</h2>
        {fails.length ? <ul className="divide-y overflow-hidden rounded-xl border bg-card">{fails.map((r) => <QueueRow key={r.id} r={r} showDate />)}</ul> : <p className="text-sm text-muted-foreground">Nenhum post com erro na agenda.</p>}
      </section>
      <section className="flex flex-col gap-2" aria-label="Rodadas">
        <h2 className="text-base font-medium text-ink">Últimas rodadas do publicador</h2>
        {ruins ? <p className="text-sm text-crit">{ruins} rodada{ruins > 1 ? "s" : ""} com falha. O motivo está no log de cada uma, no GitHub.</p> : null}
        {!runs.length ? <Empty>Nenhuma rodada do publicador ainda.</Empty> : (
          <Card className="gap-0 divide-y overflow-hidden py-0">
            {runs.map((r) => {
              const res = RES[r.resultado] || { txt: r.resultado || "–", cls: "text-muted-foreground", Icon: Clock };
              return (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <res.Icon className={cn("size-5 shrink-0", res.cls, r.resultado === "in_progress" && "animate-spin")} aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium text-ink">{JOB[r.job] || r.job || "Rodada"}</span>
                    <span className="text-sm text-muted-foreground"><span className="num">{r.quando ? ddmmhm(r.quando) : "–"}</span> · {EV[r.evento] || r.evento}</span>
                  </div>
                  <span className={cn("text-sm font-medium", res.cls)}>{res.txt}</span>
                  {r.link ? <a href={r.link} target="_blank" rel="noopener" className="rounded-md p-2 text-ink hover:bg-accent" aria-label={`Ver log da rodada de ${r.quando ? ddmmhm(r.quando) : ""} no GitHub`}><ExternalLink className="size-4" aria-hidden /></a> : null}
                </div>
              );
            })}
          </Card>
        )}
        <p className="text-sm text-muted-foreground">O publicador roda no GitHub Actions a cada 10 minutos, coleta números de hora em hora e renova os tokens toda segunda. Se um post falhar 3 vezes, chega um e-mail de alerta.</p>
      </section>
    </div>
  );
}
