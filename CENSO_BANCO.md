# Censo do banco — Placar das Pesquisas 2026

Gerado por `node scripts/census.mjs` a partir de `data/`. Não editar à mão.

Banco: **1083 levantamentos · 3594 perguntas · 141 institutos · 1186 candidatos**.

Este arquivo é a definição operacional de *banco normalizado*: as classes abaixo são fixas em código, e
o banco está normalizado quando todas estão vazias — ou quando o que resta está explicitamente parqueado
como decisão editorial. Achado fora destas classes é anotado, não corrigido no meio de uma rodada.

| classe | itens | de 2026 |
|---|---|---|
| **SOMA** — Elenco de vaga única somando mais de 100 | 2 | 2 |
| **PESSOA** — Candidatos que podem não ser pessoas | 0 | 0 |
| **ORFAO** — Resultados apontando para candidato inexistente | 0 | 0 |
| **SEMDATA** — Levantamentos sem data utilizável | 15 | 0 |
| **DUPLICATA** — Mesmo campo mantido como dois levantamentos | 22 | 13 |
| **CONFLITO** — Conflitos registrados aguardando decisão | 7 | 3 |
| **UNIVERSO** — Pesquisa estadual com amostra possivelmente municipal (não certificada) | 1 | 0 |
| **PARTIDA** — A mesma pessoa em duas linhas, uma delas sem registro | 0 | 0 |
| **total** | **47** | **18** |

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

## SEMDATA — Levantamentos sem data utilizável (15)

Sem data de campo nem de publicação, a pesquisa não entra em média nem em série temporal: está no banco e é invisível. Ou se acha a data na fonte, ou se descarta.

- s_0c06f21e0a31 · Delta · AC · registro —
- s_1f6d83b34792 · Real Time Big Data · RR · registro —
- s_2fe68fa4575e · Real Time Big Data · RR · registro —
- s_3cf3b1b8f214 · INOR · SE · registro —
- s_474cbe67ada8 · Delta · AC · registro —
- s_4b18e5197551 · Opinar · PI · registro PI-02052/2026
- s_58d742edadc1 · Real Time Big Data · RR · registro —
- s_5d46b3d90939 · Real Time Big Data · AC · registro —
- s_6731840ddf13 · Paraná Pesquisas · PE · registro —
- s_824da0368472 · Delta · AC · registro —
- s_a3b6d8cdc27d · Delta · AC · registro —
- s_b24aba3bbef0 · Delta · AC · registro —
- s_bf961f8039e4 · INOR · SE · registro —
- s_c5446eaf6c82 · Doxa · PA · registro —
- s_f45a1dcff913 · Paraná Pesquisas · PR · registro —

## DUPLICATA — Mesmo campo mantido como dois levantamentos (22)

Mesmo instituto, mesma UF, mesma data de campo, mesma disputa, em levantamentos separados. Duas coisas diferentes caem aqui e o rótulo de cada item diz qual: *cenários separados* é uma operação de campo cujas perguntas ficaram em levantamentos distintos — problema de identidade de levantamento, que a escada de resolução (`upsertPoll`) une; *elenco repetido* (1 de 22) é a mesma pergunta duas vezes, e essa sim entra duas vezes na média.

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
- **[2026]** cenários separados — Paraná Pesquisas · RJ senador/t1 · 2026-04-23 — 2 levantamentos
  s_167e1bf049a2: Rogéria Bolsonaro 28.1 · Benedita da Silva 32.3 · Márcio Canella 19.7 · Pedro Paulo 20.9
  s_c7fa19bc3263: Benedita da Silva 30.4 · Cláudio Castro 29.9 · Marcelo Crivella 21.5 · Pedro Paulo 19.4 · Márcio Canella 17.1 · Marcos Dias 5.6
