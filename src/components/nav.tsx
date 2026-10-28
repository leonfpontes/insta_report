import { Activity, BarChart3, CalendarDays, ListTodo } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { usePainel, type View } from "@/lib/ctx";

import { ACC, CONTAS, type Conta } from "@/lib/model";
import { cn } from "@/lib/utils";

const ITEMS: { v: View; l: string; Icon: typeof ListTodo }[] = [
  { v: "fila", l: "Fila", Icon: ListTodo },
  { v: "calendario", l: "Calendário", Icon: CalendarDays },
  { v: "publicados", l: "Publicados", Icon: BarChart3 },
  { v: "execucoes", l: "Execuções", Icon: Activity },
];

/** Contador de itens que pedem atenção, para o selo da aba Fila. */
function useAtencao() {
  const { m, acc } = usePainel();
  return m.rows(acc).filter((r) => r.kind === "agenda" && ["falhou", "atrasado", "pendente"].includes(r.eff)).length;
}

/** Abas do computador; o painel de cada aba está em App (TabsContent). */
export function ViewTabs() {
  const at = useAtencao();
  return (
      <TabsList className="hidden h-10 bg-secondary md:inline-flex">
        {ITEMS.map(({ v, l, Icon }) => (
          <TabsTrigger key={v} value={v} className="h-full px-3">
            <Icon aria-hidden />{l}
            {v === "fila" && at ? <span className="num ml-1 rounded-sm bg-crit px-1.5 text-xs text-white">{at}</span> : null}
          </TabsTrigger>
        ))}
      </TabsList>
  );
}

/** Abas presas embaixo da tela no celular, ao alcance do polegar. */
export function BottomNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  const at = useAtencao();
  return (
    <nav aria-label="Visões do painel" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur-md md:hidden">
      <ul className="grid grid-cols-4" style={{ paddingLeft: "env(safe-area-inset-left,0px)", paddingRight: "env(safe-area-inset-right,0px)" }}>
        {ITEMS.map(({ v, l, Icon }) => (
          <li key={v}>
            <button
              type="button"
              onClick={() => setView(v)}
              aria-current={view === v ? "page" : undefined}
              className={cn("relative flex h-16 w-full flex-col items-center justify-center gap-1 text-xs font-medium focus-visible:bg-accent focus-visible:outline-none", view === v ? "text-ink" : "text-muted-foreground")}
            >
              {view === v ? <span className="absolute inset-x-5 top-0 h-[3px] rounded-b-sm bg-bronze" aria-hidden /> : null}
              <Icon className="size-5" aria-hidden />
              {l}
              {v === "fila" && at ? <span className="num absolute top-2 left-[calc(50%+6px)] min-w-5 rounded-sm bg-crit px-1 text-center text-xs leading-5 text-white" aria-label={`${at} pedem atenção`}>{at}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Filtro de conta. No celular, as contas não escolhidas ficam só com a foto para caberem 3 ou mais numa linha. */
export function AccountFilter() {
  const { m, acc, setAcc } = usePainel();
  return (
    <ToggleGroup type="single" variant="outline" value={acc} onValueChange={(v) => v && setAcc(v as Conta | "all")} aria-label="Conta" className="no-scrollbar w-full justify-start overflow-x-auto md:w-auto [&>*]:bg-card [&>*[data-state=on]]:bg-accent">
      <ToggleGroupItem value="all" className="h-10 px-3">Todas</ToggleGroupItem>
      {CONTAS.map((k) => {
        const av = m.avatar(k);
        const on = acc === k;
        return (
          <ToggleGroupItem key={k} value={k} data-a={k} className={cn("h-10 gap-2 px-2.5 md:px-3", !on && "max-md:flex-none")} aria-label={ACC[k].label} title={ACC[k].label}>
            {av ? <img src={av} alt="" className="size-6 rounded-full object-cover shadow-[0_0_0_1.5px_var(--c)] md:size-5" /> : <span className="size-6 rounded-full bg-[var(--c)] md:size-5" />}
            <span className={cn("max-w-32 truncate", !on && "max-md:sr-only")}>{ACC[k].short}</span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
