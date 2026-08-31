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

## Presidente · Espírito Santo

### Quaest — 2026-08-26

Soma **31%** · faltam **69 pontos** · 4 candidato(s) na tabela · amostra 804 · registro BR-06255/2026

| candidato | % |
|---|---|
| Pablo Marçal | 3 |
| Ronaldo Caiado | 2 |
| Escritor Augusto Cury | 2 |
| Hertz Dias | 0 |
| *não sabe/não respondeu* | 24 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-quaest-presidente-espirito-santo-27ago2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/flavio-bolsonaro-tem-37-ante-30-de-lula-no-espirito-santo-diz-quaest/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Bahia

### Ideia — 2026-08-18

Soma **31.5%** · faltam **68.5 pontos** · 5 candidato(s) na tabela · amostra 1500 · registro BR-00976/2026

| candidato | % |
|---|---|
| Ronaldo Caiado | 5 |
| Renan Santos | 4 |
| Escritor Augusto Cury | 2 |
| Hertz Dias | 1 |
| Rui Costa Pimenta | 0.5 |
| *não sabe/não respondeu* | 19 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-ideia-presidente-governo-senado-19ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-ideia-presidente-governo-senado-19ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Piauí

### Credibilidade — 2026-07-19

Soma **33.2%** · faltam **66.8 pontos** · 1 candidato(s) na tabela · amostra 359 · registro PI-03217/2026

| candidato | % |
|---|---|
| Joel Rodrigues | 12.26 |
| *branco/nulo* | 1.95 |
| *não sabe/não respondeu* | 18.94 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-intitutoCredibilidade-PI-18-19jul2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-intitutoCredibilidade-PI-18-19jul2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Santa Catarina

### Quaest — 2026-08-23

Soma **34%** · faltam **66 pontos** · 5 candidato(s) na tabela · amostra 804 · registro BR-0716/2026

| candidato | % |
|---|---|
| Renan Santos | 4 |
| Zema | 3 |
| Escritor Augusto Cury | 3 |
| Ronaldo Caiado | 3 |
| Rui Costa Pimenta | 0 |
| *não sabe/não respondeu* | 21 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-quaest-presidente-sc-25ago2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/flavio-tem-45-contra-20-de-lula-no-1o-turno-em-sc-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Rio Grande do Sul

### Quaest — 2026-08-23

Soma **36%** · faltam **64 pontos** · 4 candidato(s) na tabela · amostra 900 · registro BR-08612/2026

| candidato | % |
|---|---|
| Ronaldo Caiado | 3 |
| Renan Santos | 2 |
| Pablo Marçal | 2 |
| Escritor Augusto Cury | 1 |
| *não sabe/não respondeu* | 28 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-quaest-presidente-rs-25ago2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/flavio-e-lula-empatam-no-1o-turno-no-rs-diz-quaest/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · São Paulo

### Quaest — 2026-08-24

Soma **36%** · faltam **64 pontos** · 4 candidato(s) na tabela · amostra 1800 · registro BR-02096/2026

| candidato | % |
|---|---|
| Ronaldo Caiado | 4 |
| Zema | 3 |
| Renan Santos | 3 |
| Rui Costa Pimenta | 1 |
| *não sabe/não respondeu* | 25 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-quaest-presidente-sp-25ago2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/flavio-tem-30-e-lula-29-dos-votos-no-1o-turno-em-sp/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Mato Grosso do Sul

### Quaest — 2026-08-24

Soma **37%** · faltam **63 pontos** · 2 candidato(s) na tabela · amostra 804 · registro BR-04312/2026

| candidato | % |
|---|---|
| Lula | 27 |
| Rui Costa Pimenta | 0 |
| *não sabe/não respondeu* | 10 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/quaest-presidencial-MS-26ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/quaest-presidencial-MS-26ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Minas Gerais

### Quaest — 2026-08-24

Soma **38%** · faltam **62 pontos** · 5 candidato(s) na tabela · amostra 1506 · registro BR-09818/2026

| candidato | % |
|---|---|
| Zema | 6 |
| Pablo Marçal | 3 |
| Renan Santos | 3 |
| Ronaldo Caiado | 2 |
| Escritor Augusto Cury | 1 |
| *não sabe/não respondeu* | 23 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-quaest-presidente-minas-gerais-26ago2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/flavio-tem-31-ante-30-de-lula-no-1o-turno-em-mg-diz-quaest/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Distrito Federal

### Quaest — 2026-08-24

Soma **41%** · faltam **59 pontos** · 6 candidato(s) na tabela · amostra 1104 · registro BR-02403/2026

