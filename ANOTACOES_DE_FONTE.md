# Anotações de fonte

O que a fonte publicou e nós **não** consertamos — e por quê. Uma entrada por
levantamento, com o fato citado, e o que ficou de fora de propósito.

Isto é `§9` aplicado fora do censo: **anotado, não corrigido**. O censo tem
classes fixas em código e um autoteste; este arquivo é curado à mão e não é
executável — não reprova rodada, não entra em portão, não muda dado. Se algum
destes fatos merecer um dia ser ENFORÇADO, a promoção a classe de censo é frente
própria, com `--self-test` que reprova quando deve.

Gerado à mão. Cada entrada cita a fonte primária e a data em que foi verificada.

---

## Identidade de levantamento — retenções medidas

As cinco entradas abaixo NÃO foram consertadas porque o conserto move
identidade. **A distinção importa e as duas coisas vêm sendo tratadas como uma:**

- **recunhar** um id: o levantamento (e as perguntas penduradas nele) ganham id
  novo. Perde-se o `created_at` que o `priorStamps` casa POR ID. Não muda o que
  a média conta.
- **fundir** dois levantamentos: dois viram um. Muda o que a média conta, porque
  "uma operação de campo = um levantamento" passa a valer onde não valia.

Medido em 20/08/2026, por build do store comparando os conjuntos de id (base =
`main` com os reparos existentes; teste = base + o reparo candidato).

| levantamento | reparo candidato | efeito medido |
|---|---|---|
| `s_ef40182005a7` (Parauapebas-PA, Portal Pebão) | registro `PA-02789/2026` | recunha o survey e 2 perguntas |
| `s_e98976871872` (João Pessoa-PB, Fonte83) | registro `PB-00353/2026` | recunha o survey e 2 perguntas |
| `s_a7c7dee21767` (MS, 22 municípios, IPR) | registro `BR-01165/2026` **ou** `MS-06319/2026` | recunha o survey e 2 perguntas, em qualquer das duas |
| `s_a0a23c8e8c0f` + `s_ede5df4e92eb` (Campina Grande-PB, Ranking) | registro `PB-01373/2026` nos dois | **FUNDE os dois** e recunha tudo |
| `s_1eed00d01f65` + `s_c3ea7003b0c2` (Anápolis-GO, Direct) | preencher `fieldwork_start` | **FUNDE os dois** e recunha 1 pergunta |

**A causa é estrutural, não caso a caso.** A semente troca de CLASSE quando o
registro chega:

    s_ef40182005a7 antes : survey|nat|i_a7850b303de2|PA|2026-06-20|780|Araceli,…
                   depois: survey|reg|PA-02789/2026

O degrau do registro atende antes do degrau da chave natural, então o
levantamento é cunhado de outra semente e o id se move. **Escala medida em
20/08/2026: 500 dos 1.049 levantamentos têm semente `nat` e registro nulo, com
1.112 perguntas penduradas neles.** Todos recunham se receberem registro. Dar
registro a quem foi cunhado sem registro é, nesta base, uma operação de
identidade — não o preenchimento de um campo vazio.

Os 148 levantamentos de semente `ref` e registro nulo NÃO têm esse efeito: neles
o registro pode ser preenchido sem mover nada.

---

## Qualidade da fonte

### `s_064f4a3bfefa` — Aparecida de Goiânia-GO, iGape
A fonte não é ficha técnica: são **três prints de matérias** do Conexão Record
(imagem, 150 dpi). `GO-09003/2026` não aparece em nenhuma delas, e não há n,
margem nem período fora do texto jornalístico. Verificado em 20/08/2026.

### `s_0fce0f025974` — São Luís-MA
PDF **anônimo**, export de Power BI: sem instituto, sem contratante, sem
estatístico, sem registro. A atribuição "DataIlha" existe só no nome do arquivo.
Coleta de um dia para n=705 (06/12/2025). Verificado em 20/08/2026.

### `s_a0a23c8e8c0f` × `s_ede5df4e92eb` — Campina Grande-PB, Ranking
O mesmo estudo publica **n diferente por disputa**: 782 no governo, 787 no
senado, com o mesmo campo (11–12/06/2026) e o mesmo registro `PB-01373/2026`.
Não se escolheu um dos dois: são o que a fonte publicou. Verificado em 20/08/2026.

### `s_d4d2a692953a` — Senador Canedo-GO
Dois fatos da fonte, nenhum consertado:
1. O PDF **se contradiz no ano**: a capa diz "Período da pesquisa: 02.02.2026 a
   03.02.2026" e a ficha técnica (p.3) diz "Dados coletados no período de 02 a 03
   de Fevereiro de **2025**". Dia e mês batem; o ano não. O banco guarda 2026.
2. O banco atribui o levantamento a **"Portal Goiás"**; o relatório é assinado
   por **iGape** e diz "encomendada pela TV Atual Record/News" (p.4).
   `institute_names_raw` guarda a grafia PUBLICADA pelo agregador, que é outra
   coisa da assinatura do relatório — trocar sem decidir qual das duas é a fonte
   de verdade seria inventar (§4). Verificado em 20/08/2026.

### `s_1eed00d01f65` / `s_c3ea7003b0c2` — Anápolis-GO, Direct
O PDF de Anápolis (`GO-04010/2026`) estampa **também `GO-03986/2026`** nas
páginas 14, 21 e 22 — nos blocos de rejeição ao Senado e de avaliação da gestão
do governador. `GO-03986/2026` é o registro de **outro** levantamento que o banco
já tem: `s_9ed8a57cc880`, da mesma Direct, e que é de **Goianésia**, não de
Anápolis. O relatório reaproveita rodapé entre estudos de municípios diferentes.
Achado por leitura cega do PDF em 20/08/2026; não está nas fichas da certificação
municipal, que registram `GO-03986/2026` só como o registro do estudo de
Goianésia.

Isso interessa a quem for decidir a identidade do par de Anápolis: o caso não é
"dois ids, um PDF" — o PDF mistura carimbos de dois estudos registrados.

### `s_33e35ca666b5` — municípios do Acre
Os PDFs citam "Ref. no TRE-**RO** Nº 07407-2026" — Rondônia, para pesquisa do
Acre. `AC-00770/2026` não aparece em nenhum dos três arquivos. E o n diverge
dentro do estudo: 605 em presidente/governador, 404 no senado (202 × 2 opções, só
Rio Branco). Verificado pela certificação municipal.

---

## Sucata da varredura

Itens em que a "fonte" apontada não sustenta o dado. Nenhum virou reparo.

- **MT #13664** — o link aponta um levantamento **Quaest do RS**, não de MT.
- **`AL-064882026.pdf`** — é print de blog, não documento do instituto.
- **MTDados** — print de site (webflow), sem ficha técnica.

Verificado pela certificação municipal; anotado aqui em 20/08/2026.
