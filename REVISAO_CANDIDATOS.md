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
| Título ou apelido — provável MESMA pessoa | 7 |
| Indefinido — precisa de fonte primária | 8 |
| Só o primeiro nome em comum — provável PESSOAS DIFERENTES | 17 |
| Sobrenome em comum — provável PESSOAS DIFERENTES | 44 |
| **Total** | **76** |

Com campo gêmeo (evidência mais forte): **21** par(es).

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

- `Presidente · PR` — **Ciro Gomes** · **Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro** · **Eduardo Bolsonaro** · **Eduardo Leite** · **Flávio Bolsonaro** · **Jair Bolsonaro** · **Michelle Bolsonaro** · **Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro** · **Tarcísio** · **Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro** (24 pares abaixo)
- `Presidente` — **Eduardo Bolsonaro** · **Flávio Bolsonaro** · **Jair Bolsonaro** · **Michelle Bolsonaro** (3 pares abaixo)
- `Presidente · SP` — **Flávio Bolsonaro** · **Jair Bolsonaro** · **Michelle Bolsonaro** (3 pares abaixo)
- `Senado · BA` — **Marcelo Carvalho** · **Marcelo Nilo** · **Marcelo Santtana** (2 pares abaixo)
- `Presidente · AC` — **Flávio Bolsonaro** · **Jair Bolsonaro** · **Michelle Bolsonaro** (3 pares abaixo)

---

## Título ou apelido — provável MESMA pessoa

### Dorinha Rezende × Professora Dorinha

`Governador · TO` · token em comum: `dorinha` · distância de edição: 14 · período: sobreposto

| | Dorinha Rezende | Professora Dorinha |
|---|---|---|
| pesquisas | 15 | 8 |
| período | 2025-10-15 → 2026-07-31 | 2025-04-08 → 2026-08-03 |
| média % | 36.1 | 37.9 |
| partidos | União Brasil 2025-10-15→2026-07-31 | União Brasil 2025-04-08→2026-08-03 |
| institutos | Real Time Big Data (6), Paraná Pesquisas (4), Brasmarketing (1), VÓPE/Primeira Página (1), +3 | Real Time Big Data (3), Paraná Pesquisas (2), Voz e Pesquisa (1), Brasmarket (1), +1 |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (UNIAO BRASIL)** · diferença entre as médias: 1.8 p.p.

