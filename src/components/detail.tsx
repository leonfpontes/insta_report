import { useRef, useState } from "react";
import { Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Delta, StatusBadge, Verdict } from "@/components/bits";
import { MarkButton, PublishButton } from "@/components/actions";
import { Gallery } from "@/components/gallery";
import { DownloadButton } from "@/components/downloads";
import { TimeLine } from "@/components/timeline";
import { usePainel } from "@/lib/ctx";
import { useDesktop } from "@/hooks/use-media";
import {
  ACC, CMPK, FMT, STK, cleanTitle, dayKey, ddmm, ddmmhm, hm, idadeTxt, lvlM, n, pct, semBaseTxt,
  type Cmp, type Conta, type IgMedia, type Row,
} from "@/lib/model";
import { cn } from "@/lib/utils";

const SMETRICS: [string, string][] = [["views", "Visualizações"], ["reach", "Alcance"], ["curtidas", "Curtidas"], ["total_interactions", "Interações"]];
const GEN: Record<string, string> = { F: "Mulheres", M: "Homens", U: "Não informado" };

function Bars({ entries }: { entries: [string, number | undefined][] }) {
  const sum = entries.reduce((s, [, v]) => s + (v || 0), 0);
  if (!sum) return null;
  return (
    <dl className="flex flex-col gap-2.5">
      {entries.map(([k, v]) => (
        <div key={k}>
          <dt className="mb-1 flex justify-between text-sm"><span>{k}</span><span className="num">{pct(v, sum)}</span></dt>
          <dd className="h-2 overflow-hidden rounded-sm bg-muted"><i className="block h-full rounded-sm bg-[var(--c,var(--ink))]" style={{ width: `${(100 * (v || 0) / sum).toFixed(1)}%` }} /></dd>
        </div>
      ))}
    </dl>
  );
}

function Comparacao({ c }: { c: Cmp | null }) {
  const keys = c?.story ? STK : CMPK.map(([k, l]) => [k, l] as [string, string]);
  const linhas = c ? keys.filter(([k]) => c.m[k]) : [];
  const q = c ? Math.max(0, ...Object.values(c.m).map((x) => x.n)) : 0;
  return (
    <Card className="gap-3 bg-background px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-ink">Perto dos anteriores</h3>
        <Verdict c={c} />
      </div>
      {!linhas.length ? <p className="text-sm text-muted-foreground">{semBaseTxt(c)}</p> : (
        <>
          <dl className="flex flex-col gap-2.5">
            {linhas.map(([k, l]) => {
              const m = c!.m[k], mx = Math.max(m.v, m.base) * 1.15 || 1, L = lvlM(m);
              return (
                <div key={k} className="grid grid-cols-[8.5em_minmax(0,1fr)_auto] items-center gap-2.5 text-sm">
                  <dt className="text-muted-foreground">{l}</dt>
                  <dd className="relative h-2.5 rounded-sm bg-muted" role="img" aria-label={`${n(m.v)} contra a média de ${n(Math.round(m.base))}`}>
                    <i className={cn("absolute inset-y-0 left-0 rounded-sm", L === "up" ? "bg-ok" : L === "down" ? "bg-crit" : "bg-muted-foreground/70")} style={{ width: `${(100 * m.v / mx).toFixed(1)}%` }} />
                    <b className="absolute -inset-y-1 w-0.5 rounded-sm bg-ink" style={{ left: `${(100 * m.base / mx).toFixed(1)}%` }} />
                  </dd>
                  <span className="num flex items-center gap-1.5 text-right">{n(m.v)} <Delta m={m} always /></span>
                </div>
              );
            })}
          </dl>
          <p className="text-xs text-muted-foreground">
            Barra: este {c!.story ? "story" : "post"}. Traço escuro: {q === 1 ? (c!.story ? "o story anterior" : `o post anterior ${idadeTxt(c!.age)}`) : `média dos ${q} ${c!.story ? "stories anteriores" : "posts anteriores " + idadeTxt(c!.age)}`}.
          </p>
        </>
      )}
    </Card>
  );
}

