# Lacunas do Poder360 — o que a fonte está escondendo

Gerado por `node scripts/lacunas-poder360.mjs`. **Enumeração, não reparo.**

O `v2/cenarios` apaga em silêncio toda linha de candidato cujo campo `nome` chegou vazio;
o `v1/api` mantém a mesma linha, com o mesmo `percentual` e quase sempre o partido. A
diferença entre as duas leituras é o estrago, e ela é **enumerável** — é isto aqui.

Custo de uma rodada: **274 chamadas** à API (2 por combinação × 137 combinações),
em série e com pausa entre elas. O coletor gasta o mesmo, e é por isso que a coleta roda
2×/dia. Use `--cache=` para reler a mesma varredura sem tocar na fonte.

Janela de "mesma operação de campo": **3 dias** — `JANELA_OPERACAO_MS` importada de
`scripts/lib/store.mjs`, a mesma que `resolveSurvey`, `datesClose` e `repairs.mjs` usam. Não
escolhida aqui: escolher uma tolerância é a jogada proibida do §10.

## Placar

| população | o que é | quantas |
|---|---|---|
| **CURTA** | guardamos a pesquisa e a fonte tem MAIS linhas do que gravamos | **224** |
| **AUSENTE** | a fonte tem a pesquisa e o banco não tem NADA para a disputa/instituto/data | **94** |
| **RECUPERADA** | `v1` e `v2` concordam e o registro está completo | **1366** |
| *já coberta* | o `v2` apagou linhas mas o banco já as tem (reparo aplicado ou elenco retido) | 63 |
| *resgatada* | sem id nativo nosso, mas OUTRA fonte já trouxe a pesquisa — **não** é AUSENTE | 68 |
| *indeterminada* | linha apagada cuja fronteira de cenário não é demonstrável — **recusada**, não atribuída | 68 |
| *não conferida* | nenhum cenário do `v2` bate com os percentuais que guardamos — a fonte republicou | 93 |
| *não alinhada* | `v1` e `v2` não alinham entre si; a pesquisa é listada sem conta de linhas | 6 |

Ids do `v1` varridos: **1170** · ids em que o `v2` apaga ao menos uma linha: **509**.

**AUSENTE não se testa contra o prefixo `p360-`.** Parte da perda do Poder360 é resgatada
por outra fonte — uma nacional da AtlasIntel está no banco pela Wikipédia, sem id nativo.
O teste aqui é instituto (resolvido pelo `resolveInstitute` do store, que segue aliases e
`merged_into`) + disputa + data dentro da janela, em TODAS as fontes.

## AUSENTE — precisam de `add_poll` curado

Ordenadas por impacto, **escopo primeiro** (decisão do criador, 17/08/2026): disputa
nacional, depois peso da UF (nº de pesquisas que o banco guarda dela — **derivado do
banco**, não de uma tabela de eleitorado escrita à mão), e só então maior percentual
escondido, pontos ocultos, data e id. O percentual oculto mede o tamanho do buraco na
pesquisa; o escopo mede quanta gente vê o buraco — e uma linha faltando num 2º turno
nacional é metade do par, por pequena que seja em pontos.

