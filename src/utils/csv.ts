export function toCsv(rows: any[], headers: Record<string, string>): string {
  const headerKeys = Object.keys(headers);
  const headerValues = Object.values(headers);

  const head = headerValues.join(";");
  
  const body = rows.map(row => 
    headerKeys.map(key => {
      const value = row[key];
      
      let strValue = String(value ?? "");
      if (strValue.includes('"') || strValue.includes(';')) {
        strValue = `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    }).join(";")
  ).join("\n");
  
  return `${head}\n${body}`;
}

export function downloadCsv(filename: string, csv: string) {
  // BOM for Excel UTF-8 compatibility
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
