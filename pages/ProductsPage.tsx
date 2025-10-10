

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Modal from '../components/Modal';
import { useData } from '../contexts/DataContext';
import { Product, ID, ProductStockType } from '../types';
import ProductFormModal from '../components/ProductFormModal';
import { useSavedView } from '../hooks/useSavedView';
import StockBadge from '../components/StockBadge';
import Tip from '../components/Tip';
import StatusBadge from '../components/StatusBadge';
import MakeAvailableModal from '../components/MakeAvailableModal';
import { Page } from '../App';
import PageTitle from '../components/ui/PageTitle';
import NewPurchaseMovementModal from '../components/NewPurchaseMovementModal';
import Button from '../components/ui/Button';

type StatusFilter = 'active' | 'inactive' | 'all';

const getInitialStatus = (): StatusFilter => {
  try {
    if (typeof window === 'undefined') return 'active';
    const url = new URL(window.location.href);
    const q = (url.searchParams.get('status') || '').toLowerCase();
    // Default to 'active' if the parameter is missing or invalid.
    return q === 'inactive' || q === 'all' ? (q as StatusFilter) : 'active';
  } catch {
    return 'active';
  }
};


const AvailabilityStatusBadge: React.FC<{ product: { availableForSale?: boolean; totalStock: number; } }> = ({ product }) => {
    if (!product.availableForSale) {
        return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-600/30 text-gray-300">Em Configuração</span>
    }
    if (product.totalStock <= 0) {
        return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-300">Sem Saldo</span>
    }
    return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-500/10 text-green-400">Disponível</span>
};

interface ProductsPageProps {
    setActivePage: (page: Page) => void;
    setViewingProductId: (id: ID | null) => void;
}

