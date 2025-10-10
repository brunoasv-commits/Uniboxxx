

import React from 'react';
import { Account, MovementKind, MovementStatus, Category, ID } from '../../../types';
import { CalendarDays, Search, Download, Brush } from "lucide-react";


export type FiltersState = {
  accountId: string;
  dateFrom: string;
  dateTo: string;
  status: 'ALL' | MovementStatus;
  type: string; // Can be 'ALL', MovementKind, or a category ID
  query: string;
};

interface AccountFiltersBarProps {
  status: 'ALL' | MovementStatus;
  type: string;
  from: string;
  to: string;
  query: string;
  onChangeStatus: (v: 'ALL' | MovementStatus) => void;
  onChangeType: (v: string) => void;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
  onChangeQuery: (v: string) => void;
  onPreset: (p: "today" | "7d" | "30d" | "month") => void;
  onClear: () => void;
  onExportCsv: () => void;
  accounts: Account[];
  accountId: string;
  onChangeAccount: (id: string) => void;
  categories: Category[];
}

export function AccountFiltersBar({
  status, type, from, to, query,
  onChangeStatus, onChangeType, onChangeFrom, onChangeTo, onChangeQuery,
  onPreset, onClear, onExportCsv,
  accounts, accountId, onChangeAccount, categories
}: AccountFiltersBarProps) {
    
  return (
    <div className="rounded-2xl border border-white/10 bg-gray-900/60 shadow-xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
        <select
          value={accountId}
          onChange={(e) => onChangeAccount(e.target.value)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-gray-100"
        >
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <div className="flex gap-2">
          {[
            { label: "Hoje", key: "today" },
            { label: "7d", key: "7d" },
            { label: "30d", key: "30d" },
            { label: "Mês", key: "month" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => onPreset(p.key as any)}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onClear} className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10" title="Limpar filtros">
            <Brush size={14} /> Limpar
          </button>
          <button onClick={onExportCsv} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500" title="Exportar CSV">
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-12">
        <div className="md:col-span-2">
          <select value={status} onChange={(e) => onChangeStatus(e.target.value as any)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100">
            <option value="ALL">Todos</option>
            <option value={MovementStatus.EmAberto}>Pendentes</option>
            <option value={MovementStatus.Baixado}>Baixados</option>
            <option value={MovementStatus.Vencido}>Vencidos</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <select value={type} onChange={(e) => onChangeType(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-100">
            <option value="ALL">Todos os Tipos</option>
            <option value={MovementKind.RECEITA}>Receitas</option>
            <option value={MovementKind.DESPESA}>Despesas</option>
            <option value={MovementKind.TRANSFERENCIA}>Transferências</option>
            <optgroup label="Categorias">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          </select>
        </div>
        <div className="md:col-span-2">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input type="date" value={from} onChange={(e) => onChangeFrom(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-gray-100" />
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input type="date" value={to} onChange={(e) => onChangeTo(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-gray-100" />
          </div>
        </div>
        <div className="md:col-span-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input placeholder="Buscar descrição…" value={query} onChange={(e) => onChangeQuery(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-gray-100 placeholder:text-gray-500" />
          </div>
        </div>
      </div>
    </div>
  );
}