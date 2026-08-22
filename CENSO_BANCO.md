# Censo do banco — Placar das Pesquisas 2026

Gerado por `node scripts/census.mjs` a partir de `data/`. Não editar à mão.

Banco: **1049 levantamentos · 3079 perguntas · 140 institutos · 1125 candidatos**.

Este arquivo é a definição operacional de *banco normalizado*: as classes abaixo são fixas em código, e
o banco está normalizado quando todas estão vazias — ou quando o que resta está explicitamente parqueado
como decisão editorial. Achado fora destas classes é anotado, não corrigido no meio de uma rodada.

| classe | itens | de 2026 |
|---|---|---|
| **SOMA** — Elenco de vaga única somando mais de 100 | 1 | 1 |
| **PESSOA** — Candidatos que podem não ser pessoas | 0 | 0 |
| **ORFAO** — Resultados apontando para candidato inexistente | 0 | 0 |
| **SEMDATA** — Levantamentos sem data utilizável | 8 | 0 |
| **DUPLICATA** — Mesmo campo mantido como dois levantamentos | 8 | 6 |
| **CONFLITO** — Conflitos registrados aguardando decisão | 14 | 3 |
| **UNIVERSO** — Pesquisa estadual com amostra possivelmente municipal (não certificada) | 0 | 0 |
| **PARTIDA** — A mesma pessoa em duas linhas, uma delas sem registro | 2 | 2 |
| **total** | **33** | **12** |

A coluna *de 2026* é a que importa primeiro: a eleição é em outubro de 2026 e a média usa as pesquisas
mais recentes, então um defeito num levantamento de 2023 não aparece em lugar nenhum do site.

## SOMA — Elenco de vaga única somando mais de 100 (1)

Cada eleitor tem um voto: as linhas de candidato não podem passar de 100. A folga é derivada das próprias casas decimais da fonte (0,5 por inteiro, 0,05 por décimo). O que aparecer aqui é arredondamento da fonte ou linha a mais no elenco — o segundo caso é defeito nosso.

- **[2026]** 100.2 (folga 0.10) · Veritá · AP governador/t1 · 2026-05-31 · 72d253a0383b
  Antônio Furlan 70.7 · Clécio Luís 29.5

## PESSOA — Candidatos que podem não ser pessoas (0)

A tabela de candidatos guarda pessoas. Opções de resposta, nomes de partido e artefatos de tabela entram por aqui e viram linhas de intenção de voto — uma delas somava 13,3% no Ceará.

*Nada a reportar.*

## ORFAO — Resultados apontando para candidato inexistente (0)

Referência quebrada entre questions e candidates. Sempre defeito nosso, nunca da fonte.

*Nada a reportar.*

## SEMDATA — Levantamentos sem data utilizável (8)

Sem data de campo nem de publicação, a pesquisa não entra em média nem em série temporal: está no banco e é invisível. Ou se acha a data na fonte, ou se descarta.

- s_474cbe67ada8 · Delta · AC · registro —
- s_4b18e5197551 · Opinar · PI · registro PI-02052/2026
- s_58d742edadc1 · Real Time Big Data · RR · registro —
- s_5d46b3d90939 · Real Time Big Data · AC · registro —
- s_6731840ddf13 · Paraná Pesquisas · PE · registro —
- s_7ae12148d318 · Correio/Opinião · DF · registro —
- s_c5446eaf6c82 · Doxa · PA · registro —
- s_f45a1dcff913 · Paraná Pesquisas · PR · registro —

## DUPLICATA — Mesmo campo mantido como dois levantamentos (8)

Mesmo instituto, mesma UF, mesma data de campo, mesma disputa, em levantamentos separados. Duas coisas diferentes caem aqui e o rótulo de cada item diz qual: *cenários separados* é uma operação de campo cujas perguntas ficaram em levantamentos distintos — problema de identidade de levantamento, que a escada de resolução (`upsertPoll`) une; *elenco repetido* (0 de 8) é a mesma pergunta duas vezes, e essa sim entra duas vezes na média.

