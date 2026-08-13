import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site is fully static: every page is generated at build time from data/polls.json.
  // A new build (triggered by the daily scraper commit) is the update mechanism.
  output: undefined,
  reactStrictMode: true,
};

export default nextConfig;
