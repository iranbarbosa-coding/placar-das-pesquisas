import type { Metadata } from "next";
import Link from "next/link";
import { calibration } from "@/lib/forecast";
import { Trilha } from "@/components/previsao/ForecastBits";

export const metadata: Metadata = {
  title: "Previsão · Como o modelo funciona",
  description:
    "Metodologia da Previsão Estatística do Placar das Pesquisas: modelo de espaço de estados com efeito casa, simulação Monte Carlo e calibração contra as urnas.",
};

function Secao({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card flex min-w-0 scroll-mt-20 flex-col gap-2 p-4 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>{titulo}</h2>
      {children}
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded p-2 text-xs" style={{ background: "var(--surface-2)", color: "var(--text-primary)" }}>
      {children}
    </pre>
  );
}

export default function MetodologiaPrevisao() {
  const cal = calibration();
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Trilha itens={[{ href: "/previsao", label: "Previsão Estatística" }, { label: "Como o modelo funciona" }]} />
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Como o modelo funciona</h1>
        <p className="max-w-[80ch] text-sm" style={{ color: "var(--text-secondary)" }}>
          Versão para leitura. A versão técnica completa, com todas as equações e escolhas, está em{" "}
          <a className="underline" href="https://github.com/iranbarbosa-coding/placar-das-pesquisas/blob/main/FORECASTING_METHODOLOGY.md">FORECASTING_METHODOLOGY.md</a>.
        </p>
      </header>

      <Secao id="separado" titulo="1 · A previsão é separada da média">
        <p>
          A <strong>média das pesquisas</strong> do site não muda: continua sendo a média das 10 pesquisas mais recentes, com no máximo 2 por
          instituto (<Link href="/metodologia" className="underline">metodologia da média</Link>). A previsão é outra coisa, calculada à parte,
          sobre as MESMAS pesquisas do banco — as pesquisas individuais, não a média já pronta.
        </p>
        <p>Diferenças deliberadas em relação à média: usa todas as pesquisas dos últimos 150 dias (não só as 10 últimas), pesa cada uma pelo tamanho da amostra, estima e desconta o viés de cada instituto e conta uma operação de campo uma vez só, mesmo quando ela publica vários cenários.</p>
      </Secao>

      <Secao id="modelo-a" titulo="2 · Estimativa atual: modelo de espaço de estados (Modelo A)">
        <p>
          O apoio verdadeiro de cada candidato é tratado como uma quantidade que ninguém observa diretamente e que muda devagar, dia a dia. Cada
          pesquisa é uma medição ruidosa dele, com três fontes de erro: a amostragem (proporcional ao tamanho da amostra), o viés próprio do
          instituto (“efeito casa”) e um erro extra de cada pesquisa que a margem de erro declarada não cobre.
        </p>
        <Formula>{`apoio(dia) = apoio(dia anterior) + variação aleatória            (passeio aleatório)
pesquisa   = apoio(dia do campo) + efeito do instituto + erro      (observação)`}</Formula>
        <p>
          Tudo é feito na escala de log-razões entre as frações de votos válidos, o que garante que as frações estimadas fiquem entre 0 e 100% e
          SOMEM 100%. O modelo é bayesiano: a volatilidade do apoio, o erro extra e o tamanho típico dos efeitos casa são estimados junto com o
          apoio, e a incerteza sobre eles entra no resultado. O ajuste roda 4 cadeias de Monte Carlo independentes e só é publicado se elas
          concordam (R-hat ≤ 1,01) e têm amostra efetiva suficiente (≥ 400).
        </p>
        <p>
          Efeito casa é medido contra o <em>instituto médio</em>: o modelo não sabe, pelas pesquisas, se todos os institutos erram juntos. Esse erro
          comum é tratado à parte, com o histórico (seção 4).
        </p>
      </Secao>

      <Secao id="modelo-b" titulo="3 · Projeção: simulação Monte Carlo (Modelo B)">
        <p>São simulados 100.000 resultados possíveis para o dia da eleição. Cada simulação soma três coisas:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>um valor possível do apoio atual, sorteado da estimativa do Modelo A (inclui amostragem, efeitos casa e a incerteza dos parâmetros);</li>
          <li>a mudança de opinião possível nos dias que faltam, com a volatilidade estimada da própria disputa;</li>
          <li>um erro sistemático comum a todas as pesquisas, com o tamanho e as caudas que as pesquisas mostraram contra as urnas (seção 4).</li>
        </ol>
        <p>
          O comparecimento não é modelado separadamente: não há no banco dado de comparecimento por grupo, e o efeito dele sobre os votos válidos
          já está dentro do erro sistemático medido contra o resultado. A semente aleatória é fixa e registrada: a mesma entrada produz os mesmos números.
        </p>
      </Secao>

      <Secao id="modelo-c" titulo="4 · Calibração contra as urnas (Modelo C)">
        <p>
          Para cada disputa do 1º turno de 2026 e para 7 datas antes da eleição (90, 60, 30, 14, 7, 3 e 1 dia), o modelo foi refeito só com o que o
          banco do site tinha naquele dia e comparado com o resultado oficial do TSE. O que sobra de erro, além do que o modelo já esperava, é o erro
          sistemático: o modelo C estima o tamanho dele por tipo de disputa (governador, Senado, presidente), com agrupamento parcial (um tipo com
          poucos dados é puxado para a média dos tipos), crescendo com a distância até a eleição, e com caudas pesadas quando os dados pedem.
        </p>
        <p>
          A escolha entre as versões do erro foi feita pela qualidade das previsões fora da amostra (deixando um estado inteiro de fora por vez), não
          por preferência.{cal ? ` Versão em uso: ${cal.calibration_id}.` : ""}
        </p>
      </Secao>

      <Secao id="portoes" titulo="5 · Quando um número NÃO é publicado">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Estimativa atual</strong>: exige ≥ 5 pesquisas de ≥ 2 institutos, uma delas com campo nos últimos 21 dias, e convergência.</li>
          <li><strong>Projeção</strong>: exige calibração carregada. Quando o erro do tipo de disputa é emprestado de outro tipo (hoje: todo 2º turno), ela sai marcada como <em>experimental</em>.</li>
          <li><strong>Probabilidade de vitória</strong>: exige ≥ 2 eleições e ≥ 20 disputas com resultado na mesma categoria e cobertura do intervalo de 80% no backtest a ±10 pontos do nominal para ser considerada <em>calibrada</em>. Hoje nenhuma categoria cumpre: o banco só tem 2026. Por decisão editorial, a chance de vitória do 2º turno é exibida assim mesmo, sempre marcada como <em>experimental</em> e com os motivos ao lado.</li>
          <li>Se uma rodada falha (não converge, dado inválido), nada é publicado e o último snapshot válido continua no ar.</li>
        </ul>
      </Secao>

      <Secao id="dados" titulo="6 · Dados, pesquisas e cenários">
        <ul className="list-disc space-y-1 pl-5">
          <li>Entram as pesquisas do banco que o site já validou, com as mesmas exclusões da média: incompletas na fonte, amostras municipais e, no Senado, perguntas de voto único.</li>
          <li>2º turno: só pesquisas que testaram EXATAMENTE o par que as urnas definiram, identificado por código estável de candidato (não pelo nome).</li>
          <li>Uma operação de campo conta uma vez: cenários da mesma amostra e republicações não são somados como pesquisas independentes.</li>
          <li>Votos válidos, como o TSE apura: brancos, nulos e indecisos saem do denominador.</li>
          <li>Pesquisa sem tamanho de amostra recebe um tamanho conservador (o 1º quartil da disputa), e isso fica registrado.</li>
        </ul>
      </Secao>

      <Secao id="limites" titulo="7 · Limitações conhecidas">
        <ul className="list-disc space-y-1 pl-5">
          <li>Só há uma eleição com resultado no banco (1º turno de 2026). A calibração descreve essa eleição e pode ser otimista para outra.</li>
          <li>Não há pesquisas de 2010–2022 no repositório; quando forem incorporadas com o resultado oficial do TSE, entram na calibração sem mudar o código.</li>
          <li>O modo de coleta (presencial, telefone, internet) não está registrado; diferenças de método só entram como efeito casa.</li>
          <li>O modelo não prevê saltos (um debate, um fato novo): trata a mudança de opinião como gradual.</li>
        </ul>
        <p>
          Resultados da validação: <Link href="/previsao/desempenho" className="underline">Desempenho histórico</Link> e{" "}
          <a className="underline" href="https://github.com/iranbarbosa-coding/placar-das-pesquisas/blob/main/FORECASTING_VALIDATION.md">FORECASTING_VALIDATION.md</a>.
        </p>
      </Secao>
    </div>
  );
}
