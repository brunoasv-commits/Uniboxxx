
import { Movement, MovementStatus, AppState } from "../../../types";
import React from 'react';

type Props = {
  movs: Movement[];
  initialBalance: number;
  state: AppState;
};

const StatusBadge: React.FC<{ status: MovementStatus }> = ({ status }) => {
    const config = {
        [MovementStatus.Baixado]: 'bg-green-500/15 text-green-400',
        [MovementStatus.EmAberto]: 'bg-yellow-500/15 text-yellow-400',
        [MovementStatus.Vencido]: 'bg-red-500/15 text-red-400',
    };
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config[status]}`}>{status}</span>
};


export function AccountStatement({ movs, initialBalance, state }: Props) {
  const brl = (n?: number) => typeof n === 'number' ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' });

  const ordered = [...movs].sort((a,b) => {
      const dateA = a.status === MovementStatus.Baixado ? (a.paidDate || a.dueDate) : a.dueDate;
      const dateB = b.status === MovementStatus.Baixado ? (b.paidDate || b.dueDate) : b.dueDate;
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.status === MovementStatus.Baixado ? -1 : 1; // Settled items first on same day
  });

  let running = initialBalance;
  const rows = ordered.map(m => {
    const value = m.kind === "RECEITA" ? m.amountNet : -m.amountNet;
    const entrada = value > 0 ? value : 0;
    const saida   = value < 0 ? Math.abs(value) : 0;
    
    const balanceBefore = running;
    if (m.status === MovementStatus.Baixado) {
        running += value;
    }
    const category = state.categories.find(c => c.id === m.categoryId);
    const contact = state.contacts.find(c => c.id === m.contactId);

    return { ...m, entrada, saida, saldo: m.status === 'Baixado' ? running : balanceBefore, categoryName: category?.name, contactName: contact?.name };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12">
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-gray-900/50">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-gray-300">
            <tr>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Descrição</th>
              <th className="px-3 py-2 text-left">Categoria</th>
              <th className="px-3 py-2 text-left">Contato</th>
              <th className="px-3 py-2 text-center">Status</th>
              <th className="px-3 py-2 text-right">Entrada</th>
              <th className="px-3 py-2 text-right">Saída</th>
              <th className="px-3 py-2 text-right">Saldo após</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/5">
                <td className="px-3 py-2 text-gray-400" colSpan={7}>Saldo Inicial do Período</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-300">{brl(initialBalance)}</td>
            </tr>
            {rows.map(r => (
              <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                <td className="px-3 py-2">{formatDate(r.paidDate || r.dueDate)}</td>
                <td className="px-3 py-2 text-gray-200">{r.description}</td>
                <td className="px-3 py-2 text-gray-300">{r.categoryName || "—"}</td>
                <td className="px-3 py-2 text-gray-300">{r.contactName || "—"}</td>
                <td className="px-3 py-2 text-center"><StatusBadge status={r.status!} /></td>
                <td className="px-3 py-2 text-right text-emerald-400">{r.entrada ? brl(r.entrada) : ""}</td>
                <td className="px-3 py-2 text-right text-rose-400">{r.saida ? brl(r.saida) : ""}</td>
                <td className={`px-3 py-2 text-right font-semibold ${r.saldo >= 0 ? "text-gray-200" : "text-rose-300"}`}>
                  {brl(r.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
