import { useMemo } from "react";
import { Movement, AppState } from "../../../types";
import { formatBRL } from "../../../utils/money";

type Props = {
  accountId: string;
  movements: Movement[];
  openingBalance: number;
  state: AppState;
};

const formatDate = (dateString: string) => new Date(dateString + 'T00:00:00Z').toLocaleDateString('pt-BR');


export default function SummaryTab({ accountId, movements, openingBalance, state }: Props) {
  const { inflow, outflow, net } = useMemo(() => {
    let i = 0, o = 0;
    for (const m of movements) {
      if (m.accountId !== accountId) continue;
      if (m.kind === "RECEITA") i += m.amountNet;
      if (m.kind === "DESPESA") o += m.amountNet;
    }
    return { inflow: +i.toFixed(2), outflow: +o.toFixed(2), net: +(i - o).toFixed(2) };
  }, [movements, accountId]);

  const currentBalance = useMemo(() => +(openingBalance + inflow - outflow).toFixed(2), [openingBalance, inflow, outflow]);

  const recentMovements = useMemo(() => {
    return [...movements]
        .sort((a,b) => (b.paidDate || b.dueDate).localeCompare(a.paidDate || a.dueDate))
        .slice(0, 5)
        .map(m => ({
            ...m,
            value: m.kind === 'DESPESA' ? -m.amountNet : m.amountNet,
            date: m.paidDate || m.dueDate
        }));
  }, [movements]);

  const empty = movements.filter(m => m.accountId === accountId).length === 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi title="Saldo Inicial" value={formatBRL(openingBalance)} />
        <Kpi title="Entradas (Período)" value={formatBRL(inflow)} tone="positive" />
        <Kpi title="Saídas (Período)" value={formatBRL(outflow)} tone="negative" />
        <Kpi title="Saldo Atual (Real)" value={formatBRL(currentBalance)} tone={currentBalance>=0?"positive":"negative"} />
        <Kpi title="Saldo Projetado (Período)" value={formatBRL(net)} tone={net>=0?"positive":"negative"} />
      </div>

      {empty ? (
        <div className="py-12 text-center text-sm text-gray-400">Sem lançamentos no período.</div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="bg-white/5 px-4 py-2 text-xs text-gray-400">Últimos Lançamentos</div>
          <table className="w-full text-sm">
            <thead className="text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left">Data da Transação</th>
                <th className="px-4 py-2 text-left">Descrição</th>
                <th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {recentMovements.map(row => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-gray-400">{formatDate(row.date)}</td>
                  <td className="px-4 py-2">{row.description}</td>
                  <td className={`px-4 py-2 text-right ${row.value>=0?'text-emerald-300':'text-rose-300'}`}>{formatBRL(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value, tone }: { title: string; value: string; tone?: "positive"|"negative" }) {
  const ring = tone==="positive" ? "ring-emerald-500/20" : tone==="negative" ? "ring-rose-500/20" : "ring-white/5";
  return (
    <div className={`rounded-2xl bg-gray-900/60 border border-white/5 ring-1 ${ring} px-4 py-3`}>
      <div className="text-xs text-gray-400">{title}</div>
      <div className="text-2xl font-semibold text-gray-100">{value}</div>
    </div>
  );
}
