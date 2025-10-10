

import React from 'react';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CriticalCardsProps {
  vencidos: { pagar: { q: number, v: number }, receber: { q: number, v: number } };
  proximos: { pagar: number, receber: number };
  fatura: { date?: string, value?: number };
  estoque: { criticos: number };
}

const Card: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
        <div className="text-xs text-gray-400">{title}</div>
        {children}
    </div>
);

export function CriticalCards({ vencidos, proximos, fatura, estoque }: CriticalCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card title="Contas Vencidas">
        <div className="mt-1 text-gray-100">
          <div className="text-lg font-semibold text-rose-400">AP: {vencidos.pagar.q} - {brl(vencidos.pagar.v)}</div>
          <div className="text-sm text-amber-400 mt-1">AR: {vencidos.receber.q} - {brl(vencidos.receber.v)}</div>
        </div>
      </Card>
      <Card title="Próximos 7 dias">
        <div className="mt-1 text-lg text-gray-100 font-semibold">
          {brl(proximos.pagar + proximos.receber)}
        </div>
        <div className="text-[11px] text-gray-400 mt-1">
            <div>A Pagar: {brl(proximos.pagar)}</div>
            <div>A Receber: {brl(proximos.receber)}</div>
        </div>
      </Card>
      <Card title="Fatura do Cartão">
        <div className="mt-1 text-lg text-gray-100 font-semibold">{fatura.value ? brl(fatura.value) : "—"}</div>
        <div className="text-[11px] text-gray-400">{fatura.date ? `Venc. ${fatura.date}` : "Sem fatura pendente"}</div>
      </Card>
      <Card title="Estoque Crítico">
        <div className="mt-1 text-lg text-gray-100 font-semibold">{estoque.criticos}</div>
        <div className="text-[11px] text-gray-400">Produtos abaixo do mínimo</div>
      </Card>
    </div>
  );
}