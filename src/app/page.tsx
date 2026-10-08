import Link from "next/link";
import HeroBasisSwitch from "@/components/HeroBasisSwitch";
import HeroSegundoTurno from "@/components/HeroSegundoTurno";
import ConfrontosGovernador from "@/components/ConfrontosGovernador";
import MapaSegundoTurno from "@/components/MapaSegundoTurno";
import RunoffBars from "@/components/RunoffBars";
import LatestPollsTable from "@/components/LatestPollsTable";
import HomeSidebar from "@/components/HomeSidebar";
import FreshnessBadge from "@/components/FreshnessBadge";
import {
  heroRace,
  runoffCards,
  latestForTable,
  stateHighlights,
  recentMovers,
  stateMapData,
  stateMapSegundoTurno,
  newestPoll,
  registeredPresidentKeys,
} from "@/lib/home";
import { candKey } from "@/lib/average";
import { loadDataset } from "@/lib/data";
import { upcomingPolls } from "@/lib/calendar";
import { houseEffects } from "@/lib/houseEffects";
import HouseEffects from "@/components/HouseEffects";
import { rankingAcerto } from "@/lib/acerto";
import RankingInstitutos from "@/components/RankingInstitutos";
import { diasAteSegundoTurno, mediasSegundoTurno, SEGUNDO_TURNO } from "@/lib/eleicao";
import { displayName } from "@/lib/names";
import { fmtPct, fmtDate } from "@/lib/format";

/**
 * The front page — a two-column electoral dashboard (2026-08-17 redesign).
 *
 * The shape mirrors the creator's mockup: a wide LEFT column of stacked cards
 * beside a NARROW RIGHT column — the state map, the "Destaques" ranking,
 * "O que mudou" and the glossary. Each section is its own bordered white card on
 * the grey page, the depth the design brief asked for.
 *
 * TWO MODES, decided by `data/resultados-oficiais.json` (08/10/2026):
 *  · 2º TURNO (the result of the 1st round is loaded): the page leads with the
 *    presidential runoff — official 1st-round result plus the average of the
 *    runoff polls fielded AFTER 04/10 — then the governor runoffs, then the
 *    1st-round verdict (who got closest) and house effects. The 1st round is
 *    archived on /presidente and /estados/[uf], not here.
 *  · 1º TURNO (no result loaded): the pre-election dashboard, unchanged — the
 *    presidential card with its basis toggle and the hypothetical runoff bars.
 * The page is on votos válidos throughout, with ONE exception the owner asked
 * for: the first-round presidential card carries its own basis toggle.
 */
