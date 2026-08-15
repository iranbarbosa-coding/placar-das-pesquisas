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
| Variação de grafia — provável MESMA pessoa | 18 |
| Título ou apelido — provável MESMA pessoa | 14 |
| Indefinido — precisa de fonte primária | 2 |
| Só o primeiro nome em comum — provável PESSOAS DIFERENTES | 19 |
| Sobrenome em comum — provável PESSOAS DIFERENTES | 10 |
| **Total** | **63** |

Com campo gêmeo (evidência mais forte): **9** par(es).

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

- `Senado · SP` — **Alexandre Luiz Giordano** · **Alexandre Padilha** · **Capitão Derrite** · **Guilherme Boulos** · **Guilherme Derrite** · **Guilherme Giordano** · **Luiz Marinho** (6 pares abaixo)
- `Presidente` — **Eduardo Bolsonaro** · **Eduardo Leite** · **Flávio Bolsonaro** · **Jair Bolsonaro** · **Michelle Bolsonaro** (4 pares abaixo)
- `Governador · MS` — **Jeferson Bezerra** · **Jefferson Bezerra** · **Jefferson Bezzerra** (2 pares abaixo)
- `Senado · TO` — **Carlos Caguin** · **Carlos Gaguim** · **Carlos Velozo** (2 pares abaixo)
- `Senado · CE` — **Alcides Fernandes** · **Pastor Alcides** · **Professor Alcides** (3 pares abaixo)

---

## Variação de grafia — provável MESMA pessoa

Diferença de 1–2 caracteres com o mesmo número de tokens — tipicamente erro de
digitação da fonte. Ainda assim, confirme: `Bady`/`Baldy` e `Medanha`/`Mendanha`
são plausíveis como pessoas distintas até você olhar.

### Zacarias Calil × Zacharias Calil

`Senado · GO` · token em comum: `calil` · distância de edição: 1 · período: sobreposto

| | Zacarias Calil | Zacharias Calil |
|---|---|---|
| pesquisas | 14 | 20 |
| período | 2025-12-05 → 2026-07-28 | 2026-01-01 → 2026-07-31 |
| média % | 14.7 | 9.1 |
| partidos | MDB 2025-12-05→2026-07-28 | União Brasil 2026-01-01→2026-02-21 · MDB 2026-04-10→2026-07-31 |
| institutos | Paraná Pesquisas (3), Real Time Big Data (2), Directa (2), Quaest (1), +6 | Direct Pesquisas (7), Portal Goiás (3), Directa (2), Real Time Big Data (1), +7 |
| fontes | wikipedia | poder360 |

Partidos: **coincidem (MDB)** · diferença entre as médias: 5.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Real Time Big Data, Directa, Quaest, Veritá.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Mateus Simões × Matheus Simões

`Governador · MG` · token em comum: `simoes` · distância de edição: 1 · período: sobreposto

| | Mateus Simões | Matheus Simões |
|---|---|---|
| pesquisas | 9 | 10 |
| período | 2026-03-12 → 2026-06-23 | 2025-08-17 → 2026-07-29 |
| média % | 11.8 | 14.2 |
| partidos | PSD 2026-03-12→2026-06-23 | Novo 2025-08-17→2025-10-05 · PSD 2025-12-09→2026-07-29 |
| institutos | Real Time Big Data (2), DataTempo (2), IPAN/Panorama (1), Doxa (1), +3 | Quaest (5), Real Time Big Data (2), AtlasIntel (2), Paraná Pesquisas (1) |
| fontes | wikipedia | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 2.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, AtlasIntel.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Bady × Alexandre Baldy

`Senado · GO` · token em comum: `alexandre` · distância de edição: 1 · período: sobreposto

| | Alexandre Bady | Alexandre Baldy |
|---|---|---|
| pesquisas | 8 | 18 |
| período | 2026-01-01 → 2026-02-21 | 2025-12-05 → 2026-06-30 |
| média % | 3.4 | 7.0 |
| partidos | PP 2026-01-01→2026-02-21 · DC 2026-02-03→2026-02-11 | PP 2025-12-05→2026-06-30 · Progressistas 2026-04-13→2026-04-13 |
| institutos | Direct Pesquisas (5), Portal Goiás (3) | Paraná Pesquisas (3), Directa (3), Real Time Big Data (2), Papo Aberto/DataRD (1), +9 |
| fontes | poder360 | poder360, wikipedia |

Partidos: **coincidem (PP)** · diferença entre as médias: 3.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Direct Pesquisas, Portal Goiás.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Gustavo Medanha × Gustavo Mendanha

`Senado · GO` · token em comum: `gustavo` · distância de edição: 1 · período: sobreposto

| | Gustavo Medanha | Gustavo Mendanha |
|---|---|---|
| pesquisas | 8 | 13 |
| período | 2026-01-01 → 2026-02-11 | 2025-12-05 → 2026-07-31 |
| média % | 9.2 | 11.0 |
| partidos | PSD 2026-01-01→2026-01-30 · MDB 2026-02-03→2026-02-11 | PSD 2025-12-05→2025-12-05 · PRD 2026-01-12→2026-07-31 · MDB 2026-02-21→2026-02-21 |
| institutos | Direct Pesquisas (6), Portal Goiás (2) | Directa (4), Paraná Pesquisas (2), Real Time Big Data (1), Quaest (1), +5 |
| fontes | poder360 | poder360, wikipedia |

Partidos: **coincidem (PSD, MDB)** · diferença entre as médias: 1.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Portal Goiás.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Marcel van Hattem × Marcel van Hatten

`Senado · RS` · token em comum: `marcel, van` · distância de edição: 1 · período: contido

| | Marcel van Hattem | Marcel van Hatten |
|---|---|---|
| pesquisas | 12 | 5 |
| período | 2025-10-31 → 2026-07-28 | 2025-11-24 → 2026-07-19 |
| média % | 32.8 | 20.3 |
| partidos | NOVO 2025-10-31→2026-07-28 | Novo 2025-11-24→2026-07-19 |
| institutos | Brasmarket (4), Veritá (3), Futura (2), Neokemp (1), +2 | Real Time Big Data (2), 100% Cidades Participações (1), Paraná Pesquisas (1), Quaest (1) |
| fontes | wikipedia | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 12.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Wiliam Siri × William Siri