| candidato | % |
|---|---|
| Ronaldo Caiado | 11 |
| Renan Santos | 3 |
| Escritor Augusto Cury | 2 |
| Pablo Marçal | 2 |
| Zema | 2 |
| Hertz Dias | 0 |
| *não sabe/não respondeu* | 21 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-quaest-presidente-df-25ago2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/lula-e-flavio-empatam-em-1o-turno-no-df-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Goiás

### Quaest — 2026-08-26

Soma **41%** · faltam **59 pontos** · 5 candidato(s) na tabela · amostra 804 · registro BR-07810/2026

| candidato | % |
|---|---|
| Ronaldo Caiado | 32 |
| Renan Santos | 2 |
| Zema | 2 |
| Escritor Augusto Cury | 1 |
| Rui Costa Pimenta | 0 |
| *não sabe/não respondeu* | 4 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-quaest-presidente-goias-27ago2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/caiado-lidera-disputa-pela-presidencia-em-goias-no-1o-turno/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · São Paulo · 2º turno

### Enfoque — 2026-08-10

Soma **41.9%** · faltam **58.1 pontos** · 1 candidato(s) na tabela · amostra 800 · registro BR-03656/2026

| candidato | % |
|---|---|
| Renan Santos | 12.5 |
| *não sabe/não respondeu* | 29.4 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### Enfoque — 2026-08-10

Soma **42.6%** · faltam **57.4 pontos** · 1 candidato(s) na tabela · amostra 800 · registro BR-03656/2026

| candidato | % |
|---|---|
| Zema | 16 |
| *não sabe/não respondeu* | 26.6 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Distrito Federal

### Instituto Gazeta de Pesquisas — 2026-07-19

Soma **42.7%** · faltam **57.3 pontos** · 6 candidato(s) na tabela · amostra 2000 · registro BR-07290/2026

| candidato | % |
|---|---|
| Ronaldo Caiado | 11.7 |
| Renan Santos | 3.3 |
| Joaquim Barbosa | 1.5 |
| Escritor Augusto Cury | 1.4 |
| Zema | 1.4 |
| Cabo Daciolo | 0.5 |
| *não sabe/não respondeu* | 22.9 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/07/igape-presidente-df-21jul2026.png
- Publicação: https://static.poder360.com.br/uploads/2026/07/igape-presidente-df-21jul2026.png

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Acre

### Data Control — 2026-02-03

Soma **43.7%** · faltam **56.3 pontos** · 4 candidato(s) na tabela · amostra 800 · registro BR-01513/2026|AC-02699/2026

| candidato | % |
|---|---|
| Lula | 18.9 |
| Ronaldo Caiado | 2.9 |
| Zema | 1.1 |
| Renan Santos | 0.3 |
| *branco/nulo* | 7.6 |
| *não sabe/não respondeu* | 12.9 |

- PDF do instituto: https://static.poder360.com.br/2026/02/pesquisa-datacontrol-acre-governador-8.fev_.2026pdf.pdf
- Publicação: https://static.poder360.com.br/2026/02/pesquisa-datacontrol-acre-governador-8.fev_.2026pdf.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### Instituto Travessia — 2026-08-06

Soma **44%** · faltam **56 pontos** · 3 candidato(s) na tabela · amostra 800 · registro BR-03113/2026

| candidato | % |
|---|---|
| Lula | 27 |
| Renan Santos | 2 |
| Zema | 1 |
| *branco/nulo* | 7 |
| *não sabe/não respondeu* | 7 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-presidencial-geral-Acre-Travessia-6ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-presidencial-geral-Acre-Travessia-6ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Amazonas

### Real Time Big Data — 2026-08-25

Soma **45%** · faltam **55 pontos** · 1 candidato(s) na tabela · amostra 1600 · registro BR-09140/2026

| candidato | % |
|---|---|
| Lula | 40 |
| *branco/nulo* | 3 |
| *não sabe/não respondeu* | 2 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/real-time-big-data-Amazonas-BR-09140-2026Ago26-1-1.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/omar-aziz-lidera-disputa-pelo-governo-do-amazonas-no-1o-turno/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Piauí

### Intenção Instituto de Pesquisa — 2026-07-24

Soma **45.7%** · faltam **54.3 pontos** · 1 candidato(s) na tabela · amostra 300 · registro PI-03190/2026

| candidato | % |
|---|---|
| Joel Rodrigues | 10 |
| *branco/nulo* | 0.67 |
| *não sabe/não respondeu* | 35 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/intencao-pesquisa-vilanovapiaui-PI-22-24jul2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/intencao-pesquisa-vilanovapiaui-PI-22-24jul2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Maranhão

