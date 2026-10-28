import { Activity, BarChart3, CalendarDays, ListTodo, Search } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { usePainel, type View } from "@/lib/ctx";

import { cn } from "@/lib/utils";

const ITEMS: { v: View; l: string; Icon: typeof ListTodo }[] = [
  { v: "fila", l: "Fila", Icon: ListTodo },
  { v: "calendario", l: "Calendário", Icon: CalendarDays },
  { v: "publicados", l: "Publicados", Icon: BarChart3 },
  { v: "execucoes", l: "Execuções", Icon: Activity },
];

/** Contador de itens que pedem atenção, para o selo da aba Fila. */
function useAtencao() {
  const { m, ativas } = usePainel();
  return m.rows(ativas).filter((r) => r.kind === "agenda" && ["falhou", "atrasado", "pendente"].includes(r.eff)).length;
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

const BUSCA: Record<View, string> = {
  fila: "Buscar na fila",
  calendario: "Buscar no calendário",
  publicados: "Buscar nos publicados",
  execucoes: "Buscar nos posts com erro",
};

/** Busca (a mesma em todas as visões) e, no computador, as abas ao lado. */
export function Toolbar({ view }: { view: View }) {
  const { q, setQ } = usePainel();
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="relative md:w-80 lg:w-96">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input id="busca" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${BUSCA[view]}…`} className="h-10 bg-card pl-9" aria-label={`${BUSCA[view]} pelo título ou legenda`} />
      </div>
      <ViewTabs />
    </div>
  );
}
