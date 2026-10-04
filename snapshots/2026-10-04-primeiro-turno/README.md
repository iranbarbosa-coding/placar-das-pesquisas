# Snapshot — véspera/dia do 1º turno (04/10/2026)

Dado do Placar das Pesquisas congelado para a comparação com os resultados das
urnas do 1º turno (04/10/2026) e, depois, do 2º turno (25/10/2026).

## Procedência

- **Commit de `main`**: `16353bfdd1cb793e5ec7ccf1c09ace449205bae6`
  ("dados: atualização automática 2026-10-04 19:25 UTC"), última rodada do
  cron antes da pausa. `generated_at` do banco: `2026-10-04T19:05:26Z`.
- **Cron pausado** em seguida (workflow `update-polls.yml` desativado no
  GitHub às 19:30Z de 04/10, estado `disabled_manually`). Nenhuma pesquisa
  entra ou sai do banco até ser religado (Actions → Atualizar pesquisas →
  Enable workflow).
- **Tamanho**: 5.275 pesquisas (`polls.json`), 55 disputas de 1º turno
  (presidente + 27 governadores + 27 Senados), zero disputas em quarentena.
- O store completo daquele instante (`surveys`, `questions`, `candidates`,
  `people`, `institutes`…) está em `data/` no commit acima; aqui ficam só os
  arquivos de leitura.

## Conteúdo

| Arquivo | O que é |
|---|---|
| `data/polls.json` | A projeção completa das 5.275 pesquisas (uma linha por cenário), tal como o site a lê. |
| `data/conflicts.ndjson` | Os conflitos e rastros do juiz de delta daquela rodada (nenhuma quarentena). |
| `data/repairs.json` | Os reparos curados vigentes (ratificações e inserções), para saber o que foi decidido à mão. |
| `averages.json` | O feed `/api/averages.json` tal como o site publicou: toda média (1º e 2º turno) de toda disputa. |
| `presidente.json` | O feed `/api/presidente.json` (média presidencial em válidos e as pesquisas que a compõem). |
| `segundo-turno.json` | O feed `/api/segundo-turno.json` (confrontos de 2º turno). |
| `medias-finais.csv` | Uma linha por candidato por média: `race, uf, round, scenario, basis, poll_count, last_poll_date, candidate, party, avg, latest, n_polls, resultado_tse`. A coluna `resultado_tse` está vazia, para receber o percentual oficial. |

## Método da média (como estava em 04/10)

- Janela das 10 pesquisas mais recentes por disputa, no máximo 2 por instituto
  (`LATEST_N = 10`, `MAX_PER_POLLSTER = 2`, `src/lib/average.ts`).
- Presidencial em votos válidos; governador em válidos (com o corte bruto
  disponível no feed); Senado só com pesquisas de dois votos (soma ~200), pela
  decisão de 16/08/2026.
- Pesquisas da véspera que as fontes ainda não serviam às 19:05Z e ficaram
  FORA deste snapshot (confirmadas publicamente): Quaest Senado 02–03/10 em BA,
  GO e PR (e provavelmente AL, CE, MG); Quaest governador AP 03/10; Datafolha
  CE 02–03/10 (governador e Senado); Datafolha Senado RJ e PE 03/10.

## Como comparar

1. Preencher `resultado_tse` em `medias-finais.csv` com o percentual oficial
   (válidos para presidente e governador; para o Senado, o percentual de votos
   válidos de cada candidato na soma dos dois votos, que é a grandeza das
   pesquisas de dois votos).
2. Erro por candidato = `avg − resultado_tse`; erro de margem = diferença
   entre os dois primeiros na média menos a diferença nas urnas.
3. O viés por instituto sai de `polls.json` (`pollster`, `results[].pct`,
   `blank_null_pct`, `undecided_pct`) contra o mesmo resultado oficial.
