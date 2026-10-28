# Desenvolvimento

## Requisitos

- Node 20 ou mais novo (os workflows usam o Node do `ubuntu-latest`).
- Nada mais para rodar local. Vercel CLI só se quiser testar com as funções reais.

## Rodar o painel no seu computador

```bash
git clone https://github.com/leonfpontes/insta_report.git
cd insta_report
npm ci
npm run build      # gera dist/
npm run local      # http://localhost:3000, senha: senha-local-123
```

`npm run local` (`scripts/painel-local.mjs`) serve `dist/` e as rotas de `api/` com a agenda e as
métricas **deste clone**, sem Vercel e sem token do GitHub. Os botões que disparam workflows só
escrevem no terminal o que fariam. "Já postei" grava de verdade no `agenda.json` local.

Para mexer na interface com recarga instantânea, deixe `npm run local` rodando e, noutro
terminal:

```bash
npm run dev        # http://localhost:5173, /api e /_vercel vão para a porta 3000
```

| Variável do painel local | Padrão |
| --- | --- |
| `PORTA` | `3000` |
| `PAINEL_SENHA` | `senha-local-123` |

### Com a Vercel de verdade

```bash
npx vercel link
npx vercel env pull .env.local   # PAINEL_SENHA e GITHUB_TOKEN; .env* está no .gitignore
npx vercel dev                   # porta 3000, lendo a agenda real na main
```

## Rodar os scripts

```bash
SIMULAR=1 node scripts/publicar.mjs                                # o que sairia agora
AGORA=2026-11-04T12:20:00-03:00 SIMULAR=1 node scripts/publicar.mjs # o que sairia nessa hora
AGENDA_ARQUIVO=/tmp/agenda-teste.json SIMULAR=1 node scripts/publicar.mjs
```

Sem `SIMULAR`, o script chama a API de verdade e precisa de `IG_TOKEN_<CONTA>` no ambiente. Não
faça isso com tokens reais fora do GitHub Actions.

## Conferências

```bash
npm run check    # node --check em scripts/, lib/ e api/
npm run build    # TypeScript (tsc -b) e build do Vite
```

Rode os dois antes de abrir PR. Não há suíte de testes automatizados; os testes de tela são
feitos com o painel local e Playwright.

## Deploy

| O quê | Como |
| --- | --- |
| Painel | A Vercel faz o deploy a cada merge na `main`. `vercel.json` define `npm run build` e `dist/`. Commits que só mexem em `instagram/` são ignorados (`ignoreCommand`) |
| Workflows e scripts | Valem a partir do merge na `main`. Não há build |
| Domínio | `instagram.leopontes.com.br`, apontado para o projeto na Vercel |

Variáveis da Vercel (Settings → Environment Variables):

| Variável | Para quê |
| --- | --- |
| `PAINEL_SENHA` | Senha do painel, 12 caracteres ou mais |
| `GITHUB_TOKEN` | Token fino só deste repositório, com "Contents: Read and write" e "Actions: Read and write" |
| `GITHUB_REPO` | Opcional. Padrão `leonfpontes/insta_report` |

Segredos do GitHub (Settings → Secrets and variables → Actions):

| Segredo | Para quê |
| --- | --- |
| `IG_TOKEN_PONTES_BRAIN`, `IG_TOKEN_GIRAHUB`, `IG_TOKEN_LEOPONTESRP` | Token da API do Instagram de cada conta |
| `RESEND_API_KEY`, `ALERTA_EMAIL` | E-mail de alerta |
| `GH_SECRETS_TOKEN` | Opcional. Deixa a renovação gravar o token novo sozinha |

## Fluxo de trabalho no Git

- Tudo entra na `main` por PR. Os robôs fazem commits `[instagram]` direto na `main` a cada 10
  minutos e de hora em hora.
- Antes de cada push numa branch de trabalho, traga a `main` com **merge** (não rebase, não
  force-push).
- Conflito em `instagram/agenda.json` ou `metricas.json`: mantenha o que veio da `main` (é o
  robô gravando status e números) e reaplique só as suas linhas.
- Não edite `instagram/metricas.json` à mão.

## Convenções de código

- Português nos nomes, comentários, mensagens e textos de interface.
- Scripts em ESM puro (`.mjs`), sem dependências: só `fetch` e módulos do Node.
- Interface: componentes shadcn/ui em `src/components/ui`, cores só pelos tokens de
  `src/index.css`.
- Mensagens de erro dizem o que aconteceu e o que fazer, em frase completa.
