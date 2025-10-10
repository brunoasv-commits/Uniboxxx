
import React, { useMemo } from 'react';
import { MovementStatus, MovementKind, Movement, AppState } from '../../../types';

export type StatementRow = {
  id: string;
  effectiveDate: string;
  description: string;
  kind: MovementKind;
  status: MovementStatus;
  categoryName?: string;
  contactName?: string;
  value: number;
  runningBalance: number;
};

interface StatementTableProps {
  items: StatementRow[];
  initialBalance: number;
  statusFilter: 'ALL' | MovementStatus;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') return "—";
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString: string) => {
    if (!dateString || !dateString.includes('-')) return 'Data Inválida';
    // Use UTC to prevent timezone shifts from changing the date
    const date = new Date(dateString + 'T12:00:00Z');
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const StatusBadge: React.FC<{ status: MovementStatus }> = ({ status }) => {
    const config = {
        [MovementStatus.Baixado]: 'bg-green-500/15 text-green-400',
        [MovementStatus.EmAberto]: 'bg-yellow-500/15 text-yellow-400',
        [MovementStatus.Vencido]: 'bg-red-500/15 text-red-400',
    };
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config[status]}`}>{status}</span>
};

const StatementTable: React.FC<StatementTableProps> = ({ items, initialBalance, statusFilter }) => {
  
  const periodTotals = useMemo(() => {
    const totalIn = items.filter(r => r.value > 0).reduce((s, r) => s + r.value, 0);
    const totalOut = items.filter(r => r.value < 0).reduce((s, r) => s + r.value, 0); // is negative
    return { totalIn, totalOut };
  }, [items]);

  if (items.length === 0) {
      return <div className="text-center py-10 text-gray-500">Nenhum movimento encontrado para os filtros selecionados.</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0">
          <tr>
            <th className="p-3 text-left">Data</th>
            <th className="p-3 text-left">Descrição</th>
            <th className="p-3 text-left">Categoria</th>
            <th className="p-3 text-right">Entrada</th>
            <th className="p-3 text-right">Saída</th>
            <th className="p-3 text-right">Saldo</th>
            <th className="p-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="text-gray-300 divide-y divide-gray-800">
          <tr className="font-semibold text-gray-400">
            <td colSpan={5} className="p-3 text-right">Saldo Inicial do Período</td>
            <td className="p-3 text-right">{formatCurrency(initialBalance)}</td>
            <td></td>
          </tr>
          {items.map(row => {
            const isIncome = row.value > 0;
            return (
              <tr key={row.id} className="hover:bg-gray-800/50">
                <td className="p-3 whitespace-nowrap">{formatDate(row.effectiveDate)}</td>
                <td className="p-3">{row.description}</td>
                <td className="p-3 text-gray-400">{row.categoryName}</td>
                <td className="p-3 text-right font-medium text-green-500">{isIncome ? formatCurrency(row.value) : "—"}</td>
                <td className="p-3 text-right font-medium text-red-500">{!isIncome ? formatCurrency(row.value) : "—"}</td>
                <td className="p-3 text-right font-semibold">{formatCurrency(row.runningBalance)}</td>
                <td className="p-3 text-center"><StatusBadge status={row.status} /></td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-900 text-gray-200 font-bold">
            <tr>
                <td className="p-3" colSpan={3}>
                    Totais do Período ({
                      statusFilter === 'ALL' ? 'Filtrados' : 
                      statusFilter === MovementStatus.Baixado ? 'Baixados' :
                      statusFilter === MovementStatus.EmAberto ? 'Pendentes' :
                      statusFilter === MovementStatus.Vencido ? 'Vencidos' : statusFilter
                    })
                </td>
                <td className="p-3 text-right text-green-500">{formatCurrency(periodTotals.totalIn)}</td>
                <td className="p-3 text-right text-red-500">{formatCurrency(periodTotals.totalOut)}</td>
                <td colSpan={2} />
            </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default StatementTable;