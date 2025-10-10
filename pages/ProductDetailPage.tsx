import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { ID, Product, Sale, StockPurchase, ProductStockType, Movement, SaleTrackingStatus } from '../types';
import { Page } from '../App';
import SaleFormModal from '../components/SaleFormModal';
import MakeAvailableModal from '../components/MakeAvailableModal';
import PageTitle from '../components/ui/PageTitle';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const daysAgo = (dateStr?: string) => {
    if (!dateStr) return Infinity;
    return (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 3600 * 24);
};

const KPICard: React.FC<{ title: string; value: string | number; description?: string; colorClass?: string }> = ({ title, value, description, colorClass = '' }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
        {description && <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>}
    </div>
);

const ValeAPenaBadge: React.FC<{ status: 'green' | 'yellow' | 'red' }> = ({ status }) => {
    const config = {
        green: { text: 'Vale a pena manter', color: 'bg-green-500/15 text-green-400' },
        yellow: { text: 'Requer atenção', color: 'bg-yellow-500/15 text-yellow-400' },
        red: { text: 'Considerar descontinuar', color: 'bg-red-500/15 text-red-400' },
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${config[status].color}`}>{config[status].text}</span>;
}


interface ProductDetailPageProps {
    productId: ID;
    onBack: () => void;
    navigateTo: (page: Page) => void;
}

const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ productId, onBack, navigateTo }) => {
    const { state } = useData();
    const [activeTab, setActiveTab] = useState<'geral' | 'vendas' | 'compras' | 'movimentacoes'>('geral');
    const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
    const [isMakeAvailableModalOpen, setIsMakeAvailableModalOpen] = useState(false);

    const productData = useMemo(() => {
        const product = state.products.find(p => p.id === productId);
        if (!product) return null;

        const sales = state.sales.filter(s => s.productId === productId);
        
        // Combine stock purchases and dropshipping purchases
        const stockPurchases = state.stockPurchases.filter(p => p.productId === productId).map(p => {
            const warehouse = state.contacts.find(c => c.id === p.warehouseId);
            return {
                id: p.id,
                purchaseDate: p.purchaseDate,
                warehouseName: warehouse?.name || 'N/A',
                quantity: p.quantity,
                unitCost: p.unitCost,
            };
        });

        const dropshippingSales = state.sales.filter(s => s.productId === productId && s.purchaseMovementId);
        const dropshippingPurchases = dropshippingSales.map(sale => {
            const movement = state.movements.find(m => m.id === sale.purchaseMovementId);
            if (!movement || sale.quantity <= 0) return null;
            const customer = state.contacts.find(c => c.id === sale.customerId);
            return {
                id: sale.id, // Use sale id for key
                purchaseDate: movement.dueDate,
                warehouseName: `Dropship p/ ${customer?.name || 'cliente'}`,
                quantity: sale.quantity,
                unitCost: movement.amountGross / sale.quantity,
            };
        }).filter((p): p is NonNullable<typeof p> => p !== null);

        const allPurchases = [...stockPurchases, ...dropshippingPurchases]
            .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

        const stockEntries = state.warehouseStock.filter(ws => ws.productId === productId);
        
        const currentStock = stockEntries.reduce((sum, entry) => sum + entry.quantity, 0);

        const sales30d = sales.filter(s => daysAgo(s.saleDate) <= 30);
        const unitsSold30d = sales30d.reduce((sum, s) => sum + s.quantity, 0);
        const avgDailySales30d = unitsSold30d / 30;
        const doh = avgDailySales30d > 0 ? currentStock / avgDailySales30d : Infinity;

        let totalRevenue = 0;
        let totalCostOfGoodsSold = 0;

        sales.forEach(s => {
            const receita = (s.quantity * s.unitPrice) + s.freight - s.discount;
            totalRevenue += receita;

            const saleUnitCost = (() => {
                if (s.purchaseMovementId) {
                    const purchaseMovement = state.movements.find(m => m.id === s.purchaseMovementId);
                    if (purchaseMovement && s.quantity > 0) {
                        return purchaseMovement.amountGross / s.quantity;
                    }
                }
                return product.cost || 0;
            })();
            
            const custo = (saleUnitCost * s.quantity) + s.tax + (s.additionalCost || 0);
            totalCostOfGoodsSold += custo;
        });

        const totalProfit = totalRevenue - totalCostOfGoodsSold;
        const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        
        // Simplified avg stock value for GMROI
        const avgStockValue = allPurchases.length > 0
            ? allPurchases.reduce((sum, p) => sum + (p.quantity * p.unitCost), 0) / allPurchases.length
            : currentStock * product.cost;

        const gmroi = avgStockValue > 0 ? totalProfit / avgStockValue : 0;
        
        const lastSale = sales.sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())[0];
        const lastPurchase = allPurchases[0];
        
        let worthItStatus: 'green' | 'yellow' | 'red' = 'yellow';
        if (avgMargin >= 25 && gmroi >= 1.5) worthItStatus = 'green';
        if (avgMargin < 10) worthItStatus = 'red';

        return {
            product, sales, purchases: allPurchases, currentStock, totalProfit, avgMargin,
            kpis: {
                doh,
                gmroi,
                lastSaleDate: lastSale?.saleDate,
                lastPurchaseDate: lastPurchase?.purchaseDate,
                worthItStatus,
            }
        };

    }, [productId, state]);

    if (!productData) {
        return <div>Produto não encontrado. <button onClick={onBack}>Voltar</button></div>;
    }
    
    const { product, sales, purchases, currentStock, totalProfit, avgMargin, kpis } = productData;

    const renderTabContent = () => {
        switch(activeTab) {
            case 'vendas':
                return (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-600 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700/60">
                                <tr>
                                    <th className="px-4 py-2 text-left">Data</th>
                                    <th className="px-4 py-2 text-left">Cliente</th>
                                    <th className="px-4 py-2 text-right">Qtd</th>
                                    <th className="px-4 py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.map(s => (
                                    <tr key={s.id} className="border-b dark:border-gray-700">
                                        <td className="px-4 py-2">{formatDate(s.saleDate)}</td>
                                        <td className="px-4 py-2">{state.contacts.find(c=>c.id === s.customerId)?.name}</td>
                                        <td className="px-4 py-2 text-right">{s.quantity}</td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(s.quantity * s.unitPrice)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
             case 'compras':
                 return (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-gray-600 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700/60">
                                <tr>
                                    <th className="px-4 py-2 text-left">Data</th>
                                    <th className="px-4 py-2 text-left">Armazém / Destino</th>
                                    <th className="px-4 py-2 text-right">Qtd</th>
                                    <th className="px-4 py-2 text-right">Custo Unit.</th>
                                    <th className="px-4 py-2 text-right">Custo Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map(p => (
                                    <tr key={p.id} className="border-b dark:border-gray-700">
                                        <td className="px-4 py-2">{formatDate(p.purchaseDate)}</td>
                                        <td className="px-4 py-2">{p.warehouseName}</td>
                                        <td className="px-4 py-2 text-right">{p.quantity}</td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(p.unitCost)}</td>
                                        <td className="px-4 py-2 text-right">{formatCurrency(p.quantity * p.unitCost)}</td>
                                    </tr>
                                ))}
                                {purchases.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-500">Nenhuma compra registrada para este produto.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                );
            default:
                return (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <KPICard title="Estoque Disponível" value={currentStock} />
                            <KPICard title="Preço de Venda" value={formatCurrency(product.salePrice)} />
                            <KPICard title="Custo Médio" value={formatCurrency(product.cost)} />
                            <KPICard title="Lucro Total" value={formatCurrency(totalProfit)} colorClass={totalProfit > 0 ? 'text-green-500' : 'text-red-500'} />
                            <KPICard title="Margem Média" value={`${avgMargin.toFixed(1)}%`} colorClass={avgMargin > 25 ? 'text-green-500' : avgMargin > 10 ? 'text-yellow-500' : 'text-red-500'} />
                            <KPICard title="Dias em Estoque (DOH)" value={isFinite(kpis.doh) ? kpis.doh.toFixed(0) : 'N/A'} description="Cobertura do estoque atual" />
                            <KPICard title="GMROI" value={kpis.gmroi.toFixed(2)} description="Retorno sobre o Investimento em Estoque" />
                            <KPICard title="Última Compra" value={kpis.lastPurchaseDate ? formatDate(kpis.lastPurchaseDate) : 'N/A'} />
                            <KPICard title="Última Venda" value={kpis.lastSaleDate ? formatDate(kpis.lastSaleDate) : 'N/A'} />
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex flex-col justify-center items-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Vale a pena manter?</p>
                                <ValeAPenaBadge status={kpis.worthItStatus} />
                            </div>
                        </div>
                        {product.notes && (
                            <div className="mt-6">
                                <h4 className="text-sm font-semibold text-gray-400 mb-2">Observações</h4>
                                <p className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-900/50 p-3 rounded-md">{product.notes}</p>
                            </div>
                        )}
                    </>
                );
        }
    }

    const TabButton: React.FC<{tab: 'geral' | 'vendas' | 'compras' | 'movimentacoes', label: string}> = ({tab, label}) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >{label}</button>
    );

     const actions = (
        <>
            <button onClick={() => setIsSaleModalOpen(true)} className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white">Nova Venda</button>
            {product.stockType === ProductStockType.Estoque && <button onClick={() => setIsMakeAvailableModalOpen(true)} className="px-3 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700">Entrada/Ajuste</button>}
        </>
    );
    const subtitle = `SKU: ${product.sku} • Fornecedor: ${state.contacts.find(c=>c.id === product.supplierId)?.name || 'N/A'}`;

    return (
        <div>
            <div className="flex items-start gap-4">
                 <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mt-1 flex-shrink-0">&larr;</button>
                 <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold text-2xl text-gray-500">
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" /> : product.name.charAt(0)}
                </div>
                 <div className="flex-grow">
                     <PageTitle title={product.name} subtitle={subtitle} actions={actions} />
                 </div>
            </div>

            <div className="flex items-center gap-2 mb-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <TabButton tab="geral" label="Visão Geral" />
                <TabButton tab="vendas" label={`Vendas (${sales.length})`} />
                <TabButton tab="compras" label={`Compras (${purchases.length})`} />
                {/* <TabButton tab="movimentacoes" label="Movimentações" /> */}
            </div>

            <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-inner">
                {renderTabContent()}
            </div>

            {isSaleModalOpen && <SaleFormModal isOpen={isSaleModalOpen} onClose={() => setIsSaleModalOpen(false)} sale={null} />}
            {isMakeAvailableModalOpen && <MakeAvailableModal isOpen={isMakeAvailableModalOpen} onClose={() => setIsMakeAvailableModalOpen(false)} product={product} />}
        </div>
    );
};

export default ProductDetailPage;