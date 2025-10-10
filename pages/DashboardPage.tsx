import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { AppState, MovementKind, ProductStockType, MovementStatus, ID, Movement, Sale, Product } from '../types';
import PageTitle from '../components/ui/PageTitle';
import Button from '../components/ui/Button';
import { subDays, startOfDay, endOfDay, differenceInDays, startOfMonth, endOfMonth, isWithinInterval, format } from 'date-fns';
import FinanceTab from './Dashboard/components/FinanceTab';
import ProductsTab from './Dashboard/components/ProductsTab';
import { Page } from '../App';

type Period = { from: Date; to: Date };

// --- METRICS HOOK ---
const useDashboardMetrics = (state: AppState, period: Period) => {
    return useMemo(() => {
        const today = startOfDay(new Date());
        
        const getPreviousPeriod = (current: Period): Period => {
            const duration = differenceInDays(current.to, current.from) + 1;
            const to = subDays(current.from, 1);
            const from = subDays(to, duration - 1);
            return { from: startOfDay(from), to: endOfDay(to) };
        };

        const previousPeriod = getPreviousPeriod(period);

        const calculateFinanceMetricsForPeriod = (p: Period) => {
            const movementsInPeriod = state.movements.filter(m => isWithinInterval(new Date(m.dueDate), { start: p.from, end: p.to }));
            const settlementsInPeriod = state.settlements.filter(s => isWithinInterval(new Date(s.settlementDate), { start: p.from, end: p.to }));
            const salesInPeriod = state.sales.filter(s => isWithinInterval(new Date(s.saleDate), { start: p.from, end: p.to }));

            const cashFlowMovements = settlementsInPeriod.map(s => state.movements.find(m => m.id === s.movementId)).filter((m): m is Movement => !!m);
            const cashIn = cashFlowMovements.filter(m => m.kind === MovementKind.RECEITA).reduce((sum, m) => sum + m.amountNet, 0);
            const cashOut = cashFlowMovements.filter(m => m.kind === MovementKind.DESPESA).reduce((sum, m) => sum + m.amountNet, 0);

            const receivables = movementsInPeriod.filter(m => m.kind === MovementKind.RECEITA && m.status !== MovementStatus.Baixado).reduce((sum, m) => sum + m.amountNet, 0);
            const payables = movementsInPeriod.filter(m => m.kind === MovementKind.DESPESA && m.status !== MovementStatus.Baixado).reduce((sum, m) => sum + m.amountNet, 0);

            const salesTotal = salesInPeriod.reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
            const salesCount = salesInPeriod.length;
            const avgTicket = salesCount > 0 ? salesTotal / salesCount : 0;
            
            return { cashFlow: cashIn - cashOut, receivables, payables, avgTicket };
        };

        const currentMetrics = calculateFinanceMetricsForPeriod(period);
        const previousMetrics = calculateFinanceMetricsForPeriod(previousPeriod);

        const calculateDelta = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? Infinity : 0;
            return ((current - previous) / Math.abs(previous)) * 100;
        };
        
        // --- MINI-TABLES DATA ---
        
        // AGING
        const openMovements = state.movements.filter(m => m.status === MovementStatus.EmAberto);
        const agingReceber = { '0-7d': 0, '8-15d': 0, '16-30d': 0, '>30d': 0 };
        const agingPagar = { ...agingReceber };

        openMovements.forEach(m => {
            const diff = differenceInDays(new Date(m.dueDate), today);
            const target = m.kind === MovementKind.RECEITA ? agingReceber : agingPagar;
            if (diff >= 0 && diff <= 7) target['0-7d'] += m.amountNet;
            else if (diff >= 8 && diff <= 15) target['8-15d'] += m.amountNet;
            else if (diff >= 16 && diff <= 30) target['16-30d'] += m.amountNet;
            else if (diff > 30) target['>30d'] += m.amountNet;
        });

        // RECENT TRANSACTIONS
        const recentTransactions = [...state.movements]
            .sort((a,b) => new Date(b.paidDate || b.dueDate).getTime() - new Date(a.paidDate || a.dueDate).getTime())
            .slice(0, 5)
            .map(m => ({
                id: m.id,
                date: new Date((m.paidDate || m.dueDate) + 'T00:00:00Z').toLocaleDateString('pt-BR'),
                desc: m.description,
                type: m.kind,
                value: m.amountNet * (m.kind === MovementKind.DESPESA ? -1 : 1),
                status: m.status || 'Pendente'
            }));

        // TOP SOLD PRODUCTS
        const salesInPeriod = state.sales.filter(s => isWithinInterval(new Date(s.saleDate), { start: period.from, end: period.to }));
        const soldMap = salesInPeriod.reduce((acc, sale) => {
            const entry = acc.get(sale.productId) || { id: sale.productId, qty: 0, revenue: 0, profit: 0 };
            const product = state.products.find(p => p.id === sale.productId);
            
            const saleUnitCost = (() => {
                if (sale.purchaseMovementId) {
                    const purchaseMovement = state.movements.find(m => m.id === sale.purchaseMovementId);
                    if (purchaseMovement && sale.quantity > 0) {
                        return purchaseMovement.amountGross / sale.quantity;
                    }
                }
                return product?.cost || 0;
            })();

            const receita = (sale.quantity * sale.unitPrice) - sale.discount + sale.freight;
            const custo = (sale.quantity * saleUnitCost) + sale.tax + (sale.additionalCost || 0);
            const lucro = receita - custo;

            entry.qty += sale.quantity;
            entry.revenue += receita;
            entry.profit += lucro;
            
            acc.set(sale.productId, entry);
            return acc;
        }, new Map<ID, {id: ID, qty: number, revenue: number, profit: number}>());

        const soldAggregated = Array.from(soldMap.values()).map(item => {
            const product = state.products.find(p => p.id === item.id);
            return {
                ...item,
                name: product?.name || 'N/A',
                margin: item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0,
            };
        });

        const topSold = [...soldAggregated].sort((a,b) => b.qty - a.qty).slice(0, 5);
        const topMargin = [...soldAggregated].sort((a,b) => b.margin - a.margin).slice(0, 5);
        
        const stockValue = state.warehouseStock.reduce((sum, item) => {
            const product = state.products.find(p => p.id === item.productId);
            return sum + (item.quantity * (product?.cost || 0));
        }, 0);

        const itemsBelowMinStock = state.products.filter(p => {
            if (p.stockType !== ProductStockType.Estoque || !p.minStock || p.minStock <= 0) return false;
            const stockQty = state.warehouseStock.filter(ws => ws.productId === p.id).reduce((sum, ws) => sum + ws.quantity, 0);
            return stockQty < p.minStock;
        }).length;

        const finance = {
            cashFlow: currentMetrics.cashFlow,
            receivables: currentMetrics.receivables,
            payables: currentMetrics.payables,
            avgTicket: currentMetrics.avgTicket,
            cashFlowDelta: calculateDelta(currentMetrics.cashFlow, previousMetrics.cashFlow),
            receivablesDelta: calculateDelta(currentMetrics.receivables, previousMetrics.receivables),
            payablesDelta: calculateDelta(currentMetrics.payables, previousMetrics.payables),
            avgTicketDelta: calculateDelta(currentMetrics.avgTicket, previousMetrics.avgTicket),
            agingReceber,
            agingPagar,
            recentTransactions
        };
        
        const products = {
            activeItems: state.products.filter(p => p.isActive).length,
            stockValue,
            itemsBelowMinStock,
            avgMargin: soldAggregated.length > 0 ? soldAggregated.reduce((sum, p) => sum + p.margin, 0) / soldAggregated.length : 0,
            topSold,
            topMargin
        };

        return { finance, products };
    }, [state, period]);
};