- cenários separados — AtlasIntel · SP governador/t1 · 2025-09-03 — 2 levantamentos
  s_1a0f386d7afb: Rodrigo Manga 8.2 · Capitão Derrite 23.2 · Fernando Haddad 41 · Paulo Serra 5.2 · Ricardo Salles 10.6
  s_1a0f386d7afb: Rodrigo Manga 10.8 · Geraldo Alckmin 39.4 · Ricardo Nunes 11.5 · Paulo Serra 1.4 · André do Prado 1.2 · Ricardo Salles 15 · Gilberto Kassab 9
  s_1d0f1c51d18a: Tarcísio de Freitas 48.6 · Geraldo Alckmin 34.2 · Erika Hilton 8.3 · Paulo Serra 0.2 · Felipe d'Avila 1.9
  s_1d0f1c51d18a: Tarcísio de Freitas 47.3 · Márcio França 18.2 · Guilherme Boulos 22.6 · Paulo Serra 0.6 · Felipe d'Avila 1.8
- **[2026]** cenários separados — Real Time Big Data · AC governador/t2 · 2026-07-25 — 2 levantamentos
  s_291fa207ccea: Alan Rick 45 · Mailza Assis 36
  s_cb78c6655121: Alan Rick 54 · Tião Bocalom 26
- **[2026]** cenários separados — Real Time Big Data · CE governador/t1 · 2026-03-28 — 2 levantamentos
  s_299d16b3a47f: Elmano de Freitas 45 · Roberto Cláudio 27 · Eduardo Girão 15 · Jarir Pereira 1
  s_657b5dac2dfd: Ciro Gomes 39 · Elmano de Freitas 42 · Eduardo Girão 13 · Jarir Pereira 0
- **[2026]** cenários separados — Ideia · BR presidente/t2 · 2026-07-06 — 2 levantamentos
  s_2df164010e26: Luiz Inácio Lula da Silva 45 · Flávio Bolsonaro 40
  s_2df164010e26: Luiz Inácio Lula da Silva 45 · Michelle Bolsonaro 36
  s_58c4cfe5786e: Lula 45 · Romeu Zema 37
  s_58c4cfe5786e: Lula 45 · Renan Santos 33
  s_58c4cfe5786e: Lula 45 · Joaquim Barbosa 23
  s_58c4cfe5786e: Lula 45 · Ronaldo Caiado 37.6
- cenários separados — AtlasIntel · BR presidente/t1 · 2025-10-19 — 2 levantamentos
  s_33f0936d624b: Michelle Bolsonaro 26.2 · Luiz Inácio Lula da Silva 51 · Ratinho Júnior 5.1 · Romeu Zema 4.6 · Ronaldo Caiado 9.1
  s_33f0936d624b: Tarcísio de Freitas 30.4 · Luiz Inácio Lula da Silva 51.3 · Ratinho Júnior 3 · Romeu Zema 2.5 · Ronaldo Caiado 6
  s_33f0936d624b: Tarcísio de Freitas 30.1 · Fernando Haddad 43.1 · Ratinho Júnior 3.5 · Romeu Zema 2.6 · Ronaldo Caiado 7
  s_33f0936d624b: Luiz Inácio Lula da Silva 51 · Ratinho Júnior 10.4 · Romeu Zema 10.6 · Ronaldo Caiado 15.3
  s_fa88a308a3ff: Jair Messias Bolsonaro 41.3 · Luiz Inácio Lula da Silva 48.8 · Ciro Gomes 3.1 · Simone Tebet 2.3
- **[2026]** cenários separados — AtlasIntel · CE governador/t1 · 2026-03-30 — 3 levantamentos
  s_34c6bb115058: Ciro Gomes 46 · Roberto Cláudio 15.2 · Eduardo Girão 22.3 · Jarir Pereira 1.1
  s_55207c7bd590: Ciro Gomes 46.2 · Elmano de Freitas 42.6 · Eduardo Girão 5.3 · Jarir Pereira 1
  s_f6095f145f1e: Ciro Gomes 46 · Camilo Santana 48.8 · Eduardo Girão 5.4 · Jarir Pereira 0.7