`Governador · RJ` · token em comum: `siri` · distância de edição: 1 · período: contido

| | Wiliam Siri | William Siri |
|---|---|---|
| pesquisas | 5 | 4 |
| período | 2026-02-13 → 2026-07-30 | 2026-04-04 → 2026-07-25 |
| média % | 1.4 | 4.7 |
| partidos | Psol 2026-02-13→2026-07-30 | PSOL 2026-04-04→2026-07-25 |
| institutos | Prefab (2), Paraná Pesquisas (2), Quaest (1) | Veritá (2), Paraná Pesquisas (1), Quaest (1) |
| fontes | poder360 | wikipedia |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 3.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Euclydes Pettersen × Euclydes Petterson

`Senado · MG` · token em comum: `euclydes` · distância de edição: 1 · período: sobreposto

| | Euclydes Pettersen | Euclydes Petterson |
|---|---|---|
| pesquisas | 3 | 5 |
| período | 2026-03-12 → 2026-05-08 | 2025-08-25 → 2026-07-29 |
| média % | 3.6 | 3.5 |
| partidos | Republicanos 2026-03-12→2026-05-08 | Republicanos 2025-08-25→2026-07-29 · PSB 2026-04-26→2026-04-26 |
| institutos | Veritá (2), Real Time Big Data (1) | Real Time Big Data (2), Quaest (2), AtlasIntel (1) |
| fontes | wikipedia | poder360 |

Partidos: **coincidem (REPUBLICANOS)** · diferença entre as médias: 0.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jeferson Bezerra × Jefferson Bezerra

`Governador · MS` · token em comum: `bezerra` · distância de edição: 1 · período: contido

| | Jeferson Bezerra | Jefferson Bezerra |
|---|---|---|
| pesquisas | 3 | 9 |
| período | 2026-07-21 → 2026-08-12 | 2026-04-10 → 2026-08-05 |
| média % | 0.9 | 1.0 |
| partidos | Agir 2026-07-21→2026-08-12 | Agir 2026-04-10→2026-08-05 |
| institutos | Ranking (3) | Ranking (3), Novo Ibrape (2), IPR (2), Real Time Big Data (1), +1 |
| fontes | poder360 | wikipedia |

Partidos: **coincidem (AGIR)** · diferença entre as médias: 0.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Ranking.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Érica kokay × Érika Kokay

`Senado · DF` · token em comum: `kokay` · distância de edição: 1 · período: sobreposto

| | Érica kokay | Érika Kokay |
|---|---|---|
| pesquisas | 2 | 8 |
| período | 2025-12-08 → 2026-06-23 | 2026-03-19 → 2026-08-07 |
| média % | 13.4 | 21.2 |
| partidos | PT 2025-12-08→2026-06-23 | PT 2026-03-19→2026-08-07 |
| institutos | França (1), Real Time Big Data (1) | Phoenix (2), IGAPE (2), Veritá (1), Correio/Opinião (1), +2 |
| fontes | poder360 | wikipedia |

Partidos: **coincidem (PT)** · diferença entre as médias: 7.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Luis Cesar Bueno × Luiz César Bueno

`Governador · GO` · token em comum: `cesar, bueno` · distância de edição: 1 · período: sobreposto

| | Luis Cesar Bueno | Luiz César Bueno |
|---|---|---|
| pesquisas | 10 | 2 |
| período | 2026-05-17 → 2026-07-28 | 2026-07-08 → 2026-08-04 |
| média % | 4.2 | 6.3 |
| partidos | PT 2026-05-17→2026-07-28 | PT 2026-07-08→2026-08-04 |
| institutos | Diagnóstico/Acieg (2), Paraná Pesquisas (2), Quaest (1), Papo Aberto/DataRD (1), +4 | Real Time Big Data (1), Papo Aberto/DataRD (1) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **coincidem (PT)** · diferença entre as médias: 2.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Papo Aberto/DataRD.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jacques Wagner × Jaques Wagner

`Senado · BA` · token em comum: `wagner` · distância de edição: 1 · período: sobreposto

| | Jacques Wagner | Jaques Wagner |
|---|---|---|
| pesquisas | 2 | 17 |
| período | 2025-11-25 → 2026-02-21 | 2024-02-21 → 2026-08-10 |
| média % | 18.6 | 27.6 |
| partidos | PT 2025-11-25→2026-02-21 | PT 2024-02-21→2026-08-10 |
| institutos | Instituto TML (1), Real Time Big Data (1) | Paraná Pesquisas (5), Quaest (3), Real Time Big Data (2), Veritá (2), +5 |
| fontes | poder360 | poder360, wikipedia |

Partidos: **coincidem (PT)** · diferença entre as médias: 9.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Instituto TML, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jefferson Bezerra × Jefferson Bezzerra

`Governador · MS` · token em comum: `jefferson` · distância de edição: 1 · período: contido

| | Jefferson Bezerra | Jefferson Bezzerra |
|---|---|---|
| pesquisas | 9 | 2 |
| período | 2026-04-10 → 2026-08-05 | 2026-02-06 → 2026-05-11 |
| média % | 1.0 | 0.8 |
| partidos | Agir 2026-04-10→2026-08-05 | Agir 2026-02-06→2026-05-11 |
| institutos | Ranking (3), Novo Ibrape (2), IPR (2), Real Time Big Data (1), +1 | Ranking (1), Real Time Big Data (1) |
| fontes | wikipedia | poder360 |

Partidos: **coincidem (AGIR)** · diferença entre as médias: 0.2 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Ranking, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Paulo Octávio × Paulo Otávio

`Senado · DF` · token em comum: `paulo` · distância de edição: 1 · período: contido

