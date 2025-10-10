import { Calendar, Filter, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

type Filters = {
  tab: 'TODOS'|'RECEBER'|'PAGAR';
  includePaid: boolean;
  origin: 'Todas'|'Receita'|'Despesa'|'Transferência';
  dateFrom?: string;
  dateTo?: string;
  q?: string;
};
type Props = {
  value: Filters;
  onChange: (v: Partial<Filters>) => void;
  onReset: () => void;
};

export default function FiltersBar({ value, onChange, onReset }: Props) {
  return (
    <div className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60">
      <div className="flex flex-wrap items-center gap-2 p-3">
        {/* Chips */}
        {(['TODOS','RECEBER','PAGAR'] as const).map(t => (
          <button key={t}
            onClick={() => onChange({ tab: t })}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              value.tab === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}>
            {t === 'TODOS' ? 'Todos' : t === 'RECEBER' ? 'À Receber' : 'À Pagar'}
          </button>
        ))}

        {/* Origem */}
        <div className="ml-1">
          <select
            value={value.origin}
            onChange={e => onChange({ origin: e.target.value as any })}
            className="rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm text-slate-200">
            <option>Todas</option>
            <option>Receita</option>
            <option>Despesa</option>
            <option>Transferência</option>
          </select>
        </div>

        {/* Datas */}
        <div className="flex items-center gap-2">
          <InputDate label="de" value={value.dateFrom} onChange={v => onChange({ dateFrom: v })}/>
          <InputDate label="até" value={value.dateTo} onChange={v => onChange({ dateTo: v })}/>
        </div>

        {/* Busca */}
        <input
          placeholder="Buscar descrição..."
          value={value.q ?? ''}
          onChange={e => onChange({ q: e.target.value })}
          className="ml-1 w-56 rounded-md bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-500" />

        {/* Include paid */}
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={value.includePaid} onChange={e => onChange({ includePaid: e.target.checked })}/>
          Incluir baixados
        </label>

        <button onClick={onReset}
          className="flex items-center gap-1 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800">
          <RefreshCcw size={14}/> Limpar filtros
        </button>
      </div>
    </div>
  );
}

function InputDate({ label, value, onChange }: { label: string; value?: string; onChange: (v?: string)=>void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-slate-400">{label}</span>
      <div className="flex items-center rounded-md bg-slate-900 border border-slate-700 px-2">
        <Calendar size={14} className="text-slate-400 mr-1"/>
        <input
          type="date"
          value={value ?? ''}
          onChange={e => onChange(e.target.value || undefined)}
          className="bg-transparent text-sm text-slate-200 outline-none py-1.5"/>
      </div>
    </div>
  );
}