import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_YEAR, SITE_TAGLINE } from "@/lib/brand";

/*
 * Social-share card for WhatsApp / X / Slack / Facebook (and, absent a
 * twitter-image, Twitter too — Next falls back to this file). A CLEAN BRANDED
 * TEMPLATE on purpose: it is deliberately NOT coupled to live poll data, so the
 * daily scraper build never has to re-render a data-dependent card and a stale
 * cache can never leak wrong numbers into a preview.
 *
 * Palette is the official brand set from globals.css: navy ink #0B1020 ground,
 * off-white #F8FAFC wordmark, brand blue #2563EB accent (the "Pesquisas" half of
 * the lockup, mirroring the masthead), slate #94A3B8 for the muted "das".
 *
 * Every <div> with more than one child sets `display: flex` explicitly — Satori
 * (next/og) requires it and throws otherwise.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — Eleições ${SITE_YEAR}`;

// Brand tokens (mirrors globals.css :root).
const INK = "#0b1020";
const OFFWHITE = "#f8fafc";
const BLUE = "#2563eb";
const SLATE = "#94a3b8";
const RED = "#ef4444";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          // Subtle top accent glow so the flat card gets a little depth.
          backgroundImage: `radial-gradient(1000px 500px at 82% -10%, rgba(37,99,235,0.28), rgba(37,99,235,0) 60%)`,
          padding: "80px 90px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top row: brand tag + year pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 999,
                background: BLUE,
                display: "flex",
              }}
            />
            <div
              style={{
                fontSize: 26,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: SLATE,
                display: "flex",
              }}
            >
              Agregador de pesquisas eleitorais
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 26,
              fontWeight: 700,
              color: OFFWHITE,
              border: `2px solid rgba(148,163,184,0.4)`,
              borderRadius: 999,
              padding: "8px 22px",
            }}
          >
            {`Eleições ${SITE_YEAR}`}
          </div>
        </div>

        {/* Centre: the wordmark lockup */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              flexWrap: "wrap",
              fontSize: 128,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1,
            }}
          >
            <span style={{ color: OFFWHITE }}>Placar</span>
            <span style={{ color: SLATE, fontSize: 64, fontWeight: 700, marginLeft: 24, marginRight: 24 }}>das</span>
            <span style={{ color: BLUE }}>Pesquisas</span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 34,
              fontSize: 44,
              color: OFFWHITE,
              opacity: 0.9,
            }}
          >
            {SITE_TAGLINE}
          </div>
        </div>

        {/* Bottom: cargo strip + accent bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 18,
              fontSize: 28,
              color: SLATE,
            }}
          >
            <span style={{ display: "flex", color: OFFWHITE }}>Presidente</span>
            <span style={{ display: "flex" }}>·</span>
            <span style={{ display: "flex", color: OFFWHITE }}>Governadores</span>
            <span style={{ display: "flex" }}>·</span>
            <span style={{ display: "flex", color: OFFWHITE }}>Senadores</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 64, height: 10, borderRadius: 999, background: RED, display: "flex" }} />
            <div style={{ width: 40, height: 10, borderRadius: 999, background: BLUE, display: "flex" }} />
            <div style={{ width: 24, height: 10, borderRadius: 999, background: SLATE, display: "flex" }} />
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
