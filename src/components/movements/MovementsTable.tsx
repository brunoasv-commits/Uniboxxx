
import { ChevronDown, ChevronRight, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { groupByMonth } from '../../../utils/group';
import { format } from 'date-fns';
import { formatBRL } from '../../../utils/num';

type Movement = {
  id: string;
  description: string;
  kind: 'RECEITA'|'DESPESA'|'TRANSFERENCIA';
  status: 'PENDENTE'|'BAIXADO'|'CANCELADO';
  dueDate: string;
  amountNet: number;
  categoryId?: string | null;
};

type Props = {
  items: Movement[];
  loading?: boolean;
  onEdit: (id: string)=>void;
  onDelete: (ids: string[])=>void;
  onSettle: (ids: string[])=>void;
};

export default function MovementsTable({ items, loading, onEdit, onDelete, onSettle }: Props) {
  const groups = useMemo(() => groupByMonth(items), [items]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const idsSelected = Object.entries(selected).filter(([,v]) => v).map(([k]) => k);

  if (loading) {
    return <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-6 text-slate-400">Carregando…</div>;
  }
  if (!items || items.length === 0) {
    return <div className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-6 text-slate-400">Nenhum movimento no período.</div>;
  }

  return (
    <div className="rounded-xl border border-slate-800/60 overflow-hidden">
      {/* Bulk actions */}
      {idsSelected.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
          <div className="text-sm text-slate-300">{idsSelected.length} selecionado(s)</div>
          <div className="flex gap-2">
            <button onClick={()=>onSettle(idsSelected)} className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm">Baixar</button>
            <button onClick={()=>onDelete(idsSelected)} className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-sm">Excluir</button>
          </div>
        </div>
      )}

      {Object.entries(groups).map(([month, rows]: [string, Movement[]]) => {
        const isOpen = open[month] ?? true;
        return (
          <div key={month} className="border-b border-slate-800 last:border-b-0">
            <button
              onClick={()=> setOpen(s => ({ ...s, [month]: !isOpen }))}
              className="w-full flex items-center gap-2 px-4 py-2 bg-slate-900/60 hover:bg-slate-900">
              {isOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
              <span className="text-slate-200 font-medium">{month}</span>
              <span className="ml-2 text-xs text-slate-400">({rows.length})</span>
            </button>

            {isOpen && (
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50 text-slate-400">
                  <tr>
                    <th className="w-10"></th>
                    <th className="text-left px-4 py-2">Vencimento</th>
                    <th className="text-left px-4 py-2">Descrição</th>
                    <th className="text-left px-4 py-2">Tipo</th>
                    <th className="text-right px-4 py-2">Valor líquido</th>
                    <th className="text-center px-4 py-2">Status</th>
                    <th className="text-right px-4 py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className="border-t border-slate-800/60 hover:bg-slate-900/40">
                      <td className="px-4">
                        <input type="checkbox"
                          checked={!!selected[m.id]}
                          onChange={e => setSelected(s => ({ ...s, [m.id]: e.target.checked }))}/>
                      </td>
                      <td className="px-4 py-2 text-slate-200">{format(new Date(m.dueDate), 'dd/MM/yyyy')}</td>
                      <td className="px-4 py-2 text-slate-100">{m.description}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          m.kind==='RECEITA' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : m.kind==='DESPESA' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                        }`}>{m.kind}</span>
                      </td>
                      <td className={`px-4 py-2 text-right font-medium ${
                        m.kind==='RECEITA' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {m.kind==='RECEITA' ? '+' : '-'} {formatBRL(m.amountNet)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          m.status==='PENDENTE' ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                          : m.status==='BAIXADO' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-300 border border-slate-500/20'
                        }`}>{m.status}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button title="Baixar" onClick={()=>onSettle([m.id])}
                            className="p-1 rounded hover:bg-slate-800 text-emerald-400"><CheckCircle2 size={16}/></button>
                          <button title="Editar" onClick={()=>onEdit(m.id)}
                            className="p-1 rounded hover:bg-slate-800 text-sky-400"><Pencil size={16}/></button>
                          <button title="Excluir" onClick={()=>onDelete([m.id])}
                            className="p-1 rounded hover:bg-slate-800 text-rose-400"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}