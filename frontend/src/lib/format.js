export function formatINR(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPct(value, decimals = 2, isAlreadyPercent = false) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const pct = isAlreadyPercent ? Number(value) : Number(value) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(decimals)}%`;
}

export function formatUnsignedPct(value, decimals = 1, isAlreadyPercent = true) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const pct = isAlreadyPercent ? Number(value) : Number(value) * 100;
  return `${pct.toFixed(decimals)}%`;
}

export function formatCompactVolume(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const n = Number(value);
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

export function shortSymbol(symbol) {
  return (symbol || "").replace(/\.NS$/i, "");
}

export function exportRowsToCsv(filename, columns, rows) {
  const escapeCell = (val) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const raw = typeof c.exportValue === "function" ? c.exportValue(row) : row[c.key];
        return escapeCell(raw);
      })
      .join(",")
  );

  const blob = new Blob([[header, ...lines].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
