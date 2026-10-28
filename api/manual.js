import { autorizado, responder, lerJson, gravarJson } from "./_lib.js";

// "Já postei": marca na agenda um story que o Leonardo postou à mão no app.
export default async function handler(req, res) {
  if (!autorizado(req, res, { acao: true })) return;
  const id = String(req.body?.id ?? "");
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const { dados: agenda, sha } = await lerJson("instagram/agenda.json");
      const post = agenda.posts.find((p) => p.id === id);
      if (!post) return responder(res, 404, { erro: "Post não encontrado na agenda." });
      if (post.status === "publicado") return responder(res, 200, { ok: true });
      if (post.status !== "manual") return responder(res, 409, { erro: "Só stories de postar à mão podem ser marcados." });
      Object.assign(post, { status: "publicado", publicadoEm: new Date().toISOString(), nota: "Publicado à mão pelo Leonardo." });
      await gravarJson("instagram/agenda.json", agenda, sha, `[instagram] ${id} postado à mão`);
      return responder(res, 200, { ok: true });
    } catch (error) {
      if (error.status === 409 || error.status === 422) continue; // a agenda mudou no meio: lê de novo
      console.error(error);
      return responder(res, 502, { erro: "Não consegui gravar na agenda agora." });
    }
  }
  responder(res, 409, { erro: "A agenda mudou enquanto eu gravava. Tente de novo." });
}
