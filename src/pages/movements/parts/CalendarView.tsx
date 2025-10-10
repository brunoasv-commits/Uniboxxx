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

export default function CalendarView({ items }: { items: Movement[] }) {
  // Agrupa por dia (YYYY-MM-DD)
  const map = new Map<string, { inflow: number; outflow: number; count: number }>();
  items.forEach(m=>{
    const d = m.dueDate;
    const g = map.get(d) || { inflow:0, outflow:0, count:0 };
    if (m.kind==='DESPESA') g.outflow += m.amountNet; else g.inflow += m.amountNet;
    g.count++; map.set(d,g);
  });

  const days = Array.from(map.entries()).sort(([a],[b])=>a.localeCompare(b));

  return (
    <div className="rounded-xl border border-slate-800">
      <div className="grid gap-3 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {days.length===0 ? <div className="text-slate-400 col-span-full text-center py-4">Nenhum movimento no período.</div> :
          days.map(([day, g])=>(
            <div key={day} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="mb-1 text-sm font-semibold text-slate-300">{formatDate(day)}</div>
              <div className="text-xs text-slate-400">Qtd: {g.count}</div>
              <div className="text-xs text-emerald-400">Entradas: {fmt(g.inflow)}</div>
              <div className="text-xs text-red-400">Saídas: {fmt(g.outflow)}</div>
              <div className="text-xs text-slate-200 mt-1 font-medium border-t border-slate-700 pt-1">Net: {fmt(g.inflow - g.outflow)}</div>
            </div>
        ))}
      </div>
    </div>
  );
}
