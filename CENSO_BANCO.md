# Censo do banco — Placar das Pesquisas 2026

Gerado por `node scripts/census.mjs` a partir de `data/`. Não editar à mão.

Banco: **2353 levantamentos · 6147 perguntas · 167 institutos · 1456 candidatos**.

Este arquivo é a definição operacional de *banco normalizado*: as classes abaixo são fixas em código, e
o banco está normalizado quando todas estão vazias — ou quando o que resta está explicitamente parqueado
como decisão editorial. Achado fora destas classes é anotado, não corrigido no meio de uma rodada.

| classe | itens | de 2026 |
|---|---|---|
| **SOMA** — Elenco de vaga única somando mais de 100 | 1 | 1 |
| **PESSOA** — Candidatos que podem não ser pessoas | 0 | 0 |
| **ORFAO** — Resultados apontando para candidato inexistente | 0 | 0 |
| **SEMDATA** — Levantamentos sem data utilizável | 10 | 0 |
| **DUPLICATA** — Mesmo campo mantido como dois levantamentos | 54 | 40 |
| **CONFLITO** — Conflitos registrados aguardando decisão | 534 | 59 |
| **UNIVERSO** — Pesquisa estadual com amostra possivelmente municipal (não certificada) | 3 | 3 |
| **PARTIDA** — A mesma pessoa em duas linhas, uma delas sem registro | 0 | 0 |
| **total** | **602** | **103** |

A coluna *de 2026* é a que importa primeiro: a eleição é em outubro de 2026 e a média usa as pesquisas
mais recentes, então um defeito num levantamento de 2023 não aparece em lugar nenhum do site.

## SOMA — Elenco de vaga única somando mais de 100 (1)

Cada eleitor tem um voto: as linhas de candidato não podem passar de 100. A folga é derivada das próprias casas decimais da fonte (0,5 por inteiro, 0,05 por décimo). O que aparecer aqui é arredondamento da fonte ou linha a mais no elenco — o segundo caso é defeito nosso.

- **[2026]** 100.2 (folga 0.10) · Verita · AP governador/t1 · 2026-05-31 · 72d253a0383b
  Antônio Furlan 70.7 · Clécio Luís 29.5

## PESSOA — Candidatos que podem não ser pessoas (0)

A tabela de candidatos guarda pessoas. Opções de resposta, nomes de partido e artefatos de tabela entram por aqui e viram linhas de intenção de voto — uma delas somava 13,3% no Ceará.

*Nada a reportar.*

## ORFAO — Resultados apontando para candidato inexistente (0)

Referência quebrada entre questions e candidates. Sempre defeito nosso, nunca da fonte.

*Nada a reportar.*

## SEMDATA — Levantamentos sem data utilizável (10)

Sem data de campo nem de publicação, a pesquisa não entra em média nem em série temporal: está no banco e é invisível. Ou se acha a data na fonte, ou se descarta.

- s_03d648ecabe0 · Datapop · GO · registro —
- s_4b18e5197551 · Opinar · PI · registro PI-02052/2026
- s_5d46b3d90939 · Real Time Big Data · AC · registro —
- s_6731840ddf13 · Paraná Pesquisas · PE · registro —
- s_693707e88325 · Quaest · RJ · registro —
- s_824da0368472 · Delta · AC · registro —
- s_a3b6d8cdc27d · Delta · AC · registro —
- s_c5446eaf6c82 · Doxa · PA · registro —
- s_ca4c8b28f604 · Delta · AC · registro —
- s_f45a1dcff913 · Paraná Pesquisas · PR · registro —

## DUPLICATA — Mesmo campo mantido como dois levantamentos (54)

Mesmo instituto, mesma UF, mesma data de campo, mesma disputa, em levantamentos separados. Duas coisas diferentes caem aqui e o rótulo de cada item diz qual: *cenários separados* é uma operação de campo cujas perguntas ficaram em levantamentos distintos — problema de identidade de levantamento, que a escada de resolução (`upsertPoll`) une; *elenco repetido* (3 de 54) é a mesma pergunta duas vezes, e essa sim entra duas vezes na média.

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
- **[2026]** cenários separados — Real Time Big Data · PB governador/t2 · 2026-08-22 — 2 levantamentos
  s_077835e07b7d: Cícero Lucena 42 · Efraim Filho 31
  s_077835e07b7d: Lucas Ribeiro 46 · Efraim Filho 30
  s_33c20d67ed61: Lucas Ribeiro 42 · Cícero Lucena 35
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
- **[2026]** cenários separados — Verita · PA governador/t1 · 2026-03-30 — 2 levantamentos
  s_1528eaac66a9: Daniel Santos 18.7 · Hana Ghassan 12.7
  s_6aa0e4061efa: Daniel Santos 43.4 · Hana Ghassan 25.5 · Mário Couto 17.4
- **[2026]** cenários separados — Verita · PA senador/t1 · 2026-03-30 — 2 levantamentos
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
- cenários separados — Real Time Big Data · SE governador/t1 · 2025-11-26 — 2 levantamentos
  s_1da98a1aa538: Fábio Mitidieri 48 · Emília Corrêa 32
  s_42ae015e72cf: Fábio Mitidieri 46 · Valmir de Francisquinho de Itabaiana 33
- **[2026]** cenários separados — Real Time Big Data · AC governador/t2 · 2026-07-25 — 2 levantamentos
  s_291fa207ccea: Mailza Assis 42 · Tião Bocalom 28
  s_cb78c6655121: Alan Rick 54 · Tião Bocalom 26
  s_cb78c6655121: Alan Rick 45 · Mailza Assis 36
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
- **[2026]** cenários separados — Seta · RN governador/t2 · 2026-10-10 — 2 levantamentos
  s_32a6cbc5f52c: Allyson Bezerra 43.5 · Cadu de Lula 32.4
  s_7bd165d371aa: Lula 51.7 · Flávio Bolsonaro 34.9
- cenários separados — AtlasIntel · BR presidente/t1 · 2025-10-19 — 2 levantamentos
  s_33f0936d624b: Michelle Bolsonaro 26.2 · Luiz Inácio Lula da Silva 51 · Ratinho Júnior 5.1 · Romeu Zema 4.6 · Ronaldo Caiado 9.1
  s_33f0936d624b: Tarcísio de Freitas 30.4 · Luiz Inácio Lula da Silva 51.3 · Ratinho Júnior 3 · Romeu Zema 2.5 · Ronaldo Caiado 6
  s_33f0936d624b: Tarcísio de Freitas 30.1 · Fernando Haddad 43.1 · Ratinho Júnior 3.5 · Romeu Zema 2.6 · Ronaldo Caiado 7
  s_33f0936d624b: Luiz Inácio Lula da Silva 51 · Ratinho Júnior 10.4 · Romeu Zema 10.6 · Ronaldo Caiado 15.3
  s_fa88a308a3ff: Jair Messias Bolsonaro 41.3 · Luiz Inácio Lula da Silva 48.8 · Ciro Gomes 3.1 · Simone Tebet 2.3
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
  s_63076a766607: Sebastião Bocalom 42 · Dr.Thor Dantas 13
  s_f2be082c9a16: Alan Rick 48 · Tião Bocalom 27
  s_f2be082c9a16: Mailza Assis 43 · Tião Bocalom 27
- cenários separados — AtlasIntel · BR presidente/t1 · 2025-06-30 — 2 levantamentos
  s_67a8dda7d659: Jair Messias Bolsonaro 46 · Luiz Inácio Lula da Silva 44.4 · Ciro Gomes 4.5 · Simone Tebet 1.5
  s_9d13d46ea6a8: Michelle Bolsonaro 30.4 · Luiz Inácio Lula da Silva 45 · Pablo Marçal 1.3 · Ratinho Júnior 4.8 · Eduardo Leite 0.9 · Romeu Zema 7.2 · Ciro Gomes 3.9 · Ronaldo Caiado 4
  s_9d13d46ea6a8: Lula 44.6 · Tarcísio de Freitas 34 · Romeu Zema 4.4 · Pablo Marçal 3.7 · Ciro Gomes 3.5 · Ratinho Jr 2.5 · Ronaldo Caiado 1.7 · Eduardo Leite 1
- **[2026]** cenários separados — AtlasIntel · AC presidente/t2 · 2026-10-23 — 2 levantamentos
  s_67c70cedd7b4: Flávio Bolsonaro 63.3 · Lula 32.4
  s_d8d7c17f45e8: Mailza Assis 53.3 · Alan Rick 34.9
- **[2026]** ELENCO REPETIDO — Palver · BR presidente/t2 · 2026-09-23 — 2 levantamentos
  s_684407aea71b: Luiz Inácio Lula da Silva 44 · Augusto Cury 36
  s_684407aea71b: Luiz Inácio Lula da Silva 45 · Romeu Zema 43
  s_684407aea71b: Luiz Inácio Lula da Silva 44 · Renan Santos 34
  s_684407aea71b: Luiz Inácio Lula da Silva 44 · Ronaldo Caiado 42
  s_b18676d0c7d2: Luiz Inácio Lula da Silva 43 · Romeu Zema 44
  s_b18676d0c7d2: Flávio Bolsonaro 48 · Lula 45
  s_b18676d0c7d2: Luiz Inácio Lula da Silva 43 · Renan Santos 34
  s_b18676d0c7d2: Luiz Inácio Lula da Silva 43 · Ronaldo Caiado 44
  s_b18676d0c7d2: Luiz Inácio Lula da Silva 43 · Augusto Cury 35
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
  s_86145f8e35f7: Omar Aziz 45 · Maria do Carmo Seffair 44
  s_af3cacb4c580: Omar Aziz 44 · Roberto Cidade 40
- **[2026]** cenários separados — Quaest · CE senador/t1 · 2026-04-28 — 2 levantamentos
  s_8671a57e9697: Cid Gomes 17 · Capitão Wagner 17 · Eunício Oliveira 6 · Luizianne Lins 9 · Priscila Costa 4 · General Theóphilo 1 · Anna Karina 1
  s_a6c9cec351e6: Cid Gomes 17 · Capitão Wagner 16 · Roberto Cláudio 8 · Luizianne Lins 8 · Eunício Oliveira 6 · Pastor Alcides 3 · Priscila Costa 3 · Chiquinho Feitosa 1 · Domingos Filho 1 · General Theophilo 1 · Anna Karina 0
- **[2026]** cenários separados — AtlasIntel · MT governador/t2 · 2026-10-02 — 2 levantamentos
  s_881b674736fb: Otaviano Pivetta 56.2 · Wellington Fagundes 26.2
  s_f89952e54a39: Otaviano Pivetta 68.5 · Doutora Natasha 31.5
  s_f89952e54a39: Wellington Fagundes 57.1 · Doutora Natasha 42.9
