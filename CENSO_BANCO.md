# Censo do banco — Placar das Pesquisas 2026

Gerado por `node scripts/census.mjs` a partir de `data/`. Não editar à mão.

Banco: **1746 levantamentos · 5530 perguntas · 163 institutos · 1377 candidatos**.

Este arquivo é a definição operacional de *banco normalizado*: as classes abaixo são fixas em código, e
o banco está normalizado quando todas estão vazias — ou quando o que resta está explicitamente parqueado
como decisão editorial. Achado fora destas classes é anotado, não corrigido no meio de uma rodada.

| classe | itens | de 2026 |
|---|---|---|
| **SOMA** — Elenco de vaga única somando mais de 100 | 0 | 0 |
| **PESSOA** — Candidatos que podem não ser pessoas | 0 | 0 |
| **ORFAO** — Resultados apontando para candidato inexistente | 0 | 0 |
| **SEMDATA** — Levantamentos sem data utilizável | 32 | 0 |
| **DUPLICATA** — Mesmo campo mantido como dois levantamentos | 49 | 35 |
| **CONFLITO** — Conflitos registrados aguardando decisão | 442 | 38 |
| **UNIVERSO** — Pesquisa estadual com amostra possivelmente municipal (não certificada) | 1 | 1 |
| **PARTIDA** — A mesma pessoa em duas linhas, uma delas sem registro | 0 | 0 |
| **total** | **524** | **74** |

A coluna *de 2026* é a que importa primeiro: a eleição é em outubro de 2026 e a média usa as pesquisas
mais recentes, então um defeito num levantamento de 2023 não aparece em lugar nenhum do site.

## SOMA — Elenco de vaga única somando mais de 100 (0)

Cada eleitor tem um voto: as linhas de candidato não podem passar de 100. A folga é derivada das próprias casas decimais da fonte (0,5 por inteiro, 0,05 por décimo). O que aparecer aqui é arredondamento da fonte ou linha a mais no elenco — o segundo caso é defeito nosso.

*Nada a reportar.*

## PESSOA — Candidatos que podem não ser pessoas (0)

A tabela de candidatos guarda pessoas. Opções de resposta, nomes de partido e artefatos de tabela entram por aqui e viram linhas de intenção de voto — uma delas somava 13,3% no Ceará.

*Nada a reportar.*

## ORFAO — Resultados apontando para candidato inexistente (0)

Referência quebrada entre questions e candidates. Sempre defeito nosso, nunca da fonte.

*Nada a reportar.*

## SEMDATA — Levantamentos sem data utilizável (32)

Sem data de campo nem de publicação, a pesquisa não entra em média nem em série temporal: está no banco e é invisível. Ou se acha a data na fonte, ou se descarta.

- s_03d648ecabe0 · DataPop · GO · registro —
- s_0c50c6b4fee1 · Paraná Pesquisas · SP · registro —
- s_18c152f4fe25 · Real Time Big Data · SP · registro —
- s_2b4379073719 · Real Time Big Data · SP · registro —
- s_2c014467a18c · Paraná Pesquisas · SP · registro —
- s_31caacbb8eab · Paraná Pesquisas · SP · registro —
- s_3f5ebbcc1f14 · Real Time Big Data · SP · registro —
- s_3f773e7c4da7 · Paraná Pesquisas · SP · registro —
- s_4a10551994da · Real Time Big Data · SP · registro —
- s_4adb4f5d7ad9 · Real Time Big Data · SP · registro —
- s_4b18e5197551 · Opinar · PI · registro PI-02052/2026
- s_4ef83a915b7f · Real Time Big Data · SP · registro —
- s_5bad2e5e3f5b · Paraná Pesquisas · SP · registro —
- s_5d46b3d90939 · Real Time Big Data · AC · registro —
- s_6731840ddf13 · Paraná Pesquisas · PE · registro —
- s_693707e88325 · Quaest · RJ · registro —
- s_824da0368472 · Delta · AC · registro —
- s_85e6cb3fd7ff · Paraná Pesquisas · SP · registro —
- s_8768f19ed675 · Paraná Pesquisas · SP · registro —
- s_8e11237d1246 · Real Time Big Data · SP · registro —
- s_a05e548e7136 · Real Time Big Data · SP · registro —
- s_a3b6d8cdc27d · Delta · AC · registro —
- s_b5e38606ddfc · Real Time Big Data · SP · registro —
- s_bd70e47b93fa · Real Time Big Data · SP · registro —
- s_c5446eaf6c82 · Doxa · PA · registro —
- s_c622f7e17bc9 · Real Time Big Data · SP · registro —
- s_ca4c8b28f604 · Delta · AC · registro —
- s_ce9d4a8c6ec6 · Real Time Big Data · SP · registro —
- s_f4457b6d1858 · Paraná Pesquisas · SP · registro —
- s_f45a1dcff913 · Paraná Pesquisas · PR · registro —
- s_fde53d701f86 · Paraná Pesquisas · SP · registro —
- s_fe31562fc375 · Real Time Big Data · SP · registro —

## DUPLICATA — Mesmo campo mantido como dois levantamentos (49)

Mesmo instituto, mesma UF, mesma data de campo, mesma disputa, em levantamentos separados. Duas coisas diferentes caem aqui e o rótulo de cada item diz qual: *cenários separados* é uma operação de campo cujas perguntas ficaram em levantamentos distintos — problema de identidade de levantamento, que a escada de resolução (`upsertPoll`) une; *elenco repetido* (2 de 49) é a mesma pergunta duas vezes, e essa sim entra duas vezes na média.

- **[2026]** cenários separados — Datafolha · PE senador/t1 · 2026-04-26 — 2 levantamentos
  s_03b4d753b6bc: Marília Arraes 20 · Humberto Costa 12 · Eduardo da Fonte 6 · Túlio Gadêlha 6 · Mendonça Filho 9
  s_e8aa822fab2f: Marília Arraes 21 · Humberto Costa 13 · Miguel Coelho 10 · Anderson Ferreira 7
- cenários separados — Real Time Big Data · BA governador/t1 · 2025-11-25 — 3 levantamentos
  s_03edeccebbee: Rui Costa 46 · Bruno Reis 36 · José Aleluia 3 · Kleber Rosa 1
  s_22267000c548: ACM Neto 44 · Jerônimo Rodrigues 35
  s_bcf7fc87ddc0: ACM Neto 42 · Rui Costa 43
- **[2026]** cenários separados — Real Time Big Data · CE governador/t1 · 2026-08-19 — 2 levantamentos
  s_06411268ccb9: Ciro Gomes 44 · Elmano de Freitas 44
  s_bb1084cb47d8: Elmano de Freitas 44 · Vera Lúcia Salgado 1
- **[2026]** cenários separados — Real Time Big Data · ES governador/t1 · 2026-07-21 — 2 levantamentos
  s_0a662a18fa0e: Ricardo Ferraço 29 · Paulo Hartung 25 · Lorenzo Pazolini 22 · Magno Malta 10 · Helder Salomão 8
  s_7026742f441c: Lorenzo Pazolini 25 · Paulo Hartung 27 · Ricardo Ferraço 31 · Helder Salomão 8
- **[2026]** cenários separados — MDA · BR presidente/t2 · 2026-04-12 — 2 levantamentos
  s_0ab3b34ec89f: Luiz Inácio Lula da Silva 45 · Renan Santos 28.3
  s_71129a983e6d: Lula 45.2 · Romeu Zema 31.6
  s_71129a983e6d: Luiz Inácio Lula da Silva 44.9 · Flávio Bolsonaro 40.2
  s_71129a983e6d: Lula 44.4 · Ronaldo Caiado 32.7
  s_71129a983e6d: Lula 45.4 · Aldo Rebelo 29.1
- cenários separados — Paraná Pesquisas · BR presidente/t1 · 2024-08-18 — 2 levantamentos
  s_124d3b227884: Luiz Inácio Lula da Silva 37.4 · Ciro Gomes 12 · Tereza Cristina 7.4 · Simone Tebet 8.5
  s_124d3b227884: Luiz Inácio Lula da Silva 37.1 · Tarcísio de Freitas 25.4 · Ciro Gomes 10.1
  s_124d3b227884: Luiz Inácio Lula da Silva 37.4 · Ratinho Júnior 16.1 · Ciro Gomes 11.1 · Eduardo Leite 3.6 · Simone Tebet 8
  s_124d3b227884: Luiz Inácio Lula da Silva 37 · Michelle Bolsonaro 30.5 · Ciro Gomes 8.2
  s_124d3b227884: Luiz Inácio Lula da Silva 36.3 · Jair Messias Bolsonaro 37.4 · Ciro Gomes 6.8 · Eduardo Leite 1.8 · Simone Tebet 6.2
  s_76c5918b59a0: Luiz Inácio Lula da Silva 37.4 · Tarcísio de Freitas 17.4 · Ratinho Júnior 6.2 · Romeu Zema 5.8 · Ciro Gomes 10.3 · Ronaldo Caiado 2.1 · Helder Barbalho 1.1
  s_76c5918b59a0: Luiz Inácio Lula da Silva 37.6 · Michelle Bolsonaro 23 · Ratinho Júnior 5.1 · Romeu Zema 6.5 · Ciro Gomes 9.3 · Ronaldo Caiado 1.9 · Helder Barbalho 0.9
- **[2026]** cenários separados — MDA · BR presidente/t2 · 2026-06-14 — 2 levantamentos
  s_13739469bcae: Luiz Inácio Lula da Silva 49.3 · Renan Santos 28
  s_4ab31bf55ba3: Lula 49.2 · Augusto Cury 28.4
  s_4ab31bf55ba3: Lula 49.5 · Michel Temer 24.9
  s_4ab31bf55ba3: Lula 47.5 · Joaquim Barbosa 28.9
  s_4ab31bf55ba3: Lula 49.3 · Flávio Bolsonaro 36.8
  s_4ab31bf55ba3: Lula 48.8 · Romeu Zema 31.6
  s_4ab31bf55ba3: Luiz Inácio Lula da Silva 48.4 · Ronaldo Caiado 32.2
- **[2026]** cenários separados — Veritá · PA governador/t1 · 2026-03-30 — 2 levantamentos
  s_1528eaac66a9: Daniel Santos 18.7 · Hana Ghassan 12.7
  s_6aa0e4061efa: Daniel Santos 43.4 · Hana Ghassan 25.5 · Mário Couto 17.4
- **[2026]** cenários separados — Veritá · PA senador/t1 · 2026-03-30 — 2 levantamentos
  s_1528eaac66a9: Helder Barbalho 28.4 · Éder Mauro 40.6
  s_6aa0e4061efa: Helder Barbalho 31.6 · Paulo Rocha 8.2
- **[2026]** cenários separados — Real Time Big Data · PE senador/t1 · 2026-02-10 — 2 levantamentos
  s_15d81e75c955: Humberto Costa 24 · Miguel Coelho 24 · Armando Monteiro Neto 9 · Anderson Ferreira 21
  s_b213b8afa8b8: Marília Arraes 27 · Humberto Costa 21 · Eduardo da Fonte 13 · Anderson Ferreira 21
  s_b213b8afa8b8: Humberto Costa 23 · Silvio Costa Filho 21 · Anderson Ferreira 19 · Eduardo da Fonte 13
  s_b213b8afa8b8: Humberto Costa 24 · Eduardo da Fonte 14 · Gilson Machado Neto 17 · Silvio Costa Filho 21
- **[2026]** cenários separados — Paraná Pesquisas · RJ senador/t1 · 2026-04-23 — 2 levantamentos
  s_167e1bf049a2: Rogéria Bolsonaro 28.1 · Benedita da Silva 32.3 · Márcio Canella 19.7 · Pedro Paulo 20.9
  s_c7fa19bc3263: Benedita da Silva 30.4 · Cláudio Castro 29.9 · Marcelo Crivella 21.5 · Pedro Paulo 19.4 · Márcio Canella 17.1 · Marcos Dias 5.6
- **[2026]** cenários separados — Nexus · BR presidente/t2 · 2026-08-09 — 2 levantamentos
  s_1a87afdafbfb: Luiz Inácio Lula da Silva 46 · Renan Santos 37
  s_5153741c3e49: Luiz Inácio Lula da Silva 46 · Ronaldo Caiado 42
  s_5153741c3e49: Lula 47 · Zema 40
  s_5153741c3e49: Luiz Inácio Lula da Silva 47 · Flávio Bolsonaro 44
- **[2026]** cenários separados — Real Time Big Data · SP governador/t1 · 2026-03-07 — 2 levantamentos
  s_1b5d70c07004: Tarcísio de Freitas 48 · Márcio França 23 · Paulo Serra 8 · Kim Kataguiri 10
  s_1b5d70c07004: Tarcísio de Freitas 49 · Simone Tebet 21 · Paulo Serra 9 · Kim Kataguiri 10
  s_f4ca9fe78936: Tarcísio de Freitas 43 · Capitão Derrite 18 · Fernando Haddad 32
  s_f4ca9fe78936: Tarcísio de Freitas 47 · Fernando Haddad 31 · Kim Kataguiri 8 · Paulo Serra 7
