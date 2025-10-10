
import React from 'react';
import { Totals } from '../types';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);

export default function SummaryCards({ totals }: { totals: Totals | null }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {[
        { label: 'Entradas', value: totals?.inflow ?? 0 },
        { label: 'Saídas',   value: totals?.outflow ?? 0 },
        { label: 'Saldo (Net)', value: totals?.net ?? 0 },
        { label: 'Pendentes hoje', value: totals?.pendingToday ?? 0 },
        { label: 'Projetado', value: totals?.projectedBalance ?? 0 },
      ].map((c) => (
        <div key={c.label} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="text-xs text-slate-400">{c.label}</div>
          <div className={`mt-1 text-lg font-semibold ${c.label==='Saídas' || (c.label!=='Entradas' && (c.value<0)) ? 'text-red-400':'text-slate-100'}`}>
            {fmt(c.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
