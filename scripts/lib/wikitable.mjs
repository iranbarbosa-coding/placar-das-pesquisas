// Wikitext table parser tuned for Wikipedia "Pesquisas de opinião" pages.
// Extracts every {| ... |} table into {sectionPath, headers, rows} where each
// cell is plain text (templates/links/refs stripped) and colspans expanded.

/** Strip wiki markup from a cell down to display text. */
export function cleanCell(raw) {
  let s = raw;
  s = s.replace(/<ref[^>]*\/>/gi, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  // {{Percentagem|12,3}} / {{formatnum:1234}} → keep inner useful arg
  s = s.replace(/\{\{(?:[^{}|]*)\|([^{}]*)\}\}/g, (_, args) => {
    const parts = args.split("|").filter((p) => !/=/.test(p));
    return parts[parts.length - 1] ?? "";
  });
  s = s.replace(/\{\{[^{}]*\}\}/g, "");
  // [[Target|label]] → label ; [[Target]] → Target
  s = s.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2").replace(/\[\[([^\]]*)\]\]/g, "$1");
  s = s.replace(/\[https?:[^\s\]]*\s?([^\]]*)\]/g, "$1");
  s = s.replace(/<br\s*\/?>/gi, " ");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/'''?/g, "");
  s = s.replace(/&nbsp;/g, " ").replace(/&ndash;|&mdash;/g, "–");
  return s.replace(/\s+/g, " ").trim();
}

/** Split a wikitext row line into cells, honoring both `||` and per-line `|`. */
function splitCells(lines, marker) {
  const cells = [];
  for (const line of lines) {
    const body = line.slice(1); // drop leading | or !
    const parts = body.split(marker === "!" ? /!!|\|\|/ : /\|\|/);
    for (const part of parts) cells.push(part);
  }
  return cells;
}

function cellAttrs(rawCell) {
  // "attr1=... attr2=... | content" — attributes precede a single pipe
  const pipe = rawCell.indexOf("|");
  if (pipe > -1 && !rawCell.slice(0, pipe).includes("[[") && /=/.test(rawCell.slice(0, pipe))) {
    const attrs = rawCell.slice(0, pipe);
    const colspan = Number(attrs.match(/colspan\s*=\s*"?(\d+)/i)?.[1] ?? 1);
    const rowspan = Number(attrs.match(/rowspan\s*=\s*"?(\d+)/i)?.[1] ?? 1);
    return { colspan, rowspan, content: rawCell.slice(pipe + 1) };
  }
  return { colspan: 1, rowspan: 1, content: rawCell };
}

/**
 * Parse all tables. Returns [{sectionPath: ["Pesquisas", "1º turno", …],
 * headerRows: string[][], rows: string[][]}] with rowspans/colspans expanded.
 */
export function parseTables(wikitext) {
  const tables = [];
  const lines = wikitext.split("\n");
  let sections = [];
  let cur = null; // {sectionPath, rawRows: [{marker, cells:[{colspan,rowspan,content}]}]}
  let curRow = null;
  let depth = 0;

  const flushRow = () => {
    if (cur && curRow && curRow.cells.length) cur.rawRows.push(curRow);
    curRow = null;
  };

  for (const line of lines) {
    const t = line.trim();
    const h = t.match(/^(={2,6})\s*(.*?)\s*\1$/);
    if (h && depth === 0) {
      const level = h[1].length;
      sections = sections.filter((s) => s.level < level);
      sections.push({ level, title: cleanCell(h[2]) });
      continue;
    }
    if (t.startsWith("{|")) {
      depth++;
      if (depth === 1) {
        cur = { sectionPath: sections.map((s) => s.title), rawRows: [] };
        curRow = null;
      }
      continue;
    }
    if (t.startsWith("|}")) {
      if (depth === 1 && cur) {
        flushRow();
        tables.push(cur);
        cur = null;
      }
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (!cur || depth !== 1) continue;

    if (t.startsWith("|-")) {
      flushRow();
      continue;
    }
    if (t.startsWith("!")) {
      if (!curRow || curRow.marker !== "!") {
        flushRow();
        curRow = { marker: "!", cells: [] };
      }
      for (const raw of splitCells([t], "!")) curRow.cells.push(cellAttrs(raw));
      continue;
    }
    if (t.startsWith("|") && !t.startsWith("|+")) {
      if (!curRow) curRow = { marker: "|", cells: [] };
      for (const raw of splitCells([t], "|")) curRow.cells.push(cellAttrs(raw));
      continue;
    }
    // continuation of a multi-line cell
    if (curRow && curRow.cells.length) {
      curRow.cells[curRow.cells.length - 1].content += " " + t;
    }
  }

  // Expand spans into rectangular grids of clean text.
  return tables.map((tb) => {
    const grid = [];
    const pending = []; // rowspan carriers: {col, remaining, text}
    const headerRows = [];
    const rows = [];
    for (const raw of tb.rawRows) {
      const out = [];
      let col = 0;
      const takePending = () => {
        for (const p of pending) {
          if (p.remaining > 0 && p.col === col) {
            out[col] = p.text;
            p.remaining--;
            col++;
            return true;
          }
        }
        return false;
      };
      for (const cell of raw.cells) {
        while (takePending()) {/* fill carried cells */}
        const text = cleanCell(cell.content);
        for (let c = 0; c < cell.colspan; c++) {
          out[col] = text;
          if (cell.rowspan > 1) pending.push({ col, remaining: cell.rowspan - 1, text });
          col++;
        }
      }
      while (takePending()) {/* trailing carried cells */}
      grid.push({ marker: raw.marker, cells: out });
    }
    for (const g of grid) {
      if (g.marker === "!" && rows.length === 0) headerRows.push(g.cells);
      else rows.push(g.cells);
    }
    return { sectionPath: tb.sectionPath, headerRows, rows };
  });
}