### Veritá — 2026-08-11

Soma **47.6%** · faltam **52.4 pontos** · 2 candidato(s) na tabela · amostra 1000 · registro MA-01632/2026

| candidato | % |
|---|---|
| Orleans Brandão | 47.5 |
| Saulo Arcangeli | 0.1 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-verita-governador-maranhao-13ago2026.png
- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-verita-governador-maranhao-13ago2026.png

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Tocantins

### Real Time Big Data — 2026-08-25

Soma **49%** · faltam **51 pontos** · 3 candidato(s) na tabela · amostra 1600 · registro BR-06708/2026

| candidato | % |
|---|---|
| Flávio Bolsonaro | 36 |
| Ronaldo Caiado | 6 |
| Zema | 1 |
| *não sabe/não respondeu* | 6 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-tocantins-presidente-26ago2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/flavio-tem-45-contra-39-de-lula-no-2o-turno-no-to-diz-big-data/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pernambuco

### IRTB — 2026-08-07

Soma **49.1%** · faltam **50.9 pontos** · 2 candidato(s) na tabela · amostra 1200 · registro PE-05026/2026

| candidato | % |
|---|---|
| João Campos | 48 |
| Ivan Moraes | 0.33 |
| *não sabe/não respondeu* | 0.75 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-PE-revista-total-9ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-PE-revista-total-9ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Tocantins

### Lucro Ativo — 2026-04-12

Soma **51.1%** · faltam **48.9 pontos** · 5 candidato(s) na tabela · amostra 1600

| candidato | % |
|---|---|
| Professora Dorinha | 12.38 |
| Vicentinho Júnior | 7.79 |
| Laurez Moreira | 6 |
| Ataides de Oliveira | 1 |
| Amélio Cayres | 0.63 |
| *outros* | 6.28 |
| *não sabe/não respondeu* | 17 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_no_Tocantins

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Acre

### Real Time Big Data — 2026-07-25

Soma **53%** · faltam **47 pontos** · 1 candidato(s) na tabela · amostra 1600 · registro BR-08086/2026

| candidato | % |
|---|---|
| Flávio Bolsonaro | 50 |
| *não sabe/não respondeu* | 3 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/07/pesquisa-realtimebigdata-presidencial-acre-27jul26.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/flavio-tem-57-contra-34-de-lula-no-2o-turno-no-acre-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Bahia

### Ideia — 2026-08-18

Soma **55%** · faltam **45 pontos** · 2 candidato(s) na tabela · amostra 1500 · registro BA-09762/2026

| candidato | % |
|---|---|
| Jerônimo Rodrigues | 38 |
| Ronaldo Mansur | 1 |
| *não sabe/não respondeu* | 16 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-ideia-presidente-governo-senado-19ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-ideia-presidente-governo-senado-19ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio Grande do Norte

### Potengi/Media — 2026-07-24

Soma **58.4%** · faltam **41.6 pontos** · 2 candidato(s) na tabela · amostra 500 · registro RN-03002/2026

| candidato | % |
|---|---|
| Allyson | 21.2 |
| Cadu de Lula | 14.4 |
| *branco/nulo* | 6.6 |
| *não sabe/não respondeu* | 16.2 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/media-inteligencia-pesquisa-gov-rn-7ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/media-inteligencia-pesquisa-gov-rn-7ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pernambuco

### Brada Comunicação — 2026-07-29

Soma **60.9%** · faltam **39.1 pontos** · 1 candidato(s) na tabela · amostra 1500 · registro PE-06641/2026

| candidato | % |
|---|---|
| João Campos | 44.6 |
| *branco/nulo* | 7 |
| *não sabe/não respondeu* | 9.3 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/brada-pe-governo-7ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/brada-pe-governo-7ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Pernambuco

### Ipespe — 2026-07-25

Soma **61%** · faltam **39 pontos** · 2 candidato(s) na tabela · amostra 1000 · registro BR-08707/2026

| candidato | % |
|---|---|
| Lula | 58 |
| Ronaldo Caiado | 3 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/IPESPE-FolhaPE-estadual-25jul2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/IPESPE-FolhaPE-estadual-25jul2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Acre

### Phoenix — 2026-02-05

Soma **62.8%** · faltam **37.2 pontos** · 7 candidato(s) na tabela · amostra 605 · registro BR-07407/2026|AC-00770/2026

