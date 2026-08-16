# Censo do banco — Placar das Pesquisas 2026

Gerado por `node scripts/census.mjs` a partir de `data/`. Não editar à mão.

Banco: **1001 levantamentos · 2960 perguntas · 137 institutos · 1064 candidatos**.

Este arquivo é a definição operacional de *banco normalizado*: as classes abaixo são fixas em código, e
o banco está normalizado quando todas estão vazias — ou quando o que resta está explicitamente parqueado
como decisão editorial. Achado fora destas classes é anotado, não corrigido no meio de uma rodada.

| classe | itens | de 2026 |
|---|---|---|
| **SOMA** — Elenco de vaga única somando mais de 100 | 2 | 2 |
| **PESSOA** — Candidatos que podem não ser pessoas | 0 | 0 |
| **ORFAO** — Resultados apontando para candidato inexistente | 0 | 0 |
| **SEMDATA** — Levantamentos sem data utilizável | 2 | 0 |
| **DUPLICATA** — Mesmo campo mantido como dois levantamentos | 7 | 5 |
| **CONFLITO** — Conflitos registrados aguardando decisão | 3 | 3 |
| **total** | **14** | **10** |

A coluna *de 2026* é a que importa primeiro: a eleição é em outubro de 2026 e a média usa as pesquisas
mais recentes, então um defeito num levantamento de 2023 não aparece em lugar nenhum do site.

## SOMA — Elenco de vaga única somando mais de 100 (2)

Cada eleitor tem um voto: as linhas de candidato não podem passar de 100. A folga é derivada das próprias casas decimais da fonte (0,5 por inteiro, 0,05 por décimo). O que aparecer aqui é arredondamento da fonte ou linha a mais no elenco — o segundo caso é defeito nosso.

- **[2026]** 100.2 (folga 0.10) · Veritá · AP governador/t1 · 2026-05-31 · 72d253a0383b
  Antônio Furlan 70.7 · Clécio Luís 29.5
- **[2026]** 100.9 (folga 0.65) · AtlasIntel · CE governador/t1 · 2026-03-30 · f74bd7fb7526
  Ciro Gomes 46 · Camilo Santana 48.8 · Eduardo Girão 5.4 · Jair Pereira 0.7

## PESSOA — Candidatos que podem não ser pessoas (0)

A tabela de candidatos guarda pessoas. Opções de resposta, nomes de partido e artefatos de tabela entram por aqui e viram linhas de intenção de voto — uma delas somava 13,3% no Ceará.

*Nada a reportar.*

## ORFAO — Resultados apontando para candidato inexistente (0)

Referência quebrada entre questions e candidates. Sempre defeito nosso, nunca da fonte.

*Nada a reportar.*

## SEMDATA — Levantamentos sem data utilizável (2)

Sem data de campo nem de publicação, a pesquisa não entra em média nem em série temporal: está no banco e é invisível. Ou se acha a data na fonte, ou se descarta.

- s_4b18e5197551 · Opinar · PI · registro PI-02052/2026
- s_65b317a1d7d7 · Correio/Opinião · DF · registro —

## DUPLICATA — Mesmo campo mantido como dois levantamentos (7)

Mesmo instituto, mesma UF, mesma data de campo, mesma disputa, em levantamentos separados. Duas coisas diferentes caem aqui e o rótulo de cada item diz qual: *cenários separados* é uma operação de campo cujas perguntas ficaram em levantamentos distintos — problema de identidade de levantamento, que a escada de resolução (`upsertPoll`) une; *elenco repetido* (0 de 7) é a mesma pergunta duas vezes, e essa sim entra duas vezes na média.

- **[2026]** cenários separados — Real Time Big Data · AC governador/t2 · 2026-07-25 — 2 levantamentos
  s_291fa207ccea: Alan Rick 45 · Mailza Assis 36
  s_cb78c6655121: Alan Rick 54 · Tião Bocalom 26
