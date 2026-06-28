// Pure LinkedIn-export CSV parsing — no Convex imports, so it's unit-testable
// in plain Node. Used by linkedinImport.ts.

export type ConnRow = {
  name: string;
  headline?: string;
  company?: string;
  linkedinUrl?: string;
};

// LinkedIn prefixes Connections.csv with a few "Notes:" lines before the real
// header, so we locate the header row, then map columns by name (order has
// shifted across export versions).
export function parseConnections(csv: string): ConnRow[] {
  const table = parseCsv(csv);
  const headerIdx = table.findIndex(
    (r) => r[0]?.trim() === "First Name" && r.includes("Last Name"),
  );
  if (headerIdx === -1) return [];

  const header = table[headerIdx].map((h) => h.trim().toLowerCase());
  const iFirst = header.indexOf("first name");
  const iLast = header.indexOf("last name");
  const iUrl = header.indexOf("url");
  const iCompany = header.indexOf("company");
  const iPosition = header.indexOf("position");

  const out: ConnRow[] = [];
  for (const r of table.slice(headerIdx + 1)) {
    if (r.length === 1 && r[0].trim() === "") continue;
    const name = `${r[iFirst] ?? ""} ${r[iLast] ?? ""}`.trim();
    if (!name) continue;
    out.push({
      name,
      headline: clean(r[iPosition]),
      company: clean(r[iCompany]),
      linkedinUrl: clean(r[iUrl]),
    });
  }
  return out;
}

function clean(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

// Minimal RFC-4180 CSV parser: handles quoted fields, escaped quotes (""),
// and commas/newlines inside quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
