# Censo do banco — Placar das Pesquisas 2026

Gerado por `node scripts/census.mjs` a partir de `data/`. Não editar à mão.

Banco: **1173 levantamentos · 4073 perguntas · 145 institutos · 1221 candidatos**.

Este arquivo é a definição operacional de *banco normalizado*: as classes abaixo são fixas em código, e
o banco está normalizado quando todas estão vazias — ou quando o que resta está explicitamente parqueado
como decisão editorial. Achado fora destas classes é anotado, não corrigido no meio de uma rodada.

| classe | itens | de 2026 |
|---|---|---|
| **SOMA** — Elenco de vaga única somando mais de 100 | 2 | 2 |
| **PESSOA** — Candidatos que podem não ser pessoas | 0 | 0 |
| **ORFAO** — Resultados apontando para candidato inexistente | 0 | 0 |
| **SEMDATA** — Levantamentos sem data utilizável | 13 | 0 |
| **DUPLICATA** — Mesmo campo mantido como dois levantamentos | 43 | 25 |
| **CONFLITO** — Conflitos registrados aguardando decisão | 22 | 3 |
| **UNIVERSO** — Pesquisa estadual com amostra possivelmente municipal (não certificada) | 3 | 2 |
| **PARTIDA** — A mesma pessoa em duas linhas, uma delas sem registro | 0 | 0 |
| **total** | **83** | **32** |

A coluna *de 2026* é a que importa primeiro: a eleição é em outubro de 2026 e a média usa as pesquisas
mais recentes, então um defeito num levantamento de 2023 não aparece em lugar nenhum do site.

## SOMA — Elenco de vaga única somando mais de 100 (2)

Cada eleitor tem um voto: as linhas de candidato não podem passar de 100. A folga é derivada das próprias casas decimais da fonte (0,5 por inteiro, 0,05 por décimo). O que aparecer aqui é arredondamento da fonte ou linha a mais no elenco — o segundo caso é defeito nosso.

- **[2026]** 100.2 (folga 0.10) · Veritá · AP governador/t1 · 2026-05-31 · 72d253a0383b
  Antônio Furlan 70.7 · Clécio Luís 29.5
- **[2026]** 100.9 (folga 0.65) · AtlasIntel · CE governador/t1 · 2026-03-30 · a2c894042a76
  Ciro Gomes 46 · Camilo Santana 48.8 · Eduardo Girão 5.4 · Jarir Pereira 0.7

## PESSOA — Candidatos que podem não ser pessoas (0)

A tabela de candidatos guarda pessoas. Opções de resposta, nomes de partido e artefatos de tabela entram por aqui e viram linhas de intenção de voto — uma delas somava 13,3% no Ceará.

*Nada a reportar.*

## ORFAO — Resultados apontando para candidato inexistente (0)

Referência quebrada entre questions e candidates. Sempre defeito nosso, nunca da fonte.

*Nada a reportar.*

## SEMDATA — Levantamentos sem data utilizável (13)

Sem data de campo nem de publicação, a pesquisa não entra em média nem em série temporal: está no banco e é invisível. Ou se acha a data na fonte, ou se descarta.

- s_0c06f21e0a31 · Delta · AC · registro —
- s_1f6d83b34792 · Real Time Big Data · RR · registro —
- s_2fe68fa4575e · Real Time Big Data · RR · registro —
- s_474cbe67ada8 · Delta · AC · registro —
- s_4b18e5197551 · Opinar · PI · registro PI-02052/2026
- s_58d742edadc1 · Real Time Big Data · RR · registro —
- s_5d46b3d90939 · Real Time Big Data · AC · registro —
- s_6731840ddf13 · Paraná Pesquisas · PE · registro —
- s_824da0368472 · Delta · AC · registro —
- s_a3b6d8cdc27d · Delta · AC · registro —
- s_b24aba3bbef0 · Delta · AC · registro —
- s_c5446eaf6c82 · Doxa · PA · registro —
- s_f45a1dcff913 · Paraná Pesquisas · PR · registro —

