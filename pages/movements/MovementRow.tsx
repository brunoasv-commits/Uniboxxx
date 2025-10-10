import { UIMovement } from './adapters';
import React from 'react';

type Props = { row: UIMovement };

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Fix: Changed to React.FC for more explicit component typing, which can resolve prop type issues.
const MovementRow: React.FC<Props> = ({ row }) => {
  const sign = row.kind === 'DESPESA' ? -1 : 1;
  const netForDisplay = sign * row.net; // sinal só para exibição
  const color = row.kind === 'DESPESA' ? 'text-red-400' : 'text-emerald-400';

  return (
    <tr className="border-b border-gray-800">
      <td className="px-3 py-2 whitespace-nowrap">{row.dueDate ? new Date(row.dueDate + 'T12:00:00Z').toLocaleDateString('pt-BR') : '—'}</td>
      <td className="px-3 py-2">{row.description || '—'}</td>
      <td className="px-3 py-2">{row.kind || '—'}</td>
      <td className="px-3 py-2">{row.categoryName}</td>
      <td className="px-3 py-2">{row.accountName}</td>
      <td className={`px-3 py-2 font-medium ${color}`}>{brl.format(netForDisplay)}</td>
      <td className="px-3 py-2">{row.status}</td>
    </tr>
  );
};

export default MovementRow;