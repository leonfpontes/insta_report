import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { GalItem } from "@/lib/model";
import { cn } from "@/lib/utils";

/** Miniatura da Vercel em 1080 px para ver grande (a lista usa 640). */
export const grande = (url: string) => url.replace(/([?&]w=)\d+/, "$11080");

/**
 * Mídia em tela cheia: fotos, vídeos e carrossel.
 * No celular desliza com o dedo; no computador tem setas, teclado e miniaturas.
 */
export function Lightbox({ items, start, open, onOpenChange, titulo }: {
  items: GalItem[];
  start: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  titulo: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(start);
  const k = items.length;

  // Abre no item clicado, sem animar a rolagem até ele.
  useLayoutEffect(() => {
    if (!open) return;
    setI(start);
    requestAnimationFrame(() => { const t = track.current; if (t) t.scrollTo({ left: start * t.clientWidth }); });
  }, [open, start]);

  // Só o vídeo da vez toca; os outros param ao trocar de item ou fechar.
  useEffect(() => {
    track.current?.querySelectorAll("video").forEach((v) => {
      if (+(v.dataset.j || -1) !== i || !open) v.pause();
    });
  }, [i, open]);

  const go = (j: number) => {
    const t = track.current; if (!t) return;
    j = Math.max(0, Math.min(k - 1, j));
    t.scrollTo({ left: j * t.clientWidth, behavior: "smooth" });
  };
  const onScroll = () => {
    const t = track.current; if (!t) return;
    const j = Math.round(t.scrollLeft / (t.clientWidth || 1));
    if (j !== i) setI(j);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); go(i + (e.key === "ArrowRight" ? 1 : -1)); } }}
        className="flex h-dvh max-h-dvh w-screen max-w-none flex-col gap-0 rounded-none border-0 bg-[#0e1626] p-0 text-white shadow-none sm:max-w-none md:h-[92vh] md:w-[min(92vw,1100px)] md:rounded-xl"
      >
        <div className="pt-safe flex items-center gap-3 px-3 py-2 md:px-4">
          <div className="flex min-w-0 flex-1 flex-col">
            <DialogTitle className="truncate text-sm font-medium text-white">{titulo}</DialogTitle>
            <DialogDescription className="num text-xs text-white/70">{k > 1 ? `${i + 1} de ${k}` : items[0]?.video ? "Vídeo" : "Imagem"}</DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="size-11 text-white hover:bg-white/10 hover:text-white" aria-label="Fechar">
            <X className="size-6" aria-hidden />
          </Button>
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            ref={track}
            onScroll={onScroll}
            tabIndex={0}
            role="region"
            aria-roledescription="carrossel"
            aria-label={k > 1 ? `${k} itens. Use as setas do teclado ou deslize.` : "Mídia"}
            className="no-scrollbar flex size-full snap-x snap-mandatory overflow-x-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-white/60"
          >
            {items.map((m, j) => (
              <figure key={j} className="m-0 flex size-full shrink-0 snap-center items-center justify-center p-2 md:p-4">
                {m.video ? (
                  <video
                    data-j={j}
                    src={m.video}
                    poster={m.capa}
                    controls
                    playsInline
                    autoPlay={j === start}
                    preload={Math.abs(j - start) <= 1 ? "auto" : "metadata"}
                    aria-label={`Vídeo ${j + 1} de ${k}`}
                    className="max-h-full max-w-full rounded-md object-contain"
                  />
                ) : (
                  <img src={m.img ? grande(m.img) : undefined} alt={`Imagem ${j + 1} de ${k}`} loading={Math.abs(j - start) <= 1 ? "eager" : "lazy"} className="max-h-full max-w-full rounded-md object-contain select-none" draggable={false} />
                )}
              </figure>
            ))}
          </div>
          {k > 1 ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Anterior"
                className="absolute top-1/2 left-2 hidden size-12 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white disabled:opacity-0 [@media(hover:hover)]:inline-flex"><ChevronLeft className="size-7" aria-hidden /></Button>
              <Button variant="ghost" size="icon" onClick={() => go(i + 1)} disabled={i === k - 1} aria-label="Próximo"
                className="absolute top-1/2 right-2 hidden size-12 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white disabled:opacity-0 [@media(hover:hover)]:inline-flex"><ChevronRight className="size-7" aria-hidden /></Button>
            </>
          ) : null}
        </div>

        {k > 1 ? (
          <div className="pb-safe flex justify-center px-3 py-3">
            {/* Celular: pontos; computador: miniaturas clicáveis. */}
            <div className="flex items-center gap-1.5 md:hidden">
              {items.map((_, j) => <button key={j} type="button" onClick={() => go(j)} aria-label={`Ir para ${j + 1} de ${k}`} aria-current={j === i ? "true" : undefined} className={cn("h-2.5 rounded-full transition-all", j === i ? "w-6 bg-white" : "w-2.5 bg-white/40")} />)}
            </div>
            <div className="no-scrollbar hidden max-w-full gap-2 overflow-x-auto md:flex">
              {items.map((m, j) => (
                <button key={j} type="button" onClick={() => go(j)} aria-label={`Ir para ${j + 1} de ${k}`} aria-current={j === i ? "true" : undefined}
                  className={cn("relative size-14 shrink-0 overflow-hidden rounded-md border-2 transition-opacity focus-visible:ring-[3px] focus-visible:ring-white/60 focus-visible:outline-none", j === i ? "border-white" : "border-transparent opacity-60 hover:opacity-100")}>
                  {m.img || m.capa ? <img src={m.img || m.capa} alt="" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center bg-white/10 text-xs">vídeo</span>}
                </button>
              ))}
            </div>
          </div>
        ) : <div className="pb-safe" />}
      </DialogContent>
    </Dialog>
  );
}
