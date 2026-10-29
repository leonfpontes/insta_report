import { ID_PEDIDO, autorizado, responder, lerJson, gravarJson } from "./_lib.js";

// Pedidos de publicação (doc/pedidos.md). O Leonardo abre um pedido no painel com texto e anexos;
// um Claude lê instagram/pedidos.json, produz os posts e grava a proposta no próprio pedido. Aqui o
// painel cria, comenta (pede ajuste), aprova ou recusa. Aprovar copia os posts da proposta para o
// fim de instagram/agenda.json, e daí em diante é o publicador de sempre.
const ARQ = "instagram/pedidos.json";
const FORMATOS = ["post", "carrossel", "reel", "story", "story-video"];
const FUSO = /^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?-03:00$/;
const agora = () => new Date().toISOString();

class Recusa extends Error {
  constructor(status, mensagem) { super(mensagem); this.status = status; this.recusa = true; }
}

/** Lê, muda e grava um JSON do repositório, relendo quando outro commit passou na frente. */
async function mudar(caminho, vazio, fn, mensagem) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    let atual = { dados: vazio, sha: undefined };
    try {
      atual = await lerJson(caminho);
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    const resultado = fn(atual.dados);
    if (resultado === false) return;
    try {
      await gravarJson(caminho, atual.dados, atual.sha, mensagem);
      return;
    } catch (error) {
      if (error.status !== 409 && error.status !== 422) throw error; // a main mudou no meio: lê de novo
    }
  }
  throw new Recusa(409, "O arquivo mudou enquanto eu gravava. Tente de novo.");
}

const texto = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function achar(dados, id) {
  const p = (dados.pedidos ?? []).find((x) => x.id === id);
  if (!p) throw new Recusa(404, "Pedido não encontrado.");
  return p;
}

async function criar(b) {
  const id = String(b.id ?? "");
  if (!ID_PEDIDO.test(id)) throw new Recusa(400, "Pedido inválido.");
  const pedidoTexto = texto(b.texto, 4000);
  const anexos = (Array.isArray(b.anexos) ? b.anexos : []).slice(0, 20).map((a) => ({
    arquivo: String(a.arquivo ?? ""),
    nome: texto(a.nome, 120),
    tipo: a.tipo === "video" ? "video" : "imagem",
    bytes: Number(a.bytes) || 0,
    partes: Math.max(1, Number(a.partes) || 1),
  }));
  if (anexos.some((a) => !a.arquivo.startsWith(`pedidos/${id}/`) || a.arquivo.includes("..")))
    throw new Recusa(400, "Anexo fora do pedido.");
  if (!pedidoTexto && !anexos.length) throw new Recusa(400, "Escreva o pedido ou anexe uma mídia.");
  const { dados: agenda } = await lerJson("instagram/agenda.json");
  const conta = String(b.conta ?? "");
  if (!agenda.contas?.[conta]) throw new Recusa(400, "Escolha a conta.");
  const formato = FORMATOS.includes(b.formato) ? b.formato : "auto";
  const quando = typeof b.quando === "string" && FUSO.test(b.quando) ? b.quando : "";

  await mudar(ARQ, { pedidos: [] }, (dados) => {
    dados.pedidos ??= [];
    if (dados.pedidos.some((p) => p.id === id)) return false; // repetido pelo painel: já está lá
    dados.pedidos.push({
      id, criadoEm: agora(), atualizadoEm: agora(), status: "novo", conta, formato,
      ...(quando ? { quando } : {}), texto: pedidoTexto, anexos,
      conversa: [],
    });
  }, `[pedido] ${id} novo pedido para ${conta}`);
}

async function comentar(b) {
  const id = String(b.id ?? "");
  const msg = texto(b.texto, 4000);
  if (!msg) throw new Recusa(400, "Escreva o que precisa mudar.");
  await mudar(ARQ, { pedidos: [] }, (dados) => {
    const p = achar(dados, id);
    if (!["novo", "duvida", "proposta", "ajuste"].includes(p.status)) throw new Recusa(409, "Este pedido já foi encerrado.");
    p.conversa = [...(p.conversa ?? []), { de: "leonardo", em: agora(), texto: msg }];
    // Comentário num pedido que ainda não começou só acrescenta detalhe; numa proposta, pede ajuste;
    // numa dúvida do Claude, é a resposta e o pedido volta para a fila.
    if (p.status === "proposta") p.status = "ajuste";
    if (p.status === "duvida") p.status = "novo";
    p.atualizadoEm = agora();
  }, `[pedido] ${id} ajuste pedido`);
}

