import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GalItem } from "@/lib/model";
import { cn } from "@/lib/utils";

/** Carrossel do detalhe: desliza com o dedo, setas no computador, pontos e contador. */
export function Gallery({ items, single }: { items: GalItem[] | null; single?: string | null }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const k = items?.length || 0;
  useEffect(() => { setI(0); track.current?.scrollTo({ left: 0 }); }, [items]);
  if (!k) return single ? <img src={single} alt="Prévia do post" className="max-h-80 self-start rounded-lg border" /> : null;
  const go = (j: number) => { const t = track.current; if (!t) return; j = Math.max(0, Math.min(k - 1, j)); t.scrollTo({ left: j * t.clientWidth, behavior: "smooth" }); };
  const onScroll = () => {
    const t = track.current; if (!t) return;
    const j = Math.round(t.scrollLeft / (t.clientWidth || 1));
    if (j !== i) { setI(j); t.querySelectorAll("video").forEach((v) => { if (!v.paused) v.pause(); }); }
  };
  return (
    <div className="relative flex flex-col gap-2">
      <div
        ref={track}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-roledescription="carrossel"
        aria-label={k > 1 ? `Carrossel com ${k} itens. Use as setas do teclado.` : "Mídia do post"}
        onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); go(i + (e.key === "ArrowRight" ? 1 : -1)); } }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-lg border bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {items!.map((m, j) => (
          <figure key={j} className="m-0 flex aspect-[4/5] max-h-[62vh] w-full shrink-0 snap-center items-center justify-center">
            {m.video ? (
              <video src={m.video} poster={m.capa} controls playsInline muted preload="metadata" aria-label={`Vídeo ${j + 1} de ${k}`} className="size-full object-contain" />
            ) : (
              <img src={m.img} alt={`Imagem ${j + 1} de ${k}`} loading={j < 2 ? "eager" : "lazy"} className="size-full object-contain" />
            )}
          </figure>
        ))}
      </div>
      {k > 1 ? (
        <>
          <Button type="button" variant="outline" size="icon" className="absolute top-[calc(50%-34px)] left-2 hidden rounded-full bg-card/90 shadow-sm disabled:opacity-0 [@media(hover:hover)]:inline-flex" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Imagem anterior"><ChevronLeft aria-hidden /></Button>
          <Button type="button" variant="outline" size="icon" className="absolute top-[calc(50%-34px)] right-2 hidden rounded-full bg-card/90 shadow-sm disabled:opacity-0 [@media(hover:hover)]:inline-flex" onClick={() => go(i + 1)} disabled={i === k - 1} aria-label="Próxima imagem"><ChevronRight aria-hidden /></Button>
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1.5">
              {items!.map((_, j) => (
                <button key={j} type="button" onClick={() => go(j)} aria-label={`Ir para ${j + 1} de ${k}`} aria-current={j === i ? "true" : undefined}
                  className={cn("h-2.5 rounded-full transition-all", j === i ? "w-6 bg-bronze" : "w-2.5 bg-input")} />
              ))}
            </div>
            <span className="num min-w-[3.5em] text-sm text-muted-foreground" aria-live="polite">{i + 1} de {k}</span>
          </div>
        </>
      ) : null}
    </div>
  );
}