- **[2026]** cenários separados — AtlasIntel · CE senador/t1 · 2026-03-30 — 2 levantamentos
  s_34c6bb115058: Eunício Oliveira 8.7 · Alcides Fernandes 11.8 · Cid Gomes 19.9 · Roberto Cláudio 14.6 · General Theóphilo 6.3
  s_f6095f145f1e: Capitão Wagner 20.9 · Eunício Oliveira 10.1 · Júnior Mano 5 · Luizianne Lins 17.2 · Priscila Costa 10.8 · General Theóphilo 4.5
- **[2026]** cenários separados — Nexus · BR presidente/t2 · 2026-08-09 — 2 levantamentos
  s_5153741c3e49: Luiz Inácio Lula da Silva 46 · Ronaldo Caiado 42
  s_5153741c3e49: Luiz Inácio Lula da Silva 47 · Flávio Bolsonaro 44
  s_d5d78bf1e2cb: Luiz Inácio Lula da Silva 47 · Romeu Zema 40
  s_d5d78bf1e2cb: Luiz Inácio Lula da Silva 46 · Renan Santos 37
- cenários separados — Paraná Pesquisas · AL governador/t1 · 2025-12-08 — 2 levantamentos
  s_550e2f71129e: Renan Filho 51.3 · Alfredo Gaspar 34.7
  s_e39251747e8d: João Henrique Caldas 47.6 · Renan Filho 40.9
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
- cenários separados — Futura · BR presidente/t2 · 2025-03-22 — 2 levantamentos
  s_93d336f9d7a6: Michelle Bolsonaro 48.5 · Lula 37.3
  s_93d336f9d7a6: Luiz Inácio Lula da Silva 37.3 · Ronaldo Caiado 37.8
  s_93d336f9d7a6: Ratinho Jr 40.6 · Lula 37.2
  s_93d336f9d7a6: Tarcísio de Freitas 42.3 · Lula 37.6
  s_93d336f9d7a6: Jair Bolsonaro 51.1 · Lula 37.3
  s_d4f2b6ef0f37: Tarcísio de Freitas 39.1 · Geraldo Alckmin 37.5
  s_d4f2b6ef0f37: Jair Messias Bolsonaro 50.3 · Geraldo Alckmin 36.5
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
- **[2026]** cenários separados — Real Time Big Data · PE senador/t1 · 2026-04-08 — 2 levantamentos
  s_a06cc00947e0: Marília Arraes 27 · Miguel Coelho 20 · Anderson Ferreira 18 · Humberto Costa 17 · Mendonça Filho 12
  s_b8267f8e8ffc: Marília Arraes 28 · Humberto Costa 17 · Miguel Coelho 21 · Túlio Gadêlha 8 · Anderson Ferreira 19
  s_b8267f8e8ffc: Marília Arraes 29 · Humberto Costa 17 · Eduardo da Fonte 11 · Anderson Ferreira 19 · Mendonça Filho 15
- **[2026]** cenários separados — AtlasIntel · BR presidente/t1 · 2026-01-20 — 2 levantamentos
  s_a21d4072f567: Luiz Inácio Lula da Silva 46.4 · Jair Messias Bolsonaro 43.4 · Ciro Gomes 3.2
  s_c1799b7c625c: Luiz Inácio Lula da Silva 48.4 · Flávio Bolsonaro 28 · Tarcísio de Freitas 11 · Ratinho Júnior 1.7 · Ronaldo Caiado 2.9 · Romeu Zema 1.7 · Renan Santos 2.9 · Aldo Rebelo 1
  s_c1799b7c625c: Luiz Inácio Lula da Silva 48.8 · Flávio Bolsonaro 35 · Ronaldo Caiado 4.3 · Ratinho Júnior 2.8 · Romeu Zema 2.8
  s_c1799b7c625c: Luiz Inácio Lula da Silva 48.8 · Ronaldo Caiado 15.2 · Ratinho Júnior 9.4 · Romeu Zema 11.4
  s_c1799b7c625c: Luiz Inácio Lula da Silva 48.5 · Tarcísio de Freitas 28.4 · Ronaldo Caiado 5 · Ratinho Júnior 3.9 · Romeu Zema 3.9
  s_c1799b7c625c: Luiz Inácio Lula da Silva 48.4 · Flávio Bolsonaro 28 · Tarcísio de Freitas 11 · Ronaldo Caiado 2.9 · Ratinho Júnior 1.7 · Romeu Zema 1.7
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
- cenários separados — Datafolha · BR presidente/t2 · 2025-04-03 — 2 levantamentos
  s_ce9d13de8c4b: Fernando Haddad 45 · Jair Messias Bolsonaro 41
  s_ce9d13de8c4b: Fernando Haddad 43 · Tarcísio de Freitas 37
  s_f974da273cc9: Lula 51 · Eduardo Bolsonaro 34
  s_f974da273cc9: Lula 50 · Michelle Bolsonaro 38
  s_f974da273cc9: Lula 49 · Jair Bolsonaro 40
  s_f974da273cc9: Lula 48 · Tarcísio de Freitas 39

