#!/usr/bin/env node
/**
 * Painel local, sem Vercel e sem token do GitHub. Serve dist/ e as rotas de api/ lendo e gravando
 * instagram/agenda.json e instagram/metricas.json deste clone, no lugar da API do GitHub.
 *
 *   npm run build && npm run local      → http://localhost:3000, senha "senha-local-123"
 *   npm run local, e noutro terminal npm run dev  → painel com recarga instantânea (porta 5173)
 *
 * Os botões "Publicar agora" e "Checar agora" não disparam nada: o pedido aparece no terminal.
 * "Já postei" grava de verdade na agenda local (desfaça com git checkout se for só teste). Os pedidos
 * gravam em instagram/pedidos.json e instagram/pedidos/ (apague os dois depois do teste).
 * A aba Execuções fica vazia, porque não há GitHub Actions aqui.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORTA = Number(process.env.PORTA ?? 3000);
process.env.PAINEL_SENHA ??= "senha-local-123";
process.env.GITHUB_TOKEN ??= "local";

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4", ".txt": "text/plain",
  ".json": "application/json", ".woff2": "font/woff2",
};
const json = (corpo, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

// As rotas falam com api.github.com; aqui elas falam com os arquivos do clone.
const fetchReal = globalThis.fetch;
globalThis.fetch = async (url, op = {}) => {
  const u = new URL(url);
  if (u.hostname !== "api.github.com") return fetchReal(url, op);
  const metodo = op.method ?? "GET";
  const conteudo = /\/contents\/(.+)$/.exec(u.pathname);
  if (conteudo) {
    const arquivo = path.join(RAIZ, decodeURIComponent(conteudo[1]));
    if (metodo === "GET") {
      if (!fs.existsSync(arquivo)) return json({ message: "Not Found" }, 404);
      return json({ content: fs.readFileSync(arquivo).toString("base64"), sha: "local" });
    }
    if (metodo === "PUT") {
      const b = JSON.parse(op.body);
      fs.mkdirSync(path.dirname(arquivo), { recursive: true });
      fs.writeFileSync(arquivo, Buffer.from(b.content, "base64"));
      console.log("gravou", path.relative(RAIZ, arquivo), "·", b.message);
      return json({});
    }
  }
  if (u.pathname.endsWith("/dispatches")) {
    console.log("dispararia", u.pathname.split("/").at(-2), op.body ?? "");
    return new Response(null, { status: 204 });
  }
  if (u.pathname.endsWith("/actions/runs")) return json({ total_count: 0, workflow_runs: [] });
  return json({ message: "Not Found" }, 404);
};

// /_vercel/image da Vercel: devolve o arquivo local quando a URL é deste repositório.
async function imagem(u, res) {
  const alvo = new URL(u.searchParams.get("url") ?? "");
  const m = /^\/[^/]+\/[^/]+\/main\/(.+)$/.exec(alvo.pathname);
  if (alvo.hostname === "raw.githubusercontent.com" && m) {
    const arquivo = path.join(RAIZ, decodeURIComponent(m[1]));
    if (fs.existsSync(arquivo)) {
      res.setHeader("Content-Type", TIPOS[path.extname(arquivo).toLowerCase()] ?? "image/jpeg");
      return res.end(fs.readFileSync(arquivo));
    }
  }
  try {
    const r = await fetchReal(alvo);
    res.setHeader("Content-Type", r.headers.get("content-type") ?? "image/jpeg");
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.statusCode = 404;
    res.end();
  }
}

async function rota(u, req, res) {
  const arquivo = path.join(RAIZ, u.pathname + ".js");
  if (!/^\/api\/[a-z]+$/.test(u.pathname) || !fs.existsSync(arquivo)) {
    res.statusCode = 404;
    return res.end();
  }
  let corpo = "";
  for await (const parte of req) corpo += parte;
  req.body = corpo ? JSON.parse(corpo) : undefined;
  res.status = (s) => { res.statusCode = s; return res; };
  res.json = (o) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(o)); };
  // O cookie da sessão é "Secure"; em http://localhost o navegador aceita mesmo assim.
  const mod = await import(pathToFileURL(arquivo).href);
  return mod.default(req, res);
}

function estatico(u, res) {
  const dist = path.join(RAIZ, "dist");
  let arquivo = path.join(dist, decodeURIComponent(u.pathname));
  if (!arquivo.startsWith(dist) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) arquivo = path.join(dist, "index.html");
  if (!fs.existsSync(arquivo)) {
    res.statusCode = 503;
    return res.end("Rode npm run build antes, para gerar dist/.");
  }
  res.setHeader("Content-Type", TIPOS[path.extname(arquivo)] ?? "application/octet-stream");
  res.end(fs.readFileSync(arquivo));
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  try {
    if (u.pathname.startsWith("/_vercel/image")) return await imagem(u, res);
    if (u.pathname.startsWith("/api/")) return await rota(u, req, res);
    estatico(u, res);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end();
  }
}).listen(PORTA, () => console.log(`Painel local em http://localhost:${PORTA} · senha: ${process.env.PAINEL_SENHA}`));