| | Paulo Octávio | Paulo Otávio |
|---|---|---|
| pesquisas | 2 | 1 |
| período | 2026-07-31 → 2026-08-07 | 2025-12-08 → 2025-12-08 |
| média % | 5.9 | 5.0 |
| partidos | PSD 2026-07-31→2026-08-07 | PSD 2025-12-08→2025-12-08 |
| institutos | Brada Comunicação (1), Phoenix (1) | Real Time Big Data (1) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 0.9 p.p.

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
| institutos | Seta (5), Veritá (2), Ranking (2), Índice (2), +5 | Real Time Big Data (1) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 0.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Jair Pereira × Jarir Pereira

`Governador · CE` · token em comum: `pereira` · distância de edição: 1 · período: sobreposto

| | Jair Pereira | Jarir Pereira |
|---|---|---|
| pesquisas | 1 | 18 |
| período | 2026-02-03 → 2026-02-03 | 2026-01-21 → 2026-07-28 |
| média % | 1.0 | 1.1 |
| partidos | Psol 2026-02-03→2026-02-03 | Psol 2026-01-21→2026-07-28 · PSOL 2026-03-24→2026-07-18 |
| institutos | Real Time Big Data (1) | Real Time Big Data (3), Ipec (3), Paraná Pesquisas (3), Veritá (3), +4 |
| fontes | poder360 | poder360, wikipedia |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 0.1 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Sandro Pimental × Sandro Pimentel

`Senado · RN` · token em comum: `sandro` · distância de edição: 1 · período: sobreposto

| | Sandro Pimental | Sandro Pimentel |
|---|---|---|
| pesquisas | 1 | 32 |
| período | 2026-07-22 → 2026-07-22 | 2026-03-18 → 2026-08-12 |
| média % | 0.4 | 2.4 |
| partidos | Psol 2026-07-22→2026-07-22 | PSOL 2026-03-18→2026-08-12 · Psol 2026-05-27→2026-08-10 |
| institutos | Item (1) | Seta (5), Data Census (3), TN/Consult (3), Exatus (3), +12 |
| fontes | poder360 | poder360, wikipedia |

Partidos: **coincidem (PSOL)** · diferença entre as médias: 2.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Item.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Caguin × Carlos Gaguim

`Senado · TO` · token em comum: `carlos` · distância de edição: 2 · período: disjunto

| | Carlos Caguin | Carlos Gaguim |
|---|---|---|
| pesquisas | 1 | 13 |
| período | 2025-04-08 → 2025-04-08 | 2025-08-03 → 2026-07-31 |
| média % | 11.6 | 16.8 |
| partidos | União Brasil 2025-04-08→2025-04-08 | União Brasil 2025-08-03→2026-07-24 · UNIÃO 2026-01-30→2026-07-31 |
| institutos | Paraná Pesquisas (1) | Real Time Big Data (3), Paraná Pesquisas (2), Lucro Ativo (2), Vox (1), +5 |
| fontes | poder360 | poder360, wikipedia |

Partidos: **coincidem (UNIAO BRASIL)** · diferença entre as médias: 5.2 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Emanoel Cacho × Emanuel Cacho

`Governador · SE` · token em comum: `cacho` · distância de edição: 1 · período: disjunto

| | Emanoel Cacho | Emanuel Cacho |
|---|---|---|
| pesquisas | 1 | 14 |
| período | 2026-02-07 → 2026-02-07 | 2026-04-04 → 2026-08-01 |
| média % | 11.5 | 0.9 |
| partidos | PSD 2026-02-07→2026-02-07 | PSDB 2026-04-04→2026-08-01 |
| institutos | França (1) | INOR (3), W1 (2), Real Time Big Data (2), CTAS (2), +5 |
| fontes | poder360 | poder360, wikipedia |

Partidos: **CONTRADIZEM** · diferença entre as médias: 10.6 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

---

## Título ou apelido — provável MESMA pessoa

### Coronel Zucco × Luciano Zucco

`Governador · RS` · token em comum: `zucco` · distância de edição: 7 · período: contido

| | Coronel Zucco | Luciano Zucco |
|---|---|---|
| pesquisas | 10 | 20 |
| período | 2025-08-17 → 2026-07-19 | 2025-02-10 → 2026-07-11 |
| média % | 30.4 | 36.2 |
| partidos | PL 2025-08-17→2026-07-19 | PL 2025-02-10→2026-07-11 |
| institutos | 100% Cidades Participações (4), Quaest (4), Real Time Big Data (1), Paraná Pesquisas (1) | Brasmarket (6), Veritá (4), Futura (4), Real Time Big Data (3), +2 |
| fontes | poder360 | wikipedia |

Partidos: **coincidem (PL)** · diferença entre as médias: 5.8 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Quaest, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Daniel Santos × Dr Daniel

`Governador · PA` · token em comum: `daniel` · distância de edição: 9 · período: contido

| | Daniel Santos | Dr Daniel |
|---|---|---|
| pesquisas | 42 | 9 |
| período | 2024-02-04 → 2026-07-10 | 2025-06-24 → 2026-06-14 |
| média % | 32.5 | 30.1 |
| partidos | PODE 2024-02-04→2026-07-10 · PSB 2025-02-11→2025-12-23 | PSB 2025-06-24→2026-02-04 · Podemos 2026-03-21→2026-06-14 |
| institutos | Doxa (11), Real Time Big Data (7), Ampla (5), Paraná Pesquisas (4), +7 | Paraná Pesquisas (3), Real Time Big Data (2), AtlasIntel (2), Doxa (2) |
| fontes | wikipedia | poder360 |

Partidos: **coincidem (PSB)** · diferença entre as médias: 2.4 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Doxa, Real Time Big Data, Paraná Pesquisas, AtlasIntel.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Capitão Derrite × Guilherme Derrite

`Senado · SP` · token em comum: `derrite` · distância de edição: 9 · período: sobreposto

