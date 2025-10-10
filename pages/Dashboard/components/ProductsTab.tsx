

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


interface ProductsTabProps {
    metrics: any;
    setActivePage: (page: Page) => void;
}

const ProductsTab: React.FC<ProductsTabProps> = ({ metrics, setActivePage }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
                title="Itens Ativos" 
                value={metrics.activeItems.toString()}
                hint="Produtos disponíveis para venda"
            />
            <KpiCard 
                title="Estoque Valorizado" 
                value={formatCurrency(metrics.stockValue)}
                hint="Custo total do estoque"
            />
            <KpiCard 
                title="Itens Abaixo do Mínimo" 
                value={metrics.itemsBelowMinStock.toString()}
                hint="Produtos que precisam de reposição"
            />
            <KpiCard 
                title="Margem Média Estimada" 
                value={`${metrics.avgMargin.toFixed(1)}%`}
                hint="Lucratividade média"
            />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MiniTable
                title="Top 5 Mais Vendidos"
                columns={[{key:'name',label:'Produto'},{key:'qty',label:'Qtd',align:'right'},{key:'rev',label:'Receita',align:'right'}]}
                rows={metrics.topSold.map((p: any) => ({ name:p.name, qty:p.qty, rev: formatCurrency(p.revenue) }))}
                onMore={() => setActivePage('Vendas')}
                empty="Sem vendas no período."
            />
            <MiniTable
                title="Top 5 Melhor Margem"
                columns={[{key:'name',label:'Produto'},{key:'margin',label:'Margem',align:'right'},{key:'lucro',label:'Lucro',align:'right'}]}
                rows={metrics.topMargin.map((p: any) => ({ name:p.name, margin:`${p.margin.toFixed(1)}%`, lucro: formatCurrency(p.profit) }))}
                onMore={() => setActivePage('Todos os Produtos')}
                empty="Sem vendas no período."
            />
        </div>
    </div>
);

export default ProductsTab;