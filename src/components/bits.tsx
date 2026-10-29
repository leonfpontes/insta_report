import { ArrowDown, ArrowUp, Equal, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ACC, STATUS, lvlM, n, pctAbs, HORA, type Cmp, type Conexao, type Conta, type Eff, type Metric } from "@/lib/model";

/** Monograma LP: L e P dividem a mesma haste, com o ponto em bronze. */
export function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" role="img" aria-label="LP" className={className}>
      <g transform="translate(-16 0)">
        <g fill="none" stroke="var(--ink)" strokeWidth="44" strokeLinejoin="miter">
          <path d="M178 118V372H300" />
          <path d="M178 140H290A72 72 0 0 1 290 284H222" />
        </g>
        <circle cx="362" cy="372" r="26" fill="var(--bronze)" />
      </g>
    </svg>
  );
}

export function Brand({ big }: { big?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Monogram className={big ? "size-10" : "size-8 shrink-0"} />
      <span className={cn("font-medium tracking-tight whitespace-nowrap text-ink", big ? "text-2xl" : "text-lg")}>
        Agenda do <em className="font-accent text-[1.12em] font-normal tracking-normal text-bronze-ink italic">Instagram</em>
      </span>
    </div>
  );
}

/** Foto do post com o avatar da conta no canto, como no feed. */
export function PostPhoto({ conta, src, label, size = 56, avatar }: { conta: Conta; src?: string | null; label?: string; size?: number; avatar?: string | null }) {
  return (
    <span className="relative block shrink-0" style={{ width: size, height: size }} data-a={conta}>
      {src ? (
        <img src={src} alt="" loading="lazy" className="size-full rounded-md border object-cover" />
      ) : (
        <span className="flex size-full items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground uppercase">{label}</span>
      )}
      <span
        className="absolute -right-1.5 -bottom-1.5 block overflow-hidden rounded-full border-2 border-card bg-[var(--c)] shadow-[0_0_0_1px_var(--c)]"
        style={{ width: Math.max(18, size * 0.4), height: Math.max(18, size * 0.4) }}
      >
        {avatar ? <img src={avatar} alt={ACC[conta].label} loading="lazy" className="size-full object-cover" /> : null}
      </span>
    </span>
  );
}

const STATUS_CLS: Record<Eff, string> = {
  publicado: "border-ok/40 bg-ok-soft text-ok",
  agendado: "border-input/60 bg-card text-ink",
  manual: "border-muted-foreground/60 border-dashed bg-card text-foreground",
  pendente: "border-warn/50 bg-warn-soft text-warn",
  atrasado: "border-crit/40 bg-crit-soft text-crit",
  falhou: "border-crit/40 bg-crit-soft text-crit",
};
export function StatusBadge({ eff, saindo }: { eff: Eff; saindo?: boolean }) {
  if (saindo && eff !== "publicado")
    return (
      <Badge variant="outline" className="border-ink/30 bg-accent text-ink">
        <Loader2 className="animate-spin" aria-hidden /> Saindo
      </Badge>
    );
  return <Badge variant="outline" className={STATUS_CLS[eff]}>{STATUS[eff]}</Badge>;
}

/** Selo geral do post perto dos anteriores. */
export function Verdict({ c, compact }: { c: Cmp | null; compact?: boolean }) {
  if (!c || c.lvl === "cedo")
    return (
      <Badge variant="outline" className="border-dashed border-input/70 font-normal text-muted-foreground">
        {c && c.age < HORA ? "Cedo para comparar" : "Sem comparação ainda"}
      </Badge>
    );
  if (c.lvl === "up")
    return <Badge className="bg-ok text-white"><ArrowUp aria-hidden />{pctAbs(c.d!)} {compact ? "" : "acima da média"}<span className="sr-only">{compact ? " acima da média" : ""}</span></Badge>;
  if (c.lvl === "down")
    return <Badge className="bg-crit text-white"><ArrowDown aria-hidden />{pctAbs(c.d!)} {compact ? "" : "abaixo da média"}<span className="sr-only">{compact ? " abaixo da média" : ""}</span></Badge>;
  return <Badge variant="secondary" className="text-ink"><Equal aria-hidden />Na média</Badge>;
}

/** Variação de um número: só aparece quando passa de ±15% (e de 2 unidades). */
export function Delta({ m, always }: { m?: Metric; always?: boolean }) {
  if (!m) return null;
  const l = lvlM(m);
  const title = `Média dos anteriores: ${n(Math.round(m.base))}`;
  if (l === "up") return <span title={title} className="num inline-flex items-center gap-0.5 text-xs font-medium text-ok"><ArrowUp className="size-3" aria-hidden />{pctAbs(m.d)}<span className="sr-only"> acima da média</span></span>;
  if (l === "down") return <span title={title} className="num inline-flex items-center gap-0.5 text-xs font-medium text-crit"><ArrowDown className="size-3" aria-hidden />{pctAbs(m.d)}<span className="sr-only"> abaixo da média</span></span>;
  if (!always) return null;
  return <span title={title} className="num text-xs text-muted-foreground">na média</span>;
}

export function Lamp({ cls, className }: { cls: Conexao["cls"]; className?: string }) {
  const c = {
    on: "bg-live shadow-[0_0_0_3px_color-mix(in_srgb,var(--live)_22%,transparent)] lamp-on",
    off: "bg-crit shadow-[0_0_0_3px_color-mix(in_srgb,var(--crit)_22%,transparent)] lamp-off",
    velho: "bg-warn shadow-[0_0_0_3px_color-mix(in_srgb,var(--warn)_22%,transparent)]",
    none: "bg-muted-foreground/60",
  }[cls];
  return <span aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", c, className)} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed px-4 py-10 text-center text-muted-foreground">{children}</div>;
}
