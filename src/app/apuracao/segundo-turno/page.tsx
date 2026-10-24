import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import ApuracaoSegundoTurno from "@/components/ApuracaoSegundoTurno";
import { lerApuracao2T, type Leitura2T } from "@/lib/apuracao2t";

export const metadata: Metadata = {
  title: "Apuração ao vivo · Presidente 2º turno",
  description:
    "Apuração em tempo real do 2º turno presidencial de 2026, Lula × Flávio Bolsonaro: percentual e número de votos, votos apurados e a apurar e o mapa do Brasil com quem lidera em cada estado. Dados oficiais do TSE.",
};

// Primeiro desenho servido pela CDN e refeito a cada 30s; depois disso o
// próprio navegador consulta /api/apuracao-2t.json a cada 30s.
export const revalidate = 30;

const SVG = fs.readFileSync(path.join(process.cwd(), "src/components/brasil-mapa.svg"), "utf-8");

export default async function ApuracaoSegundoTurnoPage() {
  let inicial: Leitura2T | null = null;
  try {
    inicial = await lerApuracao2T({ fresco: false });
  } catch {
    // TSE fora do ar no momento do build/revalidação: o cliente tenta de novo.
  }
  return <ApuracaoSegundoTurno inicial={inicial} mapaSvg={SVG} />;
}
