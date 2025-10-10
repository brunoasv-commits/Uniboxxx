// src/lib/account-analytics.ts
import { Movement, Account, MovementKind, MovementStatus } from "../../types";
import { format, addDays } from "date-fns";

/** Totais no período para UMA conta */
export function computeAccountTotals(
  movs: Movement[],
  accountId: string
) {
  let inflow = 0, outflow = 0;
  for (const m of movs) {
    if (m.accountId !== accountId || m.status !== MovementStatus.Baixado) continue;
    
    if (m.kind === MovementKind.RECEITA) inflow += m.amountNet;
    else if (m.kind === MovementKind.DESPESA) outflow += m.amountNet;
  }
  const net = +(inflow - outflow).toFixed(2);
  return { inflow, outflow, net };
}

/** Saldo atual (real) até hoje, somente BAIXADO */
export function computeCurrentBalance(
  allMovements: Movement[],
  account: Account
) {
  const today = new Date().toISOString().slice(0,10);
  let inflow = 0, outflow = 0;
  for (const m of allMovements) {
    if (m.accountId !== account.id) continue;
    if (m.status !== MovementStatus.Baixado) continue;
    if (m.paidDate && m.paidDate > today) continue;
    
    if (m.kind === MovementKind.RECEITA) inflow += m.amountNet;
    else if (m.kind === MovementKind.DESPESA) outflow += m.amountNet;
  }
  return +(account.initialBalance + inflow - outflow).toFixed(2);
}

/** Saldo projetado no período: saldoAtual + net (pendentes + baixados) do período */
export function computeProjectedBalance(
  periodMovements: Movement[],
  currentBalance: number
) {
  let inflow = 0, outflow = 0;
  for (const m of periodMovements) {
      if(m.status === MovementStatus.Baixado) continue; // Already counted in currentBalance if before today
      if (m.kind === MovementKind.RECEITA) inflow += m.amountNet;
      else if (m.kind === MovementKind.DESPESA) outflow += m.amountNet;
  }
  // This projection adds future pending transactions to the current real balance
  return +(currentBalance + inflow - outflow).toFixed(2);
}

/** % delta x período anterior (mesma duração) */
export function pctDelta(current: number, previous: number): number | undefined {
  if (previous === 0) {
      if (current > 0) return Infinity;
      return undefined;
  };
  return +(((current - previous) / Math.abs(previous)) * 100);
}

/** Sparkline por dia (inflow, outflow, net, balance) */
export function buildAccountSeries(
  movs: Movement[],
  accountId: string,
  dateFrom: string,
  dateTo: string,
  key: "inflow"|"outflow"|"net"|"balance",
  initialBalanceAtStart: number = 0
) {
  const map: Record<string, { inflow: number; outflow: number; net: number; balance: number }> = {};
  const start = new Date(dateFrom + "T00:00:00");
  const end = new Date(dateTo + "T00:00:00");

  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const iso = format(d, 'yyyy-MM-dd');
    map[iso] = { inflow: 0, outflow: 0, net: 0, balance: 0 };
  }

  for (const m of movs) {
    if (m.accountId !== accountId) continue;
    const effectiveDate = m.status === MovementStatus.Baixado ? m.paidDate : m.dueDate;
    if (!effectiveDate || !map[effectiveDate]) continue;
    
    if (m.status === MovementStatus.Baixado) {
        if (m.kind === MovementKind.RECEITA) map[effectiveDate].inflow += m.amountNet;
        else if (m.kind === MovementKind.DESPESA) map[effectiveDate].outflow += m.amountNet;
    }
  }
  
  let running = initialBalanceAtStart;
  for (const day of Object.keys(map).sort()) {
    const v = map[day];
    v.net = +(v.inflow - v.outflow).toFixed(2);
    running = +(running + v.net).toFixed(2);
    v.balance = running;
  }

  return Object.keys(map).sort().map(k => ({ x: k, y: map[k][key] }));
}