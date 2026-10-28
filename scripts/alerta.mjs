/**
 * E-mail de alerta do publicador (Resend). Monta um HTML simples, em tabelas e com estilo
 * inline, na paleta Papel & Marinho: o que aconteceu, com qual post, o motivo em português e o
 * que fazer, com links para o post no painel e para o log da rodada. Vai também em texto puro.
 */

const PAINEL = process.env.PAINEL_URL ?? "https://instagram.leopontes.com.br";
const REMETENTE = "Agenda Instagram <alertas@leopontes.com.br>";
const COR = { papel: "#f6f3ec", cartao: "#fbf9f4", fio: "#ddd8cc", marinho: "#14213d", bronze: "#7a5c2e", texto: "#14213d", suave: "#6b675f", erro: "#b3392b", aviso: "#8a5a00" };
const CONTAS = { pontes_brain: "@pontes_brain", GiraHub: "@girahuboficial" };
const FORMATOS = { post: "Post", carrossel: "Carrossel", story: "Story", "story-video": "Story em vídeo", reel: "Reel" };

export const linkLog = () =>
  process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL ?? "https://github.com"}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
export const linkPost = (id) => `${PAINEL}/#post-${encodeURIComponent(id)}`;

const quandoBR = (iso) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso)).replace(",", "");

