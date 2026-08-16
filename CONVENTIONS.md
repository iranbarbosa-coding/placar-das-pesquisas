# Como se trabalha neste projeto

As convenções abaixo não são estilo. Cada uma existe porque a sua ausência
custou um defeito real, e a maioria dos defeitos deste repositório é da mesma
família: **saída que depende de algo que não são os dados.**

---

## 1. Quem produz não certifica

Nenhum agente valida o próprio trabalho. Quem roda o pipeline não roda os
validadores; quem escreve um componente não declara que ele está certo. A
conferência é feita por **outro** agente, e é ela que achou quase tudo o que
importou:

- uma alegação de procedência falsa num reparo (creditei ao Poder360 um valor
  que era da Wikipédia);
- 15 carimbos de reparo apagados em silêncio pela virada da Fase 3;
- um reparo curado revertido porque `upsertPoll` não consultava `partyOverride`;
- três barras de comparação que não somavam a coisa nenhuma.

**Quando um número tem de sair de um documento, DOIS agentes leem às cegas e as
leituras são comparadas.** Foi assim que se resolveram a tabela do Senado no
Piauí, a Vox nacional e os cenários cruzados da AtlasIntel no RN. Uma leitura
só não basta para um número que vai ao ar.

## 2. Prove que o guarda dispara antes de acreditar no zero

Um verde que ninguém testou não é evidência. Todo validador tem `--self-test`
por isso, e o autoteste tem de **falhar quando deve**:

```bash
node scripts/validate-store.mjs --self-test
node scripts/idempotence-check.mjs --self-test
```

Já aconteceu de um lote de conferência voltar vazio porque o próprio controle
tinha quebrado (HTTP 429/502) — resultado descartado e refeito até o controle
passar. **Silêncio não é sucesso.**

Corolário: quando um guarda passa a proteger código que ninguém executa, ele
mente. `idempotence-check.mjs` dirigia a migração; depois da virada foi
reapontado para o construtor real. `upsert-vs-migration.mjs` passou a comparar o
caminho consigo mesmo e hoje **recusa rodar** em vez de imprimir OK.

## 3. Congelamento do artefato

Enquanto uma verificação está em curso, o artefato não muda. Se mudar, a
verificação é **anulada e refeita** — um veredito sobre um estado que já não
existe não vale nada. Vale para produtores também: numa rodada eu assumi o
pipeline enquanto um agente ainda o segurava, e o `migrate` dele recusou (o
guarda funcionou, mas a corrida foi minha).

## 4. Nunca inferir; recusar ambiguidade

- `data/repairs.json` exige fonte primária citada. Nenhum número é inferido de
  pesquisas vizinhas.
- Sem fonte, o campo fica **nulo** em vez de afirmar (Telêmaco Brandão, e o
  partido de Leonardo Avalanche, cuja única atestação era o próprio reparo).
- O casador de nomes de urna **recusa** o que é ambíguo em vez de escolher. Foi
  a falta disso que juntou "Ciro" a "Ciro Nogueira" e um Bolsonaro a outro.
- Intuição política não é fonte. No caso da AtlasIntel/RN o raciocínio "o
  adversário mais forte deve segurar mais" apontava para o lado **errado**; o
  relatório do instituto decidiu.

## 5. Uma regra, uma implementação

Cópias divergem. O repositório já mantém `projection-twin-check.mjs` por causa
disso, e mesmo assim reincidiu: a tabela reproduzia a seleção da janela (hoje
recebe `windowPollIds`), e o esquema de cores existia **três vezes** — com
conjuntos de chaves diferentes, o que dá ao mesmo candidato duas cores na mesma
página.

Módulos livres de Node existem por causa da fronteira de cliente: `lib/data.ts`
alcança `node:fs`, então componentes de cliente não podem importá-lo. Daí
`lib/format.ts`, `lib/names.ts`, `lib/colors.ts`. Sintoma quando se erra:
`UnhandledSchemeError: Reading from "node:fs"` no build.

## 6. Gerador nunca lê a própria saída

`candidate-resolve.mjs` escreveu a tabela vazia duas vezes antes disso ser
entendido. Em 16/08/2026 aconteceu de novo com `match-ballot-names.mjs`: lendo
`polls.json` (já canonicalizado), "Romeu Zema" sumia do input assim que virava
"Zema", a tabela encolhia e os acentos restaurados eram perdidos.

Por isso `scrape.mjs` grava `data/nomes-crus.json` **antes** de canonicalizar, e
o casador lê de lá. **O casador roda DEPOIS da coleta**, e o mapa que ele gera
vale para a rodada seguinte.

## 7. Índice mantido é índice atualizado no write

Todo índice em `store._indexes` precisa responder "o que me atualiza DURANTE uma
rodada?". `byRef` foi consertado uma vez e `byReg` ficou quebrado por meses com
o mesmo defeito, porque ninguém enumerou os outros na mesma passada.

## 8. Determinismo

Nada de `Date.now()`, `Math.random()` ou ordem de array decidindo saída. Datas
vêm de `runDate`, injetado. Empates desempatam em campo estável (`poll.id`,
rótulo do cenário, nome). Cores saem de hash do nome. Ids são cunhados uma vez
de semente registrada e **nunca** recomputados.

`provenance.updated_at` só muda quando o conteúdo muda — sem isso, reconstruir
noutro dia reescrevia 2.954 perguntas só com carimbo diferente.

## 9. O censo é a definição de "normalizado"

`CENSO_BANCO.md`, gerado por `scripts/census.mjs`, tem classes **fixas em
código**. O banco está normalizado quando estão vazias ou o que resta está
parqueado como decisão editorial. Achado fora das classes é **anotado, não
corrigido no meio de uma rodada**.

Separação deliberada: `validate-store.mjs` guarda o **impossível** (reprova a
rodada); o censo lista o **suspeito** (relata e não reprova). Sem isso, uma
divergência de arredondamento de 0,1 ponto derruba a Action duas vezes por dia.

## 10. Tolerância derivada, nunca escolhida

O guarda de soma usa a folga que a própria fonte ganhou: 0,5 por figura inteira,
0,05 por décimo. É o que deixa passar a pesquisa de PE (58+33+8+2 = 101, quatro
inteiros) e barra a mesma sobra escrita em décimos. **Alargar tolerância para o
portão passar é a jogada proibida** — foi ela que este projeto removeu ao
reescrever `upsert-vs-migration.mjs` para conferir caso a caso em vez de contar
contra um teto.

## 11. Números e língua

Tudo em pt-BR: vírgula decimal, sinal de menos verdadeiro (`−`), datas
`DD/MM/AAAA`. Comentário de código explica **por que**, com o defeito que o
motivou — o repositório é a memória do projeto, e um comentário que só descreve
o que a linha faz não paga o espaço que ocupa.

## 12. O criador decide

Decisões de método e de escopo são dele. O agente mede, apresenta opções com o
custo de cada uma, e recomenda — mas não escolhe por ele. E não o usa como
barramento de mensagens: trabalho de rotina se resolve entre agentes.

Decisões dele já registradas em código: uma operação de campo = um levantamento;
pesquisa de voto único no Senado é estatística nula; votos válidos é o padrão;
o nome de urna é o que se normaliza; pesquisas incompletas ficam fora da média.