| | Capitão Derrite | Guilherme Derrite |
|---|---|---|
| pesquisas | 9 | 15 |
| período | 2025-08-24 → 2026-07-03 | 2025-09-03 → 2026-08-08 |
| média % | 21.2 | 20.7 |
| partidos | Progressistas 2025-08-24→2026-04-14 · PP 2026-01-23→2026-07-03 · PL 2026-02-09→2026-02-10 | PP 2025-09-03→2026-08-08 |
| institutos | Paraná Pesquisas (4), Real Time Big Data (1), Futura (1), Datafolha (1), +2 | Veritá (3), AtlasIntel (2), Vox (2), Paraná Pesquisas (2), +6 |
| fontes | poder360 | wikipedia |

Partidos: **coincidem (PP)** · diferença entre as médias: 0.5 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas, Real Time Big Data, Datafolha, Vox.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Dorinha Rezende × Professora Dorinha

`Governador · TO` · token em comum: `dorinha` · distância de edição: 14 · período: sobreposto

| | Dorinha Rezende | Professora Dorinha |
|---|---|---|
| pesquisas | 14 | 9 |
| período | 2025-10-15 → 2026-07-31 | 2025-04-08 → 2026-08-03 |
| média % | 36.3 | 37.5 |
| partidos | UNIÃO 2025-10-15→2026-07-31 | União Brasil 2025-04-08→2026-08-03 |
| institutos | Real Time Big Data (6), Paraná Pesquisas (3), Vox (1), VÓPE/Primeira Página (1), +3 | Paraná Pesquisas (3), Real Time Big Data (3), Voz e Pesquisa (1), Brasmarket (1), +1 |
| fontes | wikipedia | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.3 p.p.