## DUPLICATA — Mesmo campo mantido como dois levantamentos (43)

Mesmo instituto, mesma UF, mesma data de campo, mesma disputa, em levantamentos separados. Duas coisas diferentes caem aqui e o rótulo de cada item diz qual: *cenários separados* é uma operação de campo cujas perguntas ficaram em levantamentos distintos — problema de identidade de levantamento, que a escada de resolução (`upsertPoll`) une; *elenco repetido* (5 de 43) é a mesma pergunta duas vezes, e essa sim entra duas vezes na média.

- cenários separados — Real Time Big Data · BA governador/t1 · 2025-11-25 — 2 levantamentos
  s_03edeccebbee: ACM Neto 42 · Rui Costa 43 · Kleber Rosa 1 · José Carlos Aleluia 3
  s_03edeccebbee: Rui Costa 46 · Bruno Reis 36 · José Aleluia 3 · Kleber Rosa 1
  s_9facf13df4dd: ACM Neto 44 · Jerônimo Rodrigues 35 · Kleber Rosa 2 · José Carlos Aleluia 3
- **[2026]** ELENCO REPETIDO — Real Time Big Data · ES governador/t1 · 2026-07-21 — 2 levantamentos
  s_0a662a18fa0e: Ricardo Ferraço 29 · Paulo Hartung 25 · Lorenzo Pazolini 22 · Magno Malta 10 · Helder Salomão 8
  s_7026742f441c: Lorenzo Pazolini 25 · Paulo Hartung 27 · Ricardo Ferraço 31 · Helder Salomão 8
  s_7026742f441c: Lorenzo Pazolini 22 · Magno Malta 10 · Paulo Hartung 25 · Ricardo Ferraço 29 · Helder Salomão 8
- **[2026]** cenários separados — Quaest · PE senador/t1 · 2026-07-26 — 2 levantamentos
  s_0aade2c92e00: Marília Arraes 21 · Humberto Costa 14 · Miguel Coelho 6 · Eduardo da Fonte 6 · Túlio Gadêlha 4 · Silvio Nascimento 3 · Paulo Rubem Santiago 1 · Fernando Dueire 0
  s_0aade2c92e00: Marília Arraes 21 · Humberto Costa 14 · Miguel Coelho 6 · Eduardo da Fonte 6 · Túlio Gadêlha 4 · Silvio Nascimento 2 · Paulo Rubem Santiago 0
  s_53a449a24cdb: Marília Arraes 19 · Humberto Costa 12 · Mendonça Filho 8 · Eduardo da Fonte 6 · Miguel Coelho 6 · Túlio Gadelha 4 · Silvio Nascimento 2 · Fernando Dueire 0 · Paulo Rubem Santiago 0
