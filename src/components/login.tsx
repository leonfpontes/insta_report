import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brand } from "@/components/bits";
import { entrar } from "@/lib/api";

export function Login({ onOk }: { onOk: () => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="gut mx-auto flex min-h-dvh max-w-sm flex-col justify-center py-10">
      <Card>
        <CardHeader className="gap-3">
          <Brand big />
          <CardDescription>Fila, calendário e números das suas contas do Instagram.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!senha) { setErro("Digite a senha do painel."); return; }
              setBusy(true); setErro("");
              try { await entrar(senha); setSenha(""); onOk(); }
              catch (err) { setErro(err instanceof TypeError ? "Sem conexão. Tente de novo." : (err as Error).message); }
              finally { setBusy(false); }
            }}
          >
            <Label htmlFor="senha">Senha do painel</Label>
            <Input id="senha" type="password" autoComplete="current-password" autoFocus value={senha} onChange={(e) => setSenha(e.target.value)} aria-invalid={!!erro} aria-describedby="login-msg" className="h-11" />
            <Button type="submit" size="lg" disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : null}Entrar</Button>
            <p id="login-msg" role="status" className="min-h-5 text-sm text-crit">{erro}</p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