- **[2026]** cenários separados — Paraná Pesquisas · RJ senador/t1 · 2026-04-23 — 2 levantamentos
  s_167e1bf049a2: Rogéria Bolsonaro 28.1 · Benedita da Silva 32.3 · Márcio Canella 19.7 · Pedro Paulo 20.9
  s_c7fa19bc3263: Benedita da Silva 30.4 · Cláudio Castro 29.9 · Marcelo Crivella 21.5 · Pedro Paulo 19.4 · Márcio Canella 17.1 · Marcos Dias 5.6
- **[2026]** cenários separados — Real Time Big Data · AC governador/t2 · 2026-07-25 — 2 levantamentos
  s_291fa207ccea: Alan Rick 45 · Mailza Assis 36
  s_cb78c6655121: Alan Rick 54 · Tião Bocalom 26
- **[2026]** cenários separados — Ideia · BR presidente/t2 · 2026-07-06 — 2 levantamentos
  s_2df164010e26: Luiz Inácio Lula da Silva 45 · Flávio Bolsonaro 40
  s_2df164010e26: Luiz Inácio Lula da Silva 45 · Michelle Bolsonaro 36
  s_58c4cfe5786e: Lula 45 · Romeu Zema 37
  s_58c4cfe5786e: Lula 45 · Renan Santos 33
  s_58c4cfe5786e: Lula 45 · Joaquim Barbosa 23
  s_58c4cfe5786e: Lula 45 · Ronaldo Caiado 37.6
- **[2026]** cenários separados — Nexus · BR presidente/t2 · 2026-08-09 — 2 levantamentos
  s_5153741c3e49: Luiz Inácio Lula da Silva 46 · Ronaldo Caiado 42
  s_5153741c3e49: Luiz Inácio Lula da Silva 47 · Flávio Bolsonaro 44
  s_d5d78bf1e2cb: Luiz Inácio Lula da Silva 47 · Romeu Zema 40
  s_d5d78bf1e2cb: Luiz Inácio Lula da Silva 46 · Renan Santos 37
- **[2026]** cenários separados — Percent Brasil · MT governador/t2 · 2026-07-27 — 2 levantamentos
  s_7fe69b9b02c7: Wellington Fagundes 36.3 · Jayme Campos 22
  s_7fe69b9b02c7: Wellington Fagundes 40.8 · Natasha Slhessarenko 12.3
  s_8e3757dce960: Wellington Fagundes 37.3 · Otaviano Pivetta 20.3
- cenários separados — Futura · BR presidente/t2 · 2025-03-22 — 2 levantamentos
  s_93d336f9d7a6: Michelle Bolsonaro 48.5 · Lula 37.3
  s_93d336f9d7a6: Luiz Inácio Lula da Silva 37.3 · Ronaldo Caiado 37.8
  s_93d336f9d7a6: Ratinho Jr 40.6 · Lula 37.2
  s_93d336f9d7a6: Tarcísio de Freitas 42.3 · Lula 37.6
  s_93d336f9d7a6: Jair Bolsonaro 51.1 · Lula 37.3
  s_d4f2b6ef0f37: Tarcísio de Freitas 39.1 · Geraldo Alckmin 37.5
  s_d4f2b6ef0f37: Jair Messias Bolsonaro 50.3 · Geraldo Alckmin 36.5
- **[2026]** cenários separados — Real Time Big Data · PE senador/t1 · 2026-04-08 — 2 levantamentos
  s_a06cc00947e0: Marília Arraes 27 · Miguel Coelho 20 · Anderson Ferreira 18 · Humberto Costa 17 · Mendonça Filho 12
  s_b8267f8e8ffc: Marília Arraes 29 · Humberto Costa 17 · Eduardo da Fonte 11 · Anderson Ferreira 19 · Mendonça Filho 15
- cenários separados — Datafolha · BR presidente/t2 · 2025-04-03 — 2 levantamentos
  s_ce9d13de8c4b: Fernando Haddad 45 · Jair Messias Bolsonaro 41
  s_ce9d13de8c4b: Fernando Haddad 43 · Tarcísio de Freitas 37
  s_f974da273cc9: Lula 51 · Eduardo Bolsonaro 34
  s_f974da273cc9: Lula 50 · Michelle Bolsonaro 38
  s_f974da273cc9: Lula 49 · Jair Bolsonaro 40
  s_f974da273cc9: Lula 48 · Tarcísio de Freitas 39

