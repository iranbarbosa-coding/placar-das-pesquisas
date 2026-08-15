# Pesquisas incompletas na fonte — decisão editorial

Geradas por `node scripts/incomplete-polls.mjs`. **76 pesquisas** em que os números
publicados somam menos de **90%** da amostra: candidatos, "outros", branco/nulo e indecisos
juntos não fecham a conta. Não são pesquisas erradas — são pesquisas em que faltam linhas na
origem (o instituto divulgou só os primeiros colocados, ou a tabela veio truncada).

**Estão FORA das médias.** Por que isso importa mais do que parece: votos válidos dividem pela
soma do que está presente, então uma pesquisa a que faltam 40 pontos infla todo mundo que
sobrou nela. Manter na média com um sinalizador não resolve — o número já sai errado.

Senado fica de fora desta conta: com dois votos por eleitor a tabela soma ~200%, a aritmética
não diz nada, e votos válidos não se aplicam ali.

Para cada uma: quanto falta, o link do agregador e o PDF do próprio instituto quando existe.
A decisão é olhando o documento — se o relatório mostrar os candidatos que faltam, é caso de
reparo em `data/repairs.json` (e a pesquisa volta para a média); se o instituto realmente só
divulgou parte, ela fica fora.

- [ ] revisadas todas

## Governador · Piauí

### Credibilidade — 2026-07-19

Soma **33.2%** · faltam **66.8 pontos** · 1 candidato(s) na tabela · amostra 359 · registro PI-03217/2026

| candidato | % |
|---|---|
| Joel Rodrigues | 12.26 |
| *branco/nulo* | 1.95 |
| *não sabe/não respondeu* | 18.94 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-intitutoCredibilidade-PI-18-19jul2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Paraná

### Neokemp — 2026-08-11

Soma **34.9%** · faltam **65.1 pontos** · 4 candidato(s) na tabela · amostra 1008 · registro PR-03242/2026

| candidato | % |
|---|---|
| Requião Filho | 23.2 |
| Luiz França | 2 |
| Adriano Teixeira | 0.5 |
| Samuel de Mattos | 0.2 |
| *branco/nulo* | 4.2 |
| *não sabe/não respondeu* | 4.8 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-neokemp-governador-pr-13ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Alagoas

### Falpe — 2026-03-01

Soma **43%** · faltam **57 pontos** · 1 candidato(s) na tabela · amostra 1200 · registro AL-05611/2026

| candidato | % |
|---|---|
| Renan Filho | 23.5 |
| *branco/nulo* | 5.5 |
| *não sabe/não respondeu* | 14 |

- Publicação: https://static.poder360.com.br/2026/03/regiao-metropolitana-de-maceio-1pdf.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Piauí

### Intenção Instituto de Pesquisa — 2026-07-24

Soma **45.7%** · faltam **54.3 pontos** · 1 candidato(s) na tabela · amostra 300 · registro PI-03190/2026

| candidato | % |
|---|---|
| Joel Rodrigues | 10 |
| *branco/nulo* | 0.67 |
| *não sabe/não respondeu* | 35 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/intencao-pesquisa-vilanovapiaui-PI-22-24jul2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Maranhão

### Veritá — 2026-08-11

Soma **47.6%** · faltam **52.4 pontos** · 2 candidato(s) na tabela · amostra 1000 · registro MA-01632/2026

| candidato | % |
|---|---|
| Orleans Brandão | 47.5 |
| Saulo Arcangeli | 0.1 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-verita-governador-maranhao-13ago2026.png

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Alagoas · 2º turno

### TDL — 2026-06-22

Soma **48%** · faltam **52 pontos** · 1 candidato(s) na tabela · amostra 1200 · registro AL-04608/2026

| candidato | % |
|---|---|
| Renan Filho | 37 |
| *branco/nulo* | 7 |
| *não sabe/não respondeu* | 4 |

- Publicação: https://www.poder360.com.br/poder-pesquisas/jhc-tem-52-das-intencoes-de-voto-e-renan-filho-37-em-al/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pernambuco

### Real Time Big Data — 2026-02-10

Soma **49%** · faltam **51 pontos** · 3 candidato(s) na tabela · amostra 2000 · registro PE-09944/2026

| candidato | % |
|---|---|
| Raquel Lyra | 31 |
| Eduardo Moura | 8 |
| Ivan Moraes | 3 |
| *branco/nulo* | 4 |
| *não sabe/não respondeu* | 3 |

- Publicação: https://static.poder360.com.br/2026/02/pesquisa-realtimebigdata-pernambuco-governador-11.fev_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Alagoas

### TDL — 2026-07-17

Soma **49%** · faltam **51 pontos** · 1 candidato(s) na tabela · amostra 1200 · registro BR-00994/2026

