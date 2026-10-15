export function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) {
    return "Sob consulta";
  }
  const reais = cents / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
}

export function formatBps(bps: number | null | undefined): string {
  if (bps === null || bps === undefined) return "0%";
  const percent = bps / 100;
  return (
    new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: percent % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(percent) + "%"
  );
}

export function formatDate(
  isoString: string | null | undefined,
  includeTime = true,
): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(
  isoString: string | null | undefined,
  referenceClockIso?: string,
): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString).getTime();
    const ref = referenceClockIso
      ? new Date(referenceClockIso).getTime()
      : Date.now();
    const diffSec = Math.floor((ref - d) / 1000);

    if (diffSec < 60) return "agora";
    if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `há ${Math.floor(diffSec / 3600)} h`;
    return `há ${Math.floor(diffSec / 86400)} dias`;
  } catch {
    return isoString;
  }
}