| candidato | % |
|---|---|
| Lula | 31.2 |
| Tarcísio | 8.4 |
| Ratinho Jr | 2.5 |
| Luciano Huck | 1.5 |
| Zema | 1.3 |
| Aldo Rebelo | 0.5 |
| Átila Maia | 0.3 |
| *branco/nulo* | 7.3 |
| *não sabe/não respondeu* | 9.8 |

- PDF do instituto: https://static.poder360.com.br/2026/02/pesquisa-institutophoenix-acre-presidente-6.fev_.2026.pdf
- Publicação: https://static.poder360.com.br/2026/02/pesquisa-institutophoenix-acre-presidente-6.fev_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio Grande do Norte

### Soluções — 2026-07-25

Soma **63.4%** · faltam **36.6 pontos** · 2 candidato(s) na tabela · amostra 1800 · registro RN-02277/2026

| candidato | % |
|---|---|
| Allyson | 38.8 |
| Cadu de Lula | 13.2 |
| *não sabe/não respondeu* | 11.4 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/TMC-pesquisa-RN-22-25jul2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/TMC-pesquisa-RN-22-25jul2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Pernambuco

### Quaest — 2026-08-24

Soma **64%** · faltam **36 pontos** · 2 candidato(s) na tabela · amostra 1302 · registro BR-04281/2026

| candidato | % |
|---|---|
| Lula | 54 |
| Escritor Augusto Cury | 1 |
| *não sabe/não respondeu* | 9 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-quaest-pernambuco-pernambuco-25ago2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/lula-tem-54-e-flavio-19-no-1o-turno-em-pe-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Mato Grosso do Sul

### Ranking — 2026-07-21

Soma **64%** · faltam **36 pontos** · 6 candidato(s) na tabela · amostra 1000 · registro MS-05958/2026

| candidato | % |
|---|---|
| Fábio Trad | 18 |
| Delcidio Amaral | 7 |
| João Henrique Catan | 5.6 |
| Economista Renato Gomes | 5 |
| Jeferson Bezerra | 0.8 |
| Lucien Rezende | 0.6 |
| *branco/nulo* | 14 |
| *não sabe/não respondeu* | 13 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/ranking-ms-gov-7ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/ranking-ms-gov-7ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Espírito Santo

### Real Time Big Data — 2026-07-21

Soma **65%** · faltam **35 pontos** · 6 candidato(s) na tabela · amostra 1600 · registro BR-00636/2026

| candidato | % |
|---|---|
| Flávio Bolsonaro | 36 |
| Zema | 6 |
| Renan Santos | 6 |
| Ronaldo Caiado | 2 |
| Joaquim Barbosa | 1 |
| Escritor Augusto Cury | 1 |
| *branco/nulo* | 8 |
| *não sabe/não respondeu* | 5 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/07/espirito-santo-presidenciavel-22jul2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes/flavio-tem-49-e-lula-43-no-2o-turno-no-es-diz-pesquisa

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

- PDF do instituto: https://static.poder360.com.br/2026/02/direct-pesquisa-goais-presidente-12.fev_.2026.pdf
- Publicação: https://static.poder360.com.br/2026/02/direct-pesquisa-goais-presidente-12.fev_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Rio Grande do Norte

### TN/Consult — 2026-08-10

Soma **66.6%** · faltam **33.4 pontos** · 6 candidato(s) na tabela · amostra 1700 · registro BR-09418/2026

| candidato | % |
|---|---|
| Lula | 42.41 |
| Ronaldo Caiado | 2.35 |
| Renan Santos | 1.65 |
| Escritor Augusto Cury | 0.82 |
| Rui Costa Pimenta | 0 |
| Hertz Dias | 0 |
| *branco/nulo* | 10.24 |
| *não sabe/não respondeu* | 9.12 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-consult-presidente-rn-14ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-consult-presidente-rn-14ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Goiás

### DataRD — 2026-08-04

Soma **66.7%** · faltam **33.3 pontos** · 3 candidato(s) na tabela · amostra 1509 · registro GO-08142/2026

| candidato | % |
|---|---|
| Wilder Morais | 24.7 |
| Marconi Perillo | 17.2 |
| Luis Cesar Bueno | 8.6 |
| *branco/nulo* | 8 |
| *não sabe/não respondeu* | 8.2 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/Governador.-GO.DataRDjpeg.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/Governador.-GO.DataRDjpeg.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pará

### Veritá — 2026-03-30

Soma **68.2%** · faltam **31.8 pontos** · 2 candidato(s) na tabela · amostra 1525

| candidato | % |
|---|---|
| Dr. Daniel | 18.7 |
| Hana Ghassan | 12.7 |
| *outros* | 36.8 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_no_Par%C3%A1

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Goiás