- cenários separados — Paraná Pesquisas · BR presidente/t1 · 2024-08-18 — 2 levantamentos
  s_124d3b227884: Luiz Inácio Lula da Silva 37.4 · Ciro Gomes 12 · Tereza Cristina 7.4 · Simone Tebet 8.5
  s_124d3b227884: Luiz Inácio Lula da Silva 37.1 · Tarcísio de Freitas 25.4 · Ciro Gomes 10.1
  s_124d3b227884: Luiz Inácio Lula da Silva 37.4 · Ratinho Júnior 16.1 · Ciro Gomes 11.1 · Eduardo Leite 3.6 · Simone Tebet 8
  s_124d3b227884: Luiz Inácio Lula da Silva 37 · Michelle Bolsonaro 30.5 · Ciro Gomes 8.2
  s_124d3b227884: Luiz Inácio Lula da Silva 36.3 · Jair Messias Bolsonaro 37.4 · Ciro Gomes 6.8 · Eduardo Leite 1.8 · Simone Tebet 6.2
  s_76c5918b59a0: Luiz Inácio Lula da Silva 37.4 · Tarcísio de Freitas 17.4 · Ratinho Júnior 6.2 · Romeu Zema 5.8 · Ciro Gomes 10.3 · Ronaldo Caiado 2.1 · Helder Barbalho 1.1
  s_76c5918b59a0: Luiz Inácio Lula da Silva 37.6 · Michelle Bolsonaro 23 · Ratinho Júnior 5.1 · Romeu Zema 6.5 · Ciro Gomes 9.3 · Ronaldo Caiado 1.9 · Helder Barbalho 0.9
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
- cenários separados — AtlasIntel · SP governador/t1 · 2025-09-03 — 2 levantamentos
  s_1a0f386d7afb: Rodrigo Manga 8.2 · Capitão Derrite 23.2 · Fernando Haddad 41 · Paulo Serra 5.2 · Ricardo Salles 10.6
  s_1a0f386d7afb: Rodrigo Manga 10.8 · Geraldo Alckmin 39.4 · Ricardo Nunes 11.5 · Paulo Serra 1.4 · André do Prado 1.2 · Ricardo Salles 15 · Gilberto Kassab 9
  s_1d0f1c51d18a: Tarcísio de Freitas 48.6 · Geraldo Alckmin 34.2 · Erika Hilton 8.3 · Paulo Serra 0.2 · Felipe d'Avila 1.9
  s_1d0f1c51d18a: Tarcísio de Freitas 47.3 · Márcio França 18.2 · Guilherme Boulos 22.6 · Paulo Serra 0.6 · Felipe d'Avila 1.8
- **[2026]** cenários separados — Real Time Big Data · SP governador/t1 · 2026-03-07 — 2 levantamentos
  s_1b5d70c07004: Tarcísio de Freitas 48 · Márcio França 23 · Paulo Serra 8 · Kim Kataguiri 10
  s_1b5d70c07004: Tarcísio de Freitas 49 · Simone Tebet 21 · Paulo Serra 9 · Kim Kataguiri 10
  s_f4ca9fe78936: Tarcísio de Freitas 43 · Capitão Derrite 18 · Fernando Haddad 32
  s_f4ca9fe78936: Tarcísio de Freitas 47 · Fernando Haddad 31 · Kim Kataguiri 8 · Paulo Serra 7
- cenários separados — Real Time Big Data · SE governador/t1 · 2025-11-26 — 3 levantamentos
  s_1da98a1aa538: Fábio Mitidieri 48 · Emília Corrêa 32
  s_42ae015e72cf: Fábio Mitidieri 46 · Valmir de Francisquinho de Itabaiana 33
  s_ad82f3d5fdbb: Fábio Mitidieri 50 · Eduardo Amorim 28
- **[2026]** cenários separados — Real Time Big Data · AC governador/t2 · 2026-07-25 — 2 levantamentos
  s_291fa207ccea: Alan Rick 45 · Mailza Assis 36
  s_cb78c6655121: Alan Rick 54 · Tião Bocalom 26
- cenários separados — Datafolha · BR presidente/t1 · 2025-04-03 — 2 levantamentos
  s_29780600671a: Jair Messias Bolsonaro 30 · Luiz Inácio Lula da Silva 36 · Pablo Marçal 7 · Ciro Gomes 12 · Eduardo Leite 5
  s_29780600671a: Jair Messias Bolsonaro 32 · Fernando Haddad 17 · Pablo Marçal 8 · Ciro Gomes 20 · Eduardo Leite 6
  s_29780600671a: Eduardo Bolsonaro 11 · Luiz Inácio Lula da Silva 35 · Pablo Marçal 10 · Ratinho Júnior 6 · Romeu Zema 4 · Ciro Gomes 12 · Ronaldo Caiado 3 · Eduardo Leite 4
  s_29780600671a: Michelle Bolsonaro 15 · Luiz Inácio Lula da Silva 35 · Pablo Marçal 10 · Ratinho Júnior 5 · Romeu Zema 4 · Ciro Gomes 12 · Ronaldo Caiado 3 · Eduardo Leite 3
  s_29780600671a: Tarcísio de Freitas 16 · Fernando Haddad 15 · Pablo Marçal 12 · Ratinho Júnior 7 · Romeu Zema 3 · Ciro Gomes 19 · Ronaldo Caiado 2 · Eduardo Leite 5
  s_f974da273cc9: Lula 35 · Tarcísio de Freitas 15 · Ciro Gomes 11 · Pablo Marçal 11 · Ratinho Jr 5 · Eduardo Leite 3 · Romeu Zema 3 · Ronaldo Caiado 2
