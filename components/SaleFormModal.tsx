import React, { useEffect, useMemo, useState, Suspense, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { Sale, Product, ID, ProductStockType, ContactType, AccountType, PaymentMethod, MovementOrigin, SaleTrackingStatus, Movement, CategoryType, MovementKind, MovementStatus } from '../types';
import Modal from './Modal';
import FormSection from './ui/FormSection';
import MarginCalculator from './MarginCalculator';
import ProductPicker from '../src/components/pickers/ProductPicker.tsx';
import ProductFormModal from './ProductFormModal';
import ContactPicker from '../src/components/pickers/ContactPicker';
import ContactFormModal from './ContactFormModal';
import Tip from './Tip';

const MakeAvailableModal = React.lazy(()=>import('./MakeAvailableModal'));

interface SaleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: Sale | null;
}

const SaleFormModal: React.FC<SaleFormModalProps> = ({ isOpen, onClose, sale }) => {
    const { state, dispatch, generateId } = useData();
    const [formData, setFormData] = useState({
        saleDate: new Date().toISOString().split('T')[0],
        productId: '',
        customerId: '',
        creditAccountId: '',
        quantity: 1,
        unitPrice: 0,
        costUnit: 0,
        discount: 0,
        freight: 0,
        tax: 0,
        paymentMethod: PaymentMethod.Pix,
        estimatedPaymentDate: new Date().toISOString().split('T')[0],
        trackingCode: '',
        stockSourceId: '',
        additionalCost: 0,
        orderCode: '',
    });
    
    const [isTaxManuallySet, setIsTaxManuallySet] = useState(false);
    const [productToMakeAvailable, setProductToMakeAvailable] = useState<Product | null>(null);
    const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
    const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
    const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
    const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);

    const selectedProduct = useMemo(()=> state.products.find(p=>p.id===formData.productId), [formData.productId, state.products]);
    const productLabel = selectedProduct ? `${selectedProduct.name} • ${selectedProduct.sku || 'N/A'}` : '';
    const selectedCustomer = useMemo(() => state.contacts.find(c => c.id === formData.customerId), [state.contacts, formData.customerId]);
    const customerLabel = selectedCustomer ? selectedCustomer.name : '';
    
    const stockSources = useMemo(() => {
        if (selectedProduct?.stockType !== ProductStockType.Estoque) return [];
        return state.warehouseStock
            .filter(ws => ws.productId === selectedProduct.id && ws.quantity > 0)
            .map(ws => {
                const warehouse = state.contacts.find(c => c.id === ws.warehouseId);
                return { id: ws.id, name: warehouse?.name || 'N/A', quantity: ws.quantity };
            });
    }, [selectedProduct, state.warehouseStock, state.contacts]);
    
    const availableStock = useMemo(()=>{
        if (!selectedProduct) return 0;
        if (selectedProduct.stockType !== ProductStockType.Estoque) return Infinity;
        
        const source = stockSources.find(s => s.id === formData.stockSourceId);
        if (!source) return 0;
        
        if (sale && sale.productId === formData.productId && sale.stockSourceId === formData.stockSourceId) {
            return source.quantity + sale.quantity;
        }
        return source.quantity;
    }, [selectedProduct, formData.stockSourceId, stockSources, sale]);

    useEffect(() => {
        if (isOpen) {
            if (sale) {
                 const product = state.products.find(p => p.id === sale.productId);
                let initialCostUnit = 0;
                
                if(product) {
                    initialCostUnit = product.cost; // Default
                    if (sale.purchaseMovementId) {
                        const purchaseMovement = state.movements.find(m => m.id === sale.purchaseMovementId);
                        if (purchaseMovement && sale.quantity > 0) {
                            initialCostUnit = purchaseMovement.amountGross / sale.quantity;
                        }
                    } else if (sale.additionalCost && sale.quantity > 0) {
                        initialCostUnit = product.cost + (sale.additionalCost / sale.quantity);
                    }
                }

                setFormData({
                    saleDate: sale.saleDate,
                    productId: sale.productId,
                    customerId: sale.customerId,
                    creditAccountId: sale.creditAccountId,
                    quantity: sale.quantity,
                    unitPrice: sale.unitPrice,
                    costUnit: initialCostUnit,
                    discount: sale.discount,
                    freight: sale.freight,
                    tax: sale.tax,
                    paymentMethod: sale.paymentMethod,
                    estimatedPaymentDate: sale.estimatedPaymentDate,
                    trackingCode: sale.trackingCode || '',
                    stockSourceId: sale.stockSourceId || '',
                    additionalCost: sale.additionalCost || 0,
                    orderCode: sale.orderCode || '',
                });
                setIsTaxManuallySet(true); // Editing an existing sale, don't auto-calculate
            } else {
                 setFormData({
                    saleDate: new Date().toISOString().split('T')[0], productId: '', customerId: '', creditAccountId: '',
                    quantity: 1, unitPrice: 0, costUnit: 0, discount: 0, freight: 0, tax: 0,
                    paymentMethod: PaymentMethod.Pix, estimatedPaymentDate: new Date().toISOString().split('T')[0],
                    trackingCode: '', stockSourceId: '', additionalCost: 0,
                    orderCode: '',
                });
                setIsTaxManuallySet(false); // new sale, allow auto-calc
            }
        }
    }, [isOpen, sale, state.products, state.movements]);

    useEffect(()=>{
        if (selectedProduct && (!sale || sale.productId !== selectedProduct.id)) {
            setFormData(prev => ({
                ...prev,
                unitPrice: selectedProduct.salePrice || 0,
                costUnit: selectedProduct.cost || 0,
                stockSourceId: stockSources.length > 0 ? stockSources[0].id : '',
            }));
             // When product changes, reset manual tax edit flag
            setIsTaxManuallySet(false);
        }
    }, [selectedProduct, sale, stockSources]);
    
    useEffect(() => {
        // Auto-calculate tax when product or quantity changes, if not manually set.
        if (selectedProduct && !isTaxManuallySet) {
            const productTax = selectedProduct.tax || 0;
            const totalTax = parseFloat((productTax * formData.quantity).toFixed(2));
            if (totalTax !== formData.tax) {
                setFormData(prev => ({ ...prev, tax: totalTax }));
            }
        }
    }, [selectedProduct, formData.quantity, isTaxManuallySet]);


    const { subtotal, total, costTotal, profit, margin } = useMemo(() => {
        const subtotal = formData.quantity * formData.unitPrice;
        const receita = Math.max(0, subtotal - formData.discount + formData.freight);
        const custo = (formData.quantity * formData.costUnit) + formData.tax;
        const lucro = receita - custo;
        const margem = receita > 0 ? (lucro / receita) * 100 : 0;
        return { subtotal, total: receita, costTotal: custo, profit: lucro, margin: margem };
    }, [formData]);

    const canSave = useMemo(() => {
        if (!selectedProduct) return { ok: false, reason: 'Selecione um produto' };
        if (selectedProduct.stockType === ProductStockType.Estoque && formData.quantity > availableStock)
            return { ok: false, reason: `Estoque insuficiente (disponível: ${availableStock})` };
        return { ok: true, reason: '' };
    }, [selectedProduct, formData.quantity, availableStock]);

    const applyTarget = (target=30) => {
        if (!selectedProduct) return;
        const newUnit = formData.costUnit / (1 - target/100);
        setFormData(prev => ({...prev, unitPrice: Number(newUnit.toFixed(2))}));
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (name === 'tax') {
            setIsTaxManuallySet(true);
        }
        if (name === 'quantity' || name === 'productId') {
            setIsTaxManuallySet(false); // re-enable auto-calc
        }

        setFormData(prev => ({...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value}));
    };
    
    const isCostUnitEditable = !sale?.purchaseMovementId;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSave.ok) { alert(canSave.reason); return; }
        
        if (!formData.productId || !formData.customerId || !formData.creditAccountId || formData.quantity <= 0) {
            alert('Preencha todos os campos obrigatórios (*).');
            return;
        }

        const saleId = sale ? sale.id : generateId();
        
        if (sale) { // Revert original stock if editing
            const originalProduct = state.products.find(p => p.id === sale.productId);
            if (originalProduct?.stockType === ProductStockType.Estoque && sale.stockSourceId) {
                const originalStock = state.warehouseStock.find(ws => ws.id === sale.stockSourceId);
                if (originalStock) dispatch({ type: 'UPDATE_ITEM', payload: { item: { ...originalStock, quantity: originalStock.quantity + sale.quantity }, collection: 'warehouseStock' } });
            }
        }
        
        if (selectedProduct?.stockType === ProductStockType.Estoque) { // Decrement new stock
             const newStock = state.warehouseStock.find(ws => ws.id === formData.stockSourceId);
             if (newStock) dispatch({ type: 'UPDATE_ITEM', payload: { item: { ...newStock, quantity: newStock.quantity - formData.quantity }, collection: 'warehouseStock' } });
        }
        
        let finalAdditionalCost = sale?.additionalCost || 0;
        if (isCostUnitEditable && selectedProduct) {
            const productDefaultCost = selectedProduct.cost || 0;
            finalAdditionalCost = (formData.costUnit - productDefaultCost) * formData.quantity;
        }
        
        const saleData: Omit<Sale, 'costUnit'> & { id: string } = { 
            ...formData, 
            id: saleId, 
            status: sale?.status || SaleTrackingStatus.ComprarItem,
            additionalCost: finalAdditionalCost,
        };
        // @ts-ignore
        delete saleData.costUnit;
        
        const saleActionType = sale ? 'UPDATE_ITEM' : 'ADD_ITEM';
        dispatch({ type: saleActionType, payload: { item: saleData, collection: 'sales' } });
        
        const grossAmount = (formData.quantity * formData.unitPrice) + formData.freight;
        const taxAmount = formData.tax;
        const netAmount = grossAmount - taxAmount;

        let vendaCategory = state.categories.find(c => c.name.trim().toLowerCase() === 'vendas' && c.type === CategoryType.Receita);
        if (!vendaCategory) {
            vendaCategory = state.categories.find(c => c.name.trim().toLowerCase() === 'venda' && c.type === CategoryType.Receita);
        }
        if (!vendaCategory) {
            vendaCategory = {
                id: generateId(),
                name: 'Vendas',
                type: CategoryType.Receita,
                color: '#22c55e'
            };
            dispatch({ type: 'ADD_ITEM', payload: { item: vendaCategory, collection: 'categories' } });
        }
        
        const description = `Recebimento de Venda - ${formData.orderCode || 'N/A'}`;

        const movementPayload: Omit<Movement, 'id'> = {
            kind: MovementKind.RECEITA,
            status: MovementStatus.EmAberto,
            origin: MovementOrigin.Venda,
            description: description,
            amountGross: grossAmount,
            fees: taxAmount,
            amountNet: netAmount,
            dueDate: formData.estimatedPaymentDate,
            accountId: formData.creditAccountId,
            categoryId: vendaCategory.id,
            referenceId: saleId,
        };

        try {
            const existingMovement = state.movements.find(m => m.referenceId === saleId);
            if (existingMovement) {
                dispatch({ type: 'UPDATE_ITEM', payload: { item: { ...existingMovement, ...movementPayload }, collection: 'movements' } });
            } else {
                dispatch({ type: 'ADD_ITEM', payload: { item: { ...movementPayload, id: generateId() }, collection: 'movements' } });
            }
        } catch (error) {
            console.error("Failed to create/update financial movement for sale:", error);
            alert("Falha ao registrar o movimento financeiro da venda.");
        }

        onClose();
    };

    const fetchProductsApi = useCallback(async (q: string, page: number, pageSize: number): Promise<{ items: any[], total: number }> => {
        const searchLower = q.toLowerCase();
        
        const filtered = state.products.filter(p => 
            p.isActive &&
            (
                p.name.toLowerCase().includes(searchLower) ||
                p.sku?.toLowerCase().includes(searchLower)
            )
        );
    
        const enrichedItems = filtered.map(p => {
            const supplier = state.contacts.find(c => c.id === p.supplierId);
            const stock = state.warehouseStock
                .filter(ws => ws.productId === p.id)
                .reduce((sum, current) => sum + current.quantity, 0);
    
            return {
                id: p.id,
                name: p.name,
                sku: p.sku || 'N/A',
                price: p.salePrice,
                stock: p.stockType === ProductStockType.Estoque ? stock : undefined,
                supplierName: supplier?.name || 'N/A',
                stockType: p.stockType,
            };
        });
    
        const total = enrichedItems.length;
        const paginatedItems = enrichedItems.slice((page - 1) * pageSize, page * pageSize);
    
        return { items: paginatedItems, total };
    }, [state.products, state.contacts, state.warehouseStock]);

    useEffect(() => {
      const onKey = (e: KeyboardEvent) => { if (e.key.toLowerCase() === "f2") {
          const target = e.target as HTMLElement;
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
            return;
          }
          e.preventDefault();
          setIsProductPickerOpen(true); 
        }
      };
      if(isOpen) {
        window.addEventListener("keydown", onKey);
      }
      return () => window.removeEventListener("keydown", onKey);
    }, [isOpen]);


    const labelClass = "block mb-1 text-sm font-medium text-gray-900 dark:text-gray-300";
    const inputClass = "h-11 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 block w-full p-2.5 dark:bg-gray-800/60 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-blue-500";
    const currencyInputWrapper = "relative";
    const currencySymbol = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400";
    const currencyInput = "pl-10 " + inputClass;
    
    const costUnitInput = (
        <div className={currencyInputWrapper}>
            <span className={currencySymbol}>R$</span>
            <input 
                type="number" 
                name="costUnit" 
                value={formData.costUnit} 
                onChange={handleChange} 
                step="0.01" 
                className={isCostUnitEditable ? currencyInput : `${currencyInput} bg-gray-200 dark:bg-gray-800 cursor-not-allowed`}
                disabled={!isCostUnitEditable}
            />
        </div>
    );

    return (
    <>
        <Modal isOpen={isOpen} onClose={onClose} title={sale ? "Editar Venda" : "Nova Venda"}>
            <form onSubmit={handleSubmit} className="space-y-2">
                {selectedProduct?.stockType === ProductStockType.Estoque && formData.quantity > availableStock && (
                    <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-300 text-sm">
                        {canSave.reason}
                        <div className="mt-2 flex gap-2">
                            <Suspense fallback={<div>Carregando...</div>}>
                                <button type="button" onClick={() => setProductToMakeAvailable(selectedProduct)} className="h-8 rounded-md bg-blue-600/20 px-2 text-xs">Disponibilizar p/ Armazém</button>
                            </Suspense>
                        </div>
                    </div>
                )}
                <FormSection title="Informações Básicas" className="lg:grid-cols-4">
                    <div className="lg:col-span-1"><label className={labelClass}>Data da Venda *</label><input type="date" name="saleDate" value={formData.saleDate} onChange={handleChange} className={inputClass} required /></div>
                    
                    <div className="lg:col-span-1">
                        <label className={labelClass}>Código da Ordem</label>
                        <input type="text" name="orderCode" value={formData.orderCode} onChange={handleChange} className={inputClass} />
                    </div>

                    <div className="lg:col-span-2">
                        <label className={labelClass}>Produto *</label>
                        <div className="flex gap-2">
                            <input
                                value={productLabel}
                                readOnly
                                placeholder="Selecione um produto (F2)"
                                className={inputClass}
                            />
                            <button
                                type="button"
                                onClick={() => setIsProductPickerOpen(true)}
                                className="shrink-0 rounded-md border border-gray-700 px-3 h-11 text-sm text-gray-200 hover:bg-gray-800"
                            >
                                Pesquisar
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        <label className={labelClass}>Cliente *</label>
                        <div className="flex gap-2">
                            <input
                                value={customerLabel}
                                readOnly
                                placeholder="Selecione um cliente"
                                className={inputClass}
                                onClick={() => setIsContactPickerOpen(true)}
                            />
                            <button
                                type="button"
                                onClick={() => setIsContactPickerOpen(true)}
                                className="shrink-0 rounded-md border border-gray-700 px-3 h-11 text-sm text-gray-200 hover:bg-gray-800"
                            >
                                Pesquisar
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-1"><label className={labelClass}>Conta de Crédito *</label><select name="creditAccountId" value={formData.creditAccountId} onChange={handleChange} className={inputClass} required><option value="">Selecione...</option>{state.accounts.filter(a=>a.type!==AccountType.Cartao && a.type!==AccountType.Investimento).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                </FormSection>

                <FormSection title="Preços & Totais" className="lg:grid-cols-3">
                    <div className="lg:col-span-1"><label className={labelClass}>Quantidade *</label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} min="1" className={inputClass} required/></div>
                    <div className="lg:col-span-1"><label className={labelClass}>Preço Unit. *</label><div className={currencyInputWrapper}><span className={currencySymbol}>R$</span><input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleChange} step="0.01" className={currencyInput} required/></div></div>
                    <div className="lg:col-span-1">
                        <label className={labelClass}>Custo Unit.</label>
                        {!isCostUnitEditable ? (
                            <Tip label="O custo é fixado pela compra já registrada. Edite a transação de compra para alterar.">
                                {costUnitInput}
                            </Tip>
                        ) : (
                            costUnitInput
                        )}
                    </div>
                    <div className="lg:col-span-1"><label className={labelClass}>Desconto</label><div className={currencyInputWrapper}><span className={currencySymbol}>R$</span><input type="number" name="discount" value={formData.discount} onChange={handleChange} step="0.01" className={currencyInput}/></div></div>
                    <div className="lg:col-span-1"><label className={labelClass}>Frete</label><div className={currencyInputWrapper}><span className={currencySymbol}>R$</span><input type="number" name="freight" value={formData.freight} onChange={handleChange} step="0.01" className={currencyInput}/></div></div>
                    <div className="lg:col-span-1"><label className={labelClass}>Imposto</label><div className={currencyInputWrapper}><span className={currencySymbol}>R$</span><input type="number" name="tax" value={formData.tax} onChange={handleChange} step="0.01" className={currencyInput}/></div></div>
                    <div className="lg:col-span-full mt-2"><MarginCalculator cost={costTotal} price={total} onApply={()=>applyTarget(30)} /></div>
                    <div className="lg:col-span-full mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span className="rounded bg-gray-200 dark:bg-gray-700 px-2 py-1">Subtotal: <b>{subtotal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</b></span>
                        <span className="rounded bg-gray-200 dark:bg-gray-700 px-2 py-1">Total: <b>{total.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</b></span>
                        <span className="rounded bg-gray-200 dark:bg-gray-700 px-2 py-1">Custo: <b>{costTotal.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</b></span>
                        <span className={`rounded px-2 py-1 font-bold ${margin>=25?'bg-green-500/15 text-green-400':margin>=10?'bg-yellow-500/15 text-yellow-400':'bg-red-500/15 text-red-400'}`}>
                            Lucro: {profit.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})} ({margin.toFixed(1)}%)
                        </span>
                    </div>
                </FormSection>

                <FormSection title="Logística e Recebimento" className="lg:grid-cols-3">
                    <div><label className={labelClass}>Forma de Receb.</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className={inputClass}><option value="">Selecione...</option>{Object.values(PaymentMethod).map(m=><option key={m} value={m}>{m}</option>)}</select></div>
                    <div><label className={labelClass}>Data Estimada Receb.</label><input type="date" name="estimatedPaymentDate" value={formData.estimatedPaymentDate} onChange={handleChange} className={inputClass} /></div>
                    <div><label className={labelClass}>Cód. Rastreio</label><input type="text" name="trackingCode" value={formData.trackingCode} onChange={handleChange} className={inputClass} /></div>
                    {selectedProduct?.stockType === ProductStockType.Estoque && (
                        <div>
                            <label className={labelClass}>Armazém de Saída *</label>
                            <select name="stockSourceId" value={formData.stockSourceId} onChange={handleChange} className={inputClass} required>
                                <option value="">Selecione...</option>
                                {stockSources.map(s => <option key={s.id} value={s.id}>{s.name} (Disp: {s.quantity})</option>)}
                            </select>
                        </div>
                    )}
                </FormSection>
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancelar</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50" disabled={!canSave.ok}>Salvar</button>
                </div>
            </form>
        </Modal>

        <ProductPicker
            isOpen={isProductPickerOpen}
            onClose={() => setIsProductPickerOpen(false)}
            onSelect={(p) => {
                setFormData((f) => ({
                    ...f,
                    productId: p.id,
                    unitPrice: p.price ?? 0,
                }));
                setIsProductPickerOpen(false);
            }}
            fetchProducts={fetchProductsApi}
            allowCreateNew
            onCreateNewProduct={() => {
                setIsProductPickerOpen(false);
                setIsNewProductModalOpen(true);
            }}
        />

        {isNewProductModalOpen && <ProductFormModal isOpen={isNewProductModalOpen} onClose={() => setIsNewProductModalOpen(false)} product={null} />}

        <ContactPicker
            isOpen={isContactPickerOpen}
            onClose={() => setIsContactPickerOpen(false)}
            onSelect={(contact) => {
                setFormData(f => ({ ...f, customerId: contact.id }));
                setIsContactPickerOpen(false);
            }}
            contactType={ContactType.Cliente}
            allowCreateNew
            onCreateNewContact={() => {
                setIsContactPickerOpen(false);
                setIsNewContactModalOpen(true);
            }}
        />

        {isNewContactModalOpen && (
            <ContactFormModal
                isOpen={isNewContactModalOpen}
                onClose={() => setIsNewContactModalOpen(false)}
                contactToEdit={null}
                initialType={ContactType.Cliente}
            />
        )}

        <Suspense fallback={<div>Carregando...</div>}>
            {productToMakeAvailable && <MakeAvailableModal isOpen={!!productToMakeAvailable} onClose={() => setProductToMakeAvailable(null)} product={productToMakeAvailable} />}
        </Suspense>
    </>
    );
};

export default SaleFormModal;