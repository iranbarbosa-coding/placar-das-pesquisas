import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site is fully static: every page is generated at build time from data/polls.json.
  // A new build (triggered by the daily scraper commit) is the update mechanism.
  output: undefined,
  reactStrictMode: true,
  // A apuração do 2º turno vive em /apuracao (decisão do criador, 24/10/2026); o
  // endereço em que ela estreou continua levando até lá. O 1º turno foi para
  // /apuracao/primeiro-turno.
  async redirects() {
    return [{ source: "/apuracao/segundo-turno", destination: "/apuracao", permanent: false }];
  },
};

export default nextConfig;
