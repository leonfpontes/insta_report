import { useEffect, useRef, useState } from "react";
import { CalendarClock, Check, Film, Loader2, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Monogram } from "@/components/bits";
import { Gallery } from "@/components/gallery";
import { DownloadButton } from "@/components/downloads";
import { usePainel } from "@/lib/ctx";
import { acao, SemSessao } from "@/lib/api";
import { useDesktop } from "@/hooks/use-media";
import { ACC, FMT, ddmmhm } from "@/lib/model";
import { MB, PEDIDO_STATUS, RITMO, doCampo, ha, paraCampo, type Anexo, type Pedido, type PedidoStatus, type PostProposto } from "@/lib/pedidos";
import { cn } from "@/lib/utils";

const BADGE: Record<PedidoStatus, string> = {
  novo: "border-input/60 bg-card text-ink",
  producao: "border-ink/30 bg-accent text-ink",
  duvida: "border-warn bg-warn text-white",
  proposta: "border-bronze bg-bronze text-white",
  ajuste: "border-warn/50 bg-warn-soft text-warn",
  aprovado: "border-ok/40 bg-ok-soft text-ok",
  recusado: "border-input/50 bg-muted text-muted-foreground",
};
export function PedidoBadge({ status }: { status: PedidoStatus }) {
  return (
    <Badge variant="outline" className={BADGE[status]}>
      {status === "producao" ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {PEDIDO_STATUS[status] || status}
    </Badge>
  );
}

function Secao({ titulo, children, extra }: { titulo: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{titulo}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Anexos({ anexos }: { anexos: Anexo[] }) {
  const comPrevia = anexos.filter((a) => a.img || a.url);
  const semPrevia = anexos.filter((a) => !a.img && !a.url);
  return (
    <div className="flex flex-col gap-2">
      {comPrevia.length ? (
        <Gallery
          items={comPrevia.length > 1 || comPrevia.some((a) => a.tipo === "video") ? comPrevia.map((a) => (a.tipo === "video" ? { video: a.url } : { img: a.img })) : null}
          single={comPrevia.length === 1 && comPrevia[0].tipo === "imagem" ? comPrevia[0].img : null}
          titulo="Anexos do pedido"
        />
      ) : null}
      {semPrevia.map((a) => (
        <div key={a.arquivo} className="flex items-center gap-3 rounded-md border bg-background px-3 py-2.5 text-sm">
          <Film className="size-5 shrink-0 text-bronze-ink" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-ink">{a.nome}</span>
          <span className="num shrink-0 text-muted-foreground">{MB(a.bytes)}</span>
        </div>
      ))}
      {semPrevia.length ? <p className="text-xs text-muted-foreground">Vídeo grande chega em partes; a prévia aparece na proposta.</p> : null}
    </div>
  );
}

function Conversa({ p }: { p: Pedido }) {
  const falas = p.conversa || [];
  if (!falas.length) return null;
  return (
    <Secao titulo="Conversa">
      <ol className="flex flex-col gap-2.5">
        {falas.map((f, i) => (
          <li key={i} className={cn("flex max-w-[88%] flex-col gap-1", f.de === "leonardo" ? "self-end items-end" : "self-start")}>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {f.de === "claude" ? <><Monogram className="size-4" />Claude</> : "Você"} · {ha(f.em)}
            </span>
            <p className={cn("rounded-lg px-3 py-2 text-sm whitespace-pre-wrap", f.de === "leonardo" ? "bg-ink text-primary-foreground" : "border bg-background text-foreground")}>{f.texto}</p>
          </li>
        ))}
      </ol>
    </Secao>
  );
}

type Ajuste = { quando: string; legenda: string };

/** Um post da proposta, como vai aparecer no feed, com a hora e a legenda editáveis. */
function Proposto({ p, aj, setAj, editavel }: { p: PostProposto; aj: Ajuste; setAj: (a: Ajuste) => void; editavel: boolean }) {
  const { m } = usePainel();
  const k = "pp:" + p.id;
  const mudouHora = aj.quando !== paraCampo(p.quando);
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border bg-background" data-a={p.conta}>
      <header className="flex items-center gap-2.5 border-b bg-card px-3 py-2.5">
        <span className="block size-8 shrink-0 overflow-hidden rounded-full bg-[var(--c)]">{m.avatar(p.conta) ? <img src={m.avatar(p.conta)!} alt="" className="size-full object-cover" /> : null}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-ink">{ACC[p.conta]?.user || p.conta}</span>
          <span className="text-xs text-muted-foreground">{FMT[p.formato] || p.formato}{p.midia.length > 1 ? ` · ${p.midia.length} itens` : ""}{p.status === "manual" ? " · você posta à mão" : ""}</span>
        </span>
        {m.d.arquivos?.[k] ? <DownloadButton arquivos={m.d.arquivos[k]} nomeZip={p.id} /> : null}
      </header>
      <div className="p-3"><Gallery items={m.d.galeria[k] || null} single={m.d.imagens[k] || null} titulo={p.titulo} /></div>
      <div className="flex flex-col gap-4 border-t px-3 pt-3 pb-4">
        <p className="font-medium text-ink">{p.titulo}</p>
        {editavel ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`q-${p.id}`} className="text-sm text-ink"><CalendarClock className="size-4 text-bronze-ink" aria-hidden />Data e hora <span className="font-normal text-muted-foreground">· Brasília</span></Label>
              <div className="flex items-center gap-2">
                <Input id={`q-${p.id}`} type="datetime-local" value={aj.quando} onChange={(e) => setAj({ ...aj, quando: e.target.value })} className="h-10 bg-card md:w-64" />
                {mudouHora ? <Button variant="ghost" size="sm" onClick={() => setAj({ ...aj, quando: paraCampo(p.quando) })}>Voltar para {ddmmhm(p.quando)}</Button> : null}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`l-${p.id}`} className="text-sm text-ink">Legenda</Label>
              <Textarea id={`l-${p.id}`} value={aj.legenda} onChange={(e) => setAj({ ...aj, legenda: e.target.value })} maxLength={2200} className="max-h-[50vh] min-h-40 bg-card text-[15px] leading-relaxed" />
              <span className="num self-end text-xs text-muted-foreground">{aj.legenda.length} de 2.200</span>
            </div>
          </>
        ) : (
          <>
            <p className="num text-sm text-ink"><CalendarClock className="mr-1.5 inline size-4 text-bronze-ink" aria-hidden />{ddmmhm(p.quando)}</p>
            {p.legenda ? <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{p.legenda}</p> : null}
          </>
        )}
        {p.nota ? <p className="rounded-md bg-manual-soft px-3 py-2 text-sm"><span className="font-medium">Para postar à mão:</span> {p.nota}</p> : null}
      </div>
    </article>
  );
}