| candidato | % |
|---|---|
| Renan Filho | 36 |
| *branco/nulo* | 5 |
| *não sabe/não respondeu* | 8 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/Governador-AL-jul-TDL.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pernambuco

### IRTB — 2026-08-07

Soma **49.1%** · faltam **50.9 pontos** · 2 candidato(s) na tabela · amostra 1200 · registro PE-05026/2026

| candidato | % |
|---|---|
| João Campos | 48 |
| Ivan Moraes | 0.33 |
| *não sabe/não respondeu* | 0.75 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-PE-revista-total-9ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Bahia

### Paraná Pesquisas — 2026-08-02

Soma **50.9%** · faltam **49.1 pontos** · 3 candidato(s) na tabela · amostra 1400 · registro BA-03043/2026

| candidato | % |
|---|---|
| Jerônimo Rodrigues | 38.7 |
| Ronaldo Mansur | 0.7 |
| Prof. Aroldo Félix | 0.1 |
| *branco/nulo* | 7 |
| *não sabe/não respondeu* | 4.4 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/parana-pesquisas-ba-6ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Tocantins

### Lucro Ativo — 2026-04-12

Soma **51.1%** · faltam **48.9 pontos** · 5 candidato(s) na tabela · amostra 1600

| candidato | % |
|---|---|
| Dorinha Rezende | 12.38 |
| Vicentinho Júnior | 7.79 |
| Laurez Moreira | 6 |
| Ataídes Oliveira | 1 |
| Amélio Cayres | 0.63 |
| *outros* | 6.28 |
| *não sabe/não respondeu* | 17 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_no_Tocantins

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Alagoas · 2º turno

### Paraná Pesquisas — 2026-07-01

Soma **52.5%** · faltam **47.5 pontos** · 1 candidato(s) na tabela · amostra 1400 · registro AL-04491/2026

| candidato | % |
|---|---|
| Renan Filho | 42 |
| *branco/nulo* | 6.1 |
| *não sabe/não respondeu* | 4.4 |

- Publicação: https://www.poder360.com.br/poder-pesquisas/jhc-tem-475-e-renan-filho-42-em-eventual-2o-turno-em-al-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Mato Grosso do Sul

### Ranking — 2026-08-12

Soma **53.5%** · faltam **46.5 pontos** · 6 candidato(s) na tabela · amostra 2000 · registro MS-09590/2026

| candidato | % |
|---|---|
| Fábio Trad | 21.7 |
| Delcídio do Amaral | 7.6 |
| João Henrique Catan | 7.4 |
| Renato Gomes | 3.4 |
| Jeferson Bezerra | 1 |
| Lucien Rezende | 0.4 |
| *branco/nulo* | 5 |
| *não sabe/não respondeu* | 7 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-ranking-brasil-governador-ms-13ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Paraíba

### DataTrends — 2026-07-29

Soma **54%** · faltam **46 pontos** · 1 candidato(s) na tabela · amostra 1200 · registro PB-09547/2026

| candidato | % |
|---|---|
| Lucas Ribeiro | 34 |
| *branco/nulo* | 8 |
| *não sabe/não respondeu* | 12 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-datatrend-governador-pb-1ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Brasil

### Quaest — 2026-08-12

Soma **54%** · faltam **46 pontos** · 4 candidato(s) na tabela · amostra 2004 · registro BR-06773/2026

| candidato | % |
|---|---|
| Lula | 38 |
| Ronaldo Caiado | 4 |
| Augusto Cury | 2 |
| Romeu Zema | 2 |
| *não sabe/não respondeu* | 8 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/quaest-globo-presidente-nacional-14ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Alagoas

### Paraná Pesquisas — 2026-07-01

Soma **54.2%** · faltam **45.8 pontos** · 2 candidato(s) na tabela · amostra 1400 · registro AL-04491/2026

| candidato | % |
|---|---|
| Renan Filho | 41 |
| Lenilda Luna | 1.4 |
| *branco/nulo* | 5.4 |
| *não sabe/não respondeu* | 6.4 |

- Publicação: https://www.poder360.com.br/poder-pesquisas/jhc-tem-475-e-renan-filho-42-em-eventual-2o-turno-em-al-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### Real Time Big Data — 2025-11-24

Soma **55%** · faltam **45 pontos** · 1 candidato(s) na tabela · amostra 1200

| candidato | % |
|---|---|
| Renan Filho | 48 |
| *branco/nulo* | 4 |
| *não sabe/não respondeu* | 3 |

- Publicação: https://static.poder360.com.br/2025/12/pesquisa-realtimebigdata-alagoas-24nov2025.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pará

### Real Time Big Data — 2026-08-03

Soma **55%** · faltam **45 pontos** · 3 candidato(s) na tabela · amostra 1600 · registro PA-08492/2026

