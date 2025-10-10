import React, { useMemo } from "react";
import { KpiCard } from "../../../components/KpiCard";
import { computeTotals, pctDelta, buildSparklines } from "../../../lib/analytics";
import { ChevronDown, Settings2 } from "lucide-react";
import { Movement, MovementStatus } from "../../../../types";
import { Filters } from "../types";
import Button from "../../../../components/ui/Button";

type Props = {
  movs: Movement[];
  prevMovs: Movement[];
  dateFrom: string;
  dateTo: string;
  onRangePreset: (preset: "today" | "7d" | "30d" | "month" | "next30" | "custom") => void;
  onOpenNew: () => void;
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
};

export function TransactionsHeader(props: Props) {
  const { movs, prevMovs, dateFrom, dateTo, filters, onFiltersChange } = props;

  const curr = useMemo(() => computeTotals(movs.filter(m => !filters.includeSettled ? m.status !== MovementStatus.Baixado : true)), [movs, filters.includeSettled]);
  const prev = useMemo(() => computeTotals(prevMovs), [prevMovs]);

  const inflowDelta = pctDelta(curr.inflow, prev.inflow);
  const outflowDelta = pctDelta(curr.outflow, prev.outflow);
  const netDelta = pctDelta(curr.net, prev.net);

  const inflowSpark = buildSparklines(movs, dateFrom, dateTo, "inflow");
  const outflowSpark = buildSparklines(movs, dateFrom, dateTo, "outflow");
  const netSpark = buildSparklines(movs, dateFrom, dateTo, "net");

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  
  const { pendingToday, projectedBalance } = useMemo(() => {
    const isoToday = new Date().toISOString().slice(0, 10);
    let pending = 0;
    let projected = 0;
    
    const relevantMovs = movs.filter(m => {
        if (!filters.includeSettled && m.status === MovementStatus.Baixado) return false;
        return true;
    });

    for (const m of relevantMovs) {
      const value = m.kind === "RECEITA" ? m.amountNet : -m.amountNet;
      if (m.dueDate === isoToday && m.status !== MovementStatus.Baixado) {
        pending += value;
      }
      projected += value;
    }
    return { pendingToday: pending, projectedBalance: projected };
  }, [movs, filters.includeSettled]);

  const inputDateClass = "rounded-full bg-white/5 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/10 outline-none focus:ring-2 focus:ring-sky-600";

  return (
    <div className="sticky top-0 z-20 bg-[#0b1220]/80 backdrop-blur supports-[backdrop-filter]:bg-[#0b1220]/60 border-b border-white/5">
      <div className="px-6 lg:px-10 py-3 flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {[
            ["Hoje", "today"], ["7d", "7d"], ["30d", "30d"], ["Mês", "month"], ["Próx 30", "next30"],
          ].map(([label, key]) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              onClick={() => props.onRangePreset(key as any)}
            >{label}</Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
            <input type="date" value={filters.dateFrom || ''} onChange={(e) => onFiltersChange({ dateFrom: e.target.value })} className={`${inputDateClass} w-36`} />
            <input type="date" value={filters.dateTo || ''} onChange={(e) => onFiltersChange({ dateTo: e.target.value })} className={`${inputDateClass} w-36`} />
        </div>

        <div className="ml-2 flex-1 min-w-[200px]">
          <input
            value={filters.query}
            onChange={(e) => onFiltersChange({ query: e.target.value })}
            placeholder="Buscar descrição, conta, categoria…"
            className="w-full rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-gray-200 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-sky-600"
          />
        </div>

        <div className="flex items-center gap-2">
            <Button
            onClick={props.onOpenNew}
            variant="primary"
            >
            Nova Transação
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 px-6 lg:px-10 pb-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Entradas" value={brl(curr.inflow)} deltaPct={inflowDelta} trend={inflowSpark} tone="positive" />
        <KpiCard title="Saídas" value={brl(curr.outflow)} deltaPct={outflowDelta} trend={outflowSpark} tone="negative" />
        <KpiCard title="Saldo (Net)" value={brl(curr.net)} deltaPct={netDelta} trend={netSpark} tone={curr.net >= 0 ? "positive" : "negative"} />
        <KpiCard title="Pendentes hoje" value={brl(pendingToday)} />
        <KpiCard title="Projetado" value={brl(projectedBalance)} />
      </div>
    </div>
  );
}