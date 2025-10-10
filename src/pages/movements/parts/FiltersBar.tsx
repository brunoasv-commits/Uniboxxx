import React from 'react';
import { Filters } from '../types';
import Button from '../../../../components/ui/Button';
import { RefreshCcw } from 'lucide-react';

type Props = {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  onAction: (action: 'new' | 'settleToday' | 'transfer') => void;
};

export default function FiltersBar({ filters, onChange, onAction }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Esquerda: chips + datas + incluir baixados */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/60 p-1">
          {(['TODOS','RECEBER','PAGAR'] as const).map((k) => (
            <button
              key={k}
              onClick={() => onChange({ chip: k })}
              className={`px-3 py-1.5 text-sm rounded-full ${filters.chip===k ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >{k === 'TODOS' ? 'Todos' : k === 'RECEBER' ? 'À Receber' : 'À Pagar'}</button>
          ))}
        </div>

        <input type="date" value={filters.dateFrom || ''} onChange={(e)=>onChange({dateFrom:e.target.value})}
               className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100" />
        <span className="text-slate-400 text-sm">até</span>
        <input type="date" value={filters.dateTo || ''} onChange={(e)=>onChange({dateTo:e.target.value})}
               className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100" />

        <label className="ml-2 inline-flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={filters.includeSettled} onChange={(e)=>onChange({includeSettled:e.target.checked})}/>
          Incluir baixados
        </label>

        <input
          placeholder="Buscar descrição..."
          value={filters.query}
          onChange={(e)=>onChange({query:e.target.value})}
          className="ml-2 w-56 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
        />

        <select
          value={filters.groupBy}
          onChange={(e)=>onChange({groupBy: e.target.value as Filters['groupBy']})}
          className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
        >
          <option value="none">Agrupar: Nenhum</option>
          <option value="category">Agrupar: Categoria</option>
          <option value="account">Agrupar: Conta</option>
          <option value="contact">Agrupar: Contato</option>
          <option value="date">Agrupar: Data</option>
        </select>
        <select
          value={filters.density}
          onChange={(e)=>onChange({density: e.target.value as Filters['density']})}
          className="rounded-full border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
        >
          <option value="comfortable">Densidade: Confortável</option>
          <option value="compact">Densidade: Compacta</option>
        </select>
      </div>

      {/* Direita: Ações */}
      <div className="flex items-center gap-2">
         <Button onClick={() => onAction('settleToday')} variant="success">
          Baixar hoje
        </Button>
        <Button onClick={() => onAction('transfer')} variant="secondary">
          Transferir
        </Button>
        <Button onClick={() => onAction('new')} variant="primary">
          Nova Transação
        </Button>
      </div>
    </div>
  );
}