| candidato | % |
|---|---|
| Hana Ghassan | 31 |
| Cleber Rabelo | 1 |
| Raquel Brício | 0 |
| *branco/nulo* | 7 |
| *não sabe/não respondeu* | 16 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/realtimebigdata-estadual-para-3ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio Grande do Norte

### Potengi/Media — 2026-07-24

Soma **58.4%** · faltam **41.6 pontos** · 2 candidato(s) na tabela · amostra 500 · registro RN-03002/2026

| candidato | % |
|---|---|
| Allyson Bezerra | 21.2 |
| Cadu Xavier | 14.4 |
| *branco/nulo* | 6.6 |
| *não sabe/não respondeu* | 16.2 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/media-inteligencia-pesquisa-gov-rn-7ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio de Janeiro

### Prefab — 2026-07-29

Soma **58.6%** · faltam **41.4 pontos** · 4 candidato(s) na tabela · amostra 2000 · registro RJ-02770/2026

| candidato | % |
|---|---|
| Douglas Ruas | 10.9 |
| Garotinho | 10.8 |
| Wilson Witzel | 3.6 |
| William Siri | 1.8 |
| *branco/nulo* | 12.1 |
| *não sabe/não respondeu* | 19.4 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/PrefabEstadualImprensa2026-1.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pernambuco

### Brada Comunicação — 2026-07-29

Soma **60.9%** · faltam **39.1 pontos** · 1 candidato(s) na tabela · amostra 1500 · registro PE-06641/2026

| candidato | % |
|---|---|
| João Campos | 44.6 |
| *branco/nulo* | 7 |
| *não sabe/não respondeu* | 9.3 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/brada-pe-governo-7ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Alagoas

### TDL — 2026-01-25

Soma **61%** · faltam **39 pontos** · 1 candidato(s) na tabela · amostra 1200 · registro AL-03974/2026

| candidato | % |
|---|---|
| Renan Filho | 30 |
| *branco/nulo* | 9 |
| *não sabe/não respondeu* | 22 |

- Publicação: https://static.poder360.com.br/2026/01/pesquisa-tdl-alagoas-presidente-29.jan_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rondônia

### Real Time Big Data — 2026-07-15

Soma **61%** · faltam **39 pontos** · 4 candidato(s) na tabela · amostra 1600 · registro RO-04369/2026

| candidato | % |
|---|---|
| Marcos Rogério | 36 |
| Hildon Chaves | 13 |
| Ricardo Frota | 1 |
| Samuel Costa | 1 |
| *não sabe/não respondeu* | 10 |

- Publicação: https://static.poder360.com.br/uploads/2026/07/real-time-big-data-governador-rondonia-16jul2026.png

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio Grande do Norte

### Soluções — 2026-07-25

Soma **63.4%** · faltam **36.6 pontos** · 2 candidato(s) na tabela · amostra 1800 · registro RN-02277/2026

| candidato | % |
|---|---|
| Allyson Bezerra | 38.8 |
| Cadu Xavier | 13.2 |
| *não sabe/não respondeu* | 11.4 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/TMC-pesquisa-RN-22-25jul2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Mato Grosso do Sul

### Ranking — 2026-07-21

Soma **64%** · faltam **36 pontos** · 6 candidato(s) na tabela · amostra 1000 · registro MS-05958/2026

| candidato | % |
|---|---|
| Fábio Trad | 18 |
| Delcídio do Amaral | 7 |
| João Henrique Catan | 5.6 |
| Renato Gomes | 5 |
| Jeferson Bezerra | 0.8 |
| Lucien Rezende | 0.6 |
| *branco/nulo* | 14 |
| *não sabe/não respondeu* | 13 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/ranking-ms-gov-7ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Paraná

### Índice — 2026-08-06

Soma **64.4%** · faltam **35.6 pontos** · 4 candidato(s) na tabela · amostra 1200 · registro PR-07034/2026

| candidato | % |
|---|---|
| Sandro Alex | 27.6 |
| Requião Filho | 19.5 |
| Luiz França | 0.7 |
| Samuel de Mattos | 0.2 |
| *branco/nulo* | 5.3 |
| *não sabe/não respondeu* | 11.1 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-indice-gov-pr-10ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Acre

### AtlasIntel — 2026-08-02

Soma **64.8%** · faltam **35.2 pontos** · 3 candidato(s) na tabela · amostra 997 · registro AC-07815/2026

| candidato | % |
|---|---|
| Alan Rick | 33.1 |
| Tião Bocalom | 18.5 |
| Thor Dantas | 9.7 |
| *branco/nulo* | 0.9 |
| *não sabe/não respondeu* | 2.6 |

- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/mailza-assis-e-alan-rick-empatam-para-o-governo-do-acre/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### Real Time Big Data — 2026-07-25

