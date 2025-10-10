

import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { Page } from '../../App';
import PageTitle from '../../components/ui/PageTitle';
import Button from '../../components/ui/Button';
import { QuickActions } from './components/QuickActions';
import { CriticalCards } from './components/CriticalCards';
import { FlowsAndRecents } from './components/FlowsAndRecents';
import { AlertsPanel, Alert } from './components/AlertsPanel';
import SaleFormModal from '../../components/SaleFormModal';
import NewMovementModal from '../../src/pages/Movements/NewMovementModal';
import ProductFormModal from '../../components/ProductFormModal';
import ContactFormModal from '../../components/ContactFormModal';
import { Movement, MovementKind, MovementStatus, ProductStockType, SaleTrackingStatus, AccountType, ID, Product } from '../../types';
import { getInvoiceData } from '../../src/lib/creditCard';
import { format, addDays, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Eye } from 'lucide-react';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const useHomeMetrics = (period: 'today' | '7d' | '30d', setActivePage: (page: Page) => void) => {
    const { state } = useData();

    return useMemo(() => {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');

        // --- Critical Cards Data ---
        const overdueMovements = state.movements.filter(m => m.status === MovementStatus.EmAberto && m.dueDate < todayStr);
        const vencidos = {
            pagar: overdueMovements.filter(m => m.kind === MovementKind.DESPESA).reduce((acc, m) => ({ q: acc.q + 1, v: acc.v + m.amountNet }), { q: 0, v: 0 }),
            receber: overdueMovements.filter(m => m.kind === MovementKind.RECEITA).reduce((acc, m) => ({ q: acc.q + 1, v: acc.v + m.amountNet }), { q: 0, v: 0 }),
        };

        const sevenDaysFromNow = format(addDays(today, 7), 'yyyy-MM-dd');
        const upcomingMovements = state.movements.filter(m => m.status === MovementStatus.EmAberto && m.dueDate >= todayStr && m.dueDate <= sevenDaysFromNow);
        const proximos = {
            pagar: upcomingMovements.filter(m => m.kind === MovementKind.DESPESA).reduce((sum, m) => sum + m.amountNet, 0),
            receber: upcomingMovements.filter(m => m.kind === MovementKind.RECEITA).reduce((sum, m) => sum + m.amountNet, 0),
        };

        const cardAccounts = state.accounts.filter(a => a.type === AccountType.Cartao);
        let nextInvoice: { date?: string, value?: number } = { date: undefined, value: undefined };
        if (cardAccounts.length > 0) {
            const invoices = cardAccounts.map(card => getInvoiceData(state.movements, card, today)).filter(Boolean);
            const next = invoices.sort((a, b) => a!.dueDate.getTime() - b!.dueDate.getTime())[0];
            if (next) {
                nextInvoice = { date: format(next.dueDate, 'dd/MM/yy'), value: next.total };
            }
        }

        const stockByProduct = state.warehouseStock.reduce((acc, ws) => {
            acc[ws.productId] = (acc[ws.productId] || 0) + ws.quantity;
            return acc;
        }, {} as Record<string, number>);
        
        const produtosEstoqueCritico = state.products.filter(p => p.isActive && p.stockType === ProductStockType.Estoque && (stockByProduct[p.id] || 0) <= (p.minStock || 0));
        const estoqueCriticoCount = produtosEstoqueCritico.length;

        // --- Flows & Recents Data ---
        const produtosEmAcompanhamento = state.sales
            .filter(s => s.status !== SaleTrackingStatus.Entregue)
            .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
            .slice(0, 5)
            .map(s => {
                const product = state.products.find(p => p.id === s.productId);
                return { id: s.id, name: product?.name || 'N/A', status: s.status };
            });

        const transacoesPendentes = [...state.movements]
            .filter(m => m.status !== MovementStatus.Baixado) // Filter for pending/overdue
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) // Sort by due date ascending
            .slice(0, 5)
            .map(t => {
                let status = t.status || MovementStatus.EmAberto;
                if (status === MovementStatus.EmAberto && t.dueDate < todayStr) {
                    status = MovementStatus.Vencido;
                }
                return {
                    id: t.id,
                    date: format(new Date(t.dueDate + 'T12:00:00Z'), 'dd/MM'),
                    desc: t.description,
                    value: t.kind === MovementKind.DESPESA ? -t.amountNet : t.amountNet,
                    status: status,
                };
            });

        // --- Alerts Panel Data ---
        const alerts: Alert[] = [];
        if (vencidos.pagar.q > 0) alerts.push({ kind: 'payOverdue', text: `${vencidos.pagar.q} pagamentos atrasados (${brl(vencidos.pagar.v)})`, onClick: () => setActivePage('Transações') });
        if (vencidos.receber.q > 0) alerts.push({ kind: 'recvOverdue', text: `${vencidos.receber.q} recebimentos atrasados (${brl(vencidos.receber.v)})`, onClick: () => setActivePage('Transações') });
        
        const productsNoStock = state.products.filter(p => p.stockType === ProductStockType.Estoque && (stockByProduct[p.id] || 0) <= 0).length;
        if (productsNoStock > 0) alerts.push({ kind: 'noStock', text: `${productsNoStock} produtos sem estoque`, onClick: () => setActivePage('Todos os Produtos') });
        
        if (nextInvoice.value) alerts.push({ kind: 'cardPending', text: `Fatura de cartão pendente`, onClick: () => setActivePage('Despesas do Cartão') });

        return {
            criticals: { vencidos, proximos, fatura: nextInvoice, estoque: { criticos: estoqueCriticoCount, produtos: produtosEstoqueCritico } },
            flows: { produtosFluxo: produtosEmAcompanhamento, transacoesPendentes },
            alerts,
        };
    }, [state, period, setActivePage]);
};