## CONFLITO — Conflitos registrados aguardando decisão (7)

Divergências que o pipeline registrou em vez de resolver em silêncio. Cada uma precisa de uma fonte primária ou de uma decisão editorial.

- **[2026]** registration_dates_contradict · s_118355fc693b · fieldwork_end: "2026-08-03" × "2025-08-03"
- **[2026]** registration_dates_contradict · s_c3ea7003b0c2 · fieldwork_end: "2026-02-01" × "2026-01-01"
- **[2026]** registration_dates_contradict · s_01a5b68c7c38 · fieldwork_end: "2026-06-18" × "2026-02-18"
- roster_encolhido_na_fonte · q_cdab98c6acbd · results: ["Antônio Galvan","Beny Godoy","Carlos Fávaro","Janaína Riva","José Antonio Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques","Professor Nelson Ferreira"] × ["Antônio Galvan","Carlos Fávaro","Janaína Riva","José Antonio Medeiros","Margareth Buzetti","Mauro Mendes","Pedro Taques"]
- roster_encolhido_na_fonte · q_0f0f12a28d82 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Wellington Fagundes"] × ["Jayme Campos","Natasha Slhessarenko","Otaviano Pivetta","Wellington Fagundes"]
- roster_encolhido_na_fonte · q_69bf17c316c8 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Sargento Laudicério","Wellington Fagundes"] × ["Jayme Campos","Natasha Slhessarenko","Otaviano Pivetta","Wellington Fagundes"]
- roster_encolhido_na_fonte · q_bd8fd5b153b2 · results: ["Jayme Campos","Marcelo Maluf","Natasha Slhessarenko","Otaviano Pivetta","Rafaell Milas","Wellington Fagundes"] × ["Jayme Campos","Natasha Slhessarenko","Otaviano Pivetta","Wellington Fagundes"]

## UNIVERSO — Pesquisa estadual com amostra possivelmente municipal (não certificada) (1)

Disputa estadual (governador/senador) com universo gravado 'uf' e amostra < 800 que ainda NÃO está no ledger de vereditos (data/universe-verdicts.json). Amostra pequena NÃO prova municipal — muitas estaduais legítimas são pequenas — então cada uma exige leitura de fonte (cega) antes de gatear. Ponto cego conhecido: um municipal com n ≥ 800 escapa desta varredura; o gate é por veredito no ledger, não por este limiar. Confirmada municipal, entra no ledger e sai das médias estaduais; confirmada estadual, entra como estadual e para de aparecer aqui. É triagem, não porta.

- s_502c038c0af5 · Doxa · PA · n=600 · registro —

## PARTIDA — A mesma pessoa em duas linhas, uma delas sem registro (0)

Uma pessoa observada cuja grafia ALCANÇA, na disputa dela, a candidatura de uma pessoa registrada: são a mesma pessoa, gravada duas vezes. O caso normal é a estreia de um nome numa disputa nova e se resolve na coleta seguinte sem intervenção (§6) — o que importa aqui é o que PERSISTIR de uma rodada para a outra.

*Nada a reportar.*

