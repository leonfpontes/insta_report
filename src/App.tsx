import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/header";
import { Accounts } from "@/components/accounts";
import { BottomNav, Toolbar } from "@/components/nav";
import { Detail } from "@/components/detail";
import { Login } from "@/components/login";
import { FilaView } from "@/components/views/fila";
import { PedidosView } from "@/components/views/pedidos";
import { CalendarioView } from "@/components/views/calendario";
import { PublicadosView } from "@/components/views/publicados";
import { ExecucoesView } from "@/components/views/execucoes";
import { RankingView } from "@/components/views/ranking";
import { PainelCtx, VIEWS, type Painel, type View } from "@/lib/ctx";
import { acao, lerDados, SemSessao } from "@/lib/api";
import { CONTAS, Model, type Conta, type Dados } from "@/lib/model";

const KEY = "agenda-ig4";
function lerPref(): { sel?: Conta[] } { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
function salvarPref(p: object) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* sem armazenamento */ } }

/** #fila, #calendario… escolhem a visão; #post-<id> (link do e-mail de alerta) abre o post. */
function fromHash(): { view?: View; post?: string } {
  const h = decodeURIComponent(location.hash.slice(1));
  if (VIEWS.includes(h as View)) return { view: h as View };
  // #pedido-<id> abre a aba Pedidos; a própria aba abre o pedido (views/pedidos.tsx).
  if (h.startsWith("pedido-")) return { view: "pedidos" };
  if (h.startsWith("post-")) return { post: h.slice(5) };
  return {};
}

