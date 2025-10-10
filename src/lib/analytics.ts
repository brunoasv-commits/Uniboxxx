
import { Movement, MovementStatus } from "../../types";
import { format, addDays, differenceInCalendarDays, subDays } from "date-fns";

export function computeTotals(movs: Movement[]): { inflow: number; outflow: number; net: number } {
  let inflow = 0, outflow = 0;
  for (const m of movs) {
    if (m.kind === "RECEITA") inflow += m.amountNet;
    else if (m.kind === "DESPESA") outflow += m.amountNet;
  }
  return { inflow, outflow, net: +(inflow - outflow).toFixed(2) };
}

export function pctDelta(current: number, previous: number): number | undefined {
  if (previous === 0) {
      if (current !== 0) return Infinity;
      return 0;
  }
  return +(((current - previous) / Math.abs(previous)) * 100);
}

export function getPreviousPeriod(dateFrom: string, dateTo: string) {
    const start = new Date(dateFrom + 'T00:00:00Z');
    const end = new Date(dateTo + 'T00:00:00Z');
    const durationDays = differenceInCalendarDays(end, start);
    const prevEnd = subDays(start, 1);
    const prevStart = subDays(prevEnd, durationDays);
    return {
        start: format(prevStart, 'yyyy-MM-dd'),
        end: format(prevEnd, 'yyyy-MM-dd')
    };
}


export function buildSparklines(
  movs: Movement[],
  dateFrom: string,
  dateTo: string,
  key: "inflow" | "outflow" | "net"
) {
  const days: Record<string, { inflow: number; outflow: number; net: number }> = {};
  const start = new Date(dateFrom + "T00:00:00");
  const end = new Date(dateTo + "T00:00:00");

  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const iso = format(d, 'yyyy-MM-dd');
    days[iso] = { inflow: 0, outflow: 0, net: 0 };
  }
  
  for (const m of movs) {
    if (m.status !== MovementStatus.Baixado) continue;
    const iso = m.paidDate || m.dueDate;
    if (!iso || !days[iso]) continue;
    if (m.kind === "RECEITA") days[iso].inflow += m.amountNet;
    else if (m.kind === "DESPESA") days[iso].outflow += m.amountNet;
  }

  Object.keys(days).forEach(iso => {
    days[iso].net = +(days[iso].inflow - days[iso].outflow).toFixed(2);
  });

  return Object.keys(days).sort().map(k => ({ x: k, y: days[k][key] }));
}