Soma **65%** · faltam **35 pontos** · 3 candidato(s) na tabela · amostra 1600 · registro AC-01069/2026

| candidato | % |
|---|---|
| Alan Rick | 38 |
| Tião Bocalom | 17 |
| Jamyr Rosas | 1 |
| *branco/nulo* | 6 |
| *não sabe/não respondeu* | 3 |

- Publicação: https://static.poder360.com.br/uploads/2026/07/real-time-big-data-acre-estadual-27jul.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio Grande do Sul

### Real Time Big Data — 2026-06-22

Soma **65%** · faltam **35 pontos** · 2 candidato(s) na tabela · amostra 1600 · registro RS-07063/2026

| candidato | % |
|---|---|
| Juliana Brizola | 37 |
| Gabriel Souza | 18 |
| *branco/nulo* | 5 |
| *não sabe/não respondeu* | 5 |

- Publicação: https://www.poder360.com.br/poder-eleicoes/flavio-tem-51-contra-42-de-lula-no-rs-no-2o-turno-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Goiás

### Direct Pesquisas — 2026-02-10

Soma **65.9%** · faltam **34.1 pontos** · 4 candidato(s) na tabela · amostra 350 · registro GO-09854/2026

| candidato | % |
|---|---|
| Marconi Perillo | 31.7 |
| Wilder Morais | 9.7 |
| Adriana Accorsi | 4.1 |
| Edward Madureira | 1.4 |
| *branco/nulo* | 2.1 |
| *não sabe/não respondeu* | 16.9 |

- Publicação: https://static.poder360.com.br/2026/02/direct-pesquisa-goais-presidente-12.fev_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### Papo Aberto/DataRD — 2026-08-04

Soma **66.7%** · faltam **33.3 pontos** · 3 candidato(s) na tabela · amostra 1509 · registro GO-08142/2026

| candidato | % |
|---|---|
| Wilder Morais | 24.7 |
| Marconi Perillo | 17.2 |
| Luis Cesar Bueno | 8.6 |
| *branco/nulo* | 8 |
| *não sabe/não respondeu* | 8.2 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/Governador.-GO.DataRDjpeg.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Brasil

### Paraná Pesquisas — 2026-01-29

Soma **66.9%** · faltam **33.1 pontos** · 6 candidato(s) na tabela · amostra 2080 · registro BR-08254/2026

| candidato | % |
|---|---|
| Lula | 39.8 |
| Ratinho Jr | 6.5 |
| Ronaldo Caiado | 3.7 |
| Romeu Zema | 2.8 |
| Renan Santos | 1.5 |
| Aldo Rebelo | 1.1 |
| *branco/nulo* | 6.8 |
| *não sabe/não respondeu* | 4.7 |

- Publicação: https://www.poder360.com.br/poder-eleicoes/lula-lidera-1o-turno-mas-empata-com-flavio-e-tarcisio-no-2o/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Goiás

### Veritá — 2026-04-13

Soma **67.5%** · faltam **32.5 pontos** · 3 candidato(s) na tabela · amostra 1525 · registro GO-06754/2026

| candidato | % |
|---|---|
| Wilder Morais | 26.9 |
| Marconi Perillo | 17.8 |
| Adriana Accorsi | 11.1 |
| *branco/nulo* | 3.8 |
| *não sabe/não respondeu* | 7.9 |

- Publicação: https://static.poder360.com.br/2026/04/pesquisa-verita-abril2026-goias.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Brasil

### Quaest — 2026-07-13

Soma **68%** · faltam **32 pontos** · 2 candidato(s) na tabela · amostra 2004 · registro BR-07181/2026

| candidato | % |
|---|---|
| Lula | 40 |
| Flávio Bolsonaro | 28 |

- Publicação: https://www.poder360.com.br/poder-eleicoes/lula-tem-45-contra-37-de-flavio-no-2o-turno-diz-quaest/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Goiás

### Portal Goiás — 2026-02-07

Soma **71%** · faltam **29 pontos** · 4 candidato(s) na tabela · amostra 500 · registro GO-01895/2026

| candidato | % |
|---|---|
| Marconi Perillo | 22.4 |
| Adriana Accorsi | 11.8 |
| Wilder Morais | 7 |
| Telemaco Brandão | 1 |
| *não sabe/não respondeu* | 28.8 |

- Publicação: https://static.poder360.com.br/2026/02/pesquisa-portalgoias-goias-presidente-10.fev_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### Portal Goiás — 2026-02-03

Soma **71.4%** · faltam **28.6 pontos** · 4 candidato(s) na tabela · amostra 500 · registro GO-01981/2026

| candidato | % |
|---|---|
| Marconi Perillo | 20.6 |
| Adriana Accorsi | 9.4 |
| Wilder Morais | 8.4 |
| Telemaco Brandão | 1.6 |
| *não sabe/não respondeu* | 31.4 |

