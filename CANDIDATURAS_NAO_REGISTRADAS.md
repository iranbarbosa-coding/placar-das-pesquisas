# Candidaturas não registradas — quem foi testado e não se registrou

Gerado por `node scripts/candidaturas-nao-registradas.mjs`. **Enumeração, não reparo.**

O banco guarda muita pesquisa que testou gente que depois não registrou candidatura para
aquela disputa. **Isso não é erro de dado e não se corrige aqui.** O instituto perguntou
mesmo, e na data em que perguntou ninguém sabia quem ia se registrar — a decisão do criador
já está no repositório: *quem foi testado em pesquisa e não se registrou fica também; é fato
sobre a pesquisa, não erro a corrigir*. Este arquivo existe para **sinalizar e catalogar**, e
só para o dia em que uma dessas linhas parecer estar distorcendo a análise de uma pesquisa do
período eleitoral.

**Período eleitoral: a partir de 16/08/2026** (início da campanha). É o gatilho declarado
pelo criador: um confronto cujas pesquisas são todas anteriores a essa data é história; um que
continua sendo perguntado depois dela merece um olhar. A coluna **no período** conta cenários
cujo **fim de campo** é dessa data em diante.

⚠ **Nenhuma conta de média aqui.** `src/lib/average.ts` é dono de *quais pesquisas entram na
média*, e uma segunda cópia neste relatório seria o defeito do §5. As colunas abaixo são fato
cru — quantos cenários, quais datas, qual candidatura consta do registro — e o julgamento é de
um humano. O que eu achei que merece atenção está em prosa na seção **Leitura**, não em conta.

## Placar

| população | o que é | quantas |
|---|---|---|
| **SEM CANDIDATURA** | a pessoa não tem candidatura nesta disputa, e o casador procurou o nome dela **até onde alcança**: no registro inteiro nas 28 linhas da disputa nacional, e só na UF da disputa mais as 13 candidaturas nacionais nas 292 estaduais | **320** |
| **OUTRA DISPUTA** | a pessoa não tem candidatura nesta disputa mas TEM em outra — o caso Tarcísio | **59** |
| *contradição no nosso banco* | outra linha de pessoa carrega a MESMA grafia e TEM candidatura — **recusado**, nunca afirmado | 6 |
| *não determinado* | não dá para afirmar nem uma coisa nem outra — **recusado**, nunca contado como não registrada | 8 |
| **confrontos de 2º turno** | confrontos com ao menos um dos dois acima | **108** |
| *confrontos não determinados* | nenhum afirmado, mas ao menos um não determinado | 3 |
| *denominador* | confrontos de 2º turno que o banco guarda ao todo, inclusive os em que todo mundo se registrou | 190 |

Disputas com ao menos uma linha: **53** · cenários de 2º turno alcançados pelos confrontos afirmados: **615** de 1537.
Cenários no período eleitoral: **0** nas linhas de candidato, **0** nas de confronto —
de **13** cenários que o banco tem com campo encerrado em 16/08/2026 ou depois, em 4 levantamento(s).

## ⚠ O que esta lista NÃO enxerga

Numa disputa **estadual** o casador de nomes só procurou o nome na UF daquela disputa e entre
as 13 candidaturas nacionais — **ele não olha os outros 26 estados**. Então quem se registrou
num estado que não foi procurado, **e** que nunca foi pesquisado sob uma grafia que colidisse
com a de alguém registrado, **continua aparecendo aqui como sem candidatura**: são as
**292 de 320** linhas afirmadas que saem de disputa estadual. Não é engano de leitura — é o
alcance do que dá para provar com o que temos hoje.

**Se uma linha desta lista importar para uma decisão, confira o nome no registro antes de agir.**

Nas 28 linhas da disputa nacional a busca varreu o registro inteiro, e ali a negativa é forte.

As duas condições são conjuntas de propósito: quem foi pesquisado sob uma grafia que colide com
a de alguém registrado **não** cai nesta sombra — é interceptado pelo passo 5 e vai para a
tabela de contradições. A sombra é só de quem escapou das duas.

Foi exatamente essa a falha da primeira versão deste arquivo: ela afirmou "nenhuma no registro"
em três linhas estaduais e as três estavam erradas. O passo 5 e a coluna escopada fecham o que
é demonstrável; **este parágrafo é o que sobra, e sobra de propósito** — dizer o resto exigiria
um segundo casador, que é o que o §5 proíbe.

## Como cada linha é classificada

A pergunta "esta pessoa tem candidatura nesta disputa?" é respondida por `data/people.ndjson`,
onde `resolvePerson` — via `ballotCandidacy` e `data/ballot-names.json` — **já** gravou com que
candidatura do TSE cada pessoa casou. Não há segundo casador nem segundo normalizador aqui (§5).

A ordem das checagens, da evidência mais forte para a mais fraca:

1. tem candidatura **nesta** disputa → registrada, não entra neste arquivo;
2. tem candidatura em **outra** disputa → **OUTRA DISPUTA**, e a disputa vai na coluna;
3. o casador **recusou** alguma grafia por ambiguidade (`ballot-names.json.ambiguos`) → **não determinado**;
4. alguma grafia **nunca foi examinada** pelo casador (não está em `data/nomes-crus.json` da disputa pesquisada) → **não determinado**;
5. **outra linha de pessoa do nosso próprio banco carrega a mesma grafia e TEM candidatura** → *contradição*;
6. todas foram examinadas e nenhuma achou candidatura ao alcance do casador → **SEM CANDIDATURA**.

### O passo 5 existe porque a versão anterior deste arquivo publicou afirmação falsa

A conferência independente leu **todas as 326** linhas então afirmadas contra
`data/candidaturas.ndjson` — não por amostra — e três estavam erradas:

| disputa | a linha dizia | o registro diz |
|---|---|---|
| `governador:GO` | Michelle Bolsonaro — nenhuma no registro | `senador:DF` MICHELLE BOLSONARO |
| `senador:MS` | Simone Tebet — nenhuma no registro | `senador:SP` SIMONE TEBET |
| `governador:GO` | Ciro Gomes — nenhuma no registro | `governador:CE` CIRO GOMES |

E o arquivo **contradizia a si mesmo**: a seção `presidente:BR` publicava Ciro Gomes em
`governador:CE` e Michelle em `senador:DF`, enquanto a seção `governador:GO` publicava os dois
como não tendo nada no registro.

A causa está em `scripts/match-ballot-names.mjs`, na reserva de registro inteiro:

```js
if (ufPesquisa !== "BR" && c.uf && c.uf !== ufPesquisa) continue;
```

Uma candidatura de **outro estado** é recusada **de propósito** — é a regra que impede o
"Álvaro Dias" do Paraná de sair carregando o registro do "ÁLVARO DIAS" do Rio Grande do
Norte. Só que essa recusa é contada como `stats.sem`, e o passo final lia `stats.sem` como
*nenhuma candidatura no registro inteiro*. Numa disputa **estadual o casador nunca olhou fora
do estado**: existem **quatro** desfechos, não três, e o quarto é "examinado e recusado pela
regra de estado". É o defeito de `LACUNAS_PODER360.md` outra vez, um nível acima — o nosso
próprio casador se abstendo, publicado como fato sobre o mundo.

**O conserto não é um segundo casador** (§5): sair procurando o nome nos outros estados seria
uma segunda regra de identidade. O passo 5 é barato e não decide nada — pergunta se o nosso
banco já se contradiz sobre a **mesma grafia normalizada**. Quando duas linhas de pessoa
carregam a mesma grafia e uma delas tem candidatura, não é afirmação que a gente possa publicar.

**E o alcance da negativa passou a ser dito na coluna, em vez de subentendido.** Numa disputa
estadual a coluna agora lê `nenhuma em \`UF\` nem nacional`, que é exatamente o que ficou
provado: nenhuma candidatura compatível naquela UF (governo e senado) nem entre as 13
nacionais. Só em `presidente:BR` — onde a regra de estado é isenta nas duas pontas — a frase
forte `nenhuma no registro inteiro` continua valendo. É esta coluna que deixa honestos os
casos que o passo 5 **não** alcança, como Toni Rodrigues (`governador:PI`) e José Guimarães
(`governador:CE`), cujas grafias não aparecem em nenhuma outra linha do nosso banco.

⚠ **O balde de contradição mistura três espécies, e separá-las é ruling de humano, não conta
de relatório** (§4, §12): a mesma pessoa partida em duas linhas (Michelle, Tebet, Ciro Gomes);
homônimos que a curadoria já declarou pessoas **diferentes** (os dois "Álvaro Dias" do PR
contra o do RN — a regra de estado existe por causa deles, e continuam corretamente recusados);
e o indecidível sem documento (Ravenna Castro × Ravenna da Inclusão). **Este relatório não
decide nenhuma das três.**

**O passo 4 é a regra que impede a inferência proibida (§4), e ele não é decorativo.** Sem ele,
quatro pessoas sairiam daqui afirmadas como "nenhuma candidatura no registro inteiro", e para
três a afirmação é falsa contra `data/candidaturas.ndjson`:

| disputa | pessoa | a grafia que o casador examinou | a candidatura que existe |
|---|---|---|---|
| `governador:GO` | Gustavo Mendanha | "Gustavo Medanha" (um `n` a menos, como o instituto publicou) | `senador:GO` |
| `governador:SP` | Guilherme Derrite | "Capitão Derrite" | `senador:SP` |
| `presidente:BR` | Ciro Nogueira | "Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro" | `senador:PI` |

Em todos, o nome que **alcançaria** a candidatura é o nome canonizado por nós, que o casador
nunca viu. Afirmar a partir da nossa própria falha de casamento é exatamente o que o §4 proíbe.

**A chave de exame não dobra para a nacional, e a conta dos dois jeitos é rodada a cada
geração — não é lembrança.** Em quase todo o resto do repositório `presidente:PR` dobra para
`presidente:BR`, porque a disputa é nacional e só a amostra é estadual. A pergunta "tem
candidatura nesta disputa?" usa a dobra; a pergunta "o casador examinou esta grafia?" não.

| | sem candidatura | contradições | não determinados |
|---|---|---|---|
| **sem dobra** — o que está publicado neste arquivo | **320** | 6 | 8 |
| com dobra dos dois lados | 321 | 7 | 6 |

Hoje a dobra **resolveria 2 não determinado(s)**: 1 viraria(m) afirmação e 1 viraria(m) contradição.

⚠ **A razão escrita aqui em 18/08/2026 deixou de valer no mesmo dia, e isto é a correção.** Ela
dizia que dobrar produziria uma *afirmação falsa* sobre Ciro Nogueira — a linha sem registro
nascida da grafia com cláusula herdaria o exame de "Ciro Nogueira" em `presidente:BR` e sairia
como "nenhuma no registro", sendo ele registrado em `senador:PI`. Isso **era** verdade, e
deixou de ser quando o passo 5 entrou na mesma série: hoje a dobra manda essa linha para a
tabela de **contradições**, não para uma afirmação. A justificativa sobreviveu à sua própria
causa por uma rodada.

**O que sobra como razão, e é razão suficiente:** sem dobra existem DUAS barreiras independentes
entre esta linha e uma afirmação falsa — a chave de exame por disputa pesquisada e o passo 5.
Com a dobra sobra uma. O preço de manter as duas é uma recusa a mais, e a direção declarada
deste repositório é errar para o lado de não afirmar.

## Leitura — o que salta aos olhos

- **A presidencial é o grosso.** 40 pessoas testadas para presidente não têm candidatura presidencial, e elas aparecem em 42 confrontos de 2º turno da disputa (de 57), somando 493 de 1079 cenários.
- **Restringindo à amostra nacional** — que é o recorte em que o criador mediu —, o banco tem **47 confrontos** de 2º turno e **854 cenários**. Destes, **36 confrontos (429 cenários)** têm alguém sem candidatura presidencial *afirmado*, e **1 confronto(s) (5 cenários)** ficam em não determinado. A **soma, 37 confrontos e 434 cenários**, é exatamente a medida de 17/08/2026 — a diferença é que aqui a linha que não dá para afirmar está separada, em vez de contada junto.
- **Registrados em outra disputa — o caso mais interessante.** 12 das pessoas testadas para presidente se registraram para outro cargo: **Tarcísio** (governador:SP, 166 cenários); **Ciro Gomes** (governador:CE, 118 cenários); **Michelle Bolsonaro** (senador:DF, 84 cenários); **Cabo Daciolo** (governador:AM, 82 cenários); **Fernando Haddad** (governador:SP, 37 cenários); e outros. O instituto perguntou por eles como presidenciáveis e eles foram disputar governo ou senado.
- **Nenhum confronto afirmado tem cenário no período eleitoral, e nenhuma linha de candidato também.** É o achado que mais importa para a decisão do criador: hoje nenhuma dessas linhas está distorcendo pesquisa de campanha, porque nenhuma delas foi perguntada de 16/08/2026 em diante. **Mas leia o `0` com o denominador ao lado:** o banco tem só **13 cenários** com campo encerrado nessa data ou depois, em **4 levantamento(s)** — o corte é de dois dias atrás. O `0` mede tanto a idade do corte quanto a ausência do problema, e este arquivo tem de ser relido quando houver campo pós-corte de verdade.
- **Os que mais recentemente ainda estavam sendo perguntados:** Alexandre Kalil × Marcelo Aro — 29/07/2026 (governador:MG); Marcelo Aro × Patrus Ananias — 29/07/2026 (governador:MG); Jair Bolsonaro × Lula — 27/07/2026 (presidente:BR); Lula × Michelle Bolsonaro — 27/07/2026 (presidente:BR); Fernando Haddad × Flávio Bolsonaro — 27/07/2026 (presidente:BR).
- **8 linha(s) de candidato e 3 de confronto ficaram sem resposta**, e continuam sem. Elas não são "não registradas" — são casos em que a nossa própria máquina de casamento não conseguiu dizer, e o §4 manda recusar em vez de escolher.
- **6 linha(s) foram recusadas porque o nosso próprio banco carrega a mesma grafia registrada** — e este é o achado que mais pede decisão do criador: Ciro Gomes em `governador:GO` ⟂ `governador:CE`; Michelle Bolsonaro em `governador:GO` ⟂ `senador:DF`; Alvaro Dias em `governador:PR` ⟂ `governador:RN`; Simone Tebet em `senador:MS` ⟂ `senador:SP`; Ravenna Castro em `senador:PI` ⟂ `governador:PI`; Álvaro Dias em `senador:PR` ⟂ `governador:RN`. São três espécies misturadas — a mesma pessoa partida em duas linhas, homônimos já declarados pessoas diferentes, e o indecidível sem documento — e **nenhuma delas é decidida aqui**.
- **O mesmo nome em duas linhas de pessoa é um rachado de identidade do banco, não erro deste relatório — e ele não está só na presidencial.** Em `presidente:BR` há duas linhas "Ciro Nogueira" e duas "Ciro Gomes", uma registrada e uma não. A versão anterior deste arquivo dizia que isso era inofensivo por ser coisa de `presidente:BR`, e estava errado: em disputa ESTADUAL o mesmo rachado produziu afirmação falsa sobre Michelle Bolsonaro, Simone Tebet e Ciro Gomes, porque ali a regra de estado do casador impede o encontro. Está anotado, `person_id` a `person_id`, e **não foi corrigido** — achado fora das classes do censo se anota, não se conserta no meio da rodada (§9).