interface DashboardPageProps {
    setActivePage: (page: Page) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ setActivePage }) => {
    const { state } = useData();
    const [activeTab, setActiveTab] = useState<'financeiro' | 'produtos'>('financeiro');
    const [period, setPeriod] = useState<Period>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const metrics = useDashboardMetrics(state, period);

    const handleSetPeriod = (type: '7d' | '30d' | 'month') => {
        const to = endOfDay(new Date());
        let from: Date;
        switch (type) {
            case '7d': from = startOfDay(subDays(to, 6)); break;
            case '30d': from = startOfDay(subDays(to, 29)); break;
            case 'month': 
            default:
                from = startOfMonth(new Date());
                break;
        }
        setPeriod({ from, to });
    };

    const periodChips: {label: string, key: '7d'|'30d'|'month'}[] = [
        { label: 'Mês Atual', key: 'month' },
        { label: 'Últimos 30 dias', key: '30d' },
        { label: 'Últimos 7 dias', key: '7d' },
    ];
    
    const isPeriodActive = (key: '7d' | '30d' | 'month'): boolean => {
        const to = endOfDay(new Date());
        let from: Date;
        if (key === '7d') from = startOfDay(subDays(to, 6));
        else if (key === '30d') from = startOfDay(subDays(to, 29));
        else from = startOfMonth(new Date());
        
        // Check if both start and end dates of the period match the preset
        const periodEnd = endOfDay(period.to);
        const presetEnd = key === 'month' ? endOfMonth(new Date()) : to;

        return period.from.getTime() === from.getTime() && periodEnd.getTime() === presetEnd.getTime();
    }

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // The value from date input is a string 'YYYY-MM-DD'. new Date() parses it as UTC midnight.
        // To avoid timezone issues, we'll work with the date strings and construct dates carefully.
        setPeriod(prev => ({
            ...prev,
            [name]: new Date(value + 'T00:00:00')
        }));
    }

    return (
        <div className="space-y-6">
            <PageTitle 
                title="Dashboard" 
                actions={
                    <div className="flex items-center gap-2 flex-wrap">
                        {periodChips.map(({label, key}) => (
                           <Button 
                             key={key} 
                             variant="chip" 
                             data-active={isPeriodActive(key)}
                             onClick={() => handleSetPeriod(key)}
                            >{label}</Button>
                        ))}
                        <div className="flex items-center gap-2">
                            <input type="date" name="from" value={format(period.from, 'yyyy-MM-dd')} onChange={handleDateChange} className="h-8 rounded-full bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 px-3 text-sm" />
                            <span className="text-gray-400 text-sm">até</span>
                            <input type="date" name="to" value={format(period.to, 'yyyy-MM-dd')} onChange={handleDateChange} className="h-8 rounded-full bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 px-3 text-sm" />
                        </div>
                    </div>
                }
            />

            <div className="flex items-center gap-2 border-b border-gray-700">
                <Button 
                    variant="ghost" 
                    className={`border-b-2 rounded-none !rounded-t-md ${activeTab === 'financeiro' ? 'border-sky-500 text-sky-400' : 'border-transparent'}`}
                    onClick={() => setActiveTab('financeiro')}>
                    Financeiro
                </Button>
                <Button 
                    variant="ghost" 
                    className={`border-b-2 rounded-none !rounded-t-md ${activeTab === 'produtos' ? 'border-sky-500 text-sky-400' : 'border-transparent'}`}
                    onClick={() => setActiveTab('produtos')}>
                    Produtos
                </Button>
            </div>
            
            <div>
                {activeTab === 'financeiro' && <FinanceTab metrics={metrics.finance} setActivePage={setActivePage} />}
                {activeTab === 'produtos' && <ProductsTab metrics={metrics.products} setActivePage={setActivePage} />}
            </div>
        </div>
    );
};

export default DashboardPage;