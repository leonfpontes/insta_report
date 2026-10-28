# Contas e tokens

## Contas ligadas hoje

| Chave em `agenda.json` | Perfil | Tipo | Segredo |
| --- | --- | --- | --- |
| `pontes_brain` | [@pontes_brain](https://www.instagram.com/pontes_brain/) | Profissional | `IG_TOKEN_PONTES_BRAIN` |
| `GiraHub` | [@girahuboficial](https://www.instagram.com/girahuboficial/) | Profissional | `IG_TOKEN_GIRAHUB` |
| `leopontesrp` | [@leopontesrp](https://www.instagram.com/leopontesrp/) | Criador | `IG_TOKEN_LEOPONTESRP` |

## Ligar uma conta nova

1. **Conta profissional.** No app do Instagram: Configurações → Tipo de conta → mude para
   Criador ou Empresa.
2. **Testador do app.** Em developers.facebook.com, no app do tipo Empresa, produto
   **Instagram → API com login do Instagram**, adicione a conta em Funções do app → Testadores do
   Instagram. No Instagram, aceite em Configurações → Apps e sites → Convites de testador.
3. **Token.** Em "Gerar tokens de acesso", gere o token da conta com as permissões
   `instagram_business_basic`, `instagram_business_content_publish` e
   `instagram_business_manage_insights`. O token vale 60 dias.
4. **Segredo.** No GitHub, em Settings → Secrets and variables → Actions, crie
   `IG_TOKEN_<CHAVE>` com o token. A chave em maiúsculas, com `_` no lugar de tudo que não for
   letra ou número.
5. **Workflows.** Acrescente a linha `IG_TOKEN_<CHAVE>: ${{ secrets.IG_TOKEN_<CHAVE> }}` no `env`
   dos três workflows. Em `metricas.yml`, inclua a variável também na checagem
   `if [ -z "$IG_TOKEN_…" ]`.
6. **Agenda.** Acrescente a conta em `contas` de `instagram/agenda.json`, primeiro com
   `"publicador": "pausado"`.
7. **Alerta e painel.** Acrescente o `@` da conta em `CONTAS` de `scripts/alerta.mjs` e, se
   quiser cor e rótulo próprios, em `CONTAS` de `src/lib/model.ts`.
8. **Testar.** Actions → Publicar → Run workflow com **verificar** marcado. O log deve dizer
   `<chave>: token OK, conta @… (BUSINESS ou MEDIA_CREATOR), cota de hoje 0/100`.
9. **Ligar.** Troque para `"publicador": "proprio"`. A próxima coleta de métricas acende a luz
   verde no painel.

## Renovação

O workflow **Renovar token** roda toda segunda às 09:00 de Brasília e chama
`refresh_access_token` para cada conta `proprio`:

- Se a Meta devolve o mesmo token, a validade volta para 60 dias e pronto.
- Se devolve um token novo, o script grava no segredo com `gh secret set`. Isso só funciona com
  o segredo opcional `GH_SECRETS_TOKEN` (token fino deste repositório com "Secrets: Read and
  write"). Sem ele, chega um e-mail pedindo a troca à mão.
- Se a Meta recusa (token vencido ou revogado), chega o e-mail "token precisa de atenção".

A Meta só renova tokens com mais de 24 horas de vida. Um token recém-gerado é renovado na
segunda seguinte.

## Token recusado

A luz da conta fica vermelha no painel (`conexao.tipo: "token"`) e os posts dela falham com
"O Instagram recusou o token da conta". Para resolver:

1. Gere um token novo (passo 3 acima).
2. Troque o valor do segredo `IG_TOKEN_<CHAVE>`.
3. Rode Publicar com **verificar** e depois **Checar agora** no painel.
4. Republique pelo painel os posts que ficaram como Falhou.

## Regras

- Tokens nunca entram em arquivo do repositório, issue, PR, chat ou log.
- Só os workflows leem os segredos. O painel não tem acesso a eles.
- A cota da API é de 100 publicações por conta a cada 24 horas. `verificar` mostra o uso do dia.