- **[2026]** cenários separados — AtlasIntel · CE senador/t1 · 2026-03-30 — 2 levantamentos
  s_892ed51a30e3: Eunício Oliveira 8.7 · Alcides Fernandes 11.8 · Cid Gomes 19.9 · Roberto Cláudio 14.6 · General Theóphilo 6.3
  s_eba01c387862: Capitão Wagner 20.9 · Eunício Oliveira 10.1 · Júnior Mano 5 · Luizianne Lins 17.2 · Priscila Costa 10.8 · General Theóphilo 4.5
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
- **[2026]** cenários separados — Direct Pesquisas · GO senador/t1 · 2026-02-03 — 2 levantamentos
  s_9f4d281a252f: Gracinha Caiado 19 · Vanderlan Cardoso 18 · Gustavo Gayer 15.4 · Gustavo Medanha 7.8 · Jorge Kajuru 6.8 · Zacharias Calil 5.2 · Delegado Humberto 4.4 · Alexandre Bady 2.8
  s_a7c84a21faf0: Vanderlan Cardoso 19.2 · Gustavo Gayer 13.7 · Gracinha Caiado 12.2 · Zacharias Calil 10.9 · Gustavo Mendanha 10.6 · Jorge Kajuru 5.6 · Alexandre Bady 3.6
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
- **[2026]** cenários separados — Quaest · RJ governador/t2 · 2026-09-22 — 2 levantamentos
  s_d0b8c498093b: Eduardo Paes 49 · Anthony Garotinho 18
  s_f59472960d7c: Eduardo Paes 44 · Douglas Ruas 31
- **[2026]** cenários separados — Quaest · PA senador/t1 · 2026-07-25 — 2 levantamentos
  s_d91c17880829: Helder Barbalho 21 · Éder Mauro 15 · Zequinha Marinho 12 · Gal Leite 1 · Gizelle Freitas 4 · Marcelino Conti 2
  s_dfbfb7b0bd38: Helder Barbalho 21 · Éder Mauro 14 · Zequinha Marinho 7 · Chicão Melo 4 · Celso Sabino 5 · Gal Leite 0 · Gizelle Freitas 1 · Marcelino Conti 0 · Breno Guimarães 1

## CONFLITO — Conflitos registrados aguardando decisão (534)

Divergências que o pipeline registrou em vez de resolver em silêncio. Cada uma precisa de uma fonte primária ou de uma decisão editorial.