- **[2026]** cenários separados — Ideia · BR presidente/t2 · 2026-07-06 — 2 levantamentos
  s_1c07c8c2d8fe: Luiz Inácio Lula da Silva 45 · Renan Santos 33
  s_58c4cfe5786e: Lula 45 · Romeu Zema 37
  s_58c4cfe5786e: Lula 45 · Flávio Bolsonaro 40
  s_58c4cfe5786e: Lula 45 · Joaquim Barbosa 23
  s_58c4cfe5786e: Lula 45 · Ronaldo Caiado 37.6
  s_58c4cfe5786e: Lula 45 · Michelle Bolsonaro 36
- cenários separados — Real Time Big Data · SE governador/t1 · 2025-11-26 — 3 levantamentos
  s_1da98a1aa538: Fábio Mitidieri 48 · Emília Corrêa 32
  s_42ae015e72cf: Fábio Mitidieri 46 · Valmir de Francisquinho de Itabaiana 33
  s_ad82f3d5fdbb: Fábio Mitidieri 50 · Eduardo Amorim 28
- **[2026]** cenários separados — Real Time Big Data · AC governador/t2 · 2026-07-25 — 2 levantamentos
  s_291fa207ccea: Alan Rick 45 · Mailza Assis 36
  s_291fa207ccea: Mailza Assis 42 · Tião Bocalom 28
  s_cb78c6655121: Alan Rick 54 · Tião Bocalom 26
- cenários separados — Datafolha · BR presidente/t1 · 2025-04-03 — 2 levantamentos
  s_29780600671a: Jair Messias Bolsonaro 30 · Luiz Inácio Lula da Silva 36 · Pablo Marçal 7 · Ciro Gomes 12 · Eduardo Leite 5
  s_29780600671a: Jair Messias Bolsonaro 32 · Fernando Haddad 17 · Pablo Marçal 8 · Ciro Gomes 20 · Eduardo Leite 6
  s_29780600671a: Eduardo Bolsonaro 11 · Luiz Inácio Lula da Silva 35 · Pablo Marçal 10 · Ratinho Júnior 6 · Romeu Zema 4 · Ciro Gomes 12 · Ronaldo Caiado 3 · Eduardo Leite 4
  s_29780600671a: Michelle Bolsonaro 15 · Luiz Inácio Lula da Silva 35 · Pablo Marçal 10 · Ratinho Júnior 5 · Romeu Zema 4 · Ciro Gomes 12 · Ronaldo Caiado 3 · Eduardo Leite 3
  s_29780600671a: Tarcísio de Freitas 16 · Fernando Haddad 15 · Pablo Marçal 12 · Ratinho Júnior 7 · Romeu Zema 3 · Ciro Gomes 19 · Ronaldo Caiado 2 · Eduardo Leite 5
  s_f974da273cc9: Lula 35 · Tarcísio de Freitas 15 · Ciro Gomes 11 · Pablo Marçal 11 · Ratinho Jr 5 · Eduardo Leite 3 · Romeu Zema 3 · Ronaldo Caiado 2
- cenários separados — Datafolha · BR presidente/t2 · 2025-04-03 — 2 levantamentos
  s_29780600671a: Fernando Haddad 45 · Jair Bolsonaro 41
  s_29780600671a: Fernando Haddad 43 · Tarcísio de Freitas 37
  s_f974da273cc9: Lula 51 · Eduardo Bolsonaro 34
  s_f974da273cc9: Lula 50 · Michelle Bolsonaro 38
  s_f974da273cc9: Lula 49 · Jair Bolsonaro 40
  s_f974da273cc9: Lula 48 · Tarcísio de Freitas 39
- **[2026]** cenários separados — Futura · PR governador/t1 · 2026-01-27 — 2 levantamentos
  s_2b4a113f3a83: Sergio Moro 44.6 · Requião Filho 22.7 · Rafael Greca 10.1 · Luiz França 1
  s_2b4a113f3a83: Sergio Moro 42.6 · Requião Filho 22.7 · Alexandre Curi 7.7 · Luiz França 0.4
  s_a2eb28045ffc: Requião Filho 23.4 · Alvaro Dias 18.9 · Beto Richa 9.5 · Paulo Martins 9.4 · Guto Silva 6.4 · Cida Borghetti 6.3 · Luiz França 0.7
- cenários separados — AtlasIntel · BR presidente/t1 · 2025-05-23 — 2 levantamentos
  s_2b6ddfecf762: Jair Messias Bolsonaro 46.7 · Luiz Inácio Lula da Silva 43.9 · Ciro Gomes 3.8 · Simone Tebet 2.1
  s_b55aff185e2b: Michelle Bolsonaro 33.5 · Luiz Inácio Lula da Silva 44.4 · Pablo Marçal 2.1 · Ratinho Júnior 3.9 · Eduardo Leite 2.2 · Romeu Zema 4 · Ciro Gomes 3.2 · Ronaldo Caiado 4.8
  s_b55aff185e2b: Lula 44.1 · Tarcísio de Freitas 33.1 · Ronaldo Caiado 4.7 · Pablo Marçal 4.7 · Ciro Gomes 3.6 · Ratinho Jr 2.1 · Eduardo Leite 2.1 · Romeu Zema 1.4
- cenários separados — AtlasIntel · BR presidente/t1 · 2025-10-19 — 2 levantamentos
  s_33f0936d624b: Michelle Bolsonaro 26.2 · Luiz Inácio Lula da Silva 51 · Ratinho Júnior 5.1 · Romeu Zema 4.6 · Ronaldo Caiado 9.1
  s_33f0936d624b: Tarcísio de Freitas 30.4 · Luiz Inácio Lula da Silva 51.3 · Ratinho Júnior 3 · Romeu Zema 2.5 · Ronaldo Caiado 6
  s_33f0936d624b: Tarcísio de Freitas 30.1 · Fernando Haddad 43.1 · Ratinho Júnior 3.5 · Romeu Zema 2.6 · Ronaldo Caiado 7
  s_33f0936d624b: Luiz Inácio Lula da Silva 51 · Ratinho Júnior 10.4 · Romeu Zema 10.6 · Ronaldo Caiado 15.3
  s_fa88a308a3ff: Jair Messias Bolsonaro 41.3 · Luiz Inácio Lula da Silva 48.8 · Ciro Gomes 3.1 · Simone Tebet 2.3
- **[2026]** cenários separados — AtlasIntel · CE senador/t1 · 2026-03-30 — 2 levantamentos
  s_34c6bb115058: Eunício Oliveira 8.7 · Alcides Fernandes 11.8 · Cid Gomes 19.9 · Roberto Cláudio 14.6 · General Theóphilo 6.3
  s_ea4d1c60ea99: Capitão Wagner 20.9 · Eunício Oliveira 10.1 · Júnior Mano 5 · Luizianne Lins 17.2 · Priscila Costa 10.8 · General Theóphilo 4.5
- cenários separados — Paraná Pesquisas · BR presidente/t1 · 2024-03-22 — 2 levantamentos
  s_3898a4afe32c: Luiz Inácio Lula da Silva 36.2 · Tarcísio de Freitas 23.3 · Ciro Gomes 11 · Eduardo Leite 2.2 · Simone Tebet 8.2
  s_3898a4afe32c: Luiz Inácio Lula da Silva 36.6 · Ratinho Júnior 14.6 · Ciro Gomes 12.9 · Eduardo Leite 3 · Simone Tebet 8.3
  s_3898a4afe32c: Luiz Inácio Lula da Silva 36.9 · Ciro Gomes 14 · Eduardo Leite 4.4 · Simone Tebet 9.4 · Ciro Nogueira 3.4
  s_3898a4afe32c: Luiz Inácio Lula da Silva 36.6 · Ciro Gomes 13.6 · Tereza Cristina 7 · Eduardo Leite 4.2 · Simone Tebet 8.9
  s_3898a4afe32c: Luiz Inácio Lula da Silva 36.8 · Romeu Zema 14.1 · Ciro Gomes 12.8 · Eduardo Leite 3.3 · Simone Tebet 8.6
  s_3898a4afe32c: Luiz Inácio Lula da Silva 36.3 · Ciro Gomes 13.9 · Ronaldo Caiado 7.7 · Eduardo Leite 3.9 · Simone Tebet 9
  s_c91e29863a32: Jair Bolsonaro 37.1 · Lula 35.3 · Ciro Gomes 7.5 · Simone Tebet 6.1 · Eduardo Leite 1.8
- cenários separados — Futura · BR presidente/t1 · 2025-03-22 — 2 levantamentos
  s_3aedff7de255: Tarcísio de Freitas 24.3 · Luiz Inácio Lula da Silva 31 · Ratinho Júnior 15.1 · Ronaldo Caiado 9
  s_3aedff7de255: Tarcísio de Freitas 24.6 · Geraldo Alckmin 26 · Ratinho Júnior 16 · Ronaldo Caiado 9.8
  s_3aedff7de255: Jair Messias Bolsonaro 41.9 · Geraldo Alckmin 23.5 · Ratinho Júnior 9.7 · Ronaldo Caiado 7
  s_3aedff7de255: Michelle Bolsonaro 37.2 · Geraldo Alckmin 23.7 · Ratinho Júnior 12.9 · Ronaldo Caiado 8.3
  s_93d336f9d7a6: Jair Bolsonaro 41.9 · Lula 31.7 · Ratinho Jr 6.7 · Ronaldo Caiado 6
- cenários separados — Futura · BR presidente/t2 · 2025-03-22 — 2 levantamentos
  s_3aedff7de255: Tarcísio de Freitas 39.1 · Geraldo Alckmin 37.5
  s_3aedff7de255: Jair Bolsonaro 50.3 · Geraldo Alckmin 36.5
  s_93d336f9d7a6: Michelle Bolsonaro 48.5 · Lula 37.3
  s_93d336f9d7a6: Luiz Inácio Lula da Silva 37.3 · Ronaldo Caiado 37.8
  s_93d336f9d7a6: Ratinho Jr 40.6 · Lula 37.2
  s_93d336f9d7a6: Tarcísio de Freitas 42.3 · Lula 37.6
  s_93d336f9d7a6: Jair Bolsonaro 51.1 · Lula 37.3
- **[2026]** cenários separados — AtlasIntel · SP governador/t1 · 2026-09-03 — 2 levantamentos
  s_4c85bb64cd7a: Rodrigo Manga 10.8 · Geraldo Alckmin 39.4 · Ricardo Nunes 11.5 · Paulo Serra 1.4 · André do Prado 1.2 · Ricardo Salles 15 · Gilberto Kassab 9
  s_4c85bb64cd7a: Rodrigo Manga 8.2 · Capitão Derrite 23.2 · Fernando Haddad 41 · Paulo Serra 5.2 · Ricardo Salles 10.6
  s_d3fc6e8d5872: Tarcísio de Freitas 48.6 · Geraldo Alckmin 34.2 · Erika Hilton 8.3 · Paulo Serra 0.2 · Felipe d'Avila 1.9
  s_d3fc6e8d5872: Tarcísio de Freitas 47.3 · Márcio França 18.2 · Guilherme Boulos 22.6 · Paulo Serra 0.6 · Felipe d'Avila 1.8
- **[2026]** cenários separados — AtlasIntel · BR presidente/t1 · 2026-01-20 — 2 levantamentos
  s_4d3135a9577d: Luiz Inácio Lula da Silva 48.4 · Flávio Bolsonaro 28 · Tarcísio de Freitas 11 · Ratinho Júnior 1.7 · Ronaldo Caiado 2.9 · Romeu Zema 1.7 · Renan Santos 2.9 · Aldo Rebelo 1
  s_4d3135a9577d: Luiz Inácio Lula da Silva 48.8 · Flávio Bolsonaro 35 · Ratinho Júnior 2.8 · Ronaldo Caiado 4.3 · Romeu Zema 2.8 · Renan Santos 3.4 · Aldo Rebelo 1
  s_4d3135a9577d: Luiz Inácio Lula da Silva 48.5 · Tarcísio de Freitas 28.4 · Ratinho Júnior 3.9 · Ronaldo Caiado 5 · Romeu Zema 3.9 · Renan Santos 3.2 · Aldo Rebelo 1.1
  s_4d3135a9577d: Luiz Inácio Lula da Silva 48.8 · Ratinho Júnior 9.4 · Ronaldo Caiado 15.2 · Romeu Zema 11.4 · Renan Santos 3.9 · Aldo Rebelo 1
  s_4d3135a9577d: Luiz Inácio Lula da Silva 48.8 · Ronaldo Caiado 15.2 · Ratinho Júnior 9.4 · Romeu Zema 11.4
  s_4d3135a9577d: Tarcísio de Freitas 28.9 · Fernando Haddad 42 · Ratinho Júnior 4.9 · Ronaldo Caiado 5 · Romeu Zema 3.8 · Renan Santos 3.6 · Aldo Rebelo 0.7
  s_4d3135a9577d: Luiz Inácio Lula da Silva 48.2 · Michelle Bolsonaro 30.9 · Ronaldo Caiado 11.3 · Eduardo Leite 1.7 · Renan Santos 3.9 · Aldo Rebelo 0.7
  s_4d3135a9577d: Luiz Inácio Lula da Silva 48.5 · Tarcísio de Freitas 28.4 · Ronaldo Caiado 5 · Ratinho Júnior 3.9 · Romeu Zema 3.9
  s_4d3135a9577d: Luiz Inácio Lula da Silva 48.4 · Flávio Bolsonaro 28 · Tarcísio de Freitas 11 · Ronaldo Caiado 2.9 · Ratinho Júnior 1.7 · Romeu Zema 1.7
  s_4d3135a9577d: Luiz Inácio Lula da Silva 48.8 · Flávio Bolsonaro 35 · Ronaldo Caiado 4.3 · Ratinho Júnior 2.8 · Romeu Zema 2.8
  s_ae73edd9fed9: Luiz Inácio Lula da Silva 46.4 · Jair Messias Bolsonaro 43.4 · Ciro Gomes 3.2
