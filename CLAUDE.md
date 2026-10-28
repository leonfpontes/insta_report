# CLAUDE.md

Guia para agentes de IA (Claude Code e similares) que trabalham neste repositório. Leia inteiro
antes de mexer em qualquer arquivo.

## O que é

O insta_report agenda e publica posts no Instagram, coleta os números e mostra tudo num painel.
Ele publica três contas: `pontes_brain` (@pontes_brain), `GiraHub` (@girahuboficial) e
`leopontesrp` (@leopontesrp). O dono é o Leonardo.

- **Fonte da verdade:** `instagram/agenda.json`, na branch `main`.
- **Publicador:** o workflow Publicar roda a cada 10 min e posta o que chegou na hora.
- **Métricas:** o workflow Métricas roda de hora em hora e grava `instagram/metricas.json`.
- **Painel:** https://instagram.leopontes.com.br, com senha. A senha não é sua: nunca peça nem use.

Na maior parte das tarefas, **o seu trabalho é editar a agenda e as mídias, por PR.**

## Regras que não se quebram

1. **Escopo de conta.** Mexa só na conta que a tarefa pediu. Nunca crie, edite, mova ou apague
   posts ou mídias de outra conta, nem a entrada dela em `contas`. Itens da `GiraHub` só com o ok
   explícito do Leonardo.
2. **Tokens.** Nunca peça, leia, cole, grave ou imprima tokens e chaves. Eles ficam nos segredos
   do GitHub e só os workflows leem.
3. **Código.** Não altere `scripts/`, `.github/workflows/`, `api/`, `lib/` ou `src/` sem a tarefa
   pedir. Quem agenda mexe em `instagram/agenda.json` e `instagram/midia/`.
4. **Arquivos dos robôs.** Nunca edite `instagram/metricas.json` nem `instagram/perfil/`. Nunca
   escreva `publicado` ou `falhou` em `status`, nem os campos `link`, `midiaId`, `publicadoEm`,
   `erro` e `tentativas`.
5. **Irreversível pede ok.** Apagar um post publicado, substituir algo que o Leonardo aprovou ou
   publicar fora do horário combinado exige o ok dele antes.
6. **Git.** Nada de force-push nem rebase na `main`. Os robôs commitam nela a cada 10 minutos.

## Regras de cada conta

| Conta | Regras |
| --- | --- |
| `pontes_brain` | Toda legenda de feed e reel termina com CTA para **leopontes.com.br/mentoria-produto**. Os stories são postados à mão pelo Leonardo: use `status: "manual"`, com a arte em `midia`, o texto em `legenda` e as instruções do sticker em `nota`. Vídeo de story vai sem som |
| `GiraHub` | Não mexa sem o ok do Leonardo |
| `leopontesrp` | Conta pessoal de Criador. Posts anteriores a ela virar profissional não têm insights |

## Como agendar

1. Crie uma branch a partir da `main` atualizada.
2. Grave as mídias em `instagram/midia/<pasta-da-conta>/`: imagem em **JPEG**, vídeo em **MP4**
   (H.264). PNG não publica.
3. Acrescente os posts **no fim** de `posts` em `instagram/agenda.json`:

   ```json
   {
     "id": "lp-1104-1900",
     "conta": "leopontesrp",
     "quando": "2026-11-04T19:00:00-03:00",
     "formato": "carrossel",
     "status": "agendado",
     "titulo": "Resumo curto para o painel",
     "legenda": "Texto completo, com quebras de linha e #hashtags",
     "midia": ["midia/leopontesrp/lp-1104-1900-01.jpg", "midia/leopontesrp/lp-1104-1900-02.jpg"]
   }
   ```

