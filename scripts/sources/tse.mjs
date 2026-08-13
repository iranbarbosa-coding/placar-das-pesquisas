// TSE PesqEle open-data source (dadosabertos.tse.jus.br, CC-BY).
// Daily-regenerated full snapshot of every REGISTERED 2026 poll. Metadata
// only (no percentages) — used to enrich result polls with registration
// numbers and to know the universe of registered-but-unpublished polls.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fetchRetry } from "../lib/util.mjs";

const ZIP_URL =
  "https://cdn.tse.jus.br/estatistica/sead/odsele/pesquisa_eleitoral/pesquisa_eleitoral_2026.zip";

/** Minimal CSV parser for TSE files: `;`-separated, quoted fields may contain newlines. */
function parseCsv(text, sep = ";") {
  const rows = [];
  let field = "";
  let row = [];
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export async function fetchTseRegistry() {
  const res = await fetchRetry(ZIP_URL, { timeoutMs: 60000 });
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tse-"));
  const zipPath = path.join(tmp, "tse.zip");
  fs.writeFileSync(zipPath, buf);
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", tmp]);

  // The zip holds one CSV per UF (…_AC.csv … _BRASIL.csv) — parse them all.
  const csvFiles = fs.readdirSync(tmp).filter((f) => f.toLowerCase().endsWith(".csv"));
  if (!csvFiles.length) throw new Error("TSE zip contained no CSV");
  let header = null;
  const rows = [];
  for (const f of csvFiles) {
    const text = new TextDecoder("latin1").decode(fs.readFileSync(path.join(tmp, f)));
    const fileRows = parseCsv(text);
    if (!fileRows.length) continue;
    if (!header) header = fileRows[0].map((h) => h.replace(/^"|"$/g, "").trim());
    rows.push(...fileRows.slice(1));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (!header) throw new Error("TSE CSVs were all empty");
  const idx = (name) => header.indexOf(name);
  const iProtocolo = idx("NR_PROTOCOLO_REGISTRO");
  const iEmpresa = idx("NM_EMPRESA");
  const iUF = idx("SG_UF");
  const iCargo = idx("DS_CARGO");
  const iRegistro = idx("DT_REGISTRO");
  const iDivulgacao = idx("DT_DIVULGACAO");
  const iAmostra = idx("QT_ENTREVISTADO");
  if (iProtocolo < 0 || iEmpresa < 0) {
    throw new Error(`TSE CSV schema changed — header: ${header.slice(0, 12).join(", ")}…`);
  }

  const records = rows
    .filter((r) => r.length >= header.length - 2 && r[iProtocolo])
    .map((r) => ({
      protocolo: r[iProtocolo]?.trim(),
      pollster: r[iEmpresa]?.trim(),
      uf: r[iUF]?.trim(),
      cargo: r[iCargo]?.trim(),
      dt_registro: r[iRegistro]?.trim(),
      dt_divulgacao: r[iDivulgacao]?.trim(),
      sample: Number(r[iAmostra]) || null,
    }));

  return { url: ZIP_URL, count: records.length, records };
}
