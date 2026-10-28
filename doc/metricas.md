# Métricas

`scripts/metricas.mjs`, chamado pelo workflow **Métricas** (`.github/workflows/metricas.yml`)
no minuto 7 de cada hora e pelo botão **Checar agora** do painel. Grava
`instagram/metricas.json` e a foto de cada perfil em `instagram/perfil/<conta>.jpg`.

O Instagram só devolve o valor de agora. Toda a parte de "como esse número evoluiu" vem das
coletas anteriores que o próprio script guarda no arquivo.

## O que coleta por conta

| Parte | Origem na API | Frequência |
| --- | --- | --- |
| Perfil: seguidores, seguindo, posts, bio, tipo de conta | `GET /me` | toda hora |
| Foto do perfil | `profile_picture_url`, baixada para o repositório porque o link expira | toda hora |
| Últimos 50 posts com curtidas e comentários | `GET /me/media` | toda hora |
| Itens de cada carrossel (`filhos`) | campo `children{…}`, com recuo para só os ids se a API recusar | toda hora |
| Insights de post: views, alcance, salvos, compartilhamentos, interações (reel também tempo médio assistido) | `GET /{media}/insights` | toda hora até 30 dias de vida; de 30 a 90 dias, uma vez por dia às 03:00 |
| Stories no ar e os insights deles | `GET /me/stories` | toda hora; guardados por 30 dias em `storiesRecentes`, porque somem da API em 24 h |
| Resumo da conta em 7 e 28 dias | `GET /{user}/insights` `metric_type=total_value` | toda hora |
| Alcance e seguidores por dia (30 dias) | `GET /{user}/insights period=day` | toda hora |
| Seguidores × não seguidores, demografia | `breakdown=follow_type`, `follower_demographics`, `engaged_audience_demographics` | toda hora |
| Histórico diário de seguidores e posts | um ponto por dia, guardado 400 dias | toda hora (sobrescreve o ponto do dia) |
| Conexão (`conexao`) | resultado da própria coleta | toda hora |

## Formato de `metricas.json`

```jsonc
{
  "geradoEm": "2026-10-28T20:07:31.000Z",
  "contas": {
    "pontes_brain": {
      "coletadoEm": "…",
      "conexao": { "ok": true, "verificadoEm": "…", "usuario": "pontes_brain" },
      "perfil": { "username": "pontes_brain", "followers_count": 55, "media_count": 12, "foto": "perfil/pontes_brain.jpg" },
      "posts": [
        {
          "id": "1789…", "tipo": "CAROUSEL_ALBUM", "produto": "FEED", "quando": "…", "link": "https://www.instagram.com/p/…",
          "legenda": "primeiros 160 caracteres", "curtidas": 6, "comentarios": 0, "itens": 6,
          "filhos": [{ "img": "https://…cdninstagram.com/…" }],
          "insights": { "views": 43, "reach": 26, "saved": 0, "shares": 2, "total_interactions": 6 },
          "serie": [{ "t": "2026-10-28T16:07Z", "views": 12, "reach": 9, "…": "…" }]
        }
      ],
      "stories": [], "storiesRecentes": [],
      "resumo": { "7d": { "reach": 136, "…": "…" }, "28d": {} },
      "diario": { "reach": [{ "dia": "2026-10-27", "valor": 40 }], "follower_count": [] },
      "publico": { "porSeguidor": {}, "seguidores": {}, "engajados": {} },
      "historico": [{ "data": "2026-10-28", "seguidores": 55, "seguindo": 80, "posts": 12 }]
    }
  }
}
```

- `serie` de cada post: um ponto por coleta nas primeiras 48 h de vida, depois um por dia, até 60
  dias. É dela que sai a comparação "na mesma idade" do painel.
- Quando uma parte é recusada (falta de permissão, conta nova sem dados), ela fica com `erro` e o
  resto do arquivo sai normal.

## Conexão

`conexao` é a luz verde ou vermelha ao lado de cada conta no painel.

| Valor | Significado |
| --- | --- |
| `{ ok: true }` | A coleta terminou com o token aceito |
| `{ ok: false, tipo: "token" }` | Token recusado (código 190 ou 102, sessão expirada) ou segredo ausente. Os posts desta conta não vão sair |
| `{ ok: false, tipo: "api" }` | A API falhou por outro motivo (instabilidade, limite). O token pode estar bom |

## Comparação "acima ou abaixo da média"

Calculada no navegador (`src/lib/model.ts`), não no script:

1. Para cada post, pega os **5 posts anteriores da mesma conta**.
2. Compara views, alcance e interações com a média desses 5 **na mesma idade** (horas desde a
   publicação), usando a `serie` de cada um.
3. Diferença de **+15% ou mais** é alta (▲), **−15% ou menos** é queda (▼), o resto é na média.
   Diferença absoluta menor que 2 conta como na média, para não piscar seta em número pequeno.
4. Sem anteriores suficientes, o post fica como "Sem comparação ainda".

Stories são comparados só com stories.

## Limites da API

- Contas com menos de 100 seguidores não recebem demografia nem algumas séries diárias. O
  histórico próprio do script cobre seguidores e posts.
- Posts feitos antes de a conta virar profissional não têm insights.
- Os links de imagem do Instagram (`*.cdninstagram.com`) expiram em dias. Por isso a coleta os
  renova a cada hora.
