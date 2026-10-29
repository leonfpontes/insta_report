import { autorizado, responder, lerJson, disparar } from "./_lib.js";

// "Publicar agora": só para post agendado ou que falhou, de conta com publicador próprio.
export default async function handler(req, res) {
  if (!autorizado(req, res, { acao: true })) return;
  const id = String(req.body?.id ?? "");
  try {
    const { dados: agenda } = await lerJson("instagram/agenda.json");
    const post = agenda.posts.find((p) => p.id === id);
    if (!post) return responder(res, 404, { erro: "Post não encontrado na agenda." });
    if (agenda.contas?.[post.conta]?.publicador !== "proprio")
      return responder(res, 409, { erro: "Esta conta está pausada no publicador." });
    if (!["agendado", "falhou"].includes(post.status))
      return responder(res, 409, { erro: `Este post está como "${post.status}" e não pode ser publicado daqui.` });
    await disparar("publicar.yml", { post: id });
    responder(res, 202, { ok: true });
  } catch (error) {
    console.error(error);
    responder(res, 502, { erro: `Não consegui acionar o publicador agora. (${error.message})` });
  }
}
