import { useState } from "react";
import { Check, ExternalLink, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePainel } from "@/lib/ctx";
import { ACC, FMT, cleanTitle, ddmmhm, type Row } from "@/lib/model";

/** "Publicar agora" com confirmação. */
export function PublishButton({ r, size = "sm", full }: { r: Row; size?: "sm" | "default"; full?: boolean }) {
  const { publicar, saindo } = usePainel();
  const [busy, setBusy] = useState(false);
  if (saindo[r.id]) return null;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size={size} variant={r.eff === "falhou" || r.eff === "atrasado" ? "default" : "outline"} className={full ? "w-full" : ""} disabled={busy}>
          <Send aria-hidden /> {r.eff === "falhou" || r.eff === "atrasado" ? "Tentar de novo agora" : "Publicar agora"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publicar agora no {ACC[r.conta].label}?</AlertDialogTitle>
          <AlertDialogDescription>
            {FMT[r.formato] || r.formato} “{cleanTitle(r.titulo, r.legenda)}”, marcado para {ddmmhm(r.quando)}, sai em 1 a 3 minutos, sem esperar o horário. Depois de publicado, só dá para apagar pelo app do Instagram.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={async () => { setBusy(true); try { await publicar(r.id); } finally { setBusy(false); } }}>Publicar agora</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "Já postei": só stories à mão de hoje ou de dias anteriores. */
export function MarkButton({ r, size = "sm", full }: { r: Row; size?: "sm" | "default"; full?: boolean }) {
  const { marcar } = usePainel();
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size={size} variant="outline" className={full ? "w-full" : ""} disabled={busy}>
          <Check aria-hidden /> Já postei
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Marcar este story como postado?</AlertDialogTitle>
          <AlertDialogDescription>
            O story de {ddmmhm(r.quando)} no {ACC[r.conta].label} passa a contar como publicado. Use quando já tiver postado pelo app. O painel também marca sozinho quando detecta o story no perfil.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={async () => { setBusy(true); try { await marcar(r.id); } finally { setBusy(false); } }}>Marcar como postado</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function OpenIgButton({ href, size = "sm" }: { href: string; size?: "sm" | "default" }) {
  return (
    <Button asChild size={size} variant="ghost">
      <a href={href} target="_blank" rel="noopener">
        <ExternalLink aria-hidden /> Ver no Instagram
      </a>
    </Button>
  );
}
