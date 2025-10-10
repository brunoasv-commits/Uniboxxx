
import React from 'react';
import { Movement, MovementStatus } from '../types';
import { Pencil, Download, Paperclip } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const formatDate = (dateString: string, full: boolean = false) => {
    if (!dateString) return '—';
    // Use UTC to prevent timezone shifts from changing the date
    const date = new Date(dateString + 'T12:00:00Z');
    if (full) {
        return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    }
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = date.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
    return `${day}/${month.charAt(0).toUpperCase() + month.slice(1)}`;
}

const getRowStyle = (status: MovementStatus) => {
    switch (status) {
        case 'BAIXADO':
            return 'bg-emerald-950/20 hover:bg-emerald-900/30';
        case 'VENCIDO':
            return 'bg-amber-950/30 hover:bg-amber-900/40';
        case 'CANCELADO':
            return 'bg-slate-800/20 text-slate-500 line-through hover:bg-slate-800/40';
        case 'PENDENTE':
        default:
            return 'hover:bg-slate-900/40';
    }
};

type Props = {
  items: Movement[];
  density: 'comfortable' | 'compact';
  onEdit: (m: Movement) => void;
  onSettleRequest: (m: Movement) => void;
  groupBy: 'none' | 'category' | 'account' | 'contact' | 'date';
  selectedIds: Set<string>;
  onSelectionChange: (value: React.SetStateAction<Set<string>>) => void;
};

export default function DataTable({ items, density, onEdit, onSettleRequest, groupBy, selectedIds, onSelectionChange }: Props) {
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(new Set());

  const groupedItems = React.useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: null, items }];
    
    const getGroupKey = (m: Movement) => {
      const effectiveDate = m.status === 'BAIXADO' && m.paidDate ? m.paidDate : m.dueDate;
      switch (groupBy) {
        case 'category': return m.categoryName || 'Sem Categoria';
        case 'account': return m.accountName || 'Sem Conta';
        case 'contact': return 'Sem Contato'; // Placeholder
        case 'date': return effectiveDate || 'Sem Data';
        default: return 'all';
      }
    };

    const map = new Map<string, Movement[]>();
    items.forEach(m => {
      const key = getGroupKey(m);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });

    const groupEntries = Array.from(map.entries());

    if (groupBy === 'date') {
      // For date grouping, sort groups by date descending
      groupEntries.sort((a, b) => b[0].localeCompare(a[0]));
    } else {
      // For other groupings, sort by label alphabetically
      groupEntries.sort((a, b) => a[0].localeCompare(b[0]));
    }

    return groupEntries.map(([key, groupItems]) => ({ 
        key, 
        label: groupBy === 'date' ? formatDate(key, true) : key,
        items: groupItems 
    }));

  }, [items, groupBy]);

  const handleGroupSelection = (groupItems: Movement[], isSelected: boolean) => {
    onSelectionChange(prev => {
      const newSet = new Set(prev);
      groupItems.forEach(item => {
        if (isSelected) newSet.add(item.id);
        else newSet.delete(item.id);
      });
      return newSet;
    });
  };

  const handleToggleCollapse = (key: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  };

  if (items.length === 0) {
    return <div className="p-8 text-center text-slate-400">Nenhum movimento encontrado.</div>;
  }

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden">
      {groupedItems.map((group) => {
        const isCollapsed = collapsedGroups.has(group.key);
        const allInGroupSelected = group.items.every(item => selectedIds.has(item.id));
        const someInGroupSelected = group.items.some(item => selectedIds.has(item.id));

        return (
          <div key={group.key} className="border-b border-slate-800 last:border-0">
            {group.label && (
              <div 
                className="bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-300 flex justify-between items-center cursor-pointer hover:bg-slate-900"
                onClick={() => handleToggleCollapse(group.key)}
              >
                <div className="flex items-center gap-2">
                   <input 
                      type="checkbox" 
                      checked={allInGroupSelected} 
                      ref={input => { if(input) input.indeterminate = someInGroupSelected && !allInGroupSelected; }}
                      onChange={(e) => handleGroupSelection(group.items, e.target.checked)}
                      onClick={(e) => e.stopPropagation()} // Prevent collapsing when clicking checkbox
                      className="ml-2"
                    />
                  <span>{group.label} ({group.items.length})</span>
                </div>
                <span>
                  {fmt(group.items.reduce((s,m)=>s+(m.kind==='DESPESA'?-1:1)*m.amountNet,0))}
                </span>
              </div>
            )}

            {!isCollapsed && (
              <table className={`w-full text-sm ${density==='compact' ? 'leading-5' : 'leading-7'}`}>
                {!group.label && (
                  <thead className="text-xs uppercase text-slate-400">
                    <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left">
                       <th><input 
                         type="checkbox" 
                         checked={selectedIds.size > 0 && selectedIds.size === items.length}
                         ref={input => { if(input) input.indeterminate = selectedIds.size > 0 && selectedIds.size < items.length; }}
                         onChange={(e) => handleGroupSelection(items, e.target.checked)}
                        /></th>
                      <th>Data</th><th>Descrição</th><th>Tipo</th><th className="text-right">Valor Líquido</th><th>Status</th><th className="w-20"></th>
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-slate-800">
                  {group.items.map((m)=>(
                    <tr key={m.id} className={`group [&>td]:px-4 [&>td]:py-3 transition-colors ${selectedIds.has(m.id) ? 'bg-blue-900/20 hover:bg-blue-900/30' : getRowStyle(m.status)}`}>
                      <td><input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => {
                          onSelectionChange(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(m.id)) newSet.delete(m.id);
                              else newSet.add(m.id);
                              return newSet;
                          });
                      }}/></td>
                      <td className="text-slate-300">{formatDate(m.status === 'BAIXADO' && m.paidDate ? m.paidDate : m.dueDate)}</td>
                      <td className="text-slate-100">{m.description}</td>
                      <td>
                         <span className={`px-2 py-0.5 rounded-full text-xs ${
                          m.kind==='RECEITA' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                          : m.kind==='DESPESA' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                          : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                        }`}>{m.kind}</span>
                      </td>
                      <td className={`text-right font-medium ${m.kind==='DESPESA' ? 'text-red-400':'text-emerald-400'}`}>
                        {fmt(m.amountNet * (m.kind==='DESPESA'?-1:1))}
                      </td>
                      <td className="text-slate-300">{m.status}</td>
                      <td className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {m.status !== 'BAIXADO' && 
                                <button onClick={() => onSettleRequest(m)} className="p-1.5 rounded-md hover:bg-slate-700 text-emerald-400" title="Baixar">
                                    <Download size={15}/>
                                </button>
                            }
                            <button onClick={() => onEdit(m)} className="p-1.5 rounded-md hover:bg-slate-700 text-sky-400" title="Editar">
                                <Pencil size={15}/>
                            </button>
                          </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}
    </div>
  );
}
