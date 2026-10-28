# insta_report

Agenda, publicador e painel do Instagram de **@pontes_brain**, **@girahuboficial** e **@leopontesrp**. É gratuito
de ponta a ponta: GitHub Actions publica e coleta os números, a Vercel serve o painel em
**instagram.leopontes.com.br**.

## Como funciona

```
instagram/agenda.json ──(Publicar, a cada 10 min)──▶ API do Instagram ──▶ status de volta na agenda
API do Instagram ──(Métricas, de hora em hora)──▶ instagram/metricas.json + instagram/perfil/
painel (public/index.html) ──▶ api/dados.js ──▶ lê agenda e métricas na main pelo GitHub
botões do painel ──▶ api/publicar.js · api/manual.js · api/metricas.js ──▶ GitHub (workflow ou commit)
```

- `instagram/agenda.json`: todos os posts, com conta, horário (Brasília, com fuso), formato,
  legenda, mídia e status (`agendado`, `publicado`, `falhou`, `manual` = story que o Leonardo
  posta à mão). Uma conta só é publicada com `"publicador": "proprio"`; `"pausado"` não publica.
- `instagram/midia/`: imagens em JPEG e vídeos em MP4. O Instagram busca a mídia pelo jsDelivr
  no commit da rodada, então a mídia precisa estar na main antes da hora do post.
- `scripts/publicar.mjs`, `scripts/metricas.mjs`, `scripts/renovar-token.mjs`: rodam nos
  workflows `Publicar`, `Métricas` e `Renovar token` (`.github/workflows/`). Os commits deles
  começam com `[instagram]` e mexem só em `instagram/`, que a Vercel não reconstrói.
- `public/index.html` + `api/`: o painel. Entra com senha; a sessão dura 30 dias.
- `lib/painel.mjs`: monta os dados que o painel mostra.

## Segredos

GitHub, em Settings → Secrets and variables → Actions:

| Segredo | Para quê |
| --- | --- |
| `IG_TOKEN_PONTES_BRAIN`, `IG_TOKEN_GIRAHUB`, `IG_TOKEN_LEOPONTESRP` | Token da API do Instagram de cada conta |
| `RESEND_API_KEY`, `ALERTA_EMAIL` | E-mail de alerta quando um post falha ou o token precisa de atenção |
| `GH_SECRETS_TOKEN` | Opcional: token fino deste repositório com "Secrets: Read and write", para o token do Instagram se renovar sozinho |

Vercel, em Settings → Environment Variables do projeto:

| Variável | Para quê |
| --- | --- |
| `PAINEL_SENHA` | Senha do painel, com 12 caracteres ou mais. Trocar a senha derruba as sessões abertas |
| `GITHUB_TOKEN` | Token fino só deste repositório com "Contents: Read and write" e "Actions: Read and write" |

Nunca cole tokens em chat ou em arquivo do repositório.

## Ligar uma conta do Instagram

1. A conta precisa ser profissional (Criador ou Empresa).
2. Em developers.facebook.com, no app do tipo Empresa, produto "Instagram" → "API com login do
   Instagram", adicione a conta em "Funções do app" → "Testadores do Instagram" e aceite o
   convite no Instagram (Configurações → Apps e sites → Convites de testador).
3. Em "Gerar tokens de acesso", gere o token com `instagram_business_basic`,
   `instagram_business_content_publish` e `instagram_business_manage_insights`.
4. Grave o token no segredo `IG_TOKEN_<CONTA>` deste repositório.
5. Teste em Actions → Publicar → Run workflow, com o id de um post e "simular" marcado.
6. Ponha `"publicador": "proprio"` na conta em `instagram/agenda.json`.

## Testar localmente

`npm run check` confere a sintaxe dos scripts e das rotas. Para rodar o painel com a Vercel:
`npx vercel dev`, com `PAINEL_SENHA` e `GITHUB_TOKEN` num `.env.local`, que não vai para o Git.