- **[2026]** cenários separados — Paraná Pesquisas · CE senador/t1 · 2026-01-21 — 2 levantamentos
  s_4edd253c1432: Capitão Wagner 44.7 · Eunício Oliveira 26.4 · Luizianne Lins 19.9 · Guimarães do PT 13.4 · Júnior Mano 9.1 · Professor Alcides 8.1 · Priscila Costa 8 · Chiquinho Feitosa 4.3 · Moses Rodrigues 4.3 · General Theophilo 3.5
  s_4f2efc1b33dc: Capitão Wagner 39.1 · Eunício Oliveira 26.4 · Júnior Mano 9.1 · Alcides Fernandes 8.1 · Roberto Cláudio 24.9 · Luizianne Lins 19.9 · José Nobre Guimarães 13.4 · Priscila Costa 8 · Chiquinho Feitosa 4.3 · General Theóphilo 3.5
- **[2026]** cenários separados — Quaest · AC governador/t2 · 2026-08-26 — 2 levantamentos
  s_63076a766607: Alan Rick 42 · Mailza Assis 35
  s_f2be082c9a16: Alan Rick 48 · Tião Bocalom 27
  s_f2be082c9a16: Mailza Assis 43 · Tião Bocalom 27
- cenários separados — AtlasIntel · BR presidente/t1 · 2025-06-30 — 2 levantamentos
  s_67a8dda7d659: Jair Messias Bolsonaro 46 · Luiz Inácio Lula da Silva 44.4 · Ciro Gomes 4.5 · Simone Tebet 1.5
  s_9d13d46ea6a8: Michelle Bolsonaro 30.4 · Luiz Inácio Lula da Silva 45 · Pablo Marçal 1.3 · Ratinho Júnior 4.8 · Eduardo Leite 0.9 · Romeu Zema 7.2 · Ciro Gomes 3.9 · Ronaldo Caiado 4
  s_9d13d46ea6a8: Lula 44.6 · Tarcísio de Freitas 34 · Romeu Zema 4.4 · Pablo Marçal 3.7 · Ciro Gomes 3.5 · Ratinho Jr 2.5 · Ronaldo Caiado 1.7 · Eduardo Leite 1
- **[2026]** cenários separados — Palver · BR presidente/t2 · 2026-09-23 — 2 levantamentos
  s_684407aea71b: Luiz Inácio Lula da Silva 44 · Augusto Cury 36
  s_684407aea71b: Luiz Inácio Lula da Silva 45 · Romeu Zema 43
  s_684407aea71b: Luiz Inácio Lula da Silva 44 · Renan Santos 34
  s_684407aea71b: Luiz Inácio Lula da Silva 44 · Ronaldo Caiado 42
  s_b18676d0c7d2: Flávio Bolsonaro 48 · Lula 45
- **[2026]** cenários separados — Quaest · BR presidente/t1 · 2026-02-09 — 2 levantamentos
  s_6c134fdd655e: Luiz Inácio Lula da Silva 39 · Flávio Bolsonaro 32 · Romeu Zema 4 · Renan Santos 2 · Aldo Rebelo 2
  s_6c134fdd655e: Luiz Inácio Lula da Silva 37 · Flávio Bolsonaro 31 · Ratinho Júnior 7
  s_6c134fdd655e: Luiz Inácio Lula da Silva 37 · Flávio Bolsonaro 33 · Eduardo Leite 4 · Renan Santos 2 · Aldo Rebelo 2
  s_6c134fdd655e: Luiz Inácio Lula da Silva 38 · Flávio Bolsonaro 31 · Eduardo Leite 3 · Romeu Zema 4 · Renan Santos 2 · Aldo Rebelo 1
  s_6c134fdd655e: Luiz Inácio Lula da Silva 38 · Flávio Bolsonaro 30 · Ronaldo Caiado 4 · Romeu Zema 4 · Renan Santos 1 · Aldo Rebelo 1
  s_6c134fdd655e: Luiz Inácio Lula da Silva 35 · Flávio Bolsonaro 29 · Ratinho Júnior 8 · Romeu Zema 4
  s_6c134fdd655e: Luiz Inácio Lula da Silva 39 · Flávio Bolsonaro 32 · Ronaldo Caiado 4
  s_6c134fdd655e: Luiz Inácio Lula da Silva 37 · Flávio Bolsonaro 31 · Ratinho Júnior 7 · Renan Santos 2 · Aldo Rebelo 2
  s_6c134fdd655e: Luiz Inácio Lula da Silva 35 · Flávio Bolsonaro 29 · Ratinho Júnior 8 · Romeu Zema 4 · Renan Santos 1 · Aldo Rebelo 1
  s_e1adf64bc7a6: Luiz Inácio Lula da Silva 38 · Flávio Bolsonaro 30 · Ronaldo Caiado 4 · Romeu Zema 4
- cenários separados — AtlasIntel · BR presidente/t1 · 2025-12-15 — 3 levantamentos
  s_785b02baf1d1: Luiz Inácio Lula da Silva 48.1 · Flávio Bolsonaro 29.3 · Ratinho Júnior 3.9 · Romeu Zema 3.8 · Ronaldo Caiado 7.2
  s_785b02baf1d1: Luiz Inácio Lula da Silva 48.8 · Tarcísio de Freitas 28.3 · Ratinho Júnior 3.4 · Romeu Zema 3.8 · Ronaldo Caiado 5.5
  s_785b02baf1d1: Luiz Inácio Lula da Silva 47.9 · Flávio Bolsonaro 21.3 · Tarcísio de Freitas 15 · Ratinho Júnior 4.1 · Romeu Zema 3 · Ronaldo Caiado 4.4
  s_785b02baf1d1: Luiz Inácio Lula da Silva 48.8 · Ratinho Júnior 9 · Romeu Zema 11.7 · Ronaldo Caiado 16.3
  s_9af875746ba2: Jair Messias Bolsonaro 44 · Luiz Inácio Lula da Silva 46.7 · Ciro Gomes 3.2
  s_b4946ecc43f3: Tarcísio de Freitas 28.3 · Luiz Inácio Lula da Silva 48.8 · Ratinho Júnior 3.4 · Romeu Zema 3.8 · Ronaldo Caiado 5.5 · Renan Santos 3
  s_b4946ecc43f3: Flávio Bolsonaro 21.3 · Tarcísio de Freitas 15 · Luiz Inácio Lula da Silva 47.9 · Ratinho Júnior 4.1 · Romeu Zema 3 · Ronaldo Caiado 4.4 · Renan Santos 2.4
  s_b4946ecc43f3: Luiz Inácio Lula da Silva 48.8 · Ratinho Júnior 9 · Romeu Zema 11.7 · Ronaldo Caiado 16.3 · Renan Santos 3.6
  s_b4946ecc43f3: Michelle Bolsonaro 30 · Luiz Inácio Lula da Silva 48.8 · Ratinho Júnior 3.6 · Romeu Zema 3.9 · Ronaldo Caiado 7.5 · Renan Santos 3.2
  s_b4946ecc43f3: Flávio Bolsonaro 29.3 · Luiz Inácio Lula da Silva 48.1 · Ratinho Júnior 3.9 · Romeu Zema 3.8 · Ronaldo Caiado 7.2 · Renan Santos 3.2
  s_b4946ecc43f3: Tarcísio de Freitas 28.5 · Fernando Haddad 43.9 · Ratinho Júnior 4.1 · Romeu Zema 4.1 · Ronaldo Caiado 6.1 · Renan Santos 3.2
- **[2026]** cenários separados — Percent Brasil · MT governador/t2 · 2026-07-27 — 2 levantamentos
  s_7fe69b9b02c7: Wellington Fagundes 36.3 · Jayme Campos 22
  s_7fe69b9b02c7: Wellington Fagundes 40.8 · Natasha Slhessarenko 12.3
  s_8e3757dce960: Wellington Fagundes 37.3 · Otaviano Pivetta 20.3
- **[2026]** cenários separados — Quaest · AM governador/t2 · 2026-08-24 — 2 levantamentos
  s_86145f8e35f7: Omar Aziz 49 · David Almeida 46
  s_af3cacb4c580: Omar Aziz 44 · Roberto Cidade 40
  s_af3cacb4c580: Maria do Carmo 41 · David Almeida 40
  s_af3cacb4c580: Maria do Carmo 44 · Omar Aziz 45
- **[2026]** cenários separados — Quaest · CE senador/t1 · 2026-04-28 — 2 levantamentos
  s_8671a57e9697: Cid Gomes 17 · Capitão Wagner 17 · Eunício Oliveira 6 · Luizianne Lins 9 · Priscila Costa 4 · General Theóphilo 1 · Anna Karina 1
  s_a6c9cec351e6: Cid Gomes 17 · Capitão Wagner 16 · Roberto Cláudio 8 · Luizianne Lins 8 · Eunício Oliveira 6 · Pastor Alcides 3 · Priscila Costa 3 · Chiquinho Feitosa 1 · Domingos Filho 1 · General Theophilo 1 · Anna Karina 0
- **[2026]** cenários separados — Datafolha · BR presidente/t1 · 2026-03-05 — 2 levantamentos
  s_9949485e2ceb: Luiz Inácio Lula da Silva 39 · Flávio Bolsonaro 34 · Eduardo Leite 3 · Romeu Zema 4
  s_9949485e2ceb: Luiz Inácio Lula da Silva 39 · Flávio Bolsonaro 33 · Ronaldo Caiado 4 · Romeu Zema 5
  s_ff4eb12c8552: Luiz Inácio Lula da Silva 39 · Flávio Bolsonaro 33 · Ronaldo Caiado 4 · Romeu Zema 5 · Renan Santos 3 · Aldo Rebelo 2
  s_ff4eb12c8552: Luiz Inácio Lula da Silva 38 · Flávio Bolsonaro 32 · Ratinho Júnior 7 · Romeu Zema 4
  s_ff4eb12c8552: Flávio Bolsonaro 33 · Fernando Haddad 21 · Ratinho Júnior 11 · Romeu Zema 5 · Renan Santos 4 · Aldo Rebelo 2
  s_ff4eb12c8552: Luiz Inácio Lula da Silva 39 · Tarcísio de Freitas 21 · Ratinho Júnior 11 · Romeu Zema 5
  s_ff4eb12c8552: Luiz Inácio Lula da Silva 39 · Flávio Bolsonaro 34 · Eduardo Leite 3 · Romeu Zema 4 · Renan Santos 3 · Aldo Rebelo 2
  s_ff4eb12c8552: Luiz Inácio Lula da Silva 38 · Flávio Bolsonaro 32 · Ratinho Júnior 7 · Romeu Zema 4 · Renan Santos 3 · Aldo Rebelo 2
  s_ff4eb12c8552: Luiz Inácio Lula da Silva 39 · Tarcísio de Freitas 21 · Ratinho Júnior 11 · Romeu Zema 5 · Renan Santos 3 · Aldo Rebelo 2
- **[2026]** cenários separados — Quaest · MS governador/t2 · 2026-08-24 — 2 levantamentos
  s_9a35fbf62e3e: Eduardo Riedel 61 · João Henrique Catan 13
  s_c91e7484e3ea: Eduardo Riedel 59 · Fábio Trad 22
  s_c91e7484e3ea: Eduardo Riedel 54 · Delcídio do Amaral 23
- **[2026]** cenários separados — Real Time Big Data · GO governador/t1 · 2026-05-12 — 2 levantamentos
  s_9e8551e8656b: Daniel Vilela 38 · Marconi Perillo 22 · Wilder Morais 14 · Adriana Accorsi 13 · Telemaco Brandão 1
  s_bd3f70c87aa1: Daniel Vilela 40 · Marconi Perillo 25 · Wilder Morais 14 · Luis Cesar Bueno 2 · Telêmaco Brandão 1