### DataRD — 2026-08-04

Soma **69%** · faltam **31 pontos** · 3 candidato(s) na tabela · amostra 1509 · registro BR-07847/2026

| candidato | % |
|---|---|
| Flávio Bolsonaro | 34.7 |
| Ronaldo Caiado | 29.7 |
| Renan Santos | 2.4 |
| *não sabe/não respondeu* | 2.2 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-datard-presidente-go-6ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-datard-presidente-go-6ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe

### ECM Sergipe — 2026-08-12

Soma **70.5%** · faltam **29.5 pontos** · 4 candidato(s) na tabela · amostra 1500

| candidato | % |
|---|---|
| Fábio | 37 |
| Valmir de Francisquinho | 23.8 |
| Ricardo Marques | 7.6 |
| Emanuel Cacho | 1 |
| *outros* | 1.13 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Sergipe

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

- PDF do instituto: https://static.poder360.com.br/2026/02/pesquisa-portalgoias-goias-presidente-10.fev_.2026.pdf
- Publicação: https://static.poder360.com.br/2026/02/pesquisa-portalgoias-goias-presidente-10.fev_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · São Paulo

### Enfoque — 2026-08-10

Soma **71.1%** · faltam **28.9 pontos** · 4 candidato(s) na tabela · amostra 800 · registro BR-03656/2026

| candidato | % |
|---|---|
| Flávio Bolsonaro | 26.9 |
| Lula | 26.8 |
| Ronaldo Caiado | 2.3 |
| Renan Santos | 1.3 |
| *não sabe/não respondeu* | 13.8 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Goiás

### Portal Goiás — 2026-02-03

Soma **71.4%** · faltam **28.6 pontos** · 4 candidato(s) na tabela · amostra 500 · registro GO-05001/2026

| candidato | % |
|---|---|
| Marconi Perillo | 20.6 |
| Adriana Accorsi | 9.4 |
| Wilder Morais | 8.4 |
| Telemaco Brandão | 1.6 |
| *não sabe/não respondeu* | 31.4 |

- PDF do instituto: https://static.poder360.com.br/2026/02/pesquisa-portalgoias-goias-presidente.10.fev_.2026pdf.pdf
- Publicação: https://static.poder360.com.br/2026/02/pesquisa-portalgoias-goias-presidente.10.fev_.2026pdf.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Tocantins

### Lucro Ativo — 2026-07-25

Soma **72.4%** · faltam **27.6 pontos** · 3 candidato(s) na tabela · amostra 1500 · registro TO-00437/2026

| candidato | % |
|---|---|
| Professora Dorinha | 37.4 |
| Laurez Moreira | 9.6 |
| Ataides de Oliveira | 2.87 |
| *branco/nulo* | 2.4 |
| *não sabe/não respondeu* | 20.13 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/Governador-TO-25.jul_.2026-LucroAtivo.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/Governador-TO-25.jul_.2026-LucroAtivo.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Goiás

### Instituto Gazeta de Pesquisas — 2026-07-27

Soma **73.2%** · faltam **26.8 pontos** · 2 candidato(s) na tabela · amostra 600 · registro GO-01528/2026

| candidato | % |
|---|---|
| Marconi Perillo | 21.7 |
| Luis Cesar Bueno | 3.8 |
| *não sabe/não respondeu* | 47.7 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/igape-goiais-luziana-estadual-24-27jul2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/igape-goiais-luziana-estadual-24-27jul2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · São Paulo · 2º turno

### Enfoque — 2026-08-10

Soma **73.9%** · faltam **26.1 pontos** · 2 candidato(s) na tabela · amostra 800 · registro BR-03656/2026

| candidato | % |
|---|---|
| Lula | 30.5 |
| Ronaldo Caiado | 16.2 |
| *não sabe/não respondeu* | 27.2 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/Enfoque-Presidente-BR-11.ago_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Santa Catarina

### Data Povo — 2026-07-23

Soma **74.6%** · faltam **25.4 pontos** · 5 candidato(s) na tabela · amostra 1008 · registro BR-05953/2026

| candidato | % |
|---|---|
| Flávio Bolsonaro | 47.4 |
| Renan Santos | 7.2 |
| Zema | 6.7 |
| Ronaldo Caiado | 5 |
| Escritor Augusto Cury | 1.3 |
| *branco/nulo* | 2.9 |
| *não sabe/não respondeu* | 4.1 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/07/Correio-do-Povo-Presidente-SC-Julho.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/07/Correio-do-Povo-Presidente-SC-Julho.pdf

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