- Publicação: https://static.poder360.com.br/2026/02/pesquisa-portalgoias-goias-presidente.10.fev_.2026pdf.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio Grande do Norte

### TN/Consult — 2026-08-10

Soma **71.6%** · faltam **28.4 pontos** · 4 candidato(s) na tabela · amostra 1700 · registro RN-08509/2026

| candidato | % |
|---|---|
| Allyson Bezerra | 30.18 |
| Cadu Xavier | 13.06 |
| Robério Paulino | 0.41 |
| Dário Barbosa | 0.12 |
| *branco/nulo* | 10.65 |
| *não sabe/não respondeu* | 17.18 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-consult-governo-rn-14ago2206.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Goiás

### Delta — 2026-07-27

Soma **73.2%** · faltam **26.8 pontos** · 2 candidato(s) na tabela · amostra 600 · registro GO-01528/2026

| candidato | % |
|---|---|
| Marconi Perillo | 21.7 |
| Luis Cesar Bueno | 3.8 |
| *não sabe/não respondeu* | 47.7 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/igape-goiais-luziana-estadual-24-27jul2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio Grande do Sul

### Quaest — 2026-07-28

Soma **75%** · faltam **25 pontos** · 4 candidato(s) na tabela · amostra 1104 · registro RS-04790/2026

| candidato | % |
|---|---|
| Juliana Brizola | 24 |
| Gabriel Souza | 6 |
| Cesar Pontes | 1 |
| Rejane de Oliveira | 1 |
| *não sabe/não respondeu* | 43 |

- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/pesquisa-mostra-empate-entre-5-candidatos-ao-senado-no-rs/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Paraíba

### Índice — 2026-05-29

Soma **76%** · faltam **24 pontos** · 3 candidato(s) na tabela · amostra 2000

| candidato | % |
|---|---|
| Cícero Lucena | 34.3 |
| Lucas Ribeiro | 26.6 |
| Efraim Filho | 15.1 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_na_Para%C3%ADba

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Paraná

### Veritá — 2026-08-01

Soma **76%** · faltam **24 pontos** · 3 candidato(s) na tabela · amostra 2010 · registro PR-03910/2026

| candidato | % |
|---|---|
| Sergio Moro | 54.7 |
| Requião Filho | 18.7 |
| Luiz França | 2.6 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-verita-parana-6ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Santa Catarina

### Mapa/Jovem Pan — 2026-06-11

Soma **76.7%** · faltam **23.3 pontos** · 3 candidato(s) na tabela · amostra 1008

| candidato | % |
|---|---|
| Jorginho Mello | 54.9 |
| João Rodrigues | 15.3 |
| Gelson Merisio | 5.1 |
| *outros* | 1.4 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Santa_Catarina

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Goiás

### Direct Pesquisas — 2026-02-06

Soma **77.2%** · faltam **22.8 pontos** · 4 candidato(s) na tabela · amostra 1000 · registro GO-00854/2026

| candidato | % |
|---|---|
| Daniel Vilela | 31.3 |
| Adriana Accorsi | 10.6 |
| Wilder Morais | 8.4 |
| Edward Madureira | 1.6 |
| *branco/nulo* | 7 |
| *não sabe/não respondeu* | 18.3 |

- Publicação: https://static.poder360.com.br/2026/02/pesquisa-direct-goiais-presidente-8.fev_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Amazonas · 2º turno

### DMP — 2026-07-02

Soma **77.5%** · faltam **22.5 pontos** · 2 candidato(s) na tabela · amostra 1200

| candidato | % |
|---|---|
| Omar Aziz | 36.9 |
| David Almeida | 33 |
| *não sabe/não respondeu* | 7.6 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_no_Amazonas

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe

### ECM Sergipe — 2026-06-07

Soma **77.6%** · faltam **22.4 pontos** · 4 candidato(s) na tabela · amostra 1200

| candidato | % |
|---|---|
| Fábio Mitidieri | 40.8 |
| Valmir de Francisquinho | 30.3 |
| Ricardo Marques | 5.3 |
| Emanuel Cacho | 0.8 |
| *outros* | 0.4 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Sergipe

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pará

### Quaest — 2026-04-25

Soma **78%** · faltam **22 pontos** · 4 candidato(s) na tabela · amostra 900 · registro PA-09305/2026

| candidato | % |
|---|---|
| Hana Ghassan | 19 |
| Mário Couto | 11 |
| Cleber Rabelo | 3 |
| Araceli Lemos | 2 |
| *não sabe/não respondeu* | 43 |

- Publicação: https://www.poder360.com.br/poder-eleicoes/helder-barbalho-e-eder-mauro-lideram-disputa-pelo-senado-no-para/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Piauí · 2º turno

