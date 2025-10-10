
import React from 'react';
import { ChevronDown, Settings2 } from 'lucide-react';
import { Filters } from '../types';

type Props = {
  filters: Filters;
  onFiltersChange: (patch: Partial<Filters>) => void;
};

export function ViewOptionsMenu({ filters, onFiltersChange }: Props) {
  return (
    <div className="relative">
      <details className="group">
        <summary className="list-none cursor-pointer">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 hover:bg-white/10">
            <Settings2 size={16} /> Exibir <ChevronDown size={14} className="opacity-60 group-open:rotate-180 transition-transform" />
          </div>
        </summary>
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-gray-900/95 p-3 shadow-xl backdrop-blur-md z-10">
          <div className="text-xs text-gray-400 mb-2">Opções de Visualização</div>
          <label className="flex items-center gap-2 text-sm text-gray-200 p-1">
            <input
              type="checkbox"
              checked={filters.includeSettled}
              onChange={(e) => onFiltersChange({ includeSettled: e.target.checked })}
            />
            Incluir baixados
          </label>
          <div className="mt-3 text-sm">
             <div className="text-gray-400 text-xs px-1">Status</div>
             <select
                value={filters.status || 'ALL'}
                onChange={(e) => onFiltersChange({ status: e.target.value as any })}
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-sm text-gray-200"
              >
                <option value="ALL">Todos</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="VENCIDO">Vencidos</option>
                <option value="BAIXADO">Baixados</option>
              </select>
          </div>
          <div className="mt-3 text-sm">
             <div className="text-gray-400 text-xs px-1">Tipo</div>
             <select
                value={filters.kind || 'ALL'}
                onChange={(e) => onFiltersChange({ kind: e.target.value as any })}
                className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-sm text-gray-200"
              >
                <option value="ALL">Todos</option>
                <option value="RECEITA">Receitas</option>
                <option value="DESPESA">Despesas</option>
                <option value="TRANSFERENCIA">Transferências</option>
              </select>
          </div>
          <div className="mt-3 text-sm">
            <div className="text-gray-400 text-xs px-1">Densidade</div>
            <div className="mt-1 flex gap-2">
              {(['comfortable', 'compact'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => onFiltersChange({ density: d })}
                  className={`px-2 py-1 rounded-lg border text-xs capitalize ${
                    filters.density === d ? "border-sky-500 text-sky-300 bg-sky-500/10" : "border-white/10 text-gray-300"
                  }`}
                >{d === 'comfortable' ? 'Confortável' : 'Compacta'}</button>
              ))}
            </div>
          </div>
          <div className="mt-3 text-sm">
            <div className="text-gray-400 text-xs px-1">Agrupar por</div>
            <select
              value={filters.groupBy}
              onChange={(e) => onFiltersChange({ groupBy: e.target.value as any })}
              className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-sm text-gray-200"
            >
              <option value="none">Nenhum</option>
              <option value="account">Conta</option>
              <option value="category">Categoria</option>
              <option value="contact">Contato</option>
              <option value="date">Data</option>
            </select>
          </div>
        </div>
      </details>
    </div>
  );
}
