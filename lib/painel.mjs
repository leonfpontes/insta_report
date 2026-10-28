/**
 * Monta os dados do painel (public/index.html) a partir de instagram/agenda.json,
 * instagram/metricas.json e das últimas execuções dos workflows. Quem chama é api/dados.js.
 */

const CAMPOS = ["id", "conta", "quando", "formato", "status", "titulo", "legenda", "nota", "link", "midiaId",
  "publicadoEm", "erro", "tentativas"];

// Série de cada post, compacta: [hora, views, alcance, curtidas, interações, salvos,
// compartilhamentos, comentários]. É a ordem que o painel lê.
const SERIE = ["t", "views", "reach", "curtidas", "total_interactions", "saved", "shares", "comentarios"];

const JOBS = { "Publicar": "publicar", "Métricas": "metricas", "Renovar token": "renovar-token" };

export function montar({ agenda, metricas, runs, repo }) {
  const raw = (arquivo) =>
    `https://raw.githubusercontent.com/${repo}/main/instagram/${arquivo.split("/").map(encodeURIComponent).join("/")}`;
  // Otimização de imagem da Vercel (vercel.json → images): miniatura leve em vez do JPEG cheio.
  const miniatura = (url) => `/_vercel/image?url=${encodeURIComponent(url)}&w=640&q=75`;

  const imagens = {};
  for (const p of agenda.posts) {
    const fonte = p.capa ?? p.midia?.find((m) => /\.(jpe?g|png)$/i.test(m));
    if (fonte) imagens[p.id] = miniatura(raw(fonte));
  }

  const met = {};
  for (const [conta, c] of Object.entries(metricas?.contas ?? {})) {
    if (c.perfil?.foto) imagens[`perfil:${conta}`] = miniatura(raw(c.perfil.foto) + `?v=${Date.parse(c.coletadoEm ?? 0) || 0}`);
    const compacto = ({ imagem, serie, ...resto }) => {
      if (imagem) imagens[`ig:${resto.id}`] = miniatura(imagem);
      return { ...resto, ...(serie?.length ? { serie: serie.map((p) => SERIE.map((k) => p[k] ?? null)) } : {}) };
    };
    met[conta] = {
      geradoEm: metricas.geradoEm,
      coletadoEm: c.coletadoEm ?? null,
      erro: c.erro ?? null,
      perfil: c.perfil ?? null,
      resumo: c.resumo ?? {},
      posts: (c.posts ?? []).map(compacto),
      stories: (c.storiesRecentes ?? []).map(compacto),
      historico: c.historico ?? [],
      diario: c.diario ?? {},
      publico: c.publico ?? {},
      // Luz de conexão. Antes do campo existir, uma coleta sem erro já prova que o token valia.
      conexao: c.conexao ?? (c.coletadoEm ? { ok: !c.erro, verificadoEm: c.coletadoEm, ...(c.erro ? { erro: c.erro } : {}) } : null),
    };
  }

  return {
    agenda: {
      contas: agenda.contas,
      posts: agenda.posts.map((p) => {
        const out = Object.fromEntries(CAMPOS.filter((k) => p[k] != null).map((k) => [k, p[k]]));
        out.itens = p.midia?.length ?? 0;
        return out;
      }),
    },
    metricas: met,
    imagens,
    execucoes: {
      runs: (runs ?? []).map((r) => ({
        id: r.id,
        quando: r.created_at,
        evento: r.event,
        job: JOBS[r.name] ?? "",
        resultado: r.status === "completed" ? r.conclusion : r.status,
        link: r.html_url,
      })),
    },
    lidoEm: new Date().toISOString(),
  };
}
