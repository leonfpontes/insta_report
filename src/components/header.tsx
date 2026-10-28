import { ChevronDown, LogOut, MoreVertical, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Brand, Lamp } from "@/components/bits";
import { usePainel } from "@/lib/ctx";
import { ACC, CONTAS, ddmmhm, hm } from "@/lib/model";
import { cn } from "@/lib/utils";

/** Resumo das luzes: uma bolinha por conta e o pior estado em texto; abre a lista com o detalhe de cada uma. */
function ConexaoResumo({ className }: { className?: string }) {
  const { m, setAcc } = usePainel();
  const cx = CONTAS.map((k) => ({ k, c: m.conexao(k) }));
  const off = cx.filter((x) => x.c.cls === "off").length;
  const velho = cx.filter((x) => x.c.cls === "velho").length;
  const on = cx.filter((x) => x.c.cls === "on").length;
  const txt = off ? `${off} desconectada${off > 1 ? "s" : ""}` : velho ? `${velho} sem checagem` : on === cx.length ? (cx.length > 1 ? `${on} conectadas` : "Conectada") : `${on} de ${cx.length} conectadas`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 items-center gap-2 rounded-md border bg-card px-2.5 text-sm font-medium focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            off ? "border-crit/60 bg-crit-soft text-crit" : velho ? "border-warn/60 bg-warn-soft text-warn" : "border-live/40 text-ink",
            className,
          )}
          aria-label={`Conexão das contas: ${txt}. Ver cada conta.`}
        >
          <span className="flex -space-x-1.5" aria-hidden>
            {cx.slice(0, 4).map(({ k }) => { const av = m.avatar(k); return av ? <img key={k} src={av} alt="" className="size-6 rounded-full border-2 border-card object-cover" /> : <span key={k} className="size-6 rounded-full border-2 border-card bg-muted" />; })}
          </span>
          <Lamp cls={off ? "off" : velho ? "velho" : "on"} />
          {txt}
          <ChevronDown className="size-4 opacity-70" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(20rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="font-normal text-muted-foreground">Toque numa conta para ver só ela</DropdownMenuLabel>
        {cx.map(({ k, c }) => {
          const av = m.avatar(k);
          return (
            <DropdownMenuItem key={k} onSelect={() => setAcc(k)} className="items-start gap-2.5 py-2">
              {av ? <img src={av} alt="" className="size-8 shrink-0 rounded-full object-cover" /> : <span className="size-8 shrink-0 rounded-full bg-muted" />}
              <span className="flex min-w-0 flex-col gap-0.5">
                <b className="truncate font-medium text-ink">{ACC[k].label}</b>
                <span className={cn("inline-flex items-center gap-1.5 text-xs", c.cls === "off" ? "text-crit" : c.cls === "velho" ? "text-warn" : "text-muted-foreground")}>
                  <Lamp cls={c.cls} />{c.txt}{c.sub ? ` · ${c.sub}` : ""}
                </span>
                {c.cls !== "on" ? <span className="text-xs text-muted-foreground">{c.det}</span> : null}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Barra fixa do topo: marca, luz de conexão de cada conta e ações. */
export function Header({ onCheck, checking, onSair }: { onCheck: () => void; checking: boolean; onSair: () => void }) {
  const { m, setAcc } = usePainel();
  const coleta = Object.values(m.d.metricas).map((x) => x?.coletadoEm).filter(Boolean).sort().pop();
  return (
    <header className="pt-safe sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md">
      <div className="gut mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
        <Brand />
        {/* Até 3 contas cabem como etiquetas no computador; no celular (ou com mais contas) vira um resumo que abre a lista. */}
        <div className={cn("ml-auto hidden gap-2", CONTAS.length <= 3 && "md:flex")} aria-label="Conexão das contas com o Instagram">
          {CONTAS.map((k) => {
            const c = m.conexao(k);
            const av = m.avatar(k);
            return (
              <Tooltip key={k}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setAcc(k)}
                    className={cn(
                      "flex min-w-0 items-center gap-2 rounded-md border bg-card py-1 pr-2.5 pl-1 text-left text-sm transition-colors hover:border-input focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                      c.cls === "on" && "border-live/40",
                      c.cls === "off" && "border-crit/60 bg-crit-soft",
                      c.cls === "velho" && "border-warn/60 bg-warn-soft",
                    )}
                    aria-label={`${ACC[k].label}: ${c.txt}${c.sub ? ", checado " + c.sub : ""}. Mostrar só esta conta.`}
                  >
                    {av ? <img src={av} alt="" className="size-7 shrink-0 rounded-full object-cover" /> : <span className="size-7 shrink-0 rounded-full bg-muted" />}
                    <Lamp cls={c.cls} />
                    <span className="flex min-w-0 flex-col leading-tight">
                      <b className="max-w-36 truncate font-medium">{ACC[k].label}</b>
                      <span className={cn("truncate text-xs", c.cls === "off" ? "text-crit" : c.cls === "velho" ? "text-warn" : "text-muted-foreground")}>
                        {c.txt}{c.sub ? ` · ${c.sub}` : ""}
                      </span>
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-72">{c.det}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <ConexaoResumo className={cn("ml-auto", CONTAS.length <= 3 && "md:hidden")} />
        <div className="flex items-center gap-2">
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
