import React from 'react';
import { KpiCard } from '../KpiCard';

export type SummaryTotals = {
  inflow: number;
  outflow: number;
  net: number;
  initialBalance: number;
  currentBalance: number;
  projectedBalance: number;
  deltas: {
      inflow?: number;
      outflow?: number;
      net?: number;
  }
};

interface AccountSummaryCardsProps {
  totals: SummaryTotals;
}

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const AccountSummaryCards: React.FC<AccountSummaryCardsProps> = ({ totals }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <KpiCard title="Saldo Inicial (Período)" value={formatCurrency(totals.initialBalance)} />
      <KpiCard title="Entradas (Período)" value={formatCurrency(totals.inflow)} deltaPct={totals.deltas.inflow} tone="positive" />
      <KpiCard title="Saídas (Período)" value={formatCurrency(totals.outflow)} deltaPct={totals.deltas.outflow} tone="negative" />
      <KpiCard title="Saldo Atual (Real)" value={formatCurrency(totals.currentBalance)} tone={totals.currentBalance >= 0 ? 'positive' : 'negative'} />
      <KpiCard title="Saldo Projetado (Período)" value={formatCurrency(totals.projectedBalance)} />
    </div>
  );
};

export default AccountSummaryCards;