---

## Presidente · Brasil — `presidente:BR`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | nacionais | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Ratinho Jr | `p_15e3aa70417f` | 200 | 132 | 144 | 03/10/2023 | 30/03/2026 | 0 | 0 | nenhuma no registro inteiro |
| 2 | Tarcísio | `p_26e6aad71206` | 166 | 134 | 119 | 17/07/2023 | 23/03/2026 | 0 | 0 | `governador:SP` |
| 3 | Jair Bolsonaro | `p_d2eb6c8a0aa6` | 136 | 96 | 113 | 17/07/2023 | 27/07/2026 | 0 | 0 | nenhuma no registro inteiro |
| 4 | Ciro Gomes | `p_46e43c67194e` | 118 | 81 | 101 | 03/10/2023 | 21/05/2026 | 0 | 0 | `governador:CE` |
| 5 | Aldo Rebelo | `p_4ea832b43410` | 99 | 61 | 86 | 14/12/2025 | 27/07/2026 | 0 | 0 | nenhuma no registro inteiro |
| 6 | Michelle Bolsonaro | `p_a24a364b9a5e` | 84 | 78 | 73 | 28/01/2024 | 27/07/2026 | 0 | 0 | `senador:DF` |
| 7 | Cabo Daciolo | `p_0dfb7b95bb84` | 82 | 45 | 81 | 09/04/2026 | 09/08/2026 | 0 | 0 | `governador:AM` |
| 8 | Eduardo Leite | `p_477731d9502e` | 73 | 59 | 58 | 03/10/2023 | 29/03/2026 | 0 | 0 | nenhuma no registro inteiro |
| 9 | Joaquim Barbosa | `p_f7d6f9a23b58` | 62 | 33 | 57 | 24/05/2026 | 27/07/2026 | 0 | 0 | nenhuma no registro inteiro |
| 10 | Fernando Haddad | `p_39b752645a0c` | 37 | 37 | 22 | 09/12/2024 | 27/07/2026 | 0 | 0 | `governador:SP` |
| 11 | Eduardo Bolsonaro | `p_85b089869a7e` | 34 | 33 | 27 | 31/12/2024 | 04/12/2025 | 0 | 0 | nenhuma no registro inteiro |
| 12 | Helder | `p_ebf010c8c42f` | 27 | 9 | 27 | 28/01/2024 | 26/01/2026 | 0 | 0 | `senador:PA` |
| 13 | Aécio Neves | `p_f04ff3c640fe` | 25 | 13 | 24 | 26/05/2026 | 12/07/2026 | 0 | 0 | nenhuma no registro inteiro |
| 14 | Gusttavo Lima | `p_37eca5546bbb` | 22 | 11 | 20 | 31/12/2024 | 16/03/2025 | 0 | 0 | nenhuma no registro inteiro |
| 15 | Geraldo Alckmin | `p_7edd8a75b6ea` | 17 | 13 | 12 | 22/03/2025 | 27/07/2026 | 0 | 0 | nenhuma no registro inteiro |
| 16 | Simone Tebet | `p_d957177e5198` | 11 | 10 | 11 | 03/10/2023 | 11/09/2025 | 0 | 0 | `senador:SP` |
| 17 | Renan Filho | `p_adcfbcc04182` | 8 | 1 | 8 | 06/07/2025 | 10/09/2025 | 0 | 0 | `governador:AL` |
| 18 | Marina Silva | `p_d410430276d1` | 5 | 5 | 5 | 31/12/2024 | 24/04/2025 | 0 | 0 | `senador:SP` |
| 19 | Leonardo Avalanche | `p_8fa28bcb7d26` | 4 | 3 | 4 | 28/07/2026 | 12/08/2026 | 0 | 0 | nenhuma no registro inteiro |
| 20 | Sérgio Moro | `p_54d2d3ee8d18` | 4 | 4 | 4 | 03/10/2023 | 31/01/2025 | 0 | 0 | `governador:PR` |
| 21 | Michel Temer | `p_da57956d1174` | 3 | 3 | 2 | 30/08/2025 | 14/06/2026 | 0 | 0 | nenhuma no registro inteiro |
| 22 | Rogério Marinho | `p_ff027ea7b12b` | 3 | 3 | 2 | 22/06/2025 | 25/08/2025 | 0 | 0 | nenhuma no registro inteiro |
| 23 | Márcio França | `p_4a062b679636` | 3 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | nenhuma no registro inteiro |
| 24 | Heró Bezerra | `p_6188e42309e8` | 2 | 1 | 2 | 13/07/2026 | 09/08/2026 | 0 | 0 | nenhuma no registro inteiro |
| 25 | Tallis Gomes | `p_6b5346d45a1b` | 2 | 2 | 1 | 09/02/2026 | 09/02/2026 | 0 | 0 | nenhuma no registro inteiro |
| 26 | Átila Maia | `p_81c2ddec6a94` | 2 | 0 | 2 | 20/01/2026 | 05/02/2026 | 0 | 0 | nenhuma no registro inteiro |
| 27 | Luciano Huck | `p_32a21a84130a` | 2 | 0 | 2 | 20/01/2026 | 05/02/2026 | 0 | 0 | nenhuma no registro inteiro |
| 28 | Gilberto Kassab | `p_976de74d69a8` | 2 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | nenhuma no registro inteiro |
| 29 | Ricardo Nunes | `p_f5267115dd99` | 2 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | nenhuma no registro inteiro |
| 30 | Ciro Nogueira | `p_d1d976cf89d4` | 2 | 2 | 2 | 22/03/2024 | 22/03/2024 | 0 | 0 | `senador:PI` |
| 31 | Damares Alves | `p_b74b1fd2cdee` | 1 | 1 | 1 | 07/07/2026 | 07/07/2026 | 0 | 0 | nenhuma no registro inteiro |
| 32 | Marcos Pontes | `p_0b3fb9d23ffe` | 1 | 1 | 1 | 07/07/2026 | 07/07/2026 | 0 | 0 | nenhuma no registro inteiro |
| 33 | João Campos | `p_0b4a9a35fe3c` | 1 | 1 | 1 | 11/09/2025 | 11/09/2025 | 0 | 0 | `governador:PE` |
| 34 | Nikolas Ferreira | `p_fd36a4b1762f` | 1 | 1 | 1 | 11/09/2025 | 11/09/2025 | 0 | 0 | nenhuma no registro inteiro |
| 35 | Tabata Amaral | `p_dcd1302fd688` | 1 | 1 | 1 | 11/09/2025 | 11/09/2025 | 0 | 0 | nenhuma no registro inteiro |
| 36 | Alexandre Padilha | `p_d9916bd714f7` | 1 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | nenhuma no registro inteiro |
| 37 | Erika Hilton | `p_b75b13388ed0` | 1 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | nenhuma no registro inteiro |
| 38 | Luiz Felipe d'Avila | `p_97eadbb76b16` | 1 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | nenhuma no registro inteiro |
| 39 | Paulo Serra | `p_8f89aefb2444` | 1 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | nenhuma no registro inteiro |
| 40 | Rodrigo Manga | `p_9becfca4f72d` | 1 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | nenhuma no registro inteiro |

### Confrontos de 2º turno com ao menos um deles

42 de **57** confrontos de 2º turno que o banco guarda nesta disputa (amostra nacional: 36 de 47, em 429 de 854 cenários).

| # | confronto | cenários | nacionais | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Lula × Tarcísio | 95 | 78 | 95 | 17/07/2023 | 23/03/2026 | 0 | 0 | Tarcísio |
| 2 | Jair Bolsonaro × Lula | 82 | 68 | 82 | 17/07/2023 | 27/07/2026 | 0 | 0 | Jair Bolsonaro |
| 3 | Lula × Michelle Bolsonaro | 69 | 65 | 69 | 28/01/2024 | 27/07/2026 | 0 | 0 | Michelle Bolsonaro |
| 4 | Lula × Ratinho Jr | 68 | 59 | 68 | 22/03/2024 | 30/03/2026 | 0 | 0 | Ratinho Jr |
| 5 | Eduardo Leite × Lula | 33 | 33 | 33 | 01/01/2025 | 29/03/2026 | 0 | 0 | Eduardo Leite |
| 6 | Eduardo Bolsonaro × Lula | 25 | 24 | 25 | 31/12/2024 | 04/12/2025 | 0 | 0 | Eduardo Bolsonaro |
| 7 | Ciro Gomes × Lula | 20 | 20 | 20 | 16/05/2025 | 21/05/2026 | 0 | 0 | Ciro Gomes |
| 8 | Aldo Rebelo × Lula | 12 | 12 | 12 | 11/01/2026 | 05/05/2026 | 0 | 0 | Aldo Rebelo |
| 9 | Fernando Haddad × Flávio Bolsonaro | 11 | 11 | 11 | 02/02/2026 | 27/07/2026 | 0 | 0 | Fernando Haddad |
| 10 | Gusttavo Lima × Lula | 10 | 2 | 10 | 26/01/2025 | 27/02/2025 | 0 | 0 | Gusttavo Lima |
| 11 | Fernando Haddad × Tarcísio | 8 | 8 | 8 | 09/12/2024 | 02/02/2026 | 0 | 0 | Fernando Haddad · Tarcísio |
| 12 | Joaquim Barbosa × Lula | 6 | 6 | 6 | 27/05/2026 | 06/07/2026 | 0 | 0 | Joaquim Barbosa |
| 13 | Flávio Bolsonaro × Geraldo Alckmin | 5 | 5 | 5 | 27/04/2026 | 27/07/2026 | 0 | 0 | Geraldo Alckmin |
| 14 | Flávio Bolsonaro × Ratinho Jr | 5 | 2 | 5 | 19/01/2026 | 30/03/2026 | 0 | 0 | Ratinho Jr |
| 15 | Geraldo Alckmin × Tarcísio | 5 | 4 | 5 | 22/03/2025 | 15/09/2025 | 0 | 0 | Geraldo Alckmin · Tarcísio |
| 16 | Fernando Haddad × Jair Bolsonaro | 5 | 5 | 5 | 09/12/2024 | 15/06/2025 | 0 | 0 | Fernando Haddad · Jair Bolsonaro |
| 17 | Fernando Haddad × Ronaldo Caiado | 3 | 3 | 3 | 09/12/2024 | 08/05/2026 | 0 | 0 | Fernando Haddad |
| 18 | Flávio Bolsonaro × Tarcísio | 3 | 2 | 3 | 19/01/2026 | 07/02/2026 | 0 | 0 | Tarcísio |
| 19 | Aécio Neves × Lula | 2 | 2 | 2 | 27/05/2026 | 25/06/2026 | 0 | 0 | Aécio Neves |
| 20 | Fernando Haddad × Zema | 2 | 2 | 2 | 11/04/2026 | 08/05/2026 | 0 | 0 | Fernando Haddad |
| 21 | Fernando Haddad × Ratinho Jr | 2 | 2 | 2 | 02/02/2026 | 05/03/2026 | 0 | 0 | Fernando Haddad · Ratinho Jr |
| 22 | Lula × Rogério Marinho | 2 | 2 | 2 | 22/06/2025 | 25/08/2025 | 0 | 0 | Rogério Marinho |
| 23 | Damares Alves × Lula | 1 | 1 | 1 | 07/07/2026 | 07/07/2026 | 0 | 0 | Damares Alves |
| 24 | Lula × Marcos Pontes | 1 | 1 | 1 | 07/07/2026 | 07/07/2026 | 0 | 0 | Marcos Pontes |
| 25 | Lula × Michel Temer | 1 | 1 | 1 | 14/06/2026 | 14/06/2026 | 0 | 0 | Michel Temer |
| 26 | Aldo Rebelo × Cabo Daciolo × Ciro Gomes × Escritor Augusto Cury × Flávio Bolsonaro × Lula × Renan Santos × Ronaldo Caiado × Zema | 1 | 1 | 1 | 08/05/2026 | 08/05/2026 | 0 | 0 | Aldo Rebelo · Cabo Daciolo · Ciro Gomes |
| 27 | Pablo Marçal × Ratinho Jr | 1 | 0 | 1 | 30/03/2026 | 30/03/2026 | 0 | 0 | Ratinho Jr |
| 28 | Lula × Tallis Gomes | 1 | 1 | 1 | 09/02/2026 | 09/02/2026 | 0 | 0 | Tallis Gomes |
| 29 | Eduardo Leite × Flávio Bolsonaro | 1 | 1 | 1 | 19/01/2026 | 19/01/2026 | 0 | 0 | Eduardo Leite |
| 30 | Eduardo Bolsonaro × Tarcísio | 1 | 1 | 1 | 15/09/2025 | 15/09/2025 | 0 | 0 | Eduardo Bolsonaro · Tarcísio |
| 31 | Michelle Bolsonaro × Tarcísio | 1 | 1 | 1 | 15/09/2025 | 15/09/2025 | 0 | 0 | Michelle Bolsonaro · Tarcísio |
| 32 | Geraldo Alckmin × Gilberto Kassab | 1 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | Geraldo Alckmin · Gilberto Kassab |
| 33 | Geraldo Alckmin × Ricardo Nunes | 1 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | Geraldo Alckmin · Ricardo Nunes |
| 34 | Gilberto Kassab × Márcio França | 1 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | Gilberto Kassab · Márcio França |
| 35 | Márcio França × Ricardo Nunes | 1 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | Márcio França · Ricardo Nunes |
| 36 | Márcio França × Tarcísio | 1 | 0 | 1 | 21/08/2025 | 21/08/2025 | 0 | 0 | Márcio França · Tarcísio |
| 37 | Lula × Michelle Bolsonaro × Ratinho Jr × Ronaldo Caiado × Zema | 1 | 1 | 1 | 11/06/2025 | 11/06/2025 | 0 | 0 | Michelle Bolsonaro · Ratinho Jr |
| 38 | Ciro Gomes × Fernando Haddad | 1 | 1 | 1 | 16/05/2025 | 16/05/2025 | 0 | 0 | Ciro Gomes · Fernando Haddad |
| 39 | Ciro Gomes × Tarcísio | 1 | 1 | 1 | 16/05/2025 | 16/05/2025 | 0 | 0 | Ciro Gomes · Tarcísio |
| 40 | Geraldo Alckmin × Jair Bolsonaro | 1 | 1 | 1 | 22/03/2025 | 22/03/2025 | 0 | 0 | Geraldo Alckmin · Jair Bolsonaro |
| 41 | Fernando Haddad × Pablo Marçal | 1 | 1 | 1 | 09/12/2024 | 09/12/2024 | 0 | 0 | Fernando Haddad |
| 42 | Ciro Nogueira × Lula | 1 | 1 | 1 | 22/03/2024 | 22/03/2024 | 0 | 0 | Ciro Nogueira |