- cenários separados — Datafolha · BR presidente/t2 · 2025-04-03 — 2 levantamentos
  s_29780600671a: Fernando Haddad 45 · Jair Messias Bolsonaro 41
  s_29780600671a: Fernando Haddad 43 · Tarcísio de Freitas 37
  s_f974da273cc9: Lula 51 · Eduardo Bolsonaro 34
  s_f974da273cc9: Lula 50 · Michelle Bolsonaro 38
  s_f974da273cc9: Lula 49 · Jair Bolsonaro 40
  s_f974da273cc9: Lula 48 · Tarcísio de Freitas 39
- **[2026]** cenários separados — Real Time Big Data · CE governador/t1 · 2026-03-28 — 2 levantamentos
  s_299d16b3a47f: Elmano de Freitas 45 · Roberto Cláudio 27 · Eduardo Girão 15 · Jarir Pereira 1
  s_657b5dac2dfd: Ciro Gomes 39 · Elmano de Freitas 42 · Eduardo Girão 13 · Jarir Pereira 0
- cenários separados — AtlasIntel · BR presidente/t1 · 2025-05-23 — 2 levantamentos
  s_2b6ddfecf762: Jair Messias Bolsonaro 46.7 · Luiz Inácio Lula da Silva 43.9 · Ciro Gomes 3.8 · Simone Tebet 2.1
  s_b55aff185e2b: Michelle Bolsonaro 33.5 · Luiz Inácio Lula da Silva 44.4 · Pablo Marçal 2.1 · Ratinho Júnior 3.9 · Eduardo Leite 2.2 · Romeu Zema 4 · Ciro Gomes 3.2 · Ronaldo Caiado 4.8
  s_b55aff185e2b: Lula 44.1 · Tarcísio de Freitas 33.1 · Ronaldo Caiado 4.7 · Pablo Marçal 4.7 · Ciro Gomes 3.6 · Ratinho Jr 2.1 · Eduardo Leite 2.1 · Romeu Zema 1.4
- **[2026]** cenários separados — Ideia · BR presidente/t2 · 2026-07-06 — 2 levantamentos
  s_2df164010e26: Luiz Inácio Lula da Silva 45 · Flávio Bolsonaro 40
  s_2df164010e26: Luiz Inácio Lula da Silva 45 · Michelle Bolsonaro 36
  s_58c4cfe5786e: Lula 45 · Romeu Zema 37
  s_58c4cfe5786e: Lula 45 · Renan Santos 33
  s_58c4cfe5786e: Lula 45 · Joaquim Barbosa 23
  s_58c4cfe5786e: Lula 45 · Ronaldo Caiado 37.6
- **[2026]** cenários separados — Nexus · BR presidente/t1 · 2026-03-29 — 2 levantamentos
  s_2f6f7139017e: Luiz Inácio Lula da Silva 41 · Flávio Bolsonaro 38 · Ronaldo Caiado 4 · Romeu Zema 4 · Renan Santos 2 · Aldo Rebelo 0
  s_537a3ea6dd7b: Lula 39 · Flávio Bolsonaro 39 · Romeu Zema 5 · Renan Santos 3 · Aldo Rebelo 1 · Eduardo Leite 4
