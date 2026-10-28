import { useState } from "react";
import { ChevronDown, Download, FileArchive, FileImage, FileVideo, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Arquivo = { url: string; nome: string };
const ehVideo = (a: Arquivo) => /\.(mp4|mov)$/i.test(a.nome);

function salvar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
async function buscar(a: Arquivo) {
  const r = await fetch(a.url, { mode: "cors" });
  if (!r.ok) throw new Error(`${a.nome}: ${r.status}`);
  return r.blob();
}

/** Baixa as mídias originais do post: cada uma, ou todas num .zip. */
export function DownloadButton({ arquivos, nomeZip }: { arquivos: Arquivo[]; nomeZip: string }) {
  const [busy, setBusy] = useState(false);
  if (!arquivos.length) return null;

  const um = async (a: Arquivo) => {
    setBusy(true);
    try { salvar(await buscar(a), a.nome); }
    // Sem permissão de leitura entre sites (CDN do Instagram): abre o arquivo para salvar à mão.
    catch { window.open(a.url, "_blank", "noopener"); }
    finally { setBusy(false); }
  };
  const todos = async () => {
    setBusy(true);
    try {
      const { zipSync } = await import("fflate");
      const files: Record<string, [Uint8Array, { level: 0 }]> = {};
      for (const [i, a] of arquivos.entries()) files[`${String(i + 1).padStart(2, "0")}-${a.nome}`] = [new Uint8Array(await (await buscar(a)).arrayBuffer()), { level: 0 }];
      salvar(new Blob([zipSync(files) as BlobPart], { type: "application/zip" }), `${nomeZip}.zip`);
      toast.success(`${arquivos.length} mídias baixadas`, { description: `${nomeZip}.zip` });
    } catch (e) {
      toast.error("Não consegui juntar as mídias", { description: `${(e as Error).message}. Baixe uma de cada vez pelo mesmo menu.` });
    } finally { setBusy(false); }
  };

  if (arquivos.length === 1) {
    return (
      <Button variant="outline" onClick={() => um(arquivos[0])} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}Baixar mídia
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}Baixar mídias ({arquivos.length})<ChevronDown className="opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(18rem,calc(100vw-2rem))]">
        <DropdownMenuItem onSelect={todos}><FileArchive aria-hidden />Todas de uma vez (.zip)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="font-normal text-muted-foreground">Uma por vez</DropdownMenuLabel>
        {arquivos.map((a, i) => (
          <DropdownMenuItem key={a.url} onSelect={() => um(a)}>
            {ehVideo(a) ? <FileVideo aria-hidden /> : <FileImage aria-hidden />}
            <span className="num w-5 text-muted-foreground">{i + 1}</span><span className="truncate">{a.nome}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