### Não determinados — recusa, não afirmação

| candidato | `person_id` | cenários | 1º campo | último campo | no período | por que não dá para afirmar |
|---|---|---|---|---|---|---|
| Tereza Cristina | `p_ea9863dcd903` | 13 | 03/10/2023 | 12/06/2026 | 0 | "Tereza Cristina" não está entre as grafias que o casador examinou em presidente:PR |
| Ciro Gomes | `p_b172881c76c5` | 1 | 13/04/2025 | 13/04/2025 | 0 | o casador recusou "Ciro" em presidente:RO por ambiguidade |
| Ciro Nogueira | `p_4ccb803fcd5f` | 1 | 22/03/2024 | 22/03/2024 | 0 | "Ciro Nogueira" não está entre as grafias que o casador examinou em presidente:PR |

| confronto | cenários | 1º campo | último campo | no período | quem não foi determinado |
|---|---|---|---|---|---|
| Lula × Tereza Cristina | 6 | 22/03/2024 | 12/06/2026 | 0 | Tereza Cristina |
| Ciro Nogueira × Lula | 1 | 22/03/2024 | 22/03/2024 | 0 | Ciro Nogueira |

## Governador · AC — `governador:AC`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Jamyr Rosas | `p_52e992fbd598` | 1 | 1 | 05/02/2026 | 05/02/2026 | 0 | 0 | nenhuma em `AC` nem nacional |
| 2 | Doutor Luizinho | `p_1e59b53d94cf` | 1 | 1 | 03/02/2026 | 03/02/2026 | 0 | 0 | nenhuma em `AC` nem nacional |

## Governador · AM — `governador:AM`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Tadeu de Souza | `p_207814c30be8` | 5 | 5 | 12/12/2025 | 10/05/2026 | 0 | 0 | nenhuma em `AM` nem nacional |

## Governador · BA — `governador:BA`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | José Aleluia | `p_8f13300d41db` | 8 | 8 | 17/08/2025 | 27/04/2026 | 0 | 0 | nenhuma em `BA` nem nacional |
| 2 | Kleber Rosa | `p_d8b123ebf744` | 8 | 8 | 09/12/2024 | 25/11/2025 | 0 | 0 | nenhuma em `BA` nem nacional |
| 3 | João Roma | `p_044905d4418f` | 7 | 7 | 09/12/2024 | 19/09/2025 | 0 | 0 | `senador:BA` |
| 4 | José Carlos do Pátio | `p_17bfa9bc1c96` | 1 | 1 | 21/02/2026 | 21/02/2026 | 0 | 0 | nenhuma em `BA` nem nacional |
| 5 | Bruno Reis | `p_63c39cdfa017` | 1 | 1 | 25/11/2025 | 25/11/2025 | 0 | 0 | nenhuma em `BA` nem nacional |

### Não determinados — recusa, não afirmação

| candidato | `person_id` | cenários | 1º campo | último campo | no período | por que não dá para afirmar |
|---|---|---|---|---|---|---|
| Rui Costa | `p_b62988d516fc` | 3 | 29/06/2025 | 25/11/2025 | 0 | o casador recusou "Rui Costa" em governador:BA por ambiguidade |

## Governador · CE — `governador:CE`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Eduardo Girão | `p_2100b844632f` | 23 | 23 | 18/05/2025 | 28/07/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 2 | Jair Pereira | `p_e8647b07683f` | 14 | 14 | 03/02/2026 | 28/07/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 3 | Roberto Cláudio | `p_e113f24a84c2` | 7 | 6 | 18/05/2025 | 28/04/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 4 | Camilo Santana | `p_73bfea12029e` | 6 | 4 | 15/12/2025 | 28/04/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 5 | Professor Jarir Pereira | `p_42837f59b183` | 5 | 5 | 21/01/2026 | 26/07/2026 | 0 | 0 | nenhuma em `CE` nem nacional |

### Confrontos de 2º turno com ao menos um deles

3 de **4** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Elmano de Freitas × Roberto Cláudio | 3 | 3 | 03/02/2026 | 28/04/2026 | 0 | 0 | Roberto Cláudio |
| 2 | Camilo Santana × Ciro Gomes | 2 | 2 | 30/03/2026 | 28/04/2026 | 0 | 0 | Camilo Santana |
| 3 | Camilo Santana × Roberto Cláudio | 1 | 1 | 28/04/2026 | 28/04/2026 | 0 | 0 | Camilo Santana · Roberto Cláudio |

## Governador · DF — `governador:DF`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Izalci Lucas | `p_a55470fb6285` | 11 | 8 | 27/08/2025 | 19/07/2026 | 0 | 0 | nenhuma em `DF` nem nacional |
| 2 | Robson Raimundo | `p_3eea63aaa563` | 1 | 1 | 15/08/2026 | 15/08/2026 | 0 | 0 | nenhuma em `DF` nem nacional |
| 3 | Eduardo Pedrosa | `p_230b05656ba3` | 1 | 1 | 04/06/2025 | 04/06/2025 | 0 | 0 | nenhuma em `DF` nem nacional |
| 4 | Fred Linhares | `p_dc0574397ba7` | 1 | 1 | 04/06/2025 | 04/06/2025 | 0 | 0 | nenhuma em `DF` nem nacional |

### Confrontos de 2º turno com ao menos um deles

3 de **5** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Arruda × Izalci Lucas | 1 | 1 | 10/05/2026 | 10/05/2026 | 0 | 0 | Izalci Lucas |
| 2 | Celina Leão × Izalci Lucas | 1 | 1 | 10/05/2026 | 10/05/2026 | 0 | 0 | Izalci Lucas |
| 3 | Izalci Lucas × Leandro Grass | 1 | 1 | 10/05/2026 | 10/05/2026 | 0 | 0 | Izalci Lucas |

## Governador · ES — `governador:ES`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Magno Malta | `p_cefab2bdb971` | 27 | 13 | 14/03/2026 | 21/07/2026 | 0 | 0 | nenhuma em `ES` nem nacional |
| 2 | Paulo Hartung | `p_8faa279aa457` | 11 | 4 | 28/04/2026 | 21/07/2026 | 0 | 0 | nenhuma em `ES` nem nacional |
| 3 | Arnaldinho Borgo | `p_c6269a985b3a` | 6 | 6 | 31/05/2025 | 25/03/2026 | 0 | 0 | nenhuma em `ES` nem nacional |
| 4 | Vatagem | `p_dc506e4196f9` | 3 | 3 | 28/04/2026 | 21/07/2026 | 0 | 0 | nenhuma em `ES` nem nacional |
| 5 | Da Vitória | `p_0b9911936c81` | 2 | 2 | 31/05/2025 | 17/08/2025 | 0 | 0 | nenhuma em `ES` nem nacional |
| 6 | Sergio Vidigal | `p_ba4fec349d49` | 2 | 2 | 31/05/2025 | 17/08/2025 | 0 | 0 | nenhuma em `ES` nem nacional |
| 7 | Euclério Sampaio | `p_ba4968d7c8ff` | 1 | 1 | 31/05/2025 | 31/05/2025 | 0 | 0 | nenhuma em `ES` nem nacional |

### Confrontos de 2º turno com ao menos um deles

8 de **11** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Lorenzo Pazolini × Magno Malta | 6 | 6 | 25/03/2026 | 21/07/2026 | 0 | 0 | Magno Malta |
| 2 | Magno Malta × Ricardo Ferraço | 5 | 5 | 25/03/2026 | 21/07/2026 | 0 | 0 | Magno Malta |
| 3 | Paulo Hartung × Ricardo Ferraço × Vatagem | 3 | 3 | 28/04/2026 | 21/07/2026 | 0 | 0 | Paulo Hartung · Vatagem |
| 4 | Helder Salomão × Magno Malta | 2 | 2 | 08/06/2026 | 21/07/2026 | 0 | 0 | Magno Malta |
| 5 | Lorenzo Pazolini × Paulo Hartung | 2 | 2 | 13/07/2026 | 21/07/2026 | 0 | 0 | Paulo Hartung |
| 6 | Helder Salomão × Paulo Hartung | 1 | 1 | 21/07/2026 | 21/07/2026 | 0 | 0 | Paulo Hartung |
| 7 | Magno Malta × Paulo Hartung | 1 | 1 | 21/07/2026 | 21/07/2026 | 0 | 0 | Magno Malta · Paulo Hartung |
| 8 | Arnaldinho Borgo × Magno Malta | 1 | 1 | 25/03/2026 | 25/03/2026 | 0 | 0 | Arnaldinho Borgo · Magno Malta |

## Governador · GO — `governador:GO`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Adriana Accorsi | `p_0232367380a4` | 23 | 18 | 05/12/2025 | 02/06/2026 | 0 | 0 | nenhuma em `GO` nem nacional |
| 2 | Telemaco Brandão | `p_124804822375` | 16 | 15 | 05/12/2025 | 31/07/2026 | 0 | 0 | nenhuma em `GO` nem nacional |
| 3 | Edward Madureira | `p_e132b788f068` | 7 | 7 | 12/01/2026 | 13/06/2026 | 0 | 0 | nenhuma em `GO` nem nacional |
| 4 | Dr. Zacharias Calil | `p_10fd898e5e73` | 2 | 2 | 30/04/2026 | 25/07/2026 | 0 | 0 | `senador:GO` |
| 5 | Vanderlan Cardoso | `p_406ed5d963dd` | 2 | 2 | 30/04/2026 | 25/07/2026 | 0 | 0 | `senador:GO` |
| 6 | Cintia Dias | `p_0b982242dab6` | 2 | 2 | 17/05/2026 | 08/07/2026 | 0 | 0 | `senador:GO` |
| 7 | Gracinha Caiado | `p_a7ef000c4c61` | 1 | 1 | 30/04/2026 | 30/04/2026 | 0 | 0 | `senador:GO` |
| 8 | Gustavo Gayer | `p_2d248dfb38e1` | 1 | 1 | 30/04/2026 | 30/04/2026 | 0 | 0 | `senador:GO` |
| 9 | Lula | `p_60768259dc7a` | 1 | 1 | 17/08/2025 | 17/08/2025 | 0 | 0 | `presidente:BR` |
| 10 | Ratinho Jr | `p_efeef987ff53` | 1 | 1 | 17/08/2025 | 17/08/2025 | 0 | 0 | nenhuma em `GO` nem nacional |
| 11 | Ronaldo Caiado | `p_429ef3643ee5` | 1 | 1 | 17/08/2025 | 17/08/2025 | 0 | 0 | `presidente:BR` |
| 12 | Zema | `p_837be6e8d7f2` | 1 | 1 | 17/08/2025 | 17/08/2025 | 0 | 0 | `presidente:BR` |