- cenários separados — AtlasIntel · BR presidente/t1 · 2025-10-19 — 2 levantamentos
  s_33f0936d624b: Michelle Bolsonaro 26.2 · Luiz Inácio Lula da Silva 51 · Ratinho Júnior 5.1 · Romeu Zema 4.6 · Ronaldo Caiado 9.1
  s_33f0936d624b: Tarcísio de Freitas 30.4 · Luiz Inácio Lula da Silva 51.3 · Ratinho Júnior 3 · Romeu Zema 2.5 · Ronaldo Caiado 6
  s_33f0936d624b: Tarcísio de Freitas 30.1 · Fernando Haddad 43.1 · Ratinho Júnior 3.5 · Romeu Zema 2.6 · Ronaldo Caiado 7
  s_33f0936d624b: Luiz Inácio Lula da Silva 51 · Ratinho Júnior 10.4 · Romeu Zema 10.6 · Ronaldo Caiado 15.3
  s_fa88a308a3ff: Jair Messias Bolsonaro 41.3 · Luiz Inácio Lula da Silva 48.8 · Ciro Gomes 3.1 · Simone Tebet 2.3
- cenários separados — Paraná Pesquisas · SP governador/t1 · 2025-02-23 — 2 levantamentos
  s_341490aa1bb8: Rodrigo Manga 9.8 · Márcio França 19.3 · Marta Suplicy 19.2 · Paulo Serra 6.3 · Rodrigo Garcia 12.8 · Felicio Ramuth 2.7
  s_341490aa1bb8: Márcio França 18.8 · Marta Suplicy 18.3 · Rodrigo Garcia 12.3 · Rodrigo Manga 9.5 · Paulo Serra 6.4 · Gilberto Kassab 4.7
  s_f0dc6acef5ed: Márcio França 21.6 · Ricardo Nunes 35.8 · Alexandre Padilha 8 · Paulo Serra 6.5
  s_f0dc6acef5ed: Márcio França 17 · Ricardo Nunes 27 · Alexandre Padilha 6.3 · Paulo Serra 5.1 · Pablo Marçal 25.6
  s_f0dc6acef5ed: Tarcísio de Freitas 40.3 · Márcio França 12.7 · Alexandre Padilha 7.1 · Paulo Serra 5 · Pablo Marçal 17.6
  s_f0dc6acef5ed: Tarcísio de Freitas 48.6 · Márcio França 16.6 · Alexandre Padilha 8.5 · Paulo Serra 5.9
- **[2026]** cenários separados — AtlasIntel · CE governador/t1 · 2026-03-30 — 3 levantamentos
  s_34c6bb115058: Ciro Gomes 46 · Roberto Cláudio 15.2 · Eduardo Girão 22.3 · Jarir Pereira 1.1
  s_55207c7bd590: Ciro Gomes 46.2 · Elmano de Freitas 42.6 · Eduardo Girão 5.3 · Jarir Pereira 1
  s_f6095f145f1e: Ciro Gomes 46 · Camilo Santana 48.8 · Eduardo Girão 5.4 · Jarir Pereira 0.7
- **[2026]** cenários separados — AtlasIntel · CE senador/t1 · 2026-03-30 — 2 levantamentos
  s_34c6bb115058: Eunício Oliveira 8.7 · Alcides Fernandes 11.8 · Cid Gomes 19.9 · Roberto Cláudio 14.6 · General Theóphilo 6.3
  s_f6095f145f1e: Capitão Wagner 20.9 · Eunício Oliveira 10.1 · Júnior Mano 5 · Luizianne Lins 17.2 · Priscila Costa 10.8 · General Theóphilo 4.5
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
  s_3aedff7de255: Jair Messias Bolsonaro 50.3 · Geraldo Alckmin 36.5
  s_93d336f9d7a6: Michelle Bolsonaro 48.5 · Lula 37.3
  s_93d336f9d7a6: Luiz Inácio Lula da Silva 37.3 · Ronaldo Caiado 37.8
  s_93d336f9d7a6: Ratinho Jr 40.6 · Lula 37.2
  s_93d336f9d7a6: Tarcísio de Freitas 42.3 · Lula 37.6
  s_93d336f9d7a6: Jair Bolsonaro 51.1 · Lula 37.3
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
- **[2026]** cenários separados — Nexus · BR presidente/t2 · 2026-08-09 — 2 levantamentos
  s_5153741c3e49: Luiz Inácio Lula da Silva 46 · Ronaldo Caiado 42
  s_5153741c3e49: Luiz Inácio Lula da Silva 47 · Flávio Bolsonaro 44
  s_d5d78bf1e2cb: Luiz Inácio Lula da Silva 47 · Romeu Zema 40
  s_d5d78bf1e2cb: Luiz Inácio Lula da Silva 46 · Renan Santos 37
