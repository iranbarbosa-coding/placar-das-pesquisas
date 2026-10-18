# Metodologia da Previsão Estatística

Documento técnico da camada de previsão do Placar das Pesquisas (`forecast/`,
`scripts/forecast/`, `data/forecast/`, `/previsao`). Os resultados medidos da
validação estão em [`FORECASTING_VALIDATION.md`](FORECASTING_VALIDATION.md);
aqui estão as definições, as equações e as escolhas, com o motivo de cada uma.

Versão do modelo: **1.0.0** · configuração: `forecast/config/model-v1.json`
(`config_id = placar-previsao-v1`).

---

## 1. O que esta camada é — e o que ela não toca

O site publica a **média das pesquisas** (`src/lib/average.ts`: as 10 pesquisas
mais recentes da disputa, no máximo 2 por instituto, em votos válidos). Esta
camada **não altera** essa média nem nenhuma regra de coleta, limpeza ou
deduplicação. Ela é um consumidor do mesmo banco, com quatro produtos
distintos, que o site nunca mistura:

| Produto | O que é | Natureza |
|---|---|---|
| Média das pesquisas | o número publicado pelo site, inalterado | **fato** (o que as pesquisas mediram) |
| Estimativa atual (*nowcast*) | posteriori do apoio latente na data de referência | modelo (Modelo A) |
| Projeção para o dia da eleição | distribuição preditiva do resultado | modelo (A + B + C) |
| Avaliação histórica | desempenho fora da amostra contra o TSE | medição (backtest) |

Diferenças deliberadas em relação à média, e por quê:

* **Janela**: 150 dias, todas as pesquisas — não as 10 últimas. O passeio
  aleatório já desconta as antigas na medida certa (§4).
* **Peso**: cada pesquisa pesa pelo tamanho efetivo da amostra e pelo erro não
  amostral estimado, não igualmente.
* **Institutos**: o viés de cada um é estimado e descontado (efeito casa), em
  vez de limitar quantas pesquisas dele entram.
* **Unidade**: a operação de campo — cenários da mesma amostra contam uma vez.

## 2. Dados de entrada

### 2.1 Exportador (`scripts/forecast/export-inputs.mjs`)

A camada estatística é Python, mas **nenhuma regra do site é reimplementada em
Python** (CONVENTIONS §5). O exportador projeta o banco como o site o vê
(`data/polls.json`, derivado do store e conferido por `parity-check.mjs`) e
aplica, chamando o próprio código TypeScript do site:

* `incomplete` e `municipal` (carimbados pela projeção, `store.ts`/`project.mjs`);
* `averageable` (`src/lib/senado.ts`): Senado só com pergunta de dois votos;
* `toBasis(p, "validos")` (`src/lib/validos.ts`): votos válidos **por pesquisa**,
  antes de qualquer média;
* `senadoEmValidos` (`src/lib/acerto.ts`): Senado na base do `pvap` do TSE
  (parte de cada nome no total de menções);
* `computeAverage` (`src/lib/average.ts`): a média publicada, como base de comparação;
* `confrontosSegundoTurno` (`src/lib/eleicao.ts`): quem disputa o 2º turno vem
  das **urnas**, com as decisões judiciais curadas aplicadas (RJ, 10/2026).

Identidade de candidato: `candidate_id` do store, por disputa
(`presidente:BR`, `governador:AC`…), resolvido por `candKey` sobre o canônico e
os apelidos de `data/candidates.ndjson`. Grafia ambígua (duas pessoas sob a
mesma chave) **não resolve**; nome sem id vira `candidate_id: null` e nunca é
adivinhado. Disputa: `race_id = <cargo>-<uf|br>-<ano>-t<turno>`.

### 2.2 Regras próprias da previsão (`forecast/placar_forecast/data.py`)

Toda exclusão é registrada com o motivo (vai no snapshot e na API):

