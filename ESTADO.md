# ESTADO — o que vale agora no Placar das Pesquisas

Este arquivo é o **estado vivo** do projeto: as decisões em vigor e o contexto
mínimo para agir sem reler o histórico. Não é diário (isso é o `HANDOFF.md`,
técnico e cronológico) nem manual (isso é o `CONVENTIONS.md`).

**Disciplina.** Toda sessão lê este arquivo antes de agir e, ao terminar,
(1) acrescenta em *Decisões vigentes* o que decidiu, com data e quem decidiu;
(2) atualiza *Contexto* se algo aqui deixou de ser verdade; (3) move para
*Encerrado* o que fechou. Uma decisão só vale se estiver aqui. Nenhuma predição
é publicada sem uma linha em `data/predicoes.ndjson` (ver `PREDICOES.md`).

## Contexto

- **Site**: https://www.placardaspesquisas.com.br — Next.js estático na Vercel,
  rebuild a cada commit de dados. Feeds públicos: `/api/averages.json` (todas as
  médias), `/api/polls.json` (catálogo), `/api/presidente.json`,
  `/api/segundo-turno.json`. Licença CC BY 4.0.
- **Método da média**: as 10 pesquisas mais recentes da disputa, no máximo 2 por
  instituto (`src/lib/average.ts`); presidencial exibida em votos válidos.
  Senado 2026: **duas vagas** por estado (cada eleitor vota duas vezes).
- **Calendário**: 1º turno **domingo 04/10/2026**; 2º turno **25/10/2026**.
- **Coleta**: cron `update-polls.yml` às 11:15, 15:15, 19:15 e 23:15 UTC
  (o agendador do GitHub pula rodadas sem avisar; disparo manual via
  `workflow_dispatch` funciona). Falha abre issue `cron-falha`.
- **Último dado comitado quando este arquivo nasceu**: 2026-10-03T14:17Z.
- **Disputas em quarentena** (congeladas no dado do commit anterior por perda
  sem prova; o site mostra "Dado em revisão"): governador:AP, governador:MS, governador:PE, governador:RJ, governador:SE, presidente:BR, presidente:RJ, presidente:SC, senador:AC, senador:AP, senador:MT.
  A lista viva é `data/conflicts.ndjson` (type `disputa_em_quarentena`).
- **Publicidade**: nenhuma até 03/10/2026. Lançamento: blitz de vídeos no TikTok
  (perfil @ novo, zero seguidores; ver decisão de 03/10).

## Decisões vigentes

| Data | Decisão | Quem |
|---|---|---|
| 29/09 | Merge em produção só com "merge it" explícito do criador; nunca durante uma rodada do cron. | Iran |
| 29/09 | Uma tabela que a fonte truncou volta do commit anterior pelo id nativo (subconjunto estrito ancorado por pct); o que ninguém completa sai em voz alta. | Iran (PR #120) |
| 29/09 | O juiz de delta prova a mesma casa re-datada com tabela cheia idêntica e mesma amostra; grafia vazada de wikitexto casa pelo alvo do link. | Iran (PR #120) |
| 03/10 | As datas do levantamento fecham entre registros; o fim é o que as médias usam, o início cede. | Iran (PR #122) |
| 03/10 | **Blitz de lançamento**: um vídeo por disputa (presidencial + 27 estados, governo e senado no mesmo vídeo do estado) com a leitura da média para o domingo 04/10. **Canal: exclusivamente TikTok**, perfil novo e sem seguidores (distribuição pelo For You, série reconhecível, 8–10 vídeos/dia, prestação de contas no domingo à noite). Roteiros gerados com `docs/prompts/roteiros-blitz.md`. | Iran |
| 03/10 | **Toda predição publicada é registrada antes** em `data/predicoes.ndjson` (uma linha por afirmação, com a média que a sustenta e o `generated_at`), e avaliada contra a apuração depois do pleito. Validador: `node scripts/predicoes-check.mjs`. | Iran |
| 03/10 | Este arquivo (`ESTADO.md`) é o estado do projeto; toda sessão o lê antes e o atualiza ao fim. | Iran |
| 03/10 | O juiz de delta prova "a data chegou": levantamento sem data que a Wikipédia datou, mesma casa, mesma amostra, tabela idêntica (caso 12d). Motivo: `presidente:BR` entrou em quarentena na véspera do pleito pelos cinco 2º turnos do Datafolha. | Iran (PR #124) |

## Em aberto

- Quarentenas editoriais que pedem fonte primária: SE (França → IFP, três
  institutos para a mesma casa), MT senado (Paraná com amostra trocada), AC
  senado (IPSensus retirada), MS governador (Quaest movida de confronto),
  presidente:SC (Quaest republicada), RJ governador (AtlasIntel republicada).
- Nome sem link em várias linhas no cabeçalho da Wikipédia ainda sai cortado no
  primeiro `<br>` ("Geraldo", "Carlos" em governador/SP).
- Alerta de "rodada agendada ausente" (o workflow só avisa quando roda e falha).
- Fundir ou não os institutos IFP / Instituto França / França.

## Encerrado

- 29/09: site "parado 13 dias" — era `presidente:BR` em quarentena, não a Vercel. Resolvido com #119/#120.
- 03/10: três rodadas vermelhas por datas invertidas no levantamento Vox (#122, issue #121).