## CONFLITO — Conflitos registrados aguardando decisão (14)

Divergências que o pipeline registrou em vez de resolver em silêncio. Cada uma precisa de uma fonte primária ou de uma decisão editorial.

- **[2026]** registration_dates_contradict · s_118355fc693b · fieldwork_end: "2026-08-03" × "2025-08-03"
- **[2026]** registration_dates_contradict · s_c3ea7003b0c2 · fieldwork_end: "2026-02-01" × "2026-01-01"
- **[2026]** registration_dates_contradict · s_01a5b68c7c38 · fieldwork_end: "2026-06-18" × "2026-02-18"
- roster_encolhido_na_fonte · q_cdab98c6acbd · results: ["Antônio Galvan","Beny Godoy","Carlos Fávaro","Janaína Riva","José Antonio Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques","Professor Nelson Ferreira"] × ["Antônio Galvan","Carlos Fávaro","Janaína Riva","José Antonio Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"]
- candidate_id_orphaned · c_d310d84ea9f8 · candidate_id: "c_d310d84ea9f8" × null
- person_id_orphaned · p_1c67895b599e · person_id: "p_1c67895b599e" × null
- person_id_orphaned · p_819c55380e54 · person_id: "p_819c55380e54" × null
- person_id_orphaned · p_3d5392f9cbab · person_id: "p_3d5392f9cbab" × null
- person_id_orphaned · p_438c14215f62 · person_id: "p_438c14215f62" × null
- roster_encolhido_na_fonte · q_0f0f12a28d82 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Wellington Fagundes"] × ["Jayme Campos","Natasha Slhessarenko","Otaviano Pivetta","Wellington Fagundes"]
- person_id_orphaned · p_8f9490a3b8a8 · person_id: "p_8f9490a3b8a8" × null
- candidate_id_orphaned · c_d1537945365e · candidate_id: "c_d1537945365e" × null
- roster_encolhido_na_fonte · q_69bf17c316c8 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Sargento Laudicério","Wellington Fagundes"] × ["Jayme Campos","Natasha Slhessarenko","Otaviano Pivetta","Wellington Fagundes"]
- roster_encolhido_na_fonte · q_bd8fd5b153b2 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Wellington Fagundes"] × ["Jayme Campos","Natasha Slhessarenko","Otaviano Pivetta","Wellington Fagundes"]

## UNIVERSO — Pesquisa estadual com amostra possivelmente municipal (não certificada) (0)

Disputa estadual (governador/senador) com universo gravado 'uf' e amostra < 800 que ainda NÃO está no ledger de vereditos (data/universe-verdicts.json). Amostra pequena NÃO prova municipal — muitas estaduais legítimas são pequenas — então cada uma exige leitura de fonte (cega) antes de gatear. Ponto cego conhecido: um municipal com n ≥ 800 escapa desta varredura; o gate é por veredito no ledger, não por este limiar. Confirmada municipal, entra no ledger e sai das médias estaduais; confirmada estadual, entra como estadual e para de aparecer aqui. É triagem, não porta.

*Nada a reportar.*

## PARTIDA — A mesma pessoa em duas linhas, uma delas sem registro (2)

Uma pessoa observada cuja grafia ALCANÇA, na disputa dela, a candidatura de uma pessoa registrada: são a mesma pessoa, gravada duas vezes. O caso normal é a estreia de um nome numa disputa nova e se resolve na coleta seguinte sem intervenção (§6) — o que importa aqui é o que PERSISTIR de uma rodada para a outra.

- **[2026]** "Beny Godoy" `p_21b700867042` (observada, senador:MT) é `p_cfb9b5cb872e` "Beny Godoy" (registrada, sq 110002553706) — a grafia "Beny Godoy" alcança a candidatura, mas a linha ficou na observada
- **[2026]** "Professor Nelson Ferreira" `p_c6aea7b2f6d1` (observada, senador:MT) é `p_d16aec475de9` "Professor Nelson Ferreira" (registrada, sq 110002553701) — a grafia "Professor Nelson Ferreira" alcança a candidatura, mas a linha ficou na observada