### AtlasIntel — 2026-03-15

Soma **78%** · faltam **22 pontos** · 2 candidato(s) na tabela · amostra 1208 · registro PI-06908/2026

| candidato | % |
|---|---|
| Rafael Fonteles | 63 |
| Mainha | 15 |

- Publicação: https://www.poder360.com.br/poder-pesquisas/fonteles-e-aprovado-por-61-e-desaprovado-por-34-no-piaui/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Brasil · 2º turno

### Quaest — 2026-08-03

Soma **80%** · faltam **20 pontos** · 2 candidato(s) na tabela · amostra 2004 · registro BR-06591/2026

| candidato | % |
|---|---|
| Lula | 46 |
| Romeu Zema | 34 |

- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/lula-tem-44-ante-39-de-flavio-no-2o-turno-diz-quaest/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pará

### Quaest — 2026-07-25

Soma **80%** · faltam **20 pontos** · 5 candidato(s) na tabela · amostra 900 · registro PA-04548/2026

| candidato | % |
|---|---|
| Hana Ghassan | 24 |
| Mário Couto | 11 |
| Araceli Lemos | 2 |
| Cleber Rabelo | 2 |
| Raquel Brício | 2 |
| *não sabe/não respondeu* | 39 |

- Publicação: https://www.poder360.com.br/poder-eleicoes/lula-e-aprovado-por-50-e-desaprovado-por-44-no-pa-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Paraíba

### Seta — 2026-07-27

Soma **80.6%** · faltam **19.4 pontos** · 5 candidato(s) na tabela · amostra 1500 · registro PB-01909/2026

| candidato | % |
|---|---|
| Lucas Ribeiro | 33.3 |
| Cícero Lucena | 24.4 |
| Olímpio Rocha | 0.7 |
| Camilo Duarte | 0.2 |
| Yuri Ezequiel | 0.1 |
| *branco/nulo* | 10.2 |
| *não sabe/não respondeu* | 11.7 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/datatrends-gov-pb-7ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### DataTrends — 2026-06-09

Soma **81%** · faltam **19 pontos** · 3 candidato(s) na tabela · amostra 1200 · registro PB-09578/2026

| candidato | % |
|---|---|
| Lucas Ribeiro | 33 |
| Cícero Lucena | 26 |
| Olímpio Rocha | 1 |
| *branco/nulo* | 10 |
| *não sabe/não respondeu* | 11 |

- Publicação: https://static.poder360.com.br/uploads/2026/07/DataTrends-PB-junho-2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Brasil · 2º turno

### Quaest — 2026-08-03

Soma **82%** · faltam **18 pontos** · 2 candidato(s) na tabela · amostra 2004 · registro BR-06591/2026

| candidato | % |
|---|---|
| Lula | 45 |
| Ronaldo Caiado | 37 |

- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/lula-tem-44-ante-39-de-flavio-no-2o-turno-diz-quaest/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio Grande do Norte

### Exatus — 2026-07-10

Soma **82.3%** · faltam **17.7 pontos** · 5 candidato(s) na tabela · amostra 1500

| candidato | % |
|---|---|
| Allyson Bezerra | 41.78 |
| Álvaro Dias | 26.05 |
| Cadu Xavier | 13.74 |
| Dário Barbosa | 0.49 |
| Robério Paulino | 0.26 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_no_Rio_Grande_do_Norte

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Amazonas

### Projeta — 2026-07-23

Soma **83%** · faltam **17 pontos** · 3 candidato(s) na tabela · amostra 3000 · registro AM-09152/2026

| candidato | % |
|---|---|
| Omar Aziz | 27 |
| Roberto Cidade | 23.4 |
| Maria do Carmo | 16.8 |
| *branco/nulo* | 10 |
| *não sabe/não respondeu* | 5.8 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/Pesquisa-Projeta-260724_074017.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Brasil · 2º turno

### Alfa/TMC — 2026-07-28

Soma **83%** · faltam **17 pontos** · 2 candidato(s) na tabela · amostra 2700 · registro BR-04488/2026

| candidato | % |
|---|---|
| Lula | 46 |
| Romeu Zema | 37 |

- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/lula-tem-48-contra-41-de-flavio-no-2o-turno-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio de Janeiro

### AtlasIntel — 2025-08-29

Soma **83.6%** · faltam **16.4 pontos** · 4 candidato(s) na tabela · amostra 2001

| candidato | % |
|---|---|
| Eduardo Paes | 43.9 |
| Rodrigo Barcellar | 12.4 |
| Washington Reis | 9.8 |
| Monica Benicio | 6.6 |
| *branco/nulo* | 7.1 |
| *não sabe/não respondeu* | 3.8 |

- Publicação: https://www.poder360.com.br/poder-pesquisas/paes-tem-439-das-intencoes-de-voto-ao-governo-do-rj-diz-atlasintel/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe

