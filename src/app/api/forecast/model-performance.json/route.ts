import { NextResponse } from "next/server";
import { CACHE_HEADERS, performanceBody } from "@/lib/forecast-api";

// Desempenho histórico (backtest walk-forward) do modelo e das bases de comparação. Estático: gerado no build a partir de data/forecast/.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(performanceBody(), { headers: CACHE_HEADERS });
}