### Confrontos de 2º turno com ao menos um deles

3 de **6** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Adriana Accorsi × Daniel Vilela | 3 | 3 | 17/03/2026 | 12/05/2026 | 0 | 0 | Adriana Accorsi |
| 2 | Adriana Accorsi × Marconi Perillo | 1 | 1 | 12/05/2026 | 12/05/2026 | 0 | 0 | Adriana Accorsi |
| 3 | Adriana Accorsi × Wilder Morais | 1 | 1 | 12/05/2026 | 12/05/2026 | 0 | 0 | Adriana Accorsi |

### Recusados — o nosso próprio banco carrega a mesma grafia registrada

Não é afirmação de que sejam a mesma pessoa, nem de que não sejam. É o registro de que
`people.ndjson` tem **outra linha** com a mesma grafia normalizada e **com** candidatura —
o que basta para esta linha não poder ser publicada como "sem candidatura". Quem decide se
é a mesma pessoa, um homônimo ou um caso a pesquisar é um humano (§4, §12).

| candidato | `person_id` | cenários | 1º campo | último campo | no período | a linha que contradiz |
|---|---|---|---|---|---|---|
| Ciro Gomes | `p_6621e47fadc3` | 1 | 17/08/2025 | 17/08/2025 | 0 | Ciro Gomes `p_46e43c67194e` `governador:CE` — pela grafia "Ciro Gomes" |
| Michelle Bolsonaro | `p_bc76f73405e5` | 1 | 17/08/2025 | 17/08/2025 | 0 | Michelle Bolsonaro `p_a24a364b9a5e` `senador:DF` — pela grafia "Michelle Bolsonaro" |

### Não determinados — recusa, não afirmação

| candidato | `person_id` | cenários | 1º campo | último campo | no período | por que não dá para afirmar |
|---|---|---|---|---|---|---|
| Gustavo Mendanha | `p_08a130ba3787` | 1 | 25/07/2026 | 25/07/2026 | 0 | "Gustavo Mendanha" não está entre as grafias que o casador examinou em governador:GO |
| Alexandre Baldy | `p_3f7da2ee3157` | 1 | 30/04/2026 | 30/04/2026 | 0 | "Alexandre Baldy" não está entre as grafias que o casador examinou em governador:GO |

## Governador · MA — `governador:MA`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Lahésio Bonfim | `p_c50a3460a42e` | 16 | 12 | 06/08/2025 | 13/06/2026 | 0 | 0 | `senador:MA` |
| 2 | Enilton Rodrigues | `p_d1ca47bf718f` | 1 | 1 | 07/07/2026 | 07/07/2026 | 0 | 0 | `senador:MA` |

### Confrontos de 2º turno com ao menos um deles

2 de **8** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Eduardo Braide × Lahésio Bonfim | 3 | 3 | 08/03/2026 | 13/05/2026 | 0 | 0 | Lahésio Bonfim |
| 2 | Lahésio Bonfim × Orleans Brandão | 1 | 1 | 11/01/2026 | 11/01/2026 | 0 | 0 | Lahésio Bonfim |

## Governador · MG — `governador:MG`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Marcelo Aro | `p_94a4cd70796b` | 11 | 10 | 07/03/2026 | 29/07/2026 | 0 | 0 | `senador:MG` |
| 2 | Rodrigo Pacheco | `p_f51ae908bee4` | 10 | 6 | 17/08/2025 | 26/04/2026 | 0 | 0 | nenhuma em `MG` nem nacional |
| 3 | Maria da Consolação | `p_9df0c220ee94` | 3 | 3 | 26/04/2026 | 29/07/2026 | 0 | 0 | nenhuma em `MG` nem nacional |
| 4 | Prof. Túlio Lopes | `p_848d0619bd2e` | 3 | 3 | 26/04/2026 | 29/07/2026 | 0 | 0 | nenhuma em `MG` nem nacional |
| 5 | Nikolas Ferreira | `p_253a32c6889b` | 2 | 1 | 25/08/2025 | 25/08/2025 | 0 | 0 | nenhuma em `MG` nem nacional |
| 6 | Vittorio Medioli | `p_cd0e8fbe8886` | 1 | 1 | 29/07/2026 | 29/07/2026 | 0 | 0 | nenhuma em `MG` nem nacional |
| 7 | Marília Campos | `p_43f84c3451b9` | 1 | 1 | 05/10/2025 | 05/10/2025 | 0 | 0 | `senador:MG` |
| 8 | Alexandre Silveira | `p_d090f05f8282` | 1 | 1 | 25/08/2025 | 25/08/2025 | 0 | 0 | nenhuma em `MG` nem nacional |
| 9 | Tadeuzinho | `p_dd569486119e` | 1 | 1 | 25/08/2025 | 25/08/2025 | 0 | 0 | nenhuma em `MG` nem nacional |

### Confrontos de 2º turno com ao menos um deles

6 de **11** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Cleitinho Azevedo × Rodrigo Pacheco | 4 | 4 | 25/08/2025 | 26/04/2026 | 0 | 0 | Rodrigo Pacheco |
| 2 | Alexandre Kalil × Marcelo Aro | 1 | 1 | 29/07/2026 | 29/07/2026 | 0 | 0 | Marcelo Aro |
| 3 | Marcelo Aro × Patrus Ananias | 1 | 1 | 29/07/2026 | 29/07/2026 | 0 | 0 | Marcelo Aro |
| 4 | Alexandre Silveira × Cleitinho Azevedo | 1 | 1 | 25/08/2025 | 25/08/2025 | 0 | 0 | Alexandre Silveira |
| 5 | Mateus Simões × Rodrigo Pacheco | 1 | 1 | 25/08/2025 | 25/08/2025 | 0 | 0 | Rodrigo Pacheco |
| 6 | Nikolas Ferreira × Rodrigo Pacheco | 1 | 1 | 25/08/2025 | 25/08/2025 | 0 | 0 | Nikolas Ferreira · Rodrigo Pacheco |

## Governador · MS — `governador:MS`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Marcos Pollon | `p_167085403dd2` | 2 | 2 | 16/05/2025 | 28/11/2025 | 0 | 0 | nenhuma em `MS` nem nacional |
| 2 | Beto Figueiró | `p_08c25c8e1f96` | 1 | 1 | 06/02/2026 | 06/02/2026 | 0 | 0 | nenhuma em `MS` nem nacional |
| 3 | Jaime Valler | `p_2a54f24197a5` | 1 | 1 | 06/02/2026 | 06/02/2026 | 0 | 0 | nenhuma em `MS` nem nacional |
| 4 | Capitão Contar | `p_33501dc29a8a` | 1 | 1 | 16/05/2025 | 16/05/2025 | 0 | 0 | `senador:MS` |
| 5 | Tereza Cristina | `p_d0af26f92ff5` | 1 | 1 | 16/05/2025 | 16/05/2025 | 0 | 0 | nenhuma em `MS` nem nacional |

## Governador · MT — `governador:MT`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Jayme Campos | `p_38a1c1e29214` | 25 | 18 | 23/03/2025 | 27/07/2026 | 0 | 0 | nenhuma em `MT` nem nacional |
| 2 | Marcelo Maluf | `p_df97479b28a8` | 6 | 6 | 30/04/2026 | 27/07/2026 | 0 | 0 | nenhuma em `MT` nem nacional |
| 3 | Fávaro | `p_c87960caa804` | 2 | 2 | 11/05/2025 | 27/11/2025 | 0 | 0 | `senador:MT` |
| 4 | José Carlos do Pátio | `p_5cd6e1ac6519` | 2 | 2 | 11/05/2025 | 27/11/2025 | 0 | 0 | nenhuma em `MT` nem nacional |
| 5 | Janaína Riva | `p_200f5b334a00` | 1 | 1 | 11/05/2025 | 11/05/2025 | 0 | 0 | `senador:MT` |
| 6 | Max Russi | `p_bd75bae78643` | 1 | 1 | 11/05/2025 | 11/05/2025 | 0 | 0 | nenhuma em `MT` nem nacional |
| 7 | Odílio Balbinotti | `p_db5a1d5ef5be` | 1 | 1 | 11/05/2025 | 11/05/2025 | 0 | 0 | nenhuma em `MT` nem nacional |

### Confrontos de 2º turno com ao menos um deles

3 de **6** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Jayme Campos × Wellington Fagundes | 7 | 7 | 23/03/2025 | 27/07/2026 | 0 | 0 | Jayme Campos |
| 2 | Doutora Natasha × Jayme Campos | 2 | 2 | 23/03/2026 | 01/06/2026 | 0 | 0 | Jayme Campos |
| 3 | Jayme Campos × Otaviano Pivetta | 2 | 2 | 23/03/2026 | 01/06/2026 | 0 | 0 | Jayme Campos |

## Governador · PA — `governador:PA`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Mário Couto | `p_3e04d2cef7e3` | 26 | 24 | 04/02/2024 | 03/08/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 2 | Paulo Rocha | `p_59f22a98874f` | 4 | 4 | 24/06/2025 | 04/02/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 3 | Delegado Éder Mauro | `p_b12a17042ac0` | 4 | 3 | 24/06/2025 | 24/10/2025 | 0 | 0 | `senador:PA` |
| 4 | Raquel Brício | `p_4e23ea053283` | 3 | 3 | 14/06/2026 | 03/08/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 5 | Beto Faro | `p_aa34fe6daeee` | 2 | 2 | 24/10/2025 | 14/06/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 6 | Marinor Brito | `p_7b30b06e12f4` | 2 | 2 | 28/08/2025 | 05/12/2025 | 0 | 0 | nenhuma em `PA` nem nacional |
| 7 | Robertinho | `p_dd7f23cebe52` | 1 | 1 | 15/08/2026 | 15/08/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 8 | Simão Jatene | `p_a98b1e353f18` | 1 | 1 | 24/10/2025 | 24/10/2025 | 0 | 0 | nenhuma em `PA` nem nacional |
| 9 | Joaquim Passarinho | `p_1905b7f37144` | 1 | 1 | 28/08/2025 | 28/08/2025 | 0 | 0 | nenhuma em `PA` nem nacional |
| 10 | Fernando Carneiro | `p_101b9d00e24a` | 1 | 1 | 24/06/2025 | 24/06/2025 | 0 | 0 | nenhuma em `PA` nem nacional |

### Confrontos de 2º turno com ao menos um deles

4 de **5** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Hana Ghassan × Mário Couto | 3 | 3 | 04/02/2024 | 04/02/2026 | 0 | 0 | Mário Couto |
| 2 | Delegado Éder Mauro × Dr. Daniel × Hana Ghassan × Paulo Rocha | 1 | 1 | 28/08/2025 | 28/08/2025 | 0 | 0 | Delegado Éder Mauro · Paulo Rocha |
| 3 | Hana Ghassan × Joaquim Passarinho | 1 | 1 | 28/08/2025 | 28/08/2025 | 0 | 0 | Joaquim Passarinho |
| 4 | Dr. Daniel × Mário Couto | 1 | 1 | 21/03/2024 | 21/03/2024 | 0 | 0 | Mário Couto |

## Governador · PB — `governador:PB`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Olímpio Rocha | `p_5e6a103eb11c` | 12 | 11 | 21/03/2026 | 27/07/2026 | 0 | 0 | nenhuma em `PB` nem nacional |
| 2 | Lúcio Flávio | `p_2c9fb33926e5` | 5 | 3 | 26/01/2026 | 21/03/2026 | 0 | 0 | nenhuma em `PB` nem nacional |
| 3 | Pedro Cunha Lima | `p_aa7c4287dc3d` | 1 | 1 | 01/12/2025 | 01/12/2025 | 0 | 0 | nenhuma em `PB` nem nacional |

### Confrontos de 2º turno com ao menos um deles

2 de **5** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Cícero Lucena × Lúcio Flávio | 2 | 2 | 26/01/2026 | 21/03/2026 | 0 | 0 | Lúcio Flávio |
| 2 | Cícero Lucena × Olímpio Rocha | 1 | 1 | 21/03/2026 | 21/03/2026 | 0 | 0 | Olímpio Rocha |

## Governador · PE — `governador:PE`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Eduardo Moura | `p_57596f918b1d` | 17 | 17 | 05/08/2025 | 10/06/2026 | 0 | 0 | nenhuma em `PE` nem nacional |
| 2 | Gilson Machado | `p_c7d615b3c023` | 3 | 3 | 05/08/2025 | 30/03/2026 | 0 | 0 | nenhuma em `PE` nem nacional |
| 3 | Anderson Ferreira | `p_a9c77b33b16d` | 2 | 2 | 12/03/2025 | 30/03/2026 | 0 | 0 | nenhuma em `PE` nem nacional |

## Governador · PI — `governador:PI`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Toni Rodrigues | `p_63d85b681b6b` | 15 | 14 | 27/11/2025 | 27/07/2026 | 0 | 0 | nenhuma em `PI` nem nacional |
| 2 | Mainha | `p_b0c71c0ee6d6` | 13 | 12 | 27/11/2025 | 13/07/2026 | 0 | 0 | nenhuma em `PI` nem nacional |
| 3 | Margarete Coelho | `p_78dc8b7952ba` | 2 | 2 | 27/11/2025 | 15/03/2026 | 0 | 0 | nenhuma em `PI` nem nacional |
| 4 | Jesus Rodrigues | `p_c7af14d40c75` | 1 | 1 | 27/07/2026 | 27/07/2026 | 0 | 0 | nenhuma em `PI` nem nacional |

