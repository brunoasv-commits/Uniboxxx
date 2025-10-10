import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Sale, ID, MovementOrigin, ProductStockType, Product, Movement, SaleTrackingStatus } from '../types';
import SaleFormModal from '../components/SaleFormModal';
import Modal from '../components/Modal';
import PageTitle from '../components/ui/PageTitle';
import Button from '../components/ui/Button';
import ProductSalesAnalysis from '../src/pages/Products/ProductSalesAnalysis';
import AmazonPaymentsTab from '../src/pages/Products/AmazonPaymentsTab';

type SaleWithDetails = Sale & {
    productName: string;
    customerName: string;
    totalSale: number;
    profit: number;
    isSettled: boolean;
    product?: Product;
    warehouseName?: string;
};

const StatusBadge: React.FC<{ status: SaleTrackingStatus }> = ({ status }) => {
    const statusConfig: Record<SaleTrackingStatus, { label: string; color: string; }> = {
        [SaleTrackingStatus.VendaRealizada]: { label: 'Realizada', color: 'bg-gray-500/20 text-gray-300' },
        [SaleTrackingStatus.ComprarItem]: { label: 'Comprar', color: 'bg-yellow-500/20 text-yellow-300' },
        [SaleTrackingStatus.AguardandoEnvio]: { label: 'Aguard. Envio', color: 'bg-blue-500/20 text-blue-300' },
        [SaleTrackingStatus.AguardandoEntrega]: { label: 'Em Trânsito', color: 'bg-purple-500/20 text-purple-300' },
        [SaleTrackingStatus.Entregue]: { label: 'Entregue', color: 'bg-green-500/20 text-green-300' },
        [SaleTrackingStatus.PagamentoRecebido]: { label: 'Pag. Recebido', color: 'bg-cyan-500/20 text-cyan-300' },
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-500/20 text-gray-300' };

    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
            {config.label}
        </span>
    );
};