/** Traduz o erro técnico em motivo e próximo passo. */
export function explicar(erro = "") {
  const e = erro.toLowerCase();
  if (e.includes("passou mais de"))
    return { motivo: "O post não saiu na hora marcada. O GitHub pode ter atrasado a rodada ou o publicador ficou parado. Ele foi segurado para não sair fora de hora.", fazer: "Escolha um horário novo na agenda ou toque em Publicar agora no painel." };
  if (e.includes("falta o segredo"))
    return { motivo: "Falta o token desta conta nos segredos do GitHub.", fazer: "No insta_report, em Settings → Secrets → Actions, crie o segredo indicado com o token da conta." };
  if (/(session has expired|error validating access token|invalid oauth|access token|code 190|\b190\b)/.test(e))
    return { motivo: "O Instagram recusou o token da conta: ele venceu ou foi revogado.", fazer: "Gere um token novo no app da Meta (API com login do Instagram) e troque o segredo da conta no GitHub." };
  if (/(aspect ratio|proporç)/.test(e))
    return { motivo: "O Instagram não aceitou a proporção da imagem ou do vídeo.", fazer: "Feed aceita de 4:5 a 1,91:1 e story e reel pedem 9:16. Ajuste a mídia, suba de novo e publique pelo painel." };
  if (/(media download|could not be fetched|media.*fetch|image_url|video_url|unsupported|format)/.test(e))
    return { motivo: "O Instagram não conseguiu baixar ou abrir a mídia do post.", fazer: "Confira se o arquivo está na main em JPEG (imagem) ou MP4 (vídeo) e publique de novo pelo painel." };
  if (/(não ficou pronto|expired|status_code|container)/.test(e))
    return { motivo: "O Instagram não terminou de processar o vídeo a tempo.", fazer: "Tente Publicar agora pelo painel. Se falhar de novo, reduza o tamanho ou a duração do vídeo." };
  if (/(limit|rate|too many|cota)/.test(e))
    return { motivo: "A conta bateu o limite da API do Instagram (100 posts por dia ou chamadas demais).", fazer: "Espere algumas horas e publique pelo painel." };
  if (/(timeout|aborted|fetch failed|econn|network)/.test(e))
    return { motivo: "A conexão com o Instagram caiu durante a publicação.", fazer: "Publique de novo pelo painel. Costuma ser passageiro." };
  return { motivo: "A API do Instagram devolveu um erro que eu não reconheço.", fazer: "Veja o detalhe técnico abaixo e o log da rodada, e tente Publicar agora pelo painel." };
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const botao = (rotulo, url, cheio) =>
  `<a href="${esc(url)}" style="display:inline-block;padding:10px 16px;border-radius:8px;font-weight:500;font-size:14px;text-decoration:none;${cheio ? `background:${COR.marinho};color:${COR.papel};border:1px solid ${COR.marinho}` : `background:${COR.cartao};color:${COR.marinho};border:1px solid ${COR.marinho}`}">${esc(rotulo)}</a>`;

/**
 * itens: [{ conta, id, quando, formato, titulo, erro, tentativas, extra }]
 * tipo: "erro" (vermelho) ou "aviso" (âmbar)
 */
export function montarAlerta({ assunto, titulo, resumo, itens = [], tipo = "erro", rodape }) {
  const cor = tipo === "aviso" ? COR.aviso : COR.erro;
  const log = linkLog();
  const blocos = itens.map((it) => {
    const { motivo, fazer } = it.motivo ? it : explicar(it.erro);
    const linhas = [
      ["Conta", CONTAS[it.conta] ?? it.conta],
      it.quando && ["Horário marcado", quandoBR(it.quando)],
      it.formato && ["Formato", FORMATOS[it.formato] ?? it.formato],
      it.id && ["Id na agenda", it.id],
      it.tentativas && ["Tentativas", String(it.tentativas)],
      ...(it.extra ?? []),
    ].filter(Boolean);
    return `
<tr><td style="padding:0 0 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.cartao};border:1px solid ${COR.fio};border-left:4px solid ${cor};border-radius:10px">
    <tr><td style="padding:18px 20px">
      <div style="font-size:16px;font-weight:500;color:${COR.texto};line-height:1.35">${esc(it.titulo ?? it.id ?? "Post")}</div>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 4px;font-size:13px;color:${COR.texto}">
        ${linhas.map(([k, v]) => `<tr><td style="padding:2px 16px 2px 0;color:${COR.suave};white-space:nowrap">${esc(k)}</td><td style="padding:2px 0">${esc(v)}</td></tr>`).join("")}
      </table>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:${COR.texto}"><strong style="font-weight:500">O que houve:</strong> ${esc(motivo)}</p>
      <p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:${COR.texto}"><strong style="font-weight:500">O que fazer:</strong> ${esc(fazer)}</p>
      ${it.erro ? `<p style="margin:12px 0 0;padding:10px 12px;background:${COR.papel};border-radius:8px;font-family:'Roboto Mono',Menlo,Consolas,monospace;font-size:12px;line-height:1.45;color:${COR.suave};word-break:break-word">${esc(it.erro)}</p>` : ""}
      ${it.id ? `<div style="margin-top:14px">${botao("Abrir no painel", linkPost(it.id), true)}</div>` : ""}
    </td></tr>
  </table>
</td></tr>`;
  }).join("");

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(assunto)}</title></head>
<body style="margin:0;padding:0;background:${COR.papel};font-family:Roboto,'Helvetica Neue',Arial,sans-serif;color:${COR.texto}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COR.papel}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">
  <tr><td style="background:${COR.cartao};border:1px solid ${COR.fio};border-bottom:1px solid ${COR.fio};border-radius:12px 12px 0 0;padding:14px 20px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:12px"><img src="${PAINEL}/email/lp.png" width="32" height="32" alt="LP" style="display:block;border:0"></td>
      <td style="color:${COR.texto};font-size:15px;font-weight:500;letter-spacing:.01em">Agenda do <span style="color:${COR.bronze}">Instagram</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:${COR.cartao};border:1px solid ${COR.fio};border-top:0;border-radius:0 0 12px 12px;padding:20px 20px 8px">
    <div style="display:inline-block;padding:3px 8px;border-radius:6px;background:${cor};color:#fff;font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase">${tipo === "aviso" ? "Atenção" : "Falha"}</div>
    <h1 style="margin:12px 0 6px;font-size:22px;line-height:1.25;font-weight:500;color:${COR.texto}">${esc(titulo)}</h1>
    ${resumo ? `<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:${COR.suave}">${esc(resumo)}</p>` : ""}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${blocos}</table>
    <div style="padding:4px 0 20px">${botao("Abrir o painel", PAINEL, false)}${log ? `&nbsp; ${botao("Ver o log da rodada", log, false)}` : ""}</div>
  </td></tr>
  <tr><td style="padding:16px 4px;font-size:12px;line-height:1.5;color:${COR.suave}">${esc(rodape ?? "Enviado pelo publicador do insta_report. Você recebe este e-mail porque está em ALERTA_EMAIL.")}</td></tr>
</table></td></tr></table></body></html>`;

  const texto = [
    titulo, resumo, "",
    ...itens.flatMap((it) => {
      const { motivo, fazer } = it.motivo ? it : explicar(it.erro);
      return [
        `• ${it.titulo ?? it.id} (${CONTAS[it.conta] ?? it.conta}${it.quando ? ", " + quandoBR(it.quando) : ""})`,
        `  O que houve: ${motivo}`, `  O que fazer: ${fazer}`,
        it.erro ? `  Detalhe: ${it.erro}` : null, it.id ? `  Painel: ${linkPost(it.id)}` : null, "",
      ].filter((l) => l !== null);
    }),
    `Painel: ${PAINEL}`, log ? `Log da rodada: ${log}` : null,
  ].filter((l) => l !== null && l !== undefined).join("\n");

  return { assunto, html, texto };
}

export async function enviarAlerta(alerta) {
  const { assunto, html, texto } = montarAlerta(alerta);
  const key = process.env.RESEND_API_KEY;
  const to = process.env.ALERTA_EMAIL;
  if (!key || !to) { console.log(`(sem e-mail configurado) ${assunto}`); return false; }
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: REMETENTE, to: [to], subject: assunto, html, text: texto }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!resposta.ok) console.error(`Resend ${resposta.status}: ${await resposta.text()}`);
  return resposta.ok;
}