**Campo gêmeo — 6 ocorrência(s).** Paraná Pesquisas: `2026-07-24` cita *Dorinha Rezende* (42.2%, 2º turno) e `2026-07-24` cita *Professora Dorinha* (34.4%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Capitão Contar × Renan Contar

`Senado · MS` · token em comum: `contar` · distância de edição: 6 · período: sobreposto

| | Capitão Contar | Renan Contar |
|---|---|---|
| pesquisas | 5 | 15 |
| período | 2025-11-28 → 2026-07-23 | 2026-03-09 → 2026-08-12 |
| média % | 18.7 | 27.4 |
| partidos | PL 2025-11-28→2026-07-23 | PL 2026-03-09→2026-08-12 |
| institutos | Ranking (3), Real Time Big Data (2) | Ranking (5), Novo Ibrape (3), IPR (3), Veritá (1), +3 |
| fontes | poder360 | wikipedia |

Partidos: **coincidem (PL)** · diferença entre as médias: 8.7 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Ranking, Real Time Big Data.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alcides Fernandes × Pastor Alcides

`Senado · CE` · token em comum: `alcides` · distância de edição: 13 · período: contido

| | Alcides Fernandes | Pastor Alcides |
|---|---|---|
| pesquisas | 16 | 2 |
| período | 2025-02-15 → 2026-08-12 | 2026-02-03 → 2026-04-28 |
| média % | 14.4 | 7.5 |
| partidos | PL 2025-02-15→2026-08-12 | PL 2026-02-03→2026-04-28 |
| institutos | Real Time Big Data (3), Paraná Pesquisas (3), Ipec (3), Veritá (3), +3 | Quaest (1), Real Time Big Data (1) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 6.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Quaest.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Guimarães do PT × José Guimarães

`Senado · CE` · token em comum: `guimaraes` · distância de edição: 11 · período: sobreposto

| | Guimarães do PT | José Guimarães |
|---|---|---|
| pesquisas | 2 | 5 |
| período | 2026-01-21 → 2026-02-28 | 2025-02-15 → 2026-04-01 |
| média % | 14.4 | 13.6 |
| partidos | PT 2026-01-21→2026-02-28 | PT 2025-02-15→2026-04-01 |
| institutos | Paraná Pesquisas (2) | Real Time Big Data (2), Paraná Pesquisas (1), Ipec (1), Futura (1) |
| fontes | poder360 | poder360, wikipedia |

Partidos: **coincidem (PT)** · diferença entre as médias: 0.9 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Sebastião Bocalom × Tião Bocalom

`Governador · AC` · token em comum: `bocalom` · distância de edição: 5 · período: contido

| | Sebastião Bocalom | Tião Bocalom |
|---|---|---|
| pesquisas | 2 | 26 |
| período | 2026-02-03 → 2026-08-09 | 2025-08-17 → 2026-08-09 |
| média % | 16.0 | 21.0 |
| partidos | PL 2026-02-03→2026-02-03 · PSDB 2026-08-09→2026-08-09 | PL 2025-08-17→2026-02-05 · PSDB 2026-03-21→2026-08-09 |
| institutos | Data Control (1), Delta (1) | Delta (12), Real Time Big Data (6), AtlasIntel (2), Paraná Pesquisas (2), +3 |
| fontes | poder360 | poder360, wikipedia |

Partidos: **coincidem (PL, PSDB)** · diferença entre as médias: 5.0 p.p.

**Campo gêmeo — 1 ocorrência(s).** Delta: `2026-08-09` cita *Sebastião Bocalom* (14.02%, 1º turno) e `2026-08-09` cita *Tião Bocalom* (20.68%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Delegado Camargo × Rodrigo Camargo

`Senado · RO` · token em comum: `camargo` · distância de edição: 7 · período: sobreposto

| | Delegado Camargo | Rodrigo Camargo |
|---|---|---|
| pesquisas | 1 | 2 |
| período | 2026-01-20 → 2026-01-20 | 2025-12-10 → 2026-03-19 |
| média % | 7.4 | 7.7 |
| partidos | Podemos 2026-01-20→2026-01-20 | Republicanos 2025-12-10→2026-03-19 |
| institutos | Phoenix (1) | Veritá (1), Real Time Big Data (1) |
| fontes | poder360 | poder360, wikipedia |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.3 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alcides Fernandes × Professor Alcides

`Senado · CE` · token em comum: `alcides` · distância de edição: 12 · período: contido

| | Alcides Fernandes | Professor Alcides |
|---|---|---|
| pesquisas | 16 | 1 |
| período | 2025-02-15 → 2026-08-12 | 2026-01-21 → 2026-01-21 |
| média % | 14.4 | 8.1 |
| partidos | PL 2025-02-15→2026-08-12 | PL 2026-01-21→2026-01-21 |
| institutos | Real Time Big Data (3), Paraná Pesquisas (3), Ipec (3), Veritá (3), +3 | Paraná Pesquisas (1) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 6.3 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Pastor Alcides × Professor Alcides

`Senado · CE` · token em comum: `alcides` · distância de edição: 5 · período: contido

| | Pastor Alcides | Professor Alcides |
|---|---|---|
| pesquisas | 2 | 1 |
| período | 2026-02-03 → 2026-04-28 | 2026-01-21 → 2026-01-21 |
| média % | 7.5 | 8.1 |
| partidos | PL 2026-02-03→2026-04-28 | PL 2026-01-21→2026-01-21 |
| institutos | Quaest (1), Real Time Big Data (1) | Paraná Pesquisas (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 0.6 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Professor Tonny × Tonny Kerley

`Governador · PI` · token em comum: `tonny` · distância de edição: 13 · período: disjunto

| | Professor Tonny | Tonny Kerley |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-11-27 → 2025-11-27 | 2026-03-15 → 2026-03-15 |
| média % | 1.0 | 3.5 |
| partidos | Novo 2025-11-27→2025-11-27 | Novo 2026-03-15→2026-03-15 |
| institutos | Real Time Big Data (1) | AtlasIntel (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 2.5 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Coronel Mello Araújo × Ricardo Mello Araújo

`Senado · SP` · token em comum: `mello, araujo` · distância de edição: 7 · período: sobreposto

| | Coronel Mello Araújo | Ricardo Mello Araújo |
|---|---|---|
| pesquisas | 1 | 5 |
| período | 2026-02-10 → 2026-02-10 | 2025-12-01 → 2026-04-25 |
| média % | 20.3 | 15.2 |
| partidos | PL 2026-02-10→2026-02-10 | PL 2025-12-01→2026-04-25 |
| institutos | Paraná Pesquisas (1) | Real Time Big Data (2), Veritá (1), AtlasIntel (1), Vox (1) |
| fontes | poder360 | wikipedia |

Partidos: **coincidem (PL)** · diferença entre as médias: 5.1 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alessandro Vieira × Delegado Alessandro

`Senado · SE` · token em comum: `alessandro` · distância de edição: 14 · período: contido

| | Alessandro Vieira | Delegado Alessandro |
|---|---|---|
| pesquisas | 17 | 1 |
| período | 2025-11-26 → 2026-08-01 | 2026-02-07 → 2026-02-07 |
| média % | 12.4 | 20.3 |
| partidos | MDB 2025-11-26→2026-08-01 | MDB 2026-02-07→2026-02-07 |
| institutos | W1 (3), Real Time Big Data (3), CTAS (3), INOR (2), +5 | França (1) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **coincidem (MDB)** · diferença entre as médias: 8.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

---

## Indefinido — precisa de fonte primária

### Ciro × Ciro Nogueira

`Presidente` · token em comum: `ciro` · distância de edição: 9 · período: contido

| | Ciro | Ciro Nogueira |
|---|---|---|
| pesquisas | 84 | 1 |
| período | 2023-10-03 → 2026-05-21 | 2024-03-22 → 2024-03-22 |
| média % | 15.6 | 29.1 |
| partidos | PDT 2023-10-03→2025-10-06 · PSDB 2024-03-22→2026-05-21 | PP 2024-03-22→2024-03-22 |
| institutos | Gerp (21), Paraná Pesquisas (16), Quaest (10), MDA (7), +13 | Paraná Pesquisas (1) |
| fontes | poder360, wikipedia | wikipedia |

Partidos: **CONTRADIZEM** · diferença entre as médias: 13.5 p.p.

**Campo gêmeo — 1 ocorrência(s).** Paraná Pesquisas: `2024-03-22` cita *Ciro* (7.5%, 1º turno) e `2024-03-22` cita *Ciro Nogueira* (29.1%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Renan Filho × Renan Santos

`Presidente` · token em comum: `renan` · distância de edição: 5 · período: sobreposto

| | Renan Filho | Renan Santos |
|---|---|---|
| pesquisas | 1 | 157 |
| período | 2025-08-21 → 2025-08-21 | 2025-05-27 → 2026-08-13 |
| média % | 0.7 | 12.7 |
| partidos | MDB 2025-08-21→2025-08-21 | MISSÃO 2025-05-27→2026-08-13 · Missão 2025-11-09→2026-08-12 · Mission 2026-05-05→2026-08-03 |
| institutos | Paraná Pesquisas (1) | Quaest (18), Ideia (17), Nexus (15), AtlasIntel (14), +18 |
| fontes | poder360 | poder360, wikipedia |

Partidos: **CONTRADIZEM** · diferença entre as médias: 12.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

---

## Só o primeiro nome em comum — provável PESSOAS DIFERENTES

Sobrenomes diferentes, só o primeiro nome coincide. Quase sempre pessoas
diferentes — **mas** o nome de urna brasileiro costuma anexar uma filiação
("Fulano do Bolsonaro", "Fulano da Saúde"), então um par assim pode ser a mesma
pessoa com nome de urna e nome civil. Confira antes de descartar.

### Eduardo Bolsonaro × Eduardo Leite

`Presidente` · token em comum: `eduardo` · distância de edição: 8 · período: sobreposto

| | Eduardo Bolsonaro | Eduardo Leite |
|---|---|---|
| pesquisas | 32 | 56 |
| período | 2024-12-31 → 2025-12-04 | 2023-10-03 → 2026-03-29 |
| média % | 32.2 | 18.3 |
| partidos | PL 2024-12-31→2025-12-04 | PSDB 2023-10-03→2025-04-19 · PSD 2024-03-22→2026-03-29 |
| institutos | Quaest (8), Futura (6), Gerp (5), Datafolha (4), +6 | AtlasIntel (22), Quaest (11), Paraná Pesquisas (7), Futura (5), +6 |
| fontes | poder360, wikipedia | poder360, wikipedia |

Partidos: **CONTRADIZEM** · diferença entre as médias: 13.9 p.p.

**Campo gêmeo — 11 ocorrência(s).** AtlasIntel: `2025-01-31` cita *Eduardo Bolsonaro* (36.4%, 2º turno) e `2025-01-31` cita *Eduardo Leite* (0.9%, 1º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Cadu Xavier × Cadu de Lula

`Governador · RN` · token em comum: `cadu` · distância de edição: 7 · período: sobreposto

| | Cadu Xavier | Cadu de Lula |
|---|---|---|
| pesquisas | 17 | 47 |
| período | 2025-09-11 → 2026-08-10 | 2025-09-10 → 2026-08-12 |
| média % | 24.6 | 17.9 |
| partidos | PT 2025-09-11→2026-08-10 | PT 2025-09-10→2026-08-12 |
| institutos | AtlasIntel (6), Data Capital (3), TN/Consult (1), Soluções (1), +6 | Veritá (5), Agorasei (4), AtlasIntel (4), Metadata/Grupo Dial (4), +15 |
| fontes | poder360 | wikipedia |

Partidos: **coincidem (PT)** · diferença entre as médias: 6.7 p.p.

**Campo gêmeo — 12 ocorrência(s).** AtlasIntel: `2026-07-21` cita *Cadu Xavier* (36.3%, 1º turno) e `2026-07-21` cita *Cadu de Lula* (45.7%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Leila Barros × Leila do Vôlei

`Senado · DF` · token em comum: `leila` · distância de edição: 7 · período: contido

| | Leila Barros | Leila do Vôlei |
|---|---|---|
| pesquisas | 8 | 3 |
| período | 2026-03-19 → 2026-08-07 | 2025-12-08 → 2026-07-31 |
| média % | 25.3 | 13.5 |
| partidos | PDT 2026-03-19→2026-08-07 | PDT 2025-12-08→2026-07-31 |
| institutos | Phoenix (2), IGAPE (2), Veritá (1), Correio/Opinião (1), +2 | Brada Comunicação (1), França (1), Real Time Big Data (1) |
| fontes | wikipedia | poder360 |

Partidos: **coincidem (PDT)** · diferença entre as médias: 11.8 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Silvio Costa Filho × Silvio Nascimento

`Senado · PE` · token em comum: `silvio` · distância de edição: 9 · período: disjunto

| | Silvio Costa Filho | Silvio Nascimento |
|---|---|---|
| pesquisas | 8 | 3 |
| período | 2025-08-05 → 2026-03-30 | 2026-07-26 → 2026-07-30 |
| média % | 13.6 | 4.0 |
| partidos | Republicanos 2025-08-05→2026-03-30 | PL 2026-07-26→2026-07-30 |
| institutos | Real Time Big Data (3), Paraná Pesquisas (1), Datafolha (1), Múltipla (1), +2 | Real Time Big Data (1), Datafolha (1), Quaest (1) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 9.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Real Time Big Data, Datafolha.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Vanderlan Cardoso × Vanderlan Gomes

`Senado · GO` · token em comum: `vanderlan` · distância de edição: 6 · período: contido

| | Vanderlan Cardoso | Vanderlan Gomes |
|---|---|---|
| pesquisas | 31 | 2 |
| período | 2025-12-05 → 2026-07-31 | 2026-01-01 → 2026-02-11 |
| média % | 12.4 | 6.2 |
| partidos | PSD 2025-12-05→2026-07-31 | PSD 2026-01-01→2026-02-11 |
| institutos | Direct Pesquisas (5), Portal Goiás (4), Paraná Pesquisas (4), Directa (4), +9 | Direct Pesquisas (2) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 6.2 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Direct Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Rodrigo Bolsonaro × Rodrigo Vieira

`Governador · RN` · token em comum: `rodrigo` · distância de edição: 8 · período: contido

| | Rodrigo Bolsonaro | Rodrigo Vieira |
|---|---|---|
| pesquisas | 17 | 2 |
| período | 2026-05-09 → 2026-08-12 | 2026-07-21 → 2026-07-22 |
| média % | 1.0 | 0.3 |
| partidos | Agir 2026-05-09→2026-08-12 | Agir 2026-07-21→2026-07-21 · DC 2026-07-22→2026-07-22 |
| institutos | Seta (4), Metadata/Grupo Dial (3), DataVero (2), Potengi/Media (2), +6 | AtlasIntel (1), Item (1) |
| fontes | wikipedia | poder360 |

Partidos: **coincidem (AGIR)** · diferença entre as médias: 0.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Item.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### José Aleluia × José Carlos do Pátio

`Governador · BA` · token em comum: `jose` · distância de edição: 12 · período: contido

| | José Aleluia | José Carlos do Pátio |
|---|---|---|
| pesquisas | 7 | 1 |
| período | 2025-08-17 → 2026-04-27 | 2026-02-21 → 2026-02-21 |
| média % | 1.5 | 1.0 |
| partidos | Novo 2025-08-17→2025-11-25 · NOVO 2025-09-19→2026-04-27 | União Brasil 2026-02-21→2026-02-21 |
| institutos | Real Time Big Data (3), Veritá (2), Bahia Notícia/Séculus (1), Quaest (1) | Instituto TML (1) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.5 p.p.

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
| institutos | Novo Ibrape (1), Ranking (1) | Paraná Pesquisas (1) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **coincidem (PL)** · diferença entre as médias: 9.3 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Jordy × Carlos Portinho

`Senado · RJ` · token em comum: `carlos` · distância de edição: 6 · período: sobreposto

| | Carlos Jordy | Carlos Portinho |
|---|---|---|
| pesquisas | 1 | 6 |
| período | 2026-07-01 → 2026-07-01 | 2025-08-29 → 2026-07-30 |
| média % | 12.1 | 7.5 |
| partidos | PL 2026-07-01→2026-07-01 | PL 2025-08-29→2026-07-30 |
| institutos | Paraná Pesquisas (1) | Prefab (2), Paraná Pesquisas (1), AtlasIntel (1), Real Time Big Data (1), +1 |
| fontes | wikipedia | poder360, wikipedia |

Partidos: **coincidem (PL)** · diferença entre as médias: 4.6 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### André Ceciliano × André Marinho

`Governador · RJ` · token em comum: `andre` · distância de edição: 7 · período: disjunto

| | André Ceciliano | André Marinho |
|---|---|---|
| pesquisas | 1 | 3 |
| período | 2026-03-10 → 2026-03-10 | 2026-07-01 → 2026-07-25 |
| média % | 9.0 | 2.3 |
| partidos | PT 2026-03-10→2026-03-10 | NOVO 2026-07-01→2026-07-25 |
| institutos | Real Time Big Data (1) | Paraná Pesquisas (1), Gerp (1), Quaest (1) |
| fontes | poder360 | wikipedia |

Partidos: **CONTRADIZEM** · diferença entre as médias: 6.7 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

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
| partidos | N/A 2025-05-23→2025-05-23 · PL 2025-08-17→2025-08-17 · União Brasil 2025-08-29→2025-08-29 | Novo 2026-02-13→2026-02-13 |
| institutos | AtlasIntel (1), Quaest (1), Paraná Pesquisas (1) | Prefab (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.5 p.p.

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
| institutos | Exata GO (1) | Delta (1) |
| fontes | poder360 | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 7.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Kalil × Alexandre Silveira

`Governador · MG` · token em comum: `alexandre` · distância de edição: 6 · período: contido

| | Alexandre Kalil | Alexandre Silveira |
|---|---|---|
| pesquisas | 25 | 1 |
| período | 2025-08-17 → 2026-07-29 | 2025-08-25 → 2025-08-25 |
| média % | 21.3 | 26.0 |
| partidos | N/A 2025-08-17→2025-08-25 · PDT 2025-10-05→2026-07-29 | PSD 2025-08-25→2025-08-25 |
| institutos | Real Time Big Data (6), Quaest (6), AtlasIntel (4), Doxa (2), +5 | AtlasIntel (1) |
| fontes | poder360, wikipedia | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 4.7 p.p.

**Campo gêmeo — 2 ocorrência(s).** AtlasIntel: `2025-08-25` cita *Alexandre Kalil* (8.3%, 1º turno) e `2025-08-25` cita *Alexandre Silveira* (26%, 2º turno).

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
| institutos | Paraná Pesquisas (1) | Vox (1), VÓPE/Primeira Página (1), Lucro Ativo (1), Veritá (1), +1 |
| fontes | poder360 | wikipedia |

Partidos: **CONTRADIZEM** · diferença entre as médias: 4.6 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Luiz Giordano × Alexandre Padilha

`Senado · SP` · token em comum: `alexandre` · distância de edição: 11 · período: disjunto

| | Alexandre Luiz Giordano | Alexandre Padilha |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-09-03 → 2025-09-03 | 2025-12-08 → 2025-12-08 |
| média % | 0.1 | 15.2 |
| partidos | MDB 2025-09-03→2025-09-03 | PT 2025-12-08→2025-12-08 |
| institutos | AtlasIntel (1) | Paraná Pesquisas (1) |
| fontes | wikipedia | wikipedia |

Partidos: **CONTRADIZEM** · diferença entre as médias: 15.1 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Alexandre Luiz Giordano × Luiz Marinho

`Senado · SP` · token em comum: `luiz` · distância de edição: 16 · período: sobreposto

| | Alexandre Luiz Giordano | Luiz Marinho |
|---|---|---|
| pesquisas | 1 | 2 |
| período | 2025-09-03 → 2025-09-03 | 2025-08-24 → 2025-10-09 |
| média % | 0.1 | 7.0 |
| partidos | MDB 2025-09-03→2025-09-03 | PT 2025-08-24→2025-10-09 |
| institutos | AtlasIntel (1) | Paraná Pesquisas (2) |
| fontes | wikipedia | poder360, wikipedia |

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
| fontes | wikipedia | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 14.0 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Guilherme Derrite × Guilherme Giordano

`Senado · SP` · token em comum: `guilherme` · distância de edição: 7 · período: contido

| | Guilherme Derrite | Guilherme Giordano |
|---|---|---|
| pesquisas | 15 | 1 |
| período | 2025-09-03 → 2026-08-08 | 2025-08-24 → 2025-08-24 |
| média % | 20.7 | 0.5 |
| partidos | PP 2025-09-03→2026-08-08 | MDB 2025-08-24→2025-08-24 |
| institutos | Veritá (3), AtlasIntel (2), Vox (2), Paraná Pesquisas (2), +6 | Paraná Pesquisas (1) |
| fontes | wikipedia | poder360 |

Partidos: **CONTRADIZEM** · diferença entre as médias: 20.2 p.p.

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
| institutos | Quaest (1) | Real Time Big Data (1), Paraná Pesquisas (1), Futura (1) |
| fontes | poder360 | poder360 |

Partidos: **coincidem (NOVO)** · diferença entre as médias: 2.7 p.p.

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
| pesquisas | 229 | 107 |
| período | 2025-06-11 → 2026-08-13 | 2023-07-17 → 2026-07-27 |
| média % | 38.4 | 40.6 |
| partidos | PL 2025-06-11→2026-08-13 | PL 2023-07-17→2026-07-27 · N/A 2025-03-24→2025-05-23 |
| institutos | Futura (27), Gerp (23), Quaest (22), AtlasIntel (21), +19 | Paraná Pesquisas (29), AtlasIntel (20), Quaest (14), MDA (11), +7 |
| fontes | poder360, wikipedia | poder360, wikipedia |

Partidos: **coincidem (PL)** · diferença entre as médias: 2.2 p.p.

**Campo gêmeo — 38 ocorrência(s).** Gerp: `2025-12-10` cita *Flávio Bolsonaro* (25%, 1º turno) e `2025-12-10` cita *Jair Bolsonaro* (43%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Flávio Bolsonaro × Michelle Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 8 · período: contido

| | Flávio Bolsonaro | Michelle Bolsonaro |
|---|---|---|
| pesquisas | 229 | 75 |
| período | 2025-06-11 → 2026-08-13 | 2024-01-28 → 2026-07-27 |
| média % | 38.4 | 40.6 |
| partidos | PL 2025-06-11→2026-08-13 | PL 2024-01-28→2026-07-27 |
| institutos | Futura (27), Gerp (23), Quaest (22), AtlasIntel (21), +19 | Paraná Pesquisas (16), Futura (14), AtlasIntel (14), Quaest (8), +8 |
| fontes | poder360, wikipedia | poder360, wikipedia |

Partidos: **coincidem (PL)** · diferença entre as médias: 2.2 p.p.

**Campo gêmeo — 56 ocorrência(s).** Gerp: `2026-07-07` cita *Flávio Bolsonaro* (45%, 2º turno) e `2026-07-07` cita *Michelle Bolsonaro* (41%, 2º turno).

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Eduardo Bolsonaro × Flávio Bolsonaro

`Presidente` · token em comum: `bolsonaro` · distância de edição: 5 · período: sobreposto

| | Eduardo Bolsonaro | Flávio Bolsonaro |
|---|---|---|
| pesquisas | 32 | 229 |
| período | 2024-12-31 → 2025-12-04 | 2025-06-11 → 2026-08-13 |
| média % | 32.2 | 38.4 |
| partidos | PL 2024-12-31→2025-12-04 | PL 2025-06-11→2026-08-13 |
| institutos | Quaest (8), Futura (6), Gerp (5), Datafolha (4), +6 | Futura (27), Gerp (23), Quaest (22), AtlasIntel (21), +19 |
| fontes | poder360, wikipedia | poder360, wikipedia |

Partidos: **coincidem (PL)** · diferença entre as médias: 6.2 p.p.

**Campo gêmeo — 6 ocorrência(s).** Quaest: `2025-08-17` cita *Eduardo Bolsonaro* (32%, 2º turno) e `2025-08-17` cita *Flávio Bolsonaro* (32%, 2º turno).

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
| institutos | Veritá (3), Paraná Pesquisas (1), AtlasIntel (1) | Paraná Pesquisas (5), Real Time Big Data (3), Veritá (2) |
| fontes | wikipedia | poder360 |

Partidos: **coincidem (PSD)** · diferença entre as médias: 2.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): Veritá, Paraná Pesquisas.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Dr. Wanderley × José Wanderley Neto

`Senado · AL` · token em comum: `wanderley` · distância de edição: 9 · período: sobreposto

| | Dr. Wanderley | José Wanderley Neto |
|---|---|---|
| pesquisas | 3 | 8 |
| período | 2026-01-25 → 2026-07-01 | 2026-03-24 → 2026-07-20 |
| média % | 8.1 | 11.2 |
| partidos | MDB 2026-01-25→2026-07-01 | MDB 2026-03-24→2026-07-20 |
| institutos | TDL (2), Paraná Pesquisas (1) | Vox (2), Veritá (2), Falpe (2), Ranking (1), +1 |
| fontes | poder360 | wikipedia |

Partidos: **coincidem (MDB)** · diferença entre as médias: 3.2 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Carlos Eduardo Alves × Samanda Alves

`Senado · RN` · token em comum: `alves` · distância de edição: 11 · período: disjunto

| | Carlos Eduardo Alves | Samanda Alves |
|---|---|---|
| pesquisas | 2 | 30 |
| período | 2025-12-02 → 2026-01-11 | 2026-04-04 → 2026-08-12 |
| média % | 13.9 | 12.9 |
| partidos | PSD 2025-12-02→2025-12-02 · PDT 2026-01-11→2026-01-11 | PT 2026-04-04→2026-08-12 |
| institutos | DataVero (1), Real Time Big Data (1) | Seta (5), Veritá (3), Data Census (3), Exatus (3), +12 |
| fontes | poder360, wikipedia | wikipedia |

Partidos: **CONTRADIZEM** · diferença entre as médias: 1.0 p.p.

Institutos que usam **os dois** nomes (em datas distantes): DataVero.

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
| fontes | poder360 | wikipedia |

Partidos: **coincidem (PL)** · diferença entre as médias: 10.9 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

### Rivaldo Fernandes × Rosália Fernandes

`Senado · RN` · token em comum: `fernandes` · distância de edição: 4 · período: disjunto

| | Rivaldo Fernandes | Rosália Fernandes |
|---|---|---|
| pesquisas | 1 | 27 |
| período | 2025-12-02 → 2025-12-02 | 2026-05-05 → 2026-08-12 |
| média % | 1.0 | 1.5 |
| partidos | PV 2025-12-02→2025-12-02 | PSTU 2026-05-05→2026-08-12 |
| institutos | Real Time Big Data (1) | Seta (5), Item (2), Agorasei (2), Veritá (2), +10 |
| fontes | wikipedia | poder360, wikipedia |

Partidos: **CONTRADIZEM** · diferença entre as médias: 0.5 p.p.

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

### Alexandre Luiz Giordano × Guilherme Giordano

`Senado · SP` · token em comum: `giordano` · distância de edição: 13 · período: contido

| | Alexandre Luiz Giordano | Guilherme Giordano |
|---|---|---|
| pesquisas | 1 | 1 |
| período | 2025-09-03 → 2025-09-03 | 2025-08-24 → 2025-08-24 |
| média % | 0.1 | 0.5 |
| partidos | MDB 2025-09-03→2025-09-03 | MDB 2025-08-24→2025-08-24 |
| institutos | AtlasIntel (1) | Paraná Pesquisas (1) |
| fontes | wikipedia | poder360 |

Partidos: **coincidem (MDB)** · diferença entre as médias: 0.4 p.p.

Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.

- [ ] mesma pessoa → canônico: `________________`
- [ ] pessoas diferentes
- [ ] não sei — verificar em: `________________`