interface HomePageProps {
    setActivePage: (page: Page) => void;
    setViewingProductId: (id: ID) => void;
}

const HomePage: React.FC<HomePageProps> = ({ setActivePage, setViewingProductId }) => {
    const [period, setPeriod] = useState<'today' | '7d' | '30d'>('today');
    const { criticals, flows, alerts } = useHomeMetrics(period, setActivePage);
    const [modals, setModals] = useState({ sale: false, transaction: false, product: false, contact: false });

    const openModal = (modal: keyof typeof modals) => setModals(prev => ({ ...prev, [modal]: true }));
    const closeModal = (modal: keyof typeof modals) => setModals(prev => ({ ...prev, [modal]: false }));
    
    const handleViewProduct = (productId: ID) => {
        setViewingProductId(productId);
        setActivePage('Detalhe do Produto');
    };

    const handleViewSale = (saleId: ID) => {
        // For now, just navigates to the tracking page. A deep link could be implemented later.
        setActivePage('Acompanhamento');
    };

    return (
        <div className="space-y-6">
            <PageTitle
                title="Home"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="chip" active={period === 'today'} onClick={() => setPeriod('today')}>Hoje</Button>
                        <Button variant="chip" active={period === '7d'} onClick={() => setPeriod('7d')}>7d</Button>
                        <Button variant="chip" active={period === '30d'} onClick={() => setPeriod('30d')}>30d</Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                        <QuickActions
                            onNewSale={() => openModal('sale')}
                            onNewTxn={() => openModal('transaction')}
                            onNewProduct={() => openModal('product')}
                            onNewContact={() => openModal('contact')}
                        />
                    </div>
                    <CriticalCards {...criticals} />
                    {criticals.estoque.produtos.length > 0 && (
                        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                            <div className="text-sm text-gray-200 font-medium mb-2">Itens com Estoque Crítico</div>
                            <ul className="space-y-2">
                                {criticals.estoque.produtos.map(p => (
                                    <li key={p.id} className="flex items-center justify-between text-sm text-gray-200">
                                        <span className="truncate pr-2">{p.name}</span>
                                        <button onClick={() => handleViewProduct(p.id)} className="text-sky-400 hover:text-sky-300 flex items-center gap-1 text-xs">
                                            <Eye size={14} /> Ver item
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <FlowsAndRecents transacoesPendentes={flows.transacoesPendentes} />
                    <AlertsPanel alerts={alerts} />
                    <FlowsAndRecents produtosFluxo={flows.produtosFluxo} onViewSale={handleViewSale} />
                </div>
            </div>

            {/* Modals */}
            {modals.sale && <SaleFormModal isOpen={modals.sale} onClose={() => closeModal('sale')} sale={null} />}
            {modals.transaction && <NewMovementModal open={modals.transaction} onClose={() => closeModal('transaction')} onSaved={() => closeModal('transaction')} movementToEdit={null} />}
            {modals.product && <ProductFormModal isOpen={modals.product} onClose={() => closeModal('product')} product={null} />}
            {modals.contact && <ContactFormModal isOpen={modals.contact} onClose={() => closeModal('contact')} contactToEdit={null} />}
        </div>
    );
};

export default HomePage;