- **[2026]** cenários separados — Ideia · BR presidente/t2 · 2026-07-06 — 2 levantamentos
  s_2df164010e26: Lula 45 · Flávio Bolsonaro 40
  s_2df164010e26: Lula 45 · Michelle Bolsonaro 36
  s_58c4cfe5786e: Lula 45 · Romeu Zema 37
  s_58c4cfe5786e: Lula 45 · Renan Santos 33
  s_58c4cfe5786e: Lula 45 · Joaquim Barbosa 23
  s_58c4cfe5786e: Lula 45 · Ronaldo Caiado 37.6
- cenários separados — Datafolha · BR presidente/t2 · 2025-04-03 — 2 levantamentos
  s_4fa66292cd87: Fernando Haddad 45 · Jair Bolsonaro 41
  s_4fa66292cd87: Fernando Haddad 43 · Tarcísio de Freitas 37
  s_f974da273cc9: Lula 48 · Tarcísio de Freitas 39
  s_f974da273cc9: Lula 51 · Eduardo Bolsonaro 34
  s_f974da273cc9: Lula 50 · Michelle Bolsonaro 38
  s_f974da273cc9: Lula 49 · Jair Bolsonaro 40
- **[2026]** cenários separados — Nexus · BR presidente/t2 · 2026-08-09 — 2 levantamentos
  s_5153741c3e49: Lula 46 · Ronaldo Caiado 42
  s_5153741c3e49: Lula 47 · Flávio Bolsonaro 44
  s_790f404deb66: Lula 46 · Renan Santos 37
  s_790f404deb66: Lula 47 · Romeu Zema 40
- **[2026]** cenários separados — Ideia · BR presidente/t2 · 2026-08-03 — 2 levantamentos
  s_6b1c1c12ed87: Lula 48 · Renan Santos 34.7
  s_6b1c1c12ed87: Lula 48.5 · Flávio Bolsonaro 43
  s_6b1c1c12ed87: Lula 48.5 · Romeu Zema 37
  s_c094e9fa2c40: Lula 48.5 · Ronaldo Caiado 40
- **[2026]** cenários separados — Percent Brasil · MT governador/t2 · 2026-07-27 — 2 levantamentos
  s_7fe69b9b02c7: Wellington Fagundes 36.3 · Jayme Campos 22
  s_7fe69b9b02c7: Wellington Fagundes 40.8 · Natasha Slhessarenko 12.3
  s_8e3757dce960: Wellington Fagundes 37.3 · Otaviano Pivetta 20.3
- cenários separados — Futura · BR presidente/t2 · 2025-03-22 — 2 levantamentos
  s_93d336f9d7a6: Tarcísio de Freitas 42.3 · Lula 37.6
  s_93d336f9d7a6: Michelle Bolsonaro 48.5 · Lula 37.3
  s_93d336f9d7a6: Lula 37.3 · Ronaldo Caiado 37.8
  s_93d336f9d7a6: Ratinho Jr 40.6 · Lula 37.2
  s_93d336f9d7a6: Jair Bolsonaro 51.1 · Lula 37.3
  s_d4f2b6ef0f37: Jair Bolsonaro 50.3 · Geraldo Alckmin 36.5
  s_d4f2b6ef0f37: Tarcísio de Freitas 39.1 · Geraldo Alckmin 37.5

## CONFLITO — Conflitos registrados aguardando decisão (3)

Divergências que o pipeline registrou em vez de resolver em silêncio. Cada uma precisa de uma fonte primária ou de uma decisão editorial.

- **[2026]** registration_dates_contradict · s_118355fc693b · fieldwork_end: "2026-08-03" × "2025-08-03"
- **[2026]** registration_dates_contradict · s_c3ea7003b0c2 · fieldwork_end: "2026-02-01" × "2026-01-01"
- **[2026]** registration_dates_contradict · s_01a5b68c7c38 · fieldwork_end: "2026-06-18" × "2026-02-18"