| Motivo | Regra |
|---|---|
| `indisponivel_na_data` | divulgada depois da data de referência (ou fim de campo + defasagem, quando não há data de divulgação — só no modo reconstruído, §7.1) |
| `campo_posterior_a_data` | fim de campo depois da data (trava redundante) |
| `fora_da_janela` | campo mais antigo que 150 dias |
| `par_diferente` | 2º turno: não testou **exatamente** o par das urnas (por `candidate_id`, sem terceiro nome) |
| `candidato_nao_resolvido` | um nome do par sem `candidate_id` |
| `percentual_invalido` | percentual fora de [0, 100], não finito, ou soma > 100,5 |
| `elenco_incompleto` | 1º turno: falta um candidato acompanhado |
| `mesma_amostra` | outra pergunta da mesma operação de campo (instituto, UF, fim de campo, amostra) já entrou |
| `provavel_republicacao` | mesmo instituto, mesmos números e mesma amostra a ≤ 7 dias |

Pesquisas antes e depois do 1º turno: no 2º turno, as simulações do mesmo par
feitas antes do 1º turno entram (a mesma decisão da média do site, 08/10); o
passeio aleatório lhes dá menos peso à medida que envelhecem.

Tamanho de amostra ausente: recebe o 1º quartil das amostras da disputa (piso
400), e a pesquisa é marcada `n_imputado`. É uma escolha de **variância**
conservadora, não um dado inventado: nenhuma porcentagem é imputada.

### 2.3 Candidatos acompanhados (1º turno)

Escolhidos **só pelas pesquisas disponíveis na data** (nunca pelo resultado):
presença em ≥ 60% das pesquisas, fração média ≥ 3%, no máximo 5. O resto vira
a categoria "demais candidatos" quando ela tem em média ≥ 0,5%. No 2º turno,
os dois do par.

## 3. Escala composicional

Com K categorias de frações p (somam 1) e referência r (o candidato de maior
fração média), o modelo trabalha na razão log-aditiva:

```
y_k = log(p_k / p_r),   k ≠ r          (D = K − 1 componentes; no 2º turno, o logit)
p   = softmax([y, 0])                    (volta; soma exatamente 1)
```

Estimar as frações uma a uma produziria totais que não fecham 100%; aqui toda
amostra devolve um vetor no simplex. Categoria publicada como 0 recebe correção
de continuidade `(p·n + 0,5)/(n + 0,5K)`.

**Covariância amostral** (método delta sobre a multinomial com n respondentes
válidos; como `G p = 0`, o termo `p pᵀ` some):

```
S(p̄, n) = ( diag(1/p̄_k) + (1/p̄_r) 1 1ᵀ ) / n
```

avaliada nas frações **médias** da disputa (p̄), não nas da própria pesquisa —
ponderar pela variância calculada com o próprio valor puxa a média para os
valores que saíram baixos por acaso. Tamanho efetivo: `n_eff = amostra ×
fração que declarou voto em candidato` (Senado: soma das menções ÷ 200), com
piso 100.

## 4. Modelo A — espaço de estados bayesiano (`ssm.py`)

### 4.1 Modelo

Para a pesquisa i, do instituto j(i), no meio do campo t_i:

```
μ_g      = μ_{g−1} + η_g,          η_g ~ N(0, σ_rw² Δ_g I_D)        (estado, em dias)
y_i      = μ_{t_i} + h_{j(i)} + ε_i,  ε_i ~ N(0, S_i + τ² I_D)       (observação)
h_j      ~ N(0, σ_h² I_D)  condicionado a  Σ_j h_j = 0               (efeito casa)
μ_0      ~ N(m_0, 2² I_D)
σ_rw ~ N⁺(0; 0,02²)     τ ~ N⁺(0; 0,10²)     σ_h ~ N⁺(0; 0,15²)   (semi-normais)
```

* **S_i** é a variância amostral (§3); **τ²** o erro não amostral de cada
  pesquisa (desenho, ponderação, modo, momento), estimado. A margem de erro
  declarada não cobre tudo, e o modelo não supõe que cubra.
