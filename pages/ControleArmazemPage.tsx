import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { ContactType, ID, StockPurchase, Sale, WarehouseStock, Product } from '../types';
import Modal from '../components/Modal';
import PageTitle from '../components/ui/PageTitle';
import StockAdjustModal from '../src/modals/StockAdjustModal';
import WarehouseTransferModal from '../src/modals/WarehouseTransferModal';
import { exportToCsv } from '../src/lib/export';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', {timeZone: 'UTC'});


const TransactionDetailModal: React.FC<{ item: StockPurchase | Sale | null, onClose: () => void }> = ({ item, onClose }) => {
    const { state } = useData();
    if (!item) return null;

    const isSale = 'customerId' in item;
    let title = isSale ? "Detalhes da Venda" : "Detalhes da Compra";
    
    const details = isSale ? (
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="font-medium text-gray-500">Data:</div> <div>{formatDate((item as Sale).saleDate)}</div>
            <div className="font-medium text-gray-500">Cliente:</div> <div>{state.contacts.find(c => c.id === (item as Sale).customerId)?.name || 'N/A'}</div>
            <div className="font-medium text-gray-500">Quantidade:</div> <div>{(item as Sale).quantity}</div>
            <div className="font-medium text-gray-500">Total:</div> <div>{formatCurrency((item as Sale).quantity * (item as Sale).unitPrice + (item as Sale).freight)}</div>
        </div>
    ) : (
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="font-medium text-gray-500">Data:</div> <div>{formatDate((item as StockPurchase).purchaseDate)}</div>
            <div className="font-medium text-gray-500">Fornecedor:</div> <div>{state.products.find(p => p.id === (item as StockPurchase).productId)?.supplierId || 'N/A'}</div>
            <div className="font-medium text-gray-500">Quantidade:</div> <div>{(item as StockPurchase).quantity}</div>
            <div className="font-medium text-gray-500">Total:</div> <div>{formatCurrency((item as StockPurchase).quantity * (item as StockPurchase).unitCost)}</div>
        </div>
    );
    
    return (
        <Modal isOpen={!!item} onClose={onClose} title={title}>
            {details}
            <div className="mt-6 flex justify-end">
                <button onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">
                    Fechar
                </button>
            </div>
        </Modal>
    );
};

interface Transaction {
    transactionId: ID;
    sourceType: 'purchase' | 'sale';
    date: string;
    type: 'Entrada' | 'Saída';
    quantity: number;
    relatedInfo: string;
    balanceAfter: number;
}

