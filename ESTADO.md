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
- **Previsão Estatística** (`/previsao`, no ar desde o merge do PR #141 em 19/10): camada SEPARADA da média
  (`forecast/`, `data/forecast/`; a média publicada não mudou). Passo próprio no `update-polls.yml`, depois de
  todos os guardas; nunca bloqueia o commit das pesquisas e, se a conferência dos snapshots falha, reverte só
  `data/forecast`. Cobre os 7 confrontos de 2º turno (presidente; governador AC, AM, DF, ES, RN, TO). Publicou
  todos os dias de 19 a 23/10 (`data/forecast/runs.ndjson`). Método e números: `FORECASTING_METHODOLOGY.md` e
  `FORECASTING_VALIDATION.md`. Depois de 25/10 a rodada não gera mais previsão (data de referência > pleito).
- **Apuração do 2º turno** (**`/apuracao`** desde 24/10, decisão do criador; estreou em `/apuracao/segundo-turno`
  com o PR #142, endereço que agora redireciona para `/apuracao`; link no menu Presidente; a apuração do 1º turno
  foi para `/apuracao/primeiro-turno`, com links da home e do topo do 2º turno): lê ao vivo a eleição **6258** do TSE (arquivo
  nacional, andamento e os 27 arquivos de UF) pela rota `/api/apuracao-2t.json` (CDN 20s; a página relê a cada
  30s). Fotos oficiais em `public/candidatos/<sq>.jpg` (Portal de Dados Abertos, conjunto `candidatos-2026`,
  via `scripts/fotos-candidatos.mjs`). Teste ponta a ponta com "TSE" local: `scripts/apuracao2t-e2e.mjs`.
  Desde o merge do PR #143 (24/10), o card do placar traz a **chance de vitória ao vivo** em medidor
  (`src/lib/chance-vitoria.ts`; dados em `data/apuracao/`), além de 27 arquivos de andamento por município
  (`<uf>-e006258-ab.json`, + `zz`) lidos a cada ciclo — ~56 leituras ao TSE por ciclo de 20s da CDN.

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
| 04/10 | **Cron PAUSADO** de 04/10 19:30Z a 08/10 ~15:50Z (workflow `update-polls.yml` desativado no GitHub, `disabled_manually`) até a comparação com os resultados do 1º turno; **religado em 08/10** por Iran, com uma rodada manual de recuperação em seguida. Dado congelado em `snapshots/2026-10-04-primeiro-turno/` (commit de main `16353bf`, última rodada 19:25Z, 5.275 pesquisas, zero quarentenas). Para religar: Actions → Atualizar pesquisas → Enable workflow. | Iran |
| 04/10 | Pesquisa nacional da véspera que as fontes não serviam (AtlasIntel/Bloomberg 27/09–02/10) entra como curada com fonte secundária reconciliada (Jovem Pan + Metrópoles + Bloomberg Línea + CNN + Fórum), pela decisão de 18/08. Quando a Wikipédia passou a servi-la (manhã de 04/10), a inserção foi dispensada pelo mecanismo. | Iran (PR #127) |
| 04/10 | **Ranking de acerto dos institutos** na home ("Quem chegou mais perto das urnas", `src/lib/acerto.ts`): última pesquisa de cada instituto por disputa (campo ≤10 dias antes do pleito) contra o resultado oficial do TSE em `data/resultados-oficiais.json`, lido pela Divulgação de Resultados (`scripts/tse-resultados.mjs`; arquivos `-u.json`, eleições 6257/6259). Mesma base dos dois lados (válidos; Senado em pesquisas de dois votos, cada nome como parte das menções a candidatos, a conta do pvap do TSE), só nomes presentes nos dois lados com ≥2% ou top-4, ordenado pelo erro na margem entre os dois primeiros (critério padrão de avaliação de institutos; decisão de 05/10, o erro médio punha em 7º quem acertou a margem em 0,7 p.p.), com o erro médio absoluto por candidato como desempate. Três placares, um por cargo (presidente, governadores, senadores): no federal todo instituto na janela entra; nos estaduais posição só com ≥3 disputas de governador ou ≥2 de senador (o filtro de dois votos encolhe o conjunto). O arquivo do TSE não traz % de seções apuradas; o bloco marca "apuração parcial" pelo cabeçalho (`tf`/`and`) até a totalização final — reimportar quando o TSE fechar. | Iran |
| 08/10 | **Home no modo 2º turno** (`src/lib/eleicao.ts`): com o resultado oficial carregado, quem vai ao 2º turno vem das URNAS (os dois primeiros onde o 1º ficou abaixo de 50% dos válidos: presidente e governador em AC, AM, DF, ES, RJ, RN, TO); a home abre com o confronto presidencial (resultado do 1º turno + média das pesquisas de 2º turno) e os sete governos. A média de 2º turno é a SÉRIE CONTÍNUA das simulações do par das urnas, antes e depois do 1º turno, sob a regra de sempre (10 mais recentes, 2 por instituto); decisão de Iran: é a mesma pergunta, não há por que perdê-la. O site informa quantas pesquisas da média têm campo após 04/10. As disputas encerradas (≥50% ou Senado) ganham faixa de arquivamento em `/presidente` e `/estados/[uf]` com o resultado oficial. Fase 2 (mesmo dia): mapa e Destaques da barra lateral pintam o que as urnas decidiram; "O que mudou" segue a média dos confrontos; simulações em `/presidente`, `/estados/[uf]` e `/segundo-turno` mostram só o par real (governo decidido vira nota). Sem resultado carregado, a home volta ao 1º turno. Ordem do ranking de acerto: erro na margem, erro médio desempata (05/10). | Iran |
| 08/10 | **Topo da home no 2º turno é o GRÁFICO DE ÁREA** da evolução Lula × Flávio (média móvel do site desde 01/07/2026), com gráficos reduzidos dos estados em disputa na COLUNA DA DIREITA, empilhados, no lugar do mapa, destaques, "o que mudou" e calendário (`EvolucaoConfronto`, decisão de Iran na mesma data). **RJ fora do 2º turno**: decisão curada em `data/decisoes-eleitorais.json` (`votos_anulados` de Garotinho; Ruas 49,27% → 50,88% dos válidos recalculados, eleito no 1º turno), com fontes (TSE 02/10, desistência 05/10, parecer do MPE 06/10); a homologação formal do TSE não foi localizada em 08/10 — registrada por decisão de Iran. O mecanismo serve a qualquer decisão judicial futura. | Iran |
| 08/10 | Gráfico do confronto presidencial na home é INTERATIVO: seletor Tudo / 2026 / 90 dias (muda só o trecho visto) e hover com a média em cada data, números grandes acompanhando (`EvolucaoConfronto`, client). Coluna da direita: mapa das corridas estaduais (azul escuro = em 2º turno, cinza = decidida; hover com vencedor ou líder e margem) e os gráficos compactos dos estados. **"Quem chegou mais perto" na home só com o placar presidencial**; governadores e senadores ficam em `/acerto` (Derivadas). | Iran |
| 08/10 | **Cron religado às 16:03Z; a primeira rodada pós-eleição trouxe três defeitos da Wikipédia, corrigidos em seguida**: (1) a linha "Results" (resultado oficial no topo da tabela) entrou como instituto e abriu o ranking de acerto com erro zero — o parser passa a pular linhas de resultado; (2) a Paraná Pesquisas/SP de "9 de outubro" (elenco de 2025) saiu datada 2026-10-09 — o parser recua um ano quando o campo cai depois do dia da votação (`_dia_do_pleito`: 1º domingo e último domingo de outubro); (3) a linha da última Gerp nacional foi editada para 01–03/10 com Lula 44 × Flávio 42 (a pesquisa real é 30/09–02/10, Flávio à frente; Poder360/Jovem Pan/Tribuna PR) — `drop_poll` da linha errada (1º e 2º turno) e `add_poll` da correta em `data/repairs.json`, com as perguntas ratificadas em `allow_question_drop`. Até a próxima rodada o site publica o ranking com "Results" em 1º e a Gerp em 8º. | Iran |
| 08/10 | **Toggle "vs resultado 1º turno" no efeito casa** (`houseEffectsVsResultado`): a ÚLTIMA pesquisa de cada instituto (campo ≤10 dias antes do pleito, a janela do ranking, que testou os dois primeiros das urnas) contra o percentual oficial do TSE em válidos, por candidato — a visão por candidato do ranking de acerto, não um viés sistemático (decisão de Iran na mesma data; a média dos 30 dias foi descartada). Sem elenco mínimo: a Veritá da véspera (só dois nomes, em válidos) entra, com "—" nas colunas não testadas. Ordem: menor desvio médio primeiro. Home (padrão: resultado no modo 2º turno) e `/institutos`. | Iran |
| 18/10 | **Previsão Estatística: chance de vitória em destaque, rotulada *experimental***. Cada quadro do 2º turno abre com quem tem maior chance e a probabilidade (inteiro; abaixo de 60% para o líder, "leve vantagem · disputa indefinida"). O portão de validação (≥ 2 eleições e ≥ 20 disputas por categoria) segue NÃO cumprido — só há 2026 e nenhum 2º turno com resultado —, então a probabilidade sai como `experimental`, com os motivos na página (`gates.probability.editorial_override` na config). | Iran |
| 18/10 | **Tendência da média não é projetada.** Testado a pedido: média das 10 últimas + tendência estendida até a eleição. No backtest do 1º turno (mesmos 205 pares), estender a tendência PIOROU a previsão em todas as variantes (erro médio 5,55 → 6,17–6,70 p.p.; modelo estatístico 5,09). A chance do destaque vem do modelo estatístico (`headline_method: "modelo"`); a média das 10 últimas e a tendência (p.p./semana) aparecem ao lado como informação. | Iran |
| 19/10 | Merge do PR #141 (Previsão Estatística) em `main`, com o check `testes` verde e fora de rodada do cron. | Iran |
| 24/10 | **Página da apuração do 2º turno.** Um card do placar com Lula × Flávio (fotos oficiais do TSE, % dos válidos, votos, barra bipolar, diferença) e, embaixo da barra, a apuração do Brasil: % apurado (seções totalizadas), votos apurados, **≈ a apurar** (estimativa: eleitorado das seções restantes × comparecimento já apurado em cada UF; o TSE não publica), comparecimento/abstenção, seções, brancos e nulos — o card "Votos apurados" separado saiu por redundante. **Mapa**: a UF parte do BRANCO e ganha a cor de quem lidera ali (azul Flávio, vermelho Lula) conforme o % apurado vai a 100 (piso de 15% de intensidade ao chegar a primeira seção, para o líder ser legível). Barras de % apurado por UF na cor do líder. Arquivo do TSE sem exatamente os candidatos 13 e 22 → página zerada com "aguardando o TSE", nunca número suspeito. Merge do PR #142 fora de rodada do cron. | Iran |
| 24/10 | **Chance de vitória AO VIVO na apuração do 2º turno, rotulada *experimental*** (pedido do criador: só vale se aparecer DURANTE a apuração; a "linha de chegada" testada antes foi descartada por ele). No card do placar, em MEDIDOR com ponteiro (opção B escolhida pelo criador entre quatro; selo "Experimental" tracejado, da opção A): chance de Lula e de Flávio terminarem à frente e o resultado final projetado (± 90%), em texto comum — forma diferente da barra dos votos para não confundir projeção com resultado. Projeção por município (`src/lib/chance-vitoria.ts`): voto do 1º turno em cada um dos 5.571 municípios + 186 do exterior (`data/apuracao/t1-municipios.json`, `scripts/tse-municipios-t1.mjs`, conferido voto a voto contra cada UF) + variação entre os turnos já observada na UF (nacional onde a UF não tem nada contado), aplicada aos votos que faltam (andamento por município, `<uf>-e006258-ab.json`). Incerteza MEDIDA: desvio = κ × fração que falta, com κ = 3,27 tirado da apuração do 1º turno de 2026 refeita na ordem real de totalização dos municípios contra o 2º turno de 2022 (`scripts/apuracao/backtest_chance.py` → `data/apuracao/calibracao-chance.json`, `chance-config.json`): é a MAIOR razão erro ÷ fração que falta do caminho nacional (RMS nacional 1,57; UFs 1,89) — escolha conservadora, uma só apuração para calibrar. Não sai antes da 1ª seção, na totalização final, se faltar arquivo de alguma UF ou se a cobertura do eleitorado < 99,5%. Sequência do globalelectionsimulator não usada (fonte não verificável daqui). | Iran |
| 24/10 | Merge do PR #143 (chance de vitória ao vivo, medidor) fora de rodada do cron. **Mockups de divulgação** gerados da página real com um TSE simulado (municípios reais do 1º turno, +1 p.p. para Flávio; 28,12% apurado → Flávio 52,54%, chance 80%), computador e celular, claro e escuro, página inteira e recortes; **toda imagem de simulação leva a faixa "SIMULAÇÃO · números ilustrativos, não são resultados do TSE"** — às vésperas do pleito uma captura sem aviso pode circular como apuração real. | Iran |
| 24/10 | **Governadores na apuração do 2º turno: um bloco por estado nesta página** (escolha do criador): AC, AM, DF, ES, RN, TO, com fotos oficiais, %, votos, barra, andamento e chance de vitória em medidor pequeno (*experimental*). Eleição **6260**, cargo 3 (`<uf>-c0003-e006260-u.json` + andamento por município `<uf>-e006260-ab.json`); finalistas e 1º turno de governador por município em `data/apuracao/t1-governador.json` (`scripts/tse-governador-t1.mjs`, conferido voto a voto contra cada UF). **DF sem chance**: é um só município para o TSE. κ dos governadores = 3,27, o mesmo do presidente (não menor que ele; nos caminhos POR UF do backtest o intervalo de 90% cobriu 97,5% dos pontos). Arquivo que não traga exatamente os dois finalistas esperados → bloco em "aguardando o TSE". Na mesma entrega, a conta da chance passou a pesar cada município pelos votos nos dois finalistas (não só pelo comparecimento) — no 1º turno de governador, com muitos candidatos, isso fazia diferença; o backtest de calibração usava a versão anterior, e κ segue o mesmo, conservador. | Iran |
| 24/10 | Merge do PR #144 (governadores na apuração do 2º turno) fora de rodada do cron. Mockups de divulgação refeitos a pedido do criador com **28% apurado e o Nordeste atrasado** (~10% lá, ~36% no resto): placar Flávio 57,3% × Lula 42,7%, mas medidor 80% e final projetado 52,0% — a chance olha QUAIS municípios faltam (o voto deles no 1º turno), não o placar parcial; com o mesmo 52% dos apurados e o Nordeste atrasado, a chance de Flávio seria 14%. | Iran |
| 24/10 | **Endereço único da apuração do 2º turno: `/apuracao`** (decisão do criador). `/apuracao/segundo-turno` redireciona (307, temporário) para `/apuracao` (`next.config.ts`), para não quebrar links já divulgados; o 1º turno passou para `/apuracao/primeiro-turno`. | Iran |
| 24/10 | **Faixa na home chamando para `/apuracao`** (pedido do criador), acima das duas colunas (`BannerApuracao`): antes das 17h de 25/10 anuncia "domingo, 25/10, a partir das 17h"; das 17h às 3h de 26/10, "ao vivo agora"; depois, "resultado do 2º turno" — a fase vem do relógio do leitor, porque a home é estática. Cor própria `--faixa-bg` (#1d4ed8, branco a 6,7:1 nos dois temas). | Iran |

## Em aberto

- **Anúncios na página** (pergunta do criador, 24/10): sem conta de AdSense, não há tempo para 25/10 (cadastro +
  revisão do site leva dias). Caminho rápido possível: espaço de patrocínio direto (banner estático) — decisão do criador.
- **Previsão × resultado do 2º turno (depois de 25/10)**: importar o resultado oficial do 2º turno
  (`scripts/tse-resultados.mjs` hoje lê o 1º turno; `data/resultados-oficiais.json` tem `turno: 1`) para pontuar
  as previsões publicadas, que estão gravadas e imutáveis em `data/forecast/snapshots/`. É a primeira validação
  real de 2º turno; o portão de probabilidade continua fechado (uma eleição por categoria).
- **Previsão: convergência no limite.** Em 21/10, 4 ajustes ficaram com R-hat 1,010–1,012 (limite 1,01) e não
  publicaram (ES 01:55Z, presidente 16:17Z, AM 16:18Z e 22:40Z); o snapshot anterior seguiu no ar, como previsto.
  Se repetir, a saída é mais sorteios (`ssm.draws` na config), não afrouxar o limite.
- **Defeito encontrado no ranking de acerto (Senado/SC), NÃO corrigido** (é método publicado, decisão do
  criador): a urna tem "Carol de Toni" (33,46%) e OUTRA "Carol" (0,15%); `acerto.ts` casa por `candKey` e
  compara a Carol das pesquisas (~25%) com 0,15%. O store também lista as duas grafias como apelido do mesmo
  `candidate_id`. A previsão recusa a ambiguidade (`ambiguous_official` no exportador) e deixa SC/Senado fora
  da avaliação.

- AtlasIntel/RJ 14045 (Cyro Garcia republicado) ainda não ratificada; governador:RJ
  hoje só perdeu as duas linhas Quaest ratificadas em #125.
- Nome sem link em várias linhas no cabeçalho da Wikipédia ainda sai cortado no
  primeiro `<br>` ("Geraldo", "Carlos" em governador/SP).
- Alerta de "rodada agendada ausente" (o workflow só avisa quando roda e falha).
- Fundir ou não os institutos IFP / Instituto França / França.

## Encerrado

- 24/10: endereços do 2º turno no TSE conferidos por sonda no GitHub Actions — `br-c0001-e006258-u.json`,
  `br-e006258-ab.json`, `<uf>-c0001-e006258-u.json` e `<uf>-e006258-ab.json` (por município) existem, zerados.

- 29/09: site "parado 13 dias" — era `presidente:BR` em quarentena, não a Vercel. Resolvido com #119/#120.
- 03/10: três rodadas vermelhas por datas invertidas no levantamento Vox (#122, issue #121).
