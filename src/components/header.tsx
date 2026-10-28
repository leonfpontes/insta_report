import { Check, LogOut, MoreVertical, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brand, Lamp } from "@/components/bits";
import { usePainel } from "@/lib/ctx";
import { ACC, CONTAS, ddmmhm, hm, type Conta } from "@/lib/model";
import { cn } from "@/lib/utils";

/**
 * Conta no topo: mostra a luz de conexão e é o filtro do painel.
 * Um clique liga ou desliga a conta; com todas ou nenhuma ligada, o painel mostra todas.
 */
function ContaChip({ k }: { k: Conta }) {
  const { m, sel, toggle } = usePainel();
  const c = m.conexao(k);
  const av = m.avatar(k);
  const on = sel.includes(k);
  const apagada = sel.length > 0 && !on;
  const tone = c.cls === "off" ? "text-crit" : c.cls === "velho" ? "text-warn" : "text-muted-foreground";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-a={k}
          onClick={() => toggle(k)}
          aria-pressed={on}
          aria-label={`${ACC[k].label}: ${c.txt}${c.sub ? ", checado " + c.sub : ""}. ${on ? "Tirar do filtro" : "Mostrar esta conta"}.`}
          className={cn(
            "relative flex min-w-0 items-center gap-2 rounded-md border bg-card py-1 pr-2.5 pl-1 text-left text-sm transition-[background-color,border-color,opacity] hover:border-input focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            "max-md:flex-1 max-md:justify-center max-md:gap-1.5 max-md:px-1.5",
            c.cls === "off" && "border-crit/60 bg-crit-soft",
            c.cls === "velho" && "border-warn/60 bg-warn-soft",
            on && "border-[var(--c)] bg-accent shadow-[inset_0_0_0_1px_var(--c)]",
            apagada && "opacity-60 hover:opacity-100",
          )}
        >
          <span className="relative shrink-0">
            {av ? <img src={av} alt="" className="size-7 rounded-full object-cover" /> : <span className="block size-7 rounded-full bg-[var(--c)] opacity-80" />}
            {on ? <span className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border-2 border-card bg-[var(--c)] text-white" aria-hidden><Check className="size-2.5" strokeWidth={3} /></span> : null}
          </span>
          <Lamp cls={c.cls} />
          <span className="flex min-w-0 flex-col leading-tight">
            <b className="max-w-36 truncate font-medium max-md:text-xs">
              <span className="md:hidden">{ACC[k].short}</span>
              <span className="max-md:hidden">{ACC[k].label}</span>
            </b>
            <span className={cn("truncate text-xs max-md:hidden", tone)}>{c.txt}{c.sub ? ` · ${c.sub}` : ""}</span>
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-72">{c.det}</TooltipContent>
    </Tooltip>
  );
}

/** Barra fixa do topo: marca, contas (luz + filtro) e ações. */
export function Header({ onCheck, checking, onSair }: { onCheck: () => void; checking: boolean; onSair: () => void }) {
  const { m } = usePainel();
  const coleta = Object.values(m.d.metricas).map((x) => x?.coletadoEm).filter(Boolean).sort().pop();
  return (
    <header className="pt-safe sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
      <div className="gut mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
        <Brand />
        <div role="group" aria-label="Contas: toque para filtrar. Todas ou nenhuma ligada mostra todas." className="no-scrollbar order-3 flex w-full gap-2 overflow-x-auto md:order-none md:ml-auto md:w-auto">
          {CONTAS.map((k) => <ContaChip key={k} k={k} />)}
        </div>
        <div className="flex items-center gap-2 max-md:ml-auto">
          <Button variant="outline" className="hidden md:inline-flex" onClick={onCheck} disabled={checking}>
            <RefreshCw className={cn(checking && "animate-spin")} aria-hidden /> Checar agora
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Mais ações">
                <MoreVertical aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal text-muted-foreground">
                Agenda lida às {hm(m.d.lidoEm)}{coleta ? ` · números de ${ddmmhm(coleta)}` : ""}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onCheck} disabled={checking}>
                <RefreshCw aria-hidden /> Checar tokens e números agora
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onSair}>
                <LogOut aria-hidden /> Sair do painel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