- PDF do instituto: https://static.poder360.com.br/uploads/2026/07/Pesquisa-Genial-Quaest-RS-jul-2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/pesquisa-mostra-empate-entre-5-candidatos-ao-senado-no-rs/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Paraíba

### DataTrends — 2026-07-29

Soma **76%** · faltam **24 pontos** · 3 candidato(s) na tabela · amostra 1200 · registro PB-09547/2026

| candidato | % |
|---|---|
| Lucas Ribeiro | 34 |
| Cícero Lucena | 27 |
| Efraim Filho | 15 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-datatrend-governador-pb-1ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-datatrend-governador-pb-1ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### Índice — 2026-05-29

Soma **76%** · faltam **24 pontos** · 3 candidato(s) na tabela · amostra 2000

| candidato | % |
|---|---|
| Cícero Lucena | 34.3 |
| Lucas Ribeiro | 26.6 |
| Efraim Filho | 15.1 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_na_Para%C3%ADba

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Santa Catarina

### Mapa/Jovem Pan — 2026-06-11

Soma **76.7%** · faltam **23.3 pontos** · 3 candidato(s) na tabela · amostra 1008

| candidato | % |
|---|---|
| Jorginho Mello | 54.9 |
| João Rodrigues | 15.3 |
| Gelson Merísio | 5.1 |
| *outros* | 1.4 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Santa_Catarina

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Pernambuco

### Múltipla — 2026-02-07

Soma **77%** · faltam **23 pontos** · 2 candidato(s) na tabela · amostra 1200 · registro PE-01312/2026|BR-03057/2026

| candidato | % |
|---|---|
| Lula | 50 |
| Eduardo Leite | 1 |
| *branco/nulo* | 14 |
| *não sabe/não respondeu* | 12 |

- PDF do instituto: https://static.poder360.com.br/2026/02/Pesquisa-Institutomultipla-pernambuco-presidente-12.fev_.2026.pdf
- Publicação: https://static.poder360.com.br/2026/02/Pesquisa-Institutomultipla-pernambuco-presidente-12.fev_.2026.pdf

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
| Fábio | 40.8 |
| Valmir de Francisquinho | 30.3 |
| Ricardo Marques | 5.3 |
| Emanuel Cacho | 0.8 |
| *outros* | 0.4 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Sergipe

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Paraíba

### Real Time Big Data — 2026-08-22

Soma **78%** · faltam **22 pontos** · 4 candidato(s) na tabela · amostra 1600 · registro PB-07790/2026

| candidato | % |
|---|---|
| Lucas Ribeiro | 35 |
| Cícero Lucena | 25 |
| Camilo Duarte | 1 |
| Yuri Ezequiel | 1 |
| *branco/nulo* | 9 |
| *não sabe/não respondeu* | 7 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/realtime-big-data-paraiba-governador-presidente-24ago.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/ribeiro-tem-42-contra-35-de-lucena-no-2o-turno-na-pb-diz-pesquisa/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Piauí · 2º turno

### AtlasIntel — 2026-03-15

Soma **78%** · faltam **22 pontos** · 2 candidato(s) na tabela · amostra 1208 · registro PI-06908/2026

| candidato | % |
|---|---|
| Rafael Fonteles | 63 |
| Mainha | 15 |

- PDF do instituto: https://static.poder360.com.br/2026/03/Pesquisa-AtlasIntel-Eleicoes-Piaui-2026-260317-1.pdf
- Publicação: https://www.poder360.com.br/poder-pesquisas/fonteles-e-aprovado-por-61-e-desaprovado-por-34-no-piaui/

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

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/datatrends-gov-pb-7ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/datatrends-gov-pb-7ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Distrito Federal

### Instituto Gazeta de Pesquisas — 2026-08-15

Soma **81.4%** · faltam **18.6 pontos** · 4 candidato(s) na tabela · amostra 2000 · registro DF-02390/2026

| candidato | % |
|---|---|
| Celina Leão | 33.4 |
| Arruda | 23.7 |
| Cappelli | 3.5 |
| Professor Robson | 1.4 |
| *não sabe/não respondeu* | 19.4 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/Relatorio-IGAPE-DF-AGOSTO-2026-COMPLETO.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/Relatorio-IGAPE-DF-AGOSTO-2026-COMPLETO.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio Grande do Norte

### Exatus — 2026-07-10

Soma **82.3%** · faltam **17.7 pontos** · 5 candidato(s) na tabela · amostra 1500 · registro BR-07763/2026