export default function App() {
  const [estado, setEstado] = useState<"carregando" | "login" | "ok" | "erro">("carregando");
  const [erro, setErro] = useState("");
  const [d, setD] = useState<Dados | null>(null);
  const [selS, setSelS] = useState<Conta[]>(() => (Array.isArray(lerPref().sel) ? lerPref().sel! : []));
  const [q, setQ] = useState("");
  const [view, setViewS] = useState<View>(() => fromHash().view || "fila");
  const [detail, setDetail] = useState<string | null>(null);
  const [saindo, setSaindo] = useState<Record<string, number>>({});
  const [checking, setChecking] = useState(false);
  const pendingPost = useRef<string | null>(fromHash().post || null);
  const timers = useRef<number[]>([]);

  const load = useCallback(async () => {
    try {
      const j = await lerDados();
      setD(j); setEstado("ok"); setErro("");
    } catch (e) {
      if (e instanceof SemSessao) setEstado("login");
      else { setErro((e as Error).message || "Sem conexão com o painel."); setEstado((s) => (s === "ok" ? s : "erro")); }
    }
  }, []);
  const later = useCallback((ms: number) => { timers.current.push(window.setTimeout(() => load(), ms)); }, [load]);

  useEffect(() => { load(); }, [load]);
  // Enquanto a aba está aberta, relê a agenda a cada 2 minutos e ao voltar para ela.
  useEffect(() => {
    const t = window.setInterval(() => { if (!document.hidden && estado === "ok") load(); }, 120_000);
    const v = () => { if (!document.hidden && estado === "ok") load(); };
    document.addEventListener("visibilitychange", v);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", v); };
  }, [estado, load]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const on = () => { const h = fromHash(); if (h.view) setViewS(h.view); if (h.post) setDetail(h.post); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const m = useMemo(() => (d ? new Model(d) : null), [d]);

  // Link do e-mail de alerta: abre o post assim que os dados chegam.
  useEffect(() => {
    if (!m || !pendingPost.current) return;
    const id = pendingPost.current; pendingPost.current = null;
    if (m.rowById(id)) setDetail(id);
    try { history.replaceState(null, "", "#" + view); } catch { /* ignora */ }
  }, [m, view]);

  // "Saindo" some quando o post aparece publicado, ou depois de 8 minutos.
  useEffect(() => {
    if (!m) return;
    setSaindo((s) => {
      const out: Record<string, number> = {};
      for (const [id, t] of Object.entries(s)) { const r = m.rowById(id); if (r && r.eff !== "publicado" && r.eff !== "falhou" && Date.now() - t < 8 * 60000) out[id] = t; }
      return Object.keys(out).length === Object.keys(s).length ? s : out;
    });
  }, [m]);

  const setView = (v: View) => { setViewS(v); try { history.replaceState(null, "", "#" + v); } catch { location.hash = v; } 
    // Ao trocar de visão mais abaixo na página, volta para o começo dela (logo abaixo das contas).
    const el = document.getElementById("vista"); const top = el ? el.getBoundingClientRect().top + window.scrollY - 140 : 0;
    if (window.scrollY > top) window.scrollTo({ top });
  };
  const setSel = (s: Conta[]) => { setSelS(s); salvarPref({ sel: s }); };
  const toggle = (k: Conta) => setSel(selS.includes(k) ? selS.filter((x) => x !== k) : [...selS, k]);
  const so = (k: Conta) => setSel([k]);

  const sair = () => { acao("/api/sair").catch(() => {}).finally(() => { setEstado("login"); setD(null); }); };
  const falha = (e: unknown) => { if (e instanceof SemSessao) { setEstado("login"); return; } toast.error((e as Error).message); };

  const ctx: Painel | null = m && {
    m, saindo, toggle, so, q, setQ,
    // Contas que saíram da agenda não contam na seleção.
    ...(() => { const sel = selS.filter((k) => CONTAS.includes(k)); const todas = !sel.length || sel.length === CONTAS.length; return { sel, todas, ativas: todas ? [...CONTAS] : CONTAS.filter((k) => sel.includes(k)) }; })(),
    open: (id) => setDetail(id),
    publicar: async (id) => {
      try {
        await acao("/api/publicar", { id });
        setSaindo((s) => ({ ...s, [id]: Date.now() }));
        toast.success("Publicador acionado", { description: "O post sai em 1 a 3 minutos. O status muda aqui sozinho." });
        later(90_000); later(240_000);
      } catch (e) { falha(e); }
    },
    marcar: async (id) => {
      try { await acao("/api/manual", { id }); toast.success("Story marcado como postado"); await load(); } catch (e) { falha(e); }
    },
    recarregar: load,
  };

  const checar = async () => {
    setChecking(true);
    try {
      await acao("/api/metricas");
      toast.success("Checagem iniciada", { description: "A luz e os números novos chegam em cerca de 1 minuto." });
      later(75_000);
    } catch (e) { falha(e); } finally { setChecking(false); }
  };

  if (estado === "login") return <><Login onOk={load} /><Toaster position="top-center" /></>;
  if (!ctx) {
    return (
      <main className="gut mx-auto flex max-w-6xl flex-col gap-4 py-6" aria-busy="true">
        {estado === "erro" ? <p className="text-crit">{erro}</p> : <p className="inline-flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden />Carregando a agenda…</p>}
        <Skeleton className="h-12 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" />
      </main>
    );
  }

  return (
    <PainelCtx.Provider value={ctx}>
      <TooltipProvider delayDuration={300}>
        <Header onCheck={checar} checking={checking} onSair={sair} />
        <main className="gut mx-auto flex max-w-6xl flex-col gap-5 pt-4 pb-28 md:gap-6 md:pt-6 md:pb-16">
          {erro ? <p className="rounded-md bg-crit-soft px-3 py-2 text-sm text-crit">{erro} Mostrando a última leitura.</p> : null}
          <Accounts />
          <Tabs id="vista" value={view} onValueChange={(v) => setView(v as View)} className="scroll-mt-36 gap-5">
            <Toolbar view={view} />
            <h1 className="sr-only">Agenda do Instagram: {({ ranking: "Ranking", fila: "Fila", pedidos: "Pedidos", calendario: "Calendário", publicados: "Publicados", execucoes: "Execuções" } as const)[view]}</h1>
            {VIEWS.map((v) => (
              <TabsContent key={v} value={v} forceMount hidden={view !== v} className="focus-visible:outline-none">
                {view === v ? (v === "ranking" ? <RankingView /> : v === "fila" ? <FilaView /> : v === "pedidos" ? <PedidosView /> : v === "calendario" ? <CalendarioView /> : v === "publicados" ? <PublicadosView /> : <ExecucoesView />) : null}
              </TabsContent>
            ))}
          </Tabs>
        </main>
        <BottomNav view={view} setView={setView} />
        <Detail id={detail} onClose={() => setDetail(null)} />
        <Toaster position="top-center" />
      </TooltipProvider>
    </PainelCtx.Provider>
  );
}