- cenários separados — Paraná Pesquisas · AL governador/t1 · 2025-12-08 — 2 levantamentos
  s_550e2f71129e: Renan Filho 51.3 · Alfredo Gaspar 34.7
  s_e42638786df9: Renan Filho 40.9 · JHC 47.6
- ELENCO REPETIDO — Real Time Big Data · BR presidente/t1 · 2025-12-16 — 2 levantamentos
  s_60b534ba9fba: Flávio Bolsonaro 17 · Luiz Inácio Lula da Silva 35 · Ratinho Júnior 12 · Romeu Zema 5 · Ronaldo Caiado 5 · Renan Santos 1 · Aldo Rebelo 1
  s_89f7f1712070: Lula 35 · Flávio Bolsonaro 17 · Ratinho Jr 12 · Romeu Zema 5 · Ronaldo Caiado 5 · Aldo Rebelo 1 · Renan Santos 1
- cenários separados — AtlasIntel · BR presidente/t1 · 2025-06-30 — 2 levantamentos
  s_67a8dda7d659: Jair Messias Bolsonaro 46 · Luiz Inácio Lula da Silva 44.4 · Ciro Gomes 4.5 · Simone Tebet 1.5
  s_9d13d46ea6a8: Michelle Bolsonaro 30.4 · Luiz Inácio Lula da Silva 45 · Pablo Marçal 1.3 · Ratinho Júnior 4.8 · Eduardo Leite 0.9 · Romeu Zema 7.2 · Ciro Gomes 3.9 · Ronaldo Caiado 4
  s_9d13d46ea6a8: Lula 44.6 · Tarcísio de Freitas 34 · Romeu Zema 4.4 · Pablo Marçal 3.7 · Ciro Gomes 3.5 · Ratinho Jr 2.5 · Ronaldo Caiado 1.7 · Eduardo Leite 1
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
- **[2026]** ELENCO REPETIDO — Percent Brasil · MT governador/t2 · 2026-07-27 — 2 levantamentos
  s_7fe69b9b02c7: Wellington Fagundes 36.3 · Jayme Campos 22
  s_7fe69b9b02c7: Wellington Fagundes 40.8 · Natasha Slhessarenko 12.3
  s_8e3757dce960: Wellington Fagundes 37.3 · Otaviano Pivetta 20.3
  s_8e3757dce960: Wellington Fagundes 40.8 · Doutora Natasha 12.3
- **[2026]** cenários separados — Quaest · CE senador/t1 · 2026-04-28 — 2 levantamentos
  s_8671a57e9697: Capitão Wagner 17 · Eunício Oliveira 6 · Cid Gomes 17 · Luizianne Lins 9 · Priscila Costa 4 · General Theóphilo 1 · Anna Karina 1
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
- **[2026]** cenários separados — Real Time Big Data · GO governador/t1 · 2026-05-12 — 2 levantamentos
  s_9e8551e8656b: Daniel Vilela 38 · Marconi Perillo 22 · Wilder Morais 14 · Adriana Accorsi 13 · Telemaco Brandão 1
  s_bd3f70c87aa1: Daniel Vilela 40 · Marconi Perillo 25 · Wilder Morais 14 · Luis Cesar Bueno 2 · Telêmaco Brandão 1
