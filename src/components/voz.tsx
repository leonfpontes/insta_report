import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Ditado por voz. Onde o navegador transcreve (Chrome, Safari do iPhone, Edge), o texto entra no
 * campo enquanto a pessoa fala. Onde não transcreve (Firefox, por exemplo), grava um áudio e
 * devolve o arquivo, que vai como anexo para o Claude transcrever.
 */

// O reconhecimento de fala ainda não tem tipo no TypeScript.
type Reconhecedor = {
  lang: string; continuous: boolean; interimResults: boolean;
  start: () => void; stop: () => void; abort: () => void;
  onresult: ((e: any) => void) | null; onerror: ((e: any) => void) | null; onend: (() => void) | null;
};
const Classe = (): (new () => Reconhecedor) | null =>
  typeof window === "undefined" ? null : ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null);
export const temDitado = () => !!Classe();
const podeGravar = () => typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Junta o trecho ditado ao texto que já está no campo, com espaço ou quebra de linha. */
export function juntarTexto(atual: string, novo: string) {
  const n = novo.trim();
  if (!n) return atual;
  const frase = n.charAt(0).toUpperCase() + n.slice(1);
  if (!atual.trim()) return frase;
  return atual.replace(/\s+$/, "") + (/[.!?]$/.test(atual.trim()) ? " " : ". ") + frase;
}

export function BotaoVoz({ onTexto, onAudio, onParcial, className, rotulo = "Falar" }: {
  onTexto: (t: string) => void;
  /** Sem ditado no navegador: recebe o áudio gravado. Sem esta função, o botão some nesses navegadores. */
  onAudio?: (f: File) => void;
  /** Texto provisório enquanto a pessoa fala (vazio quando para). */
  onParcial?: (t: string) => void;
  className?: string;
  rotulo?: string;
}) {
  const [ouvindo, setOuvindo] = useState(false);
  const [seg, setSeg] = useState(0);
  const rec = useRef<Reconhecedor | null>(null);
  const grav = useRef<MediaRecorder | null>(null);
  const relogio = useRef<number>(0);
  const parar = useRef(false);
  const ditado = temDitado();

  useEffect(() => () => { rec.current?.abort(); grav.current?.state === "recording" && grav.current.stop(); clearInterval(relogio.current); }, []);

  const contar = (on: boolean) => {
    clearInterval(relogio.current);
    setSeg(0);
    if (on) { const t0 = Date.now(); relogio.current = window.setInterval(() => setSeg((Date.now() - t0) / 1000), 500); }
  };

  const ditar = () => {
    const C = Classe()!;
    const r = new C();
    r.lang = "pt-BR"; r.continuous = true; r.interimResults = true;
    parar.current = false;
    r.onresult = (e) => {
      let parcial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) onTexto(t); else parcial += t;
      }
      onParcial?.(parcial);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") toast.error("O navegador não deixou usar o microfone.", { description: "Libere o microfone para este site nas configurações e toque de novo." });
      else if (e.error !== "no-speech" && e.error !== "aborted") toast.error("O ditado parou.", { description: "Toque no microfone para continuar." });
      parar.current = true;
    };
    // O Safari encerra sozinho depois de uma pausa; enquanto a pessoa não tocar em parar, recomeça.
    r.onend = () => {
      if (!parar.current) { try { r.start(); return; } catch { /* segue para encerrar */ } }
      onParcial?.(""); setOuvindo(false); contar(false);
    };
    rec.current = r;
    try { r.start(); setOuvindo(true); contar(true); } catch { toast.error("Não consegui ligar o microfone."); }
  };

  const gravar = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
      const g = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      const pedacos: Blob[] = [];
      g.ondataavailable = (e) => e.data.size && pedacos.push(e.data);
      g.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setOuvindo(false); contar(false);
        const mime = g.mimeType || tipo || "audio/webm";
        const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(pedacos, { type: mime });
        if (blob.size > 2000) onAudio?.(new File([blob], `audio-do-pedido.${ext}`, { type: mime }));
      };
      grav.current = g;
      g.start(1000);
      setOuvindo(true); contar(true);
    } catch {
      toast.error("O navegador não deixou usar o microfone.", { description: "Libere o microfone para este site e toque de novo." });
    }
  };

  const tocar = () => {
    if (ouvindo) {
      parar.current = true;
      rec.current?.stop();
      if (grav.current?.state === "recording") grav.current.stop();
      return;
    }
    if (ditado) ditar(); else if (onAudio && podeGravar()) gravar();
  };

  if (!ditado && !(onAudio && podeGravar())) return null;
  return (
    <button
      type="button"
      onClick={tocar}
      aria-pressed={ouvindo}
      aria-label={ouvindo ? (ditado ? "Ouvindo. Toque para parar" : "Gravando. Toque para parar") : ditado ? `${rotulo}: ditar o texto` : `${rotulo}: gravar um áudio`}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        ouvindo ? "bg-crit text-white" : "bg-ink text-primary-foreground hover:bg-ink/90",
        className,
      )}
    >
      {ouvindo ? (
        <>
          <span className="relative flex size-3 items-center justify-center" aria-hidden><span className="absolute size-3 animate-ping rounded-full bg-white/70" /><Square className="relative size-3 fill-current" /></span>
          <span className="num">{mmss(seg)}</span><span>Parar</span>
        </>
      ) : (
        <><Mic className="size-4" aria-hidden />{rotulo}</>
      )}
    </button>
  );
}