function Corpo({ p, onClose }: { p: Pedido; onClose: () => void }) {
  const { recarregar } = usePainel();
  const posts = p.proposta?.posts || [];
  const inicial = () => Object.fromEntries(posts.map((x) => [x.id, { quando: paraCampo(x.quando), legenda: x.legenda || "" }]));
  const [aj, setAj] = useState<Record<string, Ajuste>>(inicial);
  const [modo, setModo] = useState<"" | "ajuste">("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<"" | "aprovar" | "ajuste" | "recusar">("");
  const [confirmar, setConfirmar] = useState(false);
  const versao = useRef(p.proposta?.em);
  // Proposta nova (o Claude refez): recomeça os campos.
  useEffect(() => { if (p.proposta?.em !== versao.current) { versao.current = p.proposta?.em; setAj(inicial()); } }, [p.proposta?.em]); // eslint-disable-line react-hooks/exhaustive-deps

  const fazer = async (tipo: "aprovar" | "ajuste" | "recusar", corpo: object, ok: string, desc?: string) => {
    setBusy(tipo);
    try {
      await acao("/api/pedidos", { id: p.id, ...corpo });
      toast.success(ok, desc ? { description: desc } : undefined);
      setModo(""); setMsg("");
      await recarregar();
      if (tipo !== "ajuste") onClose();
    } catch (e) {
      toast.error(e instanceof SemSessao ? "Sua sessão expirou. Entre de novo." : (e as Error).message);
    } finally { setBusy(""); }
  };
  const aprovar = () => {
    const ajustes = Object.fromEntries(posts.map((x) => [x.id, {
      ...(aj[x.id].quando !== paraCampo(x.quando) ? { quando: doCampo(aj[x.id].quando) } : {}),
      ...(aj[x.id].legenda !== (x.legenda || "") ? { legenda: aj[x.id].legenda } : {}),
    }]));
    const quando = posts.map((x) => ddmmhm(doCampo(aj[x.id].quando) || x.quando)).join(", ");
    fazer("aprovar", { acao: "aprovar", ajustes }, posts.length > 1 ? "Posts agendados" : "Post agendado", `Sai ${quando}. Já está na Fila.`);
  };

  const proposta = p.status === "proposta";
  const aberto = ["novo", "producao", "duvida", "ajuste"].includes(p.status);
  const duvida = p.status === "duvida";
  // Na dúvida, a caixa de resposta já vem aberta.
  const escrevendo = modo === "ajuste" || duvida;
  return (
    <>
      <div className="flex flex-col gap-6">
        {proposta || posts.length ? (
          <Secao titulo={proposta ? "Proposta do Claude" : p.status === "aprovado" ? "Agendado" : "Última proposta"}>
            {p.proposta?.resumo ? (
              <div className="flex gap-2.5 rounded-lg border bg-background px-3 py-2.5 text-sm">
                <Monogram className="size-5 shrink-0" />
                <p className="whitespace-pre-wrap">{p.proposta.resumo}</p>
              </div>
            ) : null}
            {posts.map((x) => <Proposto key={x.id} p={x} aj={aj[x.id] || { quando: paraCampo(x.quando), legenda: x.legenda || "" }} setAj={(a) => setAj((s) => ({ ...s, [x.id]: a }))} editavel={proposta} />)}
          </Secao>
        ) : null}

        {aberto ? (
          <div className="flex gap-2.5 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
            {p.status === "producao" ? <Loader2 className="size-5 shrink-0 animate-spin text-ink" aria-hidden /> : <MessageSquare className="size-5 shrink-0 text-ink" aria-hidden />}
            <p>{p.status === "producao" ? "O Claude está trabalhando neste pedido agora." : duvida ? "O Claude precisa de uma resposta sua para continuar. Veja a pergunta na conversa e responda abaixo." : p.status === "ajuste" ? `O Claude vai refazer a proposta com o seu ajuste. ${RITMO}` : `Na fila. ${RITMO}`}</p>
          </div>
        ) : null}

        <Secao titulo="Seu pedido" extra={<span className="num text-xs text-muted-foreground">{ddmmhm(p.criadoEm)}</span>}>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <div className="flex gap-1.5"><dt className="text-muted-foreground">Formato</dt><dd className="text-ink">{p.formato === "auto" ? "O Claude escolhe" : FMT[p.formato] || p.formato}</dd></div>
            <div className="flex gap-1.5"><dt className="text-muted-foreground">Quando</dt><dd className="text-ink">{p.quando ? <span className="num">{ddmmhm(p.quando)}</span> : "Melhor horário"}</dd></div>
          </dl>
          {p.texto ? <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground">{p.texto}</p> : null}
          {p.anexos.length ? <Anexos anexos={p.anexos} /> : null}
        </Secao>

        <Conversa p={p} />

        {proposta || aberto ? (
          <Button variant="ghost" className="self-start px-0 text-crit hover:bg-transparent hover:text-crit hover:underline" onClick={() => setConfirmar(true)} disabled={!!busy}>
            {proposta ? "Recusar a proposta" : "Cancelar o pedido"}
          </Button>
        ) : null}
      </div>

      {proposta || (aberto && p.status !== "producao") ? (
        <div className="sticky bottom-0 -mx-4 mt-6 flex flex-col gap-2 border-t bg-card/95 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] backdrop-blur-md md:-mx-5 md:px-5">
          {escrevendo ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={`msg-${p.id}`} className="text-sm text-ink">{proposta ? "O que precisa mudar?" : duvida ? "Sua resposta" : "Quer acrescentar algum detalhe?"}</Label>
              <Textarea id={`msg-${p.id}`} value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} maxLength={4000} className="bg-background text-base" placeholder={proposta ? "Ex.: troque a 3ª foto, legenda mais curta e sem emoji." : "Ex.: use a foto 2 como capa."} autoFocus={!duvida} />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {proposta && modo !== "ajuste" ? (
              <>
                <Button size="lg" className="h-11 flex-1 md:flex-none" onClick={aprovar} disabled={!!busy}>
                  {busy === "aprovar" ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}Aprovar e agendar
                </Button>
                <Button size="lg" variant="outline" className="h-11 flex-1 md:flex-none" onClick={() => setModo("ajuste")} disabled={!!busy}>Pedir ajuste</Button>
              </>
            ) : null}
            {aberto && !escrevendo ? (
              <Button size="lg" variant="outline" className="h-11 flex-1 md:flex-none" onClick={() => setModo("ajuste")} disabled={!!busy}>Acrescentar um detalhe</Button>
            ) : null}
            {escrevendo ? (
              <>
                <Button size="lg" className="h-11 flex-1 md:flex-none" disabled={!msg.trim() || !!busy}
                  onClick={() => fazer("ajuste", { acao: "comentar", texto: msg }, proposta ? "Ajuste enviado" : duvida ? "Resposta enviada" : "Detalhe acrescentado", proposta || duvida ? RITMO : undefined)}>
                  {busy === "ajuste" ? <Loader2 className="animate-spin" aria-hidden /> : null}{proposta ? "Enviar ajuste" : duvida ? "Responder" : "Acrescentar"}
                </Button>
                {!duvida ? <Button size="lg" variant="ghost" className="h-11" onClick={() => { setModo(""); setMsg(""); }}>Voltar</Button> : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{proposta ? "Recusar esta proposta?" : "Cancelar este pedido?"}</AlertDialogTitle>
            <AlertDialogDescription>O pedido vai para Encerrados e nada é agendado. Se quiser outra versão, use "Pedir ajuste".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-crit text-white hover:bg-crit/90" onClick={() => fazer("recusar", { acao: "recusar", texto: msg }, proposta ? "Proposta recusada" : "Pedido cancelado")}>
              {proposta ? "Recusar" : "Cancelar pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

const tituloDe = (p: Pedido) => p.proposta?.posts?.[0]?.titulo || p.texto.split("\n")[0].trim() || "Pedido com mídia";

export function PedidoDetalhe({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { m } = usePainel();
  const desktop = useDesktop();
  const last = useRef<Pedido | null>(null);
  const p = id ? (m.d.pedidos || []).find((x) => x.id === id) || null : null;
  if (p) last.current = p;
  const show = p || last.current;
  // O link #pedido-<id> abre o detalhe; ao fechar, volta para #pedidos.
  useEffect(() => { try { history.replaceState(null, "", p ? "#pedido-" + p.id : "#pedidos"); } catch { /* ignora */ } }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const head = show ? (
    <div className="flex items-start gap-3 border-b bg-card px-4 pt-3 pb-3 md:px-5 md:pt-5" data-a={show.conta}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2"><PedidoBadge status={show.status} /><span className="text-sm text-muted-foreground">{ACC[show.conta]?.label || show.conta} · {ha(show.atualizadoEm || show.criadoEm)}</span></div>
        {desktop ? <SheetTitle className="line-clamp-3 text-lg leading-snug text-ink">{tituloDe(show)}</SheetTitle>
          : <DrawerTitle className="line-clamp-3 text-left text-lg leading-snug text-ink">{tituloDe(show)}</DrawerTitle>}
        {desktop ? <SheetDescription className="sr-only">Pedido de publicação</SheetDescription> : <DrawerDescription className="sr-only">Pedido de publicação</DrawerDescription>}
      </div>
      <Button variant="outline" size="icon" onClick={onClose} aria-label="Fechar"><X aria-hidden /></Button>
    </div>
  ) : null;
  const body = show ? <div className="flex flex-1 flex-col overflow-y-auto px-4 pt-4 md:px-5" data-a={show.conta}><Corpo key={show.id} p={show} onClose={onClose} />{!["proposta", "novo", "duvida", "ajuste"].includes(show.status) ? <div className="h-[calc(24px+env(safe-area-inset-bottom,0px))] shrink-0" /> : null}</div> : null;
  if (desktop)
    return (
      <Sheet open={!!p} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[560px] [&>button.absolute]:hidden">{head}{body}</SheetContent>
      </Sheet>
    );
  return (
    <Drawer open={!!p} onOpenChange={(o) => !o && onClose()} repositionInputs={false}>
      <DrawerContent className="flex !max-h-[94dvh] flex-col">{head}{body}</DrawerContent>
    </Drawer>
  );
}
