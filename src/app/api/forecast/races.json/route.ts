import { NextResponse } from "next/server";
import { CACHE_HEADERS, racesBody } from "@/lib/forecast-api";

// Lista das disputas com previsão, seus estados e links. Estático: gerado no build a partir de data/forecast/.
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(racesBody(), { headers: CACHE_HEADERS });
}
