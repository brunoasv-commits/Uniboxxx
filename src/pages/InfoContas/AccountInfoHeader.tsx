
import { useMemo } from "react";
import { KpiCard } from "../../components/KpiCard";
import {
  computeAccountTotals,
  computeCurrentBalance,
  computeProjectedBalance,
  pctDelta,
  buildAccountSeries,
} from "../../lib/account-analytics";
import { Account, Movement } from "../../../types";

type Props = {
  account: Account;
  allMovements: Movement[];
  currentPeriodMovements: Movement[];
  previousPeriodMovements: Movement[];
  dateFrom: string;
  dateTo: string;
  initialBalanceForPeriod: number;
  availableAccounts: Account[];
  onAccountChange: (id: string) => void;
  onPreset: (key: "today" | "7d" | "30d" | "month" | "next30") => void;
  onSearch: (q: string) => void;
  onExport: () => void;
};

export function AccountInfoHeader({
  account, allMovements, currentPeriodMovements, previousPeriodMovements, dateFrom, dateTo, initialBalanceForPeriod, availableAccounts, onAccountChange, onPreset, onSearch, onExport
}: Props) {
  
  const curr = useMemo(
    () => computeAccountTotals(currentPeriodMovements, account.id),
    [currentPeriodMovements, account.id]
  );
  const prev = useMemo(
    () => computeAccountTotals(previousPeriodMovements, account.id),
    [previousPeriodMovements, account.id]
  );

  const saldoAtual = useMemo(
    () => computeCurrentBalance(allMovements, account),
    [allMovements, account]
  );
  const saldoProj = useMemo(
    () => computeProjectedBalance(currentPeriodMovements, saldoAtual),
    [currentPeriodMovements, saldoAtual]
  );

  const inflowDelta = pctDelta(curr.inflow, prev.inflow);
  const outflowDelta = pctDelta(curr.outflow, prev.outflow);
  const prevInitialBalance = 0; // Simplified for now
  const initialDelta = pctDelta(initialBalanceForPeriod, prevInitialBalance);
  const projDelta = pctDelta(saldoProj, saldoAtual);

  const sparkIn = buildAccountSeries(currentPeriodMovements, account.id, dateFrom, dateTo, "inflow");
  const sparkOut = buildAccountSeries(currentPeriodMovements, account.id, dateFrom, dateTo, "outflow");
  const sparkBal = buildAccountSeries(currentPeriodMovements, account.id, dateFrom, dateTo, "balance", initialBalanceForPeriod);

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="sticky top-0 z-10 bg-[#0b1220]/80 backdrop-blur border-b border-white/5">
      <div className="mx-auto max-w-7xl px-4 py-3 flex flex-wrap items-center gap-2">
        <select 
            value={account.id}
            onChange={(e) => onAccountChange(e.target.value)}
            className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 font-medium focus:ring-2 focus:ring-sky-600 outline-none"
        >
            {availableAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
        </select>

        <div className="flex gap-2">
          {[
            ["Hoje","today"], ["7d","7d"], ["30d","30d"], ["Mês","month"], ["Próx 30","next30"],
          ].map(([label, key]) => (
            <button
              key={key}
              onClick={() => onPreset(key as any)}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/10"
            >{label}</button>
          ))}
        </div>

        <div className="flex-1 min-w-[280px]">
          <input
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar no extrato…"
            className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:ring-2 focus:ring-sky-600 outline-none"
          />
        </div>

        <button
          onClick={onExport}
          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Exportar CSV
        </button>
      </div>

      <div className="mx-auto max-w-7xl grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Saldo Inicial (Período)" value={brl(initialBalanceForPeriod)} deltaPct={initialDelta} trend={sparkBal} />
        <KpiCard title="Entradas (Período)" value={brl(curr.inflow)} deltaPct={inflowDelta} trend={sparkIn} tone="positive" />
        <KpiCard title="Saídas (Período)" value={brl(curr.outflow)} deltaPct={outflowDelta} trend={sparkOut} tone="negative" />
        <KpiCard title="Saldo Atual (Real)" value={brl(saldoAtual)} trend={sparkBal} tone={saldoAtual >= 0 ? "positive" : "negative"} />
        <KpiCard title="Saldo Projetado (Período)" value={brl(saldoProj)} deltaPct={projDelta} trend={sparkBal} />
      </div>
    </div>
  );
}