const SalesPage: React.FC = () => {
    const { state, dispatch } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'list' | 'analysis' | 'amazon'>('list');
    const [currentSale, setCurrentSale] = useState<Sale | null>(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState<SaleWithDetails | null>(null);
    const [filters, setFilters] = useState<{
        search: string;
        stockType: 'all' | 'stock' | 'nostock';
        status: 'all' | SaleTrackingStatus;
    }>({
        search: '',
        stockType: 'all',
        status: 'all',
    });

    const openModal = (sale: Sale | null = null) => {
        setCurrentSale(sale);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setCurrentSale(null);
        setIsModalOpen(false);
    };

    const openConfirmModal = (sale: SaleWithDetails) => {
        const associatedMovement = state.movements.find(m => m.referenceId === sale.id && m.origin === MovementOrigin.Venda);
        if (associatedMovement) {
            const hasSettlements = state.settlements.some(s => s.movementId === associatedMovement.id);
            if (hasSettlements) {
                alert('Esta venda não pode ser excluída pois o movimento financeiro associado já foi baixado (pago/recebido).');
                return;
            }
        }
        setSaleToDelete(sale);
        setIsConfirmModalOpen(true);
    };
    
    const salesWithDetails: SaleWithDetails[] = useMemo(() => {
        return state.sales.map(sale => {
            const product = state.products.find(p => p.id === sale.productId);
            const customer = state.contacts.find(c => c.id === sale.customerId);
            
            const receita = sale.quantity * sale.unitPrice + sale.freight - sale.discount;

            const saleUnitCost = (() => {
                if (sale.purchaseMovementId) {
                    const purchaseMovement = state.movements.find(m => m.id === sale.purchaseMovementId);
                    if (purchaseMovement && sale.quantity > 0) {
                        return purchaseMovement.amountGross / sale.quantity;
                    }
                }
                return product?.cost || 0;
            })();
            
            const totalCost = (saleUnitCost * sale.quantity) + sale.tax + (sale.additionalCost || 0);
            const profit = receita - totalCost;

            const movement = state.movements.find(mov => mov.referenceId === sale.id && mov.origin === MovementOrigin.Venda);
            const isSettled = movement ? state.settlements.some(set => set.movementId === movement.id) : false;
            
            let warehouseName = 'N/A';
            if(product?.stockType === ProductStockType.Estoque && sale.stockSourceId) {
                const stockSource = state.warehouseStock.find(ws => ws.id === sale.stockSourceId);
                if(stockSource) {
                    const warehouse = state.contacts.find(c => c.id === stockSource.warehouseId);
                    warehouseName = warehouse?.name || 'N/A';
                }
            }


            return {
                ...sale,
                productName: product?.name || 'N/A',
                customerName: customer?.name || 'N/A',
                totalSale: receita,
                profit,
                isSettled,
                product,
                warehouseName,
            };
        });
    }, [state.sales, state.products, state.contacts, state.movements, state.settlements, state.warehouseStock]);

    const filteredSales = useMemo(() => {
        return salesWithDetails.filter(s => {
            const searchLower = filters.search.toLowerCase();
            if (searchLower) {
                const searchMatch = s.productName.toLowerCase().includes(searchLower) || 
                                  s.customerName.toLowerCase().includes(searchLower) ||
                                  (s.orderCode && s.orderCode.toLowerCase().includes(searchLower));
                if (!searchMatch) return false;
            }
            
            if (filters.stockType !== 'all') {
                const isStockProduct = s.product?.stockType === ProductStockType.Estoque;
                if (filters.stockType === 'stock' && !isStockProduct) return false;
                if (filters.stockType === 'nostock' && isStockProduct) return false;
            }

            if (filters.status !== 'all' && s.status !== filters.status) {
                return false;
            }

            return true;
        }).sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    }, [salesWithDetails, filters]);
    
    const kpiData = useMemo(() => {
        const totalNetSales = filteredSales.reduce((sum, s) => sum + (s.totalSale - s.tax), 0);
        const totalProfit = filteredSales.reduce((sum, s) => sum + s.profit, 0);
        const salesCount = filteredSales.length;
        const ticket = salesCount > 0 ? totalNetSales / salesCount : 0;
        return { totalNetSales, totalProfit, salesCount, ticket };
    }, [filteredSales]);


    const handleConfirmDelete = () => {
        if (saleToDelete) {
            const { stockSourceId, quantity, productId } = saleToDelete;
            const product = state.products.find(p => p.id === productId);

            if (product?.stockType === ProductStockType.Estoque && stockSourceId) {
                 const warehouseStock = state.warehouseStock.find(ws => ws.id === stockSourceId);
                 if (warehouseStock) {
                     const updatedStock = { ...warehouseStock, quantity: warehouseStock.quantity + quantity };
                     dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedStock, collection: 'warehouseStock' } });
                 }
            }

            const associatedMovement = state.movements.find(m => m.referenceId === saleToDelete.id && m.origin === MovementOrigin.Venda);
            if (associatedMovement) {
                dispatch({ type: 'DELETE_ITEM', payload: { id: associatedMovement.id, collection: 'movements' } });
            }
            if (saleToDelete.purchaseMovementId) {
                dispatch({ type: 'DELETE_ITEM', payload: { id: saleToDelete.purchaseMovementId, collection: 'movements' } });
            }

            dispatch({ type: 'DELETE_ITEM', payload: { id: saleToDelete.id, collection: 'sales' } });
            setIsConfirmModalOpen(false);
            setSaleToDelete(null);
        }
    };
    
    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

    const SalesTypeChips: React.FC<{value: typeof filters['stockType'], onChange: (v: typeof filters['stockType'])=>void}> = ({value, onChange}) => {
        const options = [
            {v:'all',label:'Todos'},
            {v:'stock',label:'Com Estoque'},
            {v:'nostock',label:'Sem Estoque'},
        ] as const;
        return (
          <div className="inline-flex rounded-full border border-gray-700 p-1 bg-gray-900">
            {options.map(o=>
              <Button
                key={o.v}
                variant="chip"
                size="sm"
                active={value === o.v}
                onClick={()=>onChange(o.v)}
              >
                {o.label}
              </Button>
            )}
          </div>
        );
      }

    return (
        <div>
            <PageTitle 
                title="Vendas" 
                actions={
                    <Button variant="primary" onClick={() => openModal()}>
                        Nova Venda
                    </Button>
                }
            />

            <div className="tabs-container mb-6">
                <button
                    role="tab"
                    aria-selected={activeTab === 'list'}
                    onClick={() => setActiveTab('list')}
                    className="tab-button"
                >
                    Listagem de Vendas
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'analysis'}
                    onClick={() => setActiveTab('analysis')}
                    className="tab-button"
                >
                    Análise de Vendas
                </button>
                <button
                    role="tab"
                    aria-selected={activeTab === 'amazon'}
                    onClick={() => setActiveTab('amazon')}
                    className="tab-button"
                >
                    Pagamento Amazon
                </button>
            </div>

            {activeTab === 'list' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Total de Vendas</p><p className="text-xl font-bold">{formatCurrency(kpiData.totalNetSales)}</p></div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Lucro Total</p><p className="text-xl font-bold">{formatCurrency(kpiData.totalProfit)}</p></div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Nº de Vendas</p><p className="text-xl font-bold">{kpiData.salesCount}</p></div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Ticket Médio</p><p className="text-xl font-bold">{formatCurrency(kpiData.ticket)}</p></div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-4">
                        <input
                            type="text"
                            placeholder="Buscar por produto, cliente, cód. ordem..."
                            value={filters.search}
                            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm w-full md:w-80 h-9"
                        />
                        <SalesTypeChips value={filters.stockType} onChange={(v) => setFilters(f => ({ ...f, stockType: v}))} />
                        <select
                            value={filters.status}
                            onChange={e => setFilters(f => ({ ...f, status: e.target.value as any }))}
                            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm h-9"
                        >
                            <option value="all">Todos os Status</option>
                            {Object.values(SaleTrackingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Data</th>
                                    <th scope="col" className="px-6 py-3">Produto</th>
                                    <th scope="col" className="px-6 py-3">Cód. Ordem</th>
                                    <th scope="col" className="px-6 py-3 text-right">Qtd.</th>
                                    <th scope="col" className="px-6 py-3 text-right">Receita Líquida</th>
                                    <th scope="col" className="px-6 py-3 text-right">Lucro</th>
                                    <th scope="col" className="px-6 py-3">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:nth-child(even)]:bg-gray-50 dark:[&_tr:nth-child(even)]:bg-gray-800/40">
                                {filteredSales.map(s => (
                                    <tr key={s.id} className="border-b dark:border-gray-700 last:border-b-0">
                                        <td className="px-6 py-2">{formatDate(s.saleDate)}</td>
                                        <td className="px-6 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">{s.productName}</td>
                                        <td className="px-6 py-2 font-mono text-xs">{s.orderCode || '—'}</td>
                                        <td className="px-6 py-2 text-right">{s.quantity}</td>
                                        <td className="px-6 py-2 text-right">{formatCurrency(s.totalSale - s.tax)}</td>
                                        <td className={`px-6 py-2 font-semibold text-right ${s.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(s.profit)}</td>
                                        <td className="px-6 py-2"><StatusBadge status={s.status} /></td>
                                        <td className="px-6 py-2 text-right">
                                            <div className="flex items-center justify-end space-x-2">
                                                <button onClick={() => openModal(s)} className="p-1 text-gray-400 hover:text-blue-400" title="Editar"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg></button>
                                                <button onClick={() => openConfirmModal(s)} disabled={s.isSettled} className="p-1 text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:hover:text-gray-400" title="Excluir"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'analysis' && (
                <ProductSalesAnalysis />
            )}

            {activeTab === 'amazon' && (
                <AmazonPaymentsTab />
            )}

            {isModalOpen && <SaleFormModal isOpen={isModalOpen} onClose={closeModal} sale={currentSale} />}
            
            {isConfirmModalOpen && saleToDelete && (
                <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirmar Exclusão">
                    <div>
                        <p className="text-gray-700 dark:text-gray-300">Tem certeza que deseja excluir a venda de "<strong>{saleToDelete.productName}</strong>" para <strong>{saleToDelete.customerName}</strong>?</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Esta ação não pode ser desfeita e irá estornar o item ao estoque, se aplicável.</p>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button variant="ghost" type="button" onClick={() => setIsConfirmModalOpen(false)}>Cancelar</Button>
                        <Button variant="danger" type="button" onClick={handleConfirmDelete}>Excluir</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SalesPage;