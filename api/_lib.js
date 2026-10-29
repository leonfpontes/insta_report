// Funções comuns das rotas do painel: sessão por senha, leitura e escrita no GitHub.
// Arquivos com "_" na frente não viram rota na Vercel.
import crypto from "node:crypto";

export const REPO = process.env.GITHUB_REPO || "leonfpontes/insta_report";
const SENHA = process.env.PAINEL_SENHA || "";
const DIAS = 30;

// A chave da sessão sai da própria senha: trocar a senha na Vercel derruba todas as sessões.
const chave = () => crypto.createHash("sha256").update("insta_report:sessao:" + SENHA).digest();
const hmac = (texto) => crypto.createHmac("sha256", chave()).update(texto).digest("base64url");
const iguais = (a, b) => {
  const x = crypto.createHash("sha256").update(a).digest();
  const y = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(x, y);
};

export function senhaConfere(senha) {
  if (SENHA.length < 12 || typeof senha !== "string") return false;
  return iguais(senha, SENHA);
}

export function cookieSessao() {
  const exp = Date.now() + DIAS * 86400_000;
  const valor = `${exp}.${hmac(String(exp))}`;
  return `sessao=${valor}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DIAS * 86400}`;
}
export const cookieSair = "sessao=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";

function sessaoValida(req) {
  if (SENHA.length < 12) return false;
  const m = /(?:^|;\s*)sessao=([^;]+)/.exec(req.headers.cookie ?? "");
  if (!m) return false;
  const [exp, assinatura] = m[1].split(".");
  if (!exp || !assinatura || Number(exp) < Date.now()) return false;
  return iguais(assinatura, hmac(exp));
}

export function responder(res, status, corpo) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(corpo);
}

/** Exige sessão; nas ações, também POST com o cabeçalho do painel (barra pedido de outro site). */
export function autorizado(req, res, { acao = false } = {}) {
  if (acao && (req.method !== "POST" || req.headers["x-painel"] !== "1")) {
    responder(res, 405, { erro: "Use o botão do painel." });
    return false;
  }
  if (!sessaoValida(req)) {
    responder(res, 401, { erro: "Entre com a senha do painel." });
    return false;
  }
  return true;
}

export async function gh(rota, opcoes = {}) {
  const resposta = await fetch("https://api.github.com" + rota, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "insta_report",
      ...(opcoes.body ? { "Content-Type": "application/json" } : {}),
      ...opcoes.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok) {
    const e = new Error(`GitHub ${resposta.status} em ${rota}`);
    e.status = resposta.status;
    throw e;
  }
  return resposta.status === 204 ? null : resposta.json();
}

/** Lê um JSON do repositório na main; devolve o conteúdo e o sha (para gravar por cima). */
export async function lerJson(caminho) {
  const r = await gh(`/repos/${REPO}/contents/${caminho}?ref=main`);
  if (r.content) return { dados: JSON.parse(Buffer.from(r.content, "base64").toString("utf8")), sha: r.sha };
  // Acima de 1 MB a API não manda o conteúdo junto: busca o arquivo cru.
  const cru = await fetch(r.download_url, { signal: AbortSignal.timeout(15_000) });
  return { dados: await cru.json(), sha: r.sha };
}

export async function gravarJson(caminho, dados, sha, mensagem) {
  const content = Buffer.from(JSON.stringify(dados, null, 1) + "\n").toString("base64");
  return gh(`/repos/${REPO}/contents/${caminho}`, {
    method: "PUT",
    body: JSON.stringify({ message: mensagem, content, sha, branch: "main" }),
  });
}

/**
 * Aciona um workflow. Tenta o workflow_dispatch, que pede "Actions: Read and write" no
 * GITHUB_TOKEN; se o token não tiver essa permissão (403/404), cai no repository_dispatch, que só
 * pede "Contents: Read and write" (a mesma de "Já postei"). O tipo do evento é o nome do arquivo
 * sem ".yml", e os workflows leem as entradas de client_payload.
 */
export async function disparar(workflow, inputs) {
  try {
    await gh(`/repos/${REPO}/actions/workflows/${workflow}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref: "main", ...(inputs ? { inputs } : {}) }),
    });
  } catch (error) {
    if (error.status !== 403 && error.status !== 404) throw error;
    console.warn(`workflow_dispatch recusado (${error.status}); usando repository_dispatch`);
    await gh(`/repos/${REPO}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ event_type: workflow.replace(/\.ya?ml$/, ""), client_payload: inputs ?? {} }),
    });
  }
}
