/**
 * Monta os dados do painel (public/index.html) a partir de instagram/agenda.json,
 * instagram/metricas.json e das últimas execuções dos workflows. Quem chama é api/dados.js.
 */

const CAMPOS = ["id", "conta", "quando", "formato", "status", "titulo", "legenda", "nota", "link", "midiaId",
  "publicadoEm", "erro", "tentativas", "pedido"];

// Série de cada post, compacta: [hora, views, alcance, curtidas, interações, salvos,
// compartilhamentos, comentários]. É a ordem que o painel lê.
const SERIE = ["t", "views", "reach", "curtidas", "total_interactions", "saved", "shares", "comentarios"];

const JOBS = { "Publicar": "publicar", "Métricas": "metricas", "Renovar token": "renovar-token" };

/** Uma rodada do GitHub Actions no formato do painel. */
export function execucao(r) {
  return {
    id: r.id,
    quando: r.created_at,
    // O botão do painel pode chegar como repository_dispatch (api/_lib.js → disparar).
    evento: r.event === "repository_dispatch" ? "workflow_dispatch" : r.event,
    job: JOBS[r.name] ?? "",
    resultado: r.status === "completed" ? r.conclusion : r.status,
    link: r.html_url,
  };
}

export function montar({ agenda, metricas, runs, repo, pedidos, sha }) {
  const raw = (arquivo) =>
    `https://raw.githubusercontent.com/${repo}/main/instagram/${arquivo.split("/").map(encodeURIComponent).join("/")}`;
  // Otimização de imagem da Vercel (vercel.json → images): miniatura leve em vez do JPEG cheio.
  const miniatura = (url, w = 640) => `/_vercel/image?url=${encodeURIComponent(url)}&w=${w}&q=75`;
  // Vídeo pelo /m/ do próprio painel (vercel.json), que busca no raw do GitHub e manda o tipo certo
  // (video/mp4). O jsDelivr recusa às vezes este repositório, que passou de 50 MB.
  const video = (arquivo) =>
    `/m/${sha || "main"}/${arquivo.split("/").map(encodeURIComponent).join("/")}`;
  const ehVideo = (arquivo) => /\.(mp4|mov)$/i.test(arquivo);

  const imagens = {};
  // Todas as mídias de cada post, na ordem, para o carrossel do detalhe.
  const galeria = {};
  // Arquivos originais de cada post, para o botão de baixar as mídias.
  const arquivos = {};
  // Miniatura, galeria e arquivos de um post; chave = id na agenda, ou "pp:<id>" na proposta de um pedido.
  const midiaDe = (chave, p) => {
    const fonte = p.capa ?? p.midia?.find((m) => /\.(jpe?g|png)$/i.test(m));
    if (fonte) imagens[chave] = miniatura(raw(fonte));
    const itens = (p.midia ?? []).map((m) =>
      ehVideo(m) ? { video: video(m), ...(p.capa ? { capa: miniatura(raw(p.capa), 1080) } : {}) } : { img: miniatura(raw(m), 1080) });
    if (itens.length > 1 || itens.some((i) => i.video)) galeria[chave] = itens;
    const originais = [...(p.midia ?? []), ...(p.capa && !(p.midia ?? []).includes(p.capa) ? [p.capa] : [])];
    if (originais.length) arquivos[chave] = originais.map((m) => ({ url: ehVideo(m) ? video(m) : raw(m), nome: m.split("/").pop() }));
  };
  for (const p of agenda.posts) midiaDe(p.id, p);

  // Pedidos de publicação (api/pedidos.js): anexos com miniatura e, na proposta, a mídia de cada post.
  // Vídeo que subiu em partes não tem prévia até alguém juntar as partes.
  const listaPedidos = (pedidos?.pedidos ?? []).map((pd) => {
    for (const p of pd.proposta?.posts ?? []) midiaDe("pp:" + p.id, p);
    return {
      ...pd,
      anexos: (pd.anexos ?? []).map((a) => ({
        ...a,
        ...(a.tipo === "imagem" && a.partes === 1 && /\.(jpe?g|png|webp|gif)$/i.test(a.arquivo) ? { img: miniatura(raw(a.arquivo)), url: raw(a.arquivo) } : {}),
        ...(a.tipo === "video" && a.partes === 1 ? { url: video(a.arquivo) } : {}),
        ...(a.tipo === "audio" && a.partes === 1 ? { url: raw(a.arquivo) } : {}),
      })),
    };
  });

  const met = {};
  for (const [conta, c] of Object.entries(metricas?.contas ?? {})) {
    if (c.perfil?.foto) imagens[`perfil:${conta}`] = miniatura(raw(c.perfil.foto) + `?v=${Date.parse(c.coletadoEm ?? 0) || 0}`);
    const compacto = ({ imagem, serie, filhos, ...resto }) => {
      if (imagem) imagens[`ig:${resto.id}`] = miniatura(imagem);
      const orig = filhos?.length ? filhos.map((f) => f.video || f.img).filter(Boolean) : [resto.video || imagem].filter(Boolean);
      if (orig.length) arquivos[`ig:${resto.id}`] = orig.map((url, i) => ({ url, nome: `${resto.id}-${String(i + 1).padStart(2, "0")}.${/\.mp4|video/i.test(url) ? "mp4" : "jpg"}` }));
      if (filhos?.length) {
        galeria[`ig:${resto.id}`] = filhos.map((f) =>
          f.video ? { video: f.video, ...(f.capa ? { capa: miniatura(f.capa, 1080) } : {}) } : { img: miniatura(f.img, 1080) });
      }
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
    galeria,
    arquivos,
    execucoes: {
      runs: (runs ?? []).map(execucao),
    },
    pedidos: listaPedidos,
    lidoEm: new Date().toISOString(),
  };
}
