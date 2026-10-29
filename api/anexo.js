import { REPO, ID_PEDIDO, autorizado, responder, gh } from "./_lib.js";

// Anexo de um pedido (foto ou vídeo). O corpo da Vercel aceita até 4,5 MB, então o painel manda
// arquivos grandes em partes de até 2,8 MB: cada parte vira instagram/pedidos/<pedido>/<nome>.parteNN,
// e quem processa o pedido junta as partes com cat (doc/pedidos.md). Arquivo de uma parte só fica
// com o nome original.
const NOME = /^[a-z0-9][a-z0-9._-]{0,80}\.(jpe?g|png|webp|heic|gif|mp4|mov|m4v|webm|m4a|mp3|ogg|wav|aac)$/;
const PARTE_MAX = 3_000_000;

export default async function handler(req, res) {
  if (!autorizado(req, res, { acao: true })) return;
  const { pedido, nome, parte, total, dados } = req.body ?? {};
  if (!ID_PEDIDO.test(String(pedido))) return responder(res, 400, { erro: "Pedido inválido." });
  if (!NOME.test(String(nome))) return responder(res, 400, { erro: "Nome de arquivo inválido." });
  if (!Number.isInteger(parte) || !Number.isInteger(total) || total < 1 || total > 60 || parte < 1 || parte > total)
    return responder(res, 400, { erro: "Parte inválida." });
  if (typeof dados !== "string" || !dados.length) return responder(res, 400, { erro: "Arquivo vazio." });
  const conteudo = Buffer.from(dados, "base64");
  if (conteudo.length > PARTE_MAX) return responder(res, 413, { erro: "Parte grande demais." });

  const arquivo = total === 1 ? nome : `${nome}.parte${String(parte).padStart(2, "0")}`;
  const caminho = `instagram/pedidos/${pedido}/${arquivo}`;
  try {
    await gh(`/repos/${REPO}/contents/${caminho}`, {
      method: "PUT",
      body: JSON.stringify({ message: `[pedido] ${pedido} anexo ${arquivo}`, content: dados, branch: "main" }),
    });
    responder(res, 200, { ok: true, arquivo: `pedidos/${pedido}/${arquivo}` });
  } catch (error) {
    // 422 sem sha = o arquivo já existe (o painel repetiu a parte depois de uma falha de rede).
    if (error.status === 422) return responder(res, 200, { ok: true, arquivo: `pedidos/${pedido}/${arquivo}` });
    console.error(error);
    responder(res, 502, { erro: "Não consegui guardar o anexo agora. Tente de novo." });
  }
}