4. Confira:

   ```bash
   node -e "JSON.parse(require('fs').readFileSync('instagram/agenda.json'))"
   npm run check
   ```

   E rode a checagem de ids, contas, mídias e fuso de [doc/agenda.md](doc/agenda.md#conferir-antes-do-pr).
5. Abra o PR e mostre ao Leonardo a lista do que vai sair: data, hora, conta, formato e título.
6. Depois do ok, traga a `main` com merge (os robôs podem ter mexido na agenda), resolva conflito
   mantendo as linhas dos outros, e faça o merge do PR. **A mídia precisa estar na `main` antes
   da hora do post.**
7. Depois do horário, confira na `main` se o `status` virou `publicado` e mande o `link`. Se virou
   `falhou`, leia o `erro` e explique o que fazer (veja [doc/operacao.md](doc/operacao.md)).

## Campos de um post

| Campo | Valores |
| --- | --- |
| `id` | Único na agenda. Prefixo da conta + mês + dia + hora: `pb-`, `gh-`, `lp-`. Sufixo se repetir |
| `conta` | `pontes_brain`, `GiraHub` ou `leopontesrp` |
| `quando` | Brasília, sempre com `-03:00` |
| `formato` | `post` (1 imagem) · `carrossel` (2 a 10 itens, imagem ou vídeo) · `reel` (1 MP4, `capa` opcional) · `story` (1 imagem) · `story-video` (1 MP4) |
| `status` | `agendado` (o publicador posta) ou `manual` (alguém posta à mão no app; o publicador ignora) |
| `titulo` | Uma linha para o painel e para o e-mail de alerta |
| `legenda` | O texto do post |
| `midia` | Caminhos relativos a `instagram/`, na ordem |
| `nota` | Instruções para quem posta à mão. Ex.: "Sticker de enquete: Sim · Não" |

Use `manual` para story com sticker, enquete, link ou música, que a API não aceita.

## Mídia

| Formato | Proporção | Tamanho |
| --- | --- | --- |
| Feed (post, carrossel) | 4:5 (melhor) até 1,91:1 | 1080×1350 |
| Reel, story | 9:16 | 1080×1920 |

## Testar sem publicar

- Actions → **Publicar** → Run workflow com o `id` do post e **simular** marcado: mostra o que
  faria e as URLs da mídia, sem publicar.
- **verificar** marcado: confere o token de cada conta e a cota do dia (100 por conta).
- Local: `AGORA=2026-11-04T19:05:00-03:00 SIMULAR=1 node scripts/publicar.mjs`.

## O publicador em uma tabela

| Situação | O que acontece |
| --- | --- |
| Chegou a hora | Sai na primeira rodada depois de `quando` (até 10 min, às vezes mais em horário de pico) |
| Erro da API | Tenta de novo na rodada seguinte, até 3 vezes |
| 3ª falha | `falhou` e e-mail de alerta para o Leonardo |
| Passou de 6 h sem sair | `falhou` sem tentar, para não soltar post fora de hora |
| Legenda já está no perfil | Não posta de novo; só grava o link |
| Conta `pausado` | Ignorada |

## Mexer no código

Se a tarefa for no código:

- Leia [doc/arquitetura.md](doc/arquitetura.md) e o doc da peça: [publicador](doc/publicador.md),
  [métricas](doc/metricas.md), [painel](doc/painel.md), [alertas](doc/alertas.md).
- Rode o painel local: `npm ci && npm run build && npm run local` (senha `senha-local-123`). Veja
  [doc/desenvolvimento.md](doc/desenvolvimento.md).
- `npm run check` e `npm run build` precisam passar antes do PR.
- Interface em React + shadcn/ui, paleta Papel & Marinho pelos tokens de `src/index.css`, Roboto,
  monograma LP. Textos em português, em frase completa.
- Scripts sem dependências externas (só Node e `fetch`).

## Onde procurar

| Preciso de | Arquivo |
| --- | --- |
| Formato completo da agenda e dos status | [doc/agenda.md](doc/agenda.md) |
| Por que um post falhou | `erro` do post, aba Execuções do painel, [doc/operacao.md](doc/operacao.md) |
| Ligar uma conta nova ou trocar token | [doc/contas-e-tokens.md](doc/contas-e-tokens.md) |
| Números de um post | `instagram/metricas.json` → `contas.<conta>.posts[]` |
