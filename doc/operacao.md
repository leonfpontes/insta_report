# Operação

O que fazer no dia a dia e quando algo dá errado.

## Rotina

| Quando | O quê | Onde |
| --- | --- | --- |
| Antes de cada lote | Conferir a fila e o calendário dos próximos dias | Painel → Fila e Calendário |
| Na hora de um story manual | Baixar a arte, postar no app com sticker ou música, tocar **Já postei** | Painel → detalhe do story |
| Depois de um post | Ver a seta de desempenho e o link | Painel → Publicados |
| Quando chega e-mail de alerta | Seguir o "O que fazer" do e-mail | E-mail → Abrir no painel |
| Uma vez por semana | Ver se as rodadas estão verdes | Painel → Execuções |

## Diagnóstico rápido

| Sintoma | Causa provável | O que fazer |
| --- | --- | --- |
| Post ficou `agendado` depois da hora | O GitHub atrasou o agendamento | Esperar até 20 min. Se não sair, **Publicar agora** |
| Post virou `falhou` com "passou mais de 6 h" | O Actions ficou parado ou a conta estava pausada | Mudar o `quando` e voltar o `status` para `agendado`, ou **Publicar agora** |
| "Media download has failed" | A mídia não estava na `main` na hora, é PNG ou a URL tem caractere estranho | Confirmar o arquivo na `main` em JPEG/MP4 e **Publicar agora** |
| "aspect ratio" | Proporção fora do aceito | Refazer a mídia (feed 4:5 a 1,91:1; reel e story 9:16) |
| Luz vermelha na conta | Token vencido ou revogado | [contas-e-tokens.md](contas-e-tokens.md#token-recusado) |
| Luz vermelha com "api" | Instabilidade da API | Esperar a próxima coleta ou **Checar agora** |
| Painel não mostra o que acabou de ser gravado | Cache do raw do GitHub | Esperar até 5 min e recarregar |
| Painel pede senha toda hora | O cookie é de 30 dias; trocar `PAINEL_SENHA` derruba as sessões | Entrar de novo |
| Painel mostra "Não consegui ler a agenda no GitHub agora" | `GITHUB_TOKEN` da Vercel vencido ou sem permissão | Gerar token fino novo (Contents + Actions, leitura e escrita) e trocar na Vercel |
| Workflow de Publicar vermelho sem post falho | Falta segredo de uma conta, ou o push da agenda perdeu a corrida 3 vezes | Abrir o log da rodada na aba Execuções |
| Post saiu duas vezes | Não deveria: o publicador procura a legenda nos últimos 15 posts antes de postar | Apagar um no app e abrir issue com o log |

## Comandos úteis

```bash
# O que está na fila nas próximas 24 h
node -e '
const a=require("./instagram/agenda.json"); const ag=Date.now();
for (const p of a.posts.filter(p=>["agendado","manual"].includes(p.status)).sort((x,y)=>x.quando.localeCompare(y.quando)))
  if (new Date(p.quando)-ag < 864e5) console.log(p.quando, p.conta.padEnd(13), p.formato.padEnd(10), p.status.padEnd(8), p.titulo??p.id)'

# Tudo o que falhou, com o erro
node -e 'for (const p of require("./instagram/agenda.json").posts.filter(p=>p.status==="falhou")) console.log(p.id, p.conta, p.quando, "\n  ", p.erro)'

# Simular a rodada de uma hora qualquer, sem publicar
AGORA=2026-11-04T19:05:00-03:00 SIMULAR=1 node scripts/publicar.mjs
```

## Pausar uma conta

Troque `"publicador": "proprio"` por `"pausado"` na conta em `instagram/agenda.json` e faça o
merge. O publicador para de postar na próxima rodada; o painel continua mostrando a fila e as
métricas continuam sendo coletadas. Ao voltar para `proprio`, os posts cuja hora passou há mais
de 6 h viram `falhou` em vez de sair fora de hora.

## Desfazer

- **Mudança na agenda:** `git revert <commit>` na `main`, ou edite o JSON e faça o merge.
- **Post publicado por engano:** apague no app do Instagram. A agenda continua dizendo
  `publicado`; ajuste o status à mão se quiser republicar.
- **Commits dos robôs:** nunca reescreva o histórico da `main`. Os robôs fazem `pull --rebase`
  antes de cada push e se perdem com force-push.
