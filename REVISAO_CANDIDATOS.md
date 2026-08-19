# Revisão de identidade de candidatos

Gerado por `node scripts/candidate-review.mjs`. **Nada aqui foi aplicado.** Cada par
precisa de uma decisão sua; a coluna de sugestão é só ordenação, não autoridade.

## Como esta lista foi montada

Pares de nomes que (a) disputam o **mesmo cargo no mesmo estado**, (b) **compartilham
um token de nome** e (c) **nunca aparecem juntos na mesma pesquisa**. O critério (c) é o
filtro forte: dois nomes na mesma pesquisa são necessariamente pessoas diferentes.

**O critério não separa mesma-pessoa de mesma-família.** Ele encontra
`Tião Bocalom × Sebastião Bocalom` (uma pessoa) e `Jair × Flávio × Michelle × Eduardo
Bolsonaro` (quatro pessoas, candidaturas alternativas, por isso nunca coincidem) com o
mesmo sinal. Nenhuma regra de string distingue os dois casos — foi assim que
`sameCandidate()` fundiu "Ciro Nogueira" em "Ciro". Por isso a decisão é humana.

### A evidência que mais pesa — e por que ela sozinha não basta

**Campo gêmeo**: o mesmo instituto pesquisando a mesma disputa em ±3 dias, citando um
nome e não o outro. Costuma ser uma operação de campo chegando até nós com duas
grafias — foi o que resolveu o caso Bocalom. Quando aparece, está destacado no par.

**Mas ela produz falso positivo.** `Ciro × Ciro Nogueira` tem campo gêmeo e são pessoas
diferentes — é exatamente a fusão que `sameCandidate()` já fez uma vez. A diferença
está no resto da evidência: em Bocalom as **trajetórias partidárias coincidem** (PL até
fev/26, PSDB depois, nas duas grafias); em Ciro elas se **contradizem** (PDT/PSDB contra
PP) e as médias ficam a 13 pontos uma da outra. Campo gêmeo é motivo para olhar, nunca
para decidir.

Leia sempre junto: **trajetória partidária** (a mesma troca de partido nas mesmas datas
é o sinal mais confiável), **média %** (ordens de grandeza distintas desmentem a fusão),
**institutos em comum**, e **período** (`sobreposto` favorece mesma pessoa com grafias
concorrentes; `disjunto` pode ser troca de nome **ou** substituição de candidato).

## Resumo

| Sugestão | Pares |
|---|---|
| Variação de grafia — provável MESMA pessoa | 17 |
| Título ou apelido — provável MESMA pessoa | 90 |
| Indefinido — precisa de fonte primária | 28 |
| Só o primeiro nome em comum — provável PESSOAS DIFERENTES | 38 |
| Sobrenome em comum — provável PESSOAS DIFERENTES | 65 |
| **Total** | **238** |

Com campo gêmeo (evidência mais forte): **79** par(es).

## Como aplicar as decisões

Não mexa em `sameCandidate()`. As decisões viram uma **tabela de apelidos curada**, no
mesmo espírito de `data/repairs.json`: `candidates.ndjson` já tem `aliases`, falta o
`merged_into` que os institutos têm. Com a tabela no lugar, a resolução passa a ser um
índice determinístico e o caminho fuzzy pode ser **apagado**, não ajustado.

Vale acrescentar um guarda duro no validador: **dois apelidos do mesmo candidato na
mesma pergunta é prova de fusão errada** — é o teste que teria pego o caso Ciro.

## Decida em conjunto

Estes nomes formam grupos ligados — decidir par a par pode fazer você fundir A com B
e C com A, afirmando que B = C sem nunca ter olhado esse par.

- `Presidente` — **Ciro** · **Ciro Gomes** · **Ciro Nogueira** · **Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro** · **Eduardo Bolsonaro** · **Flávio Bolsonaro** · **Jair Bolsonaro** · **Jair Messias Bolsonaro** · **Michelle Bolsonaro** · **Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro** · **Ratinho Jr** · **Ratinho Jr.** · **Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro** · **Ratinho Júnior** · **Romeu Zema** · **Romeu Zema, com apoio do ex-presidente Jair Bolsonaro** · **Ronaldo Caiado** · **Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro** · **Tallis Gomes** · **Tarcísio de Freitas** · **Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro** · **Tereza Cristina** · **Tereza Cristina, ex-presidente Jair Bolsonaro** (79 pares abaixo)
- `Senado · SP` — **Alexandre Luiz Giordano** · **Alexandre Padilha** · **Capitão Derrite** · **Guilherme Boulos** · **Guilherme Derrite** · **Guilherme Giordano** · **Luiz Marinho** (6 pares abaixo)
- `Senado · TO` — **Carlos Caguin** · **Carlos Eduardo Torres Gomes** · **Carlos Gaguim** · **Carlos Velozo** · **Eduardo Gomes** (4 pares abaixo)
- `Governador · PI` — **Jesus Rodrigues** · **Joel Rodrigues** · **Joel Rodrigues da Silva** · **Jornalista Toni Rodrigues** · **Toni Rodrigues** (6 pares abaixo)
- `Senado · GO` — **Delegado Humberto** · **Delegado Humberto Teófilo** · **Humberto Chaves** (3 pares abaixo)
- `Senado · BA` — **Delliana Ribeiro** · **Delliana Ricelli** · **Professora Delliana** (3 pares abaixo)
- `Senado · BA` — **Marcelo Carvalho** · **Marcelo Nilo** · **Marcelo Santtana** (2 pares abaixo)
- `Governador · MS` — **Jeferson Bezerra** · **Jefferson Bezerra** · **Jefferson Bezzerra** (2 pares abaixo)
- `Governador · CE` — **Jair Pereira** · **Jarir Pereira** · **Professor Jarir Pereira** (3 pares abaixo)
- `Presidente` — **Luiz Felipe d'Avila** · **Luiz Inácio Lula da Silva** · **Lula** (2 pares abaixo)
- `Governador · TO` — **Carlos Amastha** · **Carlos Eduardo Torres Gomes** · **Eduardo Gomes** (2 pares abaixo)
- `Governador · RN` — **Alvaro Dias** · **Álvaro Costa Dias** · **Álvaro Dias** (3 pares abaixo)
- `Governador · SP` — **Flávio Bolsonaro** · **Tarcísio de Freitas** · **Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro** (2 pares abaixo)
- `Senado · CE` — **Guimarães do PT** · **José Guimarães** · **José Nobre Guimarães** (3 pares abaixo)
- `Senado · PR` — **Alvaro Dias** · **Osmar Dias** · **Álvaro Dias** (2 pares abaixo)
- `Senado · PE` — **Silvio Costa Filho** · **Silvio Nascimento** · **sílvio costa Filho** (3 pares abaixo)
- `Governador · PA` — **Daniel Santos** · **Dr Daniel** · **Dr. Daniel** (3 pares abaixo)
- `Governador · BA` — **José Aleluia** · **José Carlos Aleluia** · **José Carlos do Pátio** (3 pares abaixo)
- `Senado · RO` — **Delegado Camargo** · **Rodrigo Camargo** · **Rodrigo Camargo Ribeiro Pinho** (3 pares abaixo)
- `Senado · PI` — **Antonio Barros** · **Antonio José Lira** · **Antônio José Lira** (2 pares abaixo)

---

## Variação de grafia — provável MESMA pessoa

Diferença de 1–2 caracteres com o mesmo número de tokens — tipicamente erro de
digitação da fonte. Ainda assim, confirme: `Bady`/`Baldy` e `Medanha`/`Mendanha`
são plausíveis como pessoas distintas até você olhar.

### Zacarias Calil × Zacharias Calil

`Senado · GO` · token em comum: `calil` · distância de edição: 1 · período: contido

| | Zacarias Calil | Zacharias Calil |
|---|---|---|
| pesquisas | 22 | 12 |
| período | 2025-12-05 → 2026-08-12 | 2026-01-01 → 2026-07-30 |
| média % | 15.9 | 8.6 |
| partidos | MDB 2025-12-05→2026-08-12 | União Brasil 2026-01-01→2026-02-21 · MDB 2026-07-08→2026-07-30 |
| institutos | Paraná Pesquisas (4), Directa (3), Exata GO (2), Quaest (2), +8 | Direct Pesquisas (7), Portal Goiás (3), Real Time Big Data (1), Instituto Gazeta de Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (MDB)** · diferença entre as médias: 7.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Portal Goiás, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Mateus Simões × Matheus Simões

`Governador · MG` · token em comum: `simoes` · distância de edição: 1 · período: sobreposto

| | Mateus Simões | Matheus Simões |
|---|---|---|
| pesquisas | 10 | 10 |
| período | 2026-03-07 → 2026-06-23 | 2025-08-17 → 2026-07-29 |
| média % | 13.1 | 14.2 |
| partidos | PSD 2026-03-07→2026-06-23 | Novo 2025-08-17→2025-10-05 · PSD 2025-12-09→2026-07-29 |
| institutos | DataTempo (2), Real Time Big Data (2), Futura (1), Veritá (1), +4 | Quaest (5), AtlasIntel (2), Real Time Big Data (2), Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 1.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Paraná Pesquisas, AtlasIntel.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Bady × Alexandre Baldy

`Senado · GO` · token em comum: `alexandre` · distância de edição: 1 · período: sobreposto

| | Alexandre Bady | Alexandre Baldy |
|---|---|---|
| pesquisas | 8 | 17 |
| período | 2026-01-01 → 2026-02-21 | 2025-12-05 → 2026-06-30 |
| média % | 3.1 | 8.9 |
| partidos | PP 2026-01-01→2026-02-21 · DC 2026-02-03→2026-02-11 | PP 2025-12-05→2026-06-30 |
| institutos | Direct Pesquisas (5), Portal Goiás (3) | Paraná Pesquisas (3), Real Time Big Data (2), Directa (2), Quaest (1), +9 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PP)** · diferença entre as médias: 5.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Direct Pesquisas, Portal Goiás.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Gustavo Medanha × Gustavo Mendanha

`Senado · GO` · token em comum: `gustavo` · distância de edição: 1 · período: sobreposto

| | Gustavo Medanha | Gustavo Mendanha |
|---|---|---|
| pesquisas | 7 | 14 |
| período | 2026-01-01 → 2026-02-11 | 2025-12-05 → 2026-08-12 |
| média % | 9.4 | 12.3 |
| partidos | PSD 2026-01-01→2026-01-30 · MDB 2026-02-03→2026-02-11 | PSD 2025-12-05→2026-02-06 · MDB 2026-02-21→2026-02-21 · PRD 2026-05-16→2026-08-12 |
| institutos | Direct Pesquisas (5), Portal Goiás (2) | Directa (3), Portal Goiás (2), Paraná Pesquisas (2), Quaest (1), +6 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSD, MDB)** · diferença entre as médias: 2.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Direct Pesquisas, Portal Goiás.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Euclydes Pettersen × Euclydes Petterson

`Senado · MG` · token em comum: `euclydes` · distância de edição: 1 · período: contido

| | Euclydes Pettersen | Euclydes Petterson |
|---|---|---|
| pesquisas | 4 | 4 |
| período | 2026-03-11 → 2026-07-29 | 2025-08-25 → 2026-07-26 |
| média % | 4.0 | 3.2 |
| partidos | Republicanos 2026-03-11→2026-07-29 | Republicanos 2025-08-25→2026-07-26 · PSB 2026-04-26→2026-04-26 |
| institutos | Veritá (2), Real Time Big Data (2) | Quaest (2), AtlasIntel (1), Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 0.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Wiliam Siri × William Siri

`Governador · RJ` · token em comum: `siri` · distância de edição: 1 · período: contido

| | Wiliam Siri | William Siri |
|---|---|---|
| pesquisas | 3 | 9 |
| período | 2026-02-13 → 2026-07-30 | 2026-03-10 → 2026-07-29 |
| média % | 1.4 | 3.0 |
| partidos | PSOL 2026-02-13→2026-07-30 | PSOL 2026-03-10→2026-07-29 |
| institutos | Paraná Pesquisas (1), Quaest (1), Prefab (1) | Paraná Pesquisas (3), Real Time Big Data (2), Veritá (2), Prefab (1), +1 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 1.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Quaest, Prefab.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jacques Wagner × Jaques Wagner

`Senado · BA` · token em comum: `wagner` · distância de edição: 1 · período: sobreposto

| | Jacques Wagner | Jaques Wagner |
|---|---|---|
| pesquisas | 2 | 17 |
| período | 2025-11-25 → 2026-02-21 | 2024-02-21 → 2026-08-10 |
| média % | 18.6 | 27.7 |
| partidos | PT 2025-11-25→2026-02-21 | PT 2024-02-21→2026-08-10 |
| institutos | Real Time Big Data (1), Instituto TML (1) | Paraná Pesquisas (5), Quaest (3), Real Time Big Data (2), Veritá (2), +5 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 9.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Instituto TML.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Luis Cesar Bueno × Luiz César Bueno

`Governador · GO` · token em comum: `cesar, bueno` · distância de edição: 1 · período: contido

| | Luis Cesar Bueno | Luiz César Bueno |
|---|---|---|
| pesquisas | 12 | 2 |
| período | 2026-05-17 → 2026-08-12 | 2026-07-08 → 2026-08-04 |
| média % | 4.5 | 6.3 |
| partidos | PT 2026-05-17→2026-08-12 | PT 2026-07-08→2026-08-04 |
| institutos | Diagnóstico/Acieg (2), Portal Goiás (2), Paraná Pesquisas (2), Quaest (1), +5 | Real Time Big Data (1), DataRD (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 1.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): DataRD.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jeferson Bezerra × Jefferson Bezerra

`Governador · MS` · token em comum: `bezerra` · distância de edição: 1 · período: sobreposto

| | Jeferson Bezerra | Jefferson Bezerra |
|---|---|---|
| pesquisas | 2 | 11 |
| período | 2026-07-21 → 2026-07-26 | 2026-04-10 → 2026-08-12 |
| média % | 0.9 | 1.0 |
| partidos | Agir 2026-07-21→2026-07-26 | Agir 2026-04-10→2026-08-12 |
| institutos | Ranking (2) | Ranking (4), Novo Ibrape (2), Real Time Big Data (2), IPR (2), +1 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (AGIR)** · diferença entre as médias: 0.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Ranking.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Marcel van Hattem × Marcel van Hatten

`Senado · RS` · token em comum: `marcel, van` · distância de edição: 1 · período: contido

| | Marcel van Hattem | Marcel van Hatten |
|---|---|---|
| pesquisas | 15 | 2 |
| período | 2025-10-31 → 2026-07-28 | 2025-11-24 → 2026-02-10 |
| média % | 30.0 | 21.9 |
| partidos | Novo 2025-10-31→2026-07-28 | Novo 2025-11-24→2026-02-10 |
| institutos | Brasmarket (4), Veritá (3), Quaest (2), Futura (2), +3 | 100% Cidades Participações (1), Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 8.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Emanoel Cacho × Emanuel Cacho

`Governador · SE` · token em comum: `cacho` · distância de edição: 1 · período: disjunto

| | Emanoel Cacho | Emanuel Cacho |
|---|---|---|
| pesquisas | 1 | 15 |
| período | 2026-02-07 → 2026-02-07 | 2026-04-04 → 2026-08-12 |
| média % | 11.5 | 0.9 |
| partidos | PSD 2026-02-07→2026-02-07 | PSDB 2026-04-04→2026-08-12 |
| institutos | França (1) | INOR (3), CTAS (2), Real Time Big Data (2), W1 (2), +5 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 10.6 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Caguin × Carlos Gaguim

`Senado · TO` · token em comum: `carlos` · distância de edição: 2 · período: disjunto

| | Carlos Caguin | Carlos Gaguim |
|---|---|---|
| pesquisas | 1 | 13 |
| período | 2025-04-08 → 2025-04-08 | 2025-08-03 → 2026-07-31 |
| média % | 11.6 | 16.6 |
| partidos | União Brasil 2025-04-08→2025-04-08 | União Brasil 2025-08-03→2026-07-31 |
| institutos | Paraná Pesquisas (1) | Real Time Big Data (3), Paraná Pesquisas (2), Lucro Ativo (2), Brasmarketing (1), +5 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (UNIAO BRASIL)** · diferença entre as médias: 5.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Pereira × Jarir Pereira

`Governador · CE` · token em comum: `pereira` · distância de edição: 1 · período: disjunto

| | Jair Pereira | Jarir Pereira |
|---|---|---|
| pesquisas | 1 | 13 |
| período | 2026-02-03 → 2026-02-03 | 2026-03-24 → 2026-07-28 |
| média % | 1.0 | 1.0 |
| partidos | PSOL 2026-02-03→2026-02-03 | PSOL 2026-03-24→2026-07-28 |
| institutos | Real Time Big Data (1) | Veritá (3), Real Time Big Data (3), AtlasIntel (2), Ipec (2), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 0.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jefferson Bezerra × Jefferson Bezzerra

`Governador · MS` · token em comum: `jefferson` · distância de edição: 1 · período: contido