### Confrontos de 2º turno com ao menos um deles

3 de **4** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Mainha × Rafael Fonteles | 1 | 1 | 15/03/2026 | 15/03/2026 | 0 | 0 | Mainha |
| 2 | Margarete Coelho × Rafael Fonteles | 1 | 1 | 15/03/2026 | 15/03/2026 | 0 | 0 | Margarete Coelho |
| 3 | Rafael Fonteles × Toni Rodrigues | 1 | 1 | 15/03/2026 | 15/03/2026 | 0 | 0 | Toni Rodrigues |

### Não determinados — recusa, não afirmação

| candidato | `person_id` | cenários | 1º campo | último campo | no período | por que não dá para afirmar |
|---|---|---|---|---|---|---|
| Tonny Kerley | `p_d53d578ad194` | 1 | 27/11/2025 | 27/11/2025 | 0 | "Tonny Kerley" não está entre as grafias que o casador examinou em governador:PI |

## Governador · PR — `governador:PR`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Rafael Greca | `p_2ddaa4f1c2e0` | 23 | 19 | 22/01/2026 | 01/08/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 2 | Tony Garcia | `p_cc91dae0b54e` | 14 | 14 | 12/04/2026 | 01/08/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 3 | Guto Silva | `p_697db0276477` | 14 | 10 | 06/07/2025 | 12/04/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 4 | Alexandre Curi | `p_fa18a2666097` | 5 | 5 | 06/07/2025 | 20/03/2026 | 0 | 0 | `senador:PR` |
| 5 | Enio Verri | `p_2acb42fc3541` | 4 | 4 | 06/07/2025 | 26/11/2025 | 0 | 0 | nenhuma em `PR` nem nacional |
| 6 | Paulo Martins | `p_cb6924cb7de6` | 3 | 3 | 11/08/2025 | 27/01/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 7 | Beto Richa | `p_7483173d455c` | 2 | 2 | 06/07/2025 | 27/01/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 8 | Fernando Giacobo | `p_ee1cf39e1301` | 1 | 1 | 04/03/2026 | 04/03/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 9 | Cida Borghetti | `p_dcd6241e28af` | 1 | 1 | 27/01/2026 | 27/01/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 10 | Paulo Eduardo | `p_1c63d1a68611` | 1 | 1 | 17/08/2025 | 17/08/2025 | 0 | 0 | nenhuma em `PR` nem nacional |

### Confrontos de 2º turno com ao menos um deles

7 de **11** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Rafael Greca × Sérgio Moro | 3 | 3 | 22/01/2026 | 25/07/2026 | 0 | 0 | Rafael Greca |
| 2 | Guto Silva × Sérgio Moro | 3 | 3 | 06/07/2025 | 27/01/2026 | 0 | 0 | Guto Silva |
| 3 | Rafael Greca × Requião Filho | 2 | 2 | 27/01/2026 | 25/07/2026 | 0 | 0 | Rafael Greca |
| 4 | Alexandre Curi × Sérgio Moro | 2 | 2 | 06/07/2025 | 22/01/2026 | 0 | 0 | Alexandre Curi |
| 5 | Rafael Greca × Sandro Alex | 1 | 1 | 25/07/2026 | 25/07/2026 | 0 | 0 | Rafael Greca |
| 6 | Alexandre Curi × Requião Filho | 1 | 1 | 27/01/2026 | 27/01/2026 | 0 | 0 | Alexandre Curi |
| 7 | Guto Silva × Requião Filho | 1 | 1 | 27/01/2026 | 27/01/2026 | 0 | 0 | Guto Silva |

### Recusados — o nosso próprio banco carrega a mesma grafia registrada

Não é afirmação de que sejam a mesma pessoa, nem de que não sejam. É o registro de que
`people.ndjson` tem **outra linha** com a mesma grafia normalizada e **com** candidatura —
o que basta para esta linha não poder ser publicada como "sem candidatura". Quem decide se
é a mesma pessoa, um homônimo ou um caso a pesquisar é um humano (§4, §12).

| candidato | `person_id` | cenários | 1º campo | último campo | no período | a linha que contradiz |
|---|---|---|---|---|---|---|
| Alvaro Dias | `p_fb55182480eb` | 3 | 22/01/2026 | 27/01/2026 | 0 | Álvaro Dias `p_62d5d59f89a6` `governador:RN` — pela grafia "Alvaro Dias" |

### Não determinados — recusa, não afirmação

| confronto | cenários | 1º campo | último campo | no período | quem não foi determinado |
|---|---|---|---|---|---|
| Alvaro Dias × Sérgio Moro | 1 | 22/01/2026 | 22/01/2026 | 0 | Alvaro Dias |

## Governador · RJ — `governador:RJ`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Wilson Witzel | `p_6c58d03e2726` | 12 | 12 | 02/02/2026 | 29/07/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 2 | Bombeiro Rafa Luz | `p_272758751568` | 10 | 10 | 02/02/2026 | 15/07/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 3 | Ítalo Marsili | `p_3740b741be1f` | 4 | 4 | 23/05/2025 | 10/03/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 4 | Glauber Braga | `p_47bf764e4bc1` | 3 | 3 | 02/02/2026 | 15/07/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 5 | Washington Reis | `p_b635189ac6d4` | 3 | 3 | 17/08/2025 | 02/02/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 6 | Rodrigo Barcellar | `p_8d5cacd44980` | 3 | 3 | 23/05/2025 | 29/08/2025 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 7 | Monica Benicio | `p_74d4fa1b606b` | 2 | 2 | 17/08/2025 | 29/08/2025 | 0 | 0 | `senador:RJ` |
| 8 | André Ceciliano | `p_5ff3d7a709f9` | 1 | 1 | 10/03/2026 | 10/03/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 9 | Felipe Curi | `p_6c61f9fde74c` | 1 | 1 | 06/03/2026 | 06/03/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 10 | Rodrigo Pimentel | `p_ead19b3846f6` | 1 | 1 | 13/02/2026 | 13/02/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 11 | Tarcísio Motta | `p_34eb9653c828` | 1 | 1 | 23/05/2025 | 23/05/2025 | 0 | 0 | nenhuma em `RJ` nem nacional |

## Governador · RN — `governador:RN`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Rogério Marinho | `p_667ff5bcd1dc` | 9 | 9 | 21/02/2025 | 12/01/2026 | 0 | 0 | nenhuma em `RN` nem nacional |
| 2 | Styvenson Valentim | `p_bfa9712c6b5a` | 2 | 2 | 21/02/2025 | 11/09/2025 | 0 | 0 | `senador:RN` |
| 3 | Walter Alves | `p_88ab7c984394` | 2 | 2 | 21/02/2025 | 11/09/2025 | 0 | 0 | nenhuma em `RN` nem nacional |
| 4 | Natália Bonavides | `p_a9dc1fc0d968` | 1 | 1 | 21/02/2025 | 21/02/2025 | 0 | 0 | nenhuma em `RN` nem nacional |

## Governador · RO — `governador:RO`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Dr. Fernando Máximo | `p_61ec6225860e` | 5 | 2 | 13/08/2025 | 10/12/2025 | 0 | 0 | `senador:RO` |
| 2 | Sérgio Gonçalves | `p_cb2e9bbb0117` | 4 | 4 | 13/08/2025 | 28/02/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 3 | Confúcio Moura | `p_44b39a1ec071` | 3 | 3 | 13/08/2025 | 28/02/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 4 | Acir Gurgacz | `p_a01cd18a1d26` | 2 | 2 | 13/08/2025 | 20/01/2026 | 0 | 0 | `senador:RO` |
| 5 | Ivo Cassol | `p_125791c38fc9` | 2 | 2 | 13/08/2025 | 10/12/2025 | 0 | 0 | nenhuma em `RO` nem nacional |
| 6 | Léo Moraes | `p_2f92df0ba426` | 1 | 1 | 19/03/2026 | 19/03/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 7 | Delegado Flori | `p_28d106ad82ee` | 1 | 1 | 20/01/2026 | 20/01/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 8 | Maurício Carvalho | `p_b770f54374bb` | 1 | 1 | 20/01/2026 | 20/01/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 9 | Raduan Miguel | `p_aced5c374190` | 1 | 1 | 20/01/2026 | 20/01/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 10 | Alex Redano | `p_9ac89b05ec9e` | 1 | 1 | 13/08/2025 | 13/08/2025 | 0 | 0 | nenhuma em `RO` nem nacional |
| 11 | Jaime Bagatoli | `p_76472dbf23af` | 1 | 1 | 13/08/2025 | 13/08/2025 | 0 | 0 | nenhuma em `RO` nem nacional |

### Confrontos de 2º turno com ao menos um deles

3 de **5** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Adaílton Fúria × Dr. Fernando Máximo | 1 | 1 | 13/08/2025 | 13/08/2025 | 0 | 0 | Dr. Fernando Máximo |
| 2 | Dr. Fernando Máximo × Hildon Chaves | 1 | 1 | 13/08/2025 | 13/08/2025 | 0 | 0 | Dr. Fernando Máximo |
| 3 | Dr. Fernando Máximo × Marcos Rogério | 1 | 1 | 13/08/2025 | 13/08/2025 | 0 | 0 | Dr. Fernando Máximo |

## Governador · RR — `governador:RR`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Doutor Raposo | `p_2fb54c7384b0` | 2 | 2 | 04/12/2025 | 04/04/2026 | 0 | 0 | nenhuma em `RR` nem nacional |
| 2 | Edilson Damião | `p_f404096d33c1` | 2 | 2 | 04/12/2025 | 04/04/2026 | 0 | 0 | nenhuma em `RR` nem nacional |
| 3 | Juscelino Kubitschek Pereira | `p_a42b6df340cc` | 2 | 2 | 04/12/2025 | 04/04/2026 | 0 | 0 | nenhuma em `RR` nem nacional |

## Governador · RS — `governador:RS`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Edegar Pretto | `p_b49fb11fed60` | 12 | 9 | 17/08/2025 | 03/06/2026 | 0 | 0 | nenhuma em `RS` nem nacional |
| 2 | Covatti Filho | `p_bcf83f604d09` | 4 | 4 | 24/11/2025 | 04/04/2026 | 0 | 0 | nenhuma em `RS` nem nacional |
| 3 | Paula Mascarenhas | `p_722f198d37da` | 1 | 1 | 24/11/2025 | 24/11/2025 | 0 | 0 | nenhuma em `RS` nem nacional |
| 4 | Felipe Camozzato | `p_a5d383ad62a1` | 1 | 1 | 17/08/2025 | 17/08/2025 | 0 | 0 | nenhuma em `RS` nem nacional |

### Confrontos de 2º turno com ao menos um deles

3 de **6** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Edegar Pretto × Gabriel Souza | 1 | 1 | 10/02/2026 | 10/02/2026 | 0 | 0 | Edegar Pretto |
| 2 | Edegar Pretto × Juliana Brizola | 1 | 1 | 10/02/2026 | 10/02/2026 | 0 | 0 | Edegar Pretto |
| 3 | Edegar Pretto × Zucco | 1 | 1 | 10/02/2026 | 10/02/2026 | 0 | 0 | Edegar Pretto |

## Governador · SC — `governador:SC`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Afrânio Boppré | `p_07e66e2f0d79` | 4 | 4 | 03/12/2025 | 04/04/2026 | 0 | 0 | `senador:SC` |
| 2 | Adriano Silva | `p_2841937d9112` | 2 | 2 | 03/12/2025 | 23/12/2025 | 0 | 0 | nenhuma em `SC` nem nacional |
| 3 | Décio Lima | `p_5c9961400d72` | 2 | 2 | 03/12/2025 | 23/12/2025 | 0 | 0 | `senador:SC` |
| 4 | Marcos Vieira | `p_9e3a296ed409` | 1 | 1 | 03/12/2025 | 03/12/2025 | 0 | 0 | nenhuma em `SC` nem nacional |

## Governador · SE — `governador:SE`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Delegado André David | `p_14edd5300e66` | 1 | 1 | 07/02/2026 | 07/02/2026 | 0 | 0 | `senador:SE` |

### Confrontos de 2º turno com ao menos um deles

1 de **3** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Delegado André David × Fábio | 1 | 1 | 07/02/2026 | 07/02/2026 | 0 | 0 | Delegado André David |

## Governador · SP — `governador:SP`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Paulo Serra | `p_342d0a36deb7` | 25 | 25 | 04/05/2025 | 18/06/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 2 | Geraldo Alckmin | `p_47c29f7b5423` | 19 | 9 | 04/07/2025 | 29/03/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 3 | Kim Kataguiri | `p_0d332ec42be9` | 18 | 18 | 29/11/2025 | 18/06/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 4 | Márcio França | `p_5a6b2711fa35` | 18 | 9 | 23/02/2025 | 05/03/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 5 | Felipe d'Avila | `p_64c23d345527` | 15 | 15 | 04/07/2025 | 28/05/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 6 | Ricardo Nunes | `p_8cad32f7e3ab` | 10 | 6 | 08/07/2025 | 10/02/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 7 | Erika Hilton | `p_55b474d3c870` | 10 | 10 | 04/05/2025 | 23/01/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 8 | Kassab | `p_8f651c56fbab` | 9 | 6 | 08/07/2025 | 23/01/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 9 | Felicio Ramuth | `p_235f0bfb7203` | 5 | 4 | 04/05/2025 | 10/02/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 10 | Alexandre Padilha | `p_2b6d32816cd8` | 5 | 5 | 04/05/2025 | 12/10/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 11 | Rodrigo Manga | `p_2f4b914669f3` | 5 | 5 | 04/05/2025 | 03/09/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 12 | Simone Tebet | `p_d957177e5198` | 3 | 1 | 23/01/2026 | 23/01/2026 | 0 | 0 | `senador:SP` |
| 13 | Sabará | `p_756120489941` | 2 | 2 | 04/05/2025 | 09/02/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 14 | Pablo Marçal | `p_0cdb69b1373a` | 2 | 2 | 23/02/2025 | 23/01/2026 | 0 | 0 | `presidente:BR` |
| 15 | André do Prado | `p_bbe3ab561506` | 2 | 2 | 03/09/2025 | 08/12/2025 | 0 | 0 | `senador:SP` |
| 16 | Astronauta Marcos Pontes | `p_ad87b5b36921` | 1 | 1 | 23/01/2026 | 23/01/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 17 | Flávio Bolsonaro | `p_2901c8f601be` | 1 | 1 | 23/01/2026 | 23/01/2026 | 0 | 0 | `presidente:BR` |
| 18 | Salles | `p_9796edcf659d` | 1 | 1 | 03/09/2025 | 03/09/2025 | 0 | 0 | `senador:SP` |

