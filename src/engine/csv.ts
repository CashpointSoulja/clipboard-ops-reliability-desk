export interface CsvParseResult {
  header: string[];
  rows: { line: number; cells: string[] }[];
  errors: { line: number; message: string }[];
}

/** RFC 4180 style parser: quoted fields, escaped quotes, CRLF. Reports structural errors per line. */
export function parseCsv(text: string): CsvParseResult {
  const errors: CsvParseResult["errors"] = [];
  const records: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let field = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  let fieldStarted = false;
  const src = text.replace(/^\uFEFF/, "");

  const endRecord = () => {
    cells.push(field);
    if (!(cells.length === 1 && cells[0].trim() === "")) records.push({ line: recordLine, cells });
    cells = [];
    field = "";
    fieldStarted = false;
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        if (ch === "\n") line++;
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      if (fieldStarted && field.length > 0) {
        errors.push({ line, message: "Unexpected quote inside an unquoted field. Wrap the whole field in double quotes and escape inner quotes as \"\"." });
      }
      inQuotes = true;
      fieldStarted = true;
    } else if (ch === ",") {
      cells.push(field); field = ""; fieldStarted = false;
    } else if (ch === "\r") {
      // handled by \n
    } else if (ch === "\n") {
      endRecord(); line++; recordLine = line;
    } else {
      field += ch; fieldStarted = true;
    }
  }
  if (inQuotes) {
    errors.push({ line: recordLine, message: "Unclosed double quote: the file ends inside a quoted field. Close the quote on this row." });
  }
  endRecord();

  const [head, ...rows] = records;
  return { header: head ? head.cells.map((h) => h.trim()) : [], rows, errors };
}

export function toCsv(header: string[], rows: string[][]): string {
  const esc = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, ...rows].map((r) => r.map(esc).join(",")).join("\n") + "\n";
}
