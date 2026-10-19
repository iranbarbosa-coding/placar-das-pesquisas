import { NextResponse } from "next/server";
import { CACHE_HEADERS, healthBody } from "@/lib/forecast-api";

// Saúde da camada de previsão: frescor, validade dos snapshots e falhas recentes. Estático: gerado no build a partir de data/forecast/.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(healthBody(), { headers: CACHE_HEADERS });
}
