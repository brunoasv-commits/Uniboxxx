export function exportToCsv(rows: Array<Record<string, any>>, filename = "export.csv") {
  if (rows.length === 0) {
    alert("Nenhum dado para exportar.");
    return;
  }
  const headers = Object.keys(rows[0] ?? {});
  const body = rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(",")).join("\n");
  const blob = new Blob([headers.join(",") + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