export default function Home() {
  const segundoTurno = mediasSegundoTurno();
  const presidencial = segundoTurno.find((d) => d.confronto.race === "presidente") ?? null;
  const modo2T = segundoTurno.length > 0;

  const latest = latestForTable(40);
  const highlights = stateHighlights();
  const movers = recentMovers(4);
  const map = stateMapData();
  const newPoll = newestPoll();
  const upcoming = upcomingPolls(6);
  const house = houseEffects("presidente", null, 1);
  const acerto = rankingAcerto();
  const generatedAt = loadDataset().generated_at;

  // 1º-turno mode only.
  const hero = modo2T ? null : heroRace();
  const cards = modo2T ? [] : runoffCards(4);
  const registeredKeys = registeredPresidentKeys();
  const heroReg = new Set(registeredKeys);
  const heroNamed = (hero?.average?.candidates ?? []).filter((c) => heroReg.has(candKey(c.candidate)));
  const [heroLead, heroRunner] = heroNamed;

  // 2º-turno lede: the official 1st-round result and, when there is one, the
  // runoff average — both from the SAME `mediasSegundoTurno()` the hero renders.
  const p1 = presidencial?.confronto.nomes[0];
  const p2 = presidencial?.confronto.nomes[1];
  const m2 = presidencial?.media ?? null;
  // Contado da data do BUILD, não do dado: com o cron pausado, `generated_at` para.
  const dias = diasAteSegundoTurno();

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_336px]">
      {/* LEFT: the main stack. `min-w-0` keeps the wide table from forcing the
          track past the viewport on phones (a documented overflow fix). */}
      <div className="flex min-w-0 flex-col gap-6">
        {modo2T && presidencial && p1 && p2 ? (
          <>
            <p className="max-w-[75ch] text-sm" style={{ color: "var(--text-secondary)" }}>
              O 2º turno da eleição presidencial de 2026 é em {fmtDate(SEGUNDO_TURNO)}
              {dias > 0 ? `, daqui a ${dias} dia${dias === 1 ? "" : "s"}` : ""}, entre{" "}
              <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(p1.nome)}</strong> ({fmtPct(p1.pct)}% dos
              válidos no 1º turno) e <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(p2.nome)}</strong> (
              {fmtPct(p2.pct)}%).{" "}
              {m2 && m2.candidates[0]
                ? `Na média do Placar das Pesquisas para o 2º turno, ${displayName(m2.candidates[0].candidate)} tem ${fmtPct(m2.candidates[0].avg)}% e ${displayName(m2.candidates[1]?.candidate ?? "")} ${fmtPct(m2.candidates[1]?.avg)}%, em votos válidos, com a última pesquisa em ${fmtDate(m2.lastPollDate)}.`
                : "Este confronto ainda não foi pesquisado."}
            </p>
            {m2 ? <FreshnessBadge race="presidente" uf={null} lastPollDate={m2.lastPollDate} generatedAt={generatedAt} className="-mt-3" /> : null}
            <HeroSegundoTurno data={presidencial} diasRestantes={dias} />
          </>
        ) : (
          <>
            {heroLead && heroRunner && hero?.average && (
              <p className="max-w-[75ch] text-sm" style={{ color: "var(--text-secondary)" }}>
                Na média do Placar das Pesquisas para o 1º turno da eleição presidencial de 2026,{" "}
                <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(heroLead.candidate)}</strong>{" "}
                lidera com {fmtPct(heroLead.avg)}%, à frente de {displayName(heroRunner.candidate)} com {fmtPct(heroRunner.avg)}% —
                média em votos válidos, atualizada em {fmtDate(hero.average.lastPollDate)}.
              </p>
            )}
            {hero?.average && (
              <FreshnessBadge race="presidente" uf={null} lastPollDate={hero.average.lastPollDate} generatedAt={generatedAt} className="-mt-3" />
            )}
            <section className="card p-4 sm:p-6" aria-label="Corrida presidencial">
              <HeroBasisSwitch
                average={hero?.average ?? null}
                headline={hero?.headline ?? null}
                averageBruto={hero?.averageBruto ?? null}
                headlineBruto={hero?.headlineBruto ?? null}
                scenario={hero?.scenario}
                registeredKeys={registeredKeys}
              />
            </section>
            {cards.length ? (
              <section className="card p-4 sm:p-6">
                <RunoffBars cards={cards} title="Confrontos de 2º turno" />
              </section>
            ) : null}
          </>
        )}

        {acerto ? <RankingInstitutos data={acerto} maxRows={10} /> : null}

        <HouseEffects data={house} compact maxRows={10} title="Viés dos Institutos (Efeito Casa)" href="/institutos" />

        {modo2T ? (
          <p className="-mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            O 1º turno está arquivado: as médias finais de cada disputa, ao lado do resultado oficial, ficam em{" "}
            <Link href="/presidente" className="underline">Presidente</Link> e nas páginas de cada{" "}
            <Link href="/estados" className="underline">estado</Link>. A apuração do TSE está em{" "}
            <Link href="/apuracao" className="underline">Apuração</Link>.
          </p>
        ) : null}

        <section className="card p-4 sm:p-6">
          <LatestPollsTable rows={latest} />
        </section>
      </div>

      {/* RIGHT: in 2º-turno mode the column IS the state runoffs (one compact
          chart per state, stacked) — the owner's call on 08/10: the map,
          highlights, movers and calendar come out. Otherwise the dashboard
          sidebar. Stacks under the content on phones. */}
      {modo2T ? (
        <aside className="flex min-w-0 flex-col gap-5" aria-label="Governos em 2º turno">
          <MapaSegundoTurno map={stateMapSegundoTurno()} />
          <ConfrontosGovernador data={segundoTurno} layout="coluna" />
        </aside>
      ) : (
        <HomeSidebar highlights={highlights} movers={movers} map={map} newPoll={newPoll} upcoming={upcoming} />
      )}
    </div>
  );
}