| candidato | % |
|---|---|
| Allyson | 41.78 |
| Álvaro Dias | 26.05 |
| Cadu de Lula | 13.74 |
| Dário Barbosa | 0.49 |
| Professor Roberio Paulino | 0.26 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/Grupo-Agora-RN-Presidente-.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/Grupo-Agora-RN-Presidente-.pdf

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

- PDF do instituto: https://static.poder360.com.br/2025/09/Atlas-RJ-pesquisa-ago2025-1.pdf
- Publicação: https://www.poder360.com.br/poder-pesquisas/paes-tem-439-das-intencoes-de-voto-ao-governo-do-rj-diz-atlasintel/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe

### CTAS — 2026-07-24

Soma **83.7%** · faltam **16.3 pontos** · 4 candidato(s) na tabela · amostra 1224

| candidato | % |
|---|---|
| Fábio | 45.4 |
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
| Arruda | 40.1 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-opiniao-consultoria-governador-1ago2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/pesquisa-opiniao-consultoria-governador-1ago2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Piauí · 2º turno

### AtlasIntel — 2026-03-15

Soma **84%** · faltam **16 pontos** · 2 candidato(s) na tabela · amostra 1208 · registro PI-06908/2026

| candidato | % |
|---|---|
| Rafael Fonteles | 60 |
| Margarete Coelho | 24 |

- PDF do instituto: https://static.poder360.com.br/2026/03/Pesquisa-AtlasIntel-Eleicoes-Piaui-2026-260317-1.pdf
- Publicação: https://www.poder360.com.br/poder-pesquisas/fonteles-e-aprovado-por-61-e-desaprovado-por-34-no-piaui/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

### AtlasIntel — 2026-03-15

Soma **84%** · faltam **16 pontos** · 2 candidato(s) na tabela · amostra 1208 · registro PI-06908/2026

| candidato | % |
|---|---|
| Rafael Fonteles | 62 |
| Toni Rodrigues | 22 |

- PDF do instituto: https://static.poder360.com.br/2026/03/Pesquisa-AtlasIntel-Eleicoes-Piaui-2026-260317-1.pdf
- Publicação: https://www.poder360.com.br/poder-pesquisas/fonteles-e-aprovado-por-61-e-desaprovado-por-34-no-piaui/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Mato Grosso do Sul · 2º turno

### Real Time Big Data — 2026-05-11

Soma **85%** · faltam **15 pontos** · 2 candidato(s) na tabela · amostra 1600 · registro MS-06412/2026

| candidato | % |
|---|---|
| Eduardo Riedel | 55 |
| Economista Renato Gomes | 17 |
| *branco/nulo* | 13 |

- PDF do instituto: https://static.poder360.com.br/2026/05/Mato-Grosso-do-Sul-MS-064122026-MAI26.pdf
- Publicação: https://www.poder360.com.br/poder-pesquisas/eduardo-riedel-lidera-disputa-pelo-governo-de-ms-diz-real-time/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Goiás

### Instituto Gazeta de Pesquisas — 2026-07-25

Soma **85.2%** · faltam **14.8 pontos** · 4 candidato(s) na tabela · amostra 500 · registro GO-07670/2026

| candidato | % |
|---|---|
| Gustavo Mendanha | 5 |
| Vanderlan Cardoso | 2.8 |
| Dr. Zacharias Calil | 2.2 |
| Telemaco Brandão | 1 |
| *não sabe/não respondeu* | 74.2 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/igape-goias-estadual-ago-2026.pdf
- Publicação: https://static.poder360.com.br/uploads/2026/08/igape-goias-estadual-ago-2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe

### W1 — 2026-07-18

Soma **85.3%** · faltam **14.7 pontos** · 3 candidato(s) na tabela · amostra 1000

| candidato | % |
|---|---|
| Fábio | 46.2 |
| Valmir de Francisquinho | 34 |
| Ricardo Marques | 5.1 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Sergipe

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Rondônia

### Phoenix — 2026-01-20

Soma **86%** · faltam **14 pontos** · 6 candidato(s) na tabela · amostra 1603 · registro RO-00828/2026

| candidato | % |
|---|---|
| Lula | 39.3 |
| Tarcísio | 23.4 |
| Luciano Huck | 13.1 |
| Ratinho Jr | 5.8 |
| Zema | 3.9 |
| Átila Maia | 0.5 |
| *branco/nulo* | 0 |
| *não sabe/não respondeu* | 0 |

- PDF do instituto: https://static.poder360.com.br/2026/01/pesquisa-institutophoenix-rondonia-20.jan_.2026presidente-.pdf
- Publicação: https://static.poder360.com.br/2026/01/pesquisa-institutophoenix-rondonia-20.jan_.2026presidente-.pdf

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