### CTAS — 2026-07-24

Soma **83.7%** · faltam **16.3 pontos** · 4 candidato(s) na tabela · amostra 1224

| candidato | % |
|---|---|
| Fábio Mitidieri | 45.4 |
| Valmir de Francisquinho | 32.2 |
| Ricardo Marques | 4.5 |
| Emanuel Cacho | 1 |
| *outros* | 0.6 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Sergipe

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Distrito Federal · 2º turno

### Opinião Consultoria — 2026-08-01

Soma **83.7%** · faltam **16.3 pontos** · 2 candidato(s) na tabela · amostra 1109 · registro DF-04077/2026

| candidato | % |
|---|---|
| Celina Leão | 43.6 |
| José Roberto Arruda | 40.1 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-opiniao-consultoria-governador-1ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Ceará

### Quaest — 2026-07-28

Soma **84%** · faltam **16 pontos** · 4 candidato(s) na tabela · amostra 1002 · registro CE-09277/2026

| candidato | % |
|---|---|
| Ciro Gomes | 43 |
| Elmano Freitas | 33 |
| Professor Jarir Pereira | 1 |
| Serley Leal | 0 |
| *não sabe/não respondeu* | 7 |

- Publicação: https://static.poder360.com.br/uploads/2026/07/Quaest-Ceara-30jul2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Piauí · 2º turno

### AtlasIntel — 2026-03-15

Soma **84%** · faltam **16 pontos** · 2 candidato(s) na tabela · amostra 1208 · registro PI-06908/2026

| candidato | % |
|---|---|
| Rafael Fonteles | 62 |
| Toni Rodrigues | 22 |

- Publicação: https://www.poder360.com.br/poder-pesquisas/fonteles-e-aprovado-por-61-e-desaprovado-por-34-no-piaui/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### AtlasIntel — 2026-03-15

Soma **84%** · faltam **16 pontos** · 2 candidato(s) na tabela · amostra 1208 · registro PI-06908/2026

| candidato | % |
|---|---|
| Rafael Fonteles | 60 |
| Margarete Coelho | 24 |

- Publicação: https://www.poder360.com.br/poder-pesquisas/fonteles-e-aprovado-por-61-e-desaprovado-por-34-no-piaui/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Brasil · 2º turno

### Alfa/TMC — 2026-07-28

Soma **85%** · faltam **15 pontos** · 2 candidato(s) na tabela · amostra 2700 · registro BR-04488/2026

| candidato | % |
|---|---|
| Lula | 45 |
| Ronaldo Caiado | 40 |

- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/lula-tem-48-contra-41-de-flavio-no-2o-turno-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### PoderData — 2026-08-12

Soma **85%** · faltam **15 pontos** · 2 candidato(s) na tabela · amostra 2400 · registro BR-06868/2026

| candidato | % |
|---|---|
| Lula | 46 |
| Renan Santos | 37 |
| *não sabe/não respondeu* | 2 |

- Publicação: https://www.poder360.com.br/poderdata/lula-tem-46-contra-45-de-flavio-no-2o-turno-diz-poderdata-aya/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Mato Grosso do Sul · 2º turno

### Real Time Big Data — 2026-05-11

Soma **85%** · faltam **15 pontos** · 2 candidato(s) na tabela · amostra 1600 · registro MS-06412/2026

| candidato | % |
|---|---|
| Eduardo Riedel | 55 |
| Renato Gomes | 17 |
| *branco/nulo* | 13 |

- Publicação: https://www.poder360.com.br/poder-pesquisas/eduardo-riedel-lidera-disputa-pelo-governo-de-ms-diz-real-time/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Goiás

### Delta — 2026-07-25

Soma **85.2%** · faltam **14.8 pontos** · 4 candidato(s) na tabela · amostra 500 · registro GO-07670/2026

| candidato | % |
|---|---|
| Gustavo Mendanha | 5 |
| Vanderlan Cardoso | 2.8 |
| Zacharias Calil | 2.2 |
| Telemaco Brandão | 1 |
| *não sabe/não respondeu* | 74.2 |

- Publicação: https://static.poder360.com.br/uploads/2026/08/igape-goias-estadual-ago-2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe

### W1 — 2026-07-18

Soma **85.3%** · faltam **14.7 pontos** · 3 candidato(s) na tabela · amostra 1000

| candidato | % |
|---|---|
| Fábio Mitidieri | 46.2 |
| Valmir de Francisquinho | 34 |
| Ricardo Marques | 5.1 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Sergipe

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rondônia

### Veritá — 2026-05-08

Soma **86.4%** · faltam **13.6 pontos** · 3 candidato(s) na tabela · amostra 1220