const ProductsPage: React.FC<ProductsPageProps> = ({ setActivePage, setViewingProductId }) => {
    const { state, dispatch } = useData();
    const [view, setView] = useSavedView('products:view', {
        filters: { lowStock: false },
        sort: { by: 'name', dir: 'asc' },
        dense: false,
    });
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(getInitialStatus());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<ID>>(new Set());
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [productToMakeAvailable, setProductToMakeAvailable] = useState<Product | null>(null);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [productForInitialPurchase, setProductForInitialPurchase] = useState<{ product: Product, quantity: number } | null>(null);
    const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;


    const searchInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
      try {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        if (statusFilter === 'all') url.searchParams.delete('status');
        else url.searchParams.set('status', statusFilter);
        window.history.replaceState({}, '', url.toString());
      } catch {
        /* silencioso */
      }
    }, [statusFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, searchTerm, view.filters.lowStock, view.sort.by, view.sort.dir]);

    const counts = useMemo(() => ({
        all: state.products.length,
        active: state.products.filter(p => p.isActive !== false).length,
        inactive: state.products.filter(p => p.isActive === false).length,
    }), [state.products]);

    const openFormModal = (product: Product | null = null) => {
        setCurrentProduct(product);
        setIsFormModalOpen(true);
    };

    const handleStockProductCreated = (product: Product, quantity: number) => {
        setProductForInitialPurchase({ product, quantity });
        setIsPurchaseModalOpen(true);
    };

    const isProductInUse = (productId: ID): boolean => state.sales.some(s => s.productId === productId);

    const handleBulkAction = (action: 'activate' | 'inactivate' | 'delete') => {
        const selectedProducts = Array.from(selectedIds).map(id => state.products.find(p => p.id === id)).filter(Boolean) as Product[];

        if (action === 'delete') {
            const inUse = selectedProducts.filter(p => isProductInUse(p.id));
            if (inUse.length > 0) {
                alert(`Não é possível excluir produtos em uso: ${inUse.map(p => p.name).join(', ')}`);
                return;
            }
            setIsBulkConfirmOpen(true);
        } else {
            const updatedProducts = selectedProducts.map(p => ({ ...p, isActive: action === 'activate' }));
            updatedProducts.forEach(p => dispatch({ type: 'UPDATE_ITEM', payload: { item: p, collection: 'products' } }));
            setSelectedIds(new Set());
        }
    };

    const handleConfirmBulkDelete = () => {
        dispatch({ type: 'DELETE_MULTIPLE_ITEMS', payload: { ids: Array.from(selectedIds), collection: 'products' } });
        setSelectedIds(new Set());
        setIsBulkConfirmOpen(false);
    };

    const filteredAndSortedProducts = useMemo(() => {
        const warehouseStockByProduct = state.warehouseStock.reduce((acc, stock) => {
            acc[stock.productId] = (acc[stock.productId] || 0) + stock.quantity;
            return acc;
        }, {} as Record<ID, number>);

        return state.products
            .map(p => {
                const salePrice = p.salePrice || 0;
                const totalCost = (p.cost || 0) + (p.tax || 0);
                const totalStock = p.stockType === ProductStockType.Estoque 
                    ? (warehouseStockByProduct[p.id] || 0) + (p.pendingStock || 0) 
                    : Infinity;

                return {
                    ...p,
                    salePrice,
                    cost: p.cost,
                    totalStock,
                    margin: salePrice > 0 ? ((salePrice - totalCost) / salePrice) * 100 : 0,
                    hasIssues: !p.supplierId || !p.expenseCategoryId,
                };
            })
            .filter(p => {
                if (statusFilter === 'active' && p.isActive === false) return false;
                if (statusFilter === 'inactive' && p.isActive !== false) return false;

                if (view.filters.lowStock && p.stockType === ProductStockType.Estoque && p.totalStock > (p.minStock || 0)) return false;
                if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.sku.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                return true;
            })
            .sort((a, b) => {
                const valA = a[view.sort.by as keyof typeof a] ?? '';
                const valB = b[view.sort.by as keyof typeof a] ?? '';
                const comparison = typeof valA === 'string' ? valA.localeCompare(String(valB)) : Number(valA) - Number(valB);
                return view.sort.dir === 'asc' ? comparison : -comparison;
            });
    }, [state.products, state.warehouseStock, view, searchTerm, statusFilter]);
    
    const totalPages = Math.ceil(filteredAndSortedProducts.length / ITEMS_PER_PAGE);
    const paginatedProducts = useMemo(() => {
        return filteredAndSortedProducts.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredAndSortedProducts, currentPage]);

    const handleSort = (by: 'name' | 'salePrice' | 'margin' | 'totalStock') => {
        setView(v => ({...v, sort: { by, dir: v.sort.by === by && v.sort.dir === 'asc' ? 'desc' : 'asc' }}));
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? new Set(filteredAndSortedProducts.map(p => p.id)) : new Set());
    };
    const handleSelectOne = (id: ID) => {
        setSelectedIds(prev => { const newSet = new Set(prev); newSet.has(id) ? newSet.delete(id) : newSet.add(id); return newSet; });
    };

    const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div>
            <PageTitle title="Produtos" />

            <>
                <div className="flex flex-wrap items-center justify-between gap-4 my-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <input ref={searchInputRef} type="search" placeholder="Buscar por nome ou SKU..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-9 w-64 rounded-full bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 px-3 text-sm"/>
                        
                        <div className="inline-flex rounded-full border border-gray-700 p-1 bg-gray-900">
                            <Button variant="chip" size="sm" active={statusFilter === 'active'} onClick={() => setStatusFilter('active')}>Ativos ({counts.active})</Button>
                            <Button variant="chip" size="sm" active={statusFilter === 'inactive'} onClick={() => setStatusFilter('inactive')}>Inativos ({counts.inactive})</Button>
                            <Button variant="chip" size="sm" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>Todos ({counts.all})</Button>
                        </div>

                        <Button variant="chip" size="sm" active={view.filters.lowStock} onClick={() => setView(v => ({...v, filters: {...v.filters, lowStock: !v.filters.lowStock}}))}>Abaixo do mínimo</Button>
                        
                        <div className="inline-flex rounded-full border border-gray-700 p-1 bg-gray-900">
                            <Button variant="chip" size="sm" active={!view.dense} onClick={() => setView(v => ({...v, dense: false}))}>Confortável</Button>
                            <Button variant="chip" size="sm" active={view.dense} onClick={() => setView(v => ({...v, dense: true}))}>Compacto</Button>
                        </div>
                    </div>
                    <Button variant="primary" onClick={() => openFormModal()}>Novo Produto</Button>
                </div>
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2 mb-4 p-2 rounded-md bg-gray-200 dark:bg-gray-800 border dark:border-gray-700">
                        <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
                        <Button variant="success-ghost" size="sm" onClick={() => handleBulkAction('activate')}>Ativar</Button>
                        <Button variant="warning-ghost" size="sm" onClick={() => handleBulkAction('inactivate')}>Inativar</Button>
                        <Button variant="danger-ghost" size="sm" onClick={() => handleBulkAction('delete')}>Excluir</Button>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300">
                        <thead className="text-xs text-gray-600 uppercase bg-gray-50 dark:bg-gray-700/60 dark:text-gray-300 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="p-4 w-4"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size > 0 && selectedIds.size === filteredAndSortedProducts.length} className="w-4 h-4 rounded" /></th>
                                <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('name')}>Produto {view.sort.by === 'name' && (view.sort.dir === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3">Disponibilidade</th>
                                <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('totalStock')}>Estoque {view.sort.by === 'totalStock' && (view.sort.dir === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('salePrice')}>Preço Venda {view.sort.by === 'salePrice' && (view.sort.dir === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('margin')}>Margem {view.sort.by === 'margin' && (view.sort.dir === 'asc' ? '↑' : '↓')}</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody className={`[&_tr:nth-child(even)]:bg-gray-50 dark:[&_tr:nth-child(even)]:bg-gray-800/40 ${view.dense ? '[&_tr]:h-[44px]' : '[&_tr]:h-[56px]'}`}>
                            {paginatedProducts.map(p => (
                                <tr key={p.id} className="border-b dark:border-gray-700 group">
                                    <td className="p-4 w-4"><input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => handleSelectOne(p.id)} className="w-4 h-4 rounded" /></td>
                                    <td className="px-6 py-2 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-md bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center font-bold text-gray-500">
                                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover rounded-md" /> : p.name.charAt(0)}
                                        </div>
                                        <div>
                                            <button onClick={() => { setViewingProductId(p.id); setActivePage('Detalhe do Produto'); }} className="text-blue-400 hover:underline text-left">
                                                {p.name}
                                            </button>
                                            <div className="text-xs text-gray-500">SKU: {p.sku}</div>
                                        </div>
                                        {p.hasIssues && <Tip label="Faltam dados (fornecedor/categoria)"><span className="text-amber-500">⚠️</span></Tip>}
                                    </td>
                                    <td className="px-6 py-2"><AvailabilityStatusBadge product={p} /></td>
                                    <td className="px-6 py-2">{p.stockType === ProductStockType.Estoque ? <StockBadge onHand={p.totalStock} min={p.minStock} /> : 'N/A'}</td>
                                    <td className="px-6 py-2">{formatCurrency(p.salePrice)}</td>
                                    <td className={`px-6 py-2 font-semibold ${p.margin < 0 ? 'text-[var(--err)]' : p.margin < 30 ? 'text-[var(--warn)]' : 'text-[var(--ok)]'}`}>{p.margin.toFixed(1)}%</td>
                                    <td className="px-6 py-2"><StatusBadge active={p.isActive !== false && (p.stockType === ProductStockType.VendaSemEstoque || p.availableForSale === true)} /></td>
                                    <td className="px-6 py-2 text-right">
                                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            {p.stockType === ProductStockType.Estoque && !p.availableForSale &&
                                                <Tip label="Disponibilizar para Armazém"><button onClick={() => setProductToMakeAvailable(p)} className="p-2 rounded-full text-blue-500 hover:bg-blue-500/10"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg></button></Tip>
                                            }
                                            <Tip label="Editar"><button onClick={() => openFormModal(p)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg></button></Tip>
                                            <Tip label="Excluir"><button onClick={() => setProductToDelete(p)} disabled={isProductInUse(p.id)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button></Tip>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Página {currentPage} de {totalPages} ({filteredAndSortedProducts.length} itens)
                            </span>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                    disabled={currentPage === 1}
                                >
                                    Anterior
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                    disabled={currentPage === totalPages}
                                >
                                    Próxima
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {isFormModalOpen && <ProductFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} product={currentProduct} onStockProductCreated={handleStockProductCreated} />}
                {productToMakeAvailable && <MakeAvailableModal isOpen={!!productToMakeAvailable} onClose={() => setProductToMakeAvailable(null)} product={productToMakeAvailable} />}
                {isPurchaseModalOpen && productForInitialPurchase && (
                    <NewPurchaseMovementModal 
                        isOpen={isPurchaseModalOpen}
                        onClose={() => setIsPurchaseModalOpen(false)}
                        data={productForInitialPurchase}
                    />
                )}

                {productToDelete && (
                    <Modal isOpen={!!productToDelete} onClose={() => setProductToDelete(null)} title="Confirmar Exclusão">
                        <p>Tem certeza que deseja excluir o produto "<strong>{productToDelete.name}</strong>"?</p>
                        <div className="mt-6 flex justify-end space-x-3">
                            <Button variant="ghost" onClick={() => setProductToDelete(null)}>Cancelar</Button>
                            <Button variant="danger" onClick={() => { dispatch({ type: 'DELETE_ITEM', payload: { id: productToDelete.id, collection: 'products' } }); setProductToDelete(null); }}>Excluir</Button>
                        </div>
                    </Modal>
                )}

                <Modal isOpen={isBulkConfirmOpen} onClose={() => setIsBulkConfirmOpen(false)} title="Confirmar Exclusão em Massa">
                    <p>Tem certeza que deseja excluir {selectedIds.size} produto(s)?</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setIsBulkConfirmOpen(false)}>Cancelar</Button>
                        <Button variant="danger" onClick={handleConfirmBulkDelete}>Excluir</Button>
                    </div>
                </Modal>
            </>
        </div>
    );
};

export default ProductsPage;