## Presidente · Ceará

### Paraná Pesquisas — 2026-02-28

Soma **86.7%** · faltam **13.3 pontos** · 7 candidato(s) na tabela · amostra 1500 · registro BR-02410/2026

| candidato | % |
|---|---|
| Lula | 52.2 |
| Flávio Bolsonaro | 27.3 |
| Ratinho Jr | 3.1 |
| Tereza Cristina | 1.7 |
| Zema | 1.2 |
| Renan Santos | 0.9 |
| Aldo Rebelo | 0.3 |

- PDF do instituto: https://static.poder360.com.br/2026/03/paranapesquisas-ceara-3mar2026.pdf
- Publicação: https://www.poder360.com.br/poder-governo/lula-e-aprovado-por-57-e-desaprovado-por-40-no-ceara/

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe · 2º turno

### IFP — 2026-08-21

Soma **86.8%** · faltam **13.2 pontos** · 2 candidato(s) na tabela · amostra 1314

| candidato | % |
|---|---|
| Fábio | 43.45 |
| Valmir de Francisquinho | 32.16 |
| *não sabe/não respondeu* | 11.19 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Sergipe

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe

### JR Comunicações, Serviços a Pesquisas — 2026-04-27

Soma **87.3%** · faltam **12.7 pontos** · 3 candidato(s) na tabela · amostra 1312

| candidato | % |
|---|---|
| Valmir de Francisquinho | 44.59 |
| Fábio | 37.27 |
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

- PDF do instituto: https://static.poder360.com.br/2026/04/Anova_Pesquisa_MAR2026.pdf
- Publicação: https://static.poder360.com.br/2026/04/Anova_Pesquisa_MAR2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Sergipe

### W1 — 2026-04-20

Soma **87.7%** · faltam **12.3 pontos** · 4 candidato(s) na tabela · amostra 1000

| candidato | % |
|---|---|
| Valmir de Francisquinho | 39.9 |
| Fábio | 35.3 |
| Ricardo Marques | 9.8 |
| Emanuel Cacho | 0.7 |
| *outros* | 2 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_em_Sergipe

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Goiás

### Portal Goiás — 2026-02-21

Soma **88%** · faltam **12 pontos** · 6 candidato(s) na tabela · amostra 600 · registro GO-09003/2026

| candidato | % |
|---|---|
| Ronaldo Caiado | 41.8 |
| Flávio Bolsonaro | 24.8 |
| Lula | 17.8 |
| Ratinho Jr | 2 |
| Zema | 1.3 |
| Renan Santos | 0.3 |

- PDF do instituto: https://static.poder360.com.br/2026/02/pesquisa-portalgoias-goias-presidente-24.fev_.2026.pdf
- Publicação: https://static.poder360.com.br/2026/02/pesquisa-portalgoias-goias-presidente-24.fev_.2026.pdf

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Pará

### Simetria — 2026-05-04

Soma **88%** · faltam **12 pontos** · 5 candidato(s) na tabela · amostra 1200

| candidato | % |
|---|---|
| Dr. Daniel | 28 |
| Hana Ghassan | 24 |
| Mário Couto | 8 |
| Cléber Rabelo | 4 |
| Araceli | 2 |
| *não sabe/não respondeu* | 22 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_no_Par%C3%A1

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Governador · Rio Grande do Norte

### DataCapital — 2026-08-18

Soma **88.4%** · faltam **11.6 pontos** · 3 candidato(s) na tabela · amostra 2100

| candidato | % |
|---|---|
| Allyson | 41.8 |
| Álvaro Dias | 26.3 |
| Cadu de Lula | 20.3 |

- Página da Wikipédia: https://pt.wikipedia.org/wiki/Pesquisas_eleitorais_para_a_elei%C3%A7%C3%A3o_estadual_de_2026_no_Rio_Grande_do_Norte

- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar

## Presidente · Rio de Janeiro · 2º turno

### 100% Cidades Participações — 2026-07-28

Soma **89%** · faltam **11 pontos** · 2 candidato(s) na tabela · amostra 1000 · registro BR-05425/2026

| candidato | % |
|---|---|
| Lula | 44.9 |
| Flávio Bolsonaro | 44.1 |

- PDF do instituto: https://static.poder360.com.br/uploads/2026/08/pesquisa-futura-riodejaneiro-jul2026.pdf
- Publicação: https://www.poder360.com.br/poder-eleicoes-2026/lula-e-flavio-empatam-em-2o-turno-no-rj-diz-pesquisa/

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