- **[2026]** cenários separados — Real Time Big Data · PE senador/t1 · 2026-04-08 — 2 levantamentos
  s_a06cc00947e0: Marília Arraes 27 · Miguel Coelho 20 · Anderson Ferreira 18 · Humberto Costa 17 · Mendonça Filho 12
  s_b8267f8e8ffc: Marília Arraes 28 · Humberto Costa 17 · Miguel Coelho 21 · Túlio Gadêlha 8 · Anderson Ferreira 19
  s_b8267f8e8ffc: Marília Arraes 29 · Humberto Costa 17 · Eduardo da Fonte 11 · Anderson Ferreira 19 · Mendonça Filho 15
- **[2026]** cenários separados — Ipec · CE senador/t1 · 2026-07-26 — 2 levantamentos
  s_a8c3982fec69: Capitão Wagner 24 · Luizianne Lins 16 · Alcides Fernandes 7 · Júnior Mano 7 · Anna Karina 6 · General Theophilo 3 · Cândido Albuquerque 2
  s_fbac0e37641e: Capitão Wagner 24 · Cid Gomes 22 · Luizianne Lins 16 · Alcides Fernandes 8 · General Theóphilo 4
- **[2026]** ELENCO REPETIDO — Real Time Big Data · MT governador/t2 · 2026-03-23 — 2 levantamentos
  s_a9ee1d3018cc: Jayme Campos 32 · Doutora Natasha 26
  s_a9ee1d3018cc: Wellington Fagundes 55 · Doutora Natasha 20
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

## CONFLITO — Conflitos registrados aguardando decisão (22)

Divergências que o pipeline registrou em vez de resolver em silêncio. Cada uma precisa de uma fonte primária ou de uma decisão editorial.