- **[2026]** cenários separados — Real Time Big Data · PE senador/t1 · 2026-04-08 — 2 levantamentos
  s_a06cc00947e0: Marília Arraes 27 · Miguel Coelho 20 · Anderson Ferreira 18 · Humberto Costa 17 · Mendonça Filho 12
  s_b8267f8e8ffc: Marília Arraes 28 · Humberto Costa 17 · Miguel Coelho 21 · Túlio Gadêlha 8 · Anderson Ferreira 19
  s_b8267f8e8ffc: Marília Arraes 29 · Humberto Costa 17 · Eduardo da Fonte 11 · Anderson Ferreira 19 · Mendonça Filho 15
- **[2026]** cenários separados — Quaest · SP governador/t1 · 2026-09-07 — 2 levantamentos
  s_a1da9ab4ab5d: Tarcísio de Freitas 42 · Fernando Haddad 27 · Policial Edjane 1 · Vera Lúcia Salgado 1 · Carlos Machado 1 · Vivian Mendes 0
  s_dbe900cbe0e6: Tarcísio de Freitas 42 · Fernando Haddad 27 · Vera Lúcia 1 · Carlos Machado 1 · Vivian Mendes 1 · Izadora Dias 0 · Edjane 1
- **[2026]** cenários separados — Ipec · CE senador/t1 · 2026-07-26 — 2 levantamentos
  s_a8c3982fec69: Capitão Wagner 24 · Luizianne Lins 16 · Alcides Fernandes 7 · Júnior Mano 7 · Anna Karina 6 · General Theophilo 3 · Cândido Albuquerque 2
  s_fbac0e37641e: Cid Gomes 22 · Capitão Wagner 24 · Luizianne Lins 16 · Alcides Fernandes 8 · General Theóphilo 4
- **[2026]** ELENCO REPETIDO — Real Time Big Data · MT governador/t2 · 2026-03-23 — 2 levantamentos
  s_a9ee1d3018cc: Otaviano Pivetta 33 · Doutora Natasha 31
  s_f6e5af681529: Wellington Fagundes 47 · Otaviano Pivetta 29
  s_f6e5af681529: Jayme Campos 32 · Natasha Slhessarenko 26
  s_f6e5af681529: Otaviano Pivetta 33 · Jayme Campos 31
  s_f6e5af681529: Otaviano Pivetta 36 · Natasha Slhessarenko 23
  s_f6e5af681529: Wellington Fagundes 50 · Jayme Campos 26
  s_f6e5af681529: Wellington Fagundes 55 · Natasha Slhessarenko 20
- **[2026]** cenários separados — Real Time Big Data · MT senador/t1 · 2026-03-23 — 2 levantamentos
  s_a9ee1d3018cc: Mauro Mendes 28 · Janaína Riva 21 · José Medeiros 10 · Carlos Fávaro 12 · Jayme Campos 10 · Pedro Taques 6
  s_a9ee1d3018cc: Mauro Mendes 28 · Janaína Riva 21 · José Medeiros 10 · Carlos Fávaro 12 · Jayme Campos 11
  s_f6e5af681529: Mauro Mendes 28 · Janaína Riva 21 · Carlos Fávaro 12 · Jayme Campos 11 · José Medeiros 10 · Professora Rosa Neide 6
- cenários separados — Futura · BR presidente/t1 · 2025-06-04 — 2 levantamentos
  s_b1d12aeaaab3: Jair Messias Bolsonaro 41.4 · Geraldo Alckmin 21.3 · Ratinho Júnior 10.6 · Ronaldo Caiado 5.9
  s_b1d12aeaaab3: Jair Messias Bolsonaro 41.4 · Luiz Inácio Lula da Silva 31.4 · Ratinho Júnior 8.2 · Ronaldo Caiado 5.8
  s_b1d12aeaaab3: Michelle Bolsonaro 37.6 · Geraldo Alckmin 22.5 · Ratinho Júnior 11.9 · Ronaldo Caiado 9
  s_e89463848d1c: Tarcísio de Freitas 22.5 · Luiz Inácio Lula da Silva 32.7 · Ratinho Júnior 11.3 · Ronaldo Caiado 6.2
  s_e89463848d1c: Michelle Bolsonaro 36.3 · Luiz Inácio Lula da Silva 33.7 · Ratinho Júnior 10.1 · Ronaldo Caiado 6.5
- **[2026]** cenários separados — Nexus · BR presidente/t2 · 2026-09-20 — 2 levantamentos
  s_b363d97622e6: Lula 46 · Flávio Bolsonaro 45
  s_f32e3d468024: Luiz Inácio Lula da Silva 47 · Renan Santos 39
  s_f32e3d468024: Luiz Inácio Lula da Silva 45 · Ronaldo Caiado 45
  s_f32e3d468024: Luiz Inácio Lula da Silva 47 · Romeu Zema 41
  s_f32e3d468024: Luiz Inácio Lula da Silva 44 · Augusto Cury 43
- **[2026]** cenários separados — Paraná Pesquisas · SP governador/t1 · 2026-02-23 — 2 levantamentos
  s_c29b3c8dfdd7: Rodrigo Manga 9.8 · Márcio França 19.3 · Marta Suplicy 19.2 · Paulo Serra 6.3 · Rodrigo Garcia 12.8 · Felicio Ramuth 2.7
  s_c29b3c8dfdd7: Rodrigo Manga 9.5 · Márcio França 18.8 · Marta Suplicy 18.3 · Paulo Serra 6.4 · Rodrigo Garcia 12.3 · Gilberto Kassab 4.7
  s_d1eca32f49ef: Márcio França 21.6 · Ricardo Nunes 35.8 · Alexandre Padilha 8 · Paulo Serra 6.5
  s_d1eca32f49ef: Tarcísio de Freitas 40.3 · Márcio França 12.7 · Alexandre Padilha 7.1 · Paulo Serra 5 · Pablo Marçal 17.6
  s_d1eca32f49ef: Tarcísio de Freitas 37.8 · Geraldo Alckmin 24.7 · Alexandre Padilha 4.8 · Paulo Serra 3 · Pablo Marçal 16.2
  s_d1eca32f49ef: Márcio França 17 · Ricardo Nunes 27 · Alexandre Padilha 6.3 · Paulo Serra 5.1 · Pablo Marçal 25.6
  s_d1eca32f49ef: Tarcísio de Freitas 48.6 · Márcio França 16.6 · Alexandre Padilha 8.5 · Paulo Serra 5.9
- ELENCO REPETIDO — Quaest · BR presidente/t1 · 2025-08-17 — 2 levantamentos
  s_c6dae875b63c: Luiz Inácio Lula da Silva 35 · Flávio Bolsonaro 14 · Ciro Gomes 10 · Ratinho Júnior 9 · Romeu Zema 6 · Ronaldo Caiado 5
  s_c6dae875b63c: Luiz Inácio Lula da Silva 35 · Tarcísio de Freitas 17 · Ciro Gomes 11 · Romeu Zema 4 · Ronaldo Caiado 6
  s_ebd719464c42: Eduardo Bolsonaro 15 · Luiz Inácio Lula da Silva 34 · Ratinho Júnior 10 · Romeu Zema 4 · Ciro Gomes 10 · Ronaldo Caiado 5
  s_ebd719464c42: Jair Messias Bolsonaro 28 · Luiz Inácio Lula da Silva 34 · Ratinho Júnior 7 · Romeu Zema 3 · Ciro Gomes 8 · Ronaldo Caiado 3
  s_ebd719464c42: Tarcísio de Freitas 17 · Luiz Inácio Lula da Silva 35 · Romeu Zema 4 · Ciro Gomes 11 · Ronaldo Caiado 6
  s_ebd719464c42: Flávio Bolsonaro 14 · Luiz Inácio Lula da Silva 35 · Ratinho Júnior 9 · Romeu Zema 6 · Ciro Gomes 10 · Ronaldo Caiado 5
  s_ebd719464c42: Michelle Bolsonaro 21 · Luiz Inácio Lula da Silva 35 · Ratinho Júnior 8 · Romeu Zema 4 · Ciro Gomes 9 · Ronaldo Caiado 4
- **[2026]** cenários separados — Quaest · PA senador/t1 · 2026-07-25 — 2 levantamentos
  s_d91c17880829: Helder Barbalho 21 · Éder Mauro 15 · Zequinha Marinho 12 · Gal Leite 1 · Gizelle Freitas 4 · Marcelino Conti 2
  s_dfbfb7b0bd38: Helder Barbalho 21 · Éder Mauro 14 · Zequinha Marinho 7 · Chicão Melo 4 · Celso Sabino 5 · Gal Leite 0 · Gizelle Freitas 1 · Marcelino Conti 0 · Breno Guimarães 1

## CONFLITO — Conflitos registrados aguardando decisão (442)

Divergências que o pipeline registrou em vez de resolver em silêncio. Cada uma precisa de uma fonte primária ou de uma decisão editorial.

