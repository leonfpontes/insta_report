#!/usr/bin/env node
/**
 * Renova os tokens do Instagram (vencem em 60 dias; a Meta deixa renovar a partir de 24 h de
 * idade). Roda toda segunda em .github/workflows/renovar-token.yml. Para cada conta "proprio" da
 * agenda, chama refresh_access_token e:
 * - se a Meta devolver o mesmo token, só estende a validade e pronto;
 * - se devolver um token novo, grava no segredo IG_TOKEN_<CONTA> com o gh CLI (precisa de
 *   GH_TOKEN com permissão de secrets); sem isso, falha e manda e-mail para trocar à mão.
 */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { tokenEnv } from "./publicar.mjs";
import { enviarAlerta } from "./alerta.mjs";

const agenda = JSON.parse(fs.readFileSync(process.env.AGENDA_ARQUIVO ?? "instagram/agenda.json", "utf8"));
const problemas = [];
for (const [conta, cfg] of Object.entries(agenda.contas ?? {})) {
  if (cfg.publicador !== "proprio") continue;
  const nome = tokenEnv(conta);
  const token = process.env[nome];
  const titulo = `Token de ${agenda.contas[conta]?.usuario ?? conta}`;
  if (!token) { problemas.push({ conta, titulo, erro: `falta o segredo ${nome}` }); continue; }
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.search = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token });
  const resposta = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok || !json.access_token) {
    problemas.push({
      conta, titulo, erro: json.error?.message ?? `HTTP ${resposta.status}`,
      motivo: "A Meta não renovou o token desta conta. Sem token válido, os posts dela param de sair.",
      fazer: `Gere um token novo no app da Meta (API com login do Instagram) e troque o segredo ${nome} no GitHub.`,
    });
    continue;
  }
  const dias = Math.round((json.expires_in ?? 0) / 86400);
  if (json.access_token === token) { console.log(`${conta}: token renovado, vale mais ${dias} dias.`); continue; }
  try {
    execFileSync("gh", ["secret", "set", nome, "--body", json.access_token], { stdio: ["ignore", "inherit", "inherit"] });
    console.log(`${conta}: token novo gravado em ${nome}, vale ${dias} dias.`);
  } catch {
    problemas.push({
      conta, titulo,
      motivo: `A Meta devolveu um token novo, mas não consegui gravar no segredo ${nome}. Falta o GH_SECRETS_TOKEN ou ele não tem permissão.`,
      fazer: `Gere um token novo no app da Meta e troque o segredo ${nome}. Para isso acontecer sozinho, crie o segredo GH_SECRETS_TOKEN com "Secrets: Read and write" neste repositório.`,
    });
  }
}
if (problemas.length) {
  console.error(problemas.map((p) => `${p.conta}: ${p.erro ?? p.motivo}`).join("\n"));
  await enviarAlerta({
    assunto: "Instagram: token precisa de atenção",
    titulo: problemas.length === 1 ? "Um token precisa de atenção" : `${problemas.length} tokens precisam de atenção`,
    resumo: "A renovação semanal dos tokens do Instagram não terminou bem. Os tokens vencem em 60 dias.",
    itens: problemas,
    tipo: "aviso",
  });
  process.exitCode = 1;
}