### Confrontos de 2º turno com ao menos um deles

15 de **16** confrontos de 2º turno que o banco guarda nesta disputa.

| # | confronto | cenários | levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |
|---|---|---|---|---|---|---|---|---|
| 1 | Geraldo Alckmin × Tarcísio | 5 | 5 | 08/07/2025 | 10/02/2026 | 0 | 0 | Geraldo Alckmin |
| 2 | Geraldo Alckmin × Ricardo Nunes | 4 | 4 | 08/07/2025 | 10/02/2026 | 0 | 0 | Geraldo Alckmin · Ricardo Nunes |
| 3 | Márcio França × Tarcísio | 4 | 4 | 08/07/2025 | 09/02/2026 | 0 | 0 | Márcio França |
| 4 | Geraldo Alckmin × Kassab | 3 | 3 | 08/07/2025 | 23/01/2026 | 0 | 0 | Geraldo Alckmin · Kassab |
| 5 | Kassab × Márcio França | 3 | 3 | 08/07/2025 | 08/12/2025 | 0 | 0 | Kassab · Márcio França |
| 6 | Felicio Ramuth × Geraldo Alckmin | 2 | 2 | 08/12/2025 | 10/02/2026 | 0 | 0 | Felicio Ramuth · Geraldo Alckmin |
| 7 | Márcio França × Ricardo Nunes | 2 | 2 | 08/07/2025 | 12/10/2025 | 0 | 0 | Márcio França · Ricardo Nunes |
| 8 | Felicio Ramuth × Fernando Haddad | 1 | 1 | 10/02/2026 | 10/02/2026 | 0 | 0 | Felicio Ramuth |
| 9 | Fernando Haddad × Ricardo Nunes | 1 | 1 | 10/02/2026 | 10/02/2026 | 0 | 0 | Ricardo Nunes |
| 10 | Felicio Ramuth × Simone Tebet | 1 | 1 | 23/01/2026 | 23/01/2026 | 0 | 0 | Felicio Ramuth · Simone Tebet |
| 11 | Flávio Bolsonaro × Tarcísio | 1 | 1 | 23/01/2026 | 23/01/2026 | 0 | 0 | Flávio Bolsonaro |
| 12 | Kassab × Simone Tebet | 1 | 1 | 23/01/2026 | 23/01/2026 | 0 | 0 | Kassab · Simone Tebet |
| 13 | Simone Tebet × Tarcísio | 1 | 1 | 23/01/2026 | 23/01/2026 | 0 | 0 | Simone Tebet |
| 14 | André do Prado × Márcio França | 1 | 1 | 08/12/2025 | 08/12/2025 | 0 | 0 | André do Prado · Márcio França |
| 15 | Guilherme Derrite × Márcio França | 1 | 1 | 08/07/2025 | 08/07/2025 | 0 | 0 | Márcio França |

### Não determinados — recusa, não afirmação

| candidato | `person_id` | cenários | 1º campo | último campo | no período | por que não dá para afirmar |
|---|---|---|---|---|---|---|
| Guilherme Derrite | `p_78b91f178b5e` | 2 | 08/07/2025 | 29/11/2025 | 0 | "Guilherme Derrite" não está entre as grafias que o casador examinou em governador:SP |

## Governador · TO — `governador:TO`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Amélio Cayres | `p_edeb134f897a` | 5 | 5 | 08/04/2025 | 12/04/2026 | 0 | 0 | nenhuma em `TO` nem nacional |
| 2 | Eduardo Gomes | `p_ca34de69acda` | 2 | 2 | 08/04/2025 | 15/10/2025 | 0 | 0 | `senador:TO` |
| 3 | Kátia Abreu | `p_776676d84a8a` | 1 | 1 | 18/06/2026 | 18/06/2026 | 0 | 0 | nenhuma em `TO` nem nacional |
| 4 | Carlos Amastha | `p_3d02f55c2c64` | 1 | 1 | 24/03/2026 | 24/03/2026 | 0 | 0 | nenhuma em `TO` nem nacional |
| 5 | Mauro Carlesse | `p_1ac60174d762` | 1 | 1 | 27/01/2026 | 27/01/2026 | 0 | 0 | nenhuma em `TO` nem nacional |
| 6 | Cinthia Ribeiro | `p_5ec89e62dd2c` | 1 | 1 | 25/11/2025 | 25/11/2025 | 0 | 0 | nenhuma em `TO` nem nacional |
| 7 | Irajá | `p_457cad169ef4` | 1 | 1 | 08/04/2025 | 08/04/2025 | 0 | 0 | nenhuma em `TO` nem nacional |
| 8 | Paulo Mourão | `p_1bfc9a4ac546` | 1 | 1 | 08/04/2025 | 08/04/2025 | 0 | 0 | `senador:TO` |

## Senado · AC — `senador:AC`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Jéssica Sales | `p_a6ab09f60c27` | 5 | 5 | 23/08/2025 | 25/07/2026 | 0 | 0 | nenhuma em `AC` nem nacional |
| 2 | Coronel Ulysses | `p_70affabbd909` | 4 | 4 | 23/08/2025 | 25/07/2026 | 0 | 0 | nenhuma em `AC` nem nacional |
| 3 | Mailza Assis | `p_94d990e2647d` | 1 | 1 | 05/02/2026 | 05/02/2026 | 0 | 0 | `governador:AC` |

## Senado · AL — `senador:AL`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Alfredo Gaspar | `p_cb30bc5ce1e7` | 16 | 16 | 24/11/2025 | 20/07/2026 | 0 | 0 | nenhuma em `AL` nem nacional |
| 2 | Eudócia Caldas | `p_39b350d04e5b` | 7 | 7 | 02/05/2026 | 20/07/2026 | 0 | 0 | nenhuma em `AL` nem nacional |
| 3 | Ítalo Bonja | `p_25e8f003afbe` | 3 | 3 | 24/11/2025 | 08/12/2025 | 0 | 0 | nenhuma em `AL` nem nacional |
| 4 | Paulão do PT | `p_8e1eeef072e7` | 3 | 3 | 24/11/2025 | 08/12/2025 | 0 | 0 | nenhuma em `AL` nem nacional |
| 5 | Ronaldo Lessa | `p_70c8e1821f8d` | 1 | 1 | 25/01/2026 | 25/01/2026 | 0 | 0 | nenhuma em `AL` nem nacional |

## Senado · AM — `senador:AM`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Marcelo Ramos | `p_3520ca1879e3` | 22 | 22 | 12/12/2025 | 23/07/2026 | 0 | 0 | nenhuma em `AM` nem nacional |
| 2 | Marcos Rotta | `p_9a92b45dbd31` | 21 | 21 | 12/12/2025 | 23/07/2026 | 0 | 0 | nenhuma em `AM` nem nacional |

## Senado · AP — `senador:AP`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Waldez Góes | `p_b448887e26b9` | 6 | 6 | 08/12/2025 | 30/03/2026 | 0 | 0 | nenhuma em `AP` nem nacional |
| 2 | Teles Junior | `p_976648be0d6c` | 5 | 5 | 28/04/2026 | 23/07/2026 | 0 | 0 | nenhuma em `AP` nem nacional |

## Senado · BA — `senador:BA`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Marcelo Nilo | `p_fd890cc30b8a` | 1 | 1 | 21/02/2026 | 21/02/2026 | 0 | 0 | nenhuma em `BA` nem nacional |
| 2 | Adolfo Viana | `p_7cea08f3e845` | 1 | 1 | 25/11/2025 | 25/11/2025 | 0 | 0 | nenhuma em `BA` nem nacional |
| 3 | Aroldo Cedraz | `p_ea33b394477d` | 1 | 1 | 25/11/2025 | 25/11/2025 | 0 | 0 | nenhuma em `BA` nem nacional |
| 4 | Márcio Marinho | `p_afb9620ec337` | 1 | 1 | 25/11/2025 | 25/11/2025 | 0 | 0 | nenhuma em `BA` nem nacional |

## Senado · CE — `senador:CE`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | General Theóphilo | `p_cd4b175ad120` | 20 | 20 | 16/12/2025 | 12/08/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 2 | Eunício Oliveira | `p_aca35dfec6fe` | 17 | 17 | 15/02/2025 | 28/07/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 3 | Júnior Mano | `p_9dfa21b58d49` | 13 | 13 | 15/02/2025 | 26/07/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 4 | Anna Karina | `p_a98cd8ec3a3c` | 9 | 9 | 27/04/2026 | 28/07/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 5 | Chiquinho Feitosa | `p_819e9286d51f` | 9 | 9 | 15/02/2025 | 28/07/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 6 | Priscila Costa | `p_8f1b44dd9b9f` | 7 | 7 | 16/12/2025 | 28/04/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 7 | José Guimarães | `p_e594a11ff18b` | 7 | 7 | 15/02/2025 | 01/04/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 8 | Cândido Albuquerque | `p_3ea88041e193` | 6 | 6 | 03/02/2026 | 28/07/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 9 | Roberto Cláudio | `p_9774739e7c5d` | 4 | 4 | 16/12/2025 | 28/04/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 10 | Domingos Filho | `p_963f4c4fb260` | 3 | 3 | 16/12/2025 | 28/07/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 11 | Chagas Vieira | `p_c6b15691ba22` | 2 | 2 | 16/12/2025 | 03/02/2026 | 0 | 0 | nenhuma em `CE` nem nacional |
| 12 | Luis Eduardo Girão | `p_8151229ee37c` | 1 | 1 | 15/02/2025 | 15/02/2025 | 0 | 0 | nenhuma em `CE` nem nacional |

## Senado · DF — `senador:DF`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | José Reguffe | `p_081734bf3f28` | 8 | 8 | 19/03/2026 | 07/08/2026 | 0 | 0 | nenhuma em `DF` nem nacional |
| 2 | Ibaneis Rocha | `p_0655e9471350` | 7 | 7 | 08/12/2025 | 23/06/2026 | 0 | 0 | nenhuma em `DF` nem nacional |
| 3 | Paulo Octávio | `p_8961ea2e881a` | 5 | 5 | 08/12/2025 | 15/08/2026 | 0 | 0 | nenhuma em `DF` nem nacional |
| 4 | Izalci Lucas | `p_8ba806842812` | 2 | 2 | 08/12/2025 | 31/07/2026 | 0 | 0 | nenhuma em `DF` nem nacional |
| 5 | Rafael Prudente | `p_6398a4b1ce91` | 2 | 2 | 19/07/2026 | 19/07/2026 | 0 | 0 | nenhuma em `DF` nem nacional |
| 6 | Leandro Grass | `p_5c5aed57b50b` | 1 | 1 | 08/12/2025 | 08/12/2025 | 0 | 0 | `governador:DF` |

## Senado · ES — `senador:ES`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Paulo Hartung | `p_eca7769214bb` | 10 | 10 | 11/03/2026 | 13/07/2026 | 0 | 0 | nenhuma em `ES` nem nacional |
| 2 | Carlos Manato | `p_249eb42d85e3` | 5 | 5 | 16/04/2026 | 21/07/2026 | 0 | 0 | nenhuma em `ES` nem nacional |
| 3 | Euclério Sampaio | `p_7175adb85a8f` | 4 | 4 | 05/12/2025 | 25/03/2026 | 0 | 0 | nenhuma em `ES` nem nacional |
| 4 | Arnaldinho Borgo | `p_481b79adf33a` | 3 | 3 | 11/03/2026 | 25/03/2026 | 0 | 0 | nenhuma em `ES` nem nacional |
| 5 | Lorenzo Pazolini | `p_85342d310197` | 2 | 2 | 14/03/2026 | 16/04/2026 | 0 | 0 | `governador:ES` |
| 6 | Da Vitória | `p_0168a7671e55` | 1 | 1 | 05/12/2025 | 05/12/2025 | 0 | 0 | nenhuma em `ES` nem nacional |