const TransactionHistory: React.FC<{ productId: ID; warehouseId: ID; onDetailsClick: (item: StockPurchase | Sale) => void; }> = ({ productId, warehouseId, onDetailsClick }) => {
    const { state } = useData();

    const transactions: Transaction[] = useMemo(() => {
        const warehouseStockEntry = state.warehouseStock.find(ws => ws.productId === productId && ws.warehouseId === warehouseId);
        if (!warehouseStockEntry) return [];

        const purchases = state.stockPurchases.filter(p => p.productId === productId && p.warehouseId === warehouseId).map(p => ({
            transactionId: p.id, sourceType: 'purchase' as const, date: p.purchaseDate, type: 'Entrada' as 'Entrada', quantity: p.quantity, relatedInfo: `Compra`
        }));
        
        const sales = state.sales.filter(s => s.productId === productId && s.stockSourceId === warehouseStockEntry.id).map(s => ({
            transactionId: s.id, sourceType: 'sale' as const, date: s.saleDate, type: 'Saída' as 'Saída', quantity: s.quantity, relatedInfo: `Venda para ${state.contacts.find(c => c.id === s.customerId)?.name || 'N/A'}`
        }));
        
        const sortedAsc = [...purchases, ...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let runningBalance = 0;
        return sortedAsc.map(t => ({...t, balanceAfter: runningBalance += (t.type === 'Entrada' ? t.quantity : -t.quantity)})).reverse();
    }, [state.stockPurchases, state.sales, state.contacts, state.warehouseStock, productId, warehouseId]);

    const handleViewDetails = (id: ID, type: 'purchase' | 'sale') => {
        const item = type === 'purchase' ? state.stockPurchases.find(p => p.id === id) : state.sales.find(s => s.id === id);
        if (item) onDetailsClick(item);
    };

    if (transactions.length === 0) return <p className="text-sm text-gray-500 dark:text-gray-400 p-4">Nenhuma transação encontrada.</p>;

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
            <h4 className="font-semibold mb-2">Histórico de Transações</h4>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead><tr className="text-left text-gray-500 dark:text-gray-400"><th className="py-1">Data</th><th className="py-1">Tipo</th><th className="py-1 text-center">Qtd.</th><th className="py-1 text-center">Saldo</th><th className="py-1">Detalhes</th><th className="py-1 text-center">Ver</th></tr></thead>
                    <tbody>{transactions.map((t, i) => (<tr key={i} className="border-t dark:border-gray-700"><td className="py-2">{formatDate(t.date)}</td><td className={`py-2 font-medium ${t.type === 'Entrada' ? 'text-green-600' : 'text-red-500'}`}>{t.type}</td><td className="py-2 text-center">{t.quantity}</td><td className="py-2 text-center font-bold">{t.balanceAfter}</td><td className="py-2">{t.relatedInfo}</td><td className="py-2 text-center"><button onClick={() => handleViewDetails(t.transactionId, t.sourceType)} className="p-1 text-gray-500 hover:text-blue-600"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"></path></svg></button></td></tr>))}</tbody>
                </table>
            </div>
        </div>
    );
};

const ControleArmazemPage: React.FC = () => {
    const { state } = useData();
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
    const [detailsVisibleFor, setDetailsVisibleFor] = useState<StockPurchase | Sale | null>(null);
    const [stockToAdjust, setStockToAdjust] = useState<(WarehouseStock & { productName: string }) | null>(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [activeTabByWarehouse, setActiveTabByWarehouse] = useState<Record<ID, 'itens' | 'reposicao'>>({});

    const warehousesData = useMemo(() => {
        return state.contacts.filter(c => c.type === ContactType.ParceiroArmazem && c.isActive !== false)
            .map(warehouse => {
                const stockItems = state.warehouseStock.filter(stock => stock.warehouseId === warehouse.id && stock.quantity > 0)
                    .map(stock => {
                        const product = state.products.find(p => p.id === stock.productId);
                        return { ...stock, product, productName: product?.name || 'N/A', productCost: product?.cost || 0, totalCost: (product?.cost || 0) * stock.quantity };
                    });
                
                const totalStockValue = stockItems.reduce((sum, item) => sum + item.totalCost, 0);
                const totalItemCount = stockItems.reduce((sum, item) => sum + item.quantity, 0);
                const itemsToReorder = stockItems.filter(item => item.product && item.quantity <= (item.product.minStock || 0));

                return { warehouse, stockItems, totalStockValue, totalItemCount, itemsToReorder };
            });
    }, [state.contacts, state.warehouseStock, state.products]);

    const toggleExpansion = (key: string) => setExpandedItems(prev => ({...prev, [key]: !prev[key]}));
    const handleTabChange = (warehouseId: ID, tab: 'itens' | 'reposicao') => setActiveTabByWarehouse(prev => ({...prev, [warehouseId]: tab}));
    
    const buildWarehouseCsv = (warehouseData: typeof warehousesData[0]) => {
        const rows = warehouseData.stockItems.map(item => ({
            Produto: item.productName,
            SKU: item.product?.sku || 'N/A',
            Quantidade: item.quantity,
            Custo_Unitario: item.productCost,
            Valor_Total_Estoque: item.totalCost,
        }));
        return rows;
    }

    return (
        <div>
            <PageTitle title="Controle de Armazém" />

            <div className="space-y-6">
                {warehousesData.length > 0 ? warehousesData.map(data => {
                    const activeTab = activeTabByWarehouse[data.warehouse.id] || 'itens';
                    const { warehouse } = data;
                    return (
                        <div key={data.warehouse.id} className="bg-white dark:bg-gray-800 rounded-lg shadow">
                            <header className="bg-gray-800/40 rounded-t-lg p-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-700">
                                <div>
                                    <h2 className="text-lg font-semibold">{warehouse.name}</h2>
                                    <div className="text-sm text-gray-300 flex flex-wrap gap-x-4 gap-y-1">
                                    <span>📍 {warehouse.address || 'Endereço não informado'}</span>
                                    <span>📞 {warehouse.phone || '—'}</span>
                                    <span>✉️ {warehouse.email || '—'}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsTransferModalOpen(true)} className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm">Transferir</button>
                                    <button onClick={() => setStockToAdjust(data.stockItems[0])} className="px-3 py-2 rounded-md bg-gray-700 text-white text-sm">Entrada/Ajuste</button>
                                    <button onClick={() => exportToCsv(buildWarehouseCsv(data), `estoque_${warehouse.name}.csv`)} className="px-3 py-2 rounded-md bg-gray-700 text-white text-sm">Exportar</button>
                                </div>
                            </header>
                            <div className="p-6">
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-4 text-center border-t border-b dark:border-gray-700 py-4">
                                    <div><p className="text-sm text-gray-500">SKUs (Produtos)</p><p className="text-lg font-bold">{data.stockItems.length}</p></div>
                                    <div><p className="text-sm text-gray-500">Total de Itens</p><p className="text-lg font-bold">{data.totalItemCount}</p></div>
                                    <div><p className="text-sm text-gray-500">Valor do Estoque</p><p className="text-lg font-bold">{formatCurrency(data.totalStockValue)}</p></div>
                                </div>
                                <div className="border-b border-gray-200 dark:border-gray-700">
                                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                                        <button onClick={() => handleTabChange(data.warehouse.id, 'itens')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'itens' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Itens</button>
                                        <button onClick={() => handleTabChange(data.warehouse.id, 'reposicao')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'reposicao' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Reposição ({data.itemsToReorder.length})</button>
                                    </nav>
                                </div>
                            </div>
                            {activeTab === 'itens' && (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                        <thead className="text-xs text-gray-600 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700/60"><tr className="border-t dark:border-gray-700"><th className="px-6 py-3 w-28">Ações</th><th className="px-6 py-3">Produto</th><th className="px-6 py-3 text-center">Qtd.</th><th className="px-6 py-3 text-right">Custo Unit.</th><th className="px-6 py-3 text-right">Valor Total</th></tr></thead>
                                        <tbody>
                                            {data.stockItems.map(item => {
                                                const expansionKey = `${data.warehouse.id}-${item.productId}`;
                                                return (
                                                    <React.Fragment key={item.id}>
                                                        <tr className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                                            <td className="px-6 py-2 flex items-center gap-1">
                                                                <button onClick={() => toggleExpansion(expansionKey)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Ver histórico"><svg className={`w-4 h-4 transition-transform ${expandedItems[expansionKey] ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"></path></svg></button>
                                                                <button onClick={() => setStockToAdjust(item)} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Ajustar Estoque"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></button>
                                                            </td>
                                                            <td className="px-6 py-4 font-medium">{item.productName}</td><td className="px-6 py-4 text-center font-bold">{item.quantity}</td><td className="px-6 py-4 text-right">{formatCurrency(item.productCost)}</td><td className="px-6 py-4 text-right font-semibold">{formatCurrency(item.totalCost)}</td>
                                                        </tr>
                                                        {expandedItems[expansionKey] && <tr><td colSpan={5}><TransactionHistory productId={item.productId} warehouseId={data.warehouse.id} onDetailsClick={setDetailsVisibleFor}/></td></tr>}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                             {activeTab === 'reposicao' && (
                                <div className="p-4">
                                {data.itemsToReorder.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <thead className="text-xs text-gray-600 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700/60"><tr><th className="px-6 py-3">Produto</th><th className="px-6 py-3 text-center">Disponível</th><th className="px-6 py-3 text-center">Mínimo</th><th className="px-6 py-3 text-center">Sugestão de Compra</th></tr></thead>
                                            <tbody>{data.itemsToReorder.map(item => (<tr key={item.id} className="border-b dark:border-gray-700"><td className="px-6 py-4 font-medium">{item.productName}</td><td className="px-6 py-4 text-center font-bold text-red-500">{item.quantity}</td><td className="px-6 py-4 text-center">{item.product?.minStock}</td><td className="px-6 py-4 text-center font-semibold text-blue-500">{Math.max((item.product?.minStock || 0) - item.quantity, 1)}</td></tr>))}</tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum item precisando de reposição.</p>
                                )}
                                </div>
                            )}
                        </div>
                    )
                }) : (
                    <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg shadow"><p>Nenhum armazém encontrado.</p></div>
                )}
            </div>
            <TransactionDetailModal item={detailsVisibleFor} onClose={() => setDetailsVisibleFor(null)} />
            <StockAdjustModal isOpen={!!stockToAdjust} onClose={() => setStockToAdjust(null)} stockItem={stockToAdjust} />
            <WarehouseTransferModal open={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} />
        </div>
    );
};

export default ControleArmazemPage;