

import React from 'react';
import { SaleTrackingStatus } from '../../../types';
import { Eye } from 'lucide-react';

interface FlowsAndRecentsProps {
  produtosFluxo?: Array<{ id: string; name: string; status: string }>;
  onViewSale?: (saleId: string) => void;
  transacoesPendentes?: Array<{ id: string; date: string; desc: string; value: number; status: string }>;
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusColors: Record<string, string> = {
    [SaleTrackingStatus.VendaRealizada]: 'text-gray-400',
    [SaleTrackingStatus.ComprarItem]: 'text-amber-400',
    // Fix: Corrected enum member from 'AguardandoRastreio' to 'AguardandoEnvio'.
    [SaleTrackingStatus.AguardandoEnvio]: 'text-blue-400',
    [SaleTrackingStatus.AguardandoEntrega]: 'text-violet-400',
    [SaleTrackingStatus.Entregue]: 'text-emerald-400',
}

export function FlowsAndRecents({ produtosFluxo, onViewSale, transacoesPendentes }: FlowsAndRecentsProps) {
  if (produtosFluxo) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="text-sm text-gray-200 font-medium mb-2">Produtos em Acompanhamento</div>
        <ul className="space-y-2">
          {produtosFluxo.map(p => (
            <li key={p.id} className="flex items-center justify-between text-sm text-gray-200 gap-4">
              <span className="truncate pr-2 min-w-0">{p.name}</span>
               <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium shrink-0 ${statusColors[p.status] || 'text-gray-400'}`}>{p.status}</span>
                    {onViewSale && (
                        <button onClick={() => onViewSale(p.id)} className="text-sky-400 hover:text-sky-300 shrink-0">
                            <Eye size={16} />
                        </button>
                    )}
                </div>
            </li>
          ))}
          {produtosFluxo.length === 0 && <div className="text-xs text-gray-500 text-center py-2">Sem itens no momento.</div>}
        </ul>
      </div>
    );
  }

  if (transacoesPendentes) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="text-sm text-gray-200 font-medium mb-2">Transações Pendentes</div>
        <ul className="space-y-2">
          {transacoesPendentes.map(t => (
            <li key={t.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-gray-400 shrink-0">{t.date}</span>
                    <span className="text-gray-200 truncate">{t.desc}</span>
                </div>
                <span className={`font-medium shrink-0 ${t.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{brl(t.value)}</span>
            </li>
          ))}
           {transacoesPendentes.length === 0 && <div className="text-xs text-gray-500 text-center py-2">Nenhuma transação pendente.</div>}
        </ul>
      </div>
    );
  }

  return null;
}