- **[2026]** registration_dates_contradict · s_118355fc693b · fieldwork_end: "2026-08-03" × "2025-08-03"
- roster_encolhido_na_fonte · q_26ca7f89a6ea · results: ["Delcídio do Amaral","Eduardo Riedel","Fábio Trad","Jefferson Bezerra","João Henrique Catan","Lucien Rezende","Renato Gomes"] × ["Eduardo Riedel","Fábio Trad","Jefferson Bezzerra","João Henrique Catan","Lucien Rezende","Renato Gomes"]
- **[2026]** registration_dates_contradict · s_5995d129ff44 · fieldwork_end: "2026-08-25" × "2025-08-25"
- roster_encolhido_na_fonte · q_1b0ae911bbb4 · results: ["Carlos Sant'anna","Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Paulo Rubem Santiago","Túlio Gadêlha"] × ["Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Paulo Rubem Santiago","Túlio Gadelha"]
- roster_encolhido_na_fonte · q_bd71a3ab66af · results: ["Ciro Gomes","Delegado Huggo Leonardo","Elmano de Freitas","Zé Batista"] × ["Ciro Gomes","Elmano de Freitas"]
- roster_encolhido_na_fonte · q_277b9c0cfa36 · results: ["Eduardo da Fonte","Fernando Dueire","Humberto Costa","Marília Arraes","Mendonça Filho","Miguel Coelho","Paulo Rubem Santiago","Silvio Nascimento"] × ["Eduardo da Fonte","Humberto Costa","Marília Arraes","Mendonça Filho","Miguel Coelho","Paulo Rubem Santiago","Silvio Nascimento"]
- roster_encolhido_na_fonte · q_91c680d7ce70 · results: ["Antonio Barros","Antonio José Lira","Ciro Nogueira","Dionísio Piauí","Francinaldo Leão","Jorge Lopes","Júlio César de Carvalho Lima","Major Paulo Roberto","Marcelo Castro","Ravenna Castro","Tiago Junqueira"] × ["Antonio Barros","Antonio José Lira","Ciro Nogueira","Dionísio Piauí","Francinaldo Leão","Major Paulo Roberto","Marcelo Castro","Ravenna Castro","Tiago Junqueira"]
- roster_encolhido_na_fonte · q_2c849777b201 · results: ["Ciro Nogueira","Francinaldo Leão","Jorge Lopes","Júlio César de Carvalho Lima","Marcelo Castro","Tiago Junqueira"] × ["Ciro Nogueira","Francinaldo Leão","Júlio César","Marcelo Castro","Tiago Junqueira"]
- roster_encolhido_na_fonte · q_f1f594e281a8 · results: ["Ciro Nogueira","Francinaldo Leão","Jorge Lopes","Júlio César de Carvalho Lima","Marcelo Castro","Pedro Laurentino","Tiago Junqueira"] × ["Ciro Nogueira","Francinaldo Leão","Júlio César","Marcelo Castro","Pedro Laurentino","Tiago Junqueira"]
- roster_encolhido_na_fonte · q_43fe99b1b3a4 · results: ["Dra. Lúcia Santos","Elizeu Aguiar","Joel Rodrigues da Silva","Lourdes Melo","Mainha","Rafael Fonteles","Toni Rodrigues"] × ["Joel Rodrigues","Jornalista Toni Rodrigues","Mainha","Rafael Fonteles"]
- roster_encolhido_na_fonte · q_ea149f2c1842 · results: ["ACM Neto","Jerônimo Rodrigues","José Carlos Aleluia","Ronaldo Mansur"] × ["ACM Neto","Jerônimo Rodrigues","Ronaldo Mansur"]
- roster_encolhido_na_fonte · q_0a587cd4c025 · results: ["Allyson Bezerra","Cadu de Lula","Robério Paulino","Rodrigo Bolsonaro","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Robério Paulino","Álvaro Dias"]
- roster_encolhido_na_fonte · q_5446f4cef2bf · results: ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Robério Paulino","Rodrigo Bolsonaro","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Rodrigo Vieira","Álvaro Dias"]
- roster_encolhido_na_fonte · q_b8fbce1566c7 · results: ["Coronel Hélio","Luciana Lima","Rafael Motta","Rosália Fernandes","Samanda de Lula","Sandro Pimentel","Styvenson Valentim","Zenaide Maia"] × ["Coronel Hélio Oliveira","Rafael Motta","Rosália Fernandes","Sandro Pimental","Styvenson Valentim","Zenaide Maia"]
- roster_encolhido_na_fonte · q_75c65043732e · results: ["Allyson Bezerra","Cadu de Lula","Robério Paulino","Rodrigo Bolsonaro","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Robério Paulino","Álvaro Dias"]
- roster_encolhido_na_fonte · q_8cdbe4477112 · results: ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Robério Paulino","Rodrigo Bolsonaro","Álvaro Costa Dias"] × ["Allyson Bezerra","Cadu de Lula","Dário Barbosa","Robério Paulino"]
- roster_encolhido_na_fonte · q_dc720b8b3046 · results: ["Augusto Cury","Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_a1c412ff84f1 · results: null × ["Elmano de Freitas"]
- segundo_turno_fragmento_descartado · q_ac09b83b944b · results: null × ["Fernando Haddad"]
- roster_encolhido_na_fonte · q_6ba168c1d936 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"]
- roster_encolhido_na_fonte · q_49fc6f4c25e0 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_c07ef47114bc · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_85ebca1221fd · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_e42b96ca0211 · results: ["Augusto Cury","Cabo Daciolo","Joaquim Barbosa","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Joaquim Barbosa","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_8e6309a86856 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"]
- roster_encolhido_na_fonte · q_4e8c18c2c862 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_4a167b2be3c2 · results: ["Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"] × ["Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado","Tarcísio de Freitas"]
- roster_encolhido_na_fonte · q_ee77bbc181b9 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_dcc905454808 · results: ["Ciro Gomes","Helder Barbalho","Lula","Michelle Bolsonaro","Ratinho Jr","Renan Santos","Ronaldo Caiado"] × ["Ciro Gomes","Helder Barbalho","Lula","Michelle Bolsonaro","Ratinho Jr","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_239589cef769 · results: null × ["Fernando Haddad"]
- segundo_turno_fragmento_descartado · q_1a2e8aa7006b · results: null × ["Romeu Zema"]
- segundo_turno_fragmento_descartado · q_1be932800a31 · results: null × ["Eduardo Braide"]
- roster_encolhido_na_fonte · q_81490eb5f9cb · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_dfdc9efc0fe4 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_f6540230ffe2 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_b6a6a7d7813e · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_cbae6439e561 · results: ["Eduardo Moura","Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["Eduardo Moura","Ivan Moraes","Raquel Lyra"]
- roster_encolhido_na_fonte · q_c8624b193313 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_269e9d2e1a03 · results: ["ACM Neto","Jerônimo Rodrigues","Ronaldo Mansur"] × ["Jerônimo Rodrigues","Ronaldo Mansur"]
- roster_encolhido_na_fonte · q_8915397b1682 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_77efb88b792b · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_25f6cc7d21cf · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_71d9a35caaf2 · results: ["Augusto Cury","Flávio Bolsonaro","Renan Santos","Romeu Zema"] × ["Augusto Cury","Flávio Bolsonaro","Romeu Zema"]
- roster_encolhido_na_fonte · q_b2655c58379f · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_f6f883c79f82 · results: ["ACM Neto","Aroldo Félix","Jerônimo Rodrigues","Ronaldo Mansur"] × ["Jerônimo Rodrigues","Prof. Aroldo Félix","Ronaldo Mansur"]
- roster_encolhido_na_fonte · q_009899a2312a · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Heró Bezerra","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Heró Bezerra","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_cf781de41eca · results: ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_8dcbec59bd60 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_3e06027e1e56 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_d2fb4f76e5c8 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_248fb8b83435 · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_553f17dcc0dc · results: ["Eduardo Moura","Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["Ivan Moraes","João Campos","Raquel Lyra"]
- roster_encolhido_na_fonte · q_c450356f51e3 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_2dd9cc0863b2 · results: null × ["Fernando Haddad"]
- roster_encolhido_na_fonte · q_96ee49beeeb0 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_ed3095dad3b9 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_66a2c0b7f86a · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_4e4475bcd6d2 · results: ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema"]
- roster_encolhido_na_fonte · q_e60114595a89 · results: ["Aldo Rebelo","Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_61f93a9d7d7e · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_152afa8217b3 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- segundo_turno_fragmento_descartado · q_a1f7556da067 · results: null × ["Flávio Bolsonaro"]
- segundo_turno_fragmento_descartado · q_5478e9a7a3da · results: null × ["Felipe Curi"]
- roster_encolhido_na_fonte · q_2560fc17569b · results: ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_796424a16a7b · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_e32970151a27 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_85352453a957 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- segundo_turno_fragmento_descartado · q_8fc2a21e22f5 · results: null × ["Lula"]
- roster_encolhido_na_fonte · q_a64b5e6f0fd2 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr"]
- segundo_turno_fragmento_descartado · q_ebe16e999c23 · results: null × ["Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_799ce382b058 · results: null × ["Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_a02b7a8c48d1 · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Mailza Assis","Tião Bocalom"]
- roster_encolhido_na_fonte · q_d564faa897ba · results: ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Helder Barbalho","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Helder Barbalho","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_9943e1e83400 · results: ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_ad8c763f9be7 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_453f0563332f · results: ["Ciro Gomes","Helder Barbalho","Jair Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Ciro Gomes","Helder Barbalho","Jair Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_4514bb412212 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_901fd5e66eff · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_c980bd639db2 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_be3fd6526eb3 · results: null × ["Romeu Zema"]
- segundo_turno_fragmento_descartado · q_cdbc6efc0189 · results: null × ["Washington Reis"]
- roster_encolhido_na_fonte · q_0a3cf8ee73d2 · results: ["Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_c5fd5c9977bf · results: ["Ciro Gomes","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Ciro Gomes","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_0aa1e16cb21d · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- segundo_turno_fragmento_descartado · q_f5115233c19c · results: null × ["Lula"]
- roster_encolhido_na_fonte · q_d4b6ddf9854f · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_1f82fbe07eda · results: ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_4eccd9b5e4d8 · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_cee67dba9537 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_81d2838b18bd · results: ["Flávio Bolsonaro","Lula","Renan Santos","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_ae9b4b3b0ddd · results: null × ["Raquel Lyra"]
- segundo_turno_fragmento_descartado · q_77f2b2d026aa · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_c583a8161a27 · results: ["Augusto Cury","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_aa68def3efff · results: ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_2d7578147ec0 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_fe97220ed137 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- segundo_turno_fragmento_descartado · q_ad51df5d2db7 · results: null × ["Romeu Zema"]
- roster_encolhido_na_fonte · q_52dbe67df339 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema"]
- segundo_turno_fragmento_descartado · q_c9de327cf92f · results: null × ["Romeu Zema"]
- roster_encolhido_na_fonte · q_6612d7f66167 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_08b1df8e9cff · results: ["Alessandro Vieira","André David","André Moura","Coronel Rocha","Eduardo Amorim","Edvaldo Nogueira","Iran Barbosa","Paulinho da União Tur","Renatinha","Rodrigo Valadares","Rogério Carvalho"] × ["André Moura","Coronel Rocha","Delegado Alessandro","Delegado André David","Eduardo Amorim","Edvaldo Nogueira","Professor Iran Barbosa","Rodrigo Valadares","Rogério Carvalho"]
- roster_encolhido_na_fonte · q_207886a50c63 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_02d67c10c016 · results: null × ["Cadu de Lula"]
- roster_encolhido_na_fonte · q_75c06bdfe901 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_96ad663048b1 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_9bcd10e07ac4 · results: null × ["Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_0b86e870200f · results: ["Jair Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Jair Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_10962d98c491 · results: ["Aldo Rebelo","Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_f9e3166f918d · results: ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"]
- roster_encolhido_na_fonte · q_955adc45e05c · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_95b091f36c4e · results: null × ["Garotinho"]
- segundo_turno_fragmento_descartado · q_399d6b8553cf · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_282dbd67fe34 · results: ["Antônio Galvan","Carlos Fávaro","Coronel Darwin","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"] × ["Antonio Galvan","Carlos Fávaro","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"]
- segundo_turno_fragmento_descartado · q_347f182f0935 · results: null × ["Thiago de Joaldo"]
- roster_encolhido_na_fonte · q_2cbe2202f486 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_73426bfec899 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_692229d147d0 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_d3bf281c841b · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_5bd6c913a344 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema"]
- roster_encolhido_na_fonte · q_4796f99646c5 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_3a574dbd8995 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_3c9f49c78eb7 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_1ad374648d96 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_927f0943b3a0 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_417b2a4b75c6 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema","Tereza Cristina"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema","Tereza Cristina"]
- roster_encolhido_na_fonte · q_898b5cde320f · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_1dbe234e6eed · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema"] × ["Flávio Bolsonaro","Lula","Romeu Zema"]
- roster_encolhido_na_fonte · q_12a567ff5564 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_0588add73ef1 · results: ["Augusto Cury","Ciro Gomes","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Ciro Gomes","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_28be25798b48 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_320a65db0faa · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Ciro Gomes","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Ciro Gomes","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_6b3190c7e830 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_36af75ad4240 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_3d782fd8f00a · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_aff17056bfa5 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_a3cd7d2f7803 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Renan Santos","Romeu Zema","Tereza Cristina"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr.","Romeu Zema","Tereza Cristina"]
- roster_encolhido_na_fonte · q_a26b8c32046e · results: ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_d4f0c065ba5c · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Pablo Marçal","Ratinho Jr.","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Pablo Marçal","Ratinho Jr.","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_c391a6a4411c · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_0a90e0647b08 · results: null × ["Flávio Bolsonaro"]
- segundo_turno_fragmento_descartado · q_3a2e3e731373 · results: null × ["Lula"]
- roster_encolhido_na_fonte · q_3bf49b90bc18 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_f84989ed1dcb · results: ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_142066765153 · results: ["Augusto Cury","Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_da9cd7bc8675 · results: null × ["Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_d6b7edf4d9d0 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"]
- roster_encolhido_na_fonte · q_4a0d94690584 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_32e473703a1e · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_a11ceffdd827 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- segundo_turno_fragmento_descartado · q_ba61229978f7 · results: null × ["Romeu Zema"]
- roster_encolhido_na_fonte · q_a1e19d58a704 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_1a5b4c8ee3a3 · results: ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_9deb9bd63a0b · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_ec3365f8f2b2 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_02457d63ccc3 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_57c84f722aed · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_118b5a6c984e · results: ["Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"] × ["Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_b0ddb2d76a2f · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_68b70a9280b4 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_77f047139250 · results: ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Helder Barbalho","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Ciro Gomes","Flávio Bolsonaro","Helder Barbalho","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_ef9ba13e2ae6 · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_cfe016ad269f · results: ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aécio Neves","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_7f4354f1faba · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_3bc2c83b006a · results: null × ["Allyson Bezerra"]
- roster_encolhido_na_fonte · q_ba2f16aa24c3 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_c4cf05d23224 · results: ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_1ed48181576d · results: null × ["Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_67ecabbb9441 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Ciro Gomes","Fernando Haddad","Flávio Bolsonaro","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Ciro Gomes","Fernando Haddad","Flávio Bolsonaro","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_62207d6ae23a · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_602bdf24e297 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_04e1d9cc349b · results: ["Augusto Cury","Hertz Dias","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Hertz Dias","Pablo Marçal","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_3d6e99027262 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_8edd93a849ac · results: ["Adriana Accorsi","Daniel Vilela","Edward Madureira","Marconi Perillo","Wilder Morais"] × ["Adriana Accorsi","Daniel Vilela","Edward Madureira","Wilder Morais"]
- roster_encolhido_na_fonte · q_7069136782e8 · results: ["Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"] × ["Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_e21e9d6a047d · results: ["Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_94f28f09c4fc · results: null × ["Sebastião Bocalom"]
- roster_encolhido_na_fonte · q_0927afb01163 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_041706c33fa6 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Professora Samara","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_3a991e7e862f · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_d2cab372ee66 · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_59fd4f91bb9f · results: ["Augusto Cury","Cabo Daciolo","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Heró Bezerra","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Heró Bezerra","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_ee442f75ac27 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- **[2026]** survey_id_orphaned · s_c7a166eb7b00 · survey_id: "s_c7a166eb7b00" × null
- **[2026]** survey_id_orphaned · s_c6e0c16bc59a · survey_id: "s_c6e0c16bc59a" × null
- **[2026]** survey_id_orphaned · s_45732cdfb5e7 · survey_id: "s_45732cdfb5e7" × null
- roster_encolhido_na_fonte · q_f203af681286 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_2b8785167d22 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Samara Martins"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_58bf37879da5 · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_a21b90ed7e9f · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_c2c319987cd0 · results: ["Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- **[2026]** registration_dates_contradict · s_c3ea7003b0c2 · fieldwork_end: "2026-02-01" × "2026-01-01"
- roster_encolhido_na_fonte · q_02b44b5d135b · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_9c68fe93da57 · results: null × ["Ronaldo Caiado"]
- segundo_turno_fragmento_descartado · q_43b68ea96389 · results: null × ["Romeu Zema"]
- **[2026]** survey_id_orphaned · s_db7c12d56b11 · survey_id: "s_db7c12d56b11" × null
- segundo_turno_fragmento_descartado · q_d71611740e13 · results: null × ["Joel Rodrigues"]
- **[2026]** survey_id_orphaned · s_f0bbf4e68731 · survey_id: "s_f0bbf4e68731" × null
- survey_id_orphaned · s_4a5661208ddf · survey_id: "s_4a5661208ddf" × null
- **[2026]** survey_id_orphaned · s_4e24aadd5c72 · survey_id: "s_4e24aadd5c72" × null
- **[2026]** survey_id_orphaned · s_399fb138b500 · survey_id: "s_399fb138b500" × null
- **[2026]** survey_id_orphaned · s_0c059273fa67 · survey_id: "s_0c059273fa67" × null
- **[2026]** survey_id_orphaned · s_aef89ccb5279 · survey_id: "s_aef89ccb5279" × null
- **[2026]** survey_id_orphaned · s_1528eaac66a9 · survey_id: "s_1528eaac66a9" × null
- roster_encolhido_na_fonte · q_70bd75a92d3c · results: ["Araceli Lemos","Daniel Santos","Gal Leite","Hana Ghassan","Ruth Reis","Well Macêdo"] × ["Araceli Lemos","Dr. Daniel","Hana Ghassan"]
- roster_encolhido_na_fonte · q_f364f3402ea9 · results: ["Araceli Lemos","Cleber Rabelo","Daniel Santos","Hana Ghassan","Mário Couto","Raquel Brício"] × ["Cléber Rabelo","Hana Ghassan","Raquel Brício"]
- roster_encolhido_na_fonte · q_006eb119c0fb · results: ["Breno Guimarães","Celso Sabino","Chicão Melo","Coronel Jonildo","Edlaine Rodrigues","Fernanda Lopes","Gizelle Freitas","Helder Barbalho","Lívia Noronha","Marcelino Conti","Zequinha Marinho","Éder Mauro"] × ["Celso Sabino","Chicão","Delegado Eder Mauro","Dr. Helder","Zequinha Marinho"]
- roster_encolhido_na_fonte · q_b61961e7b08c · results: ["Araceli Lemos","Daniel Santos","Gal Leite","Hana Ghassan","Ruth Reis","Well Macêdo"] × ["Araceli Lemos","Dr. Daniel","Gal Leite","Hana Ghassan"]
- roster_encolhido_na_fonte · q_bbcdf5f7c65b · results: ["Araceli Lemos","Cleber Rabelo","Daniel Santos","Hana Ghassan","Mário Couto"] × ["Araceli Lemos","Cleber Rabelo","Hana Ghassan","Mário Couto"]
- roster_encolhido_na_fonte · q_5b1bc8fba54c · results: ["Araceli Lemos","Cleber Rabelo","Daniel Santos","Hana Ghassan","Mário Couto","Raquel Brício"] × ["Araceli Lemos","Cleber Rabelo","Hana Ghassan","Mário Couto","Raquel Brício"]
- **[2026]** survey_id_orphaned · s_8a442edc561e · survey_id: "s_8a442edc561e" × null
- **[2026]** survey_id_orphaned · s_90e1e5c1ad22 · survey_id: "s_90e1e5c1ad22" × null
- **[2026]** survey_id_orphaned · s_adef5c625742 · survey_id: "s_adef5c625742" × null
- **[2026]** survey_id_orphaned · s_450f31270cfe · survey_id: "s_450f31270cfe" × null
- **[2026]** survey_id_orphaned · s_b16f8ad90fc3 · survey_id: "s_b16f8ad90fc3" × null
- **[2026]** survey_id_orphaned · s_2566457a88ad · survey_id: "s_2566457a88ad" × null
- segundo_turno_fragmento_descartado · q_993c5845051c · results: null × ["Jerônimo Rodrigues"]
- segundo_turno_fragmento_descartado · q_ad202740d448 · results: null × ["Jerônimo Rodrigues"]
- candidate_id_orphaned · c_5d8a87df3b75 · candidate_id: "c_5d8a87df3b75" × null
- candidate_id_orphaned · c_a2feeb6cf4b3 · candidate_id: "c_a2feeb6cf4b3" × null
- roster_encolhido_na_fonte · q_41cbebf2ce23 · results: ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann","Joaquim do MLB","Karen Guerreiro","Marcelo Marcelino"] × ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann"]
- person_id_orphaned · p_dad90da6c2de · person_id: "p_dad90da6c2de" × null
- roster_encolhido_na_fonte · q_e7db6cde1d99 · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto","Gracinha Caiado","Gustavo Gayer","Vanderlan Cardoso","Zacharias Calil"]
- **[2026]** survey_id_orphaned · s_9c9cc1f4f9f9 · survey_id: "s_9c9cc1f4f9f9" × null
- **[2026]** survey_id_orphaned · s_1b369a801aaa · survey_id: "s_1b369a801aaa" × null
- roster_encolhido_na_fonte · q_b1a82601ed4a · results: ["Aldo Rebelo","Flávio Bolsonaro","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- survey_id_orphaned · s_5ae35856278a · survey_id: "s_5ae35856278a" × null
- **[2026]** survey_id_orphaned · s_08b36c281895 · survey_id: "s_08b36c281895" × null
- roster_encolhido_na_fonte · q_84624ff82982 · results: ["Adriano Teixeira","Alexandre Salomão","Luiz França","Requião Filho","Samuel de Mattos","Sandro Alex","Sergio Moro","Tayná Miessa"] × ["Luiz França","Requião Filho","Sandro Alex","Sergio Moro"]
- person_id_orphaned · p_042b423ef387 · person_id: "p_042b423ef387" × null
- roster_encolhido_na_fonte · q_eae2bd89f486 · results: ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann","Joaquim do MLB","Karen Guerreiro","Marcelo Marcelino"] × ["Alexandre Curi","Cristina Graeml","Dr. Rosinha","Gleisi Hoffmann"]
- roster_encolhido_na_fonte · q_ffbc3581e312 · results: ["Benedita da Silva","Carlos Jordy","Carlos Portinho","Hélio Secco","Marcelo Crivella","Monica Benicio","Pedro Paulo","Waguinho"] × ["Benedita da Silva","Carlos Jordy","Carlos Portinho","Marcelo Crivella","Pedro Paulo","Waguinho"]
- roster_shrink_ambiguo · q_8fea61176670 · results: ["q_34f72dd970dc","q_c0e326eb9ea5"] × ["Bia Kicis","Leila do Vôlei","Michelle Bolsonaro","Sebastião Coelho"]
- roster_encolhido_na_fonte · q_1b24e57ac72a · results: ["Adriano Teixeira","Alexandre Salomão","Luiz França","Requião Filho","Samuel de Mattos","Sandro Alex","Sergio Moro","Tayná Miessa"] × ["Luiz França","Requião Filho","Sandro Alex","Sergio Moro"]
- survey_id_orphaned · s_a70e1e4da262 · survey_id: "s_a70e1e4da262" × null
- survey_id_orphaned · s_131b8aca1236 · survey_id: "s_131b8aca1236" × null
- survey_id_orphaned · s_d508a755ff61 · survey_id: "s_d508a755ff61" × null
- person_id_orphaned · p_5c16f613a8b1 · person_id: "p_5c16f613a8b1" × null
- survey_id_orphaned · s_3011615d65cd · survey_id: "s_3011615d65cd" × null
- survey_id_orphaned · s_4e46e8a6ce1f · survey_id: "s_4e46e8a6ce1f" × null
- **[2026]** registration_dates_contradict · s_31c92f50b579 · fieldwork_end: "2026-09-17" × "2025-09-17"
- **[2026]** survey_id_orphaned · s_4c85bb64cd7a · survey_id: "s_4c85bb64cd7a" × ["s_5c8808e3e2ad","s_f9705fbb14fa"]
- candidate_id_orphaned · c_e7ed24ac41cf · candidate_id: "c_e7ed24ac41cf" × null
- **[2026]** survey_id_orphaned · s_6e14bc50b2c4 · survey_id: "s_6e14bc50b2c4" × null
- candidate_id_orphaned · c_795c724899c9 · candidate_id: "c_795c724899c9" × null
- roster_encolhido_na_fonte · q_084db535e9ad · results: ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Michel Temer","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Michel Temer","Romeu Zema","Ronaldo Caiado"]
- person_id_orphaned · p_89a04e0969b5 · person_id: "p_89a04e0969b5" × null
- roster_encolhido_na_fonte · q_81c29270c61d · results: ["Antônio Galvan","Carlos Fávaro","Coronel Darwin","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"] × ["Antonio Galvan","Janaina Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"]
- roster_encolhido_na_fonte · q_83f6e82483eb · results: ["Acácio Favacho","Alliny Serrão","João Capiberibe","Lucas Barreto","Randolfe Rodrigues","Rayssa Furlan"] × ["Randolfe Rodrigues"]
- survey_id_orphaned · s_c85bb1c4d986 · survey_id: "s_c85bb1c4d986" × null
- roster_encolhido_na_fonte · q_adebb35c2793 · results: ["Carlos","Fernando Haddad","Izadora","Policial","Tarcísio de Freitas","Vera Lúcia","Vivian"] × ["Fernando Haddad","Tarcísio de Freitas"]
- roster_encolhido_na_fonte · q_49eaf98929de · results: ["Carlos Eduardo Torres Gomes","Carlos Gaguim","Eli Borges","José Alexandre Guimarães","Paulo Mourão","Ronaldo Dimas","Vanderlei Luxemburgo"] × ["Eduardo Gomes","Paulo Mourão","Vanderlei Luxemburgo"]
- roster_encolhido_na_fonte · q_80bb0eac16ba · results: ["Adriano Teixeira","Alexandre Salomão","Luiz França","Requião Filho","Samuel de Mattos","Sandro Alex","Sergio Moro","Tayná Miessa"] × ["Adriano Teixeira","Luiz França","Requião Filho","Samuel de Mattos","Sandro Alex","Sergio Moro"]
- roster_encolhido_na_fonte · q_353f2c63176f · results: ["Delcídio do Amaral","Economista Renato Gomes","Eduardo Riedel","Fábio Trad","João Henrique Catan"] × ["Eduardo Riedel","Fábio Trad","Renato Gomes"]
- survey_id_orphaned · s_3a46d49e342c · survey_id: "s_3a46d49e342c" × null
- roster_encolhido_na_fonte · q_16c8e8efcbd8 · results: ["Alcides Fernandes","Capitão Wagner","Cid Gomes","General Theóphilo","Luizianne Lins"] × ["Alcides Fernandes","Cid Gomes","Luizianne Lins"]
- **[2026]** survey_id_orphaned · s_01a5b68c7c38 · survey_id: "s_01a5b68c7c38" × ["s_50aeabe29c9d","s_e94610806bbb"]
- survey_id_orphaned · s_de7e712795bf · survey_id: "s_de7e712795bf" × null
- survey_id_orphaned · s_f5230c588084 · survey_id: "s_f5230c588084" × null
- roster_encolhido_na_fonte · q_ddab895b306d · results: ["Benedita da Silva","Carlos Jordy","Hélio Secco","Marcelo Crivella","Mauro Campos","Monica Benicio","Márcio Canella","Pedro Paulo"] × ["Benedita da Silva","Helio Secco","Marcelo Crivella","Monica Benicio","Márcio Canella","Pedro Paulo"]
- roster_encolhido_na_fonte · q_09d69ad8cfa0 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- candidate_id_orphaned · c_36f138fab0fd · candidate_id: "c_36f138fab0fd" × null
- survey_id_orphaned · s_fd9b643931ab · survey_id: "s_fd9b643931ab" × null
- survey_id_orphaned · s_d04384cae60e · survey_id: "s_d04384cae60e" × null
- roster_encolhido_na_fonte · q_d1834e01cb39 · results: ["Ivan Moraes","João Henrique Campos","Raquel Lyra"] × ["Raquel Lyra"]
- roster_encolhido_na_fonte · q_f881dcbce7b6 · results: ["Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Iure Castro","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Vanderlan Cardoso","Zacharias Calil"]
- survey_id_orphaned · s_60b534ba9fba · survey_id: "s_60b534ba9fba" × null
- segundo_turno_fragmento_descartado · q_2c04dfb5a66e · results: null × ["Flávio Bolsonaro"]
- roster_encolhido_na_fonte · q_b4ed8a1e8cba · results: ["André Marinho","Anthony Garotinho","Coronel Busnello","Cyro Garcia","Douglas Ruas","Eduardo Paes","Juliete Pantoja","Luan Monteiro","William Siri"] × ["Cyro Garcia","Douglas Ruas","Eduardo Paes","Garotinho","Juliete Pantoja","William Siri"]
- survey_id_orphaned · s_86b5e794d101 · survey_id: "s_86b5e794d101" × null
- roster_encolhido_na_fonte · q_d745aa8da77d · results: ["André do Prado","Guilherme Derrite","Marina Silva","Márcio França","Ricardo Salles","Simone Tebet"] × ["André do Prado","Marina Silva","Márcio França","Ricardo Salles","Simone Tebet"]
- roster_encolhido_na_fonte · q_ad25dff34bc3 · results: ["Celina Leão","Izalci Lucas","José Roberto Arruda","Leandro Grass","Paula Belmonte","Ricardo Cappelli"] × ["Celina Leão","Izalci Lucas","Leandro Grass","Paula Belmonte","Ricardo Cappelli"]
- person_id_orphaned · p_4123c1f0242e · person_id: "p_4123c1f0242e" × null
- roster_encolhido_na_fonte · q_e08d95960fdf · results: ["Augusto Cury","Cabo Daciolo","Edmilson Costa","Flávio Bolsonaro","Joaquim Barbosa","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- **[2026]** survey_id_orphaned · s_e1adf64bc7a6 · survey_id: "s_e1adf64bc7a6" × null
- roster_encolhido_na_fonte · q_17317a6e5bd8 · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_109c677471ec · results: ["Luiz França","Rafael Greca","Requião Filho","Sandro Alex","Sergio Moro","Tony Garcia"] × ["Luiz França","Rafael Greca","Requião Filho","Sandro Alex","Sergio Moro"]
- survey_id_orphaned · s_87a1d423ed00 · survey_id: "s_87a1d423ed00" × null
- **[2026]** survey_id_orphaned · s_a201d91048c5 · survey_id: "s_a201d91048c5" × null
- roster_encolhido_na_fonte · q_25201b4f301d · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_daff84769a4f · results: ["Carlos","Fernando Haddad","Izadora","Tarcísio de Freitas","Vera Lúcia","Vivian"] × ["Fernando Haddad","Tarcísio de Freitas"]
- roster_encolhido_na_fonte · q_218f97dc5fa5 · results: ["Cíntia Dias","Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Isaura Lemos","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Gracinha Caiado","Gustavo Mendanha","Isaura Lemos","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_31cf803be11b · results: ["Luiz França","Rafael Greca","Requião Filho","Sandro Alex","Sergio Moro","Tony Garcia"] × ["Luiz França","Rafael Greca","Requião Filho","Sandro Alex","Sergio Moro"]
- **[2026]** survey_id_orphaned · s_02a37e998c74 · survey_id: "s_02a37e998c74" × null
- roster_encolhido_na_fonte · q_b2f206c257b5 · results: ["André Marinho","Anthony Garotinho","Coronel Busnello","Cyro Garcia","Douglas Ruas","Eduardo Paes","Juliete Pantoja","Luan Monteiro","William Siri"] × ["André Marinho","Coronel Busnello","Cyro Garcia","Douglas Ruas","Eduardo Paes","Garotinho","Juliete Pantoja","Luan Monteiro"]
- **[2026]** survey_id_orphaned · s_633082258ffe · survey_id: "s_633082258ffe" × null
- survey_id_orphaned · s_86a03d650e71 · survey_id: "s_86a03d650e71" × null
- roster_encolhido_na_fonte · q_2a8bd28502d9 · results: ["André Marinho","Anthony Garotinho","Bombeiro Rafa Luz","Douglas Ruas","Eduardo Paes","William Siri","Wilson Witzel"] × ["Bombeiro Rafa Luz","Douglas Ruas","Eduardo Paes","Garotinho","Juiz Wilson Witzel"]
- survey_id_orphaned · s_b34444024759 · survey_id: "s_b34444024759" × null
- roster_encolhido_na_fonte · q_c3c964dcae62 · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto","Gracinha Caiado","Gustavo Gayer","Vanderlan Cardoso","Zacharias Calil"]
- survey_id_orphaned · s_1e1192feb3ae · survey_id: "s_1e1192feb3ae" × null
- survey_id_orphaned · s_0e8a5473413f · survey_id: "s_0e8a5473413f" × null
- survey_id_orphaned · s_2a80a48280af · survey_id: "s_2a80a48280af" × null
- survey_id_orphaned · s_0c593b8eadc3 · survey_id: "s_0c593b8eadc3" × null
- roster_encolhido_na_fonte · q_59e527c4170a · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- roster_encolhido_na_fonte · q_25fbe31329ea · results: ["Aldo Rebelo","Cabo Daciolo","Flávio Bolsonaro","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_a8ae9b982581 · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Leonardo Avalanche","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Renan Santos","Romeu Zema","Ronaldo Caiado"]
- **[2026]** survey_id_orphaned · s_fb574937fa64 · survey_id: "s_fb574937fa64" × null
- **[2026]** survey_id_orphaned · s_fca382344c1c · survey_id: "s_fca382344c1c" × null
- segundo_turno_fragmento_descartado · q_22aa3ad656a8 · results: null × ["Natasha Slhessarenko"]
- survey_id_orphaned · s_279e434d1489 · survey_id: "s_279e434d1489" × null
- roster_encolhido_na_fonte · q_512acc84d2fe · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- roster_encolhido_na_fonte · q_c130ea8f3fd1 · results: ["Carlos","Fernando Haddad","Izadora","Policial","Tarcísio de Freitas","Vera Lúcia","Vivian"] × ["Fernando Haddad","Tarcísio de Freitas","Vera Lúcia","Vivian Mendes"]
- survey_id_orphaned · s_fa649ad66fb9 · survey_id: "s_fa649ad66fb9" × null
- person_id_orphaned · p_0f858e7763d6 · person_id: "p_0f858e7763d6" × null
- **[2026]** survey_id_orphaned · s_c56731df6d03 · survey_id: "s_c56731df6d03" × null
- survey_id_orphaned · s_ad37a238425c · survey_id: "s_ad37a238425c" × null
- **[2026]** survey_id_orphaned · s_3a163bc68ed0 · survey_id: "s_3a163bc68ed0" × null
- roster_encolhido_na_fonte · q_205fa32d2eaf · results: ["Carlos","Fernando Haddad","Izadora","Policial","Tarcísio de Freitas","Vera Lúcia","Vivian"] × ["Tarcísio de Freitas"]
- candidate_id_orphaned · c_a5b8b658b85f · candidate_id: "c_a5b8b658b85f" × null
- roster_encolhido_na_fonte · q_2054420e5873 · results: ["Angelo Coronel","Jaques Wagner","João Roma","Rui Costa"] × ["Angelo Coronel","Jaques Wagner"]
- roster_encolhido_na_fonte · q_261318a2621f · results: ["Carlos Machado","Edjane","Fernando Haddad","Izadora Dias","Tarcísio de Freitas","Vera Lúcia","Vivian Mendes"] × ["Fernando Haddad","Tarcísio de Freitas","Vera Lúcia Salgado","Vivian Mendes"]
- survey_id_orphaned · s_a5501bccdfdf · survey_id: "s_a5501bccdfdf" × null
- **[2026]** survey_id_orphaned · s_18e25347bb32 · survey_id: "s_18e25347bb32" × null
- **[2026]** registration_dates_contradict · s_e94610806bbb · fieldwork_end: "2026-06-18" × "2026-02-18"
- **[2026]** survey_id_orphaned · s_2b4a113f3a83 · survey_id: "s_2b4a113f3a83" × null
- roster_encolhido_na_fonte · q_514f73e5bcff · results: ["Ataídes Oliveira","Dorinha Rezende","Laurez Moreira","Vicentinho Júnior"] × ["Laurez Moreira","Professora Dorinha","Vicentinho Júnior"]
- roster_encolhido_na_fonte · q_9550b47bba2e · results: ["Luiz França","Rafael Greca","Requião Filho","Sandro Alex","Sergio Moro","Tony Garcia"] × ["Luiz França","Rafael Greca","Requião Filho","Sandro Alex","Sergio Moro"]
- **[2026]** survey_id_orphaned · s_7ad091f1d574 · survey_id: "s_7ad091f1d574" × null
- roster_encolhido_na_fonte · q_d207c6c6c0e2 · results: ["Breno Guimarães","Celso Sabino","Chicão Melo","Gizelle Freitas","Helder Barbalho","Zequinha Marinho","Éder Mauro"] × ["Celso Sabino","Chicão","Delegado Eder Mauro","Helder Barbalho","Zequinha Marinho"]
- roster_encolhido_na_fonte · q_cb126fd96040 · results: ["Adriano Teixeira","Alexandre Salomão","Luiz França","Requião Filho","Samuel de Mattos","Sandro Alex","Sergio Moro","Tayná Miessa"] × ["Adriano Teixeira","Luiz França","Requião Filho","Samuel de Mattos"]
- segundo_turno_fragmento_descartado · q_213fd8d924e4 · results: null × ["Flávio Bolsonaro"]
- candidate_id_orphaned · c_900f81ffe530 · candidate_id: "c_900f81ffe530" × null
- candidate_id_orphaned · c_719f94ccbff5 · candidate_id: "c_719f94ccbff5" × null
- roster_encolhido_na_fonte · q_8583ddf05e47 · results: ["Celina Leão","José Roberto Arruda","Leandro Grass","Paula Belmonte","Ricardo Cappelli"] × ["Celina Leão","Leandro Grass","Paula Belmonte","Ricardo Cappelli"]
- survey_id_orphaned · s_f0282f817039 · survey_id: "s_f0282f817039" × null
- candidate_id_orphaned · c_9480ee103e77 · candidate_id: "c_9480ee103e77" × null
- person_id_orphaned · p_ab33f36e047e · person_id: "p_ab33f36e047e" × null
- roster_encolhido_na_fonte · q_6c89ad101707 · results: ["André Marinho","Anthony Garotinho","Coronel Busnello","Cyro Garcia","Douglas Ruas","Eduardo Paes","Juliete Pantoja","Luan Monteiro","William Siri"] × ["André Marinho","Coronel Busnello","Cyro Garcia","Douglas Ruas","Eduardo Paes","Garotinho","Juliete Pantoja","William Siri"]
- **[2026]** survey_id_orphaned · s_d3fc6e8d5872 · survey_id: "s_d3fc6e8d5872" × ["s_5c8808e3e2ad","s_f9705fbb14fa"]
- roster_encolhido_na_fonte · q_f9bd4bf21c26 · results: ["Breno Guimarães","Celso Sabino","Chicão Melo","Gal Leite","Gizelle Freitas","Helder Barbalho","Marcelino Conti","Zequinha Marinho","Éder Mauro"] × ["Helder Barbalho","Zequinha Marinho"]
- **[2026]** survey_id_orphaned · s_01e06260d4fb · survey_id: "s_01e06260d4fb" × null
- roster_encolhido_na_fonte · q_c488c07bdd49 · results: ["Carlos Fávaro","Galvan","Janaína Riva","José Medeiros","Mauro Mendes","Pedro Taques"] × ["Antonio Galvan","Carlos Fávaro","José Medeiros","Mauro Mendes","Pedro Taques"]
- roster_encolhido_na_fonte · q_6618e5bc5526 · results: ["Carlos Machado","Edjane","Fernando Haddad","Izadora Dias","Tarcísio de Freitas","Vera Lúcia","Vivian Mendes"] × ["Carlos Machado","Fernando Haddad","Policial Edjane","Tarcísio de Freitas","Vera Lúcia Salgado","Vivian Mendes"]
- person_id_orphaned · p_da2314c6ff51 · person_id: "p_da2314c6ff51" × null
- **[2026]** survey_id_orphaned · s_684407aea71b · survey_id: "s_684407aea71b" × null
- person_id_orphaned · p_1443477b00a0 · person_id: "p_1443477b00a0" × null
- survey_id_orphaned · s_3e41151fee3d · survey_id: "s_3e41151fee3d" × null
- **[2026]** survey_id_orphaned · s_4f54568b9e9f · survey_id: "s_4f54568b9e9f" × null
- roster_encolhido_na_fonte · q_d21905041a45 · results: ["Luiz França","Rafael Greca","Requião Filho","Sandro Alex","Sergio Moro","Tony Garcia"] × ["Luiz França","Rafael Greca","Requião Filho","Sandro Alex","Sergio Moro"]
- segundo_turno_fragmento_descartado · q_4663149bae19 · results: null × ["Lula"]
- **[2026]** survey_id_orphaned · s_da49c545e041 · survey_id: "s_da49c545e041" × null
- roster_encolhido_na_fonte · q_59b9876eb959 · results: ["Paulo Hartung","Ricardo Ferraço","Vatagem"] × ["Paulo Hartung","Ricardo Ferraço"]
- roster_encolhido_na_fonte · q_b651c35964d3 · results: ["Augusto Cury","Cabo Daciolo","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- person_id_orphaned · p_0e9873d3c6de · person_id: "p_0e9873d3c6de" × null
- roster_encolhido_na_fonte · q_475520df954a · results: ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- person_id_orphaned · p_e4f9f838db15 · person_id: "p_e4f9f838db15" × null
- roster_encolhido_na_fonte · q_d9d41a30e14b · results: ["André Marinho","Anthony Garotinho","Coronel Busnello","Cyro Garcia","Douglas Ruas","Eduardo Paes","Juliete Pantoja","Luan Monteiro","William Siri"] × ["André Marinho","Coronel Busnello","Douglas Ruas","Eduardo Paes","Garotinho","William Siri"]
- **[2026]** survey_id_orphaned · s_d42238b605d5 · survey_id: "s_d42238b605d5" × ["s_31c92f50b579","s_6fc8e23dd8c5"]
- person_id_orphaned · p_0db6cbcd8520 · person_id: "p_0db6cbcd8520" × null
- survey_id_orphaned · s_82e4b8305699 · survey_id: "s_82e4b8305699" × null
- roster_encolhido_na_fonte · q_9e8375153b29 · results: ["Carlos Machado","Edjane","Fernando Haddad","Izadora Dias","Tarcísio de Freitas","Vera Lúcia","Vivian Mendes"] × ["Fernando Haddad","Tarcísio de Freitas"]
- survey_id_orphaned · s_d5ade7955957 · survey_id: "s_d5ade7955957" × null
- roster_encolhido_na_fonte · q_96544c77594f · results: ["Acácio Favacho","Alliny Serrão","João Capiberibe","Lucas Barreto","Randolfe Rodrigues","Rayssa Furlan"] × ["João Capiberibe","Lucas Barreto","Randolfe Rodrigues","Rayssa Furlan"]
- survey_id_orphaned · s_29780600671a · survey_id: "s_29780600671a" × null
- roster_encolhido_na_fonte · q_032fbb03a4b0 · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto","Gracinha Caiado","Gustavo Gayer","Vanderlan Cardoso","Zacharias Calil"]
- **[2026]** survey_id_orphaned · s_d09e70844654 · survey_id: "s_d09e70844654" × null
- roster_encolhido_na_fonte · q_f94941f8db85 · results: ["Alexandre Baldy","Delegado Humberto Teófilo","Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Alexandre Baldy","Delegado Humberto","Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Vanderlan Cardoso","Zacharias Calil"]
- segundo_turno_fragmento_descartado · q_5834d4da696f · results: null × ["Helder Salomão"]
- survey_id_orphaned · s_b2a712c74872 · survey_id: "s_b2a712c74872" × null
- roster_encolhido_na_fonte · q_115273290ff5 · results: ["André do Prado","Guilherme Derrite","Marina Silva","Paulinho da Força","Ricardo Salles","Simone Tebet"] × ["André do Prado","Marina Silva","Paulinho da Força","Ricardo Salles","Simone Tebet"]
- roster_encolhido_na_fonte · q_933648b0880c · results: ["Celso Sabino","Chicão Melo","Gizelle Freitas","Helder Barbalho","Lívia Noronha","Marcelino Conti","Zequinha Marinho","Éder Mauro"] × ["Celso Sabino","Chicão","Delegado Eder Mauro","Helder Barbalho","Zequinha Marinho"]
- segundo_turno_fragmento_descartado · q_ff622d2ef555 · results: null × ["Rogério Marinho"]
- **[2026]** survey_id_orphaned · s_437ad64d72d8 · survey_id: "s_437ad64d72d8" × null
- roster_encolhido_na_fonte · q_0420a1984a50 · results: ["Augusto Cury","Cabo Daciolo","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Leonardo Avalanche","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Cabo Daciolo","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Leonardo Avalanche","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"]
- roster_encolhido_na_fonte · q_dbb979705f2e · results: ["Frederico Antunes","Germano Rigotto","Manuela d'Ávila","Marcel van Hattem","Paulo Pimenta","Ubiratan Sanderson"] × ["Germano Rigotto","Marcel van Hatten","Paulo Pimenta"]
- roster_encolhido_na_fonte · q_50189187a05f · results: ["André Marinho","Anthony Garotinho","Coronel Busnello","Cyro Garcia","Douglas Ruas","Eduardo Paes","Juliete Pantoja","Luan Monteiro","William Siri"] × ["Cyro Garcia","Douglas Ruas","Eduardo Paes","Garotinho","Juliete Pantoja","William Siri"]
- survey_id_orphaned · s_cfa989375bae · survey_id: "s_cfa989375bae" × null
- roster_encolhido_na_fonte · q_5bd0cc57c68d · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- **[2026]** survey_id_orphaned · s_9949485e2ceb · survey_id: "s_9949485e2ceb" × null
- survey_id_orphaned · s_0706498813c5 · survey_id: "s_0706498813c5" × null
- survey_id_orphaned · s_22189e56bb64 · survey_id: "s_22189e56bb64" × null
- candidate_id_orphaned · c_b3516aa90794 · candidate_id: "c_b3516aa90794" × null
- survey_id_orphaned · s_87a0ffb9c125 · survey_id: "s_87a0ffb9c125" × null
- roster_encolhido_na_fonte · q_a32de52aa7a2 · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_573b96105b9b · results: ["André Marinho","Anthony Garotinho","Coronel Busnello","Cyro Garcia","Douglas Ruas","Eduardo Paes","Juliete Pantoja","Luan Monteiro","William Siri"] × ["Cyro Garcia","Garotinho","Juliete Pantoja"]
- segundo_turno_fragmento_descartado · q_5ed3895564cc · results: null × ["Helder Salomão"]
- roster_encolhido_na_fonte · q_a5d9d7a52d81 · results: ["Carlos","Fernando Haddad","Policial","Tarcísio de Freitas","Vera Lúcia","Vivian"] × ["Fernando Haddad","Tarcísio de Freitas"]
- survey_id_orphaned · s_7c5b376bd369 · survey_id: "s_7c5b376bd369" × null
- person_id_orphaned · p_031c2957a0b7 · person_id: "p_031c2957a0b7" × null
- roster_encolhido_na_fonte · q_748ca349fcdf · results: ["Frederico Antunes","Germano Rigotto","Manuela d'Ávila","Marcel van Hattem","Paulo Pimenta","Ubiratan Sanderson"] × ["Germano Rigotto","Manuela D'Ávila","Marcel van Hatten","Paulo Pimenta"]
- survey_id_orphaned · s_ba8e3ce33682 · survey_id: "s_ba8e3ce33682" × null
- roster_encolhido_na_fonte · q_a353134e049a · results: ["Alan Rick","Mailza Assis","Thor Dantas","Tião Bocalom"] × ["Alan Rick","Dr.Thor Dantas","Tião Bocalom"]
- roster_encolhido_na_fonte · q_1bbe319aceb0 · results: ["Luiz França","Requião Filho","Sandro Alex","Sergio Moro","Tayná Miessa"] × ["Luiz França","Requião Filho","Sandro Alex","Sergio Moro"]
- roster_encolhido_na_fonte · q_dd275c65c0e9 · results: ["Emanuel Cacho","Fábio Mitidieri","Ricardo Marques","Valmir de Francisquinho"] × ["Fábio Mitidieri","Valmir de Francisquinho"]
- roster_encolhido_na_fonte · q_77259a38a97c · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Veterinário Wilson Grassi"]
- survey_id_orphaned · s_3d78f57f9a39 · survey_id: "s_3d78f57f9a39" × null
- roster_encolhido_na_fonte · q_1b7cb6991db4 · results: ["Capitão Alberto Neto","Eduardo Braga","Marcelo Ramos","Marcos Rotta","Plínio Valério","Wilson Miranda Lima"] × ["Plínio Valério","Wilson Lima"]
- **[2026]** survey_id_orphaned · s_7af548239bb0 · survey_id: "s_7af548239bb0" × null
- segundo_turno_fragmento_descartado · q_39c338f86fda · results: null × ["Lula"]
- candidate_id_orphaned · c_aa28d8a1d466 · candidate_id: "c_aa28d8a1d466" × null
- roster_encolhido_na_fonte · q_dd16ed2dfb46 · results: ["Carlos","Fernando Haddad","Izadora","Policial","Tarcísio de Freitas","Vera Lúcia","Vivian"] × ["Fernando Haddad","Vera Lúcia","Vivian Mendes"]
- roster_encolhido_na_fonte · q_978f2ffef235 · results: ["Gabriel Souza","Juliana Brizola","Luciano Zucco","Marcelo Maranata"] × ["Coronel Zucco","Gabriel Souza","Juliana Brizola"]
- person_id_orphaned · p_3ec449980942 · person_id: "p_3ec449980942" × null
- roster_encolhido_na_fonte · q_92cf12883054 · results: ["Alexandre Silveira","Aécio Neves","Carlos Viana","Domingos Savio","Marcelo Aro","Marília Campos","Áurea Carolina"] × ["Alexandre Silveira","Aécio Neves","Carlos Viana","Domingos Sávio","Marcelo Aro","Marília Campos"]
- roster_encolhido_na_fonte · q_6b7fca8b53b4 · results: ["Cíntia Dias","Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Isaura Lemos","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Gustavo Medanha","Vanderlan Cardoso","Zacharias Calil"]
- roster_encolhido_na_fonte · q_7b71a11fdffe · results: ["Carlos","Fernando Haddad","Izadora","Tarcísio de Freitas","Vera Lúcia","Vivian"] × ["Fernando Haddad","Tarcísio de Freitas","Vera Lúcia Salgado","Vivian Mendes"]
- roster_encolhido_na_fonte · q_de52cd97e6aa · results: ["André Marinho","Bombeiro Rafa Luz","Douglas Ruas","Eduardo Paes","William Siri","Wilson Witzel"] × ["Bombeiro Rafa Luz","Douglas Ruas","Eduardo Paes","Juiz Wilson Witzel","William Siri"]
- roster_encolhido_na_fonte · q_09e2e39fd0f7 · results: ["Aldo Rebelo","Augusto Cury","Flávio Bolsonaro","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- person_id_orphaned · p_4b957250187a · person_id: "p_4b957250187a" × null
- **[2026]** survey_id_orphaned · s_15d81e75c955 · survey_id: "s_15d81e75c955" × null
- roster_encolhido_na_fonte · q_c1a4126fa378 · results: ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann","Joaquim do MLB","Karen Guerreiro","Marcelo Marcelino"] × ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann"]
- roster_encolhido_na_fonte · q_6959dca8ed81 · results: ["Aldo Rebelo","Eduardo Leite","Flávio Bolsonaro","Luiz Inácio Lula da Silva","Ratinho Júnior","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Eduardo Leite","Flávio Bolsonaro","Lula","Ratinho Jr","Romeu Zema","Ronaldo Caiado"]
- survey_id_orphaned · s_2c8dc1e8c1be · survey_id: "s_2c8dc1e8c1be" × null
- roster_encolhido_na_fonte · q_1296fef8ef4c · results: ["Adriano Teixeira","Alexandre Salomão","Luiz França","Requião Filho","Samuel de Mattos","Sandro Alex","Sergio Moro","Tayná Miessa"] × ["Luiz França","Requião Filho","Samuel de Mattos","Sandro Alex"]
- segundo_turno_fragmento_descartado · q_40e17ae3c3ed · results: null × ["Rafael Greca"]
- survey_id_orphaned · s_6452b1de19dc · survey_id: "s_6452b1de19dc" × null
- roster_encolhido_na_fonte · q_85b880cae2f3 · results: ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann","Joaquim do MLB","Karen Guerreiro","Marcelo Marcelino"] × ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann"]
- roster_encolhido_na_fonte · q_aca97a46347b · results: ["Angelo Coronel","Jaques Wagner","João Roma","Rui Costa"] × ["Angelo Coronel","João Roma","Rui Costa"]
- roster_encolhido_na_fonte · q_99791105652a · results: ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann","Joaquim do MLB","Karen Guerreiro","Marcelo Marcelino"] × ["Alexandre Curi","Cristina Graeml","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann"]
- roster_encolhido_na_fonte · q_6eba2829d2d6 · results: ["Alfredo Gaspar","Arthur Lira","Davi Davino Filho","Eudócia Caldas","José Wanderley Neto","Renan Calheiros"] × ["Alfredo Gaspar","Arthur Lira","Davi Filho","Dr. Wanderley","Renan Calheiros"]
- **[2026]** survey_id_orphaned · s_5b6a4eb523eb · survey_id: "s_5b6a4eb523eb" × null
- survey_id_orphaned · s_55ff43764975 · survey_id: "s_55ff43764975" × null
- roster_encolhido_na_fonte · q_2f9b90e5f145 · results: ["Emanuel Cacho","Fábio Mitidieri","Ricardo Marques","Valmir de Francisquinho"] × ["Emanuel Cacho","Ricardo Marques","Valmir de Francisquinho"]
- candidate_id_orphaned · c_d3a5a462deb7 · candidate_id: "c_d3a5a462deb7" × null
- roster_encolhido_na_fonte · q_6ab461fbe634 · results: ["Adriana Accorsi","Daniel Vilela","Marconi Perillo","Wilder Morais"] × ["Adriana Accorsi","Marconi Perillo","Wilder Morais"]
- roster_encolhido_na_fonte · q_818ba53d282b · results: ["Aldo Rebelo","Flávio Bolsonaro","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- roster_encolhido_na_fonte · q_93156ab4cff8 · results: ["Gelson Merisio","Jorginho Mello","João Rodrigues","Marcelo Brigadeiro"] × ["Jorginho Mello","João Rodrigues"]
- survey_id_orphaned · s_ebaaf2b12f75 · survey_id: "s_ebaaf2b12f75" × null
- **[2026]** survey_id_orphaned · s_499a692a924f · survey_id: "s_499a692a924f" × null
- roster_encolhido_na_fonte · q_9ae93e8ead4f · results: ["Maria do Carmo Seffair","Omar Aziz"] × ["Maria do Carmo Seffair"]
- **[2026]** survey_id_orphaned · s_8d362e1c54fb · survey_id: "s_8d362e1c54fb" × null
- roster_encolhido_na_fonte · q_e138f5f79366 · results: ["Augusto Cury","Aécio Neves","Cabo Daciolo","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"] × ["Augusto Cury","Aécio Neves","Cabo Daciolo","Flávio Bolsonaro","Hertz Dias","Joaquim Barbosa","Lula","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta"]
- survey_id_orphaned · s_3aedff7de255 · survey_id: "s_3aedff7de255" × null
- roster_encolhido_na_fonte · q_9b96e670dda1 · results: ["Carlos","Fernando Haddad","Izadora","Tarcísio de Freitas","Vera Lúcia","Vivian"] × ["Fernando Haddad","Tarcísio de Freitas","Vera Lúcia Salgado","Vivian Mendes"]
- roster_encolhido_na_fonte · q_f0e6b65a6ef2 · results: ["Cíntia Dias","Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Isaura Lemos","Oséias Varão","Vanderlan Cardoso","Zacharias Calil"] × ["Gracinha Caiado","Gustavo Gayer","Gustavo Mendanha","Isaura Lemos","Vanderlan Cardoso"]
- roster_encolhido_na_fonte · q_04cd508627eb · results: ["André Marinho","Anthony Garotinho","Coronel Busnello","Cyro Garcia","Douglas Ruas","Eduardo Paes","Juliete Pantoja","Luan Monteiro","William Siri"] × ["Cyro Garcia","Douglas Ruas"]
- roster_encolhido_na_fonte · q_6c53b94621e1 · results: ["Arthur Henrique","Clébio Genuíno","Farah Mesquita","Rosi Aires","Soldado Sampaio"] × ["Arthur Henrique","Soldado Sampaio"]
- roster_encolhido_na_fonte · q_bdd29a24c6d3 · results: ["Acácio Favacho","Alliny Serrão","João Capiberibe","Lucas Barreto","Randolfe Rodrigues","Rayssa Furlan"] × ["Acácio Favacho","Lucas Barreto","Randolfe Rodrigues","Rayssa Furlan"]
- **[2026]** survey_id_orphaned · s_5a672f8055ec · survey_id: "s_5a672f8055ec" × null
- roster_encolhido_na_fonte · q_76f7d064157b · results: ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann","Joaquim do MLB","Karen Guerreiro","Marcelo Marcelino"] × ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Dr. Rosinha","Filipe Barros","Gleisi Hoffmann"]
- survey_id_orphaned · s_76c5918b59a0 · survey_id: "s_76c5918b59a0" × null
- roster_encolhido_na_fonte · q_10480c940e4f · results: ["Frederico Antunes","Germano Rigotto","Manuela d'Ávila","Marcel van Hattem","Paulo Pimenta","Ubiratan Sanderson"] × ["Germano Rigotto","Paulo Pimenta"]
- segundo_turno_fragmento_descartado · q_f6be600af228 · results: null × ["Tarcísio de Freitas"]
- survey_id_orphaned · s_b2dd52e86019 · survey_id: "s_b2dd52e86019" × null
- **[2026]** survey_id_orphaned · s_d1eca32f49ef · survey_id: "s_d1eca32f49ef" × ["s_29fd25ba2b71","s_c29b3c8dfdd7"]
- candidate_id_orphaned · c_0b6c4e63ce69 · candidate_id: "c_0b6c4e63ce69" × null
- roster_encolhido_na_fonte · q_0390eb85347e · results: ["Carlos","Fernando Haddad","Izadora","Tarcísio de Freitas","Vera Lúcia","Vivian"] × ["Carlos Machado","Fernando Haddad","Tarcísio de Freitas","Vera Lúcia Salgado","Vivian Mendes"]
- **[2026]** survey_id_orphaned · s_ae73edd9fed9 · survey_id: "s_ae73edd9fed9" × null
- roster_encolhido_na_fonte · q_93beb4460e37 · results: ["Carlos","Fernando Haddad","Izadora","Tarcísio de Freitas","Vera Lúcia","Vivian"] × ["Fernando Haddad","Tarcísio de Freitas"]
- roster_encolhido_na_fonte · q_1775cfb342c1 · results: ["Gabriel Souza","Juliana Brizola","Luciano Zucco","Marcelo Maranata"] × ["Gabriel Souza","Juliana Brizola"]
- candidate_id_orphaned · c_2b0746aca888 · candidate_id: "c_2b0746aca888" × null
- roster_encolhido_na_fonte · q_c8a51b6569f9 · results: ["Benedita da Silva","Carlos Jordy","Carlos Portinho","Hélio Secco","Marcelo Crivella","Monica Benicio","Pedro Paulo","Waguinho"] × ["Carlos Portinho","Waguinho"]
- roster_encolhido_na_fonte · q_f241da6001c4 · results: ["Breno Guimarães","Celso Sabino","Chicão Melo","Coronel Jonildo","Edlaine Rodrigues","Fernanda Lopes","Gizelle Freitas","Helder Barbalho","Lívia Noronha","Marcelino Conti","Zequinha Marinho","Éder Mauro"] × ["Celso Sabino","Chicão","Delegado Eder Mauro","Zequinha Marinho"]
- person_id_orphaned · p_cf233d314ffb · person_id: "p_cf233d314ffb" × null
- roster_shrink_ambiguo · q_c7f735580bf7 · results: ["q_010e75f8264b","q_05fddf2ddd91","q_0ee00787886e","q_1e9b5b777091","q_506ec64b42ff","q_5834066255d8","q_be4d5b0b20b5","q_c3f87fcb00da"] × ["Flávio Bolsonaro","Lula"]
- **[2026]** survey_id_orphaned · s_d4700c1edd86 · survey_id: "s_d4700c1edd86" × null
- survey_id_orphaned · s_0e6ae3808355 · survey_id: "s_0e6ae3808355" × null
- roster_encolhido_na_fonte · q_fd16780ae6ba · results: ["Adriano Teixeira","Alexandre Salomão","Luiz França","Requião Filho","Samuel de Mattos","Sandro Alex","Sergio Moro","Tayná Miessa"] × ["Luiz França","Requião Filho","Sandro Alex","Sergio Moro"]
- roster_encolhido_na_fonte · q_dcae94be8c6d · results: ["André do Prado","Guilherme Derrite","Márcio França","Ricardo Salles","Simone Tebet"] × ["André do Prado","Márcio França","Ricardo Salles","Simone Tebet"]
- roster_encolhido_na_fonte · q_69bbb309f808 · results: ["Alexandre Kalil","Ben Mendes","Cleitinho","Flávio Roscoe","Gabriel Azevedo","Mateus Simões","Patrus Ananias"] × ["Cleitinho Azevedo","Patrus Ananias"]
- roster_encolhido_na_fonte · q_dcab2c21fcb6 · results: ["Adriano Teixeira","Alexandre Salomão","Luiz França","Requião Filho","Samuel de Mattos","Sandro Alex","Sergio Moro","Tayná Miessa"] × ["Luiz França","Requião Filho","Sandro Alex","Sergio Moro"]
- segundo_turno_fragmento_descartado · q_67f8e0916ed5 · results: null × ["Aécio Neves"]
- survey_id_orphaned · s_67a8dda7d659 · survey_id: "s_67a8dda7d659" × null
- roster_encolhido_na_fonte · q_82fdecb63292 · results: ["André do Prado","Dr.ª","Ednelson","Geraldo","Guilherme Derrite","Guto","Marina Silva","Maíra","Márcio","Petter","Ricardo Salles","Simone Tebet","Soninha Francine","Weller","William"] × ["André do Prado","Capitão Derrite","Geraldo Rufino","Guto Schiavetto","Marina Silva","Ricardo Salles","Simone Tebet","Soninha"]
- roster_encolhido_na_fonte · q_69bf17c316c8 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Sargento Laudicério","Wellington Fagundes"] × ["Jayme Campos","Natasha Slhessarenko","Otaviano Pivetta","Wellington Fagundes"]
- roster_encolhido_na_fonte · q_15a6e2dd3252 · results: ["André do Prado","Dr.ª","Ednelson","Geraldo","Guilherme Derrite","Guto","Marina Silva","Maíra","Márcio","Petter","Ricardo Salles","Simone Tebet","Soninha Francine","Weller","William"] × ["André do Prado","Capitão Derrite","Geraldo Rufino","Guto Schiavetto","Marina Silva","Ricardo Salles","Simone Tebet","Soninha"]
- roster_encolhido_na_fonte · q_55ed4dc97056 · results: ["David Almeida","Maria do Carmo Seffair","Omar Aziz","Roberto Cidade"] × ["Maria do Carmo Seffair","Omar Aziz","Roberto Cidade"]
- candidate_id_orphaned · c_c00bd8304097 · candidate_id: "c_c00bd8304097" × null
- roster_encolhido_na_fonte · q_0fafc7baadb6 · results: ["Alcides Fernandes","Capitão Wagner","Cid Gomes","General Theóphilo","Luizianne Lins"] × ["Alcides Fernandes","Cid Gomes","General Theophilo","Luizianne Lins"]
- segundo_turno_fragmento_descartado · q_b788ab943e31 · results: null × ["Requião Filho"]
- roster_encolhido_na_fonte · q_b86e0a03652a · results: ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado"] × ["Aldo Rebelo","Augusto Cury","Cabo Daciolo","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado"]
- survey_id_orphaned · s_1081ab99b2fb · survey_id: "s_1081ab99b2fb" × null
- segundo_turno_fragmento_descartado · q_955902fad9bd · results: null × ["Ratinho Jr."]
- **[2026]** survey_id_orphaned · s_67a9aa06743c · survey_id: "s_67a9aa06743c" × null
- roster_encolhido_na_fonte · q_b1777efcc42e · results: ["Guto Silva","Luiz França","Rafael Greca","Requião Filho","Sergio Moro","Tony Garcia"] × ["Guto Silva","Luiz França","Rafael Greca","Requião Filho","Sergio Moro"]
- roster_encolhido_na_fonte · q_0ac69c1d7c5a · results: ["Alfredo Gaspar","Arthur Lira","Davi Davino Filho","Eudócia Caldas","José Wanderley Neto","Renan Calheiros"] × ["Alfredo Gaspar","Arthur Lira","Davi Davino","Dr. Wanderley","Renan Calheiros"]
- candidate_id_orphaned · c_c8d594af04de · candidate_id: "c_c8d594af04de" × null
- roster_encolhido_na_fonte · q_5b864560473f · results: ["Alexandre Curi","Cristina Graeml","Deltan Dallagnol","Filipe Barros","Gleisi Hoffmann","Álvaro Dias"] × ["Filipe Barros"]
- survey_id_orphaned · s_1da98a1aa538 · survey_id: "s_1da98a1aa538" × null
- survey_id_orphaned · s_8932d995bc39 · survey_id: "s_8932d995bc39" × null
- roster_encolhido_na_fonte · q_e383b2313f4d · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Flávio Bolsonaro","Lula","Romeu Zema","Ronaldo Caiado","Samara Martins"]
- roster_encolhido_na_fonte · q_08089c6641c6 · results: ["Doutora Natasha","Otaviano Pivetta","Wellington Fagundes"] × ["Otaviano Pivetta"]
- survey_id_orphaned · s_fb8bb091ab26 · survey_id: "s_fb8bb091ab26" × null
- **[2026]** survey_id_orphaned · s_c47547ccab92 · survey_id: "s_c47547ccab92" × null
- candidate_id_orphaned · c_66f0e4c0895e · candidate_id: "c_66f0e4c0895e" × null
- **[2026]** survey_id_orphaned · s_65733026b5cc · survey_id: "s_65733026b5cc" × null
- survey_id_orphaned · s_d43b933d2a49 · survey_id: "s_d43b933d2a49" × null
- roster_encolhido_na_fonte · q_4fdbd83f562b · results: ["André do Prado","Dr.ª","Ednelson","Geraldo","Guilherme Derrite","Guto","Marina Silva","Maíra","Márcio","Petter","Ricardo Salles","Simone Tebet","Soninha Francine","Weller","William"] × ["André do Prado","Marina Silva","Ricardo Salles","Simone Tebet","Soninha"]
- survey_id_orphaned · s_dd65fc2f688f · survey_id: "s_dd65fc2f688f" × null
- roster_encolhido_na_fonte · q_b2332206ba0c · results: ["Augusto Cury","Clariana Barão","Edmilson Costa","Flávio Bolsonaro","Hertz Dias","Luiz Inácio Lula da Silva","Pablo Marçal","Renan Santos","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins","Wilson Grassi"] × ["Augusto Cury","Clariana Barão","Flávio Bolsonaro","Hertz Dias","Lula","Pablo Marçal","Romeu Zema","Ronaldo Caiado","Rui Costa Pimenta","Samara Martins"]
- disputa_em_quarentena · governador:AC · quarentena: 89 × 86
- disputa_em_quarentena · governador:AL · quarentena: 60 × 59
- disputa_em_quarentena · governador:AM · quarentena: 135 × 136
- disputa_em_quarentena · governador:AP · quarentena: 43 × 42
- disputa_em_quarentena · governador:BA · quarentena: 73 × 70
- disputa_em_quarentena · governador:CE · quarentena: 97 × 92
- disputa_em_quarentena · governador:DF · quarentena: 101 × 103
- disputa_em_quarentena · governador:ES · quarentena: 109 × 96
- disputa_em_quarentena · governador:GO · quarentena: 106 × 99
- disputa_em_quarentena · governador:MA · quarentena: 64 × 60
- disputa_em_quarentena · governador:MG · quarentena: 154 × 137
- disputa_em_quarentena · governador:MS · quarentena: 47 × 47
- disputa_em_quarentena · governador:MT · quarentena: 82 × 80
- disputa_em_quarentena · governador:PA · quarentena: 103 × 96
- disputa_em_quarentena · governador:PB · quarentena: 68 × 68
- disputa_em_quarentena · governador:PE · quarentena: 117 × 117
- disputa_em_quarentena · governador:PI · quarentena: 40 × 39
- disputa_em_quarentena · governador:PR · quarentena: 154 × 134
- disputa_em_quarentena · governador:RJ · quarentena: 94 × 86
- disputa_em_quarentena · governador:RN · quarentena: 134 × 130
- disputa_em_quarentena · governador:RO · quarentena: 62 × 60
- disputa_em_quarentena · governador:RR · quarentena: 26 × 22
- disputa_em_quarentena · governador:RS · quarentena: 75 × 68
- disputa_em_quarentena · governador:SC · quarentena: 37 × 34
- disputa_em_quarentena · governador:SE · quarentena: 74 × 70
- disputa_em_quarentena · governador:SP · quarentena: 184 × 138
- disputa_em_quarentena · presidente:BR · quarentena: 1805 × 1440
- disputa_em_quarentena · senador:AC · quarentena: 47 × 32
- disputa_em_quarentena · senador:AL · quarentena: 43 × 42
- disputa_em_quarentena · senador:AM · quarentena: 41 × 40
- disputa_em_quarentena · senador:AP · quarentena: 30 × 29
- disputa_em_quarentena · senador:BA · quarentena: 36 × 35
- disputa_em_quarentena · senador:CE · quarentena: 55 × 42
- disputa_em_quarentena · senador:DF · quarentena: 41 × 39
- disputa_em_quarentena · senador:ES · quarentena: 46 × 30
- disputa_em_quarentena · senador:GO · quarentena: 59 × 58
- disputa_em_quarentena · senador:MA · quarentena: 31 × 29
- disputa_em_quarentena · senador:MG · quarentena: 47 × 41
- disputa_em_quarentena · senador:MS · quarentena: 47 × 37
- disputa_em_quarentena · senador:MT · quarentena: 34 × 31
- disputa_em_quarentena · senador:PA · quarentena: 61 × 55
- disputa_em_quarentena · senador:PB · quarentena: 29 × 29
- disputa_em_quarentena · senador:PE · quarentena: 76 × 54
- disputa_em_quarentena · senador:PI · quarentena: 39 × 39
- disputa_em_quarentena · senador:PR · quarentena: 66 × 52
- disputa_em_quarentena · senador:RJ · quarentena: 44 × 39
- disputa_em_quarentena · senador:RN · quarentena: 65 × 64
- disputa_em_quarentena · senador:RO · quarentena: 25 × 24
- disputa_em_quarentena · senador:RR · quarentena: 17 × 15
- disputa_em_quarentena · senador:RS · quarentena: 38 × 34
- disputa_em_quarentena · senador:SC · quarentena: 27 × 24
- disputa_em_quarentena · senador:SE · quarentena: 39 × 39
- disputa_em_quarentena · senador:SP · quarentena: 80 × 61
- disputa_em_quarentena · senador:TO · quarentena: 40 × 37

## UNIVERSO — Pesquisa estadual com amostra possivelmente municipal (não certificada) (3)

Disputa estadual (governador/senador) com universo gravado 'uf' e amostra < 800 que ainda NÃO está no ledger de vereditos (data/universe-verdicts.json). Amostra pequena NÃO prova municipal — muitas estaduais legítimas são pequenas — então cada uma exige leitura de fonte (cega) antes de gatear. Ponto cego conhecido: um municipal com n ≥ 800 escapa desta varredura; o gate é por veredito no ledger, não por este limiar. Confirmada municipal, entra no ledger e sai das médias estaduais; confirmada estadual, entra como estadual e para de aparecer aqui. É triagem, não porta.

- **[2026]** s_9f4d281a252f · Direct Pesquisas · GO · n=500 · registro GO-05001/2026
- **[2026]** s_a7c84a21faf0 · Direct Pesquisas · GO · n=500 · registro GO-03428/2026
- **[2026]** s_a730093c4b6a · IPR · MS · n=784 · registro —

## PARTIDA — A mesma pessoa em duas linhas, uma delas sem registro (0)

Uma pessoa observada cuja grafia ALCANÇA, na disputa dela, a candidatura de uma pessoa registrada: são a mesma pessoa, gravada duas vezes. O caso normal é a estreia de um nome numa disputa nova e se resolve na coleta seguinte sem intervenção (§6) — o que importa aqui é o que PERSISTIR de uma rodada para a outra.

*Nada a reportar.*