- **[2026]** registration_dates_contradict · s_118355fc693b · fieldwork_end: "2026-08-03" × "2025-08-03"
- **[2026]** registration_dates_contradict · s_c3ea7003b0c2 · fieldwork_end: "2026-02-01" × "2026-01-01"
- **[2026]** registration_dates_contradict · s_01a5b68c7c38 · fieldwork_end: "2026-06-18" × "2026-02-18"
- roster_encolhido_na_fonte · q_6cd45e471741 · results: ["Delcídio do Amaral","Eduardo Riedel","Fábio Trad","Jefferson Bezerra","João Henrique Catan","Lucien Rezende","Renato Gomes"] × ["Delcídio do Amaral","Fábio Trad","Jeferson Bezerra","João Henrique Catan","Lucien Rezende","Renato Gomes"]
- roster_encolhido_na_fonte · q_bfcdf080eab1 · results: ["Daniel Vilela","Luis Cesar Bueno","Marconi Perillo","Telêmaco Brandão","Wilder Morais"] × ["Daniel Vilela","Luis Cesar Bueno","Marconi Perillo","Wilder Morais"]
- roster_encolhido_na_fonte · q_26ca7f89a6ea · results: ["Delcídio do Amaral","Eduardo Riedel","Fábio Trad","Jefferson Bezerra","João Henrique Catan","Lucien Rezende","Renato Gomes"] × ["Eduardo Riedel","Fábio Trad","Jefferson Bezzerra","João Henrique Catan","Lucien Rezende","Renato Gomes"]
- roster_encolhido_na_fonte · q_b609b001b4c2 · results: ["Eduardo Riedel","Fábio Trad","João Henrique Catan","Lucien Rezende"] × ["Eduardo Riedel","Fábio Trad","João Henrique Catan"]
- **[2026]** registration_dates_contradict · s_5995d129ff44 · fieldwork_end: "2026-08-25" × "2025-08-25"
- roster_encolhido_na_fonte · q_2d96afe6a309 · results: ["Ciro Gomes","Eduardo Girão","Elmano de Freitas","Jarir Pereira","Zé Batista"] × ["Ciro Gomes","Eduardo Girão","Elmano de Freitas"]
- roster_encolhido_na_fonte · q_c7e26043c650 · results: ["Ciro Gomes","Eduardo Girão","Elmano de Freitas","Jarir Pereira","Zé Batista"] × ["Ciro Gomes","Eduardo Girão","Elmano de Freitas"]
- roster_encolhido_na_fonte · q_8a59dbce8257 · results: ["Ciro Gomes","Eduardo Girão","Elmano de Freitas","Jarir Pereira","Zé Batista"] × ["Ciro Gomes","Eduardo Girão","Elmano de Freitas"]
- roster_encolhido_na_fonte · q_5ce1df81efd9 · results: ["Ciro Gomes","Eduardo Girão","Elmano de Freitas","Jarir Pereira","Zé Batista"] × ["Ciro Gomes","Eduardo Girão","Elmano de Freitas"]
- roster_encolhido_na_fonte · q_b202c41a9e09 · results: ["Camilo Santana","Eduardo Girão","Jarir Pereira","Roberto Cláudio","Zé Batista"] × ["Camilo Santana","Eduardo Girão","Roberto Cláudio"]
- roster_encolhido_na_fonte · q_20ca93035cad · results: ["Ciro Gomes","Eduardo Girão","Elmano de Freitas","Jarir Pereira"] × ["Ciro Gomes","Eduardo Girão","Elmano de Freitas"]
- roster_encolhido_na_fonte · q_67e9418576fc · results: ["Eduardo Girão","Elmano de Freitas","Jarir Pereira","Roberto Cláudio","Zé Batista"] × ["Eduardo Girão","Elmano de Freitas","Roberto Cláudio"]
- roster_encolhido_na_fonte · q_5d119008ea70 · results: ["Ciro Gomes","Eduardo Girão","Jarir Pereira","Roberto Cláudio"] × ["Ciro Gomes","Eduardo Girão","Roberto Cláudio"]
- roster_encolhido_na_fonte · q_c7b62f97aeea · results: ["Anderson Ferreira","Eduardo da Fonte","Fernando Dueire","Humberto Costa","Jô Cavalcanti","Marília Arraes","Paulo Rubem Santiago","Túlio Gadêlha"] × ["Anderson Ferreira","Eduardo da Fonte","Humberto Costa","Marília Arraes","Túlio Gadêlha"]
- roster_encolhido_na_fonte · q_20b33da428ac · results: ["Eduardo da Fonte","Fernando Dueire","Humberto Costa","Jô Cavalcanti","Marília Arraes","Mendonça Filho","Paulo Rubem Santiago","Túlio Gadêlha"] × ["Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Túlio Gadêlha"]
- roster_encolhido_na_fonte · q_292e1832d378 · results: ["Cícero Lucena","Efraim Filho","Lucas Ribeiro","Olímpio Rocha"] × ["Cícero Lucena","Efraim Filho","Lucas Ribeiro"]
- roster_encolhido_na_fonte · q_539cc33805a9 · results: ["Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Iure Castro","Vanderlan Cardoso","Zacharias Calil"] × ["Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_1b0ae911bbb4 · results: ["Carlos Sant'anna","Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Paulo Rubem Santiago","Túlio Gadêlha"] × ["Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Paulo Rubem Santiago","Túlio Gadelha"]
- roster_encolhido_na_fonte · q_bf2208b4e179 · results: ["Ciro Gomes","Delegado Huggo Leonardo","Elmano de Freitas","Vera Lúcia","Zé Batista"] × ["Ciro Gomes","Elmano de Freitas"]
- roster_encolhido_na_fonte · q_f881dcbce7b6 · results: ["Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_c966a8bd730c · results: ["Alexandre Baldy","Gracinha Caiado","Gustavo Gayer","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_4981ab6cc3d2 · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_9ddae7b4155c · results: ["Anderson Ferreira","Fernando Dueire","Humberto Costa","Jô Cavalcanti","Marília Arraes","Miguel Coelho","Paulo Rubem Santiago","Túlio Gadêlha"] × ["Anderson Ferreira","Humberto Costa","Marília Arraes","Miguel Coelho","Túlio Gadêlha"]
- roster_encolhido_na_fonte · q_3c2647e7ff57 · results: ["Fernando Dueire","Humberto Costa","Marília Arraes","Mendonça Filho","Paulo Rubem Santiago","Túlio Gadêlha"] × ["Humberto Costa","Marília Arraes","Mendonça Filho","Túlio Gadêlha"]
- roster_encolhido_na_fonte · q_bd71a3ab66af · results: ["Ciro Gomes","Delegado Huggo Leonardo","Elmano de Freitas","Zé Batista"] × ["Ciro Gomes","Elmano de Freitas"]
- roster_encolhido_na_fonte · q_277b9c0cfa36 · results: ["Eduardo da Fonte","Fernando Dueire","Humberto Costa","Marília Arraes","Mendonça Filho","Miguel Coelho","Paulo Rubem Santiago","Silvio Nascimento"] × ["Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Miguel Coelho","Paulo Rubem Santiago","Silvio Nascimento"]
- roster_encolhido_na_fonte · q_c421e090bc6f · results: ["Carlos Sant'anna","Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Paulo Rubem Santiago","Túlio Gadêlha"] × ["Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Túlio Gadêlha"]
- roster_encolhido_na_fonte · q_98be0c3e1086 · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_962d8f84ab0b · results: ["André Fufuca","Cidônio Gonçalves","Eliziane Gama","Enilton Rodrigues","Hilton Gonçalo","Lahesio Bonfim","Roseana Sarney","Simplício Araújo","Weverton Rocha"] × ["André Fufuca","Cidônio Gonçalves","Eliziane Gama","Hilton Gonçalo","Lahesio Bonfim","Roseana Sarney","Weverton Rocha"]
- roster_encolhido_na_fonte · q_26224cd635bb · results: ["Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_b97a498bf688 · results: ["Fernando Dueire","Humberto Costa","Jô Cavalcanti","Marília Arraes","Mendonça Filho","Miguel Coelho","Paulo Rubem Santiago","Túlio Gadêlha"] × ["Humberto Costa","Marília Arraes","Mendonça Filho","Miguel Coelho","Túlio Gadêlha"]
- roster_encolhido_na_fonte · q_8559174b7766 · results: ["Anderson Ferreira","Armando Monteiro Neto","Eduardo da Fonte","Fernando Dueire","Gilson Machado Neto","Humberto Costa","Jô Cavalcanti","Marília Arraes","Miguel Coelho","Silvio Costa Filho"] × ["Anderson Ferreira","Armando Monteiro Neto","Eduardo da Fonte","Gilson Machado Neto","Humberto Costa","Marília Arraes","Miguel Coelho","Silvio Costa Filho"]
- roster_encolhido_na_fonte · q_d1834e01cb39 · results: ["Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["João Henrique Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_e42bb347515f · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_6a0acfe7dc92 · results: ["Daniel Vilela","Luis Cesar Bueno","Marconi Perillo","Telêmaco Brandão","Wilder Morais"] × ["Daniel Vilela","Luis Cesar Bueno","Marconi Perillo","Wilder Morais"]
- roster_encolhido_na_fonte · q_8e4754dc4822 · results: ["Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["João Henrique Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_1d0f78acf0f6 · results: ["Cícero Lucena","Efraim Filho","Lucas Ribeiro","Olímpio Rocha"] × ["Cícero Lucena","Efraim Filho","Lucas Ribeiro"]
- roster_encolhido_na_fonte · q_ed43c1950927 · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_56a8d437dcc3 · results: ["Fernando Dueire","Humberto Costa","Marília Arraes","Mendonça Filho","Miguel Coelho","Túlio Gadêlha"] × ["Humberto Costa","Marília Arraes","Mendonça Filho","Miguel Coelho","Túlio Gadêlha"]
- roster_encolhido_na_fonte · q_671b527ab8ee · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_71634e2616f0 · results: ["Carlos Sant'anna","Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Paulo Rubem Santiago","Túlio Gadêlha"] × ["Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Túlio Gadêlha"]
- roster_encolhido_na_fonte · q_c0d11a0db983 · results: ["Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["João Henrique Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_1b1f82e34031 · results: ["Eduardo da Fonte","Fernando Dueire","Humberto Costa","Marília Arraes","Mendonça Filho","Túlio Gadêlha"] × ["Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Túlio Gadêlha"]
- roster_encolhido_na_fonte · q_88ff84559c7c · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_2008e41fa341 · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_cb1b2c2da61e · results: ["Cícero Lucena","Efraim Filho","Lucas Ribeiro","Olímpio Rocha"] × ["Cícero Lucena","Efraim Filho","Lucas Ribeiro"]
- roster_encolhido_na_fonte · q_955640f20f29 · results: ["Cícero Lucena","Efraim Filho","Lucas Ribeiro","Olímpio Rocha"] × ["Cícero Lucena","Efraim Filho","Lucas Ribeiro"]
- roster_encolhido_na_fonte · q_3ac45303b59e · results: ["Ciro Gomes","Delegado Huggo Leonardo","Elmano de Freitas","Zé Batista"] × ["Ciro Gomes","Elmano de Freitas"]
- roster_encolhido_na_fonte · q_4a260d2e7803 · results: ["Cícero Lucena","Efraim Filho","Lucas Ribeiro","Olímpio Rocha"] × ["Cícero Lucena","Efraim Filho","Lucas Ribeiro"]
- roster_encolhido_na_fonte · q_c830a7966bec · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_510cff0a523a · results: ["André Luís","Eduardo Braide","Felipe Camarão","Orleans Brandão","Roberto Rocha"] × ["Eduardo Braide","Felipe Camarão","Orleans Brandão","Roberto Rocha"]
- roster_encolhido_na_fonte · q_f0a53df9ed37 · results: ["André Luís","Eduardo Braide","Felipe Camarão","Orleans Brandão","Roberto Rocha"] × ["Eduardo Braide","Felipe Camarão","Orleans Brandão","Roberto Rocha"]
- roster_encolhido_na_fonte · q_a01c59b5a59c · results: ["André Luís","Eduardo Braide","Felipe Camarão","Orleans Brandão","Roberto Rocha"] × ["Eduardo Braide","Felipe Camarão","Orleans Brandão","Roberto Rocha"]
- roster_encolhido_na_fonte · q_b15a71e0a4fe · results: ["Erika Hilton","Felipe d'Avila","Kim Kataguiri","Márcio França","Paulo Serra","Tarcísio de Freitas"] × ["Luiz Felipe d'Avila","Márcio França","Paulo Serra","Tarcísio de Freitas"]
- roster_encolhido_na_fonte · q_9bd98062b135 · results: ["ACM Neto","João Roma","Kleber Rosa","Rui Costa"] × ["ACM Neto","João Roma","Rui Costa"]
- roster_encolhido_na_fonte · q_91c680d7ce70 · results: ["Antonio Barros","Antonio José Lira","Ciro Nogueira","Dionísio Piauí","Francinaldo Leão","Jorge Lopes","Júlio César de Carvalho Lima","Major Paulo Roberto","Marcelo Castro","Ravenna Castro","Tiago Junqueira"] × ["Antonio Barros","Antonio José Lira","Ciro Nogueira","Dionísio Piauí","Francinaldo Leão","Major Paulo Roberto","Marcelo Castro","Ravenna Castro","Tiago Junqueira"]
- roster_encolhido_na_fonte · q_591df14a32fe · results: ["Ciro Nogueira","Francinaldo Leão","Jorge Lopes","Júlio César de Carvalho Lima","Marcelo Castro","Pedro Laurentino","Tiago Junqueira"] × ["Ciro Nogueira","Júlio César de Carvalho Lima","Marcelo Castro","Tiago Junqueira"]
- roster_encolhido_na_fonte · q_2c849777b201 · results: ["Ciro Nogueira","Francinaldo Leão","Jorge Lopes","Júlio César de Carvalho Lima","Marcelo Castro","Tiago Junqueira"] × ["Ciro Nogueira","Francinaldo Leão","Júlio César","Marcelo Castro","Tiago Junqueira"]
- roster_encolhido_na_fonte · q_f1f594e281a8 · results: ["Ciro Nogueira","Francinaldo Leão","Jorge Lopes","Júlio César de Carvalho Lima","Marcelo Castro","Pedro Laurentino","Tiago Junqueira"] × ["Ciro Nogueira","Francinaldo Leão","Júlio César","Marcelo Castro","Pedro Laurentino","Tiago Junqueira"]
- roster_encolhido_na_fonte · q_43fe99b1b3a4 · results: ["Dra. Lúcia Santos","Elizeu Aguiar","Joel Rodrigues da Silva","Lourdes Melo","Mainha","Rafael Fonteles","Toni Rodrigues"] × ["Joel Rodrigues","Jornalista Toni Rodrigues","Mainha","Rafael Fonteles"]
- roster_encolhido_na_fonte · q_467e358a9db5 · results: ["ACM Neto","Jerônimo Rodrigues","João Roma","Kleber Rosa"] × ["ACM Neto","Jerônimo Rodrigues","João Roma"]
- roster_encolhido_na_fonte · q_538ca2ca45ad · results: ["ACM Neto","Jerônimo Rodrigues","João Roma","Kleber Rosa"] × ["ACM Neto","Jerônimo Rodrigues","João Roma"]
- roster_encolhido_na_fonte · q_ea149f2c1842 · results: ["ACM Neto","Jerônimo Rodrigues","José Carlos Aleluia","Ronaldo Mansur"] × ["ACM Neto","Jerônimo Rodrigues","Ronaldo Mansur"]
- roster_encolhido_na_fonte · q_a0825829f215 · results: ["Coronel Hélio","Rafael Motta","Samanda de Lula","Sandro Pimentel","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio","Rafael Motta","Samanda de Lula","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_e1a92b516bfe · results: ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Robério Paulino","Rodrigo Bolsonaro","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Álvaro Costa Dias"]
- roster_encolhido_na_fonte · q_20a754f7a52a · results: ["Coronel Hélio","Rafael Motta","Samanda de Lula","Sandro Pimentel","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio","Rafael Motta","Samanda de Lula","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_7cc37ad4eb3a · results: ["Arthur Lira","Davi Davino Filho","Paulão do PT","Renan Calheiros","Ítalo Bonja"] × ["Arthur Lira","Davi Davino Filho","Paulão do PT","Renan Calheiros"]
- roster_encolhido_na_fonte · q_0a587cd4c025 · results: ["Allyson Bezerra","Cadu de Lula","Robério Paulino","Rodrigo Bolsonaro","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Robério Paulino","Álvaro Dias"]
- roster_encolhido_na_fonte · q_5446f4cef2bf · results: ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Robério Paulino","Rodrigo Bolsonaro","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Rodrigo Vieira","Álvaro Dias"]
- roster_encolhido_na_fonte · q_b8fbce1566c7 · results: ["Coronel Hélio","Luciana Lima","Rafael Motta","Rosália Fernandes","Samanda de Lula","Sandro Pimentel","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio Oliveira","Rafael Motta","Rosália Fernandes","Sandro Pimental","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_9161a68b01b3 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_915127c2fc9c · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_76449517807e · results: ["Augusto Cury","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_4479bba718ab · results: ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Robério Paulino","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Álvaro Costa Dias"]
- roster_encolhido_na_fonte · q_75c65043732e · results: ["Allyson Bezerra","Cadu de Lula","Robério Paulino","Rodrigo Bolsonaro","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Robério Paulino","Álvaro Dias"]
- roster_encolhido_na_fonte · q_9450bfc2568f · results: ["Coronel Hélio","Ezequiel Ferreira","Jean Paul Prates","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio","Jean Paul Prates","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_49f669560a10 · results: ["Coronel Hélio","Luciana Lima","Rafael Motta","Rosália Fernandes","Samanda de Lula","Sandro Pimentel","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio","Rafael Motta","Samanda de Lula","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_9075f3691f79 · results: ["Coronel Hélio","Rafael Motta","Samanda de Lula","Sandro Pimentel","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio","Rafael Motta","Samanda de Lula","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_92e328a3bae9 · results: ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Robério Paulino","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Álvaro Costa Dias"]
- roster_encolhido_na_fonte · q_8cdbe4477112 · results: ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Robério Paulino","Rodrigo Bolsonaro","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Robério Paulino"]
- roster_encolhido_na_fonte · q_c131e594ca58 · results: ["Coronel Hélio","Jean Paul Prates","Rafael Motta","Samanda de Lula","Sandro Pimentel","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio","Jean Paul Prates","Rafael Motta","Samanda de Lula","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_bc9cb3788da4 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_de2e0bf0d4fd · results: ["Coronel Hélio","Luciana Lima","Rafael Motta","Rosália Fernandes","Samanda de Lula","Sandro Pimentel","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio","Rafael Motta","Samanda de Lula","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_b2332206ba0c · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_25f469023e7c · results: ["Alfredo Gaspar","Arthur Lira","Davi Davino Filho","Paulão do PT","Renan Calheiros","Ítalo Bonja"] × ["Alfredo Gaspar","Arthur Lira","Davi Davino Filho","Paulão do PT","Renan Calheiros"]
- roster_encolhido_na_fonte · q_df271f2f3b4b · results: ["Coronel Hélio","Luciana Lima","Rafael Motta","Rosália Fernandes","Samanda de Lula","Sandro Pimentel","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio","Rafael Motta","Samanda de Lula","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_5bf18ed5f970 · results: ["Alfredo Gaspar","Arthur Lira","Paulão do PT","Renan Calheiros","Ítalo Bonja"] × ["Alfredo Gaspar","Arthur Lira","Paulão do PT","Renan Calheiros"]
- roster_encolhido_na_fonte · q_40997e6f03a4 · results: ["Coronel Hélio","Jean Paul Prates","Sandro Pimentel","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio","Jean Paul Prates","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_dc720b8b3046 · results: ["Augusto Cury","Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_a1c412ff84f1 · results: null × ["Elmano de Freitas"]
- segundo_turno_fragmento_descartado · q_ac09b83b944b · results: null × ["Fernando Haddad"]
- roster_encolhido_na_fonte · q_6ba168c1d936 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"]
- roster_encolhido_na_fonte · q_49fc6f4c25e0 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_6de92bdf5f6a · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_c07ef47114bc · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_0a2c2a5a3f19 · results: ["Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_85ebca1221fd · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_e1f52e29d9ad · results: ["Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Tereza Cristina"] × ["Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado","Tereza Cristina"]
- roster_encolhido_na_fonte · q_e42b96ca0211 · results: ["Augusto Cury","Cabo Daciolo","Joaquim Barbosa","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Joaquim Barbosa","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_a89e594a578a · results: ["Beto do Movimento","Daniel Junior","Reinaldo Azambuja","Renan Contar","Soraya Thronicke","Vander Loubet"] × ["Reinaldo Azambuja","Renan Contar","Soraya Thronicke","Vander Loubet"]
- roster_encolhido_na_fonte · q_8e6309a86856 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"]
- roster_encolhido_na_fonte · q_8f2e1a303de5 · results: ["Alcides Fernandes","Capitão Wagner","Cid Gomes","General Theóphilo","Luizianne Lins"] × ["Alcides Fernandes","Capitão Wagner","Cid Gomes","Luizianne Lins"]
- roster_encolhido_na_fonte · q_5de2fc5860a7 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_4e8c18c2c862 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_4a167b2be3c2 · results: ["Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"] × ["Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"]
- roster_encolhido_na_fonte · q_ee77bbc181b9 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_d3f07ab08def · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Ciro Gomes","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_dcc905454808 · results: ["Ciro Gomes","Helder Barbalho","Lula","Michelle Bolsonaro","Ratinho Jr","Renan Santos","Ronaldo Caiado"] × ["Ciro Gomes","Helder Barbalho","Lula","Michelle Bolsonaro","Ratinho Jr","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_239589cef769 · results: null × ["Fernando Haddad"]
- segundo_turno_fragmento_descartado · q_b5e35fd87097 · results: null × ["Rogério Marinho"]
- segundo_turno_fragmento_descartado · q_1a2e8aa7006b · results: null × ["Romeu Zema"]
- segundo_turno_fragmento_descartado · q_1be932800a31 · results: null × ["Eduardo Braide"]
- segundo_turno_fragmento_descartado · q_993c5845051c · results: null × ["Jerônimo Rodrigues"]
- roster_encolhido_na_fonte · q_81490eb5f9cb · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_dfdc9efc0fe4 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_18430aeb5f79 · results: ["Emanuel Cacho","Fábio Mitidieri","Ricardo Marques","Valmir de Francisquinho"] × ["Fábio Mitidieri","Ricardo Marques","Valmir de"]
- roster_encolhido_na_fonte · q_89cd08322e74 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_f6540230ffe2 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_b6a6a7d7813e · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_cbae6439e561 · results: ["Eduardo Moura","Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["Eduardo Moura","Ivan Moraes","Raquel Lyra"]
- roster_encolhido_na_fonte · q_512acc84d2fe · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_835a5d595f99 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_c8624b193313 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_ea96cb3988a9 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_269e9d2e1a03 · results: ["ACM Neto","Jerônimo Rodrigues","Ronaldo Mansur"] × ["Jerônimo Rodrigues","Ronaldo Mansur"]
- roster_encolhido_na_fonte · q_8915397b1682 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_77efb88b792b · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_6b23cf27cdf7 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_25f6cc7d21cf · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_1b41dff00c9b · results: ["Alcides Fernandes","Capitão Wagner","Cid Gomes","General Theóphilo","Luizianne Lins"] × ["Alcides Fernandes","Capitão Wagner","Cid Gomes","Luizianne Lins"]
- roster_encolhido_na_fonte · q_71d9a35caaf2 · results: ["Augusto Cury","Flávio Bolsonaro","Renan Santos","Romeu Zema"] × ["Augusto Cury","Flávio Bolsonaro","Romeu Zema"]
- roster_encolhido_na_fonte · q_b2655c58379f · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_f6f883c79f82 · results: ["ACM Neto","Aroldo Félix","Jerônimo Rodrigues","Ronaldo Mansur"] × ["Jerônimo Rodrigues","Prof. Aroldo Félix","Ronaldo Mansur"]
- roster_encolhido_na_fonte · q_009899a2312a · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Heró Bezerra","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Heró Bezerra","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_cf781de41eca · results: ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_e6cdb8370bf0 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_8dcbec59bd60 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_3e06027e1e56 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_e79b40d52797 · results: ["Antônio Galvan","Carlos Fávaro","Coronel Darwin","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"] × ["Carlos Fávaro","Galvan","Janaína Riva","José Medeiros","Mauro Mendes","Pedro Taques"]
- roster_encolhido_na_fonte · q_37985d172d5c · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_d2fb4f76e5c8 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_248fb8b83435 · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_d47ad041c68c · results: null × ["Dr. Daniel"]
- roster_encolhido_na_fonte · q_553f17dcc0dc · results: ["Eduardo Moura","Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["Ivan Moraes","João Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_b24eca7a7ee0 · results: ["ACM Neto","Jerônimo Rodrigues","Ronaldo Mansur"] × ["ACM Neto","Jerônimo Rodrigues"]
- segundo_turno_fragmento_descartado · q_b0be927cda0d · results: null × ["Lula"]
- segundo_turno_fragmento_descartado · q_ad202740d448 · results: null × ["Jerônimo Rodrigues"]
- segundo_turno_fragmento_descartado · q_b252195a7be1 · results: null × ["Hildon Chaves"]
- **[2026]** survey_id_orphaned · s_90afbeb0480d · survey_id: "s_90afbeb0480d" × null
- roster_encolhido_na_fonte · q_4c6082c23edb · results: ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_c450356f51e3 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_dd275c65c0e9 · results: ["Emanuel Cacho","Fábio Mitidieri","Ricardo Marques","Valmir de Francisquinho"] × ["Fábio Mitidieri","Ricardo Marques","Valmir de"]
- roster_encolhido_na_fonte · q_58e33566935c · results: ["Eduardo Moura","Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["João Henrique Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_ac3ae52c5b52 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- **[2026]** survey_id_orphaned · s_9e5f4f2696f1 · survey_id: "s_9e5f4f2696f1" × null
- roster_encolhido_na_fonte · q_e684cb7a2404 · results: ["Augusto Cury","Hertz Dias","Lula","Renan Santos","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Hertz Dias","Lula","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_14b40b60cca8 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_b8d1508402c4 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- **[2026]** registration_dates_contradict · s_d42238b605d5 · fieldwork_end: "2026-09-17" × "2025-09-17"
- **[2026]** survey_id_orphaned · s_8da2e8519711 · survey_id: "s_8da2e8519711" × null
- roster_encolhido_na_fonte · q_f34fa28ad565 · results: ["Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["João Henrique Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_21d35eea85fc · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_2dd9cc0863b2 · results: null × ["Fernando Haddad"]
- roster_encolhido_na_fonte · q_96ee49beeeb0 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_ed3095dad3b9 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- **[2026]** survey_id_orphaned · s_25114ea903ab · survey_id: "s_25114ea903ab" × null
- roster_encolhido_na_fonte · q_7e34f7fded38 · results: ["Augusto Cury","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_66a2c0b7f86a · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_ad25dff34bc3 · results: ["Celina Leão","Izalci Lucas","José Roberto Arruda","Leandro Grass","Paula Belmonte","Ricardo Cappelli"] × ["Celina Leão","Izalci Lucas","Leandro Grass","Paula Belmonte","Ricardo Cappelli"]
- roster_encolhido_na_fonte · q_4e4475bcd6d2 · results: ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema"]
- roster_encolhido_na_fonte · q_76a4cac858ef · results: ["Beto do Movimento","Daniel Junior","Nelsinho Trad","Reinaldo Azambuja","Renan Contar","Soraya Thronicke","Vander Loubet"] × ["Beto do Movimento","Capitão Contar","Nelsinho Trad","Reinaldo Azambuja","Soraya Thronicke","Vander Loubet"]
- roster_encolhido_na_fonte · q_d22d72518db9 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_e60114595a89 · results: ["Aldo Rebelo","Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_61f93a9d7d7e · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_152afa8217b3 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_58bf37879da5 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_296c72e9fa35 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_3aedf0fbae60 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_801c0e1120f2 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_a1f7556da067 · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_036d0960bb0c · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- segundo_turno_fragmento_descartado · q_5478e9a7a3da · results: null × ["Felipe Curi"]
- roster_encolhido_na_fonte · q_2560fc17569b · results: ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_796424a16a7b · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_e32970151a27 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_85352453a957 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- segundo_turno_fragmento_descartado · q_8fc2a21e22f5 · results: null × ["Lula"]
- roster_encolhido_na_fonte · q_a64b5e6f0fd2 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr"]
- roster_encolhido_na_fonte · q_de2d516f8e2c · results: ["Coronel Hélio","Rafael Motta","Samanda de Lula","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio","Rafael Motta","Styvenson Valentim","Zenaide Maia"]
- segundo_turno_fragmento_descartado · q_ebe16e999c23 · results: null × ["Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_799ce382b058 · results: null × ["Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_36dff5533cfb · results: ["Augusto Cury","Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_a02b7a8c48d1 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_d564faa897ba · results: ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Helder Barbalho","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Helder Barbalho","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_a21b90ed7e9f · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_9943e1e83400 · results: ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_c2c319987cd0 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_084db535e9ad · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Michel Temer","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_3a991e7e862f · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_ad8c763f9be7 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_453f0563332f · results: ["Ciro Gomes","Helder Barbalho","Jair Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Ciro Gomes","Helder Barbalho","Jair Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_16c8e8efcbd8 · results: ["Alcides Fernandes","Capitão Wagner","Cid Gomes","General Theóphilo","Luizianne Lins"] × ["Alcides Fernandes","Capitão Wagner","Cid Gomes","Luizianne Lins"]
- roster_encolhido_na_fonte · q_4514bb412212 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_e2adebb428e9 · results: ["Augusto Cury","Lula","Michelle Bolsonaro","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Lula","Michelle Bolsonaro","Romeu Zema","Ronaldo Caiado"]
- **[2026]** survey_id_orphaned · s_0eb23a8be234 · survey_id: "s_0eb23a8be234" × null
- roster_encolhido_na_fonte · q_901fd5e66eff · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_c980bd639db2 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_be3fd6526eb3 · results: null × ["Romeu Zema"]
- segundo_turno_fragmento_descartado · q_cdbc6efc0189 · results: null × ["Washington Reis"]
- roster_encolhido_na_fonte · q_0a3cf8ee73d2 · results: ["Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_c5fd5c9977bf · results: ["Ciro Gomes","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Ciro Gomes","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_0aa1e16cb21d · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- segundo_turno_fragmento_descartado · q_57db3b1f2ad7 · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_0ff86f031b4a · results: ["Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_773c8f373fa6 · results: null × ["Tarcísio de Freitas"]
- segundo_turno_fragmento_descartado · q_f5115233c19c · results: null × ["Lula"]
- roster_encolhido_na_fonte · q_d4b6ddf9854f · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_670daab792ea · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_1f82fbe07eda · results: ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_4eccd9b5e4d8 · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_cee67dba9537 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_81d2838b18bd · results: ["Flávio Bolsonaro","Lula","Renan Santos","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_ae9b4b3b0ddd · results: null × ["Raquel Lyra"]
- segundo_turno_fragmento_descartado · q_77f2b2d026aa · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_c583a8161a27 · results: ["Augusto Cury","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_aa68def3efff · results: ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins","Veterinário Wilson Grassi"]
- **[2026]** survey_id_orphaned · s_6344214422a2 · survey_id: "s_6344214422a2" × null
- segundo_turno_fragmento_descartado · q_ba7ae552d4c8 · results: null × ["Natasha Slhessarenko"]
- roster_encolhido_na_fonte · q_475e0c08eeb9 · results: ["Antônio Galvan","Carlos Fávaro","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"] × ["Carlos Fávaro","Galvan","Janaína Riva","José Medeiros","Mauro Mendes","Pedro Taques"]
- roster_encolhido_na_fonte · q_2d7578147ec0 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_fe97220ed137 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_6be35404e4c7 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_ad51df5d2db7 · results: null × ["Romeu Zema"]
- roster_encolhido_na_fonte · q_52dbe67df339 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema"]
- segundo_turno_fragmento_descartado · q_c9de327cf92f · results: null × ["Romeu Zema"]
- roster_encolhido_na_fonte · q_af281d0eafce · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_90f521cc74f0 · results: ["Eduardo Moura","Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["João Henrique Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_dde3b6ccc3b1 · results: ["Emanuel Cacho","Fábio Mitidieri","Ricardo Marques","Valmir de Francisquinho"] × ["Fábio Mitidieri","Ricardo Marques","Valmir de"]
- roster_encolhido_na_fonte · q_6612d7f66167 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_08b1df8e9cff · results: ["Alessandro Vieira","André David","André Moura","Coronel Rocha","Eduardo Amorim","Edvaldo Nogueira","Iran Barbosa","Paulinho da União Tur","Renatinha","Rodrigo Valadares","Rogério Carvalho"] × ["André Moura","Coronel Rocha","Delegado Alessandro","Delegado André David","Eduardo Amorim","Edvaldo Nogueira","Professor Iran Barbosa","Rodrigo Valadares","Rogério Carvalho"]
- segundo_turno_fragmento_descartado · q_f62e57de2a28 · results: null × ["Rafael Greca"]
- segundo_turno_fragmento_descartado · q_55b62a81a275 · results: null × ["Dr Daniel"]
- roster_encolhido_na_fonte · q_c0e326eb9ea5 · results: ["Bia Kicis","Erika Kokay","Leila Barros","Michelle Bolsonaro","Rafael Prudente","Sebastião Coelho"] × ["Bia Kicis","Erika Kokay","Leila Barros","Rafael Prudente","Sebastião Coelho"]
- roster_encolhido_na_fonte · q_207886a50c63 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_02d67c10c016 · results: null × ["Cadu de Lula"]
- roster_encolhido_na_fonte · q_3fef5dca2275 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_75c06bdfe901 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_96ad663048b1 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_9bcd10e07ac4 · results: null × ["Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_0b86e870200f · results: ["Jair Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Jair Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_5cb3c30af9b6 · results: ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_dd7f526427c8 · results: ["Beto do Movimento","Daniel Junior","Reinaldo Azambuja","Renan Contar","Soraya Thronicke","Vander Loubet"] × ["Reinaldo Azambuja","Renan Contar","Soraya Thronicke","Vander Loubet"]
- roster_encolhido_na_fonte · q_425b662fbc31 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_3da9ddab5f7d · results: ["Alcides Fernandes","Capitão Wagner","Cid Gomes","General Theóphilo","Luizianne Lins"] × ["Alcides Fernandes","Capitão Wagner","Cid Gomes","Luizianne Lins"]
- segundo_turno_fragmento_descartado · q_7407d3e4846b · results: null × ["Aécio Neves"]
- roster_encolhido_na_fonte · q_10962d98c491 · results: ["Aldo Rebelo","Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_5b1e67451007 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_1c3f1bd9253f · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_91b582ebd463 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_5baa51b1207a · results: ["ACM Neto","Jerônimo Rodrigues","Ronaldo Mansur"] × ["ACM Neto","Jerônimo Rodrigues"]
- roster_encolhido_na_fonte · q_f9e3166f918d · results: ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"]
- roster_encolhido_na_fonte · q_e8df28b8d869 · results: ["Antônio Galvan","Carlos Fávaro","Coronel Darwin","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"] × ["Carlos Fávaro","Galvan","Janaína Riva","José Medeiros","Mauro Mendes","Pedro Taques"]
- roster_encolhido_na_fonte · q_0fafc7baadb6 · results: ["Alcides Fernandes","Capitão Wagner","Cid Gomes","General Theóphilo","Luizianne Lins"] × ["Alcides Fernandes","Capitão Wagner","Cid Gomes","Luizianne Lins"]
- roster_encolhido_na_fonte · q_586ae5daa331 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_955adc45e05c · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_95b091f36c4e · results: null × ["Garotinho"]
- roster_encolhido_na_fonte · q_8170e7c2d7ce · results: ["Alcides Fernandes","Capitão Wagner","Cid Gomes","General Theóphilo","Luizianne Lins"] × ["Alcides Fernandes","Capitão Wagner","Cid Gomes","Luizianne Lins"]
- segundo_turno_fragmento_descartado · q_ce5fb47b8d36 · results: null × ["João Rodrigues"]
- roster_encolhido_na_fonte · q_0baafa19d5e9 · results: ["Augusto Cury","Cabo Daciolo","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Cabo Daciolo","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"]
- segundo_turno_fragmento_descartado · q_399d6b8553cf · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_444d85c3a9d5 · results: ["Eduardo Moura","Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["João Henrique Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_02b44b5d135b · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- **[2026]** survey_id_orphaned · s_99f4b1d1b430 · survey_id: "s_99f4b1d1b430" × null
- roster_encolhido_na_fonte · q_0cfbedbd52cb · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_282dbd67fe34 · results: ["Antônio Galvan","Carlos Fávaro","Coronel Darwin","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"] × ["Antonio Galvan","Carlos Fávaro","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"]
- roster_encolhido_na_fonte · q_669f95e746b9 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- segundo_turno_fragmento_descartado · q_347f182f0935 · results: null × ["Thiago de Joaldo"]
- roster_encolhido_na_fonte · q_2cbe2202f486 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_966e66a7ff83 · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_2c4a1f4c591a · results: ["Alcides Fernandes","Capitão Wagner","Cid Gomes","General Theóphilo","Luizianne Lins"] × ["Alcides Fernandes","Capitão Wagner","Cid Gomes","Luizianne Lins"]
- roster_encolhido_na_fonte · q_73426bfec899 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_692229d147d0 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_a353134e049a · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_eb3c3fde46d2 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_d3bf281c841b · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_d07821435332 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_688511bd5e95 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- segundo_turno_fragmento_descartado · q_d71611740e13 · results: null × ["Joel Rodrigues"]
- roster_encolhido_na_fonte · q_7f18f1f577b4 · results: ["Augusto Cury","Pablo Marçal","Renan Santos","Ronaldo Caiado"] × ["Augusto Cury","Pablo Marçal","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_42bd085c8cf0 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_305d87da30ba · results: ["Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_5bd6c913a344 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_4796f99646c5 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_732af9861a54 · results: ["Emanuel Cacho","Fábio Mitidieri","Ricardo Marques","Valmir de Francisquinho"] × ["Fábio Mitidieri","Ricardo Marques","Valmir de"]
- roster_encolhido_na_fonte · q_3ae576703133 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_3a574dbd8995 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_3c9f49c78eb7 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_1ad374648d96 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_927f0943b3a0 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins","Veterinário Wilson Grassi"]
- **[2026]** survey_id_orphaned · s_7d95a50885f5 · survey_id: "s_7d95a50885f5" × null
- roster_encolhido_na_fonte · q_bc5d503ee6d5 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_417b2a4b75c6 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema","Tereza Cristina"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema","Tereza Cristina"]
- roster_encolhido_na_fonte · q_898b5cde320f · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_fbc5b96b7b71 · results: ["Alcides Fernandes","Capitão Wagner","Cid Gomes","General Theóphilo","Luizianne Lins"] × ["Alcides Fernandes","Capitão Wagner","Cid Gomes","Luizianne Lins"]
- roster_encolhido_na_fonte · q_bb83475f2704 · results: ["ACM Neto","Jerônimo Rodrigues","Ronaldo Mansur"] × ["ACM Neto","Jerônimo Rodrigues"]
- roster_encolhido_na_fonte · q_1dbe234e6eed · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema"] × ["Flávio Bolsonaro","Lula","Romeu Zema"]
- roster_encolhido_na_fonte · q_21de0e1108f4 · results: ["ACM Neto","Jerônimo Rodrigues","Ronaldo Mansur"] × ["ACM Neto","Jerônimo Rodrigues"]
- roster_encolhido_na_fonte · q_21081fdd33a5 · results: ["Alan Rick","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Tião Bocalom"]
- roster_encolhido_na_fonte · q_12a567ff5564 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- candidate_id_orphaned · c_e8e8037d15ca · candidate_id: "c_e8e8037d15ca" × null
- segundo_turno_fragmento_descartado · q_9c68fe93da57 · results: null × ["Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_d8e1a24ce304 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_0588add73ef1 · results: ["Augusto Cury","Ciro Gomes","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Ciro Gomes","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_28be25798b48 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_483765e5350a · results: ["Alessandro Vieira","André David","André Moura","Coronel Rocha","Eduardo Amorim","Edvaldo Nogueira","Iran Barbosa","Rodrigo Valadares","Rogério Carvalho"] × ["Alessandro Vieira","André David","André Moura","Coronel Rocha","Eduardo Amorim","Edvaldo Nogueira","Rodrigo Valadares","Rogério Carvalho"]
- roster_encolhido_na_fonte · q_81c29270c61d · results: ["Antônio Galvan","Carlos Fávaro","Coronel Darwin","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"] × ["Carlos Fávaro","Galvan","Janaína Riva","José Medeiros","Mauro Mendes","Pedro Taques"]
- roster_encolhido_na_fonte · q_b683f7e13ea1 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_320a65db0faa · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Ciro Gomes","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Ciro Gomes","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- **[2026]** survey_id_orphaned · s_ac3f9055bb23 · survey_id: "s_ac3f9055bb23" × null
- **[2026]** survey_id_orphaned · s_5f1a87b1844e · survey_id: "s_5f1a87b1844e" × null
- roster_encolhido_na_fonte · q_6b3190c7e830 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_18d8668c5552 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_36af75ad4240 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_48da9ab549ba · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema"] × ["Flávio Bolsonaro","Lula","Romeu Zema"]
- roster_encolhido_na_fonte · q_3d782fd8f00a · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_aff17056bfa5 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_a3cd7d2f7803 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema","Tereza Cristina"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema","Tereza Cristina"]
- roster_encolhido_na_fonte · q_a26b8c32046e · results: ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_4e7fde32c60f · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_d4f0c065ba5c · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Pablo Marçal","Ratinho Jr.","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Pablo Marçal","Ratinho Jr.","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_c33c25b9e5c6 · results: null × ["Helder Salomão"]
- **[2026]** survey_id_orphaned · s_e17a41f9f3f7 · survey_id: "s_e17a41f9f3f7" × null
- roster_encolhido_na_fonte · q_c391a6a4411c · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_0a90e0647b08 · results: null × ["Flávio Bolsonaro"]
- segundo_turno_fragmento_descartado · q_43b68ea96389 · results: null × ["Romeu Zema"]
- roster_encolhido_na_fonte · q_4c9c41a91c94 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"]
- segundo_turno_fragmento_descartado · q_3a2e3e731373 · results: null × ["Lula"]
- **[2026]** survey_id_orphaned · s_571deb64be7e · survey_id: "s_571deb64be7e" × null
- roster_encolhido_na_fonte · q_353f2c63176f · results: ["Delcídio do Amaral","Economista Renato Gomes","Eduardo Riedel","Fábio Trad","João Henrique Catan"] × ["Delcídio do Amaral","Eduardo Riedel","Fábio Trad","João Henrique Catan"]
- segundo_turno_fragmento_descartado · q_375f2aff5137 · results: null × ["Helder Salomão"]
- roster_encolhido_na_fonte · q_3bf49b90bc18 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_f84989ed1dcb · results: ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_142066765153 · results: ["Augusto Cury","Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_dd67a6483e05 · results: null × ["Lula"]
- roster_encolhido_na_fonte · q_4b210ebad952 · results: ["Antônio Galvan","Carlos Fávaro","Coronel Darwin","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"] × ["Carlos Fávaro","Galvan","Janaína Riva","José Medeiros","Mauro Mendes","Pedro Taques"]
- segundo_turno_fragmento_descartado · q_9aab4203344c · results: null × ["Flávio Bolsonaro"]
- segundo_turno_fragmento_descartado · q_7fc9f3e863b3 · results: null × ["Soldado Sampaio"]
- roster_encolhido_na_fonte · q_e17534fc535a · results: ["Antônio Galvan","Janaína Riva","Jayme Campos","José Medeiros","Mauro Mendes","Pedro Taques"] × ["Janaína Riva","Jayme Campos","José Medeiros","Mauro Mendes","Pedro Taques"]
- segundo_turno_fragmento_descartado · q_da9cd7bc8675 · results: null × ["Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_d6abd4512d70 · results: ["Beto do Movimento","Daniel Junior","Reinaldo Azambuja","Renan Contar","Soraya Thronicke","Vander Loubet"] × ["Beto do Movimento","Capitão Contar","Reinaldo Azambuja","Soraya Thronicke","Vander Loubet"]
- roster_encolhido_na_fonte · q_d36faff0758a · results: ["Gianni Nogueira","Marcos Pollon","Nelsinho Trad","Reinaldo Azambuja","Renan Contar","Soraya Thronicke","Vander Loubet"] × ["Marcos Pollon","Nelsinho Trad","Reinaldo Azambuja","Renan Contar","Soraya Thronicke","Vander Loubet"]
- roster_encolhido_na_fonte · q_d6b7edf4d9d0 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"]
- roster_encolhido_na_fonte · q_4a0d94690584 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_32e473703a1e · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_d5a30f5001cd · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_aa4a11e7c1bc · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- survey_id_orphaned · s_39cab53cee64 · survey_id: "s_39cab53cee64" × null
- roster_encolhido_na_fonte · q_a11ceffdd827 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- segundo_turno_fragmento_descartado · q_ba61229978f7 · results: null × ["Romeu Zema"]
- roster_encolhido_na_fonte · q_a1e19d58a704 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_12d48c3da8a5 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_1a5b4c8ee3a3 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- **[2026]** survey_id_orphaned · s_3bf9494bf0a2 · survey_id: "s_3bf9494bf0a2" × null
- roster_encolhido_na_fonte · q_899e38595a06 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_b867be26b650 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_9deb9bd63a0b · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_44e0d1ba94fe · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_ec3365f8f2b2 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_02457d63ccc3 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_ac0553173c29 · results: ["Aldo Rebelo","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_57c84f722aed · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_118b5a6c984e · results: ["Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- **[2026]** survey_id_orphaned · s_e39e719fc8fb · survey_id: "s_e39e719fc8fb" × null
- **[2026]** survey_id_orphaned · s_de0c67c196b7 · survey_id: "s_de0c67c196b7" × null
- roster_encolhido_na_fonte · q_b0ddb2d76a2f · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_2f9b90e5f145 · results: ["Emanuel Cacho","Fábio Mitidieri","Ricardo Marques","Valmir de Francisquinho"] × ["Fábio Mitidieri","Ricardo Marques","Valmir de"]
- roster_encolhido_na_fonte · q_52d7e90766a7 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_68b70a9280b4 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_cc3e6a23a2d4 · results: ["Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["João Henrique Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_77f047139250 · results: ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Helder Barbalho","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Helder Barbalho","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_9f965b6cc857 · results: ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"]
- roster_encolhido_na_fonte · q_ef9ba13e2ae6 · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_cfe016ad269f · results: ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_f162b36b2808 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_7f4354f1faba · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_3bc2c83b006a · results: null × ["Allyson Bezerra"]
- roster_encolhido_na_fonte · q_ba2f16aa24c3 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_c4cf05d23224 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_1f51039b9f83 · results: null × ["Cícero Lucena"]
- segundo_turno_fragmento_descartado · q_1ed48181576d · results: null × ["Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_67ecabbb9441 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Ciro Gomes","Fernando Haddad","Flávio Bolsonaro","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Ciro Gomes","Fernando Haddad","Flávio Bolsonaro","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_62207d6ae23a · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_602bdf24e297 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_66235d54a510 · results: ["Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["João Henrique Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_04e1d9cc349b · results: ["Augusto Cury","Hertz Dias","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Hertz Dias","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_3d6e99027262 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_0ca87abc155d · results: ["Antônio Galvan","Carlos Fávaro","Janaína Riva","Jayme Campos","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"] × ["Carlos Fávaro","Janaína Riva","Jayme Campos","José Medeiros","Mauro Mendes","Pedro Taques"]
- **[2026]** survey_id_orphaned · s_232c3407f4a1 · survey_id: "s_232c3407f4a1" × null
- candidate_id_orphaned · c_8f9843615dee · candidate_id: "c_8f9843615dee" × ["c_317b01d5ffe6","c_47dc48b8a125"]
- person_id_orphaned · p_ea38d587bf78 · person_id: "p_ea38d587bf78" × null
- roster_encolhido_na_fonte · q_c00782ea15b9 · results: ["Carlos Machado","Edjane","Fernando Haddad","Izadora Dias","Tarcísio de Freitas","Vera Lúcia","Vivian Mendes"] × ["Carlos","Fernando Haddad","Izadora","Tarcísio de Freitas","Vera Lúcia","Vivian"]
- **[2026]** survey_id_orphaned · s_88b855bd9581 · survey_id: "s_88b855bd9581" × null
- roster_encolhido_na_fonte · q_9e8375153b29 · results: ["Carlos Machado","Edjane","Fernando Haddad","Izadora Dias","Tarcísio de Freitas","Vera Lúcia","Vivian Mendes"] × ["Carlos","Fernando Haddad","Izadora","Tarcísio de Freitas","Vera Lúcia","Vivian"]
- **[2026]** survey_id_orphaned · s_0729c09177dc · survey_id: "s_0729c09177dc" × null
- **[2026]** survey_id_orphaned · s_f76602ec6e99 · survey_id: "s_f76602ec6e99" × null
- **[2026]** survey_id_orphaned · s_8b3a22d832de · survey_id: "s_8b3a22d832de" × null
- **[2026]** survey_id_orphaned · s_dfdcf9bf6100 · survey_id: "s_dfdcf9bf6100" × null
- roster_encolhido_na_fonte · q_995f3879a92d · results: ["Antônio Galvan","Carlos Fávaro","Janaína Riva","Jayme Campos","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"] × ["Carlos Fávaro","Janaína Riva","Jayme Campos","José Medeiros","Mauro Mendes","Pedro Taques"]
- survey_id_orphaned · s_54ef466e05ce · survey_id: "s_54ef466e05ce" × null
- roster_encolhido_na_fonte · q_69bf17c316c8 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Sargento Laudicério","Wellington Fagundes"] × ["Doutora Natasha","Jayme Campos","Otaviano Pivetta","Wellington Fagundes"]
- person_id_orphaned · p_a73d7fa54f62 · person_id: "p_a73d7fa54f62" × null
- **[2026]** survey_id_orphaned · s_2765630c909d · survey_id: "s_2765630c909d" × null
- roster_encolhido_na_fonte · q_0f0f12a28d82 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Wellington Fagundes"] × ["Doutora Natasha","Jayme Campos","Otaviano Pivetta","Wellington Fagundes"]
- **[2026]** survey_id_orphaned · s_8c376670c05d · survey_id: "s_8c376670c05d" × null
- **[2026]** survey_id_orphaned · s_1fc98e9f7a15 · survey_id: "s_1fc98e9f7a15" × null
- **[2026]** survey_id_orphaned · s_fe6dadff997f · survey_id: "s_fe6dadff997f" × null
- person_id_orphaned · p_39f99c278a47 · person_id: "p_39f99c278a47" × null
- **[2026]** survey_id_orphaned · s_8d28e8f932ac · survey_id: "s_8d28e8f932ac" × null
- **[2026]** survey_id_orphaned · s_99ca7b6c3161 · survey_id: "s_99ca7b6c3161" × null
- **[2026]** survey_id_orphaned · s_60a206aad6eb · survey_id: "s_60a206aad6eb" × null
- **[2026]** survey_id_orphaned · s_920b36c8cb0f · survey_id: "s_920b36c8cb0f" × null
- **[2026]** survey_id_orphaned · s_435797ace4cc · survey_id: "s_435797ace4cc" × null
- **[2026]** survey_id_orphaned · s_a45d6b29ff66 · survey_id: "s_a45d6b29ff66" × null
- person_id_orphaned · p_438c14215f62 · person_id: "p_438c14215f62" × null
- roster_encolhido_na_fonte · q_240eac76dc70 · results: ["Carlos Machado","Edjane","Fernando Haddad","Izadora Dias","Tarcísio de Freitas","Vera Lúcia","Vivian Mendes"] × ["Carlos","Fernando Haddad","Izadora","Tarcísio de Freitas","Vera Lúcia","Vivian"]
- roster_encolhido_na_fonte · q_6618e5bc5526 · results: ["Carlos Machado","Edjane","Fernando Haddad","Izadora Dias","Tarcísio de Freitas","Vera Lúcia","Vivian Mendes"] × ["Carlos","Fernando Haddad","Izadora","Tarcísio de Freitas","Vera Lúcia","Vivian"]
- **[2026]** survey_id_orphaned · s_831c5ece0842 · survey_id: "s_831c5ece0842" × null
- **[2026]** survey_id_orphaned · s_2387afdb405a · survey_id: "s_2387afdb405a" × null
- roster_encolhido_na_fonte · q_bd8fd5b153b2 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Wellington Fagundes"] × ["Doutora Natasha","Jayme Campos","Otaviano Pivetta","Wellington Fagundes"]
- roster_encolhido_na_fonte · q_b42b77ccb78a · results: ["Doutora Natasha","Otaviano Pivetta","Rafaell Milas","Sargento Laudicério","Wellington Fagundes"] × ["Natasha Slhessarenko","Otaviano Pivetta","Wellington Fagundes"]
- roster_encolhido_na_fonte · q_261318a2621f · results: ["Carlos Machado","Edjane","Fernando Haddad","Izadora Dias","Tarcísio de Freitas","Vera Lúcia","Vivian Mendes"] × ["Carlos","Fernando Haddad","Izadora","Tarcísio de Freitas","Vera Lúcia","Vivian"]
- person_id_orphaned · p_21f0c31ce72d · person_id: "p_21f0c31ce72d" × null
- disputa_em_quarentena · governador:MS · quarentena: 43 × 42
- disputa_em_quarentena · governador:RJ · quarentena: 72 × 78
- disputa_em_quarentena · governador:SE · quarentena: 56 × 71
- disputa_em_quarentena · presidente:RJ · quarentena: 42 × 49
- disputa_em_quarentena · presidente:SC · quarentena: 12 × 16
- disputa_em_quarentena · senador:AC · quarentena: 44 × 43
- disputa_em_quarentena · senador:MT · quarentena: 27 × 30

## UNIVERSO — Pesquisa estadual com amostra possivelmente municipal (não certificada) (1)

Disputa estadual (governador/senador) com universo gravado 'uf' e amostra < 800 que ainda NÃO está no ledger de vereditos (data/universe-verdicts.json). Amostra pequena NÃO prova municipal — muitas estaduais legítimas são pequenas — então cada uma exige leitura de fonte (cega) antes de gatear. Ponto cego conhecido: um municipal com n ≥ 800 escapa desta varredura; o gate é por veredito no ledger, não por este limiar. Confirmada municipal, entra no ledger e sai das médias estaduais; confirmada estadual, entra como estadual e para de aparecer aqui. É triagem, não porta.

- **[2026]** s_a730093c4b6a · IPR · MS · n=784 · registro —

## PARTIDA — A mesma pessoa em duas linhas, uma delas sem registro (0)

Uma pessoa observada cuja grafia ALCANÇA, na disputa dela, a candidatura de uma pessoa registrada: são a mesma pessoa, gravada duas vezes. O caso normal é a estreia de um nome numa disputa nova e se resolve na coleta seguinte sem intervenção (§6) — o que importa aqui é o que PERSISTIR de uma rodada para a outra.

*Nada a reportar.*

