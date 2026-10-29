/**
 * Pedidos de publicação: o Leonardo manda texto e mídia, um Claude devolve a proposta e ele aprova
 * aqui (api/pedidos.js, api/anexo.js, doc/pedidos.md).
 */
import { acao } from "./api";
import { TZ } from "./model";

export type PedidoStatus = "novo" | "producao" | "duvida" | "proposta" | "ajuste" | "aprovado" | "recusado";

export interface Anexo {
  arquivo: string; nome: string; tipo: "imagem" | "video"; bytes: number; partes: number;
  /** Miniatura (só imagem de uma parte) e arquivo original (imagem ou vídeo de uma parte). */
  img?: string; url?: string;
}
export interface Fala { de: "leonardo" | "claude"; em: string; texto: string }
export interface PostProposto {
  id: string; conta: string; quando: string; formato: string; status?: string; titulo: string;
  legenda?: string; nota?: string; midia: string[]; capa?: string;
}
export interface Pedido {
  id: string; criadoEm: string; atualizadoEm?: string; status: PedidoStatus; conta: string;
  formato: string; quando?: string; texto: string; anexos: Anexo[]; conversa?: Fala[];
  proposta?: { em?: string; resumo?: string; posts: PostProposto[] };
  agendados?: string[];
}

export const PEDIDO_STATUS: Record<PedidoStatus, string> = {
  novo: "Na fila do Claude",
  producao: "Em produção",
  duvida: "O Claude perguntou",
  proposta: "Para aprovar",
  ajuste: "Ajuste pedido",
  aprovado: "Aprovado",
  recusado: "Recusado",
};
export const ABERTO: PedidoStatus[] = ["novo", "producao", "duvida", "ajuste"];

/** Quando o Claude olha os pedidos (a tarefa agendada de doc/pedidos.md). */
export const RITMO = "O Claude olha os pedidos a cada hora, das 7h às 23h.";

/** Id no horário de Brasília: pd-AAAAMMDD-HHMMSS. */
export function novoId(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  return `pd-${p.year}${p.month}${p.day}-${p.hour}${p.minute}${p.second}`;
}

/** "2026-11-04T19:00:00-03:00" ↔ "2026-11-04T19:00" do campo de data e hora. O Brasil não tem horário de verão. */
export const paraCampo = (q?: string) => (q ? q.slice(0, 16) : "");
export const doCampo = (v: string) => (v ? `${v}:00-03:00` : "");

/** "há 5 min", "há 2 h", "ontem", "3 dias atrás". */
export function ha(iso?: string) {
  if (!iso) return "";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

export const MB = (b: number) => (b / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: b < 1e7 ? 1 : 0 }) + " MB";

// ---- Envio ----

const PARTE = 2_800_000;
export const VIDEO_MAX = 150e6;
export const ANEXOS_MAX = 10;

export const ehVideo = (f: File) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name);

/** Nome seguro para o repositório: minúsculas, sem acento, com o número na frente. */
export function nomeArquivo(f: File, i: number, ext?: string) {
  const base = f.name.replace(/\.[^.]+$/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "midia";
  const e = (ext || f.name.split(".").pop() || "bin").toLowerCase().replace("jpeg", "jpg");
  return `${String(i + 1).padStart(2, "0")}-${base}.${e}`;
}

/** Foto reduzida a 2160 px no lado maior, em JPEG: sobe rápido e chega ao Claude com folga para recortar. */
async function reduzir(f: File): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 2160 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return await new Promise((ok) => c.toBlob((b) => ok(b), "image/jpeg", 0.9));
  } catch {
    return null; // formato que o navegador não abre (HEIC no Chrome, por exemplo): vai o original
  }
}

const base64 = (b: Blob) => new Promise<string>((ok, erro) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(",")[1] ?? "");
  r.onerror = () => erro(new Error("Não consegui ler o arquivo."));
  r.readAsDataURL(b);
});

/** Sobe um anexo em partes, repetindo cada parte até 3 vezes; avisa o progresso de 0 a 1. */
export async function enviarAnexo(pedido: string, f: File, i: number, progresso: (p: number) => void): Promise<Anexo> {
  const video = ehVideo(f);
  if (video && f.size > VIDEO_MAX) throw new Error(`${f.name} tem ${MB(f.size)}. O limite é ${MB(VIDEO_MAX)}.`);
  const reduzida = video ? null : await reduzir(f);
  const blob: Blob = reduzida ?? f;
  const nome = nomeArquivo(f, i, reduzida ? "jpg" : undefined);
  const total = Math.max(1, Math.ceil(blob.size / PARTE));
  let arquivo = "";
  for (let parte = 1; parte <= total; parte++) {
    const dados = await base64(blob.slice((parte - 1) * PARTE, parte * PARTE));
    for (let tentativa = 1; ; tentativa++) {
      try {
        arquivo = (await acao("/api/anexo", { pedido, nome, parte, total, dados })).arquivo;
        break;
      } catch (e) {
        if (tentativa >= 3) throw e;
        await new Promise((ok) => setTimeout(ok, 1500 * tentativa));
      }
    }
    progresso(parte / total);
  }
  return { arquivo: total === 1 ? arquivo : `pedidos/${pedido}/${nome}`, nome: f.name, tipo: video ? "video" : "imagem", bytes: blob.size, partes: total };
}
