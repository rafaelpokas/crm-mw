export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quote = false;
  const delimiter = text.split(/\r?\n/)[0].includes(";") ? ";" : ",";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quote && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quote = !quote;
    } else if (c === delimiter && !quote) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" && !quote) {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quote) throw Error("CSV contém aspas não fechadas.");
  row.push(cell.replace(/\r$/, ""));
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
