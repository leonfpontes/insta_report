import { useMemo, useState } from "react";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, PostPhoto, StatusBadge, Verdict } from "@/components/bits";
import { MarkButton, PublishButton } from "@/components/actions";
import { usePainel } from "@/lib/ctx";
import { ACC, FMT, HORA, addDays, cleanTitle, dayKey, dayTitle, hm, todayStr, type Row } from "@/lib/model";
import { cn } from "@/lib/utils";

/** "Publicar agora" só na linha para o que sai nas próximas 24 h ou precisa de atenção; o resto, pelo detalhe. */
const acaoNaLinha = (r: Row) => ["falhou", "atrasado"].includes(r.eff) || +new Date(r.quando) - Date.now() < 24 * HORA;

export function QueueRow({ r, showDate }: { r: Row; showDate?: boolean }) {
  const { m, ativas, open, saindo } = usePainel();
  const c = r.eff === "publicado" ? m.cmpOfRow(r) : null;
  const inline = acaoNaLinha(r);
  return (
    <li data-a={r.conta} className="relative border-l-[3px] border-l-[var(--c)]">
      <div className="flex items-start gap-3 px-3 py-3 md:items-center md:px-4">
        <button type="button" onClick={() => open(r.id)} className="flex min-w-0 flex-1 items-start gap-3 text-left focus-visible:outline-none md:items-center [&:focus-visible_.t]:underline">
          <PostPhoto conta={r.conta} src={m.thumbOf(r)} label={FMT[r.formato]} size={52} avatar={m.avatar(r.conta)} />
          <span className="num hidden w-12 shrink-0 text-sm text-ink md:block">{hm(r.quando)}</span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="t line-clamp-2 font-medium text-ink md:line-clamp-1">{cleanTitle(r.titulo, r.legenda)}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="num text-ink md:hidden">{showDate ? dayTitle(dayKey(r.quando)) + " " : ""}{hm(r.quando)}</span>
              <StatusBadge eff={r.eff} saindo={!!saindo[r.id]} />
              {c ? <Verdict c={c} compact /> : null}
              <span>{FMT[r.formato] || r.formato}{r.itens && r.itens > 1 ? ` · ${r.itens} itens` : ""}</span>
              {ativas.length > 1 ? <span>{ACC[r.conta].label}</span> : null}
            </span>
            {r.erro ? <span className="text-sm text-crit">{r.erro}</span> : null}
          </span>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground md:hidden" aria-hidden />
        </button>
        {inline && (m.canPublish(r) || m.canMark(r)) ? (
          <div className="hidden shrink-0 md:block">{m.canPublish(r) ? <PublishButton r={r} /> : <MarkButton r={r} />}</div>
        ) : null}
      </div>
      {inline && (m.canPublish(r) || m.canMark(r)) ? (
        <div className="-mt-1 px-3 pb-3 pl-[76px] md:hidden">{m.canPublish(r) ? <PublishButton r={r} /> : <MarkButton r={r} />}</div>
      ) : null}
    </li>
  );
}

function Group({ title, rows, tone, note }: { title: string; rows: Row[]; tone?: "crit"; note?: string }) {
  return (
    <section className="flex flex-col gap-2" aria-label={title}>
      <h2 className={cn("flex items-center gap-1.5 text-sm font-medium tracking-wide uppercase", tone === "crit" ? "text-crit" : "text-muted-foreground")}>
        {tone === "crit" ? <TriangleAlert className="size-4" aria-hidden /> : null}{title}
        <span className="font-normal normal-case">· {rows.length} {rows.length === 1 ? "item" : "itens"}{note ? ` · ${note}` : ""}</span>
      </h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">{rows.map((r) => <QueueRow key={r.id} r={r} showDate={tone === "crit"} />)}</ul>
    </section>
  );
}

export function FilaView() {
  const { m, ativas, todas, q } = usePainel();
  const [dias, setDias] = useState(5);
  const today = todayStr();
  const { attention, byDay, restantes } = useMemo(() => {
    const all = m.rows(ativas).filter((r) => r.kind === "agenda");
    const busca = q.trim().toLowerCase();
    const hit = (r: Row) => !busca || (r.titulo + " " + (r.legenda || "")).toLowerCase().includes(busca);
    const attention = all.filter((r) => ["falhou", "atrasado", "pendente"].includes(r.eff) && hit(r)).sort((a, b) => a.quando.localeCompare(b.quando));
    const ids = new Set(attention.map((r) => r.id));
    const up = all.filter((r) => dayKey(r.quando) >= today && !ids.has(r.id) && hit(r)).sort((a, b) => a.quando.localeCompare(b.quando));
    const byDay = new Map<string, Row[]>();
    up.forEach((r) => { const k = dayKey(r.quando); byDay.set(k, [...(byDay.get(k) || []), r]); });
    return { attention, byDay, restantes: up.length };
  }, [m, ativas.join(), q, today]); // eslint-disable-line
  const keys = [...byDay.keys()];
  const shown = q ? keys : keys.filter((k) => k <= addDays(today, dias - 1));
  const hidden = keys.length - shown.length;
  const hiddenCount = keys.slice(shown.length).reduce((s, k) => s + (byDay.get(k)?.length || 0), 0);
  const hoje = byDay.get(today) || [];
  const nextUp = hoje.find((r) => +new Date(r.quando) > Date.now() && r.eff !== "publicado");

  return (
    <div className="flex flex-col gap-5">
      {attention.length ? <Group title="Precisa de atenção" rows={attention} tone="crit" /> : null}
      {!restantes && !attention.length ? (
        <Empty>{q ? "Nada na fila com essa busca." : `Nada na fila a partir de hoje${todas ? "" : ativas.length > 1 ? " para estas contas" : " para esta conta"}.`}</Empty>
      ) : null}
      {shown.map((k) => (
        <Group key={k} title={dayTitle(k)} rows={byDay.get(k)!} note={k === today && nextUp ? `próximo às ${hm(nextUp.quando)}` : undefined} />
      ))}
      {hidden > 0 ? (
        <div className="flex flex-col items-center gap-2">
          <Button variant="outline" onClick={() => setDias((d) => d + 7)}>Mostrar os próximos 7 dias</Button>
          <span className="text-sm text-muted-foreground">Faltam {hiddenCount} itens em {hidden} dias.</span>
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">
        “Publicar agora” aparece na lista para o que sai nas próximas 24 horas; para os outros, abra o post. Stories à mão viram publicados quando o story do dia é detectado no perfil, ou quando você toca em “Já postei”.
      </p>
    </div>
  );
}