async function recusar(b) {
  const id = String(b.id ?? "");
  const msg = texto(b.texto, 1000);
  await mudar(ARQ, { pedidos: [] }, (dados) => {
    const p = achar(dados, id);
    if (["aprovado", "recusado"].includes(p.status)) return false;
    p.status = "recusado";
    if (msg) p.conversa = [...(p.conversa ?? []), { de: "leonardo", em: agora(), texto: msg }];
    p.atualizadoEm = agora();
  }, `[pedido] ${id} recusado`);
}

async function aprovar(b) {
  const id = String(b.id ?? "");
  const ajustes = b.ajustes && typeof b.ajustes === "object" ? b.ajustes : {};
  const { dados: pedidos } = await lerJson(ARQ);
  const pedido = achar(pedidos, id);
  if (pedido.status === "aprovado") return;
  if (pedido.status !== "proposta") throw new Recusa(409, "Este pedido ainda não tem proposta para aprovar.");
  const propostos = pedido.proposta?.posts ?? [];
  if (!propostos.length) throw new Recusa(409, "A proposta está sem posts.");

  // Monta os posts finais, com a hora e a legenda que o Leonardo mudou na tela.
  const posts = propostos.map((p) => {
    const a = ajustes[p.id] ?? {};
    const quando = typeof a.quando === "string" && a.quando ? a.quando : p.quando;
    const legenda = typeof a.legenda === "string" ? a.legenda.slice(0, 2200) : p.legenda;
    if (p.conta !== pedido.conta) throw new Recusa(409, `O post ${p.id} é de outra conta.`);
    if (!FORMATOS.includes(p.formato)) throw new Recusa(409, `O post ${p.id} tem um formato que o publicador não conhece.`);
    if (!FUSO.test(quando)) throw new Recusa(400, `A data do post ${p.id} precisa estar no horário de Brasília.`);
    if (Date.parse(quando) < Date.now() + 5 * 60_000) throw new Recusa(409, `O horário do post ${p.id} já passou. Escolha outro.`);
    if (!p.midia?.length) throw new Recusa(409, `O post ${p.id} está sem mídia.`);
    return { ...p, quando, legenda, status: p.status === "manual" ? "manual" : "agendado", pedido: id };
  });

  await mudar("instagram/agenda.json", null, (agenda) => {
    const ids = new Set(agenda.posts.map((p) => p.id));
    const novos = posts.filter((p) => !agenda.posts.some((x) => x.id === p.id && x.pedido === id));
    if (!novos.length) return false; // uma aprovação anterior já gravou a agenda
    for (const p of novos) if (ids.has(p.id)) throw new Recusa(409, `Já existe um post ${p.id} na agenda.`);
    agenda.posts.push(...novos);
  }, `[pedido] ${id} aprovado: ${posts.map((p) => p.id).join(", ")}`);

  await mudar(ARQ, { pedidos: [] }, (dados) => {
    const p = achar(dados, id);
    p.status = "aprovado";
    p.aprovadoEm = agora();
    p.atualizadoEm = agora();
    p.agendados = posts.map((x) => x.id);
  }, `[pedido] ${id} aprovado`);
}

const ACOES = { criar, comentar, recusar, aprovar };

export default async function handler(req, res) {
  if (!autorizado(req, res, { acao: true })) return;
  const fn = ACOES[req.body?.acao];
  if (!fn) return responder(res, 400, { erro: "Ação desconhecida." });
  try {
    await fn(req.body);
    responder(res, 200, { ok: true });
  } catch (error) {
    if (error.recusa) return responder(res, error.status, { erro: error.message });
    console.error(error);
    responder(res, 502, { erro: "Não consegui gravar o pedido agora. Tente de novo em instantes." });
  }
}