| | Jefferson Bezerra | Jefferson Bezzerra |
|---|---|---|
| pesquisas | 11 | 1 |
| período | 2026-04-10 → 2026-08-12 | 2026-02-06 → 2026-02-06 |
| média % | 1.0 | 0.6 |
| partidos | Agir 2026-04-10→2026-08-12 | Agir 2026-02-06→2026-02-06 |
| institutos | Ranking (4), Novo Ibrape (2), Real Time Big Data (2), IPR (2), +1 | Ranking (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (AGIR)** · diferença entre as médias: 0.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Ranking.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Paulo Octávio × Paulo Otávio

`Senado · DF` · token em comum: `paulo` · distância de edição: 1 · período: contido

| | Paulo Octávio | Paulo Otávio |
|---|---|---|
| pesquisas | 4 | 1 |
| período | 2026-07-31 → 2026-08-15 | 2025-12-08 → 2025-12-08 |
| média % | 10.5 | 5.0 |
| partidos | PSD 2026-07-31→2026-08-15 | PSD 2025-12-08→2025-12-08 |
| institutos | Phoenix (1), Brada Comunicação (1), Igape (1), Correio/Opinião (1) | Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 5.5 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Érica kokay × Érika Kokay

`Senado · DF` · token em comum: `kokay` · distância de edição: 1 · período: disjunto

| | Érica kokay | Érika Kokay |
|---|---|---|
| pesquisas | 1 | 11 |
| período | 2025-12-08 → 2025-12-08 | 2026-03-19 → 2026-08-15 |
| média % | 10.0 | 20.8 |
| partidos | PT 2025-12-08→2025-12-08 | PT 2026-03-19→2026-08-15 |
| institutos | Real Time Big Data (1) | Igape (3), Phoenix (2), Veritá (2), França (1), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 10.8 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Marcelo Queiroga × Marcelo Queiroz

`Senado · PB` · token em comum: `marcelo` · distância de edição: 2 · período: contido

| | Marcelo Queiroga | Marcelo Queiroz |
|---|---|---|
| pesquisas | 16 | 1 |
| período | 2026-01-26 → 2026-07-12 | 2025-12-01 → 2025-12-01 |
| média % | 14.1 | 14.0 |
| partidos | PL 2026-01-26→2026-07-12 | PL 2025-12-01→2025-12-01 |
| institutos | Seta (5), Veritá (2), Índice (2), Ranking (2), +5 | Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 0.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

---

## Título ou apelido — provável MESMA pessoa

### Ratinho Jr × Ratinho Júnior

`Presidente` · token em comum: `ratinho` · distância de edição: 4 · período: contido

| | Ratinho Jr | Ratinho Júnior |
|---|---|---|
| pesquisas | 102 | 69 |
| período | 2025-01-01 → 2026-03-11 | 2023-10-03 → 2026-03-11 |
| média % | 18.3 | 19.9 |
| partidos | PSD 2025-01-01→2026-03-11 · PL 2025-09-14→2025-09-14 | PSD 2023-10-03→2026-03-11 |
| institutos | Paraná Pesquisas (24), Futura (18), Quaest (11), AtlasIntel (9), +21 | AtlasIntel (15), Gerp (13), Paraná Pesquisas (11), Futura (9), +9 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 1.6 p.p.

**Campo gêmeo — 19 ocorrência(s).** AtlasIntel: `2025-09-14` cita *Ratinho Jr* (34.9%, 2º turno) e `2025-09-14` cita *Ratinho Júnior* (2.6%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Jair Messias Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 8 · período: sobreposto

| | Jair Bolsonaro | Jair Messias Bolsonaro |
|---|---|---|
| pesquisas | 91 | 45 |
| período | 2024-03-22 → 2026-06-30 | 2023-07-17 → 2026-07-27 |
| média % | 40.1 | 42.0 |
| partidos | PL 2024-03-22→2026-06-30 | PL 2023-07-17→2026-07-27 |
| institutos | Paraná Pesquisas (37), Quaest (18), AtlasIntel (15), MDA (7), +6 | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 1.9 p.p.

**Campo gêmeo — 13 ocorrência(s).** Datafolha: `2025-06-11` cita *Jair Bolsonaro* (35%, 1º turno) e `2025-06-11` cita *Jair Messias Bolsonaro* (45%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### João Campos × João Henrique Campos

`Governador · PE` · token em comum: `joao, campos` · distância de edição: 9 · período: sobreposto

| | João Campos | João Henrique Campos |
|---|---|---|
| pesquisas | 23 | 45 |
| período | 2025-03-12 → 2026-08-07 | 2025-02-05 → 2026-08-15 |
| média % | 49.1 | 43.8 |
| partidos | PSB 2025-03-12→2026-08-07 | PSB 2025-02-05→2026-08-15 |
| institutos | Paraná Pesquisas (7), Real Time Big Data (5), Quaest (4), Datafolha (2), +5 | Real Time Big Data (10), Datafolha (7), Múltipla (6), DataTrends (5), +8 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSB)** · diferença entre as médias: 5.2 p.p.

**Campo gêmeo — 5 ocorrência(s).** Ipespe: `2026-06-14` cita *João Campos* (44%, 2º turno) e `2026-06-14` cita *João Henrique Campos* (42%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Coronel Zucco × Luciano Zucco

`Governador · RS` · token em comum: `zucco` · distância de edição: 7 · período: contido

| | Coronel Zucco | Luciano Zucco |
|---|---|---|
| pesquisas | 10 | 20 |
| período | 2025-08-17 → 2026-07-19 | 2025-02-10 → 2026-07-11 |
| média % | 30.4 | 36.4 |
| partidos | PL 2025-08-17→2026-07-19 | PL 2025-02-10→2026-07-11 |
| institutos | Quaest (4), 100% Cidades Participações (4), Paraná Pesquisas (1), Real Time Big Data (1) | Brasmarket (6), Veritá (4), Real Time Big Data (4), Futura (3), +2 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 6.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Quaest, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Girão × Luis Eduardo Girão

`Governador · CE` · token em comum: `eduardo, girao` · distância de edição: 5 · período: contido

| | Eduardo Girão | Luis Eduardo Girão |
|---|---|---|
| pesquisas | 14 | 9 |
| período | 2026-03-24 → 2026-07-28 | 2025-05-18 → 2026-07-26 |
| média % | 6.3 | 10.3 |
| partidos | Novo 2026-03-24→2026-07-28 | Novo 2025-05-18→2026-07-26 · União Brasil 2025-12-15→2025-12-15 |
| institutos | Veritá (3), Real Time Big Data (3), AtlasIntel (2), Ipec (2), +4 | Paraná Pesquisas (4), Ipec (2), Datafolha (1), Real Time Big Data (1), +1 |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 4.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Ipec, Paraná Pesquisas, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Dorinha Rezende × Professora Dorinha

`Governador · TO` · token em comum: `dorinha` · distância de edição: 14 · período: sobreposto

| | Dorinha Rezende | Professora Dorinha |
|---|---|---|
| pesquisas | 13 | 8 |
| período | 2025-10-15 → 2026-07-31 | 2025-04-08 → 2026-08-03 |
| média % | 34.8 | 37.9 |
| partidos | União Brasil 2025-10-15→2026-07-31 | União Brasil 2025-04-08→2026-08-03 |
| institutos | Real Time Big Data (5), Paraná Pesquisas (3), Lucro Ativo (1), Brasmarketing (1), +3 | Real Time Big Data (3), Paraná Pesquisas (2), Voz e Pesquisa (1), Brasmarket (1), +1 |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (UNIAO BRASIL)** · diferença entre as médias: 3.2 p.p.

**Campo gêmeo — 3 ocorrência(s).** Real Time Big Data: `2026-06-18` cita *Dorinha Rezende* (43%, 2º turno) e `2026-06-18` cita *Professora Dorinha* (33%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Álvaro Costa Dias × Álvaro Dias

`Governador · RN` · token em comum: `alvaro, dias` · distância de edição: 6 · período: contido

| | Álvaro Costa Dias | Álvaro Dias |
|---|---|---|
| pesquisas | 44 | 7 |
| período | 2025-09-10 → 2026-08-14 | 2025-09-11 → 2026-07-29 |
| média % | 26.9 | 31.0 |
| partidos | PL 2025-09-10→2026-08-14 · Republicanos 2025-09-10→2025-12-16 | Republicanos 2025-09-11→2025-09-11 · PL 2026-05-27→2026-07-29 |
| institutos | Veritá (5), Metadata/Grupo Dial (4), Seta (4), Agorasei (4), +15 | AtlasIntel (5), Agora Sei Pesquisas (1), Data Capital (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL, REPUBLICANOS)** · diferença entre as médias: 4.1 p.p.

**Campo gêmeo — 3 ocorrência(s).** Data Capital: `2026-07-29` cita *Álvaro Costa Dias* (26%, 1º turno) e `2026-07-29` cita *Álvaro Dias* (47%, 2º turno).

- [x] mesma pessoa → canônico: `Álvaro Dias`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

> Decidido em 19/08/2026. Álvaro Costa Dias, PL, nº 22, `sq_candidato` 200002534442 no
> cadastro do TSE (`data/candidaturas.ndjson`), nome de urna "Álvaro Dias". As duas grafias
> são a mesma candidatura registrada. **Já implementado**: `canonicalCandidate` dobra as três
> grafias em "Álvaro Dias" nesta disputa — a marcação registra o que o banco já faz.

### Felipe d'Avila × Luiz Felipe d'Avila

`Governador · SP` · token em comum: `felipe, d'avila` · distância de edição: 5 · período: contido

| | Felipe d'Avila | Luiz Felipe d'Avila |
|---|---|---|
| pesquisas | 7 | 8 |
| período | 2025-08-24 → 2026-05-28 | 2025-07-04 → 2026-02-10 |
| média % | 2.0 | 1.7 |
| partidos | Novo 2025-08-24→2026-05-28 | Novo 2025-07-04→2026-02-10 |
| institutos | Vox (2), Paraná Pesquisas (2), Veritá (1), Real Time Big Data (1), +1 | Paraná Pesquisas (4), Ipespe (1), Real Time Big Data (1), Futura (1), +1 |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 0.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Capitão Derrite × Guilherme Derrite

`Senado · SP` · token em comum: `derrite` · distância de edição: 9 · período: sobreposto

| | Capitão Derrite | Guilherme Derrite |
|---|---|---|
| pesquisas | 7 | 24 |
| período | 2025-08-24 → 2026-07-03 | 2025-09-03 → 2026-08-13 |
| média % | 19.2 | 21.4 |
| partidos | PP 2025-08-24→2026-07-03 · PL 2026-02-09→2026-02-09 | PP 2025-09-03→2026-08-13 |
| institutos | Paraná Pesquisas (2), Ipespe (1), Datafolha (1), Futura (1), +2 | Paraná Pesquisas (6), Vox (4), Veritá (3), AtlasIntel (2), +7 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PP)** · diferença entre as médias: 2.2 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Datafolha, Vox, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Guimarães × José Alexandre Guimarães

`Senado · TO` · token em comum: `alexandre, guimaraes` · distância de edição: 5 · período: contido

| | Alexandre Guimarães | José Alexandre Guimarães |
|---|---|---|
| pesquisas | 6 | 9 |
| período | 2025-04-08 → 2026-07-31 | 2026-01-30 → 2026-07-31 |
| média % | 13.4 | 20.2 |
| partidos | MDB 2025-04-08→2026-07-31 | MDB 2026-01-30→2026-07-31 |
| institutos | Paraná Pesquisas (2), Real Time Big Data (1), Brasmarket (1), Voz e Pesquisa (1), +1 | Real Time Big Data (2), Lucro Ativo (1), Brasmarketing (1), VÓPE/Primeira Página (1), +4 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (MDB)** · diferença entre as médias: 6.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Real Time Big Data, Lucro Ativo.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Eduardo Torres Gomes × Eduardo Gomes

`Senado · TO` · token em comum: `eduardo, gomes` · distância de edição: 14 · período: contido

| | Carlos Eduardo Torres Gomes | Eduardo Gomes |
|---|---|---|
| pesquisas | 9 | 6 |
| período | 2026-01-30 → 2026-07-31 | 2025-04-08 → 2026-07-31 |
| média % | 30.7 | 26.4 |
| partidos | PL 2026-01-30→2026-07-31 | PL 2025-04-08→2026-07-31 |
| institutos | Real Time Big Data (2), Lucro Ativo (1), Brasmarketing (1), VÓPE/Primeira Página (1), +4 | Paraná Pesquisas (2), Real Time Big Data (1), Brasmarket (1), Voz e Pesquisa (1), +1 |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 4.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Lucro Ativo, Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### General Theophilo × General Theóphilo

`Senado · CE` · token em comum: `theophilo` · distância de edição: 0 · período: sobreposto

| | General Theophilo | General Theóphilo |
|---|---|---|
| pesquisas | 6 | 14 |
| período | 2025-12-16 → 2026-07-28 | 2026-01-21 → 2026-08-12 |
| média % | 2.4 | 4.2 |
| partidos | Novo 2025-12-16→2026-07-28 | Novo 2026-01-21→2026-08-12 |
| institutos | Quaest (2), Ipec (2), Real Time Big Data (1), Paraná Pesquisas (1) | Veritá (3), AtlasIntel (3), Real Time Big Data (3), Paraná Pesquisas (2), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 1.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Ipec, Real Time Big Data, Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Telemaco Brandão × Telêmaco Brandão

`Governador · GO` · token em comum: `telemaco, brandao` · distância de edição: 0 · período: sobreposto

| | Telemaco Brandão | Telêmaco Brandão |
|---|---|---|
| pesquisas | 9 | 6 |
| período | 2025-12-05 → 2026-07-25 | 2026-03-17 → 2026-07-31 |
| média % | 1.1 | 0.8 |
| partidos | Novo 2026-02-03→2026-07-08 · PL 2026-07-25→2026-07-25 | Novo 2026-03-17→2026-07-31 |
| institutos | Paraná Pesquisas (3), Real Time Big Data (2), Portal Goiás (2), Instituto Gazeta de Pesquisas (1), +1 | Directa (2), Paraná Pesquisas (1), Portal Goiás (1), Real Time Big Data (1), +1 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 0.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Real Time Big Data, Portal Goiás, Directa.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jornalista Toni Rodrigues × Toni Rodrigues

`Governador · PI` · token em comum: `toni, rodrigues` · distância de edição: 11 · período: contido

| | Jornalista Toni Rodrigues | Toni Rodrigues |
|---|---|---|
| pesquisas | 6 | 9 |
| período | 2025-11-27 → 2026-07-27 | 2026-03-15 → 2026-07-12 |
| média % | 4.5 | 3.1 |
| partidos | PL 2025-11-27→2026-07-27 | PL 2026-03-15→2026-07-12 |
| institutos | AtlasIntel (3), Real Time Big Data (2), Data AZ (1) | Amostragem (3), Veritá (3), Vetor (1), Data AZ (1), +1 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 1.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** AtlasIntel: `2026-03-15` cita *Jornalista Toni Rodrigues* (22%, 2º turno) e `2026-03-15` cita *Toni Rodrigues* (2.6%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alvaro Dias × Álvaro Dias

`Senado · PR` · token em comum: `alvaro, dias` · distância de edição: 0 · período: sobreposto

| | Alvaro Dias | Álvaro Dias |
|---|---|---|
| pesquisas | 5 | 16 |
| período | 2026-01-22 → 2026-07-28 | 2026-03-04 → 2026-08-12 |
| média % | 27.5 | 29.2 |
| partidos | MDB 2026-01-22→2026-07-28 | MDB 2026-03-04→2026-08-12 |
| institutos | Paraná Pesquisas (2), Quaest (1), Futura (1), IRG (1) | Paraná Pesquisas (4), IRG (4), Veritá (3), Neokemp (2), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (MDB)** · diferença entre as médias: 1.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Quaest, IRG.

- [x] mesma pessoa → canônico: `Álvaro Dias`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

> Decidido em 19/08/2026. MDB nas duas grafias, período sobreposto, médias a 1,7 p.p., e os
> mesmos institutos usam as duas — é o senador Álvaro Dias, do Paraná.
>
> **Já implementado.** A fonte ainda manda as duas grafias — `data/nomes-crus.json` traz
> `["Alvaro Dias","Álvaro Dias"]` nesta disputa —, e o banco as dobra: uma única linha de
> candidato, `c_5b56e8b6c963`, canônico "Álvaro Dias", com as duas como alias. Nas 26
> pesquisas de `senador:PR`, 21 trazem o nome e nenhuma traz a forma sem acento; as duas
> nunca aparecem na mesma pesquisa. A marcação registra o que o banco já faz.
>
> ⚠ E ESTE É OUTRO HOMEM, não o de `Governador · RN`. O senador do PR (MDB, Senado, Paraná)
> não está no cadastro do TSE; o do RN é Álvaro Costa Dias (PL, governo, Rio Grande do Norte).
> Partido, cargo e estado divergem com período sobreposto. Este documento não tem caixa para
> um par que cruza disputas, então a distinção fica dita aqui.

### Jarir Pereira × Professor Jarir Pereira

`Governador · CE` · token em comum: `jarir, pereira` · distância de edição: 10 · período: contido

| | Jarir Pereira | Professor Jarir Pereira |
|---|---|---|
| pesquisas | 13 | 5 |
| período | 2026-03-24 → 2026-07-28 | 2026-01-21 → 2026-07-26 |
| média % | 1.0 | 1.5 |
| partidos | PSOL 2026-03-24→2026-07-28 | PSOL 2026-01-21→2026-07-26 |
| institutos | Veritá (3), Real Time Big Data (3), AtlasIntel (2), Ipec (2), +3 | Paraná Pesquisas (2), Datafolha (1), Quaest (1), Ipec (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 0.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Ipec, Paraná Pesquisas, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Anthony Garotinho × Garotinho

`Governador · RJ` · token em comum: `garotinho` · distância de edição: 8 · período: contido

| | Anthony Garotinho | Garotinho |
|---|---|---|
| pesquisas | 10 | 5 |
| período | 2026-03-06 → 2026-07-30 | 2026-02-02 → 2026-07-30 |
| média % | 13.0 | 13.4 |
| partidos | Republicanos 2026-03-06→2026-07-30 | Republicanos 2026-02-02→2026-07-30 |
| institutos | Paraná Pesquisas (3), Gerp (3), Quaest (2), Real Time Big Data (1), +1 | Futura (1), Paraná Pesquisas (1), Real Time Big Data (1), Prefab (1), +1 |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 0.3 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2026-07-30` cita *Anthony Garotinho* (20.5%, 2º turno) e `2026-07-30` cita *Garotinho* (11%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Adailton Fúria × Adaílton Fúria

`Governador · RO` · token em comum: `adailton, furia` · distância de edição: 0 · período: disjunto

| | Adailton Fúria | Adaílton Fúria |
|---|---|---|
| pesquisas | 5 | 11 |
| período | 2025-08-13 → 2026-01-20 | 2026-02-28 → 2026-07-15 |
| média % | 23.6 | 26.6 |
| partidos | PSD 2025-08-13→2026-01-20 | PSD 2026-02-28→2026-07-15 |
| institutos | Paraná Pesquisas (3), Phoenix (1), Real Time Big Data (1) | IAP (3), Veritá (2), Phoenix (2), Real Time Big Data (2), +2 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 3.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Phoenix, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Domingos Savio × Domingos Sávio

`Senado · MG` · token em comum: `domingos, savio` · distância de edição: 0 · período: contido

| | Domingos Savio | Domingos Sávio |
|---|---|---|
| pesquisas | 12 | 4 |
| período | 2026-03-07 → 2026-07-29 | 2025-08-25 → 2026-07-26 |
| média % | 11.4 | 8.7 |
| partidos | PL 2026-03-07→2026-07-29 | PL 2025-08-25→2026-07-26 |
| institutos | Real Time Big Data (3), Veritá (2), DataTempo (2), Futura (1), +4 | Quaest (2), AtlasIntel (1), Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 2.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, AtlasIntel.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Wilson Lima × Wilson Miranda Lima

`Senado · AM` · token em comum: `wilson, lima` · distância de edição: 8 · período: sobreposto

| | Wilson Lima | Wilson Miranda Lima |
|---|---|---|
| pesquisas | 4 | 18 |
| período | 2025-12-12 → 2026-07-23 | 2026-03-18 → 2026-08-14 |
| média % | 22.8 | 16.4 |
| partidos | União Brasil 2025-12-12→2026-07-23 | União Brasil 2026-03-18→2026-08-14 |
| institutos | Projeta (1), Real Time Big Data (1), Perspectiva (1), Direito ao Ponto (1) | Veritá (5), DMP (2), Comunidados (2), Real Time Big Data (1), +8 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (UNIAO BRASIL)** · diferença entre as médias: 6.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Projeta, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Dr.Thor Dantas × Thor Dantas

`Governador · AC` · token em comum: `dantas` · distância de edição: 3 · período: sobreposto

| | Dr.Thor Dantas | Thor Dantas |
|---|---|---|
| pesquisas | 4 | 15 |
| período | 2025-12-12 → 2026-08-02 | 2025-08-17 → 2026-08-09 |
| média % | 7.0 | 4.5 |
| partidos | PSB 2025-12-12→2026-08-02 | PSB 2025-08-17→2026-08-09 |
| institutos | Phoenix (1), AtlasIntel (1), Real Time Big Data (1), Data Control (1) | Delta (7), Real Time Big Data (3), Veritá (2), Paraná Pesquisas (1), +2 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSB)** · diferença entre as médias: 2.5 p.p.

**Campo gêmeo — 1 ocorrência(s).** AtlasIntel: `2026-08-02` cita *Dr.Thor Dantas* (17.6%, 2º turno) e `2026-08-02` cita *Thor Dantas* (9.7%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delegado Humberto × Delegado Humberto Teófilo

`Senado · GO` · token em comum: `humberto` · distância de edição: 8 · período: disjunto

| | Delegado Humberto | Delegado Humberto Teófilo |
|---|---|---|
| pesquisas | 4 | 14 |
| período | 2026-02-03 → 2026-02-21 | 2026-04-13 → 2026-07-05 |
| média % | 5.1 | 12.1 |
| partidos | PL 2026-02-03→2026-02-21 | Novo 2026-04-13→2026-07-05 |
| institutos | Portal Goiás (3), Direct Pesquisas (1) | Exata GO (2), Paraná Pesquisas (2), Directa (2), Quaest (1), +7 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 7.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Portal Goiás.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delegado Eder Mauro × Éder Mauro

`Senado · PA` · token em comum: `eder, mauro` · distância de edição: 9 · período: sobreposto

| | Delegado Eder Mauro | Éder Mauro |
|---|---|---|
| pesquisas | 4 | 24 |
| período | 2025-08-28 → 2026-04-25 | 2025-02-11 → 2026-08-15 |
| média % | 19.1 | 21.7 |
| partidos | PL 2025-08-28→2026-04-25 | PL 2025-02-11→2026-08-15 |
| institutos | Paraná Pesquisas (1), Real Time Big Data (1), AtlasIntel (1), Quaest (1) | Doxa (8), Ampla (3), Real Time Big Data (3), Veritá (2), +6 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 2.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Real Time Big Data, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### João Azevedo × João Azevêdo

`Senado · PB` · token em comum: `joao, azevedo` · distância de edição: 0 · período: disjunto

| | João Azevedo | João Azevêdo |
|---|---|---|
| pesquisas | 4 | 13 |
| período | 2025-12-01 → 2026-01-30 | 2026-03-28 → 2026-07-12 |
| média % | 44.1 | 53.0 |
| partidos | PSB 2025-12-01→2026-01-30 | PSB 2026-03-28→2026-07-12 |
| institutos | Real Time Big Data (1), Falcão Pesquisas e Publicidade (1), Seta (1), Anova (1) | Seta (4), Veritá (2), Índice (2), Ranking (2), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSB)** · diferença entre as médias: 8.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Seta.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Gilberto Kassab × Kassab

`Governador · SP` · token em comum: `kassab` · distância de edição: 9 · período: contido

| | Gilberto Kassab | Kassab |
|---|---|---|
| pesquisas | 6 | 3 |
| período | 2025-07-08 → 2026-01-23 | 2025-10-12 → 2025-12-08 |
| média % | 15.4 | 22.0 |
| partidos | PSD 2025-07-08→2026-01-23 | PSD 2025-10-12→2025-12-08 |
| institutos | Paraná Pesquisas (3), Futura (2), AtlasIntel (1) | Paraná Pesquisas (3) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 6.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Elmano Freitas × Elmano de Freitas

`Governador · CE` · token em comum: `elmano, freitas` · distância de edição: 3 · período: sobreposto

| | Elmano Freitas | Elmano de Freitas |
|---|---|---|
| pesquisas | 3 | 42 |
| período | 2025-12-16 → 2026-02-28 | 2025-05-18 → 2026-08-12 |
| média % | 36.8 | 38.9 |
| partidos | PT 2025-12-16→2026-02-28 | PT 2025-05-18→2026-08-12 |
| institutos | Real Time Big Data (1), Ipec (1), Paraná Pesquisas (1) | Real Time Big Data (8), Paraná Pesquisas (6), AtlasIntel (5), Datafolha (5), +5 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 2.2 p.p.

**Campo gêmeo — 2 ocorrência(s).** Real Time Big Data: `2026-02-03` cita *Elmano Freitas* (41%, 1º turno) e `2026-02-03` cita *Elmano de Freitas* (44%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### José Guimarães × José Nobre Guimarães

`Senado · CE` · token em comum: `jose, guimaraes` · distância de edição: 6 · período: sobreposto

| | José Guimarães | José Nobre Guimarães |
|---|---|---|
| pesquisas | 3 | 3 |
| período | 2025-02-15 → 2026-02-03 | 2026-01-21 → 2026-04-01 |
| média % | 15.1 | 12.0 |
| partidos | PT 2025-02-15→2026-02-03 | PT 2026-01-21→2026-04-01 |
| institutos | Real Time Big Data (1), Ipec (1), Paraná Pesquisas (1) | Paraná Pesquisas (1), Real Time Big Data (1), Futura (1) |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 3.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Túlio Gadelha × Túlio Gadêlha

`Senado · PE` · token em comum: `tulio, gadelha` · distância de edição: 0 · período: sobreposto

| | Túlio Gadelha | Túlio Gadêlha |
|---|---|---|
| pesquisas | 3 | 14 |
| período | 2026-04-26 → 2026-07-26 | 2026-04-15 → 2026-08-15 |
| média % | 9.5 | 8.5 |
| partidos | PSD 2026-04-26→2026-07-26 | PSD 2026-04-15→2026-08-15 |
| institutos | Quaest (2), Paraná Pesquisas (1) | Múltipla (3), Datafolha (3), Real Time Big Data (3), Ipespe (2), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 1.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Capitão Contar × Renan Contar

`Senado · MS` · token em comum: `contar` · distância de edição: 6 · período: sobreposto

| | Capitão Contar | Renan Contar |
|---|---|---|
| pesquisas | 3 | 16 |
| período | 2025-11-28 → 2026-03-20 | 2026-03-09 → 2026-08-12 |
| média % | 18.5 | 28.2 |
| partidos | PL 2025-11-28→2026-03-20 | PL 2026-03-09→2026-08-12 |
| institutos | Ranking (2), Real Time Big Data (1) | Ranking (6), Novo Ibrape (3), IPR (2), Real Time Big Data (2), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 9.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Ranking, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Juiz Wilson Witzel × Wilson Witzel

`Governador · RJ` · token em comum: `wilson, witzel` · distância de edição: 5 · período: sobreposto

| | Juiz Wilson Witzel | Wilson Witzel |
|---|---|---|
| pesquisas | 3 | 9 |
| período | 2026-02-02 → 2026-07-02 | 2026-03-06 → 2026-07-29 |
| média % | 3.1 | 3.3 |
| partidos | Sem partido 2026-02-02→2026-02-02 · DC 2026-04-25→2026-07-02 | Democrata 2026-03-06→2026-07-29 |
| institutos | Futura (1), Prefab (1), Quaest (1) | Paraná Pesquisas (3), Gerp (2), Real Time Big Data (1), Veritá (1), +2 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.2 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Prefab, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Daniel Santos × Dr Daniel

`Governador · PA` · token em comum: `daniel` · distância de edição: 9 · período: contido

| | Daniel Santos | Dr Daniel |
|---|---|---|
| pesquisas | 47 | 3 |
| período | 2024-02-04 → 2026-08-15 | 2026-01-30 → 2026-06-14 |
| média % | 31.5 | 26.2 |
| partidos | Podemos 2024-02-04→2026-08-15 · PSB 2025-02-11→2025-12-23 | PSB 2026-01-30→2026-02-04 · Podemos 2026-06-14→2026-06-14 |
| institutos | Doxa (12), Real Time Big Data (8), Ampla (5), Paraná Pesquisas (5), +7 | Doxa (2), Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PODEMOS, PSB)** · diferença entre as médias: 5.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Doxa, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Dr Daniel × Dr. Daniel

`Governador · PA` · token em comum: `daniel` · distância de edição: 1 · período: contido

| | Dr Daniel | Dr. Daniel |
|---|---|---|
| pesquisas | 3 | 5 |
| período | 2026-01-30 → 2026-06-14 | 2025-06-24 → 2026-03-21 |
| média % | 26.2 | 30.7 |
| partidos | PSB 2026-01-30→2026-02-04 · Podemos 2026-06-14→2026-06-14 | PSB 2025-06-24→2025-12-05 · Podemos 2026-03-21→2026-03-21 |
| institutos | Doxa (2), Real Time Big Data (1) | Paraná Pesquisas (2), AtlasIntel (2), Real Time Big Data (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PSB, PODEMOS)** · diferença entre as médias: 4.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Coronel Hélio × Coronel Hélio Oliveira

`Senado · RN` · token em comum: `helio` · distância de edição: 9 · período: contido

| | Coronel Hélio | Coronel Hélio Oliveira |
|---|---|---|
| pesquisas | 38 | 2 |
| período | 2026-03-18 → 2026-08-14 | 2025-09-11 → 2026-01-11 |
| média % | 14.4 | 4.3 |
| partidos | PL 2026-03-18→2026-08-14 | PL 2025-09-11→2026-01-11 |
| institutos | Seta (5), Metadata/Grupo Dial (3), Data Census (3), Exatus (3), +13 | Agora Sei Pesquisas (1), DataVero (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 10.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): DataVero.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Covatti Filho × Covatti filho

`Governador · RS` · token em comum: `covatti` · distância de edição: 0 · período: contido

| | Covatti Filho | Covatti filho |
|---|---|---|
| pesquisas | 2 | 2 |
| período | 2026-03-16 → 2026-04-04 | 2025-11-24 → 2026-02-10 |
| média % | 2.9 | 3.8 |
| partidos | PP 2026-03-16→2026-04-04 | PP 2025-11-24→2026-02-10 |
| institutos | Veritá (1), Real Time Big Data (1) | 100% Cidades Participações (1), Real Time Big Data (1) |
| fontes |  | poder360 |

Partidos: **coincidem (PP)** · diferença entre as médias: 0.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Hauly × Luiz Carlos Hauly

`Senado · PR` · token em comum: `hauly` · distância de edição: 12 · período: sobreposto

| | Hauly | Luiz Carlos Hauly |
|---|---|---|
| pesquisas | 2 | 2 |
| período | 2026-06-09 → 2026-07-06 | 2026-04-25 → 2026-07-28 |
| média % | 3.7 | 1.4 |
| partidos | Podemos 2026-06-09→2026-07-06 | Podemos 2026-04-25→2026-07-28 |
| institutos | Paraná Pesquisas (2) | Quaest (1), IRG (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PODEMOS)** · diferença entre as médias: 2.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### José Aleluia × José Carlos Aleluia

`Governador · BA` · token em comum: `jose, aleluia` · distância de edição: 7 · período: sobreposto

| | José Aleluia | José Carlos Aleluia |
|---|---|---|
| pesquisas | 2 | 6 |
| período | 2025-08-17 → 2025-11-25 | 2025-09-19 → 2026-04-27 |
| média % | 2.0 | 0.9 |
| partidos | Novo 2025-08-17→2025-11-25 | Novo 2025-09-19→2026-04-27 |
| institutos | Real Time Big Data (1), Quaest (1) | Real Time Big Data (2), Veritá (2), Bahia Notícia/Séculus (1), Quaest (1) |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 1.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alcides Fernandes × Pastor Alcides

`Senado · CE` · token em comum: `alcides` · distância de edição: 13 · período: contido

| | Alcides Fernandes | Pastor Alcides |
|---|---|---|
| pesquisas | 17 | 2 |
| período | 2025-02-15 → 2026-08-12 | 2026-02-03 → 2026-04-28 |
| média % | 14.1 | 7.5 |
| partidos | PL 2025-02-15→2026-08-12 | PL 2026-02-03→2026-04-28 |
| institutos | Paraná Pesquisas (4), Veritá (3), Real Time Big Data (3), Ipec (3), +3 | Real Time Big Data (1), Quaest (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 6.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Gilson Machado × Gilson Machado Neto

`Senado · PE` · token em comum: `gilson, machado` · distância de edição: 5 · período: contido

| | Gilson Machado | Gilson Machado Neto |
|---|---|---|
| pesquisas | 3 | 2 |
| período | 2025-08-05 → 2026-03-30 | 2026-02-05 → 2026-02-24 |
| média % | 16.0 | 10.0 |
| partidos | PL 2025-08-05→2026-03-30 | Podemos 2026-02-05→2026-02-24 |
| institutos | Múltipla (1), Veritá (1), Paraná Pesquisas (1) | DataTrends (1), Datafolha (1) |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 6.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Mario Couto × Mário Couto

`Governador · PA` · token em comum: `mario, couto` · distância de edição: 0 · período: sobreposto

| | Mario Couto | Mário Couto |
|---|---|---|
| pesquisas | 2 | 24 |
| período | 2025-12-05 → 2026-02-04 | 2024-02-04 → 2026-08-03 |
| média % | 12.5 | 12.0 |
| partidos | PL 2025-12-05→2026-02-04 | DC 2024-02-04→2026-08-03 · PL 2025-11-29→2026-03-30 |
| institutos | Real Time Big Data (2) | Real Time Big Data (6), Doxa (6), Veritá (3), Simetria (2), +5 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 0.5 p.p.

**Campo gêmeo — 1 ocorrência(s).** Real Time Big Data: `2026-02-04` cita *Mario Couto* (13%, 1º turno) e `2026-02-04` cita *Mário Couto* (19%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Cesar Pires × César Pires

`Senado · MA` · token em comum: `cesar, pires` · distância de edição: 0 · período: sobreposto

| | Cesar Pires | César Pires |
|---|---|---|
| pesquisas | 2 | 6 |
| período | 2026-01-28 → 2026-07-07 | 2026-03-08 → 2026-07-16 |
| média % | 1.6 | 4.9 |
| partidos | PSD 2026-01-28→2026-07-07 | PSD 2026-03-08→2026-07-16 |
| institutos | INOP (1), Real Time Big Data (1) | Veritá (2), INOP (1), AtlasIntel (1), Quaest (1), +1 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 3.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): INOP.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Silvia Cristina × Sílvia Cristina

`Senado · RO` · token em comum: `silvia, cristina` · distância de edição: 0 · período: disjunto

| | Silvia Cristina | Sílvia Cristina |
|---|---|---|
| pesquisas | 2 | 9 |
| período | 2025-12-10 → 2026-01-20 | 2026-02-28 → 2026-07-16 |
| média % | 22.9 | 20.5 |
| partidos | PP 2025-12-10→2025-12-10 · UP 2026-01-20→2026-01-20 | PP 2026-02-28→2026-07-16 |
| institutos | Phoenix (1), Real Time Big Data (1) | Phoenix (3), Veritá (2), IAP (2), IHPEC (1), +1 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PP)** · diferença entre as médias: 2.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Phoenix, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Manuela D'Ávila × Manuela d'Ávila

`Senado · RS` · token em comum: `manuela, d'avila` · distância de edição: 0 · período: sobreposto

| | Manuela D'Ávila | Manuela d'Ávila |
|---|---|---|
| pesquisas | 2 | 15 |
| período | 2025-11-24 → 2026-02-10 | 2025-10-31 → 2026-07-28 |
| média % | 22.9 | 24.0 |
| partidos | Sem partido 2025-11-24→2025-11-24 · PSOL 2026-02-10→2026-02-10 | PSOL 2025-10-31→2026-07-28 |
| institutos | 100% Cidades Participações (1), Real Time Big Data (1) | Brasmarket (4), Veritá (3), Quaest (2), Futura (2), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 1.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alvaro Dias × Álvaro Costa Dias

`Governador · RN` · token em comum: `alvaro, dias` · distância de edição: 6 · período: disjunto

| | Alvaro Dias | Álvaro Costa Dias |
|---|---|---|
| pesquisas | 1 | 44 |
| período | 2025-02-21 → 2025-02-21 | 2025-09-10 → 2026-08-14 |
| média % | 9.2 | 26.9 |
| partidos | Republicanos 2025-02-21→2025-02-21 | PL 2025-09-10→2026-08-14 · Republicanos 2025-09-10→2025-12-16 |
| institutos | Paraná Pesquisas (1) | Veritá (5), Metadata/Grupo Dial (4), Seta (4), Agorasei (4), +15 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 17.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alvaro Dias × Álvaro Dias

`Governador · RN` · token em comum: `alvaro, dias` · distância de edição: 0 · período: disjunto

| | Alvaro Dias | Álvaro Dias |
|---|---|---|
| pesquisas | 1 | 7 |
| período | 2025-02-21 → 2025-02-21 | 2025-09-11 → 2026-07-29 |
| média % | 9.2 | 31.0 |
| partidos | Republicanos 2025-02-21→2025-02-21 | Republicanos 2025-09-11→2025-09-11 · PL 2026-05-27→2026-07-29 |
| institutos | Paraná Pesquisas (1) | AtlasIntel (5), Agora Sei Pesquisas (1), Data Capital (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 21.8 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Álvaro Costa Dias × Álvaro Dias

`Senado · RN` · token em comum: `alvaro, dias` · distância de edição: 6 · período: sobreposto

| | Álvaro Costa Dias | Álvaro Dias |
|---|---|---|
| pesquisas | 1 | 2 |
| período | 2025-12-02 → 2025-12-02 | 2025-09-11 → 2026-01-11 |
| média % | 14.0 | 15.6 |
| partidos | Republicanos 2025-12-02→2025-12-02 | Republicanos 2025-09-11→2025-09-11 · MDB 2026-01-11→2026-01-11 |
| institutos | Real Time Big Data (1) | Agora Sei Pesquisas (1), DataVero (1) |
| fontes |  | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 1.6 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Machado × José Carlos Machado

`Governador · SP` · token em comum: `carlos, machado` · distância de edição: 5 · período: contido

| | Carlos Machado | José Carlos Machado |
|---|---|---|
| pesquisas | 5 | 1 |
| período | 2026-07-27 → 2026-08-13 | 2026-07-03 → 2026-07-03 |
| média % | 1.2 | 4.0 |
| partidos | PCB 2026-07-27→2026-08-13 | PCB 2026-07-03→2026-07-03 |
| institutos | Vox (2), Ideia (1), Quaest (1), Paraná Pesquisas (1) | Datafolha (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PCB)** · diferença entre as médias: 2.8 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Felicio Ramuth × Felício Ramuth

`Governador · SP` · token em comum: `felicio, ramuth` · distância de edição: 0 · período: contido

| | Felicio Ramuth | Felício Ramuth |
|---|---|---|
| pesquisas | 4 | 1 |
| período | 2025-05-04 → 2026-02-10 | 2025-12-08 → 2025-12-08 |
| média % | 17.5 | 18.6 |
| partidos | PSD 2025-05-04→2026-02-10 | PSD 2025-12-08→2025-12-08 |
| institutos | Paraná Pesquisas (3), Futura (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 1.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Filipe Sabará × Sabará

`Governador · SP` · token em comum: `sabara` · distância de edição: 7 · período: contido

| | Filipe Sabará | Sabará |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-02-09 → 2026-02-09 | 2025-05-04 → 2025-05-04 |
| média % | 0.0 | 2.3 |
| partidos | Sem partido 2026-02-09→2026-02-09 | Novo 2025-05-04→2025-05-04 |
| institutos | Ipespe (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.3 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 42 · período: sobreposto

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 91 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2026-06-30 |
| média % | 29.1 | 40.1 |
| partidos | PP 2024-03-22→2024-03-22 | PL 2024-03-22→2026-06-30 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (37), Quaest (18), AtlasIntel (15), MDA (7), +6 |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 11.0 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno) e `2024-03-22` cita *Jair Bolsonaro* (37.1%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 47 · período: contido

| | Jair Bolsonaro | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 91 | 1 |
| período | 2024-03-22 → 2026-06-30 | 2024-03-22 → 2024-03-22 |
| média % | 40.1 | 43.4 |
| partidos | PL 2024-03-22→2026-06-30 | PL 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (37), Quaest (18), AtlasIntel (15), MDA (7), +6 | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 3.3 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Bolsonaro* (37.1%, 1º turno) e `2024-03-22` cita *Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro* (43.4%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 40 · período: contido

| | Jair Bolsonaro | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 91 | 1 |
| período | 2024-03-22 → 2026-06-30 | 2024-03-22 → 2024-03-22 |
| média % | 40.1 | 35.3 |
| partidos | PL 2024-03-22→2026-06-30 | PSD 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (37), Quaest (18), AtlasIntel (15), MDA (7), +6 | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 4.8 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Bolsonaro* (37.1%, 1º turno) e `2024-03-22` cita *Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro* (35.3%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Romeu Zema, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 39 · período: contido

| | Jair Bolsonaro | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 91 | 1 |
| período | 2024-03-22 → 2026-06-30 | 2024-03-22 → 2024-03-22 |
| média % | 40.1 | 34.6 |
| partidos | PL 2024-03-22→2026-06-30 | Novo 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (37), Quaest (18), AtlasIntel (15), MDA (7), +6 | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 5.5 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Bolsonaro* (37.1%, 1º turno) e `2024-03-22` cita *Romeu Zema, com apoio do ex-presidente Jair Bolsonaro* (34.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 43 · período: contido

| | Jair Bolsonaro | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 91 | 1 |
| período | 2024-03-22 → 2026-06-30 | 2024-03-22 → 2024-03-22 |
| média % | 40.1 | 32.6 |
| partidos | PL 2024-03-22→2026-06-30 | União Brasil 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (37), Quaest (18), AtlasIntel (15), MDA (7), +6 | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 7.5 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Bolsonaro* (37.1%, 1º turno) e `2024-03-22` cita *Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro* (32.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 48 · período: contido

| | Jair Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 91 | 1 |
| período | 2024-03-22 → 2026-06-30 | 2024-03-22 → 2024-03-22 |
| média % | 40.1 | 40.8 |
| partidos | PL 2024-03-22→2026-06-30 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (37), Quaest (18), AtlasIntel (15), MDA (7), +6 | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.7 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Bolsonaro* (37.1%, 1º turno) e `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 31 · período: contido

| | Jair Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 91 | 1 |
| período | 2024-03-22 → 2026-06-30 | 2024-03-22 → 2024-03-22 |
| média % | 40.1 | 32.2 |
| partidos | PL 2024-03-22→2026-06-30 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (37), Quaest (18), AtlasIntel (15), MDA (7), +6 | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 7.9 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Bolsonaro* (37.1%, 1º turno) e `2024-03-22` cita *Tereza Cristina, ex-presidente Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `michelle, bolsonaro` · distância de edição: 43 · período: contido

| | Michelle Bolsonaro | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 83 | 1 |
| período | 2024-01-28 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 40.3 | 43.4 |
| partidos | PL 2024-01-28→2026-07-27 | PL 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (22), AtlasIntel (16), Futura (13), Quaest (8), +8 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 3.1 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro* (43.4%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Sergio Moro × Sérgio Moro

`Presidente` · token em comum: `sergio, moro` · distância de edição: 0 · período: contido

| | Sergio Moro | Sérgio Moro |
|---|---|---|
| pesquisas | 1 | 3 |
| período | 2025-01-31 → 2025-01-31 | 2023-10-03 → 2024-12-31 |
| média % | 3.3 | 5.1 |
| partidos | União Brasil 2025-01-31→2025-01-31 | União Brasil 2023-10-03→2024-12-31 |
| institutos | AtlasIntel (1) | França (1), AtlasIntel (1), Paraná Pesquisas (1) |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (UNIAO BRASIL)** · diferença entre as médias: 1.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): AtlasIntel.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Sebastião Bocalom × Tião Bocalom

`Governador · AC` · token em comum: `bocalom` · distância de edição: 5 · período: sobreposto

| | Sebastião Bocalom | Tião Bocalom |
|---|---|---|
| pesquisas | 1 | 27 |
| período | 2026-02-03 → 2026-02-03 | 2025-08-17 → 2026-08-09 |
| média % | 18.0 | 20.8 |
| partidos | PL 2026-02-03→2026-02-03 | PL 2025-08-17→2026-02-05 · PSDB 2026-03-21→2026-08-09 |
| institutos | Data Control (1) | Delta (13), Real Time Big Data (6), Veritá (2), Paraná Pesquisas (2), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 2.8 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Marcio Bittar × Márcio Bittar

`Senado · AC` · token em comum: `marcio, bittar` · distância de edição: 0 · período: sobreposto

| | Marcio Bittar | Márcio Bittar |
|---|---|---|
| pesquisas | 1 | 18 |
| período | 2026-07-25 → 2026-07-25 | 2025-08-17 → 2026-08-09 |
| média % | 17.0 | 21.6 |
| partidos | PL 2026-07-25→2026-07-25 | PL 2025-08-17→2026-08-09 · União Brasil 2026-02-05→2026-02-05 |
| institutos | Real Time Big Data (1) | Delta (7), Real Time Big Data (3), Paraná Pesquisas (2), Veritá (2), +4 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 4.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Enio Verri × Ênio Verri

`Governador · PR` · token em comum: `enio, verri` · distância de edição: 0 · período: disjunto

| | Enio Verri | Ênio Verri |
|---|---|---|
| pesquisas | 3 | 1 |
| período | 2025-07-06 → 2025-08-17 | 2025-11-26 → 2025-11-26 |
| média % | 4.0 | 5.0 |
| partidos | PT 2025-07-06→2025-08-17 | PT 2025-11-26→2025-11-26 |
| institutos | Paraná Pesquisas (2), Quaest (1) | Real Time Big Data (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 1.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Antonio José Lira × Antônio José Lira

`Senado · PI` · token em comum: `antonio, jose, lira` · distância de edição: 0 · período: disjunto

| | Antonio José Lira | Antônio José Lira |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-07-13 → 2026-07-13 | — → — |
| média % | 1.0 | 1.5 |
| partidos | Avante 2026-07-13→2026-07-13 | Avante null→null |
| institutos | Real Time Big Data (1) | Opinar (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (AVANTE)** · diferença entre as médias: 0.5 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Aroldo Félix × Prof. Aroldo Félix

`Governador · BA` · token em comum: `aroldo, felix` · distância de edição: 6 · período: contido

| | Aroldo Félix | Prof. Aroldo Félix |
|---|---|---|
| pesquisas | 2 | 1 |
| período | 2026-08-02 → 2026-08-10 | 2026-07-27 → 2026-07-27 |
| média % | 0.1 | 1.0 |
| partidos | UP 2026-08-02→2026-08-10 | UP 2026-07-27→2026-07-27 |
| institutos | Real Time Big Data (1), Paraná Pesquisas (1) | Quaest (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (UP)** · diferença entre as médias: 0.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Angelo Coronel × Ângelo Coronel

`Senado · BA` · token em comum: `angelo` · distância de edição: 0 · período: contido

| | Angelo Coronel | Ângelo Coronel |
|---|---|---|
| pesquisas | 19 | 1 |
| período | 2024-02-21 → 2026-08-10 | 2026-07-25 → 2026-07-25 |
| média % | 15.1 | 11.3 |
| partidos | Republicanos 2024-02-21→2026-08-10 · PSD 2025-11-25→2026-08-02 | Republicanos 2026-07-25→2026-07-25 |
| institutos | Paraná Pesquisas (5), Quaest (4), Real Time Big Data (3), Instituto TML (2), +4 | 100% Cidades Participações (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 3.8 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delliana Ribeiro × Professora Delliana

`Senado · BA` · token em comum: `delliana` · distância de edição: 16 · período: disjunto

| | Delliana Ribeiro | Professora Delliana |
|---|---|---|
| pesquisas | 3 | 1 |
| período | 2026-02-21 → 2026-07-25 | 2026-08-02 → 2026-08-02 |
| média % | 2.1 | 6.4 |
| partidos | PSOL 2026-02-21→2026-07-25 | PSOL 2026-08-02→2026-08-02 |
| institutos | 100% Cidades Participações (1), Instituto TML (1), Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 4.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delliana Ricelli × Professora Delliana

`Senado · BA` · token em comum: `delliana` · distância de edição: 15 · período: disjunto

| | Delliana Ricelli | Professora Delliana |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-04-27 → 2026-04-27 | 2026-08-02 → 2026-08-02 |
| média % | 1.0 | 6.4 |
| partidos | PSOL 2026-04-27→2026-04-27 | PSOL 2026-08-02→2026-08-02 |
| institutos | Quaest (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 5.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ataides Oliveira × Ataídes Oliveira

`Governador · TO` · token em comum: `ataides, oliveira` · distância de edição: 0 · período: sobreposto

| | Ataides Oliveira | Ataídes Oliveira |
|---|---|---|
| pesquisas | 1 | 13 |
| período | 2025-11-25 → 2025-11-25 | 2025-10-15 → 2026-08-03 |
| média % | 6.0 | 5.8 |
| partidos | Novo 2025-11-25→2025-11-25 | Novo 2025-10-15→2026-08-03 |
| institutos | Real Time Big Data (1) | Real Time Big Data (3), Paraná Pesquisas (2), Lucro Ativo (2), Voz e Pesquisa (1), +5 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 0.2 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Eduardo Torres Gomes × Eduardo Gomes

`Governador · TO` · token em comum: `eduardo, gomes` · distância de edição: 14 · período: contido

| | Carlos Eduardo Torres Gomes | Eduardo Gomes |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-10-15 → 2025-10-15 | 2025-04-08 → 2025-04-08 |
| média % | 29.0 | 27.1 |
| partidos | PL 2025-10-15→2025-10-15 | PL 2025-04-08→2025-04-08 |
| institutos | Real Time Big Data (1) | Paraná Pesquisas (1) |
| fontes |  | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 1.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### André Luis × André Luís

`Governador · MA` · token em comum: `andre, luis` · distância de edição: 0 · período: disjunto

| | André Luis | André Luís |
|---|---|---|
| pesquisas | 1 | 4 |
| período | 2026-07-07 → 2026-07-07 | 2026-07-16 → 2026-08-11 |
| média % | 1.0 | 1.8 |
| partidos | Missão 2026-07-07→2026-07-07 | Missão 2026-07-16→2026-08-11 |
| institutos | Real Time Big Data (1) | Véritas (1), Veritá (1), IPPI (1), INOP (1) |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (MISSAO)** · diferença entre as médias: 0.8 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Lahesio Bonfim × Lahésio Bonfim

`Governador · MA` · token em comum: `lahesio, bonfim` · distância de edição: 0 · período: contido

| | Lahesio Bonfim | Lahésio Bonfim |
|---|---|---|
| pesquisas | 15 | 1 |
| período | 2025-08-06 → 2026-06-13 | 2026-01-28 → 2026-01-28 |
| média % | 17.0 | 9.2 |
| partidos | Novo 2025-08-06→2026-06-13 | Novo 2026-01-28→2026-01-28 |
| institutos | Paraná Pesquisas (3), Veritá (3), Econométrica (2), AtlasIntel (2), +4 | INOP (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 7.8 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Pereira × Professor Jarir Pereira

`Governador · CE` · token em comum: `pereira` · distância de edição: 11 · período: sobreposto

| | Jair Pereira | Professor Jarir Pereira |
|---|---|---|
| pesquisas | 1 | 5 |
| período | 2026-02-03 → 2026-02-03 | 2026-01-21 → 2026-07-26 |
| média % | 1.0 | 1.5 |
| partidos | PSOL 2026-02-03→2026-02-03 | PSOL 2026-01-21→2026-07-26 |
| institutos | Real Time Big Data (1) | Paraná Pesquisas (2), Datafolha (1), Quaest (1), Ipec (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 0.5 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Guimarães do PT × José Guimarães

`Senado · CE` · token em comum: `guimaraes` · distância de edição: 11 · período: contido

| | Guimarães do PT | José Guimarães |
|---|---|---|
| pesquisas | 1 | 3 |
| período | 2026-02-28 → 2026-02-28 | 2025-02-15 → 2026-02-03 |
| média % | 15.5 | 15.1 |
| partidos | PT 2026-02-28→2026-02-28 | PT 2025-02-15→2026-02-03 |
| institutos | Paraná Pesquisas (1) | Real Time Big Data (1), Ipec (1), Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 0.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Guimarães do PT × José Nobre Guimarães

`Senado · CE` · token em comum: `guimaraes` · distância de edição: 17 · período: sobreposto

| | Guimarães do PT | José Nobre Guimarães |
|---|---|---|
| pesquisas | 1 | 3 |
| período | 2026-02-28 → 2026-02-28 | 2026-01-21 → 2026-04-01 |
| média % | 15.5 | 12.0 |
| partidos | PT 2026-02-28→2026-02-28 | PT 2026-01-21→2026-04-01 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1), Real Time Big Data (1), Futura (1) |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 3.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delegado Humberto × Humberto Chaves

`Senado · GO` · token em comum: `humberto` · distância de edição: 14 · período: disjunto

| | Delegado Humberto | Humberto Chaves |
|---|---|---|
| pesquisas | 4 | 1 |
| período | 2026-02-03 → 2026-02-21 | 2026-07-08 → 2026-07-08 |
| média % | 5.1 | 1.0 |
| partidos | PL 2026-02-03→2026-02-21 | PSOL 2026-07-08→2026-07-08 |
| institutos | Portal Goiás (3), Direct Pesquisas (1) | Real Time Big Data (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 4.1 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Armando Monteiro × Armando Monteiro Neto

`Senado · PE` · token em comum: `armando, monteiro` · distância de edição: 5 · período: sobreposto

| | Armando Monteiro | Armando Monteiro Neto |
|---|---|---|
| pesquisas | 1 | 3 |
| período | 2026-03-30 → 2026-03-30 | 2026-02-05 → 2026-04-26 |
| média % | 7.1 | 6.0 |
| partidos | Podemos 2026-03-30→2026-03-30 | Podemos 2026-02-05→2026-04-26 |
| institutos | Veritá (1) | DataTrends (1), Quaest (1), Datafolha (1) |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PODEMOS)** · diferença entre as médias: 1.1 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Silvio Costa Filho × sílvio costa Filho

`Senado · PE` · token em comum: `silvio, costa` · distância de edição: 0 · período: contido

| | Silvio Costa Filho | sílvio costa Filho |
|---|---|---|
| pesquisas | 6 | 1 |
| período | 2025-08-05 → 2026-03-30 | 2026-02-07 → 2026-02-07 |
| média % | 14.0 | 5.0 |
| partidos | Republicanos 2025-08-05→2026-03-30 | Republicanos 2026-02-07→2026-02-07 |
| institutos | Real Time Big Data (2), DataTrends (1), Veritá (1), Datafolha (1), +1 | Múltipla (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 9.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alessandro Vieira × Delegado Alessandro

`Senado · SE` · token em comum: `alessandro` · distância de edição: 14 · período: contido

| | Alessandro Vieira | Delegado Alessandro |
|---|---|---|
| pesquisas | 18 | 1 |
| período | 2025-11-26 → 2026-08-12 | 2026-02-07 → 2026-02-07 |
| média % | 12.6 | 20.3 |
| partidos | MDB 2025-11-26→2026-08-12 | MDB 2026-02-07→2026-02-07 |
| institutos | W1 (3), Real Time Big Data (3), CTAS (3), INOR (2), +5 | França (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (MDB)** · diferença entre as médias: 7.7 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Iran Barbosa × Professor Iran Barbosa

`Senado · SE` · token em comum: `iran, barbosa` · distância de edição: 10 · período: contido

| | Iran Barbosa | Professor Iran Barbosa |
|---|---|---|
| pesquisas | 17 | 1 |
| período | 2026-03-27 → 2026-08-12 | 2026-02-07 → 2026-02-07 |
| média % | 2.4 | 3.6 |
| partidos | PSOL 2026-03-27→2026-08-12 | PSOL 2026-02-07→2026-02-07 |
| institutos | W1 (3), CTAS (3), INOR (2), Veritá (2), +5 | França (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 1.1 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Teles Junior × Zé Teles Júnior

`Senado · AP` · token em comum: `teles` · distância de edição: 3 · período: contido

| | Teles Junior | Zé Teles Júnior |
|---|---|---|
| pesquisas | 4 | 1 |
| período | 2026-04-28 → 2026-07-23 | 2026-06-13 → 2026-06-13 |
| média % | 9.0 | 9.5 |
| partidos | PDT 2026-04-28→2026-07-23 | PDT 2026-06-13→2026-06-13 |
| institutos | Veritá (3), Real Time Big Data (1) | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PDT)** · diferença entre as médias: 0.5 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Marina Cândia, esposa do JHC × Marina JHC

`Senado · AL` · token em comum: `marina, jhc` · distância de edição: 18 · período: disjunto

| | Marina Cândia, esposa do JHC | Marina JHC |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-12-04 → 2025-12-04 | 2026-01-25 → 2026-01-25 |
| média % | 30.8 | 19.0 |
| partidos | Sem partido 2025-12-04→2025-12-04 | Sem partido 2026-01-25→2026-01-25 |
| institutos | Paraná Pesquisas (1) | TDL (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (SEM PARTIDO)** · diferença entre as médias: 11.8 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Paulão × Paulão do PT

`Senado · AL` · token em comum: `paulao` · distância de edição: 6 · período: sobreposto

| | Paulão | Paulão do PT |
|---|---|---|
| pesquisas | 1 | 2 |
| período | 2025-12-04 → 2025-12-04 | 2025-11-24 → 2025-12-08 |
| média % | 12.7 | 13.3 |
| partidos | PT 2025-12-04→2025-12-04 | PT 2025-11-24→2025-12-08 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1), Real Time Big Data (1) |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 0.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Italo Marsili × Ítalo Marsili

`Governador · RJ` · token em comum: `italo, marsili` · distância de edição: 0 · período: sobreposto

| | Italo Marsili | Ítalo Marsili |
|---|---|---|
| pesquisas | 1 | 3 |
| período | 2025-08-17 → 2025-08-17 | 2025-05-23 → 2026-03-10 |
| média % | 2.0 | 2.4 |
| partidos | Novo 2025-08-17→2025-08-17 | Sem partido 2025-05-23→2026-03-10 · Novo 2026-02-02→2026-02-02 |
| institutos | Quaest (1) | Real Time Big Data (1), Futura (1), Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 0.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Helio Secco × Hélio Secco

`Senado · RJ` · token em comum: `helio, secco` · distância de edição: 0 · período: contido

| | Helio Secco | Hélio Secco |
|---|---|---|
| pesquisas | 1 | 5 |
| período | 2026-07-30 → 2026-07-30 | 2026-06-03 → 2026-07-29 |
| média % | 2.6 | 2.6 |
| partidos | Missão 2026-07-30→2026-07-30 | Missão 2026-06-03→2026-07-29 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (2), Prefab (2), Quaest (1) |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (MISSAO)** · diferença entre as médias: 0.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Cleber Rabelo × Cléber Rabelo

`Governador · PA` · token em comum: `cleber, rabelo` · distância de edição: 0 · período: contido

| | Cleber Rabelo | Cléber Rabelo |
|---|---|---|
| pesquisas | 17 | 1 |
| período | 2025-06-24 → 2026-08-03 | 2026-02-04 → 2026-02-04 |
| média % | 2.8 | 1.0 |
| partidos | PSTU 2025-06-24→2026-08-03 | PSTU 2026-02-04→2026-02-04 |
| institutos | Real Time Big Data (3), Doxa (3), Ampla (2), Simetria (2), +5 | Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSTU)** · diferença entre as médias: 1.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delegado Eder Mauro × Éder Mauro

`Governador · PA` · token em comum: `eder, mauro` · distância de edição: 9 · período: disjunto

| | Delegado Eder Mauro | Éder Mauro |
|---|---|---|
| pesquisas | 3 | 1 |
| período | 2025-06-24 → 2025-08-28 | 2025-10-24 → 2025-10-24 |
| média % | 17.7 | 9.3 |
| partidos | PL 2025-06-24→2025-08-28 | PL 2025-10-24→2025-10-24 |
| institutos | AtlasIntel (2), Paraná Pesquisas (1) | Doxa (1) |
| fontes | poder360 |  |

Partidos: **coincidem (PL)** · diferença entre as médias: 8.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### José Antonio Medeiros × José Medeiros

`Senado · MT` · token em comum: `jose, medeiros` · distância de edição: 8 · período: contido

| | José Antonio Medeiros | José Medeiros |
|---|---|---|
| pesquisas | 16 | 1 |
| período | 2025-05-11 → 2026-08-11 | 2026-03-23 → 2026-03-23 |
| média % | 16.3 | 10.0 |
| partidos | PL 2025-05-11→2026-08-11 | PL 2026-03-23→2026-03-23 |
| institutos | Percent (4), MT Dados (3), Veritá (3), Real Time Big Data (3), +2 | Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 6.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### José Arruda × José Roberto Arruda

`Governador · DF` · token em comum: `jose, arruda` · distância de edição: 8 · período: sobreposto

| | José Arruda | José Roberto Arruda |
|---|---|---|
| pesquisas | 1 | 17 |
| período | 2025-08-27 → 2025-08-27 | 2025-06-04 → 2026-08-15 |
| média % | 16.0 | 24.7 |
| partidos | PSD 2025-08-27→2025-08-27 | PL 2025-06-04→2025-06-04 · PSD 2025-12-08→2026-08-15 |
| institutos | Paraná Pesquisas (1) | Igape (3), Veritá (3), Exata GO (2), Paraná Pesquisas (2), +6 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 8.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Bruno Bolsonaro Scheid × Bruno Scheid

`Senado · RO` · token em comum: `bruno, scheid` · distância de edição: 10 · período: contido

| | Bruno Bolsonaro Scheid | Bruno Scheid |
|---|---|---|
| pesquisas | 9 | 1 |
| período | 2025-12-10 → 2026-07-16 | 2026-01-20 → 2026-01-20 |
| média % | 19.3 | 6.2 |
| partidos | PL 2025-12-10→2026-07-16 | PL 2026-01-20→2026-01-20 |
| institutos | Veritá (2), IAP (2), Phoenix (2), Real Time Big Data (2), +1 | Phoenix (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 13.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Phoenix.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delegado Camargo × Rodrigo Camargo

`Senado · RO` · token em comum: `camargo` · distância de edição: 7 · período: contido

| | Delegado Camargo | Rodrigo Camargo |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-01-20 → 2026-01-20 | 2025-12-10 → 2025-12-10 |
| média % | 7.4 | 6.0 |
| partidos | Podemos 2026-01-20→2026-01-20 | Republicanos 2025-12-10→2025-12-10 |
| institutos | Phoenix (1) | Real Time Big Data (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delegado Camargo × Rodrigo Camargo Ribeiro Pinho

`Senado · RO` · token em comum: `camargo` · distância de edição: 21 · período: disjunto

| | Delegado Camargo | Rodrigo Camargo Ribeiro Pinho |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-01-20 → 2026-01-20 | 2026-03-19 → 2026-03-19 |
| média % | 7.4 | 9.4 |
| partidos | Podemos 2026-01-20→2026-01-20 | Republicanos 2026-03-19→2026-03-19 |
| institutos | Phoenix (1) | Veritá (1) |
| fontes | poder360 |  |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Sanderson × Ubiratan Sanderson

`Senado · RS` · token em comum: `sanderson` · distância de edição: 9 · período: sobreposto

| | Sanderson | Ubiratan Sanderson |
|---|---|---|
| pesquisas | 1 | 15 |
| período | 2025-11-24 → 2025-11-24 | 2025-10-31 → 2026-07-28 |
| média % | 12.0 | 17.7 |
| partidos | PL 2025-11-24→2025-11-24 | PL 2025-10-31→2026-07-28 |
| institutos | Real Time Big Data (1) | Brasmarket (4), Veritá (3), Quaest (2), Futura (2), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 5.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

---

## Indefinido — precisa de fonte primária

### Luiz Inácio Lula da Silva × Lula

`Presidente` · token em comum: `lula` · distância de edição: 21 · período: contido

| | Luiz Inácio Lula da Silva | Lula |
|---|---|---|
| pesquisas | 439 | 877 |
| período | 2023-07-17 → 2026-08-16 | 2024-03-22 → 2026-08-16 |
| média % | 42.9 | 42.4 |
| partidos | PT 2023-07-17→2026-08-16 | PT 2024-03-22→2026-08-16 |
| institutos | AtlasIntel (70), Quaest (60), Gerp (59), Paraná Pesquisas (53), +20 | Quaest (209), AtlasIntel (117), Paraná Pesquisas (105), Futura (59), +38 |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 0.5 p.p.

**Campo gêmeo — 724 ocorrência(s).** AtlasIntel: `2025-09-14` cita *Luiz Inácio Lula da Silva* (48.2%, 1º turno) e `2025-09-14` cita *Lula* (51.4%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ratinho Jr × Ratinho Jr.

`Presidente` · token em comum: `ratinho` · distância de edição: 1 · período: sobreposto

| | Ratinho Jr | Ratinho Jr. |
|---|---|---|
| pesquisas | 102 | 28 |
| período | 2025-01-01 → 2026-03-11 | 2025-10-06 → 2026-03-30 |
| média % | 18.3 | 15.2 |
| partidos | PSD 2025-01-01→2026-03-11 · PL 2025-09-14→2025-09-14 | PSD 2025-10-06→2026-03-30 · PL 2026-03-30→2026-03-30 |
| institutos | Paraná Pesquisas (24), Futura (18), Quaest (11), AtlasIntel (9), +21 | Real Time Big Data (8), Paraná Pesquisas (6), Gerp (5), Veritá (4), +4 |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PSD, PL)** · diferença entre as médias: 3.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Quaest, AtlasIntel, Real Time Big Data, Ranking.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ratinho Jr. × Ratinho Júnior

`Presidente` · token em comum: `ratinho` · distância de edição: 5 · período: contido

| | Ratinho Jr. | Ratinho Júnior |
|---|---|---|
| pesquisas | 28 | 69 |
| período | 2025-10-06 → 2026-03-30 | 2023-10-03 → 2026-03-11 |
| média % | 15.2 | 19.9 |
| partidos | PSD 2025-10-06→2026-03-30 · PL 2026-03-30→2026-03-30 | PSD 2023-10-03→2026-03-11 |
| institutos | Real Time Big Data (8), Paraná Pesquisas (6), Gerp (5), Veritá (4), +4 | AtlasIntel (15), Gerp (13), Paraná Pesquisas (11), Futura (9), +9 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 4.6 p.p.

**Campo gêmeo — 1 ocorrência(s).** Quaest: `2025-11-09` cita *Ratinho Jr.* (35%, 2º turno) e `2025-11-09` cita *Ratinho Júnior* (7%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Cleitinho × Cleitinho Azevedo

`Governador · MG` · token em comum: `cleitinho` · distância de edição: 8 · período: contido

| | Cleitinho | Cleitinho Azevedo |
|---|---|---|
| pesquisas | 17 | 15 |
| período | 2026-03-07 → 2026-07-29 | 2025-08-17 → 2026-07-29 |
| média % | 40.8 | 39.9 |
| partidos | Republicanos 2026-03-07→2026-07-29 | Republicanos 2025-08-17→2026-07-29 |
| institutos | Futura (3), DataTempo (3), Real Time Big Data (3), AtlasIntel (3), +4 | Quaest (8), AtlasIntel (4), Real Time Big Data (2), Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 0.9 p.p.

**Campo gêmeo — 1 ocorrência(s).** Real Time Big Data: `2026-07-29` cita *Cleitinho* (47%, 2º turno) e `2026-07-29` cita *Cleitinho Azevedo* (36%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Joel Rodrigues × Joel Rodrigues da Silva

`Governador · PI` · token em comum: `joel, rodrigues` · distância de edição: 9 · período: sobreposto

| | Joel Rodrigues | Joel Rodrigues da Silva |
|---|---|---|
| pesquisas | 9 | 13 |
| período | 2026-03-15 → 2026-07-27 | 2026-03-15 → 2026-08-02 |
| média % | 20.9 | 26.5 |
| partidos | PP 2026-03-15→2026-07-27 | PP 2026-03-15→2026-08-02 |
| institutos | AtlasIntel (4), Real Time Big Data (2), Intenção Instituto de Pesquisa (1), Data AZ (1), +1 | Veritá (4), Amostragem (3), Vetor (1), Data AZ (1), +4 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PP)** · diferença entre as médias: 5.6 p.p.

**Campo gêmeo — 1 ocorrência(s).** AtlasIntel: `2026-03-15` cita *Joel Rodrigues* (36%, 2º turno) e `2026-03-15` cita *Joel Rodrigues da Silva* (29.8%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Renan Filho × Renan Santos

`Presidente` · token em comum: `renan` · distância de edição: 5 · período: sobreposto

| | Renan Filho | Renan Santos |
|---|---|---|
| pesquisas | 8 | 284 |
| período | 2025-07-06 → 2025-09-10 | 2025-05-27 → 2026-08-16 |
| média % | 0.6 | 9.1 |
| partidos | MDB 2025-07-06→2025-09-10 | Missão 2025-05-27→2026-08-16 · União Brasil 2026-02-10→2026-02-10 |
| institutos | Paraná Pesquisas (8) | Quaest (47), Real Time Big Data (38), AtlasIntel (24), Ideia (19), +37 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 8.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Efraim Filho × Efraim Moraes Filho

`Governador · PB` · token em comum: `efraim` · distância de edição: 7 · período: contido

| | Efraim Filho | Efraim Moraes Filho |
|---|---|---|
| pesquisas | 21 | 7 |
| período | 2025-03-28 → 2026-07-29 | 2025-12-01 → 2026-05-26 |
| média % | 21.9 | 19.3 |
| partidos | PL 2025-03-28→2026-07-29 | União Brasil 2025-12-01→2026-01-30 · PL 2026-05-26→2026-05-26 |
| institutos | Seta (6), DataTrends (5), Real Time Big Data (3), Veritá (2), +3 | Real Time Big Data (3), Anova (2), Falcão Pesquisas e Publicidade (1), Seta (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 2.6 p.p.

**Campo gêmeo — 2 ocorrência(s).** Real Time Big Data: `2026-05-26` cita *Efraim Filho* (19%, 1º turno) e `2026-05-26` cita *Efraim Moraes Filho* (26%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Joel Rodrigues da Silva × Jornalista Toni Rodrigues

`Governador · PI` · token em comum: `rodrigues` · distância de edição: 21 · período: contido

| | Joel Rodrigues da Silva | Jornalista Toni Rodrigues |
|---|---|---|
| pesquisas | 13 | 6 |
| período | 2026-03-15 → 2026-08-02 | 2025-11-27 → 2026-07-27 |
| média % | 26.5 | 4.5 |
| partidos | PP 2026-03-15→2026-08-02 | PL 2025-11-27→2026-07-27 |
| institutos | Veritá (4), Amostragem (3), Vetor (1), Data AZ (1), +4 | AtlasIntel (3), Real Time Big Data (2), Data AZ (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 22.0 p.p.

**Campo gêmeo — 1 ocorrência(s).** AtlasIntel: `2026-03-15` cita *Joel Rodrigues da Silva* (29.8%, 1º turno) e `2026-03-15` cita *Jornalista Toni Rodrigues* (22%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Chicão × Chicão Melo

`Senado · PA` · token em comum: `chicao` · distância de edição: 5 · período: sobreposto

| | Chicão | Chicão Melo |
|---|---|---|
| pesquisas | 6 | 30 |
| período | 2025-08-28 → 2026-04-25 | 2025-02-11 → 2026-08-15 |
| média % | 7.4 | 7.5 |
| partidos | MDB 2025-08-28→2026-01-30 · União Brasil 2026-03-21→2026-04-25 | MDB 2025-02-11→2025-12-23 · União Brasil 2026-02-04→2026-08-15 |
| institutos | Paraná Pesquisas (2), Real Time Big Data (1), Doxa (1), AtlasIntel (1), +1 | Doxa (13), Ampla (3), Real Time Big Data (3), Destak (2), +6 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (MDB, UNIAO BRASIL)** · diferença entre as médias: 0.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Real Time Big Data, Doxa, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Daniel Santos × Dr. Daniel

`Governador · PA` · token em comum: `daniel` · distância de edição: 9 · período: contido

| | Daniel Santos | Dr. Daniel |
|---|---|---|
| pesquisas | 47 | 5 |
| período | 2024-02-04 → 2026-08-15 | 2025-06-24 → 2026-03-21 |
| média % | 31.5 | 30.7 |
| partidos | Podemos 2024-02-04→2026-08-15 · PSB 2025-02-11→2025-12-23 | PSB 2025-06-24→2025-12-05 · Podemos 2026-03-21→2026-03-21 |
| institutos | Doxa (12), Real Time Big Data (8), Ampla (5), Paraná Pesquisas (5), +7 | Paraná Pesquisas (2), AtlasIntel (2), Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PODEMOS, PSB)** · diferença entre as médias: 0.8 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2026-03-21` cita *Daniel Santos* (39.1%, 1º turno) e `2026-03-21` cita *Dr. Daniel* (48.7%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Márcio × Márcio França

`Senado · SP` · token em comum: `marcio` · distância de edição: 7 · período: contido

| | Márcio | Márcio França |
|---|---|---|
| pesquisas | 4 | 9 |
| período | 2026-07-28 → 2026-08-13 | 2026-02-09 → 2026-05-31 |
| média % | 1.4 | 15.5 |
| partidos | UP 2026-07-28→2026-08-13 | PSB 2026-02-09→2026-05-31 |
| institutos | Vox (2), Ideia (1), Paraná Pesquisas (1) | Gerp (2), Veritá (2), Vox (1), Ipespe (1), +3 |
| fontes | , poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 14.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Vox.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro × Ciro Gomes

`Presidente` · token em comum: `ciro` · distância de edição: 6 · período: sobreposto

| | Ciro | Ciro Gomes |
|---|---|---|
| pesquisas | 4 | 115 |
| período | 2025-02-25 → 2025-04-13 | 2023-10-03 → 2026-05-21 |
| média % | 7.6 | 13.8 |
| partidos | PDT 2025-02-25→2025-04-13 | PDT 2023-10-03→2025-10-06 · Democratic Labour Party (Brazil) 2024-05-01→2024-05-01 · PSDB 2025-05-16→2026-05-21 |
| institutos | Paraná Pesquisas (3), Quaest (1) | Paraná Pesquisas (42), Gerp (20), Quaest (10), AtlasIntel (8), +16 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PDT)** · diferença entre as médias: 6.2 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2025-02-25` cita *Ciro* (7.7%, 1º turno) e `2025-02-25` cita *Ciro Gomes* (8.2%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Geraldo × Geraldo Alckmin

`Senado · SP` · token em comum: `geraldo` · distância de edição: 8 · período: contido

| | Geraldo | Geraldo Alckmin |
|---|---|---|
| pesquisas | 3 | 3 |
| período | 2026-08-08 → 2026-08-13 | 2025-08-24 → 2025-12-08 |
| média % | 2.9 | 34.8 |
| partidos | Podemos 2026-08-08→2026-08-13 | PSB 2025-08-24→2025-12-08 |
| institutos | Ideia (1), Vox (1), American Analytics (1) | Paraná Pesquisas (2), AtlasIntel (1) |
| fontes | , poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 31.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Júlio César × Júlio César de Carvalho Lima

`Senado · PI` · token em comum: `julio, cesar` · distância de edição: 17 · período: sobreposto

| | Júlio César | Júlio César de Carvalho Lima |
|---|---|---|
| pesquisas | 3 | 17 |
| período | 2025-11-27 → 2026-05-18 | 2025-11-27 → 2026-08-05 |
| média % | 18.3 | 21.7 |
| partidos | PSD 2025-11-27→2026-05-18 | PSD 2025-11-27→2026-08-05 |
| institutos | Opinar (1), Real Time Big Data (1), AtlasIntel (1) | AtlasIntel (4), Veritá (4), Amostragem (3), Vetor (1), +5 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 3.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, AtlasIntel.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Irajá × Irajá Abreu

`Senado · TO` · token em comum: `iraja` · distância de edição: 6 · período: sobreposto

| | Irajá | Irajá Abreu |
|---|---|---|
| pesquisas | 3 | 11 |
| período | 2025-04-08 → 2026-07-24 | 2025-08-03 → 2026-07-31 |
| média % | 14.0 | 12.0 |
| partidos | PSD 2025-04-08→2026-07-24 | PSD 2025-08-03→2026-07-31 |
| institutos | Paraná Pesquisas (2), Real Time Big Data (1) | Real Time Big Data (2), Lucro Ativo (2), Brasmarketing (1), Voz e Pesquisa (1), +5 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 1.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro × Ciro Nogueira

`Presidente` · token em comum: `ciro` · distância de edição: 9 · período: contido

| | Ciro | Ciro Nogueira |
|---|---|---|
| pesquisas | 4 | 2 |
| período | 2025-02-25 → 2025-04-13 | 2024-03-22 → 2024-03-22 |
| média % | 7.6 | 16.3 |
| partidos | PDT 2025-02-25→2025-04-13 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (3), Quaest (1) | Paraná Pesquisas (2) |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 8.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Pedro Lucas × Pedro Lucas Fernandes

`Senado · MA` · token em comum: `pedro, lucas` · distância de edição: 10 · período: disjunto

| | Pedro Lucas | Pedro Lucas Fernandes |
|---|---|---|
| pesquisas | 2 | 7 |
| período | 2025-11-28 → 2026-01-28 | 2026-03-08 → 2026-07-16 |
| média % | 3.8 | 9.2 |
| partidos | União Brasil 2025-11-28→2026-01-28 | União Brasil 2026-03-08→2026-07-16 |
| institutos | INOP (1), Real Time Big Data (1) | Veritá (2), INOP (1), IPPI (1), AtlasIntel (1), +2 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (UNIAO BRASIL)** · diferença entre as médias: 5.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): INOP.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Valmir de Francisquinho × Valmir de Francisquinho de Itabaiana

`Governador · SE` · token em comum: `valmir, francisquinho` · distância de edição: 13 · período: contido

| | Valmir de Francisquinho | Valmir de Francisquinho de Itabaiana |
|---|---|---|
| pesquisas | 25 | 1 |
| período | 2026-02-07 → 2026-08-12 | 2025-11-26 → 2025-11-26 |
| média % | 36.4 | 33.0 |
| partidos | PL 2026-02-07→2026-02-07 · Republicanos 2026-03-18→2026-08-12 | PL 2025-11-26→2025-11-26 |
| institutos | INOR (4), Real Time Big Data (4), IFP (4), W1 (3), +7 | Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 3.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Vera Lúcia × Vera Lúcia Salgado

`Governador · SP` · token em comum: `vera, lucia` · distância de edição: 8 · período: contido

| | Vera Lúcia | Vera Lúcia Salgado |
|---|---|---|
| pesquisas | 6 | 1 |
| período | 2026-07-27 → 2026-08-13 | 2026-07-03 → 2026-07-03 |
| média % | 1.7 | 5.0 |
| partidos | PSTU 2026-07-27→2026-08-13 | PSTU 2026-07-03→2026-07-03 |
| institutos | Vox (2), Ideia (1), Quaest (1), American Analytics (1), +1 | Datafolha (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSTU)** · diferença entre as médias: 3.3 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro × Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ciro` · distância de edição: 52 · período: contido

| | Ciro | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 4 | 1 |
| período | 2025-02-25 → 2025-04-13 | 2024-03-22 → 2024-03-22 |
| média % | 7.6 | 29.1 |
| partidos | PDT 2025-02-25→2025-04-13 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (3), Quaest (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 21.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ratinho Jr × Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ratinho` · distância de edição: 44 · período: contido

| | Ratinho Jr | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 102 | 1 |
| período | 2025-01-01 → 2026-03-11 | 2024-03-22 → 2024-03-22 |
| média % | 18.3 | 35.3 |
| partidos | PSD 2025-01-01→2026-03-11 · PL 2025-09-14→2025-09-14 | PSD 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (24), Futura (18), Quaest (11), AtlasIntel (9), +21 | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 17.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro × Ratinho Júnior

`Presidente` · token em comum: `ratinho` · distância de edição: 41 · período: sobreposto

| | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro | Ratinho Júnior |
|---|---|---|
| pesquisas | 1 | 69 |
| período | 2024-03-22 → 2024-03-22 | 2023-10-03 → 2026-03-11 |
| média % | 35.3 | 19.9 |
| partidos | PSD 2024-03-22→2024-03-22 | PSD 2023-10-03→2026-03-11 |
| institutos | Paraná Pesquisas (1) | AtlasIntel (15), Gerp (13), Paraná Pesquisas (11), Futura (9), +9 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 15.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro* (35.3%, 2º turno) e `2024-03-22` cita *Ratinho Júnior* (35.3%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Maria do Carmo × Maria do Carmo Seffair

`Governador · AM` · token em comum: `maria, carmo` · distância de edição: 8 · período: contido

| | Maria do Carmo | Maria do Carmo Seffair |
|---|---|---|
| pesquisas | 38 | 1 |
| período | 2025-12-26 → 2026-08-14 | 2025-12-12 → 2025-12-12 |
| média % | 30.7 | 25.0 |
| partidos | PL 2025-12-26→2026-08-14 | PL 2025-12-12→2025-12-12 |
| institutos | Veritá (9), AtlasIntel (6), DMP (4), Real Time Big Data (3), +11 | Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 5.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Maria da Consolação × Maria da Consolação Rocha

`Governador · MG` · token em comum: `maria, consolacao` · distância de edição: 6 · período: contido

| | Maria da Consolação | Maria da Consolação Rocha |
|---|---|---|
| pesquisas | 2 | 1 |
| período | 2026-07-26 → 2026-07-29 | 2026-04-26 → 2026-04-26 |
| média % | 2.0 | 3.0 |
| partidos | PSOL 2026-07-26→2026-07-26 · PL 2026-07-29→2026-07-29 | PSOL 2026-04-26→2026-04-26 |
| institutos | Real Time Big Data (1), Quaest (1) | Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 1.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Davi Davino Filho × Davi Filho

`Senado · AL` · token em comum: `davi` · distância de edição: 7 · período: contido

| | Davi Davino Filho | Davi Filho |
|---|---|---|
| pesquisas | 14 | 1 |
| período | 2025-11-24 → 2026-07-20 | 2025-12-04 → 2025-12-04 |
| média % | 18.6 | 20.9 |
| partidos | Republicanos 2025-11-24→2026-07-20 · PP 2026-07-17→2026-07-17 | PSDB 2025-12-04→2025-12-04 |
| institutos | TDL (4), Veritá (2), Vox (2), Falpe (2), +3 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jesus Rodrigues × Joel Rodrigues da Silva

`Governador · PI` · token em comum: `rodrigues` · distância de edição: 13 · período: sobreposto

| | Jesus Rodrigues | Joel Rodrigues da Silva |
|---|---|---|
| pesquisas | 1 | 13 |
| período | 2026-07-27 → 2026-07-27 | 2026-03-15 → 2026-08-02 |
| média % | 0.2 | 26.5 |
| partidos | Cidadania 2026-07-27→2026-07-27 | PP 2026-03-15→2026-08-02 |
| institutos | Data AZ (1) | Veritá (4), Amostragem (3), Vetor (1), Data AZ (1), +4 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 26.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Data AZ.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Rodrigo Camargo × Rodrigo Camargo Ribeiro Pinho

`Senado · RO` · token em comum: `rodrigo, camargo` · distância de edição: 14 · período: disjunto

| | Rodrigo Camargo | Rodrigo Camargo Ribeiro Pinho |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-12-10 → 2025-12-10 | 2026-03-19 → 2026-03-19 |
| média % | 6.0 | 9.4 |
| partidos | Republicanos 2025-12-10→2025-12-10 | Republicanos 2026-03-19→2026-03-19 |
| institutos | Real Time Big Data (1) | Veritá (1) |
| fontes | poder360 |  |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 3.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ibaneis × Ibaneis Rocha

`Senado · DF` · token em comum: `ibaneis` · distância de edição: 6 · período: disjunto

| | Ibaneis | Ibaneis Rocha |
|---|---|---|
| pesquisas | 1 | 6 |
| período | 2025-12-08 → 2025-12-08 | 2026-03-19 → 2026-06-23 |
| média % | 19.0 | 14.5 |
| partidos | MDB 2025-12-08→2025-12-08 | MDB 2026-03-19→2026-06-23 |
| institutos | Real Time Big Data (1) | Veritá (2), França (1), Igape (1), Phoenix (1), +1 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (MDB)** · diferença entre as médias: 4.5 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

---

## Só o primeiro nome em comum — provável PESSOAS DIFERENTES

Sobrenomes diferentes, só o primeiro nome coincide. Quase sempre pessoas
diferentes — **mas** o nome de urna brasileiro costuma anexar uma filiação
("Fulano do Bolsonaro", "Fulano da Saúde"), então um par assim pode ser a mesma
pessoa com nome de urna e nome civil. Confira antes de descartar.

### Cadu Xavier × Cadu de Lula

`Governador · RN` · token em comum: `cadu` · distância de edição: 7 · período: sobreposto

| | Cadu Xavier | Cadu de Lula |
|---|---|---|
| pesquisas | 13 | 47 |
| período | 2025-09-11 → 2026-07-29 | 2025-09-10 → 2026-08-14 |
| média % | 25.4 | 16.2 |
| partidos | PT 2025-09-11→2026-07-29 | PT 2025-09-10→2026-08-14 |
| institutos | AtlasIntel (5), Data Capital (2), Potengi/Media (1), Soluções (1), +4 | Veritá (5), Metadata/Grupo Dial (4), Seta (4), Agorasei (4), +16 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 9.2 p.p.

**Campo gêmeo — 4 ocorrência(s).** Data Capital: `2026-07-29` cita *Cadu Xavier* (31%, 2º turno) e `2026-07-29` cita *Cadu de Lula* (20%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Curi × Alexandre Salomão

`Governador · PR` · token em comum: `alexandre` · distância de edição: 7 · período: disjunto

| | Alexandre Curi | Alexandre Salomão |
|---|---|---|
| pesquisas | 5 | 3 |
| período | 2025-07-06 → 2026-03-20 | 2026-08-11 → 2026-08-16 |
| média % | 20.7 | 0.2 |
| partidos | PSD 2025-07-06→2026-01-27 · Republicanos 2026-03-04→2026-03-20 | Mobiliza 2026-08-11→2026-08-16 |
| institutos | Paraná Pesquisas (3), Futura (1), Neokemp (1) | Paraná Pesquisas (1), IRG (1), Neokemp (1) |
| fontes | , poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 20.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Neokemp.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Silvio Costa Filho × Silvio Nascimento

`Senado · PE` · token em comum: `silvio` · distância de edição: 9 · período: disjunto

| | Silvio Costa Filho | Silvio Nascimento |
|---|---|---|
| pesquisas | 6 | 3 |
| período | 2025-08-05 → 2026-03-30 | 2026-07-26 → 2026-07-30 |
| média % | 14.0 | 4.0 |
| partidos | Republicanos 2025-08-05→2026-03-30 | PL 2026-07-26→2026-07-30 |
| institutos | Real Time Big Data (2), DataTrends (1), Veritá (1), Datafolha (1), +1 | Datafolha (1), Quaest (1), Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 10.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Datafolha.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Jordy × Carlos Portinho

`Senado · RJ` · token em comum: `carlos` · distância de edição: 6 · período: sobreposto

| | Carlos Jordy | Carlos Portinho |
|---|---|---|
| pesquisas | 2 | 7 |
| período | 2026-06-03 → 2026-07-01 | 2025-08-29 → 2026-07-30 |
| média % | 11.3 | 7.0 |
| partidos | PL 2026-06-03→2026-07-01 | PL 2025-08-29→2026-07-30 |
| institutos | Paraná Pesquisas (2) | Prefab (2), Futura (1), Paraná Pesquisas (1), Real Time Big Data (1), +2 |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 4.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Leila Barros × Leila do Vôlei

`Senado · DF` · token em comum: `leila` · distância de edição: 7 · período: contido

| | Leila Barros | Leila do Vôlei |
|---|---|---|
| pesquisas | 11 | 2 |
| período | 2026-03-19 → 2026-08-15 | 2025-12-08 → 2026-07-31 |
| média % | 23.2 | 14.6 |
| partidos | PDT 2026-03-19→2026-08-15 | PDT 2025-12-08→2026-07-31 |
| institutos | Igape (3), Phoenix (2), Veritá (2), França (1), +3 | Brada Comunicação (1), Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PDT)** · diferença entre as médias: 8.6 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Rodrigo Bolsonaro × Rodrigo Vieira

`Governador · RN` · token em comum: `rodrigo` · distância de edição: 8 · período: contido

| | Rodrigo Bolsonaro | Rodrigo Vieira |
|---|---|---|
| pesquisas | 21 | 1 |
| período | 2026-05-09 → 2026-08-14 | 2026-07-21 → 2026-07-21 |
| média % | 0.9 | 0.1 |
| partidos | Agir 2026-05-09→2026-08-14 | Agir 2026-07-21→2026-07-21 |
| institutos | Seta (4), Metadata/Grupo Dial (3), Item (3), Potengi/Media (2), +8 | AtlasIntel (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (AGIR)** · diferença entre as médias: 0.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): AtlasIntel.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Tarcísio de Freitas × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Governador · SP` · token em comum: `tarcisio` · distância de edição: 43 · período: contido

| | Tarcísio de Freitas | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 52 | 1 |
| período | 2025-02-23 → 2026-08-13 | 2026-07-31 → 2026-07-31 |
| média % | 49.3 | 53.5 |
| partidos | Republicanos 2025-02-23→2026-08-13 | Republicanos 2026-07-31→2026-07-31 |
| institutos | Paraná Pesquisas (20), Vox (6), Quaest (5), Futura (5), +8 | Vox (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 4.2 p.p.

**Campo gêmeo — 1 ocorrência(s).** Vox: `2026-07-31` cita *Tarcísio de Freitas* (52.9%, 1º turno) e `2026-07-31` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (53.5%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Luiz Giordano × Alexandre Padilha

`Senado · SP` · token em comum: `alexandre` · distância de edição: 11 · período: disjunto

| | Alexandre Luiz Giordano | Alexandre Padilha |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-09-03 → 2025-09-03 | 2025-12-08 → 2025-12-08 |
| média % | 0.1 | 14.5 |
| partidos | MDB 2025-09-03→2025-09-03 | PT 2025-12-08→2025-12-08 |
| institutos | AtlasIntel (1) | Paraná Pesquisas (1) |
| fontes |  | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 14.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Luiz Giordano × Luiz Marinho

`Senado · SP` · token em comum: `luiz` · distância de edição: 16 · período: sobreposto

| | Alexandre Luiz Giordano | Luiz Marinho |
|---|---|---|
| pesquisas | 1 | 2 |
| período | 2025-09-03 → 2025-09-03 | 2025-08-24 → 2025-10-12 |
| média % | 0.1 | 7.0 |
| partidos | MDB 2025-09-03→2025-09-03 | PT 2025-08-24→2025-10-12 |
| institutos | AtlasIntel (1) | Paraná Pesquisas (2) |
| fontes |  | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 6.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Guilherme Boulos × Guilherme Giordano

`Senado · SP` · token em comum: `guilherme` · distância de edição: 7 · período: contido

| | Guilherme Boulos | Guilherme Giordano |
|---|---|---|
| pesquisas | 2 | 1 |
| período | 2026-03-05 → 2026-03-07 | 2025-08-24 → 2025-08-24 |
| média % | 14.5 | 0.5 |
| partidos | PSOL 2026-03-05→2026-03-07 | MDB 2025-08-24→2025-08-24 |
| institutos | Real Time Big Data (1), Datafolha (1) | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 14.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Guilherme Derrite × Guilherme Giordano

`Senado · SP` · token em comum: `guilherme` · distância de edição: 7 · período: contido

| | Guilherme Derrite | Guilherme Giordano |
|---|---|---|
| pesquisas | 24 | 1 |
| período | 2025-09-03 → 2026-08-13 | 2025-08-24 → 2025-08-24 |
| média % | 21.4 | 0.5 |
| partidos | PP 2025-09-03→2026-08-13 | MDB 2025-08-24→2025-08-24 |
| institutos | Paraná Pesquisas (6), Vox (4), Veritá (3), AtlasIntel (2), +7 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 20.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Gomes × Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ciro` · distância de edição: 46 · período: contido

| | Ciro Gomes | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 115 | 1 |
| período | 2023-10-03 → 2026-05-21 | 2024-03-22 → 2024-03-22 |
| média % | 13.8 | 29.1 |
| partidos | PDT 2023-10-03→2025-10-06 · Democratic Labour Party (Brazil) 2024-05-01→2024-05-01 · PSDB 2025-05-16→2026-05-21 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (42), Gerp (20), Quaest (10), AtlasIntel (8), +16 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 15.3 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Gomes* (7.5%, 1º turno) e `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira × Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ciro` · distância de edição: 43 · período: contido

| | Ciro Nogueira | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 2 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 16.3 | 29.1 |
| partidos | PP 2024-03-22→2024-03-22 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (2) | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PP)** · diferença entre as médias: 12.9 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira* (29.1%, 2º turno) e `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Luiz Felipe d'Avila × Luiz Inácio Lula da Silva

`Presidente` · token em comum: `luiz` · distância de edição: 14 · período: sobreposto

| | Luiz Felipe d'Avila | Luiz Inácio Lula da Silva |
|---|---|---|
| pesquisas | 1 | 439 |
| período | 2025-08-21 → 2025-08-21 | 2023-07-17 → 2026-08-16 |
| média % | 1.3 | 42.9 |
| partidos | Novo 2025-08-21→2025-08-21 | PT 2023-07-17→2026-08-16 |
| institutos | Paraná Pesquisas (1) | AtlasIntel (70), Quaest (60), Gerp (59), Paraná Pesquisas (53), +20 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 41.6 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2025-08-21` cita *Luiz Felipe d'Avila* (1.3%, 1º turno) e `2025-08-21` cita *Luiz Inácio Lula da Silva* (35.1%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ratinho Jr. × Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ratinho` · distância de edição: 43 · período: contido

| | Ratinho Jr. | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 28 | 1 |
| período | 2025-10-06 → 2026-03-30 | 2024-03-22 → 2024-03-22 |
| média % | 15.2 | 35.3 |
| partidos | PSD 2025-10-06→2026-03-30 · PL 2026-03-30→2026-03-30 | PSD 2024-03-22→2024-03-22 |
| institutos | Real Time Big Data (8), Paraná Pesquisas (6), Gerp (5), Veritá (4), +4 | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 20.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Romeu Zema × Romeu Zema, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `romeu` · distância de edição: 43 · período: contido

| | Romeu Zema | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 434 | 1 |
| período | 2023-07-17 → 2026-08-16 | 2024-03-22 → 2024-03-22 |
| média % | 15.5 | 34.6 |
| partidos | Novo 2023-07-17→2026-08-16 · MDB 2025-08-17→2025-08-17 · PSD 2025-09-14→2025-09-14 · Avante 2025-11-10→2025-12-15 | Novo 2024-03-22→2024-03-22 |
| institutos | Quaest (78), AtlasIntel (53), Real Time Big Data (39), Futura (34), +42 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 19.1 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Romeu Zema* (34.6%, 2º turno) e `2024-03-22` cita *Romeu Zema, com apoio do ex-presidente Jair Bolsonaro* (34.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ronaldo Caiado × Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ronaldo` · distância de edição: 43 · período: contido

| | Ronaldo Caiado | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 457 | 1 |
| período | 2023-10-03 → 2026-08-16 | 2024-03-22 → 2024-03-22 |
| média % | 16.5 | 32.6 |
| partidos | União Brasil 2023-10-03→2026-07-07 · Republicanos 2025-01-26→2025-09-14 · PL 2025-09-15→2025-09-15 · PSD 2026-01-09→2026-08-16 | União Brasil 2024-03-22→2024-03-22 |
| institutos | Quaest (78), AtlasIntel (56), Paraná Pesquisas (53), Futura (36), +42 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (UNIAO BRASIL)** · diferença entre as médias: 16.1 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ronaldo Caiado* (32.6%, 2º turno) e `2024-03-22` cita *Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro* (32.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Tarcísio de Freitas × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `tarcisio` · distância de edição: 43 · período: contido

| | Tarcísio de Freitas | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 165 | 1 |
| período | 2023-07-17 → 2026-03-23 | 2024-03-22 → 2024-03-22 |
| média % | 35.0 | 40.8 |
| partidos | Republicanos 2023-07-17→2026-03-23 | Republicanos 2024-03-22→2024-03-22 |
| institutos | AtlasIntel (31), Paraná Pesquisas (31), Futura (30), Quaest (27), +16 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 5.8 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Tarcísio de Freitas* (40.8%, 2º turno) e `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Tereza Cristina × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `tereza` · distância de edição: 30 · período: contido

| | Tereza Cristina | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 12 | 1 |
| período | 2023-10-03 → 2026-06-12 | 2024-03-22 → 2024-03-22 |
| média % | 14.8 | 32.2 |
| partidos | PP 2023-10-03→2026-06-12 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (9), Alfa/TMC (1), Ideia (1), Futura (1) | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PP)** · diferença entre as médias: 17.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Tereza Cristina* (32.2%, 2º turno) e `2024-03-22` cita *Tereza Cristina, ex-presidente Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Guto Silva × Guto Silva, com o apoio do governador Ratinho Junior

`Governador · PR` · token em comum: `guto` · distância de edição: 42 · período: contido

| | Guto Silva | Guto Silva, com o apoio do governador Ratinho Junior |
|---|---|---|
| pesquisas | 13 | 1 |
| período | 2025-07-06 → 2026-04-12 | 2025-07-06 → 2025-07-06 |
| média % | 9.1 | 35.2 |
| partidos | PSD 2025-07-06→2026-04-12 | PSD 2025-07-06→2025-07-06 |
| institutos | Paraná Pesquisas (6), Futura (3), Real Time Big Data (1), Neokemp (1), +2 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 26.1 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2025-07-06` cita *Guto Silva* (5.2%, 1º turno) e `2025-07-06` cita *Guto Silva, com o apoio do governador Ratinho Junior* (35.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Paulo Eduardo × Paulo Martins

`Governador · PR` · token em comum: `paulo` · distância de edição: 7 · período: sobreposto

| | Paulo Eduardo | Paulo Martins |
|---|---|---|
| pesquisas | 1 | 3 |
| período | 2025-08-17 → 2025-08-17 | 2025-08-11 → 2026-01-27 |
| média % | 8.0 | 10.7 |
| partidos | Novo 2025-08-17→2025-08-17 | Novo 2025-08-11→2026-01-27 |
| institutos | Quaest (1) | Paraná Pesquisas (1), Real Time Big Data (1), Futura (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 2.7 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Antonio Barros × Antônio José Lira

`Senado · PI` · token em comum: `antonio` · distância de edição: 9 · período: disjunto

| | Antonio Barros | Antônio José Lira |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-07-13 → 2026-07-13 | — → — |
| média % | 2.0 | 1.5 |
| partidos | Novo 2026-07-13→2026-07-13 | Avante null→null |
| institutos | Real Time Big Data (1) | Opinar (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.5 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### José Aleluia × José Carlos do Pátio

`Governador · BA` · token em comum: `jose` · distância de edição: 12 · período: disjunto

| | José Aleluia | José Carlos do Pátio |
|---|---|---|
| pesquisas | 2 | 1 |
| período | 2025-08-17 → 2025-11-25 | 2026-02-21 → 2026-02-21 |
| média % | 2.0 | 1.0 |
| partidos | Novo 2025-08-17→2025-11-25 | União Brasil 2026-02-21→2026-02-21 |
| institutos | Real Time Big Data (1), Quaest (1) | Instituto TML (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### José Carlos Aleluia × José Carlos do Pátio

`Governador · BA` · token em comum: `jose, carlos` · distância de edição: 7 · período: contido

| | José Carlos Aleluia | José Carlos do Pátio |
|---|---|---|
| pesquisas | 6 | 1 |
| período | 2025-09-19 → 2026-04-27 | 2026-02-21 → 2026-02-21 |
| média % | 0.9 | 1.0 |
| partidos | Novo 2025-09-19→2026-04-27 | União Brasil 2026-02-21→2026-02-21 |
| institutos | Real Time Big Data (2), Veritá (2), Bahia Notícia/Séculus (1), Quaest (1) | Instituto TML (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.1 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delliana Ribeiro × Delliana Ricelli

`Senado · BA` · token em comum: `delliana` · distância de edição: 4 · período: contido

| | Delliana Ribeiro | Delliana Ricelli |
|---|---|---|
| pesquisas | 3 | 1 |
| período | 2026-02-21 → 2026-07-25 | 2026-04-27 → 2026-04-27 |
| média % | 2.1 | 1.0 |
| partidos | PSOL 2026-02-21→2026-07-25 | PSOL 2026-04-27→2026-04-27 |
| institutos | 100% Cidades Participações (1), Instituto TML (1), Paraná Pesquisas (1) | Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 1.1 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Marcelo Carvalho × Marcelo Nilo

`Senado · BA` · token em comum: `marcelo` · distância de edição: 6 · período: contido

| | Marcelo Carvalho | Marcelo Nilo |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-08-02 → 2026-08-02 | 2026-02-21 → 2026-02-21 |
| média % | 1.8 | 4.0 |
| partidos | — | Republicanos 2026-02-21→2026-02-21 |
| institutos | Paraná Pesquisas (1) | Instituto TML (1) |
| fontes | poder360 | poder360 |

Partidos: **sem dados** · diferença entre as médias: 2.2 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Marcelo Nilo × Marcelo Santtana

`Senado · BA` · token em comum: `marcelo` · distância de edição: 7 · período: disjunto

| | Marcelo Nilo | Marcelo Santtana |
|---|---|---|
| pesquisas | 1 | 2 |
| período | 2026-02-21 → 2026-02-21 | 2026-04-27 → 2026-08-02 |
| média % | 4.0 | 1.1 |
| partidos | Republicanos 2026-02-21→2026-02-21 | DC 2026-04-27→2026-08-02 |
| institutos | Instituto TML (1) | Quaest (1), Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Amastha × Carlos Eduardo Torres Gomes

`Governador · TO` · token em comum: `carlos` · distância de edição: 18 · período: contido

| | Carlos Amastha | Carlos Eduardo Torres Gomes |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-03-24 → 2026-03-24 | 2025-10-15 → 2025-10-15 |
| média % | 11.0 | 29.0 |
| partidos | PSB 2026-03-24→2026-03-24 | PL 2025-10-15→2025-10-15 |
| institutos | Real Time Big Data (1) | Real Time Big Data (1) |
| fontes | poder360 |  |

Partidos: **CONTRADIZEM** · diferença entre as médias: 18.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Caguin × Carlos Eduardo Torres Gomes

`Senado · TO` · token em comum: `carlos` · distância de edição: 18 · período: disjunto

| | Carlos Caguin | Carlos Eduardo Torres Gomes |
|---|---|---|
| pesquisas | 1 | 9 |
| período | 2025-04-08 → 2025-04-08 | 2026-01-30 → 2026-07-31 |
| média % | 11.6 | 30.7 |
| partidos | União Brasil 2025-04-08→2025-04-08 | PL 2026-01-30→2026-07-31 |
| institutos | Paraná Pesquisas (1) | Real Time Big Data (2), Lucro Ativo (1), Brasmarketing (1), VÓPE/Primeira Página (1), +4 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 19.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Caguin × Carlos Velozo

`Senado · TO` · token em comum: `carlos` · distância de edição: 6 · período: disjunto

| | Carlos Caguin | Carlos Velozo |
|---|---|---|
| pesquisas | 1 | 5 |
| período | 2025-04-08 → 2025-04-08 | 2026-04-12 → 2026-07-31 |
| média % | 11.6 | 7.0 |
| partidos | União Brasil 2025-04-08→2025-04-08 | Agir 2026-04-12→2026-07-31 |
| institutos | Paraná Pesquisas (1) | Lucro Ativo (1), Brasmarketing (1), VÓPE/Primeira Página (1), Veritá (1), +1 |
| fontes | poder360 |  |

Partidos: **CONTRADIZEM** · diferença entre as médias: 4.6 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Gustavo Gayer × Gustavo Medanha

`Governador · GO` · token em comum: `gustavo` · distância de edição: 6 · período: disjunto

| | Gustavo Gayer | Gustavo Medanha |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-04-30 → 2026-04-30 | 2026-07-25 → 2026-07-25 |
| média % | 12.0 | 5.0 |
| partidos | PL 2026-04-30→2026-04-30 | PRD 2026-07-25→2026-07-25 |
| institutos | Exata GO (1) | Instituto Gazeta de Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 7.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delegado Humberto Teófilo × Humberto Chaves

`Senado · GO` · token em comum: `humberto` · distância de edição: 16 · período: disjunto

| | Delegado Humberto Teófilo | Humberto Chaves |
|---|---|---|
| pesquisas | 14 | 1 |
| período | 2026-04-13 → 2026-07-05 | 2026-07-08 → 2026-07-08 |
| média % | 12.1 | 1.0 |
| partidos | Novo 2026-04-13→2026-07-05 | PSOL 2026-07-08→2026-07-08 |
| institutos | Exata GO (2), Paraná Pesquisas (2), Directa (2), Quaest (1), +7 | Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 11.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Vanderlan Cardoso × Vanderlan Gomes

`Senado · GO` · token em comum: `vanderlan` · distância de edição: 6 · período: contido

| | Vanderlan Cardoso | Vanderlan Gomes |
|---|---|---|
| pesquisas | 32 | 1 |
| período | 2025-12-05 → 2026-08-12 | 2026-01-01 → 2026-01-01 |
| média % | 14.2 | 7.9 |
| partidos | PSD 2025-12-05→2026-08-12 | PSD 2026-01-01→2026-01-01 |
| institutos | Direct Pesquisas (6), Portal Goiás (5), Paraná Pesquisas (4), Real Time Big Data (3), +9 | Direct Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 6.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Direct Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Kalil × Alexandre Silveira

`Governador · MG` · token em comum: `alexandre` · distância de edição: 6 · período: contido

| | Alexandre Kalil | Alexandre Silveira |
|---|---|---|
| pesquisas | 26 | 1 |
| período | 2025-08-17 → 2026-07-29 | 2025-08-25 → 2025-08-25 |
| média % | 20.7 | 26.0 |
| partidos | PDT 2025-08-17→2026-07-29 | PSD 2025-08-25→2025-08-25 |
| institutos | Quaest (6), Real Time Big Data (6), AtlasIntel (4), DataTempo (3), +5 | AtlasIntel (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 5.3 p.p.

**Campo gêmeo — 2 ocorrência(s).** AtlasIntel: `2025-08-25` cita *Alexandre Kalil* (8.3%, 1º turno) e `2025-08-25` cita *Alexandre Silveira* (26%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Silvio Nascimento × sílvio costa Filho

`Senado · PE` · token em comum: `silvio` · distância de edição: 9 · período: contido

| | Silvio Nascimento | sílvio costa Filho |
|---|---|---|
| pesquisas | 3 | 1 |
| período | 2026-07-26 → 2026-07-30 | 2026-02-07 → 2026-02-07 |
| média % | 4.0 | 5.0 |
| partidos | PL 2026-07-26→2026-07-30 | Republicanos 2026-02-07→2026-02-07 |
| institutos | Datafolha (1), Quaest (1), Real Time Big Data (1) | Múltipla (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Gianni Nogueira × Gianni do Bolsonaro

`Senado · MS` · token em comum: `gianni` · distância de edição: 10 · período: contido

| | Gianni Nogueira | Gianni do Bolsonaro |
|---|---|---|
| pesquisas | 2 | 1 |
| período | 2026-02-06 → 2026-03-29 | 2025-05-16 → 2025-05-16 |
| média % | 2.8 | 12.1 |
| partidos | PL 2026-02-06→2026-03-29 | PL 2025-05-16→2025-05-16 |
| institutos | Ranking (1), Novo Ibrape (1) | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 9.3 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### André Ceciliano × André Marinho

`Governador · RJ` · token em comum: `andre` · distância de edição: 7 · período: disjunto

| | André Ceciliano | André Marinho |
|---|---|---|
| pesquisas | 1 | 7 |
| período | 2026-03-10 → 2026-03-10 | 2026-04-23 → 2026-07-29 |
| média % | 9.0 | 2.4 |
| partidos | PT 2026-03-10→2026-03-10 | Novo 2026-04-23→2026-07-29 |
| institutos | Real Time Big Data (1) | Paraná Pesquisas (3), Real Time Big Data (1), Prefab (1), Gerp (1), +1 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 6.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Rodrigo Barcellar × Rodrigo Pimentel

`Governador · RJ` · token em comum: `rodrigo` · distância de edição: 8 · período: disjunto

| | Rodrigo Barcellar | Rodrigo Pimentel |
|---|---|---|
| pesquisas | 3 | 1 |
| período | 2025-05-23 → 2025-08-29 | 2026-02-13 → 2026-02-13 |
| média % | 10.6 | 9.1 |
| partidos | União Brasil 2025-05-23→2025-08-29 · PL 2025-08-17→2025-08-17 | Novo 2026-02-13→2026-02-13 |
| institutos | Paraná Pesquisas (1), AtlasIntel (1), Quaest (1) | Prefab (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.5 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

---

## Sobrenome em comum — provável PESSOAS DIFERENTES

Aqui mora a família Bolsonaro. Leia cada um assumindo **pessoas diferentes** até
prova em contrário.

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 405 | 91 |
| período | 2025-06-11 → 2026-08-16 | 2024-03-22 → 2026-06-30 |
| média % | 37.0 | 40.1 |
| partidos | PL 2025-06-11→2026-08-16 | PL 2024-03-22→2026-06-30 |
| institutos | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 | Paraná Pesquisas (37), Quaest (18), AtlasIntel (15), MDA (7), +6 |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 3.1 p.p.

**Campo gêmeo — 28 ocorrência(s).** Quaest: `2025-08-17` cita *Flávio Bolsonaro* (14%, 1º turno) e `2025-08-17` cita *Jair Bolsonaro* (35%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Michelle Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Flávio Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 405 | 83 |
| período | 2025-06-11 → 2026-08-16 | 2024-01-28 → 2026-07-27 |
| média % | 37.0 | 40.3 |
| partidos | PL 2025-06-11→2026-08-16 | PL 2024-01-28→2026-07-27 |
| institutos | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 | Paraná Pesquisas (22), AtlasIntel (16), Futura (13), Quaest (8), +8 |
| fontes | , poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 3.4 p.p.

**Campo gêmeo — 62 ocorrência(s).** Futura: `2025-12-09` cita *Flávio Bolsonaro* (41.6%, 2º turno) e `2025-12-09` cita *Michelle Bolsonaro* (45.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Messias Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 11 · período: contido

| | Flávio Bolsonaro | Jair Messias Bolsonaro |
|---|---|---|
| pesquisas | 405 | 45 |
| período | 2025-06-11 → 2026-08-16 | 2023-07-17 → 2026-07-27 |
| média % | 37.0 | 42.0 |
| partidos | PL 2025-06-11→2026-08-16 | PL 2023-07-17→2026-07-27 |
| institutos | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 |
| fontes | , poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 5.1 p.p.

**Campo gêmeo — 18 ocorrência(s).** Datafolha: `2025-06-11` cita *Flávio Bolsonaro* (38%, 2º turno) e `2025-06-11` cita *Jair Messias Bolsonaro* (45%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Messias Bolsonaro × Michelle Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 10 · período: contido

| | Jair Messias Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 45 | 83 |
| período | 2023-07-17 → 2026-07-27 | 2024-01-28 → 2026-07-27 |
| média % | 42.0 | 40.3 |
| partidos | PL 2023-07-17→2026-07-27 | PL 2024-01-28→2026-07-27 |
| institutos | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 | Paraná Pesquisas (22), AtlasIntel (16), Futura (13), Quaest (8), +8 |
| fontes | , poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 1.7 p.p.

**Campo gêmeo — 35 ocorrência(s).** Futura: `2025-11-08` cita *Jair Messias Bolsonaro* (46.6%, 2º turno) e `2025-11-08` cita *Michelle Bolsonaro* (46.5%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Flávio Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 5 · período: sobreposto

| | Eduardo Bolsonaro | Flávio Bolsonaro |
|---|---|---|
| pesquisas | 34 | 405 |
| período | 2024-12-31 → 2025-12-04 | 2025-06-11 → 2026-08-16 |
| média % | 32.2 | 37.0 |
| partidos | PL 2024-12-31→2025-12-04 | PL 2025-06-11→2026-08-16 |
| institutos | Quaest (8), Futura (6), Datafolha (5), Gerp (4), +6 | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 |
| fontes | , poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 4.7 p.p.

**Campo gêmeo — 6 ocorrência(s).** Datafolha: `2025-06-11` cita *Eduardo Bolsonaro* (38%, 2º turno) e `2025-06-11` cita *Flávio Bolsonaro* (38%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Jair Messias Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 12 · período: sobreposto

| | Eduardo Bolsonaro | Jair Messias Bolsonaro |
|---|---|---|
| pesquisas | 34 | 45 |
| período | 2024-12-31 → 2025-12-04 | 2023-07-17 → 2026-07-27 |
| média % | 32.2 | 42.0 |
| partidos | PL 2024-12-31→2025-12-04 | PL 2023-07-17→2026-07-27 |
| institutos | Quaest (8), Futura (6), Datafolha (5), Gerp (4), +6 | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 |
| fontes | , poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 9.8 p.p.

**Campo gêmeo — 13 ocorrência(s).** Datafolha: `2025-06-11` cita *Eduardo Bolsonaro* (38%, 2º turno) e `2025-06-11` cita *Jair Messias Bolsonaro* (45%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Joel Rodrigues × Toni Rodrigues

`Governador · PI` · token em comum: `rodrigues` · distância de edição: 3 · período: contido

| | Joel Rodrigues | Toni Rodrigues |
|---|---|---|
| pesquisas | 9 | 9 |
| período | 2026-03-15 → 2026-07-27 | 2026-03-15 → 2026-07-12 |
| média % | 20.9 | 3.1 |
| partidos | PP 2026-03-15→2026-07-27 | PL 2026-03-15→2026-07-12 |
| institutos | AtlasIntel (4), Real Time Big Data (2), Intenção Instituto de Pesquisa (1), Data AZ (1), +1 | Amostragem (3), Veritá (3), Vetor (1), Data AZ (1), +1 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 17.8 p.p.

**Campo gêmeo — 1 ocorrência(s).** AtlasIntel: `2026-03-15` cita *Joel Rodrigues* (36%, 2º turno) e `2026-03-15` cita *Toni Rodrigues* (2.6%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Antônio Furlan × Dr. Furlan

`Governador · AP` · token em comum: `furlan` · distância de edição: 7 · período: sobreposto

| | Antônio Furlan | Dr. Furlan |
|---|---|---|
| pesquisas | 5 | 10 |
| período | 2026-03-15 → 2026-07-05 | 2025-07-15 → 2026-08-01 |
| média % | 66.3 | 64.3 |
| partidos | PSD 2026-03-15→2026-07-05 | MDB 2025-07-15→2026-03-24 · PSD 2026-06-13→2026-08-01 |
| institutos | Veritá (3), AtlasIntel (1), Paraná Pesquisas (1) | Paraná Pesquisas (5), Real Time Big Data (3), Veritá (2) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 2.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Veritá, Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Gomes × Tallis Gomes

`Presidente` · token em comum: `gomes` · distância de edição: 6 · período: contido

| | Ciro Gomes | Tallis Gomes |
|---|---|---|
| pesquisas | 115 | 2 |
| período | 2023-10-03 → 2026-05-21 | 2026-02-09 → 2026-02-09 |
| média % | 13.8 | 11.4 |
| partidos | PDT 2023-10-03→2025-10-06 · Democratic Labour Party (Brazil) 2024-05-01→2024-05-01 · PSDB 2025-05-16→2026-05-21 | Sem partido 2026-02-09→2026-02-09 |
| institutos | Paraná Pesquisas (42), Gerp (20), Quaest (10), AtlasIntel (8), +16 | Colectta (2) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Osmar Dias × Álvaro Dias

`Senado · PR` · token em comum: `dias` · distância de edição: 4 · período: disjunto

| | Osmar Dias | Álvaro Dias |
|---|---|---|
| pesquisas | 2 | 16 |
| período | 2025-08-11 → 2026-01-27 | 2026-03-04 → 2026-08-12 |
| média % | 18.4 | 29.2 |
| partidos | Sem partido 2025-08-11→2026-01-27 | MDB 2026-03-04→2026-08-12 |
| institutos | Paraná Pesquisas (1), Futura (1) | Paraná Pesquisas (4), IRG (4), Veritá (3), Neokemp (2), +3 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 10.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Rivaldo Fernandes × Rosália Fernandes

`Senado · RN` · token em comum: `fernandes` · distância de edição: 4 · período: disjunto

| | Rivaldo Fernandes | Rosália Fernandes |
|---|---|---|
| pesquisas | 1 | 28 |
| período | 2025-12-02 → 2025-12-02 | 2026-05-05 → 2026-08-14 |
| média % | 1.0 | 1.4 |
| partidos | PV 2025-12-02→2025-12-02 | PSTU 2026-05-05→2026-08-14 |
| institutos | Real Time Big Data (1) | Seta (5), Item (3), Metadata/Grupo Dial (2), Data Census (2), +10 |
| fontes |  | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Governador · SP` · token em comum: `bolsonaro` · distância de edição: 48 · período: disjunto

| | Flávio Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-01-23 → 2026-01-23 | 2026-07-31 → 2026-07-31 |
| média % | 32.9 | 53.5 |
| partidos | PL 2026-01-23→2026-01-23 | Republicanos 2026-07-31→2026-07-31 |
| institutos | Futura (1) | Vox (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 20.6 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Luiz Giordano × Guilherme Giordano

`Senado · SP` · token em comum: `giordano` · distância de edição: 13 · período: contido

| | Alexandre Luiz Giordano | Guilherme Giordano |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-09-03 → 2025-09-03 | 2025-08-24 → 2025-08-24 |
| média % | 0.1 | 0.5 |
| partidos | MDB 2025-09-03→2025-09-03 | MDB 2025-08-24→2025-08-24 |
| institutos | AtlasIntel (1) | Paraná Pesquisas (1) |
| fontes |  | poder360 |

Partidos: **coincidem (MDB)** · diferença entre as médias: 0.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Eduardo Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 42 · período: disjunto

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Eduardo Bolsonaro |
|---|---|---|
| pesquisas | 1 | 34 |
| período | 2024-03-22 → 2024-03-22 | 2024-12-31 → 2025-12-04 |
| média % | 29.1 | 32.2 |
| partidos | PP 2024-03-22→2024-03-22 | PL 2024-12-31→2025-12-04 |
| institutos | Paraná Pesquisas (1) | Quaest (8), Futura (6), Datafolha (5), Gerp (4), +6 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 3.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Flávio Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 43 · período: disjunto

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Flávio Bolsonaro |
|---|---|---|
| pesquisas | 1 | 405 |
| período | 2024-03-22 → 2024-03-22 | 2025-06-11 → 2026-08-16 |
| média % | 29.1 | 37.0 |
| partidos | PP 2024-03-22→2024-03-22 | PL 2025-06-11→2026-08-16 |
| institutos | Paraná Pesquisas (1) | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 7.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Jair Messias Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 38 · período: sobreposto

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Jair Messias Bolsonaro |
|---|---|---|
| pesquisas | 1 | 45 |
| período | 2024-03-22 → 2024-03-22 | 2023-07-17 → 2026-07-27 |
| média % | 29.1 | 42.0 |
| partidos | PP 2024-03-22→2024-03-22 | PL 2023-07-17→2026-07-27 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 12.9 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno) e `2024-03-22` cita *Jair Messias Bolsonaro* (41.7%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Michelle Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 42 · período: sobreposto

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 1 | 83 |
| período | 2024-03-22 → 2024-03-22 | 2024-01-28 → 2026-07-27 |
| média % | 29.1 | 40.3 |
| partidos | PP 2024-03-22→2024-03-22 | PL 2024-01-28→2026-07-27 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (22), AtlasIntel (16), Futura (13), Quaest (8), +8 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 11.2 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno) e `2024-03-22` cita *Michelle Bolsonaro* (43.4%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 14 · período: contido

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 29.1 | 43.4 |
| partidos | PP 2024-03-22→2024-03-22 | PL 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 14.3 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno) e `2024-03-22` cita *Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro* (43.4%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 11 · período: contido

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 29.1 | 35.3 |
| partidos | PP 2024-03-22→2024-03-22 | PSD 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 6.2 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno) e `2024-03-22` cita *Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro* (35.3%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Romeu Zema, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 9 · período: contido

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 29.1 | 34.6 |
| partidos | PP 2024-03-22→2024-03-22 | Novo 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 5.5 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno) e `2024-03-22` cita *Romeu Zema, com apoio do ex-presidente Jair Bolsonaro* (34.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 12 · período: contido

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 29.1 | 32.6 |
| partidos | PP 2024-03-22→2024-03-22 | União Brasil 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 3.5 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno) e `2024-03-22` cita *Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro* (32.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 12 · período: contido

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 29.1 | 40.8 |
| partidos | PP 2024-03-22→2024-03-22 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 11.7 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno) e `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ex-presidente, jair, bolsonaro` · distância de edição: 21 · período: contido

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 29.1 | 32.2 |
| partidos | PP 2024-03-22→2024-03-22 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PP)** · diferença entre as médias: 3.1 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno) e `2024-03-22` cita *Tereza Cristina, ex-presidente Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 46 · período: contido

| | Eduardo Bolsonaro | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 34 | 1 |
| período | 2024-12-31 → 2025-12-04 | 2024-03-22 → 2024-03-22 |
| média % | 32.2 | 43.4 |
| partidos | PL 2024-12-31→2025-12-04 | PL 2024-03-22→2024-03-22 |
| institutos | Quaest (8), Futura (6), Datafolha (5), Gerp (4), +6 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 11.2 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 41 · período: contido

| | Eduardo Bolsonaro | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 34 | 1 |
| período | 2024-12-31 → 2025-12-04 | 2024-03-22 → 2024-03-22 |
| média % | 32.2 | 35.3 |
| partidos | PL 2024-12-31→2025-12-04 | PSD 2024-03-22→2024-03-22 |
| institutos | Quaest (8), Futura (6), Datafolha (5), Gerp (4), +6 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 3.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Romeu Zema, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 39 · período: contido

| | Eduardo Bolsonaro | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 34 | 1 |
| período | 2024-12-31 → 2025-12-04 | 2024-03-22 → 2024-03-22 |
| média % | 32.2 | 34.6 |
| partidos | PL 2024-12-31→2025-12-04 | Novo 2024-03-22→2024-03-22 |
| institutos | Quaest (8), Futura (6), Datafolha (5), Gerp (4), +6 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 43 · período: contido

| | Eduardo Bolsonaro | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 34 | 1 |
| período | 2024-12-31 → 2025-12-04 | 2024-03-22 → 2024-03-22 |
| média % | 32.2 | 32.6 |
| partidos | PL 2024-12-31→2025-12-04 | União Brasil 2024-03-22→2024-03-22 |
| institutos | Quaest (8), Futura (6), Datafolha (5), Gerp (4), +6 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 48 · período: contido

| | Eduardo Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 34 | 1 |
| período | 2024-12-31 → 2025-12-04 | 2024-03-22 → 2024-03-22 |
| média % | 32.2 | 40.8 |
| partidos | PL 2024-12-31→2025-12-04 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Quaest (8), Futura (6), Datafolha (5), Gerp (4), +6 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 8.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 31 · período: contido

| | Eduardo Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 34 | 1 |
| período | 2024-12-31 → 2025-12-04 | 2024-03-22 → 2024-03-22 |
| média % | 32.2 | 32.2 |
| partidos | PL 2024-12-31→2025-12-04 | PP 2024-03-22→2024-03-22 |
| institutos | Quaest (8), Futura (6), Datafolha (5), Gerp (4), +6 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 47 · período: contido

| | Flávio Bolsonaro | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 405 | 1 |
| período | 2025-06-11 → 2026-08-16 | 2024-03-22 → 2024-03-22 |
| média % | 37.0 | 43.4 |
| partidos | PL 2025-06-11→2026-08-16 | PL 2024-03-22→2024-03-22 |
| institutos | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 6.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 41 · período: contido

| | Flávio Bolsonaro | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 405 | 1 |
| período | 2025-06-11 → 2026-08-16 | 2024-03-22 → 2024-03-22 |
| média % | 37.0 | 35.3 |
| partidos | PL 2025-06-11→2026-08-16 | PSD 2024-03-22→2024-03-22 |
| institutos | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Romeu Zema, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 40 · período: contido

| | Flávio Bolsonaro | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 405 | 1 |
| período | 2025-06-11 → 2026-08-16 | 2024-03-22 → 2024-03-22 |
| média % | 37.0 | 34.6 |
| partidos | PL 2025-06-11→2026-08-16 | Novo 2024-03-22→2024-03-22 |
| institutos | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 43 · período: contido

| | Flávio Bolsonaro | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 405 | 1 |
| período | 2025-06-11 → 2026-08-16 | 2024-03-22 → 2024-03-22 |
| média % | 37.0 | 32.6 |
| partidos | PL 2025-06-11→2026-08-16 | União Brasil 2024-03-22→2024-03-22 |
| institutos | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 4.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 48 · período: contido

| | Flávio Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 405 | 1 |
| período | 2025-06-11 → 2026-08-16 | 2024-03-22 → 2024-03-22 |
| média % | 37.0 | 40.8 |
| partidos | PL 2025-06-11→2026-08-16 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 3.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 33 · período: contido

| | Flávio Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 405 | 1 |
| período | 2025-06-11 → 2026-08-16 | 2024-03-22 → 2024-03-22 |
| média % | 37.0 | 32.2 |
| partidos | PL 2025-06-11→2026-08-16 | PP 2024-03-22→2024-03-22 |
| institutos | Quaest (57), Real Time Big Data (50), AtlasIntel (37), Futura (33), +38 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 4.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Messias Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 44 · período: contido

| | Jair Messias Bolsonaro | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 45 | 1 |
| período | 2023-07-17 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 42.0 | 43.4 |
| partidos | PL 2023-07-17→2026-07-27 | PL 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 1.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Messias Bolsonaro* (41.7%, 2º turno) e `2024-03-22` cita *Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro* (43.4%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Messias Bolsonaro × Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 35 · período: contido

| | Jair Messias Bolsonaro | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 45 | 1 |
| período | 2023-07-17 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 42.0 | 35.3 |
| partidos | PL 2023-07-17→2026-07-27 | PSD 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 6.7 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Messias Bolsonaro* (41.7%, 2º turno) e `2024-03-22` cita *Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro* (35.3%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Messias Bolsonaro × Romeu Zema, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 36 · período: contido

| | Jair Messias Bolsonaro | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 45 | 1 |
| período | 2023-07-17 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 42.0 | 34.6 |
| partidos | PL 2023-07-17→2026-07-27 | Novo 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 7.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Messias Bolsonaro* (41.7%, 2º turno) e `2024-03-22` cita *Romeu Zema, com apoio do ex-presidente Jair Bolsonaro* (34.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Messias Bolsonaro × Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 39 · período: contido

| | Jair Messias Bolsonaro | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 45 | 1 |
| período | 2023-07-17 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 42.0 | 32.6 |
| partidos | PL 2023-07-17→2026-07-27 | União Brasil 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 9.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Messias Bolsonaro* (41.7%, 2º turno) e `2024-03-22` cita *Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro* (32.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Messias Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 43 · período: contido

| | Jair Messias Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 45 | 1 |
| período | 2023-07-17 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 42.0 | 40.8 |
| partidos | PL 2023-07-17→2026-07-27 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.2 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Messias Bolsonaro* (41.7%, 2º turno) e `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Messias Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `jair, bolsonaro` · distância de edição: 29 · período: contido

| | Jair Messias Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 45 | 1 |
| período | 2023-07-17 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 42.0 | 32.2 |
| partidos | PL 2023-07-17→2026-07-27 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (13), Gerp (7), AtlasIntel (7), Futura (5), +5 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 9.8 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Messias Bolsonaro* (41.7%, 2º turno) e `2024-03-22` cita *Tereza Cristina, ex-presidente Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro × Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 40 · período: contido

| | Michelle Bolsonaro | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 83 | 1 |
| período | 2024-01-28 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 40.3 | 35.3 |
| partidos | PL 2024-01-28→2026-07-27 | PSD 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (22), AtlasIntel (16), Futura (13), Quaest (8), +8 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 5.0 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro* (35.3%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro × Romeu Zema, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 39 · período: contido

| | Michelle Bolsonaro | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 83 | 1 |
| período | 2024-01-28 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 40.3 | 34.6 |
| partidos | PL 2024-01-28→2026-07-27 | Novo 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (22), AtlasIntel (16), Futura (13), Quaest (8), +8 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 5.7 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Romeu Zema, com apoio do ex-presidente Jair Bolsonaro* (34.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro × Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 43 · período: contido

| | Michelle Bolsonaro | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 83 | 1 |
| período | 2024-01-28 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 40.3 | 32.6 |
| partidos | PL 2024-01-28→2026-07-27 | União Brasil 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (22), AtlasIntel (16), Futura (13), Quaest (8), +8 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 7.7 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro* (32.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 48 · período: contido

| | Michelle Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 83 | 1 |
| período | 2024-01-28 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 40.3 | 40.8 |
| partidos | PL 2024-01-28→2026-07-27 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (22), AtlasIntel (16), Futura (13), Quaest (8), +8 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.5 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 32 · período: contido

| | Michelle Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 83 | 1 |
| período | 2024-01-28 → 2026-07-27 | 2024-03-22 → 2024-03-22 |
| média % | 40.3 | 32.2 |
| partidos | PL 2024-01-28→2026-07-27 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (22), AtlasIntel (16), Futura (13), Quaest (8), +8 | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 8.1 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Tereza Cristina, ex-presidente Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro × Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 16 · período: contido

| | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 43.4 | 35.3 |
| partidos | PL 2024-03-22→2024-03-22 | PSD 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 8.1 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro* (35.3%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro × Romeu Zema, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 15 · período: contido

| | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 43.4 | 34.6 |
| partidos | PL 2024-03-22→2024-03-22 | Novo 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 8.8 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Romeu Zema, com apoio do ex-presidente Jair Bolsonaro* (34.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro × Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 14 · período: contido

| | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 43.4 | 32.6 |
| partidos | PL 2024-03-22→2024-03-22 | União Brasil 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 10.8 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro* (32.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 17 · período: contido

| | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 43.4 | 40.8 |
| partidos | PL 2024-03-22→2024-03-22 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.6 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ex-presidente, jair, bolsonaro` · distância de edição: 26 · período: contido

| | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 43.4 | 32.2 |
| partidos | PL 2024-03-22→2024-03-22 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 11.2 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro* (43.4%, 2º turno) e `2024-03-22` cita *Tereza Cristina, ex-presidente Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro × Romeu Zema, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 10 · período: contido

| | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 35.3 | 34.6 |
| partidos | PSD 2024-03-22→2024-03-22 | Novo 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.7 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro* (35.3%, 2º turno) e `2024-03-22` cita *Romeu Zema, com apoio do ex-presidente Jair Bolsonaro* (34.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro × Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 11 · período: contido

| | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 35.3 | 32.6 |
| partidos | PSD 2024-03-22→2024-03-22 | União Brasil 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.7 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro* (35.3%, 2º turno) e `2024-03-22` cita *Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro* (32.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 14 · período: contido

| | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 35.3 | 40.8 |
| partidos | PSD 2024-03-22→2024-03-22 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 5.5 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro* (35.3%, 2º turno) e `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ex-presidente, jair, bolsonaro` · distância de edição: 21 · período: contido

| | Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 35.3 | 32.2 |
| partidos | PSD 2024-03-22→2024-03-22 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 3.1 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ratinho Jr., com apoio do ex-presidente Jair Bolsonaro* (35.3%, 2º turno) e `2024-03-22` cita *Tereza Cristina, ex-presidente Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Romeu Zema, com apoio do ex-presidente Jair Bolsonaro × Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 10 · período: contido

| | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 34.6 | 32.6 |
| partidos | Novo 2024-03-22→2024-03-22 | União Brasil 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.0 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Romeu Zema, com apoio do ex-presidente Jair Bolsonaro* (34.6%, 2º turno) e `2024-03-22` cita *Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro* (32.6%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Romeu Zema, com apoio do ex-presidente Jair Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 14 · período: contido

| | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 34.6 | 40.8 |
| partidos | Novo 2024-03-22→2024-03-22 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 6.2 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Romeu Zema, com apoio do ex-presidente Jair Bolsonaro* (34.6%, 2º turno) e `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Romeu Zema, com apoio do ex-presidente Jair Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ex-presidente, jair, bolsonaro` · distância de edição: 18 · período: contido

| | Romeu Zema, com apoio do ex-presidente Jair Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 34.6 | 32.2 |
| partidos | Novo 2024-03-22→2024-03-22 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Romeu Zema, com apoio do ex-presidente Jair Bolsonaro* (34.6%, 2º turno) e `2024-03-22` cita *Tereza Cristina, ex-presidente Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 15 · período: contido

| | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 32.6 | 40.8 |
| partidos | União Brasil 2024-03-22→2024-03-22 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 8.2 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro* (32.6%, 2º turno) e `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ex-presidente, jair, bolsonaro` · distância de edição: 24 · período: contido

| | Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 32.6 | 32.2 |
| partidos | União Brasil 2024-03-22→2024-03-22 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ronaldo Caiado, com apoio do ex-presidente Jair Bolsonaro* (32.6%, 2º turno) e `2024-03-22` cita *Tereza Cristina, ex-presidente Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro × Tereza Cristina, ex-presidente Jair Bolsonaro

`Presidente` · token em comum: `ex-presidente, jair, bolsonaro` · distância de edição: 25 · período: contido

| | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro | Tereza Cristina, ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2024-03-22 |
| média % | 40.8 | 32.2 |
| partidos | Republicanos 2024-03-22→2024-03-22 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 8.6 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno) e `2024-03-22` cita *Tereza Cristina, ex-presidente Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Gracinha Caiado × Ronaldo Caiado

`Governador · GO` · token em comum: `caiado` · distância de edição: 7 · período: contido

| | Gracinha Caiado | Ronaldo Caiado |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2026-04-30 → 2026-04-30 | 2025-08-17 → 2025-08-17 |
| média % | 24.7 | 4.0 |
| partidos | União Brasil 2026-04-30→2026-04-30 | União Brasil 2025-08-17→2025-08-17 |
| institutos | Exata GO (1) | Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (UNIAO BRASIL)** · diferença entre as médias: 20.7 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Dr. Wanderley × José Wanderley Neto

`Senado · AL` · token em comum: `wanderley` · distância de edição: 9 · período: disjunto

| | Dr. Wanderley | José Wanderley Neto |
|---|---|---|
| pesquisas | 1 | 10 |
| período | 2026-01-25 → 2026-01-25 | 2026-03-24 → 2026-07-20 |
| média % | 4.1 | 11.0 |
| partidos | MDB 2026-01-25→2026-01-25 | MDB 2026-03-24→2026-07-20 |
| institutos | TDL (1) | Veritá (2), Vox (2), Falpe (2), Ranking (1), +3 |
| fontes | poder360 | , poder360 |

Partidos: **coincidem (MDB)** · diferença entre as médias: 6.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): TDL.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Rogéria Bolsonaro

`Senado · RJ` · token em comum: `bolsonaro` · distância de edição: 6 · período: disjunto

| | Flávio Bolsonaro | Rogéria Bolsonaro |
|---|---|---|
| pesquisas | 2 | 1 |
| período | 2025-08-27 → 2025-08-29 | 2026-05-08 → 2026-05-08 |
| média % | 28.0 | 17.1 |
| partidos | PL 2025-08-27→2025-08-29 | PL 2026-05-08→2026-05-08 |
| institutos | Paraná Pesquisas (1), AtlasIntel (1) | Veritá (1) |
| fontes | poder360 |  |

Partidos: **coincidem (PL)** · diferença entre as médias: 10.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jesus Rodrigues × Toni Rodrigues

`Governador · PI` · token em comum: `rodrigues` · distância de edição: 5 · período: contido

| | Jesus Rodrigues | Toni Rodrigues |
|---|---|---|
| pesquisas | 1 | 9 |
| período | 2026-07-27 → 2026-07-27 | 2026-03-15 → 2026-07-12 |
| média % | 0.2 | 3.1 |
| partidos | Cidadania 2026-07-27→2026-07-27 | PL 2026-03-15→2026-07-12 |
| institutos | Data AZ (1) | Amostragem (3), Veritá (3), Vetor (1), Data AZ (1), +1 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 3.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Data AZ.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