function Publico({ conta, ig }: { conta: Conta; ig: IgMedia }) {
  const { m } = usePainel();
  const [cut, setCut] = useState("age");
  const pub = m.d.metricas[conta]?.publico || {};
  const ps = ig?.insights?.porSeguidor;
  const fv: [string, number][] | null = ps ? [["Seguidores", ps["views:FOLLOWER"] ?? ps["reach:FOLLOWER"]], ["Não seguidores", ps["views:NON_FOLLOWER"] ?? ps["reach:NON_FOLLOWER"]]] : null;
  const pa = pub.porSeguidor || {};
  const fa: [string, number][] = [["Seguidores", pa["views:FOLLOWER"]], ["Não seguidores", pa["views:NON_FOLLOWER"]]];
  const demo = pub.engajados && !pub.engajados.erro && Object.keys(pub.engajados.age || {}).length ? ["engajados", pub.engajados]
    : pub.seguidores && !pub.seguidores.erro && Object.keys(pub.seguidores.age || {}).length ? ["seguidores", pub.seguidores] : null;
  let ent: [string, number][] = demo ? Object.entries(demo[1][cut] || {}).map(([k, v]) => [k.split(":").pop()!, v as number]) : [];
  if (cut === "gender") ent = ent.map(([k, v]) => [GEN[k] || k, v]);
  ent.sort((a, b) => (cut === "age" ? a[0].localeCompare(b[0]) : b[1] - a[1]));
  return (
    <div className="flex flex-col gap-4">
      {fv && (fv[0][1] || fv[1][1]) ? <div className="flex flex-col gap-2"><h4 className="font-medium text-ink">Quem visualizou este post</h4><Bars entries={fv} /></div> : null}
      {fa[0][1] || fa[1][1] ? <div className="flex flex-col gap-2"><h4 className="font-medium text-ink">Quem viu a conta nos últimos 7 dias</h4><Bars entries={fa} /></div> : null}
      {demo ? (
        <div className="flex flex-col gap-2">
          <h4 className="font-medium text-ink">Detalhes do público da conta</h4>
          <p className="text-sm text-muted-foreground">{demo[0] === "engajados" ? "Quem interagiu com a conta neste mês" : "Quem segue a conta"}. O Instagram não abre esses dados por post.</p>
          <ToggleGroup type="single" variant="outline" value={cut} onValueChange={(v) => v && setCut(v)} aria-label="Corte do público" className="flex-wrap">
            <ToggleGroupItem value="age">Idade</ToggleGroupItem><ToggleGroupItem value="country">País</ToggleGroupItem><ToggleGroupItem value="city">Cidade</ToggleGroupItem><ToggleGroupItem value="gender">Gênero</ToggleGroupItem>
          </ToggleGroup>
          {ent.length ? <Bars entries={ent.slice(0, 8)} /> : <p className="text-sm text-muted-foreground">Sem dados para este corte.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-1"><h4 className="font-medium text-ink">Detalhes do público</h4><p className="text-sm text-muted-foreground">Idade, país, cidade e gênero aparecem aqui quando a conta passar de 100 seguidores. Antes disso o Instagram não libera esses dados.</p></div>
      )}
    </div>
  );
}

function Insights({ r, ig }: { r: Row; ig: IgMedia }) {
  const { m } = usePainel();
  const [metric, setMetric] = useState("views");
  const i = ig.insights || {};
  const isStory = ig.produto === "STORY", isReel = ig.produto === "REELS";
  const seg = (ms?: number) => (ms == null ? "–" : (ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " s");
  const min = (ms?: number) => (ms == null ? "–" : (ms / 60000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " min");
  const counts: [string, number | undefined][] = isStory
    ? [["Respostas", i.replies], ["Compart.", i.shares], ["Interações", i.total_interactions], ["Seguidores", i.follows], ["Visitas ao perfil", i.profile_visits]]
    : [["Curtidas", ig.curtidas ?? i.likes], ["Comentários", ig.comentarios ?? i.comments], ["Compart.", i.shares], ["Salvos", i.saved], ["Interações", i.total_interactions]];
  const Big = ({ l, v }: { l: string; v: React.ReactNode }) => (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-background px-3 py-2.5"><dd className="num text-xl font-medium text-ink">{v}</dd><dt className="order-first text-sm text-muted-foreground">{l}</dt></div>
  );
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {counts.map(([l, v]) => <div key={l} className="flex flex-col items-center gap-0.5 text-center"><dd className="num text-lg font-medium text-ink">{n(v)}</dd><dt className="order-last text-xs text-muted-foreground">{l}</dt></div>)}
      </dl>
      <Tabs defaultValue="geral">
        <TabsList className="w-full">
          <TabsTrigger value="geral">Visão geral</TabsTrigger>
          <TabsTrigger value="eng">Engajamento</TabsTrigger>
          <TabsTrigger value="pub">Público</TabsTrigger>
        </TabsList>
        <TabsContent value="geral" className="flex flex-col gap-4 pt-3">
          <dl className="grid grid-cols-2 gap-2">
            <Big l="Visualizações" v={n(i.views)} />
            <Big l="Contas alcançadas" v={n(i.reach)} />
            {isReel ? <><Big l="Tempo médio assistido" v={seg(i.ig_reels_avg_watch_time)} /><Big l="Tempo total assistido" v={min(i.ig_reels_video_view_total_time)} /></>
              : <><Big l="Visitas ao perfil" v={n(i.profile_visits)} /><Big l="Seguidores ganhos" v={n(i.follows)} /></>}
          </dl>
          {!isStory ? (
            <div className="flex flex-col gap-2" data-a={r.conta}>
              <h4 className="font-medium text-ink">{SMETRICS.find((x) => x[0] === metric)![1]} ao longo do tempo</h4>
              <ToggleGroup type="single" variant="outline" size="sm" value={metric} onValueChange={(v) => v && setMetric(v)} aria-label="Métrica do gráfico" className="flex-wrap">
                {SMETRICS.map(([k, l]) => <ToggleGroupItem key={k} value={k}>{l}</ToggleGroupItem>)}
              </ToggleGroup>
              <TimeLine pts={m.seriesOf(ig, metric)} label={SMETRICS.find((x) => x[0] === metric)![1]} modo="hora" />
              <p className="text-xs text-muted-foreground">Um ponto por coleta: de hora em hora nas primeiras 48 horas, depois um por dia. O Instagram não guarda esse histórico, então a linha começa na primeira coleta do painel.</p>
            </div>
          ) : null}
        </TabsContent>
        <TabsContent value="eng" className="flex flex-col gap-3 pt-3">
          {!isReel ? <dl className="divide-y text-sm"><div className="flex justify-between py-2"><dt>Seguidores ganhos</dt><dd className="num">{n(i.follows)}</dd></div><div className="flex justify-between py-2"><dt>Visitas ao perfil</dt><dd className="num">{n(i.profile_visits)}</dd></div></dl> : null}
          <h4 className="font-medium text-ink">Interações</h4>
          <dl className="divide-y text-sm">
            {(isStory ? [["Respostas", i.replies], ["Compartilhamentos", i.shares], ["Total", i.total_interactions]]
              : [["Curtidas", ig.curtidas ?? i.likes], ["Comentários", ig.comentarios ?? i.comments], ["Compartilhamentos", i.shares], ["Salvamentos", i.saved], ["Total", i.total_interactions]]
            ).map(([l, v]) => <div key={l as string} className="flex justify-between py-2"><dt>{l}</dt><dd className="num">{n(v as number)}</dd></div>)}
          </dl>
          <p className="text-sm text-muted-foreground">Engajamento sobre o alcance: {pct(i.total_interactions, i.reach)}.</p>
        </TabsContent>
        <TabsContent value="pub" className="pt-3" data-a={r.conta}><Publico conta={r.conta} ig={ig} /></TabsContent>
      </Tabs>
    </div>
  );
}

function Body({ r }: { r: Row }) {
  const { m } = usePainel();
  const det = r.kind === "agenda" ? m.detectedStory(r) : null;
  const ig = m.igOfRow(r);
  const items: [string, React.ReactNode][] = [
    ["Conta", ACC[r.conta].label],
    ["Hora marcada", `${ddmm(r.quando)}/${dayKey(r.quando).slice(0, 4)} às ${hm(r.quando)} (Brasília)`],
    ["Formato", (FMT[r.formato] || r.formato) + (r.itens && r.itens > 1 ? ` · ${r.itens} itens` : "")],
    ["Quem publica", r.status === "manual" ? "Você, no app" : r.kind === "ig" ? "Fora da agenda atual" : "Publicador próprio"],
  ];
  if (r.publicadoEm) items.push(["Saiu às", ddmmhm(r.publicadoEm)]);
  if (det) items.push(["No perfil", <>Story detectado às {hm(det.quando)} · <a href={det.link} target="_blank" rel="noopener" className="underline">abrir</a></>]);
  if (r.erro) items.push(["Erro", <span className="text-crit">{r.erro}</span>]);
  if (r.kind === "agenda") items.push(["Código", <span className="num">{r.id}</span>]);
  const arqs = m.arquivosOf(r);
  const capa = m.thumbOf(r) || (det && m.d.imagens["ig:" + det.id]);
  const story = r.formato.startsWith("story");
  return (
    <div className="flex flex-col gap-5">
      {m.gallery(r) || capa ? <Gallery items={m.gallery(r)} single={capa} /> : (
        <div className="flex aspect-[4/5] max-h-72 flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-muted/50 p-6 text-center text-sm text-muted-foreground">
          <b className="font-medium text-ink">A arte deste {story ? "story" : "post"} ainda não está na agenda</b>
          Quando a mídia entrar na agenda, ela aparece aqui para ver e baixar.
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {m.canPublish(r) ? <PublishButton r={r} size="default" /> : null}
        {m.canMark(r) ? <MarkButton r={r} size="default" /> : null}
        <DownloadButton arquivos={arqs} nomeZip={`${r.conta}-${dayKey(r.quando)}-${r.id.replace(/^ig:/, "")}`} />
        {r.link ? <Button asChild variant="outline"><a href={r.link} target="_blank" rel="noopener"><ExternalLink aria-hidden />Ver no Instagram</a></Button> : null}
      </div>
      {r.status === "manual" && !m.canMark(r) && r.eff !== "publicado" ? <p className="-mt-2 text-sm text-muted-foreground">“Já postei” fica disponível no dia do story.</p> : null}
      {ig?.insights ? (<><Comparacao c={m.cmpOf(ig, r.conta)} /><Insights r={r} ig={ig} /></>) : null}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
        {items.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>)}
      </dl>
      {r.legenda ? (
        <Collapsible defaultOpen={story || !ig?.insights}>
          <CollapsibleTrigger asChild><Button variant="secondary" size="sm" className="w-fit">{story ? "Texto do story" : "Legenda completa"}</Button></CollapsibleTrigger>
          <CollapsibleContent className="flex flex-col items-start gap-2">
            <pre className="mt-2 w-full rounded-lg border bg-background p-3 font-sans text-sm whitespace-pre-wrap">{r.legenda}</pre>
            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(r.legenda || "").then(() => toast.success("Texto copiado"), () => toast.error("Não consegui copiar"))}><Copy aria-hidden />Copiar texto</Button>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
      {r.nota ? <p className="text-sm text-muted-foreground">{r.nota}</p> : null}
    </div>
  );
}

/** Detalhe do post: folha que sobe de baixo no celular, painel lateral no computador. */
export function Detail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { m, saindo } = usePainel();
  const desktop = useDesktop();
  // Guarda o último post aberto para o conteúdo não sumir durante a animação de fechar.
  const last = useRef<Row | null>(null);
  const r = id ? m.rowById(id) : null;
  if (r) last.current = r;
  const show = r || last.current;
  // Ao fechar, o foco volta para o item que abriu o detalhe.
  const origem = useRef<HTMLElement | null>(null);
  const aberto = useRef(false);
  if (r && !aberto.current) { origem.current = document.activeElement as HTMLElement | null; aberto.current = true; }
  if (!r) aberto.current = false;
  const devolverFoco = (e: Event) => { const el = origem.current; if (el && document.contains(el)) { e.preventDefault(); el.focus(); } };
  const head = show ? (
    <div className="flex items-start gap-3 border-b bg-card px-4 pt-3 pb-3 md:px-5 md:pt-5" data-a={show.conta}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge eff={show.eff} saindo={!!saindo[show.id]} /><span className="text-sm text-muted-foreground">{ACC[show.conta].label} · <span className="num">{ddmmhm(show.quando)}</span></span></div>
        {desktop ? <SheetTitle className="line-clamp-3 text-lg leading-snug text-ink">{cleanTitle(show.titulo, show.legenda)}</SheetTitle>
          : <DrawerTitle className="line-clamp-3 text-left text-lg leading-snug text-ink">{cleanTitle(show.titulo, show.legenda)}</DrawerTitle>}
        {desktop ? <SheetDescription className="sr-only">Detalhe do post</SheetDescription> : <DrawerDescription className="sr-only">Detalhe do post</DrawerDescription>}
      </div>
      <Button variant="outline" size="icon" onClick={onClose} aria-label="Fechar"><X aria-hidden /></Button>
    </div>
  ) : null;
  const body = show ? <div className="overflow-y-auto px-4 pt-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))] md:px-5" data-a={show.conta}><Body r={r || show} /></div> : null;
  if (desktop)
    return (
      <Sheet open={!!r} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" onCloseAutoFocus={devolverFoco} className="flex w-full flex-col gap-0 p-0 sm:max-w-[520px] [&>button.absolute]:hidden">{head}{body}</SheetContent>
      </Sheet>
    );
  return (
    <Drawer open={!!r} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent onCloseAutoFocus={devolverFoco} className="flex !max-h-[94dvh] flex-col">{head}{body}</DrawerContent>
    </Drawer>
  );
}
