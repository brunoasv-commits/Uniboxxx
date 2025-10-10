
import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { MiniTable } from './MiniTable';
import { Page } from '../../../App';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TrendBadge: React.FC<{ value: number }> = ({ value }) => {
    if (!isFinite(value)) return <span className="trend-badge positive">Novo</span>;
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
        <span className={`trend-badge ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(value).toFixed(1)}%
        </span>
    );
};

const KpiCard: React.FC<{ title: string; value: string; delta?: number; hint?: string; }> = ({ title, value, delta, hint }) => {
    return (
        <div className="kpi-card flex flex-col">
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-3xl font-semibold text-gray-100 mt-1">{value}</p>
            {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
            <div className="mt-auto pt-2">
                {typeof delta === 'number' && <TrendBadge value={delta} />}
            </div>
        </div>
    );
};

interface FinanceTabProps {
    metrics: any;
    setActivePage: (page: Page) => void;
}

const FinanceTab: React.FC<FinanceTabProps> = ({ metrics, setActivePage }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
                title="Fluxo de Caixa no Período" 
                value={formatCurrency(metrics.cashFlow)}
                delta={metrics.cashFlowDelta}
                hint="Recebimentos vs. Pagamentos"
            />
            <KpiCard 
                title="A Receber (Em Aberto)" 
                value={formatCurrency(metrics.receivables)}
                delta={metrics.receivablesDelta}
                hint="Vencendo no período"
            />
            <KpiCard 
                title="A Pagar (Em Aberto)" 
                value={formatCurrency(metrics.payables)}
                delta={metrics.payablesDelta}
                hint="Vencendo no período"
            />
            <KpiCard 
                title="Ticket Médio" 
                value={formatCurrency(metrics.avgTicket)}
                delta={metrics.avgTicketDelta}
                hint="Valor médio por venda"
            />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MiniTable
                title="Aging — A Receber / A Pagar"
                columns={[
                    {key:'faixa',label:''},
                    {key:'d0_7',label:'0–7d',align:'right'},
                    {key:'d8_15',label:'8–15d',align:'right'},
                    {key:'d16_30',label:'16–30d',align:'right'},
                    {key:'d30p',label:'>30d',align:'right'}
                ]}
                rows={[
                    { faixa:'A Receber', d0_7: formatCurrency(metrics.agingReceber['0-7d']), d8_15: formatCurrency(metrics.agingReceber['8-15d']), d16_30: formatCurrency(metrics.agingReceber['16-30d']), d30p: formatCurrency(metrics.agingReceber['>30d']) },
                    { faixa:'A Pagar',   d0_7: formatCurrency(metrics.agingPagar['0-7d']), d8_15: formatCurrency(metrics.agingPagar['8-15d']), d16_30: formatCurrency(metrics.agingPagar['16-30d']), d30p: formatCurrency(metrics.agingPagar['>30d']) },
                ]}
                onMore={() => setActivePage('Transações')}
            />
            <MiniTable
                title="Transações Recentes"
                columns={[
                    {key:'date',label:'Data'},
                    {key:'desc',label:'Descrição'},
                    {key:'type',label:'Tipo'},
                    {key:'value',label:'Valor',align:'right'},
                    {key:'status',label:'Status'}
                ]}
                rows={metrics.recentTransactions.map((t: any) => ({
                    ...t,
                    value: formatCurrency(t.value),
                }))}
                onMore={() => setActivePage('Transações')}
            />
        </div>
    </div>
);

export default FinanceTab;