**Campo gêmeo — 6 ocorrência(s).** Paraná Pesquisas: `2026-07-24` cita *Dorinha Rezende* (42.2%, 2º turno) e `2026-07-24` cita *Professora Dorinha* (42.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Pereira × Professor Jarir Pereira

`Governador · CE` · token em comum: `pereira` · distância de edição: 11 · período: contido

| | Jair Pereira | Professor Jarir Pereira |
|---|---|---|
| pesquisas | 14 | 5 |
| período | 2026-02-03 → 2026-07-28 | 2026-01-21 → 2026-07-26 |
| média % | 1.0 | 1.5 |
| partidos | PSOL 2026-02-03→2026-07-28 | PSOL 2026-01-21→2026-07-26 |
| institutos | Real Time Big Data (4), Veritá (3), Ipec (2), AtlasIntel (2), +3 | Paraná Pesquisas (2), Ipec (1), Quaest (1), Datafolha (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 0.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Ipec, Quaest, Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delegado Humberto × Humberto Chaves

`Senado · GO` · token em comum: `humberto` · distância de edição: 14 · período: disjunto

| | Delegado Humberto | Humberto Chaves |
|---|---|---|
| pesquisas | 18 | 1 |
| período | 2026-02-03 → 2026-07-05 | 2026-07-08 → 2026-07-08 |
| média % | 10.6 | 1.0 |
| partidos | PL 2026-02-03→2026-02-21 · Novo 2026-04-13→2026-07-05 | PSOL 2026-07-08→2026-07-08 |
| institutos | Portal Goiás (4), Paraná Pesquisas (2), Exata GO (2), Directa (2), +8 | Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 9.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Jair Bolsonaro

`Presidente · PR` · token em comum: `jair, bolsonaro` · distância de edição: 42 · período: sobreposto

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 6 |
| período | 2024-03-22 → 2024-03-22 | 2024-03-22 → 2025-07-06 |
| média % | 29.1 | 43.8 |
| partidos | PP 2024-03-22→2024-03-22 | PL 2024-03-22→2025-07-06 · PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (5), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PP)** · diferença entre as médias: 14.7 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno) e `2024-03-22` cita *Jair Bolsonaro* (37.1%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `jair, bolsonaro` · distância de edição: 47 · período: contido

| | Jair Bolsonaro | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 6 | 1 |
| período | 2024-03-22 → 2025-07-06 | 2024-03-22 → 2024-03-22 |
| média % | 43.8 | 43.4 |
| partidos | PL 2024-03-22→2025-07-06 · PP 2024-03-22→2024-03-22 | PL 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (5), Quaest (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 0.4 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Bolsonaro* (37.1%, 1º turno) e `2024-03-22` cita *Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro* (43.4%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `jair, bolsonaro` · distância de edição: 48 · período: contido

| | Jair Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 6 | 1 |
| período | 2024-03-22 → 2025-07-06 | 2024-03-22 → 2024-03-22 |
| média % | 43.8 | 40.8 |
| partidos | PL 2024-03-22→2025-07-06 · PP 2024-03-22→2024-03-22 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (5), Quaest (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 3.0 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Jair Bolsonaro* (37.1%, 1º turno) e `2024-03-22` cita *Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro* (40.8%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `michelle, bolsonaro` · distância de edição: 43 · período: contido

| | Michelle Bolsonaro | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-07-06 → 2025-07-06 | 2024-03-22 → 2024-03-22 |
| média % | 55.7 | 43.4 |
| partidos | PL 2025-07-06→2025-07-06 | PL 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 12.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

---

## Indefinido — precisa de fonte primária

### Renan Filho × Renan Santos

`Presidente · SP` · token em comum: `renan` · distância de edição: 5 · período: disjunto

| | Renan Filho | Renan Santos |
|---|---|---|
| pesquisas | 2 | 15 |
| período | 2025-07-08 → 2025-08-24 | 2026-01-23 → 2026-08-10 |
| média % | 0.5 | 5.7 |
| partidos | MDB 2025-07-08→2025-08-24 | Missão 2026-01-23→2026-08-10 · União Brasil 2026-02-10→2026-02-10 |
| institutos | Paraná Pesquisas (2) | Enfoque (2), Ideia (2), Real Time Big Data (2), Vox (2), +6 |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 5.2 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Renan Filho × Renan Santos

`Presidente` · token em comum: `renan` · distância de edição: 5 · período: sobreposto

| | Renan Filho | Renan Santos |
|---|---|---|
| pesquisas | 1 | 162 |
| período | 2025-08-21 → 2025-08-21 | 2025-05-27 → 2026-08-16 |
| média % | 1.2 | 12.6 |
| partidos | MDB 2025-08-21→2025-08-21 | Missão 2025-05-27→2026-08-16 |
| institutos | Paraná Pesquisas (1) | Quaest (21), Nexus (17), Ideia (17), AtlasIntel (14), +18 |
| fontes | poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 11.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Renan Filho × Renan Santos

`Presidente · RN` · token em comum: `renan` · distância de edição: 5 · período: disjunto

| | Renan Filho | Renan Santos |
|---|---|---|
| pesquisas | 1 | 4 |
| período | 2025-09-10 → 2025-09-10 | 2026-05-27 → 2026-08-10 |
| média % | 0.7 | 3.8 |
| partidos | MDB 2025-09-10→2025-09-10 | Missão 2026-05-27→2026-08-10 |
| institutos | Paraná Pesquisas (1) | AtlasIntel (2), TN/Consult (1), Data Capital (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 3.1 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Renan Filho × Renan Santos

`Presidente · PR` · token em comum: `renan` · distância de edição: 5 · período: disjunto

| | Renan Filho | Renan Santos |
|---|---|---|
| pesquisas | 1 | 6 |
| período | 2025-07-06 → 2025-07-06 | 2026-01-22 → 2026-07-25 |
| média % | 0.4 | 5.6 |
| partidos | MDB 2025-07-06→2025-07-06 | Missão 2026-01-22→2026-07-25 |
| institutos | Paraná Pesquisas (1) | Quaest (3), Paraná Pesquisas (2), Futura (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 5.2 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Tarcísio × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `tarcisio` · distância de edição: 54 · período: contido

| | Tarcísio | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 3 | 1 |
| período | 2025-02-23 → 2026-01-27 | 2024-03-22 → 2024-03-22 |
| média % | 51.7 | 40.8 |
| partidos | Republicanos 2025-02-23→2026-01-27 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Futura (1), Paraná Pesquisas (1), Quaest (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 10.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Renan Filho × Renan Santos

`Presidente · BA` · token em comum: `renan` · distância de edição: 5 · período: disjunto

| | Renan Filho | Renan Santos |
|---|---|---|
| pesquisas | 1 | 2 |
| período | 2025-07-29 → 2025-07-29 | 2026-04-28 → 2026-07-25 |
| média % | 0.4 | 1.9 |
| partidos | MDB 2025-07-29→2025-07-29 | Missão 2026-04-28→2026-07-25 |
| institutos | Paraná Pesquisas (1) | 100% Cidades Participações (1), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.5 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Renan Filho × Renan Santos

`Presidente · ES` · token em comum: `renan` · distância de edição: 5 · período: disjunto

| | Renan Filho | Renan Santos |
|---|---|---|
| pesquisas | 1 | 5 |
| período | 2025-08-17 → 2025-08-17 | 2026-03-25 → 2026-07-21 |
| média % | 0.9 | 3.6 |
| partidos | MDB 2025-08-17→2025-08-17 | Missão 2026-03-25→2026-07-21 |
| institutos | Paraná Pesquisas (1) | Real Time Big Data (2), Quaest (2), França (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.7 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Renan Filho × Renan Santos

`Presidente · TO` · token em comum: `renan` · distância de edição: 5 · período: disjunto

| | Renan Filho | Renan Santos |
|---|---|---|
| pesquisas | 1 | 2 |
| período | 2025-08-13 → 2025-08-13 | 2026-03-24 → 2026-06-18 |
| média % | 0.2 | 1.5 |
| partidos | MDB 2025-08-13→2025-08-13 | Missão 2026-03-24→2026-06-18 |
| institutos | Paraná Pesquisas (1) | Real Time Big Data (2) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.3 p.p.

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

### Marcio Alves × Márcio França

`Senado · SP` · token em comum: `marcio` · distância de edição: 6 · período: contido

| | Marcio Alves | Márcio França |
|---|---|---|
| pesquisas | 4 | 9 |
| período | 2026-07-28 → 2026-08-13 | 2026-02-09 → 2026-05-31 |
| média % | 1.4 | 15.5 |
| partidos | UP 2026-07-28→2026-08-13 | PSB 2026-02-09→2026-05-31 |
| institutos | Vox (2), Ideia (1), Paraná Pesquisas (1) | Veritá (2), Gerp (2), Badra (1), Quaest (1), +3 |
| fontes | , poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 14.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Vox.

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
| institutos | Paraná Pesquisas (3), Neokemp (1), Futura (1) | Paraná Pesquisas (1), IRG (1), Neokemp (1) |
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
| pesquisas | 7 | 3 |
| período | 2025-08-05 → 2026-03-30 | 2026-07-26 → 2026-07-30 |
| média % | 12.7 | 4.0 |
| partidos | Republicanos 2025-08-05→2026-03-30 | PL 2026-07-26→2026-07-30 |
| institutos | Real Time Big Data (2), Veritá (1), DataTrends (1), Múltipla (1), +2 | Real Time Big Data (1), Datafolha (1), Quaest (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 8.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Datafolha.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Geraldo Alckmin × Geraldo Rufino

`Senado · SP` · token em comum: `geraldo` · distância de edição: 6 · período: disjunto

| | Geraldo Alckmin | Geraldo Rufino |
|---|---|---|
| pesquisas | 3 | 3 |
| período | 2025-08-24 → 2025-12-08 | 2026-08-08 → 2026-08-13 |
| média % | 34.8 | 2.9 |
| partidos | PSB 2025-08-24→2025-12-08 | Podemos 2026-08-08→2026-08-13 |
| institutos | Paraná Pesquisas (2), AtlasIntel (1) | Vox (1), American Analytics (1), Ideia (1) |
| fontes | , poder360 | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 31.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

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
| institutos | Paraná Pesquisas (2) | Prefab (2), Paraná Pesquisas (1), Real Time Big Data (1), Quaest (1), +2 |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 4.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

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
| institutos | Quaest (1) | Futura (1), Real Time Big Data (1), Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 2.7 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Luiz Giordano × Alexandre Padilha

`Senado · SP` · token em comum: `alexandre` · distância de edição: 11 · período: disjunto

| | Alexandre Luiz Giordano | Alexandre Padilha |
|---|---|---|
| pesquisas | 2 | 1 |
| período | 2025-08-24 → 2025-09-03 | 2025-12-08 → 2025-12-08 |
| média % | 0.3 | 14.5 |
| partidos | MDB 2025-08-24→2025-09-03 | PT 2025-12-08→2025-12-08 |
| institutos | AtlasIntel (1), Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 14.2 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Gustavo Gayer × Gustavo Mendanha

`Governador · GO` · token em comum: `gustavo` · distância de edição: 7 · período: disjunto

| | Gustavo Gayer | Gustavo Mendanha |
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
| institutos | Instituto TML (1) | Paraná Pesquisas (1), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 2.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### José Aleluia × José Carlos do Pátio

`Governador · BA` · token em comum: `jose` · distância de edição: 12 · período: contido

| | José Aleluia | José Carlos do Pátio |
|---|---|---|
| pesquisas | 8 | 1 |
| período | 2025-08-17 → 2026-04-27 | 2026-02-21 → 2026-02-21 |
| média % | 1.2 | 1.0 |
| partidos | Novo 2025-08-17→2026-04-27 | União Brasil 2026-02-21→2026-02-21 |
| institutos | Real Time Big Data (3), Veritá (2), Quaest (2), Bahia Notícia/Séculus (1) | Instituto TML (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.2 p.p.

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
| institutos | Real Time Big Data (1) | Paraná Pesquisas (3), Prefab (1), Real Time Big Data (1), Quaest (1), +1 |
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
| institutos | AtlasIntel (1), Quaest (1), Paraná Pesquisas (1) | Prefab (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.5 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

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
| institutos | Real Time Big Data (6), Quaest (6), AtlasIntel (4), DataTempo (3), +5 | AtlasIntel (1) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 5.3 p.p.

**Campo gêmeo — 2 ocorrência(s).** AtlasIntel: `2025-08-25` cita *Alexandre Kalil* (8.3%, 1º turno) e `2025-08-25` cita *Alexandre Silveira* (26%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Gomes × Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `ciro` · distância de edição: 46 · período: contido

| | Ciro Gomes | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 4 | 1 |
| período | 2024-03-22 → 2026-01-22 | 2024-03-22 → 2024-03-22 |
| média % | 5.8 | 29.1 |
| partidos | PDT 2024-03-22→2025-07-06 · PSDB 2026-01-22→2026-01-22 | PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (4) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 23.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro Gomes* (7.5%, 1º turno) e `2024-03-22` cita *Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro* (29.1%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Eduardo Leite

`Presidente · PR` · token em comum: `eduardo` · distância de edição: 8 · período: contido

| | Eduardo Bolsonaro | Eduardo Leite |
|---|---|---|
| pesquisas | 1 | 2 |
| período | 2025-07-06 → 2025-07-06 | 2024-03-22 → 2025-02-25 |
| média % | 49.9 | 2.0 |
| partidos | PL 2025-07-06→2025-07-06 | PSDB 2024-03-22→2025-02-25 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (2) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 47.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Dr. Marcelo Queiroga × Marcelo Queiroz

`Senado · PB` · token em comum: `marcelo` · distância de edição: 6 · período: contido

| | Dr. Marcelo Queiroga | Marcelo Queiroz |
|---|---|---|
| pesquisas | 16 | 1 |
| período | 2026-01-26 → 2026-07-12 | 2025-12-01 → 2025-12-01 |
| média % | 14.1 | 14.0 |
| partidos | PL 2026-01-26→2026-07-12 | PL 2025-12-01→2025-12-01 |
| institutos | Seta (5), Índice (2), Ranking (2), Veritá (2), +5 | Real Time Big Data (1) |
| fontes | , poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 0.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

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
| pesquisas | 235 | 96 |
| período | 2025-06-11 → 2026-08-16 | 2023-07-17 → 2026-07-27 |
| média % | 38.2 | 41.1 |
| partidos | PL 2025-06-11→2026-08-16 | PL 2023-07-17→2026-07-27 |
| institutos | Futura (26), Gerp (24), AtlasIntel (24), Quaest (22), +19 | Paraná Pesquisas (21), AtlasIntel (20), Quaest (14), MDA (11), +7 |
| fontes | , poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 2.9 p.p.

**Campo gêmeo — 38 ocorrência(s).** AtlasIntel: `2026-07-27` cita *Flávio Bolsonaro* (35.8%, 1º turno) e `2026-07-27` cita *Jair Bolsonaro* (43.9%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Michelle Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Flávio Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 235 | 78 |
| período | 2025-06-11 → 2026-08-16 | 2024-01-28 → 2026-07-27 |
| média % | 38.2 | 39.9 |
| partidos | PL 2025-06-11→2026-08-16 | PL 2024-01-28→2026-07-27 |
| institutos | Futura (26), Gerp (24), AtlasIntel (24), Quaest (22), +19 | Paraná Pesquisas (17), AtlasIntel (16), Futura (13), Quaest (8), +8 |
| fontes | , poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 1.7 p.p.

**Campo gêmeo — 60 ocorrência(s).** AtlasIntel: `2026-07-27` cita *Flávio Bolsonaro* (35.8%, 1º turno) e `2026-07-27` cita *Michelle Bolsonaro* (42.5%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Flávio Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 5 · período: sobreposto

| | Eduardo Bolsonaro | Flávio Bolsonaro |
|---|---|---|
| pesquisas | 33 | 235 |
| período | 2024-12-31 → 2025-12-04 | 2025-06-11 → 2026-08-16 |
| média % | 31.7 | 38.2 |
| partidos | PL 2024-12-31→2025-12-04 | PL 2025-06-11→2026-08-16 |
| institutos | Quaest (8), Futura (6), Datafolha (5), Gerp (4), +6 | Futura (26), Gerp (24), AtlasIntel (24), Quaest (22), +19 |
| fontes | , poder360 | , poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 6.5 p.p.

**Campo gêmeo — 6 ocorrência(s).** Datafolha: `2025-12-04` cita *Eduardo Bolsonaro* (35%, 2º turno) e `2025-12-04` cita *Flávio Bolsonaro* (36%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 8 | 6 |
| período | 2026-01-22 → 2026-07-25 | 2024-03-22 → 2025-07-06 |
| média % | 41.6 | 43.8 |
| partidos | PL 2026-01-22→2026-07-25 | PL 2024-03-22→2025-07-06 · PP 2024-03-22→2024-03-22 |
| institutos | Quaest (3), Paraná Pesquisas (3), Futura (2) | Paraná Pesquisas (5), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 2.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Quaest, Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · SP` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 23 | 5 |
| período | 2026-01-23 → 2026-08-10 | 2025-02-23 → 2025-08-24 |
| média % | 40.7 | 43.2 |
| partidos | PL 2026-01-23→2026-08-10 | PL 2025-02-23→2025-08-24 |
| institutos | Vox (4), Futura (4), Real Time Big Data (3), Paraná Pesquisas (3), +6 | Paraná Pesquisas (4), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 2.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · RN` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 6 | 3 |
| período | 2026-01-09 → 2026-07-29 | 2025-02-21 → 2026-05-27 |
| média % | 31.2 | 31.6 |
| partidos | PL 2026-01-09→2026-07-29 | PL 2025-02-21→2026-05-27 |
| institutos | AtlasIntel (3), Data Capital (1), Exatus (1), Instituto Potiguar (1) | Paraná Pesquisas (2), AtlasIntel (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 0.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** AtlasIntel: `2026-05-27` cita *Flávio Bolsonaro* (28.6%, 1º turno) e `2026-05-27` cita *Jair Bolsonaro* (32.2%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · MG` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 10 | 3 |
| período | 2026-03-07 → 2026-07-29 | 2025-02-23 → 2025-10-05 |
| média % | 33.5 | 35.6 |
| partidos | PL 2026-03-07→2026-07-29 | PL 2025-02-23→2025-10-05 |
| institutos | Real Time Big Data (5), Quaest (4), Paraná Pesquisas (1) | Paraná Pesquisas (2), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 2.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Quaest, Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · ES` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 8 | 3 |
| período | 2026-03-25 → 2026-07-21 | 2025-02-09 → 2025-08-17 |
| média % | 39.2 | 44.8 |
| partidos | PL 2026-03-25→2026-07-21 | PL 2025-02-09→2025-08-17 |
| institutos | Real Time Big Data (3), Quaest (3), França (2) | Paraná Pesquisas (3) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 5.6 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Gomes × Tallis Gomes

`Presidente` · token em comum: `gomes` · distância de edição: 6 · período: contido

| | Ciro Gomes | Tallis Gomes |
|---|---|---|
| pesquisas | 81 | 2 |
| período | 2023-10-03 → 2026-05-21 | 2026-02-09 → 2026-02-09 |
| média % | 16.4 | 11.4 |
| partidos | PDT 2023-10-03→2025-10-06 · Democratic Labour Party (Brazil) 2024-05-01→2024-05-01 · PSDB 2025-05-16→2026-05-21 | Sem partido 2026-02-09→2026-02-09 |
| institutos | Gerp (20), Paraná Pesquisas (16), Quaest (11), MDA (7), +13 | Colectta (2) |
| fontes | , poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 4.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Michelle Bolsonaro

`Presidente · AC` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Flávio Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 4 | 2 |
| período | 2025-09-23 → 2026-08-02 | 2025-09-23 → 2025-09-23 |
| média % | 54.9 | 50.8 |
| partidos | PL 2025-09-23→2026-08-02 | PL 2025-09-23→2025-09-23 |
| institutos | AtlasIntel (2), Real Time Big Data (1), Paraná Pesquisas (1) | Paraná Pesquisas (2) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 4.1 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2025-09-23` cita *Flávio Bolsonaro* (52.6%, 2º turno) e `2025-09-23` cita *Michelle Bolsonaro* (42.8%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · CE` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 11 | 2 |
| período | 2026-01-21 → 2026-07-28 | 2025-05-18 → 2025-12-15 |
| média % | 24.8 | 24.3 |
| partidos | PL 2026-01-21→2026-07-28 | PL 2025-05-18→2025-12-15 |
| institutos | Quaest (3), Real Time Big Data (3), AtlasIntel (2), Paraná Pesquisas (2), +1 | Paraná Pesquisas (2) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 0.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · RS` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 5 | 2 |
| período | 2026-04-28 → 2026-07-28 | 2025-02-23 → 2025-03-16 |
| média % | 40.4 | 40.4 |
| partidos | PL 2026-04-28→2026-07-28 | PL 2025-02-23→2025-03-16 |
| institutos | Quaest (4), Real Time Big Data (1) | Paraná Pesquisas (1), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 0.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · RJ` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 13 | 2 |
| período | 2026-02-02 → 2026-07-28 | 2025-02-23 → 2025-04-04 |
| média % | 40.1 | 41.9 |
| partidos | PL 2026-02-02→2026-07-28 | PL 2025-02-23→2025-04-04 |
| institutos | Paraná Pesquisas (4), Real Time Big Data (3), Prefab (2), Quaest (2), +2 | Paraná Pesquisas (1), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 1.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · PE` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 15 | 2 |
| período | 2025-12-30 → 2026-07-26 | 2025-02-23 → 2025-03-12 |
| média % | 26.4 | 29.5 |
| partidos | PL 2025-12-30→2026-07-26 | PL 2025-02-23→2025-03-12 |
| institutos | Quaest (4), Real Time Big Data (4), Veritá (4), Datafolha (2), +1 | Paraná Pesquisas (1), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 3.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · BA` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 3 | 2 |
| período | 2026-04-28 → 2026-07-25 | 2025-02-23 → 2025-07-29 |
| média % | 22.7 | 28.1 |
| partidos | PL 2026-04-28→2026-07-25 | PL 2025-02-23→2025-07-29 |
| institutos | Quaest (2), 100% Cidades Participações (1) | Paraná Pesquisas (1), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 5.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · MS` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 4 | 2 |
| período | 2026-02-06 → 2026-07-23 | 2025-05-16 → 2025-05-25 |
| média % | 38.3 | 46.2 |
| partidos | PL 2026-02-06→2026-07-23 | PL 2025-05-16→2025-05-25 |
| institutos | Ranking (3), Real Time Big Data (1) | Ranking (1), Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 8.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Ranking.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · DF` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 4 | 2 |
| período | 2026-05-10 → 2026-06-23 | 2025-03-25 → 2025-06-04 |
| média % | 39.5 | 39.5 |
| partidos | PL 2026-05-10→2026-06-23 | PL 2025-03-25→2025-06-04 |
| institutos | França (2), Veritá (2) | Paraná Pesquisas (2) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 0.1 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · TO` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 3 | 2 |
| período | 2026-03-24 → 2026-06-18 | 2025-04-08 → 2025-08-13 |
| média % | 37.7 | 41.7 |
| partidos | PL 2026-03-24→2026-06-18 | PL 2025-04-08→2025-08-13 |
| institutos | Real Time Big Data (3) | Paraná Pesquisas (2) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 4.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

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
| institutos | Real Time Big Data (1) | Seta (5), Item (3), DataVero (2), TN/Consult (2), +10 |
| fontes |  | , poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

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

### Flávio Bolsonaro × Michelle Bolsonaro

`Presidente · SP` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Flávio Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 23 | 1 |
| período | 2026-01-23 → 2026-08-10 | 2025-08-24 → 2025-08-24 |
| média % | 40.7 | 46.5 |
| partidos | PL 2026-01-23→2026-08-10 | PL 2025-08-24→2025-08-24 |
| institutos | Vox (4), Futura (4), Real Time Big Data (3), Paraná Pesquisas (3), +6 | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 5.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Michelle Bolsonaro

`Presidente · SP` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Jair Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 5 | 1 |
| período | 2025-02-23 → 2025-08-24 | 2025-08-24 → 2025-08-24 |
| média % | 43.2 | 46.5 |
| partidos | PL 2025-02-23→2025-08-24 | PL 2025-08-24→2025-08-24 |
| institutos | Paraná Pesquisas (4), Quaest (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 3.3 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2025-08-24` cita *Jair Bolsonaro* (38.9%, 1º turno) e `2025-08-24` cita *Michelle Bolsonaro* (46.5%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · AC` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 4 | 1 |
| período | 2025-09-23 → 2026-08-02 | 2025-09-23 → 2025-09-23 |
| média % | 54.9 | 59.3 |
| partidos | PL 2025-09-23→2026-08-02 | PL 2025-09-23→2025-09-23 |
| institutos | AtlasIntel (2), Real Time Big Data (1), Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 4.4 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2025-09-23` cita *Flávio Bolsonaro* (52.6%, 2º turno) e `2025-09-23` cita *Jair Bolsonaro* (59.3%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Michelle Bolsonaro

`Presidente · AC` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Jair Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 1 | 2 |
| período | 2025-09-23 → 2025-09-23 | 2025-09-23 → 2025-09-23 |
| média % | 59.3 | 50.8 |
| partidos | PL 2025-09-23→2025-09-23 | PL 2025-09-23→2025-09-23 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (2) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 8.5 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2025-09-23` cita *Jair Bolsonaro* (59.3%, 2º turno) e `2025-09-23` cita *Michelle Bolsonaro* (42.8%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · GO` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 18 | 1 |
| período | 2026-01-12 → 2026-08-04 | 2025-02-23 → 2025-02-23 |
| média % | 37.9 | 50.0 |
| partidos | PL 2026-01-12→2026-08-04 | PL 2025-02-23→2025-02-23 |
| institutos | Direct Pesquisas (6), Quaest (4), Real Time Big Data (4), Portal Goiás (2), +2 | Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 12.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Michelle Bolsonaro

`Presidente · PA` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Flávio Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 8 | 1 |
| período | 2026-03-21 → 2026-08-03 | 2025-12-15 → 2025-12-15 |
| média % | 34.9 | 29.8 |
| partidos | PL 2026-03-21→2026-08-03 | PL 2025-12-15→2025-12-15 |
| institutos | Quaest (4), Real Time Big Data (2), Doxa (1), Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 5.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

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
| institutos | AtlasIntel (1), Paraná Pesquisas (1) | Veritá (1) |
| fontes | poder360 |  |

Partidos: **coincidem (PL)** · diferença entre as médias: 10.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Jair Bolsonaro

`Presidente · PI` · token em comum: `bolsonaro` · distância de edição: 4 · período: contido

| | Flávio Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 7 | 1 |
| período | 2026-05-18 → 2026-07-27 | 2026-05-18 → 2026-05-18 |
| média % | 19.0 | 20.4 |
| partidos | PL 2026-05-18→2026-07-27 | PL 2026-05-18→2026-05-18 |
| institutos | AtlasIntel (6), Data AZ (1) | AtlasIntel (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 1.4 p.p.

**Campo gêmeo — 2 ocorrência(s).** AtlasIntel: `2026-05-18` cita *Flávio Bolsonaro* (19.4%, 1º turno) e `2026-05-18` cita *Jair Bolsonaro* (20.4%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Eduardo Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 42 · período: disjunto

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Eduardo Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2025-07-06 → 2025-07-06 |
| média % | 29.1 | 49.9 |
| partidos | PP 2024-03-22→2024-03-22 | PL 2025-07-06→2025-07-06 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 20.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Flávio Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 43 · período: disjunto

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Flávio Bolsonaro |
|---|---|---|
| pesquisas | 1 | 8 |
| período | 2024-03-22 → 2024-03-22 | 2026-01-22 → 2026-07-25 |
| média % | 29.1 | 41.6 |
| partidos | PP 2024-03-22→2024-03-22 | PL 2026-01-22→2026-07-25 |
| institutos | Paraná Pesquisas (1) | Quaest (3), Paraná Pesquisas (3), Futura (2) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 12.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Michelle Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 42 · período: disjunto

| | Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2024-03-22 → 2024-03-22 | 2025-07-06 → 2025-07-06 |
| média % | 29.1 | 55.7 |
| partidos | PP 2024-03-22→2024-03-22 | PL 2025-07-06→2025-07-06 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 26.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 14 · período: contido

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

### Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 12 · período: contido

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

### Eduardo Bolsonaro × Flávio Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 5 · período: disjunto

| | Eduardo Bolsonaro | Flávio Bolsonaro |
|---|---|---|
| pesquisas | 1 | 8 |
| período | 2025-07-06 → 2025-07-06 | 2026-01-22 → 2026-07-25 |
| média % | 49.9 | 41.6 |
| partidos | PL 2025-07-06→2025-07-06 | PL 2026-01-22→2026-07-25 |
| institutos | Paraná Pesquisas (1) | Quaest (3), Paraná Pesquisas (3), Futura (2) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 8.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Jair Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 6 · período: contido

| | Eduardo Bolsonaro | Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 6 |
| período | 2025-07-06 → 2025-07-06 | 2024-03-22 → 2025-07-06 |
| média % | 49.9 | 43.8 |
| partidos | PL 2025-07-06→2025-07-06 | PL 2024-03-22→2025-07-06 · PP 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (5), Quaest (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 6.1 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2025-07-06` cita *Eduardo Bolsonaro* (49.9%, 2º turno) e `2025-07-06` cita *Jair Bolsonaro* (34.4%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Michelle Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Eduardo Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-07-06 → 2025-07-06 | 2025-07-06 → 2025-07-06 |
| média % | 49.9 | 55.7 |
| partidos | PL 2025-07-06→2025-07-06 | PL 2025-07-06→2025-07-06 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 5.8 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2025-07-06` cita *Eduardo Bolsonaro* (49.9%, 2º turno) e `2025-07-06` cita *Michelle Bolsonaro* (55.7%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 46 · período: contido

| | Eduardo Bolsonaro | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-07-06 → 2025-07-06 | 2024-03-22 → 2024-03-22 |
| média % | 49.9 | 43.4 |
| partidos | PL 2025-07-06→2025-07-06 | PL 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 6.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 48 · período: contido

| | Eduardo Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-07-06 → 2025-07-06 | 2024-03-22 → 2024-03-22 |
| média % | 49.9 | 40.8 |
| partidos | PL 2025-07-06→2025-07-06 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 9.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Michelle Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Flávio Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 8 | 1 |
| período | 2026-01-22 → 2026-07-25 | 2025-07-06 → 2025-07-06 |
| média % | 41.6 | 55.7 |
| partidos | PL 2026-01-22→2026-07-25 | PL 2025-07-06→2025-07-06 |
| institutos | Quaest (3), Paraná Pesquisas (3), Futura (2) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 14.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 47 · período: contido

| | Flávio Bolsonaro | Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 8 | 1 |
| período | 2026-01-22 → 2026-07-25 | 2024-03-22 → 2024-03-22 |
| média % | 41.6 | 43.4 |
| partidos | PL 2026-01-22→2026-07-25 | PL 2024-03-22→2024-03-22 |
| institutos | Quaest (3), Paraná Pesquisas (3), Futura (2) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 1.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 48 · período: contido

| | Flávio Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 8 | 1 |
| período | 2026-01-22 → 2026-07-25 | 2024-03-22 → 2024-03-22 |
| média % | 41.6 | 40.8 |
| partidos | PL 2026-01-22→2026-07-25 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Quaest (3), Paraná Pesquisas (3), Futura (2) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Bolsonaro × Michelle Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Jair Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 6 | 1 |
| período | 2024-03-22 → 2025-07-06 | 2025-07-06 → 2025-07-06 |
| média % | 43.8 | 55.7 |
| partidos | PL 2024-03-22→2025-07-06 · PP 2024-03-22→2024-03-22 | PL 2025-07-06→2025-07-06 |
| institutos | Paraná Pesquisas (5), Quaest (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 11.9 p.p.

**Campo gêmeo — 2 ocorrência(s).** Paraná Pesquisas: `2025-07-06` cita *Jair Bolsonaro* (34.4%, 1º turno) e `2025-07-06` cita *Michelle Bolsonaro* (55.7%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `bolsonaro` · distância de edição: 48 · período: contido

| | Michelle Bolsonaro | Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-07-06 → 2025-07-06 | 2024-03-22 → 2024-03-22 |
| média % | 55.7 | 40.8 |
| partidos | PL 2025-07-06→2025-07-06 | Republicanos 2024-03-22→2024-03-22 |
| institutos | Paraná Pesquisas (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 14.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Michelle Bolsonaro, com apoio do ex-presidente Jair Bolsonaro × Tarcísio de Freitas, com apoio do ex-presidente Jair Bolsonaro

`Presidente · PR` · token em comum: `com, apoio, ex-presidente, jair, bolsonaro` · distância de edição: 17 · período: contido

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

