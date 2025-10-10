import React from 'react';
import { Movement } from '../types';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString + 'T12:00:00Z');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = date.toLocaleString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
    return `${day}/${month.charAt(0).toUpperCase() + month.slice(1)}`;
}

export default function CashflowView({ items }: { items: Movement[] }) {
  // soma por dia -> net
  const map = new Map<string, number>();
  items.forEach(m=>{
    const s = map.get(m.dueDate) || 0;
    map.set(m.dueDate, s + (m.kind==='DESPESA' ? -m.amountNet : m.amountNet));
  });
  const series = Array.from(map.entries()).sort(([a],[b])=>a.localeCompare(b));

  const maxAbsValue = series.reduce((max, [,v]) => Math.max(max, Math.abs(v)), 1);


  return (
    <div className="rounded-xl border border-slate-800 p-4">
      <div className="mb-3 text-sm text-slate-400">Fluxo de caixa (net por dia)</div>
      <div className="space-y-1">
        {series.length===0 ? <div className="text-slate-400">Sem dados no período.</div> :
          series.map(([day,v])=>(
            <div key={day} className="flex items-center gap-3">
              <div className="w-24 text-xs text-slate-400">{formatDate(day)}</div>
              <div className={`w-24 text-xs text-right font-medium ${v<0?'text-red-400':'text-emerald-400'}`}>{fmt(v)}</div>
              <div className="h-4 flex-1 rounded bg-slate-800 flex items-center">
                 <div className={`h-4 rounded ${v<0?'bg-red-500':'bg-emerald-500'}`} style={{width:`${(Math.abs(v)/maxAbsValue)*100}%`}}></div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