* **h_j** é o efeito casa. A restrição de soma zero diz que o **instituto
  médio** não tem viés em relação ao estado latente. O viés da casa média em
  relação às urnas não é identificável pelas pesquisas — é o erro sistemático
  do Modelo B, calibrado contra o resultado (Modelo C). Um teste
  (`test_common_bias_is_not_identifiable_from_polls`) demonstra isso.
* **Correlação entre pesquisas**: pesquisas do mesmo instituto compartilham
  h_j (correlação positiva entre elas); todas compartilham μ e o erro
  sistemático. Nenhuma pesquisa é tratada como independente das outras.
* **Datas**: a observação está no meio do campo; a disponibilidade usa a data
  de divulgação (§7.1). Duas pesquisas no mesmo dia entram por informação somada.
* **Metodologia de coleta**: o banco não registra (`methodology` é nulo em
  todos os 1.851 levantamentos), então diferenças de método entram só como
  parte do efeito casa.
* **Escalas das priores**: σ_rw = 0,02/√dia permite ~2,5 p.p. de deriva por mês
  perto de 50% com alta probabilidade; τ = 0,10 e σ_h = 0,15 (≈ 2,5 e 3,7 p.p.
  perto de 50%) são fracamente informativas — regularizam disputas com poucos
  institutos sem impedir efeitos grandes onde os dados os mostram.

### 4.2 Amostrador

MCMC **marginal**, exato para o modelo gaussiano:

1. θ = (σ_rw, τ, σ_h) por Metropolis adaptativo (Haario, Saksman & Tamminen,
   2001) contra **p(y | θ)**, com μ e h integrados por um filtro de Kalman no
   estado aumentado `x = [μ, f_1…f_{J−1}]`, `h_j = f_j` (j < J), `h_J = −Σ f`,
   priori `f ~ N(0, σ_h² (I − 11ᵀ/J))` — exatamente a normal condicionada à
   soma zero. Proposta na escala natural, refletida em zero. A covariância da
   proposta é aprendida no aquecimento (juntando as cadeias) e congelada depois.
2. h | θ, y: f é estático, então o filtro no último ponto é a posteriori
   suavizada; amostra direta.
3. μ_{1:G} | h, θ, y: filtro de Kalman D-dimensional e amostragem retroativa
   (FFBS: Carter & Kohn, 1994; Frühwirth-Schnatter, 1994).