## Senado · GO — `senador:GO`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Alexandre Baldy | `p_b97661f8af60` | 25 | 25 | 05/12/2025 | 30/06/2026 | 0 | 0 | nenhuma em `GO` nem nacional |
| 2 | Delegado Humberto | `p_7aa4c967f866` | 18 | 18 | 03/02/2026 | 05/07/2026 | 0 | 0 | nenhuma em `GO` nem nacional |
| 3 | Jorge Kajuru | `p_0f9918a2f10f` | 10 | 10 | 05/12/2025 | 21/02/2026 | 0 | 0 | nenhuma em `GO` nem nacional |
| 4 | Aldo Arantes | `p_c58cdd7e2bcf` | 1 | 1 | 08/07/2026 | 08/07/2026 | 0 | 0 | nenhuma em `GO` nem nacional |
| 5 | Humberto Chaves | `p_2646ac0e363e` | 1 | 1 | 08/07/2026 | 08/07/2026 | 0 | 0 | nenhuma em `GO` nem nacional |
| 6 | Ricardo Dias | `p_5ce8e9c38b26` | 1 | 1 | 08/07/2026 | 08/07/2026 | 0 | 0 | nenhuma em `GO` nem nacional |
| 7 | Major Vitor Hugo | `p_264cfebbb942` | 1 | 1 | 05/12/2025 | 05/12/2025 | 0 | 0 | nenhuma em `GO` nem nacional |
| 8 | Rubens Otoni | `p_99b07c5352b7` | 1 | 1 | 05/12/2025 | 05/12/2025 | 0 | 0 | nenhuma em `GO` nem nacional |

## Senado · MA — `senador:MA`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Roberto Rocha | `p_cc66d0bf4817` | 10 | 10 | 28/11/2025 | 16/07/2026 | 0 | 0 | `governador:MA` |
| 2 | Pedro Lucas | `p_7a2c9143b863` | 9 | 9 | 28/11/2025 | 16/07/2026 | 0 | 0 | nenhuma em `MA` nem nacional |
| 3 | César Pires | `p_f515ad96b33b` | 8 | 8 | 28/01/2026 | 16/07/2026 | 0 | 0 | nenhuma em `MA` nem nacional |
| 4 | Orleans Brandão | `p_79cab9016df9` | 5 | 5 | 28/11/2025 | 24/03/2026 | 0 | 0 | `governador:MA` |
| 5 | Duarte Júnior | `p_99fc8e1f5656` | 3 | 3 | 13/05/2026 | 16/07/2026 | 0 | 0 | nenhuma em `MA` nem nacional |
| 6 | Mical Damasceno | `p_83e5c47aa032` | 3 | 3 | 28/01/2026 | 16/03/2026 | 0 | 0 | nenhuma em `MA` nem nacional |
| 7 | Antonia Cariongo | `p_031a1b64f138` | 1 | 1 | 07/07/2026 | 07/07/2026 | 0 | 0 | nenhuma em `MA` nem nacional |
| 8 | Franklin Douglas | `p_577a3de507ed` | 1 | 1 | 07/07/2026 | 07/07/2026 | 0 | 0 | nenhuma em `MA` nem nacional |
| 9 | Doutor Yglésio | `p_28c8e7327abb` | 1 | 1 | 28/01/2026 | 28/01/2026 | 0 | 0 | nenhuma em `MA` nem nacional |

## Senado · MG — `senador:MG`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Aécio Neves | `p_27269ea3b0b7` | 13 | 13 | 25/08/2025 | 29/07/2026 | 0 | 0 | nenhuma em `MG` nem nacional |
| 2 | Euclydes Pettersen | `p_70bc0a754892` | 8 | 8 | 25/08/2025 | 29/07/2026 | 0 | 0 | nenhuma em `MG` nem nacional |
| 3 | Alexandre Silveira | `p_949aa83604d3` | 7 | 7 | 09/12/2025 | 30/03/2026 | 0 | 0 | nenhuma em `MG` nem nacional |
| 4 | Eros Biondini | `p_6cb8cf4ad778` | 2 | 2 | 05/10/2025 | 26/07/2026 | 0 | 0 | nenhuma em `MG` nem nacional |
| 5 | Vanessa Portugal | `p_eb19263ec635` | 2 | 2 | 26/04/2026 | 26/07/2026 | 0 | 0 | nenhuma em `MG` nem nacional |
| 6 | Maria Lúcia Cardoso | `p_838cfe43fd2e` | 1 | 1 | 26/07/2026 | 26/07/2026 | 0 | 0 | nenhuma em `MG` nem nacional |
| 7 | Duda Salabert | `p_6eee373603cc` | 1 | 1 | 05/10/2025 | 05/10/2025 | 0 | 0 | nenhuma em `MG` nem nacional |
| 8 | Maurício do Volei | `p_d1bff6599b7c` | 1 | 1 | 05/10/2025 | 05/10/2025 | 0 | 0 | nenhuma em `MG` nem nacional |
| 9 | Rogério Correia | `p_24a4fbc3be68` | 1 | 1 | 05/10/2025 | 05/10/2025 | 0 | 0 | nenhuma em `MG` nem nacional |
| 10 | Caporezzo | `p_e588ab2e7737` | 1 | 1 | 25/08/2025 | 25/08/2025 | 0 | 0 | nenhuma em `MG` nem nacional |
| 11 | Reginaldo Lopes | `p_9d2ddd1d74b4` | 1 | 1 | 25/08/2025 | 25/08/2025 | 0 | 0 | nenhuma em `MG` nem nacional |
| 12 | Zema | `p_837be6e8d7f2` | 1 | 1 | 25/08/2025 | 25/08/2025 | 0 | 0 | `presidente:BR` |

## Senado · MS — `senador:MS`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Nelsinho Trad | `p_66285ff22c17` | 19 | 19 | 16/05/2025 | 29/07/2026 | 0 | 0 | nenhuma em `MS` nem nacional |
| 2 | Marcos Pollon | `p_03b745295799` | 7 | 7 | 06/02/2026 | 13/06/2026 | 0 | 0 | nenhuma em `MS` nem nacional |
| 3 | Gianni Nogueira | `p_2d7b94518666` | 3 | 3 | 16/05/2025 | 29/03/2026 | 0 | 0 | nenhuma em `MS` nem nacional |
| 4 | Gerson Claro | `p_f31b35bb4b65` | 3 | 3 | 16/05/2025 | 20/03/2026 | 0 | 0 | nenhuma em `MS` nem nacional |
| 5 | Oswaldo Meza | `p_e23a0b77e605` | 2 | 2 | 06/02/2026 | 20/03/2026 | 0 | 0 | nenhuma em `MS` nem nacional |
| 6 | Rose Modesto | `p_442e6e39cf83` | 1 | 1 | 16/05/2025 | 16/05/2025 | 0 | 0 | nenhuma em `MS` nem nacional |

### Recusados — o nosso próprio banco carrega a mesma grafia registrada

Não é afirmação de que sejam a mesma pessoa, nem de que não sejam. É o registro de que
`people.ndjson` tem **outra linha** com a mesma grafia normalizada e **com** candidatura —
o que basta para esta linha não poder ser publicada como "sem candidatura". Quem decide se
é a mesma pessoa, um homônimo ou um caso a pesquisar é um humano (§4, §12).

| candidato | `person_id` | cenários | 1º campo | último campo | no período | a linha que contradiz |
|---|---|---|---|---|---|---|
| Simone Tebet | `p_eef2e18fa1a5` | 2 | 16/05/2025 | 28/11/2025 | 0 | Simone Tebet `p_d957177e5198` `senador:SP` — pela grafia "Simone Tebet" |

## Senado · MT — `senador:MT`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Jayme Campos | `p_dafc79a6c96b` | 9 | 9 | 11/05/2025 | 21/07/2026 | 0 | 0 | nenhuma em `MT` nem nacional |
| 2 | Professora Rosa Neide | `p_049c2f076a88` | 1 | 1 | 23/03/2026 | 23/03/2026 | 0 | 0 | nenhuma em `MT` nem nacional |

## Senado · PA — `senador:PA`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Simão Jatene | `p_458d79e5e568` | 14 | 14 | 11/02/2025 | 21/03/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 2 | Paulo Rocha | `p_817bae486d5d` | 13 | 13 | 24/06/2025 | 30/04/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 3 | Gal Leite | `p_4d642330e228` | 2 | 2 | 25/07/2026 | 03/08/2026 | 0 | 0 | `governador:PA` |
| 4 | Fernando Carneiro | `p_4f4f9d86dc60` | 2 | 2 | 21/03/2026 | 25/04/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 5 | Joaquim Passarinho | `p_6431abf34648` | 2 | 2 | 21/03/2026 | 25/04/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 6 | Lívia Noronha | `p_3d5392f9cbab` | 1 | 1 | 15/08/2026 | 15/08/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 7 | José Nery | `p_90d90ed340c1` | 1 | 1 | 30/01/2026 | 30/01/2026 | 0 | 0 | nenhuma em `PA` nem nacional |
| 8 | Mario Couto | `p_6462b5e6eebc` | 1 | 1 | 28/08/2025 | 28/08/2025 | 0 | 0 | nenhuma em `PA` nem nacional |

## Senado · PB — `senador:PB`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Avenzoar Arruda | `p_dbdb97a60555` | 15 | 15 | 26/01/2026 | 12/07/2026 | 0 | 0 | nenhuma em `PB` nem nacional |
| 2 | Padre Fabrício | `p_278c80b7bfae` | 2 | 2 | 26/01/2026 | 30/01/2026 | 0 | 0 | nenhuma em `PB` nem nacional |
| 3 | Marcelo Queiroz | `p_61ada137d30e` | 1 | 1 | 01/12/2025 | 01/12/2025 | 0 | 0 | nenhuma em `PB` nem nacional |

## Senado · PE — `senador:PE`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Miguel Coelho | `p_69cf4127ac86` | 18 | 18 | 05/08/2025 | 30/07/2026 | 0 | 0 | nenhuma em `PE` nem nacional |
| 2 | Fernando Dueire | `p_03f5afef9e67` | 14 | 14 | 30/12/2025 | 26/07/2026 | 0 | 0 | nenhuma em `PE` nem nacional |
| 3 | Anderson Ferreira | `p_aa2a15b14544` | 12 | 12 | 10/12/2025 | 24/06/2026 | 0 | 0 | nenhuma em `PE` nem nacional |
| 4 | Jô Cavalcanti | `p_1ed115e506e8` | 8 | 8 | 05/02/2026 | 16/06/2026 | 0 | 0 | nenhuma em `PE` nem nacional |
| 5 | Silvio Costa Filho | `p_5f036464dbbd` | 7 | 7 | 05/08/2025 | 30/03/2026 | 0 | 0 | nenhuma em `PE` nem nacional |
| 6 | Gilson Machado | `p_261e54a8a706` | 5 | 5 | 05/08/2025 | 30/03/2026 | 0 | 0 | nenhuma em `PE` nem nacional |
| 7 | Armando Monteiro Neto | `p_fe25a19a2842` | 4 | 4 | 05/02/2026 | 26/04/2026 | 0 | 0 | nenhuma em `PE` nem nacional |
| 8 | Silvio Nascimento | `p_10b94cb81a52` | 3 | 3 | 26/07/2026 | 30/07/2026 | 0 | 0 | nenhuma em `PE` nem nacional |

## Senado · PI — `senador:PI`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Dionísio Piauí | `p_3de1ffc29c1b` | 1 | 1 | 13/07/2026 | 13/07/2026 | 0 | 0 | nenhuma em `PI` nem nacional |
| 2 | Joel Rodrigues | `p_c39f0193679a` | 1 | 1 | 27/11/2025 | 27/11/2025 | 0 | 0 | `governador:PI` |
| 3 | Toim do Frango | `p_1d7ec4399a55` | 1 | 1 | — | — | 0 | 1 | nenhuma em `PI` nem nacional |

### Recusados — o nosso próprio banco carrega a mesma grafia registrada

Não é afirmação de que sejam a mesma pessoa, nem de que não sejam. É o registro de que
`people.ndjson` tem **outra linha** com a mesma grafia normalizada e **com** candidatura —
o que basta para esta linha não poder ser publicada como "sem candidatura". Quem decide se
é a mesma pessoa, um homônimo ou um caso a pesquisar é um humano (§4, §12).

| candidato | `person_id` | cenários | 1º campo | último campo | no período | a linha que contradiz |
|---|---|---|---|---|---|---|
| Ravenna Castro | `p_bad76224457b` | 1 | 13/07/2026 | 13/07/2026 | 0 | Ravenna da Inclusão `p_ad7389244eab` `governador:PI` — pela grafia "Ravenna Castro" |

## Senado · PR — `senador:PR`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Hauly | `p_778e1fefc7d2` | 4 | 4 | 25/04/2026 | 28/07/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 2 | Ratinho Jr | `p_1a1619e6415f` | 3 | 3 | 11/08/2025 | 27/01/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 3 | Flávio Arns | `p_2ec9e9ddde5b` | 2 | 2 | 27/01/2026 | 12/08/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 4 | Enio Verri | `p_65173b776bb7` | 2 | 2 | 22/01/2026 | 27/01/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 5 | Jeffrey Chiquini | `p_77471cc48666` | 2 | 2 | 22/01/2026 | 27/01/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 6 | Osmar Dias | `p_1f750a9a0646` | 2 | 2 | 11/08/2025 | 27/01/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 7 | Zeca Dirceu | `p_1f1d36f9a4ba` | 2 | 2 | 11/08/2025 | 26/11/2025 | 0 | 0 | nenhuma em `PR` nem nacional |
| 8 | Rosane Ferreira | `p_315fc5b6f49e` | 1 | 1 | 12/04/2026 | 12/04/2026 | 0 | 0 | nenhuma em `PR` nem nacional |
| 9 | Beto Richa | `p_4281d5c8ae94` | 1 | 1 | 27/01/2026 | 27/01/2026 | 0 | 0 | nenhuma em `PR` nem nacional |

### Recusados — o nosso próprio banco carrega a mesma grafia registrada

