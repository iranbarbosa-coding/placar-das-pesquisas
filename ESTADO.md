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
  `workflow_dispatch` funciona). **PAUSADO desde 04/10 19:30Z** (ver decisão de 04/10). Falha abre issue `cron-falha`.
- **Último dado comitado quando este arquivo nasceu**: 2026-10-03T14:17Z. Na manhã do pleito (04/10, 11:37Z): 5.274 pesquisas, zero quarentenas, as sete pesquisas nacionais da véspera (Datafolha, Quaest, AtlasIntel, Palver, Gerp, Futura, Veritá) no banco.
- **Disputas em quarentena** (congeladas no dado do commit anterior por perda
  sem prova; o site mostra "Dado em revisão"): **nenhuma** desde o merge do PR #125
  (03/10, rodada 15:19Z, commit 4f24e2e). Eram 11 quando este arquivo nasceu; #124 tirou presidente:BR e
  governador:PE, #125 ratificou as nove restantes (ou destravou a curada do RJ).
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
| 03/10 | Ratificadas 10 perdas com a fonte lida no dia (RJ governador ×2, AP governador e senado, MS, SE ×2, AC, MT, presidente:SC): linhas retiradas, movidas de confronto ou re-rotuladas na Wikipédia e um registro republicado pelo Poder360. Evidência em `data/repairs.json` (`allow_question_drop`). | Iran (PR #125) |
| 03/10 | Um registro da fonte SEM data não bloqueia um `add_poll` curado datado (o vizinho é dito em voz alta). Motivo: `presidente:RJ` congelou porque um Quaest sem data recusou a curada de 25/07. | Iran (PR #125) |
| 03/10 | O juiz de delta prova "a data chegou": levantamento sem data que a Wikipédia datou, mesma casa, mesma amostra, tabela idêntica (caso 12d). Motivo: `presidente:BR` entrou em quarentena na véspera do pleito pelos cinco 2º turnos do Datafolha. | Iran (PR #124) |
| 04/10 | Wikipédia: uma seção de nível 2 sem cabeçalho de ano NÃO herda o ano da seção vizinha; resolve por âncora de citação (inclusive `data=DD/MM/AAAA`) e ordem cronológica inversa dentro da faixa da página, e todo cabeçalho sem ano e sem mês (confronto de 2º turno, `{{hidden begin}}`) recomeça a cronologia. Motivo: as 32 pesquisas do Senado da Bahia estavam gravadas em 2024 (média parada em 18/08) e os 2º turnos de BA, MT, PB, RN, RS e SC estavam em 2025. Cinco duplicatas mal datadas (RS ×2, BA ×3) ratificadas com a prova do registro Poder360 da mesma operação de campo. | Iran (PR #126) |
| 04/10 | `mergePolls`: quando os fins de campo diferem, a MESMA fonte são duas pesquisas (tracking Palver 01/10 × 03/10) e fontes diferentes com AMOSTRAS diferentes são duas pesquisas (Datafolha 01/10 n=2.506 × 03/10 n=2.002); mesma amostra entre fontes, ou um lado sem amostra, segue fundindo. Motivo: a Datafolha da véspera era engolida pela de 01/10 e nunca chegava ao banco; a RTBD/SP de 28/09 era engolida pela de 26/09. Medido: pares da mesma casa a ≤3 dias 2 → 19, nenhum duplicata PT×EN. | Iran (PR #127) |
| 04/10 | **Cron PAUSADO** (workflow `update-polls.yml` desativado no GitHub às 19:30Z, `disabled_manually`) até a comparação com os resultados do 1º turno. Dado congelado em `snapshots/2026-10-04-primeiro-turno/` (commit de main `16353bf`, última rodada 19:25Z, 5.275 pesquisas, zero quarentenas). Para religar: Actions → Atualizar pesquisas → Enable workflow. | Iran |
| 04/10 | Pesquisa nacional da véspera que as fontes não serviam (AtlasIntel/Bloomberg 27/09–02/10) entra como curada com fonte secundária reconciliada (Jovem Pan + Metrópoles + Bloomberg Línea + CNN + Fórum), pela decisão de 18/08. Quando a Wikipédia passou a servi-la (manhã de 04/10), a inserção foi dispensada pelo mecanismo. | Iran (PR #127) |
| 04/10 | **Ranking de acerto dos institutos** na home ("Quem chegou mais perto das urnas", `src/lib/acerto.ts`): última pesquisa de cada instituto por disputa (campo ≤10 dias antes do pleito) contra o resultado oficial do TSE em `data/resultados-oficiais.json`, lido pela Divulgação de Resultados (`scripts/tse-resultados.mjs`; arquivos `-u.json`, eleições 6257/6259). Mesma base dos dois lados (válidos; Senado em pesquisas de dois votos, cada nome como parte das menções a candidatos, a conta do pvap do TSE), só nomes presentes nos dois lados com ≥2% ou top-4, ordenado pelo erro na margem entre os dois primeiros (critério padrão de avaliação de institutos; decisão de 05/10, o erro médio punha em 7º quem acertou a margem em 0,7 p.p.), com o erro médio absoluto por candidato como desempate. Três placares, um por cargo (presidente, governadores, senadores): no federal todo instituto na janela entra; nos estaduais posição só com ≥3 disputas de governador ou ≥2 de senador (o filtro de dois votos encolhe o conjunto). O arquivo do TSE não traz % de seções apuradas; o bloco marca "apuração parcial" pelo cabeçalho (`tf`/`and`) até a totalização final — reimportar quando o TSE fechar. | Iran |
| 08/10 | **Home no modo 2º turno** (`src/lib/eleicao.ts`): com o resultado oficial carregado, quem vai ao 2º turno vem das URNAS (os dois primeiros onde o 1º ficou abaixo de 50% dos válidos: presidente e governador em AC, AM, DF, ES, RJ, RN, TO); a home abre com o confronto presidencial (resultado do 1º turno + média das pesquisas de 2º turno) e os sete governos. A média de 2º turno é a SÉRIE CONTÍNUA das simulações do par das urnas, antes e depois do 1º turno, sob a regra de sempre (10 mais recentes, 2 por instituto); decisão de Iran: é a mesma pergunta, não há por que perdê-la. O site informa quantas pesquisas da média têm campo após 04/10. As disputas encerradas (≥50% ou Senado) ganham faixa de arquivamento em `/presidente` e `/estados/[uf]` com o resultado oficial. Fase 2 (mesmo dia): mapa e Destaques da barra lateral pintam o que as urnas decidiram; "O que mudou" segue a média dos confrontos; simulações em `/presidente`, `/estados/[uf]` e `/segundo-turno` mostram só o par real (governo decidido vira nota). Sem resultado carregado, a home volta ao 1º turno. Ordem do ranking de acerto: erro na margem, erro médio desempata (05/10). | Iran |
| 08/10 | **Topo da home no 2º turno é o GRÁFICO DE ÁREA** da evolução Lula × Flávio (média móvel do site desde 01/07/2026), com gráficos reduzidos dos estados em disputa abaixo (`EvolucaoConfronto`). **RJ fora do 2º turno**: decisão curada em `data/decisoes-eleitorais.json` (`votos_anulados` de Garotinho; Ruas 49,27% → 50,88% dos válidos recalculados, eleito no 1º turno), com fontes (TSE 02/10, desistência 05/10, parecer do MPE 06/10); a homologação formal do TSE não foi localizada em 08/10 — registrada por decisão de Iran. O mecanismo serve a qualquer decisão judicial futura. | Iran |

## Em aberto

- AtlasIntel/RJ 14045 (Cyro Garcia republicado) ainda não ratificada; governador:RJ
  hoje só perdeu as duas linhas Quaest ratificadas em #125.
- Nome sem link em várias linhas no cabeçalho da Wikipédia ainda sai cortado no
  primeiro `<br>` ("Geraldo", "Carlos" em governador/SP).
- Alerta de "rodada agendada ausente" (o workflow só avisa quando roda e falha).
- Fundir ou não os institutos IFP / Instituto França / França.

## Encerrado

- 29/09: site "parado 13 dias" — era `presidente:BR` em quarentena, não a Vercel. Resolvido com #119/#120.
- 03/10: três rodadas vermelhas por datas invertidas no levantamento Vox (#122, issue #121).