Por que não Gibbs simples: na primeira versão (Gibbs centrado, com σ_rw, τ e
σ_h amostrados condicionalmente ao caminho e aos efeitos), o ESS de σ_rw ficou
em 34–100 em 4 × 1.000 iterações no 2º turno presidencial; τ e σ_h se
compensavam (com poucas pesquisas por instituto, "ruído da pesquisa" e "viés do
instituto" explicam o mesmo desvio). Com μ e h integrados e proposta refletida,
o ESS subiu para 260–470 por 1.000 sorteios por cadeia.

Produção: 4 cadeias × (1.000 de aquecimento + 3.000 guardados), inícios
dispersos. Backtest: 4 × (500 + 1.000).

### 4.3 Diagnósticos e portão de convergência

R-hat por postos com divisão e dobra, e ESS *bulk* (Vehtari, Gelman, Simpson,
Carpenter & Bürkner, 2021), sobre σ_rw, τ, σ_h e a fração atual de cada
categoria. **Publicação exige R-hat ≤ 1,01 e ESS ≥ 400 em todas.** Um ajuste
que não passa não é publicado (status `nao_convergiu`) e o snapshot anterior
continua no ar. Valor não finito no amostrador é erro (`SamplerError`), não é
substituído.

## 5. Modelo B — simulação Monte Carlo (`simulate.py`)

Para cada sorteio n = 1…N (N = 100.000 em produção):

```
m       ~ Uniforme{sorteios da posteriori do Modelo A}
δ_drift ~ N(0, σ_rw[m]² · H · I_D)                  H = dias até a eleição
δ_sys   = s · L z / √w,   z ~ N(0, I_D),  w ~ Gamma(ν/2, taxa ν/2)
μ_E     = μ_ref[m] + δ_drift + δ_sys
p_E     = softmax([μ_E, 0])
```

Componentes de incerteza, e onde cada um está:

| Componente | Onde |
|---|---|
| 1. amostral | posteriori de μ_ref (S_i) |
| 2. efeitos casa | posteriori de μ_ref (h integrado) |
| 3. erro sistemático compartilhado | δ_sys — um por simulação, comum a todas as pesquisas |
| 4. mudança de preferência até a eleição | δ_drift, com a volatilidade estimada (σ_rw do mesmo sorteio m) |
| 5. comparecimento | **não modelado à parte**: não há dado de comparecimento por segmento no banco; seu efeito sobre os votos válidos chega ao resultado e é medido dentro do erro sistemático |
| 6. parâmetros | os sorteios de m carregam σ_rw, τ, σ_h |

Caudas pesadas: ν finito dá δ_sys t de Student multivariado. ν e a forma L
vêm da calibração, escolhidos fora da amostra (§6). Com os dados de 2026 a
escolha foi ν = 10 — caudas moderadamente pesadas, preferidas à normal (ν = ∞)
por mais de um erro-padrão. Uma versão anterior escolhia ν = 3, empurrada por
um erro fantasma de identificação de candidato (FORECASTING_VALIDATION §6.3).

A estimativa atual (sobre o presente) é só μ_ref; a projeção (sobre o dia da
eleição) soma δ_drift e δ_sys. As duas são publicadas separadamente, e a
decomposição da variância (posteriori / deriva / sistemático) acompanha a projeção.

Eventos: probabilidade de cada candidato terminar em 1º (e entre os dois
primeiros; no 1º turno, de alguém passar de 50%). São **calculadas** sempre,
validadas (somam 1, em [0, 1]) e **publicadas só se o portão de probabilidade
passa** (§8).

## 6. Modelo C — calibração do erro histórico (`calibration.py`)

### 6.1 O dado

Para cada disputa c com resultado oficial e cada horizonte h, ajusta-se o
Modelo A com o banco da data T = E − h (§7) e mede-se:

```
e_ch = ALR(resultado) − E[μ_T]                        (erro na escala ALR)
A_ch = Cov[μ_T] + E[σ_rw²] · h · I                    (o que o modelo já esperava)
```

### 6.2 O modelo do erro sistemático

```
e_ch | w ~ N(0, A_ch + (s_ch² / w) M_ch),   w ~ Gamma(ν/2, taxa ν/2)
log s_ch = α_cat(c) + β · log(1 + h/7) + γᵀ x_ch
α_cat ~ N(α_0, 0,75²)    α_0 ~ N(log 0,05; 1,5²)    β ~ N(0, 1)    γ ~ N(0; 0,5²)
```

* **Forma M**. Duas candidatas: isotrópica (M = I) e **multinomial**
  (M = S(p̄, 1), §3, nas frações **previstas** p̄ — nunca nas do resultado). Na
  multinomial o erro comum se comporta como amostragem extra de tamanho
  efetivo 1/s², e na fração de um candidato vale ≈ s·√(p(1−p)): um candidato
  de 5% erra menos pontos que um de 45%. A isotrópica, primeira versão,
  inflava o erro de todos para acomodar as razões log dos candidatos pequenos,
  e o ruído simétrico grande puxava as medianas para frações iguais — os dados
  rejeitaram essa forma com folga (FORECASTING_VALIDATION §4).
* **Tipos de disputa**: presidente, governador e Senado, por turno, cada um com
  seu α, **sem supor a mesma distribuição de erro**. Agrupamento parcial: um
  tipo com poucos dados (o presidencial tem uma disputa) é puxado para α_0. Um
  tipo sem nenhum dado (todo 2º turno, hoje) fica em α_0 — o erro é
  **emprestado**, e isso é marcado no snapshot (`error_borrowed`) e torna a
  projeção *experimental*.
* **Horizonte**: β mede o crescimento do erro sistemático com a distância até a
  eleição, além da deriva já modelada.
* **Covariáveis** x (padronizadas): log(1 + nº de institutos com campo nos
  últimos 30 dias) e a dispersão das pesquisas nesse período. "Efeitos casa
  históricos" e "qualidade dos dados" entram indiretamente: o primeiro já está
  descontado no Modelo A (o erro calibrado é o da casa média), o segundo pela
  dispersão e pelo n imputado.
* **Não transferência automática entre turnos**: nenhum α de 1º turno é usado
  como α de 2º turno. O 2º turno recebe α_0, a média agrupada, marcada como
  emprestada, e o portão de probabilidade a retém (§8).

### 6.3 Estimação e seleção

Máximo a posteriori por Nelder–Mead determinístico (implementado em numpy). A
densidade t multivariada com componente gaussiano é avaliada por quadratura de
Monte Carlo com 64 nós estratificados e fixos em w (erro de log-densidade
< 0,01, verificado em teste contra 4.096 nós). O Jacobiano do branqueamento por
L (M = L Lᵀ) entra na densidade, para que as formas sejam comparáveis.

**Seleção**: forma ∈ {isotrópica, multinomial} × variante ∈ {sem erro
sistemático; só α; α + horizonte; α + horizonte + covariáveis} × ν ∈ {3, 5, 10,
∞} pela **densidade preditiva fora da amostra**, deixando de fora um estado
inteiro por vez (governador, Senado e presidente da mesma UF saem juntos; a
disputa nacional é a sua própria dobra), com a **regra de um erro-padrão**:
entre as combinações a menos de 1 EP (pareado, por registro) da melhor, fica a
mais simples (sem erro < só α < α + horizonte < + covariáveis); densidade não
finita nunca conta como empate. O padrão de produção é o resultado dessa
regra — evidência, não preferência — e fica fixado na configuração pelo
`calibration_id`, que é endereçado pelo conteúdo (o arquivo de calibração é
imutável como os snapshots).

## 7. Validação histórica walk-forward (`backtest.py`, `evaluate.py`)

### 7.1 O que o banco sabia em cada data

O cron comita `data/polls.json` a cada rodada, então o **histórico do git é a
série de vintages**. Para uma previsão "feita no fim do dia T" (23h59 em
Brasília = T+1 03h00 UTC), o banco é o do último commit anterior. Isso elimina
duas formas de vazamento:

1. pesquisas futuras (o commit não as tem);
2. **revisões posteriores**: reparos curados, datas corrigidas, nomes
   reconciliados, pesquisas que chegaram atrasadas. Um filtro por data sobre o
   banco atual não pega isto; a validação mede o tamanho desse viés (§5 de
   FORECASTING_VALIDATION).

Antes do primeiro vintage (12/08/2026) a data é **reconstruída** sobre o banco
atual com a regra de disponibilidade (divulgação; sem ela, fim de campo + 2
dias), e o registro diz qual modo foi usado. A identidade de candidato usa a
tabela atual de apelidos — metadado de identidade, não informação de pesquisa.

Salvaguardas:

* o exportador roda **sem** o arquivo de resultados para o treino
  (`--results none`); o ajuste **recusa** uma exportação de treino que contenha
  resultados (teste `test_training_export_with_results_is_refused`);
* candidatos acompanhados escolhidos só pelas pesquisas disponíveis em T;
* a calibração que pontua uma disputa é ajustada **sem o estado dela**.

### 7.2 Horizontes, métodos e métricas

Horizontes: 90, 60, 30, 14, 7, 3 e 1 dia antes do 1º turno de 04/10/2026.
Disputas: presidente (nacional), 27 governadores e 27 Senados com resultado do
TSE em `data/resultados-oficiais.json`.

Métodos, todos com o **mesmo** mecanismo de calibração do erro (comparação justa):

| Método | Descrição |
|---|---|
| `modelo` | A (com efeitos casa) + B + C |
| `modelo_sem_casa` | A sem efeitos casa + B + C (ablação) |
| `modelo_sem_sistematico` | A + B, sem erro sistemático |
| `media_site` | a média publicada pelo site em T, com erro calibrado |
| `ultima_pesquisa` | a pesquisa elegível mais recente em T, com erro calibrado |

Métricas (`scoring.py`): erro absoluto da mediana (p.p.); CRPS (p.p.,
`E|X−y| − ½E|X−X'|`); cobertura dos intervalos de 50/80/95%; PIT; Brier
multiclasse e log-escore de quem termina em 1º; Brier de "entre os dois
primeiros" e de "decide no 1º turno"; diagramas de confiabilidade. "Acertou o
líder" é reportado **à parte** e explicitamente não é tratado como calibração.

## 8. Portões de publicação

| Produto | Exige | Se falha |
|---|---|---|
| Estimativa atual | convergência (§4.3); ≥ 5 pesquisas; ≥ 2 institutos; última pesquisa com campo há ≤ 21 dias | status `insuficiente`/`nao_convergiu`; nada publicado |
| Projeção | estimativa atual publicada; calibração carregada | `retida`; com erro **emprestado** → `experimental` |
| Probabilidade | categoria da disputa com ≥ 2 eleições **e** ≥ 20 disputas com resultado; cobertura de 80% no backtest a ±10 p.p. do nominal | `retida`, com os motivos no snapshot |

Com o banco atual nenhuma categoria cumpre o portão de probabilidade (só há
2026), então **o site não publica probabilidade de vitória**. A interface diz
isso e por quê.

Validade numérica antes de gravar: frações finitas em [0, 1] que somam 1 (tol.
1e-9); probabilidades em [0, 1] que somam 1; quantis monótonos; médias que
somam 100 (tol. 0,05).

## 9. Atualização automática e armazenamento

### 9.1 Fluxo (`publish.py`, passo no `update-polls.yml`)

Depois de todos os guardas do banco passarem:

1. trava exclusiva (`data/forecast/.lock`; o workflow já tem `concurrency`);
2. exporta o banco atual (aqui "disponível" = está no banco, sem defasagem);
3. para cada confronto: seleciona as pesquisas, calcula o hash do que o modelo
   consome; **mudança material** = hash diferente do último snapshot
   (pesquisa nova, correção, outra data, outra configuração, outro código ou
   outra calibração); sem mudança, nada é escrito;
4. ajusta, confere convergência e validade, simula, aplica os portões;
5. grava o snapshot num arquivo **novo** — `write_immutable` recusa
   sobrescrever um caminho existente com conteúdo diferente;
6. só então reescreve `index.json` (troca atômica por `os.replace`). Uma falha
   numa disputa deixa o índice dela no último snapshot válido e é registrada em
   `runs.ndjson`;
7. `validate` reconfere tudo (esquema, hash, somas, quantis, manifesto); se
   falha, o workflow **reverte** `data/forecast` para o último estado comitado.

A previsão nunca reprova a rodada de coleta nem segura o commit das pesquisas.

### 9.2 Estrutura ("banco" da previsão)

O banco do site é o store NDJSON versionado no git; a previsão segue o mesmo
princípio, sem tocar nenhum arquivo existente:

```
data/forecast/
  manifest.json                         versões de esquema + migrações aplicadas
  index.json                            ponteiro: snapshots por disputa (mutável)
  runs.ndjson                           execuções: publicadas, falhas, não convergências
  snapshots/<race_id>/<data>_<hash>.json  previsões publicadas (imutáveis)
  calibration/<calibration_id>.json     resultados de calibração
  backtests/<backtest_id>.json          execuções de backtest (com registros por disputa)
forecast/config/model-v1.json           configuração versionada (model_version, config_id, semente)
forecast/migrations/m0001_*.py          migração idempotente da estrutura
```

Cada snapshot registra: versão do modelo, `config_id` e SHA-256 da
configuração, SHA-256 do código, `calibration_id`, versão do numpy, semente,
hash do conjunto de entrada (`dataset_sha256`) e do `polls.json` de origem,
cada pesquisa incluída (com n efetivo e n imputado), as exclusões, data de
referência, data da última pesquisa, diagnósticos, estimativa atual (resumo e
série), projeção (resumo, histograma, decomposição), efeitos casa,
hiperparâmetros, status e motivos, limitações, e o `output_sha256` do conteúdo
(sem o bloco `run`, que guarda o horário de execução). O site (`src/lib/forecast.ts`)
**reconfere esse hash** antes de exibir qualquer número; a forma canônica usa a
formatação numérica do JavaScript nos dois lados (`js_number`), com teste de
paridade.

## 10. Escolha de ferramenta

Avaliados PyMC, NumPyro e Stan (nenhum é dependência existente do repositório):

* o modelo é **linear-gaussiano condicional** a três hiperparâmetros: μ e h se
  integram exatamente por Kalman, e o problema de amostragem é 3-dimensional.
  NUTS sobre todos os estados (o que PyMC/Stan/NumPyro fariam por padrão)
  amostraria centenas de dimensões que têm solução fechada;
* o cron roda em `ubuntu-latest` 4×/dia: Stan exige compilar um modelo C++ a
  cada ambiente novo; PyMC e NumPyro trazem PyTensor/JAX (centenas de MB) e
  versões que mudam a numérica entre releases — ruim para reprodutibilidade
  bit a bit;
* a única dependência é **numpy fixado** (`forecast/requirements.txt`). Os
  diagnósticos seguem a mesma definição do ArviZ/Stan (Vehtari et al., 2021).

O custo: o amostrador é código próprio. Mitigação: testes estatísticos de
recuperação (cobertura de 80% medida em 82,5% em 40 réplicas sintéticas; sinal
do efeito casa recuperado em todas), testes de não convergência e de
reprodutibilidade.

## 11. Reprodutibilidade

* Semente derivada de (semente da configuração, disputa, data, hash da
  entrada); cadeias e simulação usam `numpy.random.Generator(PCG64)`.
* Mesma entrada + mesma semente + mesma versão do numpy na mesma plataforma ⇒
  **bit a bit** igual (teste `test_reproducible_with_seed`).
* Entre plataformas, operações de álgebra linear podem diferir no último bit e
  o MCMC amplifica isso: a reprodução vira tolerância de Monte Carlo (0,3 p.p.
  nos quantis). `python3 forecast/run.py reproduce <snapshot>` refaz um
  snapshot no commit que o gerou e diz qual dos dois casos ocorreu.
* Snapshots publicados não mudam quando chegam pesquisas novas: cada rodada com
  mudança material cria um arquivo novo; o histórico da disputa é a lista deles.

## 12. API

Rotas estáticas (geradas no build, como os demais feeds; nenhuma requisição
recalcula modelo; não há rota de escrita ou administração):

| Rota | Conteúdo |
|---|---|
| `/api/forecast/races.json` | disputas, status e links |
| `/api/forecast/<race_id>/latest.json` | snapshot mais recente (e o último publicado, se o mais recente não publicou) |
| `/api/forecast/<race_id>/history.json` | série de snapshots imutáveis |
| `/api/forecast/<race_id>/distribution.json` | estimativa atual, projeção (histogramas), efeitos casa, probabilidades se publicadas |
| `/api/forecast/<race_id>/methodology.json` | modelo, diagnósticos, calibração, pesquisas incluídas e excluídas |
| `/api/forecast/model-performance.json` | backtest: métricas por método, horizonte e tipo |
| `/api/forecast/health.json` | frescor, validade dos snapshots, falhas recentes |

Toda resposta traz `disclaimer` (fato × modelo), `api_version`, licença e o
link da metodologia; os snapshots trazem `status` com os motivos de qualquer
retenção. Esquema: conferido em TypeScript (`validateSnapshot`) com as mesmas
regras do Python (`validate_snapshot`).

## 13. Limitações

1. **Uma eleição de calibração.** Só o 1º turno de 2026 tem resultado no banco.
   O erro comum daquela eleição está em todas as disputas; a validação por
   estado não o remove. A calibração descreve 2026 e tende a ser otimista
   para outra eleição.
2. **Sem 2010–2022.** O repositório não tem pesquisas dessas eleições, e esta
   sessão de desenvolvimento não tinha acesso de rede à Wikipédia nem ao TSE
   para coletá-las. Nada foi inventado: quando forem incorporadas ao store (com
   o resultado oficial do TSE em `resultados-oficiais.json`), entram no
   backtest e na calibração sem mudar o código, e o portão de probabilidade
   passa a poder abrir.
3. **2º turno sem validação própria.** O erro sistemático do 2º turno é
   emprestado (α_0); a projeção é experimental e nenhuma probabilidade é
   publicada. Depois de 25/10 o 2º turno de 2026 entra na validação.
4. **Comparecimento** não é modelado à parte (§5).
5. **Modo de coleta** não está no banco (§4.1).
6. **Saltos**: o passeio aleatório supõe mudança gradual; um choque (debate,
   fato novo, o próprio 1º turno) não é antecipado.
7. **Correlação entre disputas** (por exemplo, um erro nacional comum aos
   governadores) não é simulada conjuntamente: cada disputa é simulada à parte.
8. **Subconfiança residual** no 1º turno: os intervalos de 80% e 95% cobriram
   mais que o nominal (FORECASTING_VALIDATION §3). Não foi "corrigido" à mão.

## 14. Como rodar

```bash
pip install -r forecast/requirements.txt
python3 forecast/run.py migrate                         # estrutura (idempotente)
python3 forecast/run.py update --ref-date 2026-10-18    # rodada de produção
python3 forecast/run.py validate                        # conferência
python3 forecast/run.py backtest-fit --workers 4        # backtest: ajustes (≈ 45 min de CPU)
python3 forecast/run.py backtest-evaluate               # calibração, simulação, métricas
python3 forecast/run.py reproduce data/forecast/snapshots/<race>/<arquivo>.json
python3 -m unittest discover -s forecast/tests -t forecast   # testes Python
node --no-warnings --test scripts/forecast/forecast.test.mjs # testes Node
```

## Referências

* Carter, C. K. & Kohn, R. (1994). On Gibbs sampling for state space models. *Biometrika* 81(3).
* Frühwirth-Schnatter, S. (1994). Data augmentation and dynamic linear models. *J. Time Series Analysis* 15(2).
* Haario, H., Saksman, E. & Tamminen, J. (2001). An adaptive Metropolis algorithm. *Bernoulli* 7(2).
* Jackman, S. (2005). Pooling the polls over an election campaign. *Australian J. Political Science* 40(4).
* Linzer, D. (2013). Dynamic Bayesian forecasting of presidential elections in the states. *JASA* 108(501).
* Gneiting, T. & Raftery, A. (2007). Strictly proper scoring rules, prediction, and estimation. *JASA* 102(477).
* Vehtari, A., Gelman, A., Simpson, D., Carpenter, B. & Bürkner, P.-C. (2021). Rank-normalization, folding, and localization: an improved R-hat. *Bayesian Analysis* 16(2).
* Yu, Y. & Meng, X.-L. (2011). To center or not to center: that is not the question. *JCGS* 20(3).