| # | id | instituto | disputa | campo | registro TSE | cenários v2 | linhas v1 | apagadas | % apagados | líder | integra | reparo já escrito |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 13758 | Pimentel e Carpentieri | Governador · SP | 2026-07-30 | SP-06969/2026 | 0 | 7 | 7 | 55 · 26 · 9 · 5 · 2 · 2 · 1 | 55 | [PDF](https://static.poder360.com.br/uploads/2026/08/governador-senado-presidente-santos-30jul.pdf) | — |
| 2 | 13633 | Paraná Pesquisas | Governador · SP · 2º turno | 2026-07-27 | SP-04624/2026 | 0 | 4 | 4 | 51,8 · 38,3 · 6,5 · 3,3 | 51,8 | [PDF](https://static.poder360.com.br/uploads/2026/07/parana-pesquisas-SP-29jul2026.pdf) | — |
| 3 | 13635 | Quaest | Governador · SP · 2º turno | 2026-07-27 | SP-04846/2026 | 0 | 4 | 4 | 48 · 32 · 11 · 9 | 48 | [PDF](https://static.poder360.com.br/uploads/2026/07/SP-quaest-29jul2026.pdf) | — |
| 4 | 13637 | Quaest | Presidente · SP · 2º turno | 2026-07-27 | SP-04846/2026 | 0 | 16 | 16 | 40 · 36 · 35 · 35 · 35 · 34 · 33 · 30 · 25 · 23 · 22 · 18 · 9 · 9 · 9 · 7 | 40 | [PDF](https://static.poder360.com.br/uploads/2026/07/SP-quaest-29jul2026.pdf) | — |
| 5 | 13759 | Pimentel e Carpentieri | Senado · SP | 2026-07-30 | SP-06969/2026 | 1 | 7 | 6 | 40 · 34 · 34 · 27 · 19 · 16 | 40 | [PDF](https://static.poder360.com.br/uploads/2026/08/governador-senado-presidente-santos-30jul.pdf) | — |
| 6 | 13756 | Pimentel e Carpentieri | Presidente · SP | 2026-07-30 | BR-07838/2026 | 0 | 9 | 9 | 34 · 30 · 14 · 7 · 5 · 5 · 4 · 1 · 1 | 34 | [PDF](https://static.poder360.com.br/uploads/2026/08/governador-senado-presidente-santos-30jul.pdf) | — |
| 7 | 13637 | Quaest | Presidente · SP | 2026-07-27 | SP-04846/2026 | 0 | 13 | 13 | 34 · 30 · 13 · 10 · 3 · 3 · 3 · 2 · 1 · 1 · 0 · 0 · 0 | 34 | [PDF](https://static.poder360.com.br/uploads/2026/07/SP-quaest-29jul2026.pdf) | — |
| 8 | 13734 | Intelligence Pesquisa | Presidente · SP | 2026-07-29 | SP-04911/2026 | 1 | 5 | 5 | 34 · 33 · 6 · 5 · 3 | 34 | [PDF](https://static.poder360.com.br/uploads/2026/08/presidente-sp-intelligence-6ago2026.pdf) | — |
| 9 | 13132 | Paraná Pesquisas | Governador · SP | 2025-02-23 |  | 7 | 35 | 1 | 21,6 | 48,6 | — | — |
| 10 | 13217 | — | Governador · SP | 2025-02-23 |  | 7 | 35 | 1 | 16,2 | 48,6 | [PDF](https://static.poder360.com.br/2026/02/pesquisa-paranapesquisas-saopaulo-governador-25.fev_.2025.pdf) | — |
| 11 | 13162 | — | Presidente · SP | 2025-07-08 | - | 4 | 24 | 0 | — | 41,8 | [PDF](https://static.poder360.com.br/2025/07/parana-pesquisas-cenarios-executivo-federal-2026.jun2025.pdf) | — |
| 12 | 13059 | Paraná Pesquisas | Governador · SP | 2025-02-23 |  | 7 | 35 | 0 | — | 48,6 | [PDF](https://static.poder360.com.br/2025/02/parana-pesquisa-governo-SP-fev2025.pdf) | — |
| 13 | 13755 | Datafolha | Presidente · PE · 2º turno | 2026-07-30 | BR-07601/2026 | 0 | 4 | 4 | 61 · 27 · 10 · 2 | 61 | [PDF](https://static.poder360.com.br/uploads/2026/08/presidente-datafolha-3ago.pdf) | — |
| 14 | 13716 | Real Time Big Data | Presidente · PE · 2º turno | 2026-07-30 | BR-08354/2026 | 1 | 2 | 2 | 61 · 33 | 61 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-realtimebigdata-presidente-pe-31jul2026.pdf) | — |
| 15 | 13501 | Real Time Big Data | Presidente · PE · 2º turno | 2026-06-10 | BR-02795/2026 | 1 | 2 | 1 | 60 | 60 | [PDF](https://static.poder360.com.br/uploads/2026/06/Pernambuco-BR-02795_2026_JUN26-1.pdf) | — |
| 16 | 13716 | Real Time Big Data | Presidente · PE | 2026-07-30 | BR-08354/2026 | 1 | 8 | 2 | 58 · 22 | 58 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-realtimebigdata-presidente-pe-31jul2026.pdf) | — |
| 17 | 13272 | Instituto Múltipla | Governador · PE · 2º turno | 2026-02-07 | PE-01312/2026 | BR-03057/2026 | 1 | 2 | 1 | 47 | 47 | [PDF](https://static.poder360.com.br/2026/02/Pesquisa-Institutomultipla-pernambuco-presidente-12.fev_.2026.pdf) | — |
| 18 | 13669 | Real Time Big Data | Governador · PE · 2º turno | 2026-07-30 | PE-08413/2026 | 1 | 2 | 1 | 45 | 45 | [PDF](https://static.poder360.com.br/uploads/2026/07/realtimebigdata-pe-31jul2026.pdf) | — |
| 19 | 13271 | Instituto Múltipla | Presidente · PE · 2º turno | 2026-02-07 | PE-01312/2026 | BR-03057/2026 | 1 | 2 | 1 | 23 | 56 | [PDF](https://static.poder360.com.br/2026/02/Pesquisa-Institutomultipla-pernambuco-presidente-12.fev_.2026.pdf) | — |
| 20 | 13125 | Paraná Pesquisas | Presidente · PE | 2021-12-19 |  | 4 | 16 | 0 | — | 59,9 | [PDF](https://static.poder360.com.br/2026/01/pesquisa-paranapesquisa-aprovacao-pernambuco-23.dez_.2025.pdf) | — |
| 21 | 13750 | Veritá | Presidente · PR · 2º turno | 2026-08-01 | BR-02249/2026 | 0 | 16 | 16 | 45,3 · 40,5 · 39,2 · 37,2 · 29,3 · 26,7 · 25,4 · 23,4 · 23,1 · 23,1 · 22,6 · 21,2 · 16,5 · 11,5 · 10,4 · 4,5 | 45,3 | [PDF](https://static.poder360.com.br/uploads/2026/08/integra-verita-parana-pdf.pdf) | — |
| 22 | 13794 | Neokemp | Presidente · PR | 2026-07-21 | BR-05678/2026 | 1 | 7 | 2 | 41,2 · 29,7 | 41,2 | [PDF](https://static.poder360.com.br/uploads/2026/08/neokemp-presidente-pr-7ago2026.pdf) | — |
| 23 | 13750 | Veritá | Presidente · PR | 2026-08-01 | BR-02249/2026 | 0 | 12 | 12 | 38,3 · 26,8 · 20,7 · 3,3 · 3,2 · 2,5 · 2,5 · 1,1 · 0,6 · 0,5 · 0,3 · 0,2 | 38,3 | [PDF](https://static.poder360.com.br/uploads/2026/08/integra-verita-parana-pdf.pdf) | — |
| 24 | 12960 | Paraná Pesquisas | Presidente · PR | 1970-01-01 |  | 3 | 18 | 0 | — | 45,2 | [PDF](https://static.poder360.com.br/2025/05/PR_Mai25-Federal.pdf) | — |
| 25 | 13714 | Direct Pesquisas | Governador · GO | 2026-07-27 | GO-03305/2026 | 1 | 6 | 5 | 42,2 · 16,9 · 10,3 · 5,6 · 3,4 | 42,2 | [PDF](https://static.poder360.com.br/uploads/2026/08/GO-033052026.pdf) | — |
| 26 | 13762 | BG Mídias e Assessoria | Presidente · RN | 2026-07-26 | BR-05225/2026 | 0 | 10 | 10 | 55,24 · 20,56 · 10,06 · 8,63 · 1,94 · 1,38 · 0,94 · 0,56 · 0,38 · 0,31 | 55,24 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-presidente-bg-midia-perfil-rn-1.pdf) | — |
| 27 | 13786 | Soluções | Presidente · RN | 2026-07-25 | BR-06751/2026 | 1 | 12 | 8 | 49 · 28,4 · 8,5 · 2,4 · 0,7 · 0,7 · 0,1 · 0,1 | 49 | [PDF](https://static.poder360.com.br/uploads/2026/08/TMC-pesquisa-RN-22-25jul2026.pdf) | — |
| 28 | 13787 | Soluções | Governador · RN · 2º turno | 2026-07-25 | RN-02277/2026 | 3 | 9 | 7 | 44,6 · 38,2 · 27,4 · 20,6 · 15,8 · 15,7 · 14,7 | 51,7 | [PDF](https://static.poder360.com.br/uploads/2026/08/TMC-pesquisa-RN-22-25jul2026.pdf) | — |
| 29 | 13837 | Data Census | Governador · RN | 2026-08-13 | RN-09307/2026 | 1 | 9 | 7 | 41,8 · 13,6 · 13,3 · 6,6 · 3,3 · 2,8 · 1,6 | 41,8 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-Data-Census-RN-14ago2026-scaled.jpg) | — |
| 30 | 13761 | BG Mídias e Assessoria | Senado · RN | 2026-07-26 | BR-05225/2026 | 0 | 12 | 12 | 34,62 · 16,56 · 14,22 · 12,06 · 8,75 · 4,41 · 4,09 · 1,72 · 1,63 · 0,91 · 0,84 · 0,19 | 34,62 | [PDF](https://static.poder360.com.br/uploads/2026/08/persquisa-perfil-rio-grande-do-norte-26jul.pdf) | — |
| 31 | 13760 | BG Mídias e Assessoria | Governador · RN | 2026-07-26 | RN-00337/2026 | 0 | 7 | 7 | 32,93 · 20,38 · 20,38 · 13,63 · 10,31 · 1,31 · 1,06 | 32,93 | [PDF](https://static.poder360.com.br/uploads/2026/08/persquisa-perfil-rio-grande-do-norte-26jul.pdf) | — |
| 32 | 13697 | Real Time Big Data | Presidente · PA | 2026-08-03 | BR-09650/2026 | 1 | 7 | 4 | 43 · 33 · 2 · 2 | 43 | [PDF](https://static.poder360.com.br/uploads/2026/08/realtimebigdata-para-presidente-4ago2026.pdf) | — |
| 33 | 13698 | Real Time Big Data | Governador · PA · 2º turno | 2026-08-03 | PA-08492/2026 | 1 | 2 | 1 | 38 | 38 | [PDF](https://static.poder360.com.br/uploads/2026/08/realtimebigdata-estadual-para-3ago2026.pdf) | — |
| 34 | 13622 | Quaest | Governador · PA · 2º turno | 2026-07-25 | PA-04548/2026 | 1 | 2 | 2 | 36 · 35 | 36 | [PDF](https://static.poder360.com.br/uploads/2026/07/quaest-para-nacional-estadual-27jul.pdf) | — |
| 35 | 13410 | Quaest | Governador · PA · 2º turno | 2026-04-25 | PA-09305/2026 | 1 | 2 | 1 | 34 | 34 | [PDF](https://static.poder360.com.br/2026/04/GENIALQUAESTPARAABR26.pdf?_gl=1*95z2h6*_ga*ODY2OTQ5MDcwLjE3NzI1NzQ3MjU.*_ga_HGJJJTZ4BN*czE3Nzc5MjU4MzMkbzYkZzAkdDE3Nzc5MjU4NDEkajYwJGwwJGgw) | — |
| 36 | 13235 | — | Presidente · PA | 2026-02-03 | BR-06815/2026 | PA-04089/2026 | 3 | 18 | 0 | — | 46 | [PDF](https://static.poder360.com.br/2026/02/pesquisa-realtimebigdata-para-presidente-5.fev_.2026.pdf) | — |
| 37 | 13604 | Real Time Big Data | Presidente · CE | 2026-07-14 | BR-03148/2026 | 2 | 9 | 4 | 66 · 62 · 26 · 21 | 66 | [PDF](https://static.poder360.com.br/uploads/2026/07/real-time-big-data-presidente-ceara-15jul2026.png) | — |
| 38 | 13777 | Ipec | Governador · CE · 2º turno | 2026-07-26 | CE-05739/2026 | 1 | 2 | 1 | 50 | 50 | [PDF](https://static.poder360.com.br/uploads/2026/08/ipsos-ipec-gov-senado-ce-7ago2026.pdf) | — |
| 39 | 13343 | — | Governador · CE | 2026-03-21 | CE-07550/2026 | 1 | 4 | 1 | 44 | 44 | [PDF](https://static.poder360.com.br/2026/04/Eleicoes-2026_-Pesquisa_-RedeANC_-Ceara.pdf) | — |
| 40 | 13343 | — | Governador · CE · 2º turno | 2026-03-21 | CE-07550/2026 | 1 | 3 | 1 | 5,6 | 49,2 | [PDF](https://static.poder360.com.br/2026/04/Eleicoes-2026_-Pesquisa_-RedeANC_-Ceara.pdf) | — |
| 41 | 13650 | Futura | Presidente · MG · 2º turno | 2026-07-24 | BR-08054/2026 | 2 | 4 | 3 | 45,6 · 44,3 · 42 | 48,7 | [PDF](https://static.poder360.com.br/uploads/2026/07/Relatorio_MG_Julho_2026_Poder-360%C2%B0.pdf) | — |
| 42 | 13318 | Paraná Pesquisas | Presidente · MG · 2º turno | 2026-03-07 | BR- 00094/2026 | 1 | 2 | 1 | 45,1 | 45,1 | [PDF](https://static.poder360.com.br/2026/03/parana-pesquisas-mg-executivo-10mar26.pdf) | — |
| 43 | 13337 | — | Senado · MG | 2026-03-12 | MG-06562/2026 | 1 | 6 | 1 | 3 | 20 | [PDF](https://static.poder360.com.br/2026/03/pesquisa-realtime-MG-06562-2026.pdf) | — |
| 44 | 13600 | Real Time Big Data | Presidente · ES · 2º turno | 2026-07-21 | BR-00636/2026 | 1 | 2 | 2 | 49 · 43 | 49 | [PDF](https://static.poder360.com.br/uploads/2026/07/espirito-santo-presidenciavel-22jul2026.pdf) | — |
| 45 | 13335 | — | Senado · ES | 2026-03-14 | ES-06722/2026 | 4 | 26 | 4 | 16 · 14 · 14 · 13 | 31 | [PDF](https://static.poder360.com.br/2026/03/pesquisa-realtimebigdata-estadual-es-16-mar-2026.pdf) | — |
| 46 | 13666 | Direto ao Ponto Pesquisas | Presidente · AM | 2026-06-20 | BR-05945/2026 | 1 | 7 | 2 | 44 · 35 | 44 | [PDF](https://static.poder360.com.br/uploads/2026/07/relatorio_AM-08042-2026_Amazonia-TI.pdf) | — |
| 47 | 13733 | Gerp | Presidente · RJ · 2º turno | 2026-07-15 | RJ-02209/2026 | 0 | 4 | 4 | 45 · 44 · 7 · 4 | 45 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-Gerp-eleicoes-governo-presidente-RJ-julho-2026.pdf) | — |
| 48 | 13597 | Quaest | Presidente · RJ | 2026-07-25 | BR-07670/2026 | 0 | 16 | 16 | 38 · 37 · 36 · 36 · 35 · 35 · 33 · 33 · 22 · 22 · 19 · 19 · 9 · 9 · 9 · 8 | 38 | [PDF](https://static.poder360.com.br/uploads/2026/07/pesquisa-governo-rj-quaest-27jul2026.pdf) | — |
| 49 | 13733 | Gerp | Presidente · RJ | 2026-07-15 | RJ-02209/2026 | 0 | 12 | 12 | 38 · 37 · 10 · 5 · 3 · 2 · 1 · 1 · 1 · 1 · 0 · 0 | 38 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-Gerp-eleicoes-governo-presidente-RJ-julho-2026.pdf) | — |
| 50 | 13326 | — | Senado · RJ | 2026-03-10 | RJ-04191/2026 | 2 | 12 | 1 | 12 | 24 | [PDF](https://static.poder360.com.br/2026/03/RealBigData-Governo-Senado-RiodeJaneiro-BR-043672026-Mar26.pdf) | — |
| 51 | 13592 | Real Time Big Data | Presidente · AC · 2º turno | 2026-07-25 | BR-08086/2026 | 1 | 3 | 3 | 57 · 34 · 4 | 57 | [PDF](https://static.poder360.com.br/uploads/2026/07/pesquisa-realtimebigdata-presidencial-acre-27jul26.pdf) | — |
| 52 | 13111 | Real Time Big Data | Senado · AC | 2005-12-12 |  | 5 | 33 | 0 | — | 31 | [PDF](https://static.poder360.com.br/2025/12/pesquisa-realtimebigdata-acre-governador-12.dez_.2025.pdf) | — |
| 53 | 13333 | — | Governador · RS | 2026-03-16 | RS-02550/2026 | 3 | 14 | 3 | 2 · 2 · 1 | 36 | [PDF](https://static.poder360.com.br/2026/03/pesquisa-realtime-bigdata-estadual-rs-17-mar-2026.pdf) | — |
| 54 | 13333 | — | Governador · RS · 2º turno | 2026-03-16 | RS-02550/2026 | 3 | 6 | 0 | — | 43 | [PDF](https://static.poder360.com.br/2026/03/pesquisa-realtime-bigdata-estadual-rs-17-mar-2026.pdf) | — |
| 55 | 13483 | Real Time Big Data | Presidente · PB · 2º turno | 2026-05-26 | BR -03562/2026 | 1 | 2 | 1 | 58 | 58 | [PDF](https://static.poder360.com.br/2026/05/Paraiba_Maio_Presidente_BR-035622026.pdf) | — |
| 56 | 13724 | DataTrends | Governador · PB · 2º turno | 2026-07-29 | PB-09547/2026 | 0 | 6 | 6 | 55 · 47 · 45 · 35 · 34 · 30 | 55 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-datatrend-governador-pb-1ago2026.pdf) | — |
| 57 | 13811 | Real Time Big Data | Presidente · BA · 2º turno | 2026-08-10 | BA-00277/2026 | 0 | 4 | 4 | 59 · 30 · 6 · 5 | 59 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-presidente-realtimebigdata-bahia-11go2026.pdf) | — |
| 58 | 13642 | Quaest | Presidente · BA · 2º turno | 2026-07-27 | BR-05856/2026 | 3 | 6 | 4 | 57 · 57 · 56 · 23 | 57 | [PDF](https://static.poder360.com.br/uploads/2026/07/quaest-ba-29jul2026.pdf) | — |
| 59 | 13642 | Quaest | Presidente · BA | 2026-07-27 | BR-05856/2026 | 2 | 11 | 6 | 57 · 52 · 18 · 1 · 0 · 0 | 57 | [PDF](https://static.poder360.com.br/uploads/2026/07/quaest-ba-29jul2026.pdf) | — |
| 60 | 13811 | Real Time Big Data | Presidente · BA | 2026-08-10 | BA-00277/2026 | 0 | 9 | 9 | 56 · 23 · 5 · 5 · 4 · 3 · 2 · 1 · 1 | 56 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-presidente-realtimebigdata-bahia-11go2026.pdf) | — |
| 61 | 13692 | 100% Cidades Participações | Governador · BA · 2º turno | 2026-07-25 | BA-07924/2026 | 1 | 2 | 1 | 54,1 | 54,1 | [PDF](https://static.poder360.com.br/uploads/2026/08/Relatorio_BA_2026jul_Poder-360.pdf) | — |
| 62 | 13694 | 100% Cidades Participações | Presidente · BA · 2º turno | 2026-07-25 | BR-01327/2026 | 1 | 2 | 1 | 33,2 | 56,8 | [PDF](https://static.poder360.com.br/uploads/2026/08/Relatorio_BA_2026jul_Poder-360.pdf) | — |
| 63 | 13332 | — | Senado · BA | 2026-03-11 | BA-08855/2026 | 2 | 8 | 1 | 19 | 27 | [PDF](https://static.poder360.com.br/2026/03/realtime_big_data_MAR2026.pdf) | — |
| 64 | 13331 | — | Governador · BA | 2026-03-11 | BA-08855/2026 | 1 | 4 | 1 | 2 | 44 | [PDF](https://static.poder360.com.br/2026/03/realtime_big_data_MAR2026.pdf) | — |
| 65 | 13729 | Vetor | Presidente · PI | 2026-08-02 | BR-01894/2026 | 1 | 14 | 13 | 67,79 · 18,35 · 5,93 · 2,75 · 1,81 · 1 · 0,95 · 0,5 · 0,31 · 0,19 · 0,12 · 0,12 · 0,06 | 67,79 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-piaui-rafael-lula.pdf) | — |
| 66 | 13330 | — | Presidente · PI · 2º turno | 2026-03-15 | PI-06908/2026 | 4 | 8 | 2 | 67 · 65 | 67 | [PDF](https://static.poder360.com.br/2026/03/Pesquisa-AtlasIntel-Eleicoes-Piaui-2026-260317-1.pdf) | — |
| 67 | 13646 | Real Time Big Data | Presidente · PI · 2º turno | 2026-07-13 | PI-00773/2026 | 1 | 2 | 2 | 67 · 24 | 67 | [PDF](https://static.poder360.com.br/uploads/2026/07/RealTimeBigData-Piaui-presidente.pdf) | — |
| 68 | 13646 | Real Time Big Data | Presidente · PI | 2026-07-13 | PI-00773/2026 | 1 | 8 | 2 | 65 · 20 | 65 | [PDF](https://static.poder360.com.br/uploads/2026/07/RealTimeBigData-Piaui-presidente.pdf) | — |
| 69 | 13728 | Vetor | Governador · PI | 2026-08-02 | PI-02509/2026 | 1 | 12 | 11 | 56,53 · 26,5 · 9,27 · 4,54 · 0,69 · 0,6 · 0,56 · 0,5 · 0,19 · 0,06 · 0,06 | 56,53 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-piaui-rafael-lula.pdf) | — |
| 70 | 13768 | Intenção Instituto de Pesquisa | Governador · PI · 2º turno | 2026-07-24 | PI-03190/2026 | 1 | 2 | 1 | 52,67 | 52,67 | [PDF](https://static.poder360.com.br/uploads/2026/08/intencao-pesquisa-vilanovapiaui-PI-22-24jul2026.pdf) | — |
| 71 | 13783 | Instituto Mais | Presidente · MT | 2026-07-26 | BR-07878/2026 | 1 | 6 | 3 | 39 · 30 · 1,4 | 39 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-instituto-mais-presidente-mt-1ago2026.pdf) | — |
| 72 | 13330 | — | Presidente · PI | 2026-03-15 | PI-06908/2026 | 1 | 6 | 0 | — | 61,9 | [PDF](https://static.poder360.com.br/2026/03/Pesquisa-AtlasIntel-Eleicoes-Piaui-2026-260317-1.pdf) | — |
| 73 | 13725 | Real Time Big Data | Presidente · MS · 2º turno | 2026-08-05 | BR-01784/2026 | 0 | 4 | 4 | 50 · 38 · 7 · 5 | 50 | [PDF](https://static.poder360.com.br/uploads/2026/08/presidente-mato-grosso-do-sul-real-time-big-data-6ago.pdf) | — |
| 74 | 13766 | Novo Ibrape | Presidente · MS | 2026-07-29 | BR-05913/2026 | 1 | 8 | 2 | 42,4 · 32,3 | 42,4 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-novo-ibrape-presidente-ms-31jul2026.pdf) | — |
| 75 | 13725 | Real Time Big Data | Presidente · MS | 2026-08-05 | BR-01784/2026 | 1 | 8 | 8 | 42 · 34 · 7 · 6 · 3 · 1 · 1 · 1 | 42 | [PDF](https://static.poder360.com.br/uploads/2026/08/presidente-mato-grosso-do-sul-real-time-big-data-6ago.pdf) | — |
| 76 | 13830 | Ranking | Presidente · MS | 2026-08-12 | BR-03493/2026 | 0 | 15 | 15 | 40 · 33 · 10 · 9,8 · 3 · 2,2 · 1 · 0,4 · 0,2 · 0,1 · 0,1 · 0,05 · 0,05 · 0,05 · 0,05 | 40 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-ranking-ms-14ago.pdf) | — |
| 77 | 13820 | IPPI - Pesquisas e Consultorias | Governador · MA · 2º turno | 2026-08-10 | MA-02810/2026 | 1 | 2 | 1 | 39 | 61 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-ippi-governo-ma-12ago2026.pdf) | — |
| 78 | 13319 | — | Governador · MA · 2º turno | 2026-03-08 | MA-00634/2026 | 2 | 5 | 1 | 7,7 | 47,3 | [PDF](https://static.poder360.com.br/2026/03/MA_Mar26.pdf) | — |
| 79 | 13319 | — | Governador · MA | 2026-03-08 | MA-00634/2026 | 1 | 4 | 0 | — | 34,6 | [PDF](https://static.poder360.com.br/2026/03/MA_Mar26.pdf) | — |
| 80 | 13689 | Real Time Big Data | Presidente · SE · 2º turno | 2026-08-01 | BR-07696/2026 | 1 | 2 | 1 | 63 | 63 | [PDF](https://static.poder360.com.br/uploads/2026/08/Sergipe-BR-07696_2026_Ago26-1-1.pdf) | — |
| 81 | 13671 | Instituto França | Presidente · SE · 2º turno | 2026-07-02 | BR-09714/2026 | 0 | 4 | 4 | 56,25 · 25,84 · 11,91 · 6 | 56,25 | [PDF](https://static.poder360.com.br/uploads/2026/08/PESQUISA-FRANCA_SERGIPE_JULHO_TSE.pdf) | — |
| 82 | 13671 | Instituto França | Presidente · SE | 2026-07-02 | BR-09714/2026 | 0 | 7 | 7 | 52,48 · 23,54 · 11,93 · 7,83 · 1,14 · 1,04 · 1 | 52,48 | [PDF](https://static.poder360.com.br/uploads/2026/08/PESQUISA-FRANCA_SERGIPE_JULHO_TSE.pdf) | — |
| 83 | 13675 | Instituto França | Governador · SE · 2º turno | 2026-07-02 | SE-05318/2026 | 0 | 8 | 8 | 50,16 · 44,65 · 33,78 · 17,8 · 16,95 · 15,09 · 11 · 10,57 | 50,16 | [PDF](https://static.poder360.com.br/uploads/2026/08/PESQUISA-FRANCA_SERGIPE_JULHO_TSE.pdf) | — |
| 84 | 13675 | Instituto França | Governador · SE | 2026-07-02 | SE-05318/2026 | 0 | 7 | 7 | 40,67 · 29,22 · 12,6 · 10,65 · 4,89 · 1,29 · 0,68 | 40,67 | [PDF](https://static.poder360.com.br/uploads/2026/08/PESQUISA-FRANCA_SERGIPE_JULHO_TSE.pdf) | — |
| 85 | 13735 | Brada Comunicação | Presidente · DF | 2026-07-31 | BR-08246/2026 | 1 | 12 | 7 | 33,8 · 29,3 · 11 · 10,2 · 2,1 · 0,3 · 0 | 33,8 | [PDF](https://static.poder360.com.br/uploads/2026/08/brada-comunicacao-df-presidente-6ago2026.pdf) | — |
| 86 | 13348 | — | Governador · TO | 2026-03-24 | TO-02299/2026 | 3 | 15 | 0 | — | 40 | [PDF](https://static.poder360.com.br/2026/04/Tocantins-02299-2026-Mar-26.pdf) | — |
| 87 | 13348 | — | Governador · TO · 2º turno | 2026-03-24 | TO-02299/2026 | 4 | 8 | 0 | — | 54 | [PDF](https://static.poder360.com.br/2026/04/Tocantins-02299-2026-Mar-26.pdf) | — |
| 88 | 13349 | — | Senado · TO | 2026-03-24 | TO-02299/2026 | 3 | 17 | 0 | — | 29 | [PDF](https://static.poder360.com.br/2026/04/Tocantins-02299-2026-Mar-26.pdf) | — |
| 89 | 13645 | Real Time Big Data | Presidente · RO · 2º turno | 2026-07-15 | BR-05580/2026 | 1 | 2 | 2 | 66 · 24 | 66 | [PDF](https://static.poder360.com.br/uploads/2026/07/Rondonia-BR-05580-2026-Jul_26-3.pdf) | — |
| 90 | 13645 | Real Time Big Data | Presidente · RO | 2026-07-15 | BR-05580/2026 | 1 | 9 | 2 | 58 · 25 | 58 | [PDF](https://static.poder360.com.br/uploads/2026/07/Rondonia-BR-05580-2026-Jul_26-3.pdf) | — |
| 91 | 13598 | Real Time Big Data | Presidente · AP · 2º turno | 2026-07-23 | BR-05542/2026 | 1 | 2 | 2 | 66 · 26 | 66 | [PDF](https://static.poder360.com.br/uploads/2026/07/realtime-amapa-nacional-24jul.pdf) | — |
| 92 | 13341 | — | Presidente · AP · 2º turno | 2026-03-28 | BR-06808/2026 | 4 | 8 | 1 | 39,1 | 50,1 | [PDF](https://static.poder360.com.br/2026/04/atlasintel-presidencial-governo-senado-1abr26.pdf) | — |
| 93 | 13341 | — | Presidente · AP | 2026-03-28 | BR-06808/2026 | 1 | 6 | 0 | — | 44,8 | [PDF](https://static.poder360.com.br/2026/04/atlasintel-presidencial-governo-senado-1abr26.pdf) | — |
| 94 | 13327 | — | Governador · AP | 2026-03-15 | AP-00767/2026 | 3 | 11 | 0 | — | 66,1 | [PDF](https://static.poder360.com.br/2026/03/AP_Mar26-1.pdf) | — |

## CURTA — precisam de `add_results`

Ancoradas no NOSSO registro. `guardadas` é quantas linhas de candidato o banco tem;
`esperadas` é o que o cenário do `v2` traz **mais** as linhas que o `v2` apagou dele.

| # | id | registro no banco | instituto | disputa | campo | registro TSE | guardadas | esperadas | faltam | % apagados | integra | reparo já escrito |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 13683 | `p360-13683-2-3-560d46c9155d` | Alfa Inteligência | Presidente · Brasil · 2º turno | 2026-07-28 | BR-04488/2026 | 2 | 4 | 2 | 15 · 2 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-nacional-Alfa-Inteligencia-31-jul-2026.pdf) | — |
| 2 | 13819 | `p360-13819-2-1-235ee8f28c0d` | PoderData | Presidente · Brasil · 2º turno | 2026-08-12 | BR-06868/2026 | 2 | 3 | 1 | 15 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-poderdata-aya-presidente-12ago.pdf) | — |
| 3 | 13706 | `p360-13706-1-0-b07f0f24b71b` | Quaest | Presidente · Brasil | 2026-08-03 | BR-06591/2026 | 10 | 13 | 3 | 10 · 1 · 0 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/08/Quaest-nacional-5ago2026.pdf) | — |
| 4 | 13819 | `p360-13819-2-2-4848ac6691be` | PoderData | Presidente · Brasil · 2º turno | 2026-08-12 | BR-06868/2026 | 2 | 3 | 1 | 10 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-poderdata-aya-presidente-12ago.pdf) | — |
| 5 | 13819 | `p360-13819-2-3-c30d905aecff` | PoderData | Presidente · Brasil · 2º turno | 2026-08-12 | BR-06868/2026 | 2 | 3 | 1 | 10 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-poderdata-aya-presidente-12ago.pdf) | — |
| 6 | 13544 | `p360-13544-2-4-dff6a5a073f5` | PoderData | Presidente · Brasil · 2º turno | 2026-06-24 | BR-05722/2026 | 2 | 3 | 1 | 10 | [PDF](https://static.poder360.com.br/uploads/2026/06/Relatorio-PoderData-Eleitoral-21-24-jun26-final.pdf) | — |
| 7 | 13369 | `p360-13369-2-3-236e574059a3` | Instituto Ideia | Presidente · Brasil · 2º turno | 2026-04-07 | BR-00605/2026 | 2 | 3 | 1 | 8,6 | [PDF](https://static.poder360.com.br/2026/04/Pesquisa-MeioIdeia-abril-2026-nacional.pdf) | — |
| 8 | 13845 | `p360-13845-2-1-c747e7d2ff4f` | Quaest | Presidente · Brasil · 2º turno | 2026-08-12 | BR-06773/2026 | 2 | 3 | 1 | 5 | [PDF](https://static.poder360.com.br/uploads/2026/08/quaest-globo-presidente-nacional-14ago2026.pdf) | — |
| 9 | 13705 | `p360-13705-2-1-4dbde94fdeb6` | Instituto Ideia | Presidente · Brasil · 2º turno | 2026-08-03 | BR-04579/2026 | 2 | 3 | 1 | 4,5 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-meio-ideia-presidencia-republica-5ago2026.pdf) | — |
| 10 | 13819 | `p360-13819-1-0-475bdd205498` | PoderData | Presidente · Brasil | 2026-08-12 | BR-06868/2026 | 8 | 10 | 2 | 4 · 1 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-poderdata-aya-presidente-12ago.pdf) | — |
| 11 | 13668 | `p360-13668-2-2-54f55f6fb845` | Vox Brasil | Presidente · Brasil · 2º turno | 2026-07-28 | BR-01084/2026 | 2 | 3 | 1 | 3,9 | [PDF](https://static.poder360.com.br/uploads/2026/07/RELATORIO-VOX-BRASIL-NACIONAL-5-31-07-2026.pdf) | — |
| 12 | 13683 | `p360-13683-2-2-c5c2ccf00a99` | Alfa Inteligência | Presidente · Brasil · 2º turno | 2026-07-28 | BR-04488/2026 | 2 | 3 | 1 | 3 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-nacional-Alfa-Inteligencia-31-jul-2026.pdf) | — |
| 13 | 13668 | `p360-13668-2-1-32b5d52aaee7` | Vox Brasil | Presidente · Brasil · 2º turno | 2026-07-28 | BR-01084/2026 | 2 | 3 | 1 | 2,5 | [PDF](https://static.poder360.com.br/uploads/2026/07/RELATORIO-VOX-BRASIL-NACIONAL-5-31-07-2026.pdf) | — |
| 14 | 13798 | `p360-13798-2-1-670965e6533d` | Nexus | Presidente · Brasil · 2º turno | 2026-08-09 | BR-08428/2026 | 2 | 3 | 1 | 2 | [PDF](https://static.poder360.com.br/uploads/2026/08/BTG-Nexus-Eleicoes2026-Brasil-10.ago_.2026.pdf) | — |
| 15 | 13798 | `p360-13798-2-0-45ee98dabe65` | Nexus | Presidente · Brasil · 2º turno | 2026-08-09 | BR-08428/2026 | 2 | 3 | 1 | 1 | [PDF](https://static.poder360.com.br/uploads/2026/08/BTG-Nexus-Eleicoes2026-Brasil-10.ago_.2026.pdf) | — |
| 16 | 13683 | `p360-13683-1-0-95a054df88a2` | Alfa Inteligência | Presidente · Brasil | 2026-07-28 | BR-04488/2026 | 6 | 7 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-nacional-Alfa-Inteligencia-31-jul-2026.pdf) | — |
| 17 | 13590 | `p360-13590-1-0-993fd1210f22` | Real Time Big Data | Presidente · Brasil | 2026-07-20 | BR-09247/2026 | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/07/presidencial-21jul2026-realtimebigdata.pdf) | — |
| 18 | 13508 | `p360-13508-1-0-64d46643b0bc` | Alfa Inteligência | Presidente · Brasil | 2026-06-10 | BR-03496/2026 | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/06/alfa-pesquisa-nacional-junho-2026.pdf) | — |
| 19 | 13478 | `p360-13478-1-1-cea549b091ee` | Instituto Ideia | Presidente · Brasil | 2026-05-27 | BR-02918/2026 | 6 | 7 | 1 | — | [PDF](https://static.poder360.com.br/2026/06/Pesquisa-Meio_Ideia-Maio-2.pdf) | — |
| 20 | 13417 | `p360-13417-1-0-db86bbd2a7a5` | Instituto Ideia | Presidente · Brasil | 2026-05-05 | BR-05356/2026 | 11 | 12 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/pesquisa-meio-maio.pdf?_gl=1*19um5d3*_ga*ODY2OTQ5MDcwLjE3NzI1NzQ3MjU.*_ga_HGJJJTZ4BN*czE3NzgwOTQ3MjgkbzkkZzAkdDE3NzgwOTQ3MzAkajU5JGwwJGgw) | — |
| 21 | 12920 | `p360-12920-1-1-4f8f6e7f933d` | Quaest | Presidente · Brasil | 2025-04-03 |  | 8 | 9 | 1 | — | [PDF](https://static.poder360.com.br/2025/04/pesquisa-quaest-marco-2025.pdf) | — |
| 22 | 13634 | `p360-13634-1-0-d5ab09a63f17` | Paraná Pesquisas | Senado · SP | 2026-07-28 | SP-04624/2026 | 8 | 12 | 4 | 31 · 30,7 · 24,8 · 19,2 · 12,3 · 10,6 · 6,6 · 4,8 · 1,8 · 1,5 · 1,4 | [PDF](https://static.poder360.com.br/uploads/2026/07/parana-pesquisas-SP-29jul2026.pdf) | — |
| 23 | 13430 | `p360-13430-1-0-fe144de0e03e` | Quaest | Senado · SP | 2026-04-27 | SP-03583/2026 | 5 | 6 | 1 | 8 · 4 | [PDF](https://static.poder360.com.br/2026/04/Genial-Quaest-SP-29abr2026.pdf?_gl=1*1prkzgd*_ga*ODY2OTQ5MDcwLjE3NzI1NzQ3MjU.*_ga_HGJJJTZ4BN*czE3Nzc5Mzg0MzckbzckZzEkdDE3Nzc5NDYyODIkajYwJGwwJGgw) | — |
| 24 | 13839 | `p360-13839-1-0-3d1bedff466e` | Enfoque | Presidente · SP | 2026-08-10 | BR-03656/2026 | 4 | 7 | 3 | 2,4 | [PDF](https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf) | — |
| 25 | 13575 | `p360-13575-1-0-57aeb20d0779` | Datafolha | Presidente · SP | 2026-07-03 | BR-06481/2026 | 10 | 11 | 1 | 2 | — | — |
| 26 | 13801 | `p360-13801-1-0-de2830a530cc` | Instituto Ideia | Presidente · SP | 2026-08-08 | BR-08036/2026 | 9 | 11 | 2 | 1 · 0,8 | [PDF](https://static.poder360.com.br/uploads/2026/08/integra-meioideia-10ago.pdf) | — |
| 27 | 13452 | `p360-13452-1-0-ec2e45ccb2dd` | Paraná Pesquisas | Presidente · SP | 2026-04-14 | BR-08453/2026 | 10 | 11 | 1 | 0,8 | [PDF](https://static.poder360.com.br/2026/05/Parana-Pesquisas_SP_Abr26.pdf) | — |
| 28 | 13839 | `p360-13839-2-0-dc9eea674faa` | Enfoque | Presidente · SP · 2º turno | 2026-08-10 | BR-03656/2026 | 2 | 3 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf) | — |
| 29 | 13839 | `p360-13839-2-3-858ff9c7cc56` | Enfoque | Presidente · SP · 2º turno | 2026-08-10 | BR-03656/2026 | 1 | 2 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf) | — |
| 30 | 13839 | `p360-13839-2-2-f300f19e949c` | Enfoque | Presidente · SP · 2º turno | 2026-08-10 | BR-03656/2026 | 1 | 2 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf) | — |
| 31 | 13519 | `p360-13519-1-0-848087cc7ff6` | Real Time Big Data | Presidente · SP | 2026-06-15 | BR-04419/2026 | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/06/Real-Time-Big-Data-presidente-SP-16jun2026.pdf) | — |
| 32 | 13424 | `p360-13424-1-0-eca967a1a399` | Quaest | Presidente · SP | 2026-04-28 | BR-09928/2026 | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/quaest-banco-genial-pesquisas-estaduais.pdf) | — |
| 33 | 13834 | `p360-13834-1-0-a11b58cc3e16` | IRTB (Instituto Revista Total Brasil) | Governador · PE | 2026-08-07 | PE-05026/2026 | 2 | 6 | 4 | 45 · 4,58 · 0,25 · 0,08 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-PE-revista-total-9ago2026.pdf) | — |
| 34 | 13772 | `p360-13772-1-0-8eb2baca73ae` | Brada Comunicação | Governador · PE | 2026-07-29 | PE-06641/2026 | 1 | 5 | 4 | 37,2 · 0,8 · 0,6 · 0,5 | [PDF](https://static.poder360.com.br/uploads/2026/08/brada-pe-governo-7ago2026.pdf) | — |
| 35 | 13782 | `p360-13782-1-0-a5048037ac96` | Ipespe | Presidente · PE | 2026-07-25 | BR-08707/2026 | 2 | 4 | 2 | 20 · 19 | [PDF](https://static.poder360.com.br/uploads/2026/08/IPESPE-FolhaPE-estadual-25jul2026.pdf) | — |
| 36 | 13271 | `p360-13271-1-0-f4bb2d6f2d16` | Instituto Múltipla | Presidente · PE | 2026-02-07 | PE-01312/2026|BR-03057/2026 | 2 | 6 | 4 | 17 · 3 · 1 | [PDF](https://static.poder360.com.br/2026/02/Pesquisa-Institutomultipla-pernambuco-presidente-12.fev_.2026.pdf) | — |
| 37 | 13723 | `p360-13723-1-1-dd8001af2f7f` | Datafolha | Senado · PE | 2026-07-30 | PE-04519/2026 | 8 | 10 | 2 | 3 · 2 · 2 | [PDF](https://static.poder360.com.br/uploads/2026/08/datafolha-pe-governador-5ago2026.pdf) | — |
| 38 | 13670 | `p360-13670-1-1-e8cfb2781d92` | Real Time Big Data | Senado · PE | 2026-07-30 | PE-08413/2026 | 6 | 8 | 2 | 2 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/realtimebigdata-pe-31jul2026.pdf) | — |
| 39 | 13615 | `p360-13615-1-0-c452dc79a9ed` | Quaest | Governador · PE | 2026-07-26 | PE-09649/2026 | 3 | 5 | 2 | 1 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-Genial-Quaest-Pernambuco-28-jul-2026.pdf) | — |
| 40 | 13669 | `p360-13669-1-0-3aecfd453f5f` | Real Time Big Data | Governador · PE | 2026-07-30 | PE-08413/2026 | 3 | 5 | 2 | 1 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/realtimebigdata-pe-31jul2026.pdf) | — |
| 41 | 13722 | `p360-13722-1-0-edd0625135a0` | Datafolha | Governador · PE | 2026-07-30 | PE-04519/2026 | 3 | 5 | 2 | 1 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/08/datafolha-pe-governador-5ago2026.pdf) | — |
| 42 | 13453 | `p360-13453-1-0-5269eb3ea7a5` | Datafolha | Presidente · PE | 2026-04-15 | BR-001221/2026 | 10 | 11 | 1 | 1 | [PDF](https://static.poder360.com.br/2026/05/DatafolhaRede-Nordeste-de-Comunicacao-Abr.2026.pdf) | — |
| 43 | 13363 | `p360-13363-1-0-cb6544486b20` | Veritá | Governador · PE | 2026-03-30 | PE-02184/2026 | 6 | 7 | 1 | 0,2 | [PDF](https://static.poder360.com.br/2026/04/Relatorio-Verita-Pernambuco-24-30-marco-2026-1.pdf) | — |
| 44 | 13614 | `p360-13614-1-0-bf4b4d06af0f` | Quaest | Presidente · PE | 2026-07-26 | BR-03810/2026 | 7 | 11 | 4 | 0 · 0 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-Genial-Quaest-Pernambuco-28-jul-2026.pdf) | — |
| 45 | 13617 | `p360-13617-1-0-b4918238f57d` | Quaest | Senado · PE | 2026-07-26 | PE-09649/2026 | 9 | 10 | 1 | 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-Genial-Quaest-Pernambuco-28-jul-2026.pdf) | — |
| 46 | 13501 | `p360-13501-1-0-dd64af6b3da1` | Real Time Big Data | Presidente · PE | 2026-06-10 | BR-02795/2026 | 9 | 10 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/06/Pernambuco-BR-02795_2026_JUN26-1.pdf) | — |
| 47 | 13422 | `p360-13422-1-0-273350d67cde` | Quaest | Presidente · PE | 2026-04-28 | BR-03473/2026 | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/quaest-banco-genial-pesquisas-estaduais.pdf) | — |
| 48 | 13409 | `p360-13409-1-0-51fcbc4edd3c` | Quaest | Senado · PE | 2026-04-26 | PE-08904/2026 | 10 | 11 | 1 | 0 | [PDF](https://static.poder360.com.br/2026/04/genial-quaest-PE-abr2026.pdf?_gl=1*14xvmcl*_ga*ODY2OTQ5MDcwLjE3NzI1NzQ3MjU.*_ga_HGJJJTZ4BN*czE3Nzc5MjMyNTkkbzUkZzAkdDE3Nzc5MjMyNTkkajYwJGwwJGgw) | — |
| 49 | 13453 | `p360-13453-2-0-7982ed2fa2f9` | Datafolha | Presidente · PE · 2º turno | 2026-04-15 | BR-001221/2026 | 2 | 3 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/DatafolhaRede-Nordeste-de-Comunicacao-Abr.2026.pdf) | — |
| 50 | 13748 | `p360-13748-2-1-e5f533fba886` | Veritá | Governador · PR · 2º turno | 2026-08-01 | PR-03910/2026 | 2 | 4 | 2 | 74,3 · 25,7 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-verita-parana-6ago2026.pdf) | — |
| 51 | 13572 | `p360-13572-1-0-af79660f41c7` | Paraná Pesquisas | Senado · PR | 2026-07-06 | PR-01166/2026 | 7 | 8 | 1 | 10,6 | [PDF](https://static.poder360.com.br/uploads/2026/07/PR_Jul26.pdf) | — |
| 52 | 13603 | `p360-13603-1-0-e89d3a9c2cba` | Quaest | Presidente · PR | 2026-07-25 | BR-03445/2026 | 7 | 10 | 3 | 2 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/genial-quaest-Parana-27jul2026.pdf) | — |
| 53 | 13398 | `p360-13398-1-0-b3675f3d3d7d` | Quaest | Senado · PR | 2026-04-25 | PR-02588/2026 | 7 | 8 | 1 | 2 | [PDF](https://static.poder360.com.br/2026/04/GENIALQUAESTPARANAABR26-1-1.pdf) | — |
| 54 | 13719 | `p360-13719-1-0-e5bb3ec3adb4` | Ranking Brasil | Governador · PR | 2026-07-28 | PR-07486/2026 | 5 | 6 | 1 | 0,5 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-ranking-brasil-governador-pr-5ago.pdf) | — |
| 55 | 13421 | `p360-13421-1-0-03f99420da6e` | Quaest | Presidente · PR | 2026-04-28 | BR-01656/2026 | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/quaest-banco-genial-pesquisas-estaduais.pdf) | — |
| 56 | 13284 | `p360-13284-1-0-cee1b580e908` | Direct Pesquisas | Governador · GO | 2026-02-10 | GO-09854/2026 | 4 | 5 | 1 | 34,1 | [PDF](https://static.poder360.com.br/2026/02/direct-pesquisa-goais-presidente-12.fev_.2026.pdf) | — |
| 57 | 13752 | `p360-13752-1-0-4cf1e398435d` | DataRD | Governador · GO | 2026-08-04 | GO-08142/2026 | 3 | 4 | 1 | 33,3 | [PDF](https://static.poder360.com.br/uploads/2026/08/Governador.-GO.DataRDjpeg.pdf) | — |
| 58 | 13287 | `p360-13287-1-0-05249b61a825` | Portal Goiás | Governador · GO | 2026-02-07 | GO-01895/2026 | 4 | 5 | 1 | 29 | [PDF](https://static.poder360.com.br/2026/02/pesquisa-portalgoias-goias-presidente-10.fev_.2026.pdf) | — |
| 59 | 13290 | `p360-13290-1-0-d8fd5c7598ba` | Portal Goiás | Governador · GO | 2026-02-03 | GO-01981/2026 | 4 | 5 | 1 | 28,6 | [PDF](https://static.poder360.com.br/2026/02/pesquisa-portalgoias-goias-presidente.10.fev_.2026pdf.pdf) | — |
| 60 | 13731 | `p360-13731-1-0-541deb43ce8f` | DataRD | Presidente · GO | 2026-08-04 | BR-07847/2026 | 3 | 6 | 3 | 27,5 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-datard-presidente-go-6ago2026.pdf) | — |
| 61 | 13739 | `p360-13739-1-0-8e7821fcea47` | Instituto Gazeta de Pesquisas | Governador · GO | 2026-07-27 | GO-01528/2026 | 2 | 4 | 2 | 19,5 · 7,3 | [PDF](https://static.poder360.com.br/uploads/2026/08/igape-goiais-luziana-estadual-24-27jul2026.pdf) | — |
| 62 | 13746 | `p360-13746-1-0-c31655c0700e` | Instituto Gazeta de Pesquisas | Governador · GO | 0026-02-25 | GO-07670/2026 | 2 | 5 | 3 | 12,4 · 6,4 · 4,4 | [PDF](https://static.poder360.com.br/uploads/2026/08/igape-go-gove-senado-6ago2026.pdf) | — |
| 63 | 13717 | `p360-13717-1-0-83804f6a5e68` | Direct Pesquisas | Senado · GO | 2026-07-30 | GO-03305/2026 | 4 | 8 | 4 | 10,4 · 8,7 · 1,3 · 0,6 | [PDF](https://static.poder360.com.br/uploads/2026/08/GO-033052026.pdf) | — |
| 64 | 13439 | `p360-13439-1-1-024ac33330d4` | Exata.GO | Governador · GO | 2026-04-30 | GO-08525/2026 | 5 | 7 | 2 | 8,82 · 0,55 | [PDF](https://static.poder360.com.br/2026/05/ESTADO-DE-GOIAS-04-05-2026-classificada.pdf) | — |
| 65 | 13742 | `p360-13742-1-0-5b9bb14e08a1` | Instituto Gazeta de Pesquisas | Governador · GO | 2026-07-25 | GO-07670/2026 | 4 | 6 | 2 | 7,8 · 7 | [PDF](https://static.poder360.com.br/uploads/2026/08/igape-goias-estadual-ago-2026.pdf) | — |
| 66 | 13577 | `p360-13577-1-1-4e7f607f47ac` | Real Time Big Data | Senado · GO | 2026-07-08 | GO-03751/2026 | 10 | 14 | 4 | 5 · 4 · 2 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/07/realtime-governo-goias-9jul26.pdf) | — |
| 67 | 13740 | `p360-13740-1-0-f21d43ecc119` | Instituto Gazeta de Pesquisas | Senado · GO | 2026-07-27 | GO-01528/2026 | 4 | 8 | 4 | 4,5 · 2 · 1,7 · 1,4 | [PDF](https://static.poder360.com.br/uploads/2026/08/igape-goiais-luziana-estadual-24-27jul2026.pdf) | — |
| 68 | 13656 | `p360-13656-1-0-53c27532dc36` | Quaest | Governador · GO | 2026-07-28 | GO-01701/2026 | 4 | 6 | 2 | 1 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/GENIALQUAESTGOIASJUL26-1.pdf) | — |
| 69 | 13497 | `p360-13497-1-0-c823054e303b` | Directa | Governador · GO | 2026-05-26 | GO-07758/2026 | 6 | 7 | 1 | 0,5 | [PDF](https://static.poder360.com.br/2026/06/GOIANIA-RESULTADO-COMPLETO.-MAIO.2026.pdf) | — |
| 70 | 13578 | `p360-13578-1-0-5b064e91f586` | Real Time Big Data | Presidente · GO | 2026-07-08 | BR-02402/2026 | 8 | 9 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/07/realtime-presidencial-goais-9jul26.pdf) | — |
| 71 | 13443 | `p360-13443-1-1-85d2a7a5a5bb` | Real Time Big Data | Presidente · GO | 2026-05-12 | BR-00946/2026 | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/Presidencial-Goias-BR-009462026-MAI26-1.pdf) | — |
| 72 | 13426 | `p360-13426-1-0-d660542bbfc9` | Quaest | Presidente · GO | 2026-04-28 | BR-01368/2026 | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/quaest-banco-genial-pesquisas-estaduais.pdf) | — |
| 73 | 13797 | `p360-13797-1-0-821cc5f0e5ee` | Exatus consultoria e pesquisa | Presidente · RN | 2026-07-10 | BR-07763/2026 | 5 | 9 | 4 | 51,3 · 1,84 · 1,15 · 0,12 | [PDF](https://static.poder360.com.br/uploads/2026/08/Grupo-Agora-RN-Presidente-.pdf) | — |
| 74 | 13780 | `p360-13780-1-0-a71938b5414e` | Instituto Media | Governador · RN | 2026-07-24 | RN-03002/2026 | 2 | 3 | 1 | 40,2 | [PDF](https://static.poder360.com.br/uploads/2026/08/media-inteligencia-pesquisa-gov-rn-7ago2026.pdf) | — |
| 75 | 13711 | `p360-13711-1-0-3f5421b67ac1` | Data Capital | Presidente · RN | 2026-07-28 | RN-06579/2026 | 6 | 7 | 1 | 40 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-data-capital-presidente-rn-5ago2026.pdf) | — |
| 76 | 13835 | `p360-13835-1-0-87beb2b4e39f` | consult pesquisas | Presidente · RN | 2026-08-10 | BR-09418/2026 | 6 | 13 | 7 | 31,76 · 1,29 · 0,18 · 0,06 · 0,06 · 0,06 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-consult-presidente-rn-14ago2026.pdf) | — |
| 77 | 13838 | `p360-13838-1-0-8c59a2b955a0` | consult pesquisas | Governador · RN | 2026-08-10 | RN-08509/2026 | 6 | 9 | 3 | 27,65 · 0,41 · 0,18 · 0,12 · 0,06 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-consult-governo-rn-14ago2206.pdf) | — |
| 78 | 13787 | `p360-13787-1-0-ae586ed34d55` | Soluções | Governador · RN | 2026-07-25 | RN-02277/2026 | 2 | 7 | 5 | 24,9 · 9,7 · 1,4 · 0,3 · 0,3 | [PDF](https://static.poder360.com.br/uploads/2026/08/TMC-pesquisa-RN-22-25jul2026.pdf) | — |
| 79 | 13836 | `p360-13836-1-0-e1bb2bc9e6fe` | consult pesquisas | Senado · RN | 2026-08-10 | RN-08509/2026 | 8 | 14 | 6 | 23,41 · 5,32 · 0,65 · 0,17 · 0,15 · 0,15 · 0,12 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-consult-senado-rn-14ago2026.pdf) | — |
| 80 | 13788 | `p360-13788-1-1-5b55313c2eae` | Soluções | Senado · RN | 2026-07-25 | RN-02277/2026 | 4 | 12 | 8 | 20,9 · 3,6 · 0,8 · 0,8 · 0,7 · 0,4 · 0,2 · 0,1 | [PDF](https://static.poder360.com.br/uploads/2026/08/TMC-pesquisa-RN-22-25jul2026.pdf) | — |
| 81 | 13648 | `p360-13648-1-0-78b122f42b58` | AtlasIntel | Presidente · RN | 2026-07-21 | BR-07335/2026 | 7 | 8 | 1 | 0,9 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-Atlas_94FM-Julho-Eleicoes-Rio-Grande-do-Norte-1.pdf) | — |
| 82 | 13357 | `p360-13357-1-0-20f78a434b68` | Paraná Pesquisas | Presidente · PA | 2026-03-21 | BR-04700/2026 | 6 | 7 | 1 | 41 | [PDF](https://static.poder360.com.br/2026/04/PA_Mar26-presidente.pdf) | — |
| 83 | 13616 | `p360-13616-1-0-9ea76714e493` | Quaest | Presidente · PA | 2026-07-25 | BR-06752/2026 | 8 | 11 | 3 | 2 · 1 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/quaest-para-nacional-estadual-27jul.pdf) | — |
| 84 | 13526 | `p360-13526-1-0-6937e86d2b53` | Doxa Pesquisa | Presidente · PA | 2026-06-14 | BR-03857/2026 | 8 | 9 | 1 | 1,3 | [PDF](https://static.poder360.com.br/uploads/2026/06/PESQUISA-DOXA-PA-JUNHO-2026.pdf) | — |
| 85 | 13419 | `p360-13419-1-0-b8f21e8a3d4b` | Quaest | Presidente · PA | 2026-04-28 | BR-01755/2026 | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/quaest-banco-genial-pesquisas-estaduais.pdf) | — |
| 86 | 13019 | `p360-13019-1-0-79731f13c412` | AtlasIntel | Governador · PA | 2025-08-28 |  | 4 | 5 | 1 | — | [PDF](https://static.poder360.com.br/2025/09/PesquisaAtlasIntel-Para-eleicces-2026.pdf) | — |
| 87 | 13019 | `p360-13019-2-0-2f8b89df9a28` | AtlasIntel | Governador · PA · 2º turno | 2025-08-28 |  | 4 | 5 | 1 | — | [PDF](https://static.poder360.com.br/2025/09/PesquisaAtlasIntel-Para-eleicces-2026.pdf) | — |
| 88 | 13020 | `p360-13020-1-0-a58ace6e2b6e` | AtlasIntel | Senado · PA | 2025-08-28 |  | 8 | 9 | 1 | — | [PDF](https://static.poder360.com.br/2025/09/PesquisaAtlasIntel-Para-eleicces-2026.pdf) | — |
| 89 | 13826 | `p360-13826-1-0-7fda0797b73f` | AtlasIntel | Senado · CE | 2026-08-11 | CE-02777/2026 | 5 | 7 | 2 | 21,7 · 0,4 · 0,3 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-atlasintel-governo-ce-12ago2026.pdf) | — |
| 90 | 13659 | `p360-13659-1-0-064b4d86ca34` | Quaest | Senado · CE | 2026-07-28 | CE-09277/2026 | 10 | 12 | 2 | 20 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/Quaest-Ceara-30jul2026.pdf) | — |
| 91 | 13658 | `p360-13658-1-0-753c309e59b7` | Quaest | Governador · CE | 2026-07-28 | CE-09277/2026 | 5 | 8 | 3 | 13 · 3 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/Quaest-Ceara-30jul2026.pdf) | — |
| 92 | 13177 | `p360-13177-1-0-89b7fbd05912` | Paraná Pesquisas | Presidente · CE | 2026-01-21 | BR-00505/2026 | 7 | 8 | 1 | 5,1 | [PDF](https://static.poder360.com.br/2026/01/parana-pesquisas-ceara-executivo-federal-22jan2026.pdf) | — |
| 93 | 13512 | `p360-13512-1-0-5126113638d1` | AtlasIntel | Governador · CE | 2026-06-14 | CE-03465/2026 | 5 | 6 | 1 | 2,7 · 1,3 | [PDF](https://static.poder360.com.br/uploads/2026/06/Pesquisa-Atlas_Focus-Eleicoes-Ceara-2026-150626-1.pdf) | — |
| 94 | 13771 | `p360-13771-1-0-de9b32263ae2` | Ipec | Presidente · CE | 2026-07-26 | BR-07235/2026 | 8 | 11 | 3 | 2 · 1 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/07/Job_26_059792_Ceara_Relatorio_de_tabelas_Completo.pdf) | — |
| 95 | 13777 | `p360-13777-1-0-55172949b2c2` | Ipec | Governador · CE | 2026-07-26 | CE-05739/2026 | 5 | 7 | 2 | 2 · 2 | [PDF](https://static.poder360.com.br/uploads/2026/08/ipsos-ipec-gov-senado-ce-7ago2026.pdf) | — |
| 96 | 13655 | `p360-13655-1-0-98d16e9a6152` | Quaest | Presidente · CE | 2026-07-28 | BR-03238/2026 | 7 | 11 | 4 | 1 · 0 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/Quaest-Ceara-30jul2026.pdf) | — |
| 97 | 13456 | `p360-13456-1-0-9ed967d0e9e0` | Real Time Big Data | Governador · CE | 2026-05-19 | CE-03506/2026 | 5 | 6 | 1 | 1 | [PDF](https://static.poder360.com.br/2026/05/real-time-big-data-ceara-governador-senado-maio-2026.pdf) | — |
| 98 | 13528 | `p360-13528-1-0-91a60b1ecefd` | AtlasIntel | Presidente · CE | 2026-06-14 | BR-01326/2026 | 7 | 8 | 1 | 0,7 | [PDF](https://static.poder360.com.br/uploads/2026/06/Pesquisa-Atlas_Focus-Eleicoes-Ceara-2026-260615-1.pdf) | — |
| 99 | 13458 | `p360-13458-1-0-ba616e03c6af` | Real Time Big Data | Presidente · CE | 2026-05-19 | BR-01744/2026 | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/real-time-big-data-ceara-presidente-mai-2026.pdf) | — |
| 100 | 13405 | `p360-13405-1-0-a830ebf0ad5a` | Quaest | Senado · CE | 2026-04-28 | CE-01725/2026, | 11 | 12 | 1 | 0 | [PDF](https://static.poder360.com.br/2026/04/genial-quaest-ceara-abr2026.pdf?_gl=1*1v31lb*_ga*MTM5NjIyMzY1My4xNzc2OTY4MzI4*_ga_HGJJJTZ4BN*czE3Nzc2NjM0MzUkbzIxJGcxJHQxNzc3NjY4MDk3JGo1MiRsMCRoMA..) | — |
| 101 | 13427 | `p360-13427-1-0-a879b4999b47` | Quaest | Presidente · CE | 2026-04-28 | BR-01347/2026 | 5 | 6 | 1 | — | [PDF](https://www.poder360.com.br/poder-eleicoes/2o-turno-lula-lidera-em-5-estados-flavio-em-outros-5-diz-quaest/) | — |
| 102 | 13141 | `p360-13141-1-3-02c8ed9cc170` | Paraná Pesquisas | Governador · CE | 2025-12-15 |  | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/2025/12/parana-pesquisas-ceara-governo-dezembro.pdf) | — |
| 103 | 13650 | `p360-13650-1-0-3458b4cc8a5c` | Futura | Presidente · MG | 2026-07-24 | BR-08054/2026 | 5 | 7 | 2 | 37,7 · 31,8 | [PDF](https://static.poder360.com.br/uploads/2026/07/Relatorio_MG_Julho_2026_Poder-360%C2%B0.pdf) | — |
| 104 | 13406 | `p360-13406-1-0-d6643d6ed60d` | Quaest | Governador · MG | 2026-04-26 | MG-08646/2026 | 6 | 10 | 4 | 4 · 4 · 2 · 0 | [PDF](https://static.poder360.com.br/2026/04/Pesquisa-Genial-Quaest-MinasGerais-abr-2026.pdf?_gl=1*an5he*_ga*ODY2OTQ5MDcwLjE3NzI1NzQ3MjU.*_ga_HGJJJTZ4BN*czE3Nzc5MTc1OTEkbzQkZzAkdDE3Nzc5MTc2MDUkajYwJGwwJGgw) | — |
| 105 | 13653 | `p360-13653-1-0-79ec6aa05b65` | Real Time Big Data | Senado · MG | 2026-07-29 | MG-06475/2026 | 7 | 8 | 1 | 3 | [PDF](https://static.poder360.com.br/uploads/2026/07/Minas-Gerais-MG-06475_2026-Jul26-3-2.pdf) | — |
| 106 | 13609 | `p360-13609-1-0-b6356a64f0c5` | Quaest | Governador · MG | 2026-07-26 | MG-03490/2026 | 7 | 11 | 4 | 2 · 2 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/quaest-mg-28jul2026.pdf) | — |
| 107 | 13652 | `p360-13652-1-0-9b306b670305` | Real Time Big Data | Governador · MG | 2026-07-29 | MG-06475/2026 | 9 | 10 | 1 | 1 | [PDF](https://static.poder360.com.br/uploads/2026/07/Minas-Gerais-MG-06475_2026-Jul26-3-2.pdf) | — |
| 108 | 13610 | `p360-13610-1-2-f9683711a65f` | Quaest | Senado · MG | 2026-07-26 | MG-03490/2026 | 9 | 10 | 1 | 1 | [PDF](https://static.poder360.com.br/uploads/2026/07/quaest-mg-28jul2026.pdf) | — |
| 109 | 13611 | `p360-13611-1-0-a03dd04d9f05` | Quaest | Presidente · MG | 2026-07-26 | BR-09333/2026 | 8 | 11 | 3 | 1 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/quaest-mg-28jul2026.pdf) | — |
| 110 | 13654 | `p360-13654-1-0-322f0250b944` | Real Time Big Data | Presidente · MG | 2026-07-29 | BR-00968/2026 | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/07/Minas-Gerais-BR-00968_2026_Jul26.pdf) | — |
| 111 | 13423 | `p360-13423-1-0-1660f48027ff` | Quaest | Presidente · MG | 2026-04-28 | BR-00430/2026 | 5 | 6 | 1 | — | [PDF](https://www.poder360.com.br/poder-eleicoes/2o-turno-lula-lidera-em-5-estados-flavio-em-outros-5-diz-quaest/) | — |
| 112 | 13407 | `p360-13407-1-1-a86117ebb1ff` | Quaest | Senado · MG | 2026-04-26 | MG-08646/2026 | 8 | 9 | 1 | — | [PDF](https://static.poder360.com.br/2026/04/Pesquisa-Genial-Quaest-MinasGerais-abr-2026.pdf?_gl=1*an5he*_ga*ODY2OTQ5MDcwLjE3NzI1NzQ3MjU.*_ga_HGJJJTZ4BN*czE3Nzc5MTc1OTEkbzQkZzAkdDE3Nzc5MTc2MDUkajYwJGwwJGgw) | — |
| 113 | 13011 | `p360-13011-1-0-6a48ea468330` | AtlasIntel | Presidente · MG | 2025-08-25 | ATLASINTEL | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/2025/08/Pesquisa-Atlas-Minas-Gerais-Eleicoes-2026.pdf) | — |
| 114 | 13012 | `p360-13012-1-0-736fb3df9579` | AtlasIntel | Governador · MG | 2025-08-25 | ATLASINTEL | 6 | 7 | 1 | — | [PDF](https://static.poder360.com.br/2025/09/AtlasIntel-MG-eleicoes-2026-1-1.pdf) | — |
| 115 | 13013 | `p360-13013-1-1-53bccbeec092` | AtlasIntel | Senado · MG | 2025-08-25 | ATLASINTEL | 9 | 10 | 1 | — | [PDF](https://static.poder360.com.br/2025/09/AtlasIntel-MG-eleicoes-2026-1-1.pdf) | — |
| 116 | 13600 | `p360-13600-1-0-cd4a76ef6f05` | Real Time Big Data | Presidente · ES | 2026-07-21 | BR-00636/2026 | 6 | 8 | 2 | 34 | [PDF](https://static.poder360.com.br/uploads/2026/07/espirito-santo-presidenciavel-22jul2026.pdf) | — |
| 117 | 13701 | `p360-13701-1-2-6029d68117da` | Real Time Big Data | Senado · ES | 2026-07-21 | BR-00636/2026 | 9 | 10 | 1 | 12 · 4 · 1 · 1 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/08/espirito-santo-presidenciavel-22jul2026.pdf) | — |
| 118 | 13631 | `p360-13631-1-0-6283fc62fda6` | Quaest | Presidente · ES | 2026-07-13 | BR-03479/2026 | 10 | 12 | 2 | 1 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/quaest-presidente-ES-17-jul-2026.pdf) | — |
| 119 | 13505 | `p360-13505-1-0-eea536274cec` | Real Time Big Data | Presidente · ES | 2026-06-08 | BR-03811/2026 | 8 | 9 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/06/Espirito-Santo-BR-03811-2026-Jun-26-1.pdf) | — |
| 120 | 13473 | `p360-13473-1-0-cbfc4f5d2bc1` | Instituto França | Presidente · ES | 2026-05-10 | BR-03175/2026 | 4 | 5 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/PESQUISA-FRANCA_ESPIRITO-SANTO_MAIO_TSE.pdf) | — |
| 121 | 13843 | `p360-13843-1-0-1deed68128cd` | Action | Governador · AM | 2026-07-10 | AM-00163/2026 | 4 | 6 | 2 | 30 · 21 · 21 · 7 · 4 | [PDF](https://static.poder360.com.br/uploads/2026/07/V4_Action_Pesquisa-de-Opiniao-Eleitoral_Amazonas_Julho_AM00163-2026.pdf?) | — |
| 122 | 13681 | `p360-13681-1-0-9c77bbf55fb6` | Direto ao Ponto Pesquisas | Senado · AM | 2026-06-20 | AM-08042/2026 | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/07/direto-ao-ponto-pesquisas-AM-23Jun2026.pdf) | — |
| 123 | 13594 | `p360-13594-1-1-0b62faf38d68` | Quaest | Governador · RJ | 2026-07-25 | RJ-02671/2026 | 6 | 9 | 3 | 38 · 10 · 10 · 2 · 1 · 1 · 1 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/07/pesquisa-governo-rj-quaest-27jul2026.pdf) | — |
| 124 | 13703 | `p360-13703-1-0-30cf0961fc9f` | Prefab Future | Governador · RJ | 2026-07-29 | RJ-02770/2026 | 6 | 11 | 5 | 34,5 · 2,8 · 1,8 · 1 · 1 · 0,8 · 0,5 | [PDF](https://static.poder360.com.br/uploads/2026/08/PrefabEstadualImprensa2026-1.pdf) | — |
| 125 | 13672 | `p360-13672-1-0-aac1b7b8b511` | Paraná Pesquisas | Governador · RJ | 2026-07-30 | RJ-09303/2026 | 6 | 10 | 4 | 3,4 · 3,4 · 1,9 · 0,7 | [PDF](https://static.poder360.com.br/uploads/2026/07/RJ_Jul26.pdf) | — |
| 126 | 13673 | `p360-13673-1-0-efa30de6998e` | Paraná Pesquisas | Senado · RJ | 2026-07-30 | RJ-09303/2026 | 9 | 11 | 2 | 3,1 | [PDF](https://static.poder360.com.br/uploads/2026/07/RJ_Jul26.pdf) | — |
| 127 | 13400 | `p360-13400-1-0-5dcd18d04e85` | Quaest | Senado · RJ | 2026-04-25 | RJ-00613/2026 | 9 | 11 | 2 | 3 · 0 | [PDF](https://static.poder360.com.br/2026/04/GENIALQUAESTRIOABR26.pdf) | — |
| 128 | 13413 | `p360-13413-1-0-71ca78268712` | Paraná Pesquisas | Governador · RJ | 2026-04-23 | RJ-04997/2026 | 6 | 7 | 1 | 2,8 · 0,7 | [PDF](https://static.poder360.com.br/2026/04/RJ_Abr26.pdf?_gl=1*16cu8gx*_ga*ODY2OTQ5MDcwLjE3NzI1NzQ3MjU.*_ga_HGJJJTZ4BN*czE3Nzc5MjU4MzMkbzYkZzEkdDE3Nzc5MzE2MjUkajYwJGwwJGgw) | — |
| 129 | 13414 | `p360-13414-1-0-683ad48102f8` | Paraná Pesquisas | Senado · RJ | 2026-04-23 | RJ-04997/2026 | 6 | 7 | 1 | 2,5 | [PDF](https://static.poder360.com.br/2026/04/RJ_Abr26.pdf?_gl=1*16cu8gx*_ga*ODY2OTQ5MDcwLjE3NzI1NzQ3MjU.*_ga_HGJJJTZ4BN*czE3Nzc5MjU4MzMkbzYkZzEkdDE3Nzc5MzE2MjUkajYwJGwwJGgw) | — |
| 130 | 13562 | `p360-13562-1-0-f574a8339e55` | Prefab Future | Governador · RJ | 2026-07-02 | RJ-05681/2026 | 7 | 10 | 3 | 1,2 | [PDF](https://static.poder360.com.br/uploads/2026/07/PrefabQuantiEstadualJulho2026_Imprensa.pdf) | — |
| 131 | 13412 | `p360-13412-1-0-fdf2e89819f5` | Paraná Pesquisas | Presidente · RJ | 2026-04-23 | BR-01920/2026 | 8 | 9 | 1 | 1,2 | [PDF](https://static.poder360.com.br/2026/04/Parana-Pesquisas-RJ-Abr26.pdf) | — |
| 132 | 13619 | `p360-13619-1-0-705de5a958dd` | Real Time Big Data | Senado · RJ | 2026-07-27 | RJ-03487/2026 | 8 | 9 | 1 | 1 | [PDF](https://static.poder360.com.br/uploads/2026/07/realtime-big-data-governo-rj-28jul26.pdf) | — |
| 133 | 13399 | `p360-13399-1-0-9461dbb71079` | Quaest | Governador · RJ | 2026-04-25 | RJ-00613/2026 | 8 | 10 | 2 | 1 · 0 | [PDF](https://static.poder360.com.br/2026/04/GENIALQUAESTRIOABR26.pdf) | — |
| 134 | 13564 | `p360-13564-1-0-15b710b28ec7` | Prefab Future | Presidente · RJ | 2026-07-02 | RJ-05681/2026 | 9 | 11 | 2 | 0,8 · 0,3 | [PDF](https://static.poder360.com.br/uploads/2026/07/PrefabQuantiEstadualJulho2026_Imprensa.pdf) | — |
| 135 | 13558 | `p360-13558-1-0-771bb3541ce4` | Paraná Pesquisas | Presidente · RJ | 2026-07-10 | BR-05371/2026 | 10 | 11 | 1 | 0,6 | [PDF](https://static.poder360.com.br/uploads/2026/07/pesquisa-paranapesquisa-rio-de-janeiro-2jul2026.pdf) | — |
| 136 | 13620 | `p360-13620-1-0-77861bcbc672` | Real Time Big Data | Presidente · RJ | 2026-07-27 | BR-06074/2026 | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/07/realtimebigdata-presidencial-rj-28jul26.pdf) | — |
| 137 | 13420 | `p360-13420-1-0-2890f62a064a` | Quaest | Presidente · RJ | 2026-04-28 | BR-06207/2026 | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/quaest-banco-genial-pesquisas-estaduais.pdf) | — |
| 138 | 13015 | `p360-13015-1-0-36c9687a6fe9` | AtlasIntel | Governador · RJ | 2025-08-29 |  | 4 | 5 | 1 | — | [PDF](https://static.poder360.com.br/2025/09/Atlas-RJ-pesquisa-ago2025-1.pdf) | — |
| 139 | 13016 | `p360-13016-1-0-adb9dee204a6` | AtlasIntel | Senado · RJ | 2025-08-29 |  | 6 | 7 | 1 | — | [PDF](https://static.poder360.com.br/2025/09/Atlas-RJ-pesquisa-ago2025-1.pdf) | — |
| 140 | 13017 | `p360-13017-1-0-08aa0555c335` | AtlasIntel | Presidente · RJ | 2025-08-29 |  | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/2025/09/Atlas-RJ-pesquisa-ago2025-1.pdf) | — |
| 141 | 13800 | `p360-13800-1-0-fe882df45167` | Instituto Travessia | Presidente · AC | 2026-08-06 | BR-03113/2026 | 3 | 6 | 3 | 50 · 5 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-presidencial-geral-Acre-Travessia-6ago2026.pdf) | — |
| 142 | 13266 | `p360-13266-1-0-5a901d18141a` | Data Control | Presidente · AC | 2026-02-03 | BR-01513/2026|AC-02699/2026 | 4 | 7 | 3 | 47,5 · 5,8 · 3,1 | [PDF](https://static.poder360.com.br/2026/02/pesquisa-datacontrol-acre-governador-8.fev_.2026pdf.pdf) | — |
| 143 | 13259 | `p360-13259-1-0-9650bc267257` | Instituto Phoenix | Presidente · AC | 2026-02-05 | BR-07407/2026|AC-00770/2026 | 7 | 8 | 1 | 37,2 | [PDF](https://static.poder360.com.br/2026/02/pesquisa-institutophoenix-acre-presidente-6.fev_.2026.pdf) | — |
| 144 | 13592 | `p360-13592-1-0-47ce5652d4ee` | Real Time Big Data | Presidente · AC | 2026-07-25 | BR-08086/2026 | 1 | 10 | 9 | 30 · 5 · 3 · 3 · 2 · 1 · 1 · 1 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/07/pesquisa-realtimebigdata-presidencial-acre-27jul26.pdf) | — |
| 145 | 13486 | `p360-13486-1-0-a5d1b215e1ff` | Paraná Pesquisas | Governador · AC | 2026-06-02 | AC-01182/2026 | 4 | 5 | 1 | 3,8 · 0,8 | [PDF](https://static.poder360.com.br/2026/06/AC_Jun26.pdf) | — |
| 146 | 13487 | `p360-13487-1-0-d187ed67ed51` | Paraná Pesquisas | Senado · AC | 2026-06-02 | AC-01182/2026 | 8 | 9 | 1 | 1,6 | [PDF](https://static.poder360.com.br/2026/06/AC_Jun26.pdf) | — |
| 147 | 13686 | `p360-13686-1-0-c89e29bb65fe` | AtlasIntel | Presidente · AC | 2026-08-02 | BR-09332/2026 | 6 | 7 | 1 | 1,1 | [PDF](https://static.poder360.com.br/uploads/2026/08/Pesquisa-Atlas_AC24-Horas-Eleicoes-Acre-2026-260803-1.pdf) | — |
| 148 | 13260 | `p360-13260-1-0-59a0947dae32` | Instituto Phoenix | Governador · AC | 2026-02-05 | BR-07407/2026|AC-00770/2026 | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/2026/02/pesquisa-institutophoenix-acre-governador-6.fev_.2026.pdf) | — |
| 149 | 13660 | `p360-13660-1-0-33a0464253f2` | Quaest | Governador · RS | 2026-07-28 | RS-04790/2026 | 4 | 7 | 3 | 22 · 3 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-Genial-Quaest-RS-jul-2026.pdf) | — |
| 150 | 13367 | `p360-13367-1-0-47f6f8d453d4` | 100% Cidades Participações | Senado · RS | 2026-02-10 | RS-03300/2026 | 5 | 6 | 1 | 9,9 | [PDF](https://static.poder360.com.br/2026/04/pesquisa-futura-riograndedosul-fev-2026.pdf) | — |
| 151 | 13403 | `p360-13403-1-0-0fd90a940fb2` | Quaest | Senado · RS | 2026-04-28 | RS-03000/2026 | 6 | 7 | 1 | 7 · 2 · 1 | [PDF](https://static.poder360.com.br/2026/04/Pesquisa-GenialQuaest-RS-Abr-2026.pdf?_gl=1*cdzfki*_ga*MTM5NjIyMzY1My4xNzc2OTY4MzI4*_ga_HGJJJTZ4BN*czE3Nzc2NjM0MzUkbzIxJGcxJHQxNzc3NjY3OTY5JGo2MCRsMCRoMA..) | — |
| 152 | 13627 | `p360-13627-1-0-ca8002e69191` | Paraná Pesquisas | Governador · RS | 2026-07-19 | RS-09313/2026 | 4 | 6 | 2 | 4,7 · 0,9 | [PDF](https://static.poder360.com.br/uploads/2026/07/parana-pesquisa-RS-22jul2026-1.pdf) | — |
| 153 | 13366 | `p360-13366-1-0-43ec73a1e4e1` | 100% Cidades Participações | Governador · RS | 2026-02-10 | RS-03300/2026 | 5 | 7 | 2 | 3,9 · 0,8 | [PDF](https://static.poder360.com.br/2026/04/pesquisa-futura-riograndedosul-fev-2026.pdf) | — |
| 154 | 13402 | `p360-13402-1-0-982a0e953af1` | Quaest | Governador · RS | 2026-04-28 | RS-03000/2026 | 4 | 5 | 1 | 2 | [PDF](https://static.poder360.com.br/2026/04/Pesquisa-GenialQuaest-RS-Abr-2026.pdf?_gl=1*cdzfki*_ga*MTM5NjIyMzY1My4xNzc2OTY4MzI4*_ga_HGJJJTZ4BN*czE3Nzc2NjM0MzUkbzIxJGcxJHQxNzc3NjY3OTY5JGo2MCRsMCRoMA..) | — |
| 155 | 13542 | `p360-13542-1-0-192c1405ea6d` | Real Time Big Data | Presidente · RS | 2026-06-22 | BR-09044/2026 | 8 | 9 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/06/Rio-Grande-do-Sul_PresidenteBR-090442026.pdf) | — |
| 156 | 13428 | `p360-13428-1-0-4ed3fba3becd` | Quaest | Presidente · RS | 2026-04-28 | BR-06915/2026 | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/quaest-banco-genial-pesquisas-estaduais.pdf) | — |
| 157 | 13724 | `p360-13724-1-0-ee96829f91ad` | DataTrends | Governador · PB | 2026-07-29 | PB-09547/2026 | 3 | 4 | 1 | 27 · 17 · 2 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-datatrend-governador-pb-1ago2026.pdf) | — |
| 158 | 13764 | `p360-13764-1-0-b25152c9e5f1` | Seta | Governador · PB | 2026-07-27 | PB-01909/2026 | 5 | 7 | 2 | 19,3 · 0,1 | [PDF](https://static.poder360.com.br/uploads/2026/08/datatrends-gov-pb-7ago2026.pdf) | — |
| 159 | 13346 | `p360-13346-1-0-d9a2ec24339e` | Anova | Governador · PB | 2026-03-21 | PB-00155/2026 | 4 | 5 | 1 | 12,6 | [PDF](https://static.poder360.com.br/2026/04/Anova_Pesquisa_MAR2026.pdf) | — |
| 160 | 13677 | `p360-13677-1-0-e59af906e1f8` | DataTrends | Senado · PB | 2026-06-09 | PB-09578/2026 | 6 | 8 | 2 | 2 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/07/Captura-de-Tela-2026-07-31-as-18.12.32.png) | — |
| 161 | 13485 | `p360-13485-1-0-5e8bd535c8f7` | Real Time Big Data | Senado · PB | 2026-05-26 | PB-03748/2026 | 6 | 8 | 2 | 2 · 1 | [PDF](https://static.poder360.com.br/2026/05/Paraiba_Maio_Governo_PB-037482026.pdf) | — |
| 162 | 13483 | `p360-13483-1-0-90ddc6690c40` | Real Time Big Data | Presidente · PB | 2026-05-26 | BR-03562/2026 | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/Paraiba_Maio_Presidente_BR-035622026.pdf) | — |
| 163 | 13644 | `p360-13644-1-1-9c0dde5039b0` | Quaest | Senado · BA | 2026-07-27 | BA-02331/2026 | 3 | 6 | 3 | 16 · 4 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/quaest-ba-29jul2026.pdf) | — |
| 164 | 13552 | `p360-13552-1-0-4d1697dd339c` | Paraná Pesquisas | Senado · BA | 2026-06-30 | BA-04848/2026 | 5 | 6 | 1 | 5,3 | [PDF](https://static.poder360.com.br/uploads/2026/07/BA_Jun26.pdf) | — |
| 165 | 13693 | `p360-13693-1-0-d76147a0571b` | 100% Cidades Participações | Senado · BA | 2026-07-25 | BA-07924/2026 | 5 | 7 | 2 | 0,6 · 0,4 | [PDF](https://static.poder360.com.br/uploads/2026/08/Relatorio_BA_2026jul_Poder-360.pdf) | — |
| 166 | 13643 | `p360-13643-1-0-8dab9bb49987` | Quaest | Governador · BA | 2026-07-27 | BA-02331/2026 | 4 | 5 | 1 | 0 | [PDF](https://static.poder360.com.br/uploads/2026/07/quaest-ba-29jul2026.pdf) | — |
| 167 | 13425 | `p360-13425-1-0-c8518ff65735` | Quaest | Presidente · BA | 2026-04-28 | BR-08703/2026 | 5 | 6 | 1 | — | [PDF](https://static.poder360.com.br/2026/05/quaest-banco-genial-pesquisas-estaduais.pdf) | — |
| 168 | 13304 | `p360-13304-1-0-21e5651c1dd8` | Instituto TML | Governador · BA | 2026-02-21 | BA-07735/2026 | 4 | 5 | 1 | — | [PDF](https://static.poder360.com.br/2026/02/pesquisa-institutotml-bahia-governador-24.fev_.2026.pdf) | — |
| 169 | 13304 | `p360-13304-2-0-3274df1cb920` | Instituto TML | Governador · BA · 2º turno | 2026-02-21 | BA-07735/2026 | 2 | 3 | 1 | — | [PDF](https://static.poder360.com.br/2026/02/pesquisa-institutotml-bahia-governador-24.fev_.2026.pdf) | — |
| 170 | 13305 | `p360-13305-1-0-2abb4fd39298` | Instituto TML | Senado · BA | 2026-02-21 | BA-07735/2026 | 6 | 7 | 1 | — | [PDF](https://static.poder360.com.br/2026/02/pesquisa-institutotml-bahia-senador-24.fev_.2026.pdf) | — |
| 171 | 13779 | `p360-13779-1-0-6ceaec24fa8a` | Credibilidade | Governador · PI | 2026-07-19 | PI-03217/2026 | 1 | 6 | 5 | 66,85 · 0 · 0 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-intitutoCredibilidade-PI-18-19jul2026.pdf) | — |
| 172 | 13768 | `p360-13768-1-0-53bd2ae5add8` | Intenção Instituto de Pesquisa | Governador · PI | 2026-07-24 | PI-03190/2026 | 1 | 3 | 2 | 54 · 0,33 | [PDF](https://static.poder360.com.br/uploads/2026/08/intencao-pesquisa-vilanovapiaui-PI-22-24jul2026.pdf) | — |
| 173 | 13328 | `p360-13328-2-3-2e6b14141876` | AtlasIntel | Governador · PI · 2º turno | 2026-03-15 | PI-06908/2026 | 2 | 3 | 1 | 22 | [PDF](https://static.poder360.com.br/2026/03/Pesquisa-AtlasIntel-Eleicoes-Piaui-2026-260317-1.pdf) | — |
| 174 | 13328 | `p360-13328-2-1-9e640bda833f` | AtlasIntel | Governador · PI · 2º turno | 2026-03-15 | PI-06908/2026 | 2 | 3 | 1 | 16 | [PDF](https://static.poder360.com.br/2026/03/Pesquisa-AtlasIntel-Eleicoes-Piaui-2026-260317-1.pdf) | — |
| 175 | 13328 | `p360-13328-2-2-b6154867f71f` | AtlasIntel | Governador · PI · 2º turno | 2026-03-15 | PI-06908/2026 | 2 | 3 | 1 | 16 | [PDF](https://static.poder360.com.br/2026/03/Pesquisa-AtlasIntel-Eleicoes-Piaui-2026-260317-1.pdf) | — |
| 176 | 13823 | `p360-13823-1-0-979d6079d167` | Real Time Big Data | Senado · MT | 2026-08-11 | MT-04560/2026 | 7 | 9 | 2 | 13 · 4 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-realtimebigdata-governo-mt-12ago2026.pdf) | — |
| 177 | 13328 | `p360-13328-2-0-8db3759c8463` | AtlasIntel | Governador · PI · 2º turno | 2026-03-15 | PI-06908/2026 | 2 | 3 | 1 | 6 | [PDF](https://static.poder360.com.br/2026/03/Pesquisa-AtlasIntel-Eleicoes-Piaui-2026-260317-1.pdf) | — |
| 178 | 13463 | `p360-13463-1-1-6e157cbe5dfd` | AtlasIntel | Senado · PI | 2026-05-18 | PI-05475/2026 | 6 | 9 | 3 | 2,8 | [PDF](https://static.poder360.com.br/2026/05/Pesquisa-Atlas-Eleicoes-Piaui-2026-260519.pdf) | — |
| 179 | 13605 | `p360-13605-1-0-2cf364165846` | AtlasIntel | Governador · PI | 2026-07-20 | PI-05787/2026 | 8 | 11 | 3 | 2,6 · 0,3 · 0,1 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-ATLAS_MEIONORTE-Piaui-Eleicoes-2026.pdf) | — |
| 180 | 13841 | `p360-13841-1-0-211ebb5bf20c` | Opinar | Senado · PI | 0006-08-06 | PI-02052/2026 | 8 | 18 | 10 | 1,17 · 1 · 0,83 · 0,33 · 0,33 · 0,25 · 0,25 · 0,17 · 0,17 · 0,08 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisas-opinar-senado-ce-14ago2026.pdf) | — |
| 181 | 13720 | `p360-13720-1-0-827f1230a43c` | Data AZ | Governador · PI | 2026-07-27 | PI-07910/2026 | 6 | 10 | 4 | 0,83 · 0,25 · 0 · 0 | [PDF](https://static.poder360.com.br/uploads/2026/08/PI-079102026.pdf) | — |
| 182 | 13606 | `p360-13606-1-0-cd009d97ba9c` | AtlasIntel | Presidente · PI | 2026-07-20 | BR-04468/2026 | 7 | 8 | 1 | 0,8 | [PDF](https://static.poder360.com.br/uploads/2026/07/Pesquisa-ATLAS_MEIONORTE-Piaui-Eleicoes-2026.pdf) | — |
| 183 | 13462 | `p360-13462-1-0-c51669dc7b60` | AtlasIntel | Governador · PI | 2026-05-18 | PI-05475/2026 | 7 | 8 | 1 | 0,2 | [PDF]( https://static.poder360.com.br/2026/05/Pesquisa-Atlas-Eleicoes-Piaui-2026-260519.pdf) | — |
| 184 | 13536 | `p360-13536-1-0-704c2dfa2c5f` | AtlasIntel | Presidente · PI | 2026-06-21 | BR-08344/2026 | 7 | 8 | 1 | 0,1 | [PDF](https://static.poder360.com.br/uploads/2026/06/Pesquisa-Atlas-Piaui-Eleicoes-2026.pdf) | — |
| 185 | 13649 | `p360-13649-1-0-8db428980a09` | Real Time Big Data | Governador · PI | 2026-07-13 | PI-06473/2026 | 4 | 5 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/07/pesquisa-realtime-governo-piaui-14jul26.pdf) | — |
| 186 | 13828 | `p360-13828-1-0-a6f9485ef65d` | Ranking Brasil | Governador · MS | 2026-08-12 | MS-09590/2026 | 7 | 8 | 1 | 46,4 · 0,1 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-ranking-brasil-governador-ms-13ago2026.pdf) | — |
| 187 | 13840 | `p360-13840-1-0-b13300278e83` | Veritá | Governador · MA | 2026-08-11 | MA-01632/2026 | 2 | 10 | 8 | 39,1 · 4,3 · 3,3 · 2,6 · 1,6 · 0,9 · 0,4 · 0,3 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-verita-governador-maranhao-13ago2026.png) | — |
| 188 | 13793 | `p360-13793-1-0-6daa1bef1f51` | Ranking Brasil | Governador · MS | 2026-07-21 | MS-05958/2026 | 6 | 7 | 1 | 36 | [PDF](https://static.poder360.com.br/uploads/2026/08/ranking-ms-gov-7ago2026.pdf) | — |
| 189 | 13436 | `p360-13436-2-5-2b0035057ace` | Real Time Big Data | Governador · MS · 2º turno | 2026-05-11 | MS-06412/2026 | 2 | 3 | 1 | 15 | [PDF](https://static.poder360.com.br/2026/05/Mato-Grosso-do-Sul-MS-064122026-MAI26.pdf) | — |
| 190 | 13580 | `p360-13580-1-0-b5ebcaec49ff` | Real Time Big Data | Senado · MA | 2026-07-07 | MA-04311/2026 | 10 | 11 | 1 | 14 | [PDF](https://static.poder360.com.br/uploads/2026/07/Maranhao-MA-04311_2026-Jul-26-1.pdf) | — |
| 191 | 13362 | `p360-13362-1-0-51410fe81eba` | Ranking Brasil | Senado · MS | 2026-03-20 | MS-02346/2026 | 9 | 10 | 1 | 0,8 | [PDF](https://static.poder360.com.br/2026/04/MAR2026-Instituto-Ranking-Pesquisa.pdf) | — |
| 192 | 13581 | `p360-13581-1-0-53fd495a7732` | Real Time Big Data | Presidente · MA | 2026-07-07 | BR-04169/2026 | 9 | 10 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/07/Maranhao-BR-04169_2026_Jul26.pdf) | — |
| 193 | 13776 | `p360-13776-1-0-578c21ab93c5` | Inor - Instituto Nordeste | Governador · SE | 2026-07-29 | SE-00281/2026 | 2 | 5 | 3 | 7,01 · 0,28 · 0,19 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-INOR-governo-SE-jul2026.pdf) | — |
| 194 | 13687 | `p360-13687-1-0-22e85690d5f0` | Real Time Big Data | Senado · SE | 2026-08-01 | SE-07327/2026 | 9 | 10 | 1 | 5 | [PDF](https://static.poder360.com.br/uploads/2026/08/Sergipe-SE-07327_2026_Ago26-1.pdf) | — |
| 195 | 13688 | `p360-13688-1-0-134f7a68832e` | Real Time Big Data | Governador · SE | 2026-08-01 | SE-07327/2026 | 4 | 5 | 1 | 1 | [PDF](https://static.poder360.com.br/uploads/2026/08/Sergipe-SE-07327_2026_Ago26-1.pdf) | — |
| 196 | 13712 | `p360-13712-2-0-084d53fb333d` | Opinião Consultoria | Governador · DF · 2º turno | 2026-08-01 | DF-04077/2026 | 2 | 6 | 4 | 53,8 · 50,9 · 28,8 · 28,6 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-opiniao-consultoria-governador-1ago2026.pdf) | — |
| 197 | 13661 | `p360-13661-1-0-7fc5402225f9` | Instituto Gazeta de Pesquisas | Presidente · DF | 2026-07-19 | BR-07290/2026 | 6 | 8 | 2 | 31,1 · 26,2 | [PDF](https://static.poder360.com.br/uploads/2026/07/igape-presidente-df-21jul2026.png) | — |
| 198 | 13471 | `p360-13471-1-1-65803707839d` | Veritá | Governador · DF | 2026-05-10 | DF-08303/2026 | 6 | 7 | 1 | 19,4 · 16,2 · 2,8 | [PDF](https://static.poder360.com.br/2026/05/pesquisa-verita-maio-distritofederal.pdf) | — |
| 199 | 13736 | `p360-13736-1-0-7d1aa2a25e29` | Brada Comunicação | Senado · DF | 2026-07-31 | DF-09433/2026 | 5 | 9 | 4 | 16,6 · 16,3 · 6 · 3,4 | [PDF](https://static.poder360.com.br/uploads/2026/08/brada-comunicacao-df-presidente-6ago2026.pdf) | — |
| 200 | 13712 | `p360-13712-1-0-cb2bb1d07ecb` | Opinião Consultoria | Governador · DF | 2026-08-01 | DF-04077/2026 | 4 | 8 | 4 | 4,3 · 0,9 · 0,8 · 0,5 | [PDF](https://static.poder360.com.br/uploads/2026/08/pesquisa-opiniao-consultoria-governador-1ago2026.pdf) | — |
| 201 | 13737 | `p360-13737-1-0-1d4d3a3a380b` | Brada Comunicação | Governador · DF | 2026-07-31 | DF-09433/2026 | 5 | 7 | 2 | 2,2 · 1,1 | [PDF](https://static.poder360.com.br/uploads/2026/08/brada-comunicacao-df-presidente-6ago2026.pdf) | — |
| 202 | 13557 | `p360-13557-1-0-78fa420aa277` | Instituto França | Presidente · DF | 2026-06-23 | BR-06776/2026 | 9 | 10 | 1 | 0,3 | [PDF](https://static.poder360.com.br/uploads/2026/07/PESQUISA-FRANCA_BRASILIA_JUNHO_TSE.pdf) | — |
| 203 | 13738 | `p360-13738-1-0-143ea2eff113` | Brasmarket | Senado · TO | 2026-07-31 | TO-02848/2026 | 5 | 8 | 3 | 12,4 · 9,4 · 7,9 | [PDF](https://static.poder360.com.br/uploads/2026/08/brasmarket-to-6ago2026.pdf) | — |
| 204 | 13621 | `p360-13621-1-0-44bfd9db6545` | Paraná Pesquisas | Governador · TO | 2026-07-24 | TO-06833/2026 | 4 | 5 | 1 | 5,8 · 0,8 | [PDF](https://static.poder360.com.br/uploads/2026/07/TO_Jul26.pdf) | — |
| 205 | 13704 | `p360-13704-1-0-1c7bb1f49a28` | Voz e Pesquisa | Senado · TO | 2025-08-03 | TO-01056/2026 | 8 | 12 | 4 | 5 · 4 · 3 · 2 | [PDF](https://static.poder360.com.br/uploads/2026/08/Senador-TO-Voz-e-Pesquisa-Jul-Ago.pdf) | — |
| 206 | 13623 | `p360-13623-1-0-8697242c8e50` | Paraná Pesquisas | Senado · TO | 2026-07-24 | TO-06833/2026 | 9 | 11 | 2 | 4,2 · 1,2 | [PDF](https://static.poder360.com.br/uploads/2026/07/TO_Jul26.pdf) | — |
| 207 | 13702 | `p360-13702-1-0-4b88ed779d7c` | Voz e Pesquisa | Governador · TO | 2026-08-03 | TO-01056/2026 | 4 | 5 | 1 | 2 | [PDF](https://static.poder360.com.br/uploads/2026/08/Pesquisa-Instituto-Voe-TO-agosto.pdf) | — |
| 208 | 13537 | `p360-13537-1-0-56c10942bfaf` | Real Time Big Data | Governador · TO | 2026-06-18 | TO-05379/2026 | 5 | 6 | 1 | 1 | [PDF](https://static.poder360.com.br/uploads/2026/06/Tocantins-TO-053792026-Jun_26.pdf) | — |
| 209 | 13539 | `p360-13539-1-0-accc6795ac84` | Real Time Big Data | Presidente · TO | 2026-06-18 | BR-06685/2026 | 7 | 8 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/06/Tocantins-BR-066852026-Jun_26.pdf) | — |
| 210 | 13814 | `p360-13814-1-0-86ecc9a50026` | TDL Pesquisa & Marketing | Governador · AL | 2026-07-17 | BR-00994/2026 | 1 | 3 | 2 | 50 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/08/Governador-AL-jul-TDL.pdf) | — |
| 211 | 13682 | `p360-13682-1-0-b5d782de25cf` | Correio do Povo | Presidente · SC | 2026-07-23 | BR-05953/2026 | 5 | 6 | 1 | 25,4 | [PDF](https://static.poder360.com.br/uploads/2026/07/Correio-do-Povo-Presidente-SC-Julho.pdf) | — |
| 212 | 13434 | `p360-13434-1-0-0a05ebd15aec` | 100% Cidades Participações | Presidente · SC | 2026-04-25 | BR-01971/2026 | 8 | 9 | 1 | 0,3 | [PDF](https://static.poder360.com.br/2026/05/pesquisa-futura-apex-santacatarina-presidente-abr2026.pdf) | — |
| 213 | 13565 | `p360-13565-1-0-c2d7d47cc920` | Paraná Pesquisas | Governador · AL | 2026-07-01 | AL-04491/2026 | 2 | 3 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/07/AL_Jul26-1.pdf) | — |
| 214 | 13565 | `p360-13565-2-0-b25fbf615b7d` | Paraná Pesquisas | Governador · AL · 2º turno | 2026-07-01 | AL-04491/2026 | 1 | 2 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/07/AL_Jul26-1.pdf) | — |
| 215 | 13550 | `p360-13550-2-0-790d66a6a80e` | TDL Pesquisa & Marketing | Governador · AL · 2º turno | 2026-06-22 | AL-04608/2026 | 1 | 2 | 1 | — | [PDF](https://static.poder360.com.br/uploads/2026/06/pesquisa-tdl-alagados-26jun2026.pdf) | — |
| 216 | 13306 | `p360-13306-1-0-5cfc90a58d0c` | Instituto Falpe | Governador · AL | 2026-03-01 | AL-05611/2026 | 1 | 2 | 1 | — | [PDF](https://static.poder360.com.br/2026/03/regiao-metropolitana-de-maceio-1pdf.pdf) | — |
| 217 | 13196 | `p360-13196-1-0-afabde22fcfe` | TDL Pesquisa & Marketing | Governador · AL | 2026-01-25 | AL-03974/2026 | 1 | 2 | 1 | — | [PDF](https://static.poder360.com.br/2026/01/pesquisa-tdl-alagoas-presidente-29.jan_.2026.pdf) | — |
| 218 | 13066 | `p360-13066-1-0-58a2a0f92501` | Real Time Big Data | Governador · AL | 2025-11-24 |  | 1 | 2 | 1 | — | [PDF](https://static.poder360.com.br/2025/12/pesquisa-realtimebigdata-alagoas-24nov2025.pdf) | — |
| 219 | 13641 | `p360-13641-1-0-cc432e66fe0a` | Real Time Big Data | Senado · RO | 2026-07-15 | RO-04369/2026 | 6 | 11 | 5 | 14 · 4 · 3 · 3 · 1 · 1 | [PDF](https://static.poder360.com.br/uploads/2026/07/real-time-big-data-senador-rondonia-16jul2026.png) | — |
| 220 | 13187 | `p360-13187-1-0-d07b54ace17e` | Instituto Phoenix | Presidente · RO | 2026-01-20 | RO-00828/2026 | 6 | 8 | 2 | 12,9 | [PDF](https://static.poder360.com.br/2026/01/pesquisa-institutophoenix-rondonia-20.jan_.2026presidente-.pdf) | — |
| 221 | 13598 | `p360-13598-1-0-0ea7a8591e12` | Real Time Big Data | Presidente · AP | 2026-07-23 | BR-05542/2026 | 6 | 8 | 2 | 36 | [PDF](https://static.poder360.com.br/uploads/2026/07/realtime-amapa-nacional-24jul.pdf) | — |
| 222 | 13785 | `p360-13785-1-0-0bd5e821e064` | Paraná Pesquisas | Senado · AP | 2026-07-20 | AP-02651/2026 | 6 | 8 | 2 | 13,6 · 12,3 · 5,6 · 2,5 | [PDF](https://static.poder360.com.br/uploads/2026/08/GovernadorSenador-AP-1o-e-2o-turno-Jul.pdf) | — |
| 223 | 13513 | `p360-13513-1-0-fbbaa19b6765` | Paraná Pesquisas | Governador · AP | 2026-06-13 | AP-02175/2026 | 2 | 3 | 1 | 0,7 | [PDF](https://static.poder360.com.br/uploads/2026/06/AP_Jun26-1.pdf) | — |
| 224 | 13784 | `p360-13784-1-0-27451588aab9` | Paraná Pesquisas | Governador · AP | 2026-07-20 | AP-02651/2026 | 2 | 3 | 1 | 0,5 | [PDF](https://static.poder360.com.br/uploads/2026/08/GovernadorSenador-AP-1o-e-2o-turno-Jul.pdf) | — |

## Indeterminadas — a fronteira de cenário não é demonstrável

O `v1` achata os cenários numa lista só. Posição resolve quase tudo: o que está entre dois
nomes do mesmo bloco, antes do primeiro nome do primeiro bloco ou depois do último nome do
último é certo. Na FRONTEIRA entre dois blocos a divisão sai da ordenação da fonte (cada
bloco vem em percentual não crescente), conferida nas linhas nomeadas dos dois lados. Quando
mais de uma divisão fecha — ou nenhuma —, a linha não vai para lado nenhum: recusar
ambiguidade é §4, e o percentual fica registrado aqui para o curador decidir no PDF.

| id | instituto | disputa | campo | % sem cenário provável |
|---|---|---|---|---|
| 13064 | Real Time Big Data | Governador · MS | 2025-11-28 | 61 |
| 13119 | Quaest | Presidente · Brasil | 2025-11-09 | 35 |
| 13173 | AtlasIntel | Presidente · Brasil | 2026-01-20 | 49 · 49 |
| 13181 | Paraná Pesquisas | Governador · PR | 2026-01-22 | 37,8 |
| 13193 | Futura Inteligência | Governador · SP | 2026-01-23 | 29,2 |
| 13193 | Futura Inteligência | Governador · SP · 2º turno | 2026-01-23 | 2,1 |
| 13215 | Lucro Ativo | Governador · TO | 2026-01-27 | 57,19 |
| 13226 | Instituto Ideia | Presidente · Brasil | 2026-02-02 | 40 |
| 13228 | Real Time Big Data | Senado · CE | 2026-02-03 | 28 |
| 13240 | Datafolha | Presidente · PE · 2º turno | 2026-02-05 | 31 |
| 13247 | Futura Inteligência | Presidente · RJ | 2026-02-02 | 40,7 · 39,5 |
| 13247 | Futura Inteligência | Presidente · RJ · 2º turno | 2026-02-02 | 47 |
| 13248 | Futura Inteligência | Governador · RJ | 2026-02-02 | 50,5 |
| 13248 | Futura Inteligência | Governador · RJ · 2º turno | 2026-02-02 | 65,8 · 55,9 |
| 13250 | Futura Inteligência | Presidente · Brasil | 2026-02-07 | 38,7 |
| 13254 | Real Time Big Data | Senado · PE | 2026-02-10 | 24 |
| 13270 | Ipespe | Governador · SP | 2026-02-09 | 47 |
| 13279 | Direct Pesquisas | Senado · GO | 2026-02-06 | 11,8 |
| 13291 | Portal Goiás | Senado · GO | 2026-02-03 | 18,2 |
| 13292 | Paraná Pesquisas | Senado · SP | 2026-02-10 | 36,1 |
| 13299 | Instituto França | Governador · SE · 2º turno | 2026-02-07 | 52,98 |
| 13313 | AtlasIntel | Presidente · Brasil | 2026-02-24 | 45,3 · 45,1 |
| 13314 | Real Time Big Data | Presidente · Brasil · 2º turno | 2026-03-02 | 42 |
| 13323 | Real Time Big Data | Presidente · RJ | 2026-03-10 | 41 |
| 13345 | Quaest | Governador · ES · 2º turno | 2026-03-25 | 42 |
| 13350 | Real Time Big Data | Presidente · MT | 2026-03-23 | 45 |
| 13385 | Gerp | Governador · GO | 2026-04-10 | 43 |
| 13388 | Gerp | Senado · GO | 2026-04-10 | 23 |
| 13389 | Paraná Pesquisas | Governador · PR | 2026-04-12 | 50,9 |
| 13410 | Quaest | Governador · PA | 2026-04-25 | 24 |
| 13417 | Instituto Ideia | Presidente · Brasil · 2º turno | 2026-05-05 | 44,7 |
| 13419 | Quaest | Presidente · PA · 2º turno | 2026-04-28 | 43 |
| 13446 | Gerp | Senado · SP | 2026-05-15 | 28 |
| 13472 | Veritá | Senado · DF | 2026-05-10 | 16,7 · 14 · 9,7 · 5,1 |
| 13480 | Vox Brasil | Presidente · SP · 2º turno | 2026-05-28 | 42,7 |
| 13540 | Real Time Big Data | Governador · RS · 2º turno | 2026-06-22 | 45 · 42 · 30 |
| 13580 | Real Time Big Data | Senado · MA | 2026-07-07 | 14 |
| 13586 | Index Instituto de Pesquisas | Presidente · Brasil · 2º turno | 2026-07-19 | 46 |
| 13593 | Real Time Big Data | Senado · AC | 2026-07-25 | 6 · 6 · 1 |
| 13594 | Quaest | Governador · RJ | 2026-07-25 | 42 · 42 · 19 · 19 · 18 · 16 · 11 · 1 |
| 13599 | MT Dados | Governador · MT | 2026-07-21 | 26 |
| 13617 | Quaest | Senado · PE | 2026-07-26 | 21 · 21 · 20 |
| 13622 | Quaest | Governador · PA | 2026-07-25 | 25 · 23 |
| 13624 | Quaest | Senado · PA | 2026-07-25 | 23 · 21 · 21 · 15 · 15 · 14 · 12 |
| 13628 | Paraná Pesquisas | Senado · DF | 2026-07-19 | 41,6 · 30,4 |
| 13630 | Quaest | Governador · ES · 2º turno | 2026-07-13 | 46 |
| 13643 | Quaest | Governador · BA | 2026-07-27 | 39 |
| 13657 | Quaest | Presidente · GO | 2026-07-28 | 4 · 1 · 0 · 0 |
| 13659 | Quaest | Senado · CE | 2026-07-28 | 24 · 21 |
| 13660 | Quaest | Governador · RS · 2º turno | 2026-07-28 | 32 |
| 13662 | Quaest | Presidente · RS | 2026-07-28 | 1 · 0 · 0 |
| 13683 | Alfa Inteligência | Presidente · Brasil · 2º turno | 2026-07-28 | 13 · 2 |
| 13698 | Real Time Big Data | Governador · PA | 2026-08-03 | 29 · 12 · 4 |
| 13701 | Real Time Big Data | Senado · ES | 2026-07-21 | 32 · 17 · 12 · 9 |
| 13706 | Quaest | Presidente · Brasil · 2º turno | 2026-08-03 | 39 · 16 · 14 · 13 · 4 · 4 · 4 |
| 13710 | Neokemp | Senado · SC | 2026-07-24 | 23,7 |
| 13717 | Direct Pesquisas | Senado · GO | 2026-07-30 | 12,3 |
| 13736 | Brada Comunicação | Senado · DF | 2026-07-31 | 38,7 · 11,3 |
| 13738 | Brasmarket | Senado · TO | 2026-07-31 | 15,2 · 10,8 · 8,4 · 8 · 7,9 · 6,9 |
| 13770 | Intenção Instituto de Pesquisa | Senado · PI | 2026-07-24 | 15,33 · 11,67 |
| 13778 | Ipec | Senado · CE | 2026-07-26 | 24 · 24 |
| 13788 | Soluções | Senado · RN | 2026-07-25 | 12,8 · 8,8 · 7,5 |
| 13806 | Instituto Travessia | Senado · AC | 2026-08-06 | 34 · 22 · 22 · 17 · 16 · 14 · 13 · 13 · 12 · 10 · 10 · 2 · 2 |
| 13816 | Futura Inteligência | Presidente · Brasil | 2026-08-07 | 6,2 · 4,8 · 0,7 · 0,4 · 0,1 |
| 13821 | IPPI - Pesquisas e Consultorias | Senado · MA | 2026-08-10 | 34,9 |
| 13823 | Real Time Big Data | Senado · MT | 2026-08-11 | 35 · 19 |
| 13836 | consult pesquisas | Senado · RN | 2026-08-10 | 37,53 · 14,12 · 7,24 · 0,06 |
| 13839 | Enfoque | Presidente · SP · 2º turno | 2026-08-10 | 30,8 · 30,5 |

## Não conferidas — a fonte republicou outros números

Nenhum cenário que o `v2` serve hoje bate com os percentuais que o banco guarda para este
id. Não é desalinhamento entre `v1` e `v2`: é a fonte tendo mexido nos números depois da
nossa coleta (`1,6` virou `1,1`; `26,42` virou `26,4`), ou o `mergePolls` tendo guardado sob
um id `p360-` a tabela MAIS RICA da Wikipédia — que é a regra do `richerRoster`, não um
defeito. Sem cenário identificado não se afirma quantas linhas faltam **nesta pergunta**, e
por isso estas ficam FORA da conta de CURTA. O estrago abaixo é o da PESQUISA inteira.

| id | registro no banco | instituto | disputa | campo | guardadas | cenários v2 | apagadas | % apagados |
|---|---|---|---|---|---|---|---|---|
| 13624 | `p360-13624-1-0-e9c629cfdcde` | Quaest | Senado · PA | 2026-07-25 | 9 | 4 | 26 | 23 · 21 · 21 · 15 · 15 · 14 · 14 · 12 · 4 · 3 · 2 · 2 · 2 · 1 · 1 · 1 · 1 · 1 · 1 · 0 · 0 · 0 · 0 · 0 · 0 · 0 |
| 13751 | `p360-13751-1-0-2217e7339f0a` | Veritá | Senado · PR | 2026-08-01 | 6 | 1 | 22 | 24,5 · 20,5 · 12,5 · 11 · 11 · 10,2 · 7,9 · 7,6 · 7,1 · 6,9 · 6,7 · 6,4 · 6,2 · 5,4 · 5,3 · 5,2 · 1,1 · 0,6 · 0,3 · 0,3 · 0,3 · 0,3 |
| 13595 | `p360-13595-1-0-c24b5e1792c3` | Quaest | Senado · RJ | 2026-07-25 | 8 | 1 | 21 | 38 · 37 · 23 · 22 · 12 · 11 · 8 · 4 · 4 · 4 · 4 · 4 · 4 · 3 · 3 · 3 · 3 · 1 · 1 · 1 · 0 |
| 13601 | `p360-13601-1-0-aa746418ea34` | Quaest | Governador · PR | 2026-07-25 | 6 | 1 | 15 | 39 · 39 · 19 · 18 · 15 · 15 · 12 · 12 · 8 · 7 · 7 · 6 · 1 · 1 · 1 |
| 13472 | `p360-13472-1-0-2643a9f0d704` | Veritá | Senado · DF | 2026-05-10 | 7 | 3 | 12 | 24,6 · 16,7 · 14 · 9,7 · 6 · 5,6 · 5,1 · 4,6 · 4,5 · 3,5 · 3,3 · 2,8 |
| 13802 | `p360-13802-1-1-fa0b80af9da2` | Índice | Senado · PR | 2026-08-06 | 6 | 2 | 9 | 19,2 · 17,7 · 12,6 · 1,2 · 0,7 · 0,2 · 0,2 · 0,1 · 0,1 |
| 13705 | `p360-13705-1-0-c5d9c137c64a` | Instituto Ideia | Presidente · Brasil | 2026-08-03 | 10 | 1 | 8 | 35 · 5,7 · 4,7 · 4 · 1,7 · 0,3 · 0,2 · 0,1 |
| 13313 | `p360-13313-1-3-d75e013326c6` | AtlasIntel | Presidente · Brasil | 2026-02-24 | 7 | 5 | 7 | 45,3 · 45,1 · 45 · 4,1 · 3,9 · 3,9 · 3,8 |
| 13532 | `p360-13532-1-1-46091362dcb9` | Exata.GO | Senado · GO | 2026-06-13 | 8 | 2 | 7 | 8,7 · 2,1 · 1,1 · 0,8 · 0,4 · 0,4 · 0,2 |
| 13804 | `p360-13804-1-0-cbeedb003b75` | Instituto Ideia | Senado · SP | 2026-08-08 | 12 | 1 | 7 | 19 · 3 · 3 · 1 · 1 · 1 · 1 |
| 13844 | `p360-13844-1-0-8f217dbd9b92` | Action | Senado · AM | 2026-07-10 | 6 | 1 | 7 | 15 · 13 · 10 · 9 · 8 · 4 · 1 |
| 13173 | `p360-13173-1-0-a1e10f8869c7` | AtlasIntel | Presidente · Brasil | 2026-01-20 | 8 | 4 | 6 | 49 · 49 · 1 · 1 · 1 · 1 |
| 13593 | `p360-13593-1-0-9e3523be73b6` | Real Time Big Data | Senado · AC | 2026-07-25 | 8 | 2 | 6 | 12 · 8 · 6 · 6 · 1 · 1 |
| 13599 | `p360-13599-1-0-3f0c5f413d2a` | MT Dados | Governador · MT | 2026-07-21 | 6 | 3 | 6 | 27 · 26 · 1,5 · 0,9 · 0,7 · 0,4 |
| 13388 | `p360-13388-1-0-db34685a3f31` | Gerp | Senado · GO | 2026-04-10 | 7 | 2 | 5 | 27 · 23 · 5 · 2 · 1 |
| 13389 | `p360-13389-1-0-8c6a6382f01f` | Paraná Pesquisas | Governador · PR | 2026-04-12 | 6 | 4 | 5 | 50,9 · 2,3 · 1,8 · 1,7 · 1,5 |
| 13563 | `p360-13563-1-0-fe5ae9991ae0` | Prefab Future | Senado · RJ | 2026-07-02 | 8 | 1 | 5 | 1,8 · 1,5 · 1,4 · 1 · 0,8 |
| 13791 | `p360-13791-1-0-c60491237711` | Item | Senado · RN | 2026-07-22 | 8 | 2 | 5 | 9 · 6,8 · 1,6 · 0,6 · 0,2 |
| 13798 | `p360-13798-1-0-de98d8b7f3e9` | Nexus | Presidente · Brasil | 2026-08-09 | 11 | 1 | 5 | 5 · 3 · 2 · 0 · 0 |
| 13320 | `p360-13320-1-0-7fcb77b6a82e` | Paraná Pesquisas | Senado · MA | 2026-03-08 | 9 | 2 | 4 | 10,3 · 10,1 · 5,3 · 4,7 |
| 13416 | `p360-13416-1-0-86530621509c` | Quaest | Senado · GO | 2026-04-28 | 8 | 1 | 4 | 8 · 3 · 1 · 0 |
| 13496 | `p360-13496-1-0-c916483e99cd` | Numen Data | Senado · GO | 2026-06-02 | 8 | 2 | 4 | 4,2 · 2,7 · 1,5 · 0,9 |
| 13498 | `p360-13498-1-0-bfb9d10e4dbb` | Directa | Senado · GO | 2026-05-26 | 9 | 2 | 4 | 0,6 · 0,3 · 0,2 · 0,2 |
| 13535 | `p360-13535-1-0-fd6fc41bed0d` | AtlasIntel | Senado · PI | 2026-06-21 | 7 | 1 | 4 | 2,2 · 2 · 1,1 · 0,5 |
| 13555 | `p360-13555-1-0-00abb18f82c2` | Instituto França | Governador · DF | 2026-06-23 | 6 | 2 | 4 | 11,04 · 4,03 · 3,58 · 2,09 |
| 13573 | `p360-13573-1-0-2f3897976548` | Instituto Ideia | Presidente · Brasil | 2026-07-06 | 13 | 2 | 4 | 0,4 · 0,1 · 0,1 · 0,1 |
| 13618 | `p360-13618-1-0-ad6e24b8b741` | Real Time Big Data | Governador · RJ | 2026-07-27 | 5 | 1 | 4 | 3 · 2 · 2 · 0 |
| 13638 | `p360-13638-1-0-6007a77530c7` | Real Time Big Data | Governador · RO | 2026-07-15 | 5 | 1 | 4 | 28 · 10 · 1 · 0 |
| 13679 | `p360-13679-1-0-cf30fd69f3fd` | Ranking Brasil | Senado · MS | 2026-07-23 | 7 | 2 | 4 | 0,8 · 0,8 · 0,6 · 0,6 |
| 13710 | `p360-13710-1-0-b0f65ac689e4` | Neokemp | Senado · SC | 2026-07-24 | 5 | 2 | 4 | 23,7 · 21 · 0,6 · 0,5 |
| 13747 | `p360-13747-1-0-f1e87a0423db` | Directa | Senado · GO | 2026-07-31 | 7 | 2 | 4 | 1,9 · 1,1 · 0,7 · 0,5 |
| 13748 | `p360-13748-1-0-f8ed94cc32be` | Veritá | Governador · PR | 2026-08-01 | 6 | 1 | 4 | 12,5 · 10,9 · 0,6 · 0,1 |
| 13821 | `p360-13821-1-0-deed5ae1fd20` | IPPI - Pesquisas e Consultorias | Senado · MA | 2026-08-10 | 7 | 2 | 4 | 34,9 · 23,8 · 3,5 · 1,5 |
| 13846 | `p360-13846-1-0-8e96ee104634` | Data Max | Senado · PI | 2026-08-05 | 6 | 1 | 4 | 2,02 · 1,55 · 0,56 · 0,32 |
| 13282 | `p360-13282-1-0-6e2b73de8e97` | Direct Pesquisas | Senado · GO | 2026-02-11 | 8 | 2 | 3 | 22,4 · 18,1 · 12,4 |
| 13507 | `p360-13507-1-0-e1e137683676` | Real Time Big Data | Senado · ES | 2026-06-08 | 8 | 1 | 3 | 3 · 1 · 1 |
| 13570 | `p360-13570-1-0-6a3b0df7c356` | Paraná Pesquisas | Senado · GO | 2026-07-05 | 8 | 1 | 3 | 6,6 · 2,1 · 1,5 |
| 13665 | `p360-13665-1-0-05408783861b` | Percent Brasil | Senado · MT | 2026-07-27 | 6 | 3 | 3 | 5,8 · 3,8 · 1,7 |
| 13685 | `p360-13685-1-0-a0e00ec048d7` | AtlasIntel | Senado · AC | 2026-08-02 | 6 | 2 | 3 | 20,6 · 0,9 · 0,7 |
| 13715 | `p360-13715-1-0-5a210ec9c214` | Data Capital | Senado · RN | 2026-07-29 | 6 | 2 | 3 | 17 · 10 · 9 |
| 13796 | `p360-13796-1-0-387af4bc0537` | Veritá | Senado · AP | 2026-08-01 | 6 | 1 | 3 | 34,6 · 16,4 · 7,4 |
| 13279 | `p360-13279-1-0-e20dc6241724` | Direct Pesquisas | Senado · GO | 2026-02-06 | 7 | 2 | 2 | 13,5 · 11,8 |
| 13328 | `p360-13328-1-0-a49c538eb85a` | AtlasIntel | Governador · PI | 2026-03-15 | 6 | 2 | 2 | 1,1 · 0,3 |
| 13376 | `p360-13376-2-2-aee12aeb08ec` | Instituto Ideia | Presidente · Brasil · 2º turno | 2026-03-10 | 2 | 8 | 2 | 47 · 46,5 |
| 13387 | `p360-13387-1-0-1fb2a3dfa4a3` | Veritá | Senado · GO | 2026-04-13 | 8 | 1 | 2 | 2,3 · 1,7 |
| 13395 | `p360-13395-1-1-7e79c52c9917` | AtlasIntel | Presidente · Brasil | 2026-04-27 | 12 | 3 | 2 | 2 · 0,2 |
| 13446 | `p360-13446-1-0-97d3e3a6106f` | Gerp | Senado · SP | 2026-05-15 | 6 | 2 | 2 | 28 · 18 |
| 13459 | `p360-13459-1-0-3a8b8cbf682c` | Gerp | Presidente · Brasil | 2026-05-21 | 12 | 1 | 2 | 1 · 0 |
| 13489 | `p360-13489-1-0-480b46a0eec9` | Real Time Big Data | Senado · MT | 2026-06-01 | 6 | 1 | 2 | 4 · 2 |
| 13613 | `p360-13613-1-0-994c3c2f3878` | Real Time Big Data | Governador · AC | 2026-07-25 | 4 | 1 | 2 | 28 · 7 |
| 13629 | `p360-13629-1-0-38f70dd52fb2` | Paraná Pesquisas | Senado · RS | 2026-07-19 | 6 | 1 | 2 | 7,4 · 2,8 |
| 13743 | `p360-13743-1-0-dc796afbcce7` | Paraná Pesquisas | Governador · BA | 2026-08-02 | 4 | 1 | 2 | 48,9 · 0,1 |
| 13799 | `p360-13799-1-0-b4380b956f9a` | Índice | Governador · PR | 2026-08-06 | 6 | 1 | 2 | 35,3 · 0,3 |
| 13803 | `p360-13803-1-0-80b1c14850f6` | Instituto Ideia | Governador · SP | 2026-08-08 | 6 | 1 | 2 | 1 · 0,1 |
| 13808 | `p360-13808-1-0-91865faabe67` | Delta Agência de Pesquisa | Governador · AC | 2026-08-09 | 4 | 1 | 2 | 3,48 · 0,6 |
| 13820 | `p360-13820-1-0-5d7d5cf9dc62` | IPPI - Pesquisas e Consultorias | Governador · MA | 2026-08-10 | 5 | 1 | 2 | 1,1 · 0,4 |
| 13825 | `p360-13825-1-0-9703c5d1332c` | AtlasIntel | Governador · CE | 2026-08-11 | 4 | 1 | 2 | 2,8 · 0,8 |
| 13119 | `p360-13119-1-0-76883b399da7` | Quaest | Presidente · Brasil | 2025-11-09 | 7 | 11 | 1 | 35 |
| 13277 | `p360-13277-1-0-eb69b21f3008` | Direct Pesquisas | Presidente · GO | 2026-02-06 | 5 | 1 | 1 | 34,9 |
| 13278 | `p360-13278-1-0-cd0d55f03547` | Direct Pesquisas | Governador · GO | 2026-02-06 | 5 | 1 | 1 | 22,8 |
| 13280 | `p360-13280-1-0-049cd9a7d0f0` | Direct Pesquisas | Presidente · GO | 2026-02-11 | 5 | 1 | 1 | 3,3 |
| 13329 | `p360-13329-1-0-8a50b5916db2` | AtlasIntel | Senado · PI | 2026-03-15 | 7 | 1 | 1 | 0,2 |
| 13384 | `p360-13384-1-0-83fa7f39b439` | Veritá | Governador · GO | 2026-04-13 | 4 | 1 | 1 | 32,5 |
| 13386 | `p360-13386-1-1-e99591bc9c0b` | Paraná Pesquisas | Senado · SP | 2026-04-14 | 6 | 2 | 1 | 32,9 |
| 13441 | `p360-13441-1-0-233c217eee2a` | Quaest | Presidente · Brasil | 2026-05-08 | 10 | 1 | 1 | 1 |
| 13481 | `p360-13481-1-0-bcf43afcaa67` | Vox Brasil | Senado · SP | 2026-05-28 | 6 | 1 | 1 | 25,9 |
| 13492 | `p360-13492-1-0-cab9e0650036` | AtlasIntel | Senado · RN | 2026-05-27 | 6 | 1 | 1 | 20,2 |
| 13556 | `p360-13556-1-0-97b64a9ea765` | Instituto França | Senado · DF | 2026-06-23 | 7 | 2 | 1 | 4,18 |
| 13790 | `p360-13790-1-0-6d95f223aef3` | Item | Governador · RN | 2026-07-22 | 6 | 1 | 1 | 0,6 |
| 13809 | `p360-13809-1-0-78d260ba32dd` | MDA | Presidente · Brasil | 2026-08-09 | 8 | 1 | 1 | 1,6 |
| 12991 | `p360-12991-1-0-7e6e3f01e410` | Paraná Pesquisas | Presidente · PE | 2025-08-01 | 6 | 3 | 0 | — |
| 13028 | `p360-13028-1-0-2c02c8a6960d` | AtlasIntel | Presidente · Brasil | 2025-09-14 | 8 | 3 | 0 | — |
| 13040 | `p360-13040-1-0-2ace6d377840` | AtlasIntel | Presidente · Brasil | 2025-04-24 | 10 | 3 | 0 | — |
| 13041 | `p360-13041-2-2-7114502bbf9c` | AtlasIntel | Presidente · Brasil · 2º turno | 2025-05-23 | 2 | 7 | 0 | — |
| 13041 | `p360-13041-2-3-8cf5d474e4ac` | AtlasIntel | Presidente · Brasil · 2º turno | 2025-05-23 | 2 | 7 | 0 | — |
| 13041 | `p360-13041-2-4-aa6d31b0ba1a` | AtlasIntel | Presidente · Brasil · 2º turno | 2025-05-23 | 2 | 7 | 0 | — |
| 13072 | `p360-13072-1-0-c50ed8c19c74` | Real Time Big Data | Governador · SP | 2025-11-29 | 7 | 1 | 0 | — |
| 13095 | `p360-13095-1-0-b9e7e291e0c7` | Real Time Big Data | Governador · DF | 2025-12-08 | 5 | 2 | 0 | — |
| 13119 | `p360-13119-2-7-868b932e9a79` | Quaest | Presidente · Brasil · 2º turno | 2025-11-09 | 2 | 9 | 0 | — |
| 13129 | `p360-13129-1-0-d6120aad694c` | Paraná Pesquisas | Presidente · Brasil | 2024-03-22 | 5 | 15 | 0 | — |
| 13140 | `p360-13140-1-0-54dc2bbf8c2d` | Quaest | Presidente · Brasil | 2025-12-14 | 8 | 5 | 0 | — |
| 13179 | `p360-13179-1-2-2ecfd662db1a` | Paraná Pesquisas | Senado · CE | 2026-01-21 | 10 | 3 | 0 | — |
| 13237 | `p360-13237-1-0-f210c10a5a0d` | Direct Pesquisas | Governador · GO | 2026-02-01 | 5 | 1 | 0 | — |
| 13360 | `p360-13360-1-0-56423079588e` | Veritá | Senado · AP | 2026-03-24 | 5 | 1 | 0 | — |
| 13376 | `p360-13376-1-0-1fbb0b5d6025` | Instituto Ideia | Presidente · Brasil | 2026-03-10 | 6 | 4 | 0 | — |
| 13469 | `p360-13469-1-0-4cf792133299` | Real Time Big Data | Senado · MG | 2026-05-20 | 6 | 1 | 0 | — |
| 13479 | `p360-13479-1-0-77051ccd1bc2` | Real Time Big Data | Presidente · Brasil | 2026-05-30 | 13 | 2 | 0 | — |
| 13491 | `p360-13491-1-0-e7b882de4d98` | AtlasIntel | Governador · RN | 2026-05-27 | 5 | 1 | 0 | — |
| 13500 | `p360-13500-1-0-98bf412f7389` | Real Time Big Data | Senado · PE | 2026-06-10 | 6 | 2 | 0 | — |
| 13527 | `p360-13527-1-0-b4dda496279c` | AtlasIntel | Senado · CE | 2026-06-14 | 8 | 2 | 0 | — |
| 13545 | `p360-13545-1-0-4fe21d863b7c` | Nexus | Presidente · Brasil | 2026-06-28 | 9 | 2 | 0 | — |
| 13554 | `p360-13554-2-3-3f45eb4126ae` | AtlasIntel | Presidente · Brasil · 2º turno | 2026-06-30 | 2 | 8 | 0 | — |
| 13810 | `p360-13810-1-0-0c6f4babc80e` | Gerp | Presidente · Brasil | 2026-08-10 | 10 | 1 | 0 | — |

## Não alinhadas — `v1` e `v2` não casam

| id | instituto | disputa | campo | motivo |
|---|---|---|---|---|
| 13350 | Real Time Big Data | Presidente · MT | 2026-03-23 | linha nomeada sem cenário correspondente: Aldo Rebelo 1 |
| 13626 | Quaest | Presidente · PA | 2026-07-25 | linha nomeada sem cenário correspondente: indecisos/não sabem/não responderam 11 |
| 13642 | Quaest | Presidente · BA | 2026-07-27 | linha nomeada sem cenário correspondente: indecisos 13 |
| 13657 | Quaest | Presidente · GO | 2026-07-28 | linha nomeada sem cenário correspondente: indecisos 9 |
| 13662 | Quaest | Presidente · RS | 2026-07-28 | linha nomeada sem cenário correspondente: indecisos 19 |
| 13698 | Real Time Big Data | Governador · PA | 2026-08-03 | linha nomeada sem cenário correspondente: brancos / nulos 7 |

---

Nenhum reparo se escreve a partir desta tabela sozinha: a fonte primária de um reparo é o
relatório do instituto (`integra`), e o `v1` só diz **onde procurar** e **quantas linhas
procurar**. Uma linha do `v1` não tem nome — é exatamente o que falta para escrever o
reparo, e é o PDF que o supre.