Não é afirmação de que sejam a mesma pessoa, nem de que não sejam. É o registro de que
`people.ndjson` tem **outra linha** com a mesma grafia normalizada e **com** candidatura —
o que basta para esta linha não poder ser publicada como "sem candidatura". Quem decide se
é a mesma pessoa, um homônimo ou um caso a pesquisar é um humano (§4, §12).

| candidato | `person_id` | cenários | 1º campo | último campo | no período | a linha que contradiz |
|---|---|---|---|---|---|---|
| Álvaro Dias | `p_0c6e25e649b6` | 21 | 22/01/2026 | 12/08/2026 | 0 | Álvaro Dias `p_62d5d59f89a6` `governador:RN` — pela grafia "Álvaro Dias" |

## Senado · RJ — `senador:RJ`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Márcio Canella | `p_3b4781dea9e4` | 15 | 15 | 02/02/2026 | 30/07/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 2 | Cláudio Castro | `p_880fd4424725` | 9 | 9 | 27/08/2025 | 08/05/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 3 | Alessandro Molon | `p_4216869aee35` | 5 | 5 | 27/08/2025 | 25/04/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 4 | Mauro Campos | `p_ed8821f208da` | 4 | 4 | 03/06/2026 | 29/07/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 5 | Rodrigo Pimentel | `p_8a6f890a831e` | 4 | 4 | 06/03/2026 | 08/05/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 6 | Otoni de Paula | `p_dd554ab004ca` | 3 | 3 | 27/08/2025 | 10/03/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 7 | Luciana Boiteux | `p_7ee052047057` | 2 | 2 | 25/04/2026 | 27/07/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 8 | Clarissa Garotinho | `p_5102751664c3` | 2 | 2 | 29/08/2025 | 06/03/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 9 | Washington Reis | `p_1db96c2a76a4` | 2 | 2 | 27/08/2025 | 06/03/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 10 | Flávio Bolsonaro | `p_2901c8f601be` | 2 | 2 | 27/08/2025 | 29/08/2025 | 0 | 0 | `presidente:BR` |
| 11 | Paulo Ganime | `p_b21fe9d04b44` | 1 | 1 | 27/07/2026 | 27/07/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 12 | Rogéria Bolsonaro | `p_b504f01ff3c7` | 1 | 1 | 08/05/2026 | 08/05/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 13 | Felipe Curi | `p_248316b60b61` | 1 | 1 | 25/04/2026 | 25/04/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 14 | Luciano Vieira | `p_e730ebf37a18` | 1 | 1 | 13/02/2026 | 13/02/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 15 | Lindbergh Farias | `p_7c0a3346ca83` | 1 | 1 | 02/02/2026 | 02/02/2026 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 16 | Fabiano Horta | `p_23d98545811b` | 1 | 1 | 27/08/2025 | 27/08/2025 | 0 | 0 | nenhuma em `RJ` nem nacional |
| 17 | Sóstenes Cavalcante | `p_e7d692d4e4d7` | 1 | 1 | 27/08/2025 | 27/08/2025 | 0 | 0 | nenhuma em `RJ` nem nacional |

## Senado · RN — `senador:RN`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Jean Paul Prates | `p_fe12d402a9ba` | 7 | 7 | 11/01/2026 | 20/04/2026 | 0 | 0 | nenhuma em `RN` nem nacional |
| 2 | Ezequiel Ferreira | `p_9d16bceb4294` | 3 | 3 | 11/01/2026 | 04/04/2026 | 0 | 0 | nenhuma em `RN` nem nacional |
| 3 | Álvaro Dias | `p_62d5d59f89a6` | 3 | 3 | 11/09/2025 | 11/01/2026 | 0 | 0 | `governador:RN` |
| 4 | Fátima Bezerra | `p_8fe5a6556f6e` | 3 | 3 | 11/09/2025 | 11/01/2026 | 0 | 0 | nenhuma em `RN` nem nacional |
| 5 | Babá Pereira | `p_6894131e6bd2` | 2 | 2 | 11/09/2025 | 11/01/2026 | 0 | 0 | nenhuma em `RN` nem nacional |
| 6 | Carlos Eduardo Alves | `p_7c56ab1f59d2` | 2 | 2 | 02/12/2025 | 11/01/2026 | 0 | 0 | nenhuma em `RN` nem nacional |
| 7 | Luizinho Cavalcante | `p_c3f330672d7c` | 1 | 1 | 11/01/2026 | 11/01/2026 | 0 | 0 | nenhuma em `RN` nem nacional |
| 8 | Rivaldo Fernandes | `p_a89432d89287` | 1 | 1 | 02/12/2025 | 02/12/2025 | 0 | 0 | nenhuma em `RN` nem nacional |

## Senado · RO — `senador:RO`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Confúcio Moura | `p_d52212cb00cb` | 8 | 8 | 10/12/2025 | 16/07/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 2 | Amir Lando | `p_4ec11ac79e35` | 4 | 4 | 20/01/2026 | 11/06/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 3 | Rodrigo Camargo | `p_199874767dac` | 3 | 3 | 10/12/2025 | 19/03/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 4 | Marcos Rogério | `p_ddfe02a915b8` | 2 | 2 | 10/12/2025 | 19/03/2026 | 0 | 0 | `governador:RO` |
| 5 | Delegado Flori | `p_e18064fa56c4` | 1 | 1 | 19/03/2026 | 19/03/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 6 | João Cipriano | `p_283920551297` | 1 | 1 | 20/01/2026 | 20/01/2026 | 0 | 0 | nenhuma em `RO` nem nacional |
| 7 | Coronel Marcos Rocha | `p_508840ab6c6d` | 1 | 1 | 10/12/2025 | 10/12/2025 | 0 | 0 | nenhuma em `RO` nem nacional |

## Senado · RR — `senador:RR`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Antônio Denarium | `p_780abff791ce` | 3 | 3 | 14/10/2025 | 04/04/2026 | 0 | 0 | nenhuma em `RR` nem nacional |
| 2 | Mecias de Jesus | `p_aff1df0cce3f` | 2 | 2 | 14/10/2025 | 04/12/2025 | 0 | 0 | nenhuma em `RR` nem nacional |
| 3 | Rodrigo Cataratas | `p_1667d3cbab9c` | 2 | 2 | 14/10/2025 | 04/12/2025 | 0 | 0 | nenhuma em `RR` nem nacional |

## Senado · RS — `senador:RS`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Eduardo Leite | `p_9751678869df` | 7 | 7 | 31/10/2025 | 08/05/2026 | 0 | 0 | nenhuma em `RS` nem nacional |
| 2 | Juliana Brizola | `p_a0a385995903` | 1 | 1 | 10/02/2026 | 10/02/2026 | 0 | 0 | `governador:RS` |
| 3 | Luis Carlos Heinze | `p_c1e2219c69d0` | 1 | 1 | 24/11/2025 | 24/11/2025 | 0 | 0 | nenhuma em `RS` nem nacional |
| 4 | Márcio Biolchi | `p_db30ad9fa81c` | 1 | 1 | 24/11/2025 | 24/11/2025 | 0 | 0 | nenhuma em `RS` nem nacional |

## Senado · SC — `senador:SC`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Gilson Marques | `p_e24c96ea1e2b` | 3 | 3 | 03/12/2025 | 31/05/2026 | 0 | 0 | nenhuma em `SC` nem nacional |
| 2 | Vinicius Lummertz | `p_58aab0f72f04` | 3 | 3 | 03/12/2025 | 31/05/2026 | 0 | 0 | nenhuma em `SC` nem nacional |
| 3 | Carlos Chiodini | `p_6e5fb226bef1` | 2 | 2 | 03/12/2025 | 04/04/2026 | 0 | 0 | nenhuma em `SC` nem nacional |
| 4 | Clésio Salvaro | `p_a05023272bb5` | 2 | 2 | 03/12/2025 | 04/04/2026 | 0 | 0 | nenhuma em `SC` nem nacional |
| 5 | Tânia Ramos | `p_50522729d723` | 1 | 1 | 03/12/2025 | 03/12/2025 | 0 | 0 | nenhuma em `SC` nem nacional |

## Senado · SE — `senador:SE`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Adailton de Valmir de Francisquinho | `p_95aa32ea2e8c` | 1 | 1 | 07/02/2026 | 07/02/2026 | 0 | 0 | nenhuma em `SE` nem nacional |
| 2 | Luizão Dona Trumpi | `p_f4d654b4b016` | 1 | 1 | 07/02/2026 | 07/02/2026 | 0 | 0 | nenhuma em `SE` nem nacional |
| 3 | Márcio Macedo | `p_c3227aacda54` | 1 | 1 | 26/11/2025 | 26/11/2025 | 0 | 0 | nenhuma em `SE` nem nacional |

## Senado · SP — `senador:SP`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Paulinho da Força | `p_a18f36128373` | 19 | 19 | 12/10/2025 | 03/07/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 2 | Márcio França | `p_0f233300c9aa` | 9 | 9 | 09/02/2026 | 31/05/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 3 | Baleia Rossi | `p_aee73727f227` | 7 | 7 | 24/08/2025 | 25/04/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 4 | Fernando Haddad | `p_39b752645a0c` | 7 | 7 | 12/10/2025 | 27/03/2026 | 0 | 0 | `governador:SP` |
| 5 | Robson Tuma | `p_aa16d79f8908` | 7 | 7 | 24/08/2025 | 10/02/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 6 | Ricardo Mello Araújo | `p_69a48919470c` | 5 | 5 | 29/11/2025 | 25/04/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 7 | Mário Frias | `p_614de08fb552` | 4 | 4 | 10/02/2026 | 25/04/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 8 | Geraldo Alckmin | `p_836bc7cb7042` | 3 | 3 | 24/08/2025 | 08/12/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 9 | Dr.ª | `p_943664d39761` | 2 | 2 | 08/08/2026 | 13/08/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 10 | Guilherme Boulos | `p_7f483aae2cbf` | 2 | 2 | 05/03/2026 | 07/03/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 11 | Gil Diniz | `p_c1aeb84f07bc` | 2 | 2 | 10/02/2026 | 05/03/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 12 | Rosana Valle | `p_edd21e676a06` | 2 | 2 | 08/12/2025 | 05/03/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 13 | Eduardo Bolsonaro | `p_4c1a3c60a715` | 2 | 2 | 12/10/2025 | 09/02/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 14 | Marco Feliciano | `p_7003e3849289` | 2 | 2 | 24/08/2025 | 09/02/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 15 | Paulo Serra | `p_ecc1fd5e4050` | 2 | 2 | 29/11/2025 | 23/01/2026 | 0 | 0 | nenhuma em `SP` nem nacional |
| 16 | Luiz Marinho | `p_7f35b7d4e39e` | 2 | 2 | 24/08/2025 | 12/10/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 17 | Rodrigo Manga | `p_8a51ffb2202f` | 2 | 2 | 03/09/2025 | 12/10/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 18 | Alexandre Luiz Giordano | `p_df77e5ac8770` | 2 | 2 | 24/08/2025 | 03/09/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 19 | Mara Gabrilli | `p_63c76d20eebd` | 2 | 2 | 24/08/2025 | 03/09/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 20 | Alexandre Padilha | `p_cb6aee56a10a` | 1 | 1 | 08/12/2025 | 08/12/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 21 | Tomé Abduch | `p_d48c84e25db7` | 1 | 1 | 08/12/2025 | 08/12/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 22 | Acácio Miranda | `p_55f6f4cea990` | 1 | 1 | 29/11/2025 | 29/11/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 23 | Rodrigo Garcia | `p_e7e1a81ff545` | 1 | 1 | 03/09/2025 | 03/09/2025 | 0 | 0 | nenhuma em `SP` nem nacional |
| 24 | Cezinha de Madureira | `p_65e9c47c8b2e` | 1 | 1 | 24/08/2025 | 24/08/2025 | 0 | 0 | nenhuma em `SP` nem nacional |

## Senado · TO — `senador:TO`

### Testados sem candidatura na disputa

| # | candidato | `person_id` | cenários | levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Irajá | `p_4e8cd392abd7` | 14 | 14 | 08/04/2025 | 31/07/2026 | 0 | 0 | nenhuma em `TO` nem nacional |
| 2 | Carlos Velozo | `p_dc4ccac52342` | 5 | 5 | 12/04/2026 | 31/07/2026 | 0 | 0 | nenhuma em `TO` nem nacional |
| 3 | Wanderlei Barbosa | `p_abf04d4b07fb` | 4 | 4 | 08/04/2025 | 24/03/2026 | 0 | 0 | nenhuma em `TO` nem nacional |
| 4 | Vicentinho Júnior | `p_420d89713e56` | 3 | 3 | 08/04/2025 | 27/01/2026 | 0 | 0 | `governador:TO` |
| 5 | Cinthia Ribeiro | `p_0338769d2833` | 1 | 1 | 24/07/2026 | 24/07/2026 | 0 | 0 | nenhuma em `TO` nem nacional |
| 6 | Pastor Amarildo | `p_623141ed4916` | 1 | 1 | 27/01/2026 | 27/01/2026 | 0 | 0 | nenhuma em `TO` nem nacional |
| 7 | Ataides de Oliveira | `p_08bf4e53a767` | 1 | 1 | 08/04/2025 | 08/04/2025 | 0 | 0 | `governador:TO` |

---

Nada se corrige a partir desta tabela. Ela existe para que, quando uma pesquisa do período
eleitoral parecer estranha, dê para responder em um olhar se um nome fora da urna está no
meio dela — e a decisão do que fazer continua sendo do criador (§12).