| candidato | % |
|---|---|
| Marcos Rogério | 42.5 |
| Adaílton Fúria | 22.2 |
| Hildon Chaves | 21.7 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Rond%C3%B4nia

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe

### JR Comunicações, Serviços a Pesquisas — 2026-04-27

Soma **87.3%** · faltam **12.7 pontos** · 3 candidato(s) na tabela · amostra 1312

| candidato | % |
|---|---|
| Valmir de Francisquinho | 44.59 |
| Fábio Mitidieri | 37.27 |
| Ricardo Marques | 5.41 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Sergipe

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Paraíba

### Anova — 2026-03-21

Soma **87.4%** · faltam **12.6 pontos** · 4 candidato(s) na tabela · amostra 2000 · registro PB-00155/2026

| candidato | % |
|---|---|
| Cícero Lucena | 32 |
| Lucas Ribeiro | 20.6 |
| Lúcio Flávio | 0.8 |
| Olímpio Rocha | 0.7 |
| *branco/nulo* | 12.8 |
| *não sabe/não respondeu* | 20.5 |

- Publicação: https://static.poder360.com.br/2026/04/Anova_Pesquisa_MAR2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe

### W1 — 2026-04-20

Soma **87.7%** · faltam **12.3 pontos** · 4 candidato(s) na tabela · amostra 1000

| candidato | % |
|---|---|
| Valmir de Francisquinho | 39.9 |
| Fábio Mitidieri | 35.3 |
| Ricardo Marques | 9.8 |
| Emanuel Cacho | 0.7 |
| *outros* | 2 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Sergipe

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pará

### Simetria — 2026-05-04

Soma **88%** · faltam **12 pontos** · 5 candidato(s) na tabela · amostra 1200

| candidato | % |
|---|---|
| Daniel Santos | 28 |
| Hana Ghassan | 24 |
| Mário Couto | 8 |
| Cleber Rabelo | 4 |
| Araceli Lemos | 2 |
| *não sabe/não respondeu* | 22 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_no_Par%C3%A1

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Brasil

### Nexus — 2026-08-09

Soma **89%** · faltam **11 pontos** · 10 candidato(s) na tabela · amostra 2000 · registro BR-08428/2026

| candidato | % |
|---|---|
| Lula | 40 |
| Flávio Bolsonaro | 35 |
| Ronaldo Caiado | 5 |
| Renan Santos | 4 |
| Romeu Zema | 3 |
| Augusto Cury | 1 |
| Cabo Daciolo | 1 |
| Rui Costa Pimenta | 0 |
| Hertz Dias | 0 |
| Heró Bezerra | 0 |

- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/lula-tem-47-contra-44-de-flavio-no-2o-turno-diz-btg-nexus/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### Quaest — 2026-08-03

Soma **89%** · faltam **11 pontos** · 8 candidato(s) na tabela · amostra 2004 · registro BR-06591/2026

| candidato | % |
|---|---|
| Lula | 39 |
| Flávio Bolsonaro | 30 |
| Renan Santos | 4 |
| Ronaldo Caiado | 4 |
| Romeu Zema | 2 |
| Cabo Daciolo | 1 |
| Augusto Cury | 1 |
| Hertz Dias | 0 |
| *branco/nulo* | 8 |

- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/lula-tem-44-ante-39-de-flavio-no-2o-turno-diz-quaest/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Brasil · 2º turno

### PoderData — 2026-08-12

Soma **89%** · faltam **11 pontos** · 2 candidato(s) na tabela · amostra 2400 · registro BR-06868/2026

| candidato | % |
|---|---|
| Lula | 45 |
| Romeu Zema | 43 |
| *não sabe/não respondeu* | 1 |

- Publicação: https://www.poder360.com.br/poderdata/lula-tem-46-contra-45-de-flavio-no-2o-turno-diz-poderdata-aya/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Mato Grosso

### Percent Brasil — 2026-07-27

Soma **89.3%** · faltam **10.7 pontos** · 4 candidato(s) na tabela · amostra 1200 · registro MT-02251/2026

| candidato | % |
|---|---|
| Wellington Fagundes | 28 |
| Jayme Campos | 20 |
| Otaviano Pivetta | 18.7 |
| Natasha Slhessarenko | 6.7 |
| *branco/nulo* | 4.3 |
| *não sabe/não respondeu* | 11.6 |

- Publicação: https://static.poder360.com.br/uploads/2026/07/Pesquisa-Genial-Quaest-RS-jul-2026-1.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio de Janeiro

### Veritá — 2026-05-08

Soma **89.8%** · faltam **10.2 pontos** · 3 candidato(s) na tabela · amostra 2030

| candidato | % |
|---|---|
| Eduardo Paes | 50 |
| Douglas Ruas | 32.3 |
| William Siri | 7.5 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_no_Rio_de_Janeiro

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

