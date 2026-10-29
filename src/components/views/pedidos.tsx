import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, ChevronRight, Film, ImagePlus, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Empty } from "@/components/bits";
import { PedidoDetalhe, PedidoBadge } from "@/components/pedido";
import { usePainel } from "@/lib/ctx";
import { acao, SemSessao } from "@/lib/api";
import { ACC, CONTAS, FMT, ddmmhm } from "@/lib/model";
import {
  ABERTO, ANEXOS_MAX, MB, RITMO, VIDEO_MAX, doCampo, ehVideo, enviarAnexo, ha, novoId,
  type Anexo, type Pedido,
} from "@/lib/pedidos";
import { cn } from "@/lib/utils";

const FORMATOS: [string, string][] = [["auto", "O Claude escolhe"], ["post", "Post"], ["carrossel", "Carrossel"], ["reel", "Reel"], ["story", "Story"], ["story-video", "Story em vídeo"]];

interface Arquivo { f: File; url: string; video: boolean; p: number }

/** Botão em forma de chip, para conta, formato e horário. */
function Chip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        on ? "border-ink bg-ink text-primary-foreground" : "border-input/70 bg-card text-ink hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function Campo({ titulo, children, id }: { titulo: string; children: React.ReactNode; id?: string }) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2" id={id}>
      <legend className="mb-2 text-sm font-medium text-ink">{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Composer() {
  const { m, ativas, todas, recarregar } = usePainel();
  const [texto, setTexto] = useState("");
  const [conta, setConta] = useState<string>(() => (!todas && ativas.length === 1 ? ativas[0] : ""));
  const [formato, setFormato] = useState("auto");
  const [quando, setQuando] = useState("");
  const [escolherHora, setEscolherHora] = useState(false);
  const [arqs, setArqs] = useState<Arquivo[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [faltaConta, setFaltaConta] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  useEffect(() => () => arqs.forEach((a) => URL.revokeObjectURL(a.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const juntar = (lista: FileList | null) => {
    if (!lista) return;
    const novos: Arquivo[] = [];
    for (const f of Array.from(lista)) {
      const video = ehVideo(f);
      if (!video && !f.type.startsWith("image/") && !/\.heic$/i.test(f.name)) { toast.error(`${f.name} não é foto nem vídeo.`); continue; }
      if (video && f.size > VIDEO_MAX) { toast.error(`${f.name} tem ${MB(f.size)}. Mande vídeos de até ${MB(VIDEO_MAX)}.`); continue; }
      novos.push({ f, url: URL.createObjectURL(f), video, p: 0 });
    }
    setArqs((a) => {
      const todos = [...a, ...novos];
      if (todos.length > ANEXOS_MAX) toast.error(`Até ${ANEXOS_MAX} arquivos por pedido.`);
      todos.slice(ANEXOS_MAX).forEach((x) => URL.revokeObjectURL(x.url));
      return todos.slice(0, ANEXOS_MAX);
    });
  };
  const tirar = (i: number) => setArqs((a) => { URL.revokeObjectURL(a[i].url); return a.filter((_, j) => j !== i); });

  const pronto = !!conta && (!!texto.trim() || arqs.length > 0) && (!escolherHora || !!quando);
  const totalBytes = arqs.reduce((s, a) => s + a.f.size, 0);
  const progresso = arqs.length ? Math.round((100 * arqs.reduce((s, a) => s + a.p * a.f.size, 0)) / (totalBytes || 1)) : 0;

  const enviar = async () => {
    if (!conta) { setFaltaConta(true); document.getElementById("pedido-conta")?.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    if (!pronto) return;
    setEnviando(true);
    const id = novoId();
    try {
      const anexos: Anexo[] = [];
      for (let i = 0; i < arqs.length; i++) {
        anexos.push(await enviarAnexo(id, arqs[i].f, i, (p) => setArqs((a) => a.map((x, j) => (j === i ? { ...x, p } : x)))));
      }
      await acao("/api/pedidos", { acao: "criar", id, conta, formato, quando: escolherHora ? doCampo(quando) : "", texto, anexos });
      toast.success("Pedido enviado", { description: `${RITMO} A proposta volta aqui para você aprovar.` });
      arqs.forEach((a) => URL.revokeObjectURL(a.url));
      setArqs([]); setTexto(""); setFormato("auto"); setQuando(""); setEscolherHora(false);
      await recarregar();
    } catch (e) {
      if (e instanceof SemSessao) { toast.error("Sua sessão expirou. Entre de novo e reenvie o pedido."); return; }
      toast.error((e as Error).message || "Não consegui enviar o pedido.", { description: "Os arquivos continuam aqui. Tente de novo." });
      setArqs((a) => a.map((x) => ({ ...x, p: 0 })));
    } finally { setEnviando(false); }
  };

  return (
    <section aria-labelledby="novo-pedido" className="flex flex-col gap-5 rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-col gap-1">
        <h2 id="novo-pedido" className="text-lg font-medium text-ink">Novo pedido</h2>
        <p className="text-sm text-muted-foreground">Mande fotos, vídeos ou só uma ideia. O Claude prepara o post e devolve aqui para você aprovar.</p>
      </div>

      <Campo titulo="Conta" id="pedido-conta">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Conta do pedido">
          {CONTAS.map((k) => (
            <Chip key={k} on={conta === k} onClick={() => { setConta(k); setFaltaConta(false); }}>
              <span data-a={k} className="block size-6 overflow-hidden rounded-full bg-[var(--c)]">
                {m.avatar(k) ? <img src={m.avatar(k)!} alt="" className="size-full object-cover" /> : null}
              </span>
              {ACC[k].label}
            </Chip>
          ))}
        </div>
        {faltaConta ? <p className="text-sm text-crit" role="alert">Escolha a conta do pedido.</p> : null}
      </Campo>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pedido-texto" className="text-sm font-medium text-ink">O que você quer publicar?</Label>
        <Textarea
          id="pedido-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={4}
          maxLength={4000}
          className="min-h-28 bg-background text-base"
          placeholder="Ex.: carrossel com estas fotos do workshop de ontem, legenda sobre o que a turma aprendeu no gate 2. Ou: um reel curto explicando por que projeto sem business case atrasa."
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink" id="anexos-titulo">Fotos e vídeos <span className="font-normal text-muted-foreground">· opcional</span></span>
        <div
          onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); juntar(e.dataTransfer.files); }}
          className={cn("grid grid-cols-3 gap-2 rounded-lg sm:grid-cols-4 md:grid-cols-6", arrastando && "ring-[3px] ring-ring/50")}
          aria-labelledby="anexos-titulo"
          role="list"
        >
          {arqs.map((a, i) => (
            <div key={a.url} role="listitem" className="relative aspect-square overflow-hidden rounded-md border bg-muted">
              {a.video ? <video src={a.url} muted playsInline preload="metadata" className="size-full object-cover" /> : <img src={a.url} alt={a.f.name} className="size-full object-cover" />}
              {a.video ? <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-sm bg-black/60 px-1.5 py-0.5 text-xs text-white"><Film className="size-3" aria-hidden />{MB(a.f.size)}</span> : null}
              {enviando ? (
                <span className="absolute inset-x-0 bottom-0 h-1.5 bg-black/30"><span className="block h-full bg-bronze transition-[width]" style={{ width: `${Math.round(a.p * 100)}%` }} /></span>
              ) : (
                <button type="button" onClick={() => tirar(i)} className="absolute top-1.5 right-1.5 inline-flex size-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none" aria-label={`Tirar ${a.f.name}`}>
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          ))}
          {arqs.length < ANEXOS_MAX ? (
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={enviando}
              className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-input/80 bg-background px-2 text-center text-sm text-ink hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
            >
              <ImagePlus className="size-6 text-bronze-ink" aria-hidden />
              {arqs.length ? "Mais" : "Anexar"}
            </button>
          ) : null}
        </div>
        <input ref={input} type="file" accept="image/*,video/*,.heic,.mov" multiple hidden onChange={(e) => { juntar(e.target.files); e.target.value = ""; }} />
        <p className="text-xs text-muted-foreground">Até {ANEXOS_MAX} arquivos. Vídeo de até {MB(VIDEO_MAX)}; mande o original, não o do WhatsApp.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Campo titulo="Formato">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Formato">
            {FORMATOS.map(([k, l]) => <Chip key={k} on={formato === k} onClick={() => setFormato(k)}>{l}</Chip>)}
          </div>
        </Campo>
        <Campo titulo="Quando">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quando publicar">
            <Chip on={!escolherHora} onClick={() => setEscolherHora(false)}>Melhor horário</Chip>
            <Chip on={escolherHora} onClick={() => setEscolherHora(true)}><CalendarClock className="size-4" aria-hidden />Escolher</Chip>
          </div>
          {escolherHora ? (
            <Input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} min={new Date(Date.now() + 3600e3 - new Date().getTimezoneOffset() * 60e3).toISOString().slice(0, 16)} className="h-10 bg-background md:w-64" aria-label="Data e hora, no horário de Brasília" />
          ) : null}
        </Campo>
      </div>

      <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
        {enviando && arqs.length ? (
          <div className="flex flex-1 flex-col gap-1.5" aria-live="polite">
            <span className="text-sm text-ink">Enviando os arquivos… <span className="num">{progresso}%</span></span>
            <Progress value={progresso} className="h-1.5" aria-label="Progresso do envio" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{RITMO}</p>
        )}
        <Button size="lg" onClick={enviar} disabled={enviando || (!!conta && !pronto)} className="h-11 w-full md:w-auto">
          {enviando ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {enviando ? "Enviando" : "Enviar pedido"}
        </Button>
      </div>
    </section>
  );
}

/** Miniatura da linha: a primeira imagem da proposta, ou do anexo, ou um ícone. */
function capa(m: ReturnType<typeof usePainel>["m"], p: Pedido) {
  const pp = p.proposta?.posts?.[0];
  if (pp && m.d.imagens["pp:" + pp.id]) return m.d.imagens["pp:" + pp.id];
  return p.anexos.find((a) => a.img)?.img || null;
}

const titulo = (p: Pedido) => p.proposta?.posts?.[0]?.titulo || p.texto.split("\n")[0].trim() || (p.anexos.length ? `${p.anexos.length} ${p.anexos.length === 1 ? "arquivo" : "arquivos"} sem texto` : "Pedido");

function Linha({ p, onOpen }: { p: Pedido; onOpen: () => void }) {
  const { m } = usePainel();
  const src = capa(m, p);
  const temVideo = p.anexos.some((a) => a.tipo === "video");
  const n = p.proposta?.posts?.length || 0;
  return (
    <li data-a={p.conta} className={cn("border-l-[3px] border-l-[var(--c)]", (p.status === "proposta" || p.status === "duvida") && "bg-[color-mix(in_srgb,var(--bronze)_6%,var(--card))]")}>
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 px-3 py-3 text-left focus-visible:outline-none md:items-center md:px-4 [&:focus-visible_.t]:underline">
        <span className="relative block size-[52px] shrink-0 overflow-hidden rounded-md border bg-muted">
          {src ? <img src={src} alt="" loading="lazy" className="size-full object-cover" /> : (
            <span className="flex size-full items-center justify-center text-muted-foreground">{temVideo ? <Film className="size-5" aria-hidden /> : <Send className="size-5" aria-hidden />}</span>
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="t line-clamp-2 font-medium text-ink md:line-clamp-1">{titulo(p)}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <PedidoBadge status={p.status} />
            <span>{ACC[p.conta]?.label || p.conta}</span>
            {n ? <span>{n === 1 ? FMT[p.proposta!.posts[0].formato] || "1 post" : `${n} posts`}</span> : p.anexos.length ? <span>{p.anexos.length} {p.anexos.length === 1 ? "anexo" : "anexos"}</span> : null}
            <span>{p.status === "aprovado" && p.proposta?.posts?.[0] ? `sai ${ddmmhm(p.proposta.posts[0].quando)}` : ha(p.atualizadoEm || p.criadoEm)}</span>
          </span>
        </span>
        <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground md:mt-0" aria-hidden />
      </button>
    </li>
  );
}

function Grupo({ titulo, itens, abrir, nota }: { titulo: string; itens: Pedido[]; abrir: (id: string) => void; nota?: string }) {
  if (!itens.length) return null;
  return (
    <section className="flex flex-col gap-2" aria-label={titulo}>
      <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">{titulo} <span className="font-normal normal-case">· {itens.length}{nota ? ` · ${nota}` : ""}</span></h2>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">{itens.map((p) => <Linha key={p.id} p={p} onOpen={() => abrir(p.id)} />)}</ul>
    </section>
  );
}

export function PedidosView() {
  const { m, ativas, todas, q } = usePainel();
  const [aberto, setAberto] = useState<string | null>(() => {
    const h = decodeURIComponent(location.hash.slice(1));
    return h.startsWith("pedido-") ? h.slice(7) : null;
  });
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (m.d.pedidos || [])
      .filter((p) => todas || ativas.includes(p.conta))
      .filter((p) => !t || [p.texto, ...(p.proposta?.posts || []).flatMap((x) => [x.titulo, x.legenda])].some((s) => s?.toLowerCase().includes(t)))
      .sort((a, b) => Date.parse(b.atualizadoEm || b.criadoEm) - Date.parse(a.atualizadoEm || a.criadoEm));
  }, [m, ativas, todas, q]);
  const paraAprovar = lista.filter((p) => p.status === "proposta" || p.status === "duvida");
  const andamento = lista.filter((p) => ABERTO.includes(p.status) && p.status !== "duvida");
  const fechados = lista.filter((p) => p.status === "aprovado" || p.status === "recusado");

  return (
    <div className="flex flex-col gap-6">
      {/* O que espera o Leonardo vem antes do quadro de pedido novo. */}
      <Grupo titulo="Esperando você" itens={paraAprovar} abrir={setAberto} />
      <Composer />
      <Grupo titulo="Em andamento" itens={andamento} abrir={setAberto} />
      {fechados.length ? (
        <Collapsible className="flex flex-col gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="self-start px-0 text-sm font-medium tracking-wide text-muted-foreground uppercase hover:bg-transparent hover:text-ink">
              Encerrados <span className="font-normal normal-case">· {fechados.length}</span><ChevronRight className="transition-transform [[data-state=open]_&]:rotate-90" aria-hidden />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card">{fechados.map((p) => <Linha key={p.id} p={p} onOpen={() => setAberto(p.id)} />)}</ul>
          </CollapsibleContent>
        </Collapsible>
      ) : null}
      {!lista.length ? <Empty>{q ? "Nenhum pedido com essa busca." : "Nenhum pedido ainda. O primeiro sai do quadro acima."}</Empty> : null}
      <PedidoDetalhe id={aberto} onClose={() => setAberto(null)} />
    </div>
  );
}
