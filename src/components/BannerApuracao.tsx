"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Faixa da home chamando para a apuração do 2º turno (/apuracao), pedida pelo
 * criador em 24/10/2026. A fase vem do relógio do LEITOR (a home é estática e só
 * é refeita a cada rodada do cron): antes das 17h de 25/10 (Brasília) anuncia o
 * horário; durante a noite, "ao vivo"; depois, "resultado". O primeiro desenho é
 * neutro para o HTML do servidor não divergir do cliente.
 */
const ABRE = Date.parse("2026-10-25T20:00:00Z"); // 17h em Brasília (UTC−3)
const ENCERRA_AO_VIVO = Date.parse("2026-10-26T06:00:00Z"); // 3h da madrugada de 26/10

type Fase = "neutra" | "antes" | "aoVivo" | "depois";

export default function BannerApuracao() {
  const [fase, setFase] = useState<Fase>("neutra");
  useEffect(() => {
    const atualiza = () => {
      const t = Date.now();
      setFase(t < ABRE ? "antes" : t < ENCERRA_AO_VIVO ? "aoVivo" : "depois");
    };
    atualiza();
    const id = setInterval(atualiza, 60_000);
    return () => clearInterval(id);
  }, []);

  const titulo =
    fase === "aoVivo"
      ? "Apuração do 2º turno ao vivo agora"
      : fase === "depois"
        ? "Resultado do 2º turno, com dados do TSE"
        : "Apuração do 2º turno ao vivo";
  const sub =
    fase === "antes"
      ? "Domingo, 25/10, a partir das 17h (Brasília). Presidente e governadores, direto do TSE, com a chance de vitória em tempo real."
      : fase === "aoVivo"
        ? "Presidente e governadores, direto do TSE, a cada 30 segundos, com a chance de vitória em tempo real."
        : fase === "depois"
          ? "Presidente e os seis governos em 2º turno, estado por estado."
          : "Presidente e governadores, direto do TSE, com a chance de vitória em tempo real.";

  return (
    <Link
      href="/apuracao"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 sm:px-5"
      style={{ background: "var(--faixa-bg)", color: "var(--faixa-ink)" }}
      data-testid="banner-apuracao"
    >
      <span className="flex min-w-0 items-start gap-3">
        <span className="relative mt-1.5 inline-flex h-2.5 w-2.5 shrink-0" aria-hidden>
          {fase === "aoVivo" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70" style={{ background: "var(--faixa-ink)" }} />}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: "var(--faixa-ink)" }} />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-extrabold uppercase tracking-wide">{titulo}</span>
          <span className="block text-sm opacity-90">{sub}</span>
        </span>
      </span>
      <span className="shrink-0 rounded-md px-3 py-1.5 text-sm font-bold" style={{ background: "var(--faixa-ink)", color: "var(--faixa-bg)" }}>
        {fase === "depois" ? "Ver resultado →" : "Acompanhar →"}
      </span>
    </Link>
  );
}