- **[2026]** registration_dates_contradict · s_118355fc693b · fieldwork_end: "2026-08-03" × "2025-08-03"
- **[2026]** registration_dates_contradict · s_c3ea7003b0c2 · fieldwork_end: "2026-02-01" × "2026-01-01"
- **[2026]** registration_dates_contradict · s_01a5b68c7c38 · fieldwork_end: "2026-06-18" × "2026-02-18"
- roster_encolhido_na_fonte · q_6cd45e471741 · results: ["Delcídio do Amaral","Eduardo Riedel","Fábio Trad","Jefferson Bezerra","João Henrique Catan","Lucien Rezende","Renato Gomes"] × ["Delcídio do Amaral","Fábio Trad","Jeferson Bezerra","João Henrique Catan","Lucien Rezende","Renato Gomes"]
- roster_encolhido_na_fonte · q_bfcdf080eab1 · results: ["Daniel Vilela","Luis Cesar Bueno","Marconi Perillo","Telêmaco Brandão","Wilder Morais"] × ["Daniel Vilela","Luis Cesar Bueno","Marconi Perillo","Wilder Morais"]
- roster_encolhido_na_fonte · q_69bf17c316c8 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Sargento Laudicério","Wellington Fagundes"] × ["Doutora Natasha","Jayme Campos","Otaviano Pivetta","Wellington Fagundes"]
- roster_encolhido_na_fonte · q_96895a2c5e7b · results: ["Eduardo Riedel","Fábio Trad","Jefferson Bezerra","João Henrique Catan","Lucien Rezende","Renato Gomes"] × ["Economista Renato Gomes","Eduardo Riedel","Fábio Trad","João Henrique Catan"]
- roster_encolhido_na_fonte · q_cdab98c6acbd · results: ["Antônio Galvan","Beny Godoy","Carlos Fávaro","Janaína Riva","José Antonio Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques","Professor Nelson Ferreira"] × ["Carlos Fávaro","Galvan","Janaína Riva","José Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"]
- candidate_id_orphaned · c_cc1b184f63b8 · candidate_id: "c_cc1b184f63b8" × null
- roster_encolhido_na_fonte · q_0f0f12a28d82 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Wellington Fagundes"] × ["Doutora Natasha","Jayme Campos","Otaviano Pivetta","Wellington Fagundes"]
- roster_encolhido_na_fonte · q_cb46acb84d35 · results: ["Eduardo Riedel","Fábio Trad","Jefferson Bezerra","João Henrique Catan","Lucien Rezende","Renato Gomes"] × ["Economista Renato Gomes","Eduardo Riedel","Fábio Trad","João Henrique Catan"]
- roster_encolhido_na_fonte · q_fa8f8d30b5f3 · results: ["Delcídio do Amaral","Eduardo Riedel","Fábio Trad","Jefferson Bezerra","João Henrique Catan","Lucien Rezende","Renato Gomes"] × ["Delcídio do Amaral","Economista Renato Gomes","Eduardo Riedel","Fábio Trad","João Henrique Catan"]
- candidate_id_orphaned · c_6ea7807f4247 · candidate_id: "c_6ea7807f4247" × null
- roster_encolhido_na_fonte · q_26ca7f89a6ea · results: ["Delcídio do Amaral","Eduardo Riedel","Fábio Trad","Jefferson Bezerra","João Henrique Catan","Lucien Rezende","Renato Gomes"] × ["Eduardo Riedel","Fábio Trad","Jefferson Bezzerra","João Henrique Catan","Lucien Rezende","Renato Gomes"]
- institute_id_orphaned · i_e3134c0d1d93 · institute_id: "i_e3134c0d1d93" × null
- roster_encolhido_na_fonte · q_f6f883c79f82 · results: ["ACM Neto","Aroldo Félix","Jerônimo Rodrigues","Ronaldo Mansur"] × ["ACM Neto","Jerônimo Rodrigues","Ronaldo Mansur"]
- institute_id_orphaned · i_2e8106a94dfc · institute_id: "i_2e8106a94dfc" × null
- roster_encolhido_na_fonte · q_b609b001b4c2 · results: ["Eduardo Riedel","Fábio Trad","João Henrique Catan","Lucien Rezende"] × ["Eduardo Riedel","Fábio Trad","João Henrique Catan"]
- person_id_orphaned · p_3eea63aaa563 · person_id: "p_3eea63aaa563" × null
- person_id_orphaned · p_20995ed57192 · person_id: "p_20995ed57192" × null
- roster_encolhido_na_fonte · q_bd8fd5b153b2 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Wellington Fagundes"] × ["Doutora Natasha","Jayme Campos","Otaviano Pivetta","Wellington Fagundes"]
- candidate_id_orphaned · c_ac3e7fad297e · candidate_id: "c_ac3e7fad297e" × null

## UNIVERSO — Pesquisa estadual com amostra possivelmente municipal (não certificada) (3)

Disputa estadual (governador/senador) com universo gravado 'uf' e amostra < 800 que ainda NÃO está no ledger de vereditos (data/universe-verdicts.json). Amostra pequena NÃO prova municipal — muitas estaduais legítimas são pequenas — então cada uma exige leitura de fonte (cega) antes de gatear. Ponto cego conhecido: um municipal com n ≥ 800 escapa desta varredura; o gate é por veredito no ledger, não por este limiar. Confirmada municipal, entra no ledger e sai das médias estaduais; confirmada estadual, entra como estadual e para de aparecer aqui. É triagem, não porta.

- s_502c038c0af5 · Doxa · PA · n=600 · registro —
- **[2026]** s_b38babf70f52 · IPR · MS · n=784 · registro —
- **[2026]** s_52118f05f979 · IPR · MS · n=784 · registro —

## PARTIDA — A mesma pessoa em duas linhas, uma delas sem registro (0)

Uma pessoa observada cuja grafia ALCANÇA, na disputa dela, a candidatura de uma pessoa registrada: são a mesma pessoa, gravada duas vezes. O caso normal é a estreia de um nome numa disputa nova e se resolve na coleta seguinte sem intervenção (§6) — o que importa aqui é o que PERSISTIR de uma rodada para a outra.

*Nada a reportar.*

