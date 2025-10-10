

import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { Product, ProductStockType, ContactType, CategoryType, ID } from '../types';
import MarginCalculator from './MarginCalculator';
import { Calculator } from 'lucide-react';
import CalculatorComponent from '../src/components/Calculator';
import CategoryPicker from '../src/components/pickers/CategoryPicker';
import ContactPicker from '../src/components/pickers/ContactPicker.tsx';
import ContactFormModal from './ContactFormModal';


interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    forcedStockType?: ProductStockType;
    onStockProductCreated?: (product: Product, quantity: number) => void;
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({ isOpen, onClose, product, forcedStockType, onStockProductCreated }) => {
    const { state, dispatch, generateId } = useData();
    
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        supplierId: '',
        salePrice: 0,
        cost: 0,
        tax: 0,
        expenseCategoryId: '',
        stockType: forcedStockType || ProductStockType.VendaSemEstoque,
        minStock: 0,
        isActive: true,
        link: '',
        imageUrl: '',
        initialQuantity: 1,
        notes: '',
    });
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
    const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
    const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);

    const isNewProduct = !product;

    useEffect(() => {
        if(isOpen) {
            const initialFormData = {
                name: '', sku: '', supplierId: '', salePrice: 0, cost: 0, tax: 0,
                expenseCategoryId: '', stockType: forcedStockType || ProductStockType.VendaSemEstoque,
                minStock: 0, isActive: true, link: '', imageUrl: '',
                initialQuantity: 1, 
                notes: '',
            };

            if (product) {
                Object.assign(initialFormData, {
                    name: product.name,
                    sku: product.sku,
                    supplierId: product.supplierId,
                    salePrice: product.salePrice,
                    cost: product.cost,
                    tax: product.tax,
                    expenseCategoryId: product.expenseCategoryId,
                    stockType: product.stockType,
                    minStock: product.minStock || 0,
                    isActive: product.isActive,
                    link: product.link || '',
                    imageUrl: product.imageUrl || '',
                    initialQuantity: product.pendingStock || 1, 
                    notes: product.notes || '',
                });
            }
            setFormData(initialFormData);
        }
    }, [product, isOpen, forcedStockType]);

    useEffect(() => {
        // This effect suggests an SKU for new products. It's editable by the user.
        if (isNewProduct) {
            const trimmedName = formData.name.trim();
            if (!trimmedName) {
                setFormData(prev => ({ ...prev, sku: '' }));
                return;
            }

            const existingProduct = state.products.find(p => p.name.trim().toLowerCase() === trimmedName.toLowerCase());
    
            if (existingProduct) {
                // If a product with the same name exists, suggest its SKU to maintain consistency.
                setFormData(prev => ({ ...prev, sku: existingProduct.sku }));
            } else {
                // Otherwise, generate a new SKU suggestion with the "UNI" prefix.
                const proCode = trimmedName.substring(0, 3).toUpperCase().padEnd(3, 'X');
                const uniquePart = Math.random().toString(36).substring(2, 6).toUpperCase();
                const newSku = `UNI-${uniquePart}-${proCode}`;
                setFormData(prev => ({ ...prev, sku: newSku }));
            }
        }
    }, [isNewProduct, formData.name, state.products]);


    const selectedExpenseCategory = useMemo(() => state.categories.find(c => c.id === formData.expenseCategoryId), [state.categories, formData.expenseCategoryId]);
    const selectedSupplier = useMemo(() => state.contacts.find(c => c.id === formData.supplierId), [state.contacts, formData.supplierId]);
    const supplierLabel = selectedSupplier ? selectedSupplier.name : '';


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        
        const parsedValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked
                : (name === 'cost' || name === 'salePrice' || name === 'minStock' || name === 'initialQuantity') ? parseFloat(value) || 0
                : value;

        setFormData(prev => ({ ...prev, [name]: parsedValue }));
    };

    const handleApplyTargetPrice = (newPrice: number) => {
        setFormData(prev => ({ ...prev, salePrice: newPrice }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Ensure products with the same name have the same SKU.
        const existingProductByName = state.products.find(p => 
            p.name.trim().toLowerCase() === formData.name.trim().toLowerCase() &&
            p.id !== product?.id // Exclude the product being edited from the check
        );

        if (existingProductByName && existingProductByName.sku !== formData.sku) {
            alert("Já existe um produto com este nome e um SKU diferente. Produtos com o mesmo nome devem ter o mesmo SKU para manter a consistência.");
            return;
        }
        
        if (!formData.name || !formData.supplierId || !formData.expenseCategoryId || !formData.sku || formData.salePrice <= 0 || formData.cost < 0) {
            alert('Preencha todos os campos obrigatórios (*). SKU é obrigatório. Custo e Preço devem ser válidos.');
            return;
        }

        const isNewProduct = !product;
        const productId = isNewProduct ? generateId() : product.id;

        const productPayload: Product = {
            id: productId,
            name: formData.name,
            sku: formData.sku,
            supplierId: formData.supplierId,
            salePrice: formData.salePrice,
            cost: formData.cost,
            tax: 0, // Tax field is removed, so default to 0
            expenseCategoryId: formData.expenseCategoryId,
            stockType: formData.stockType,
            minStock: formData.minStock,
            isActive: formData.isActive,
            link: formData.link,
            imageUrl: formData.imageUrl,
            notes: formData.notes,
            availableForSale: product?.availableForSale || (formData.stockType === ProductStockType.VendaSemEstoque),
            defaultWarehouseId: product?.defaultWarehouseId,
            pendingStock: isNewProduct && formData.stockType === ProductStockType.Estoque ? formData.initialQuantity : (product?.pendingStock || 0),
        };
        
        if (isNewProduct) {
            dispatch({ type: 'ADD_ITEM', payload: { item: productPayload, collection: 'products' } });
            if (formData.stockType === ProductStockType.Estoque && onStockProductCreated && formData.initialQuantity > 0) {
                onStockProductCreated(productPayload, formData.initialQuantity);
            }
        } else {
            dispatch({ type: 'UPDATE_ITEM', payload: { item: productPayload, collection: 'products' } });
        }
        
        onClose();
    };
    
    const inputClass = "h-11 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 block w-full p-2.5 dark:bg-gray-800/60 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-blue-500";
    const textareaClass = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 block w-full p-2.5 dark:bg-gray-800/60 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-blue-500";
    const labelClass = "block mb-1 text-sm font-medium text-gray-900 dark:text-gray-300";
    const currencyInputWrapper = "relative";
    const currencySymbol = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 dark:text-gray-400";
    const currencyInput = "pl-10 " + inputClass;
    const fieldsetStyles = "border border-gray-200 dark:border-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4";
    const legendStyles = "px-2 font-semibold text-gray-700 dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={product ? 'Editar Produto' : 'Novo Produto'}>
            {isCalculatorOpen && <CalculatorComponent onClose={() => setIsCalculatorOpen(false)} />}
            <form onSubmit={handleSubmit} className="space-y-6">
                <fieldset className={fieldsetStyles}>
                    <legend className={legendStyles}>Informações Básicas</legend>
                    <div className="md:col-span-2">
                        <label htmlFor="name" className={labelClass}>Nome do produto *</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className={inputClass} required />
                    </div>
                     <div>
                        <label htmlFor="sku" className={labelClass}>SKU (Cód. de Referência) *</label>
                        <input type="text" name="sku" id="sku" value={formData.sku} onChange={handleChange} className={inputClass} required />
                    </div>
                    <div>
                        <label htmlFor="supplierId" className={labelClass}>Fornecedor *</label>
                        <div className="flex gap-2">
                            <input
                                value={supplierLabel}
                                readOnly
                                placeholder="Selecione um fornecedor"
                                className={inputClass}
                                onClick={() => setIsContactPickerOpen(true)}
                            />
                            <button
                                type="button"
                                onClick={() => setIsContactPickerOpen(true)}
                                className="shrink-0 rounded-lg border border-gray-700 px-3 h-11 text-sm text-gray-200 hover:bg-gray-800"
                            >
                                Pesquisar
                            </button>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="expenseCategoryId" className={labelClass}>Categoria de despesa *</label>
                        <div className="flex gap-2">
                            <input
                                value={selectedExpenseCategory?.name || ''}
                                readOnly
                                placeholder="Selecione uma categoria"
                                className={inputClass}
                                onClick={() => setIsCategoryPickerOpen(true)}
                            />
                            <button
                                type="button"
                                onClick={() => setIsCategoryPickerOpen(true)}
                                className="shrink-0 rounded-lg border border-gray-700 px-3 h-11 text-sm text-gray-200 hover:bg-gray-800"
                            >
                                Pesquisar
                            </button>
                        </div>
                    </div>
                </fieldset>

                <fieldset className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <legend className={`${legendStyles} flex items-center gap-2`}>
                        Preços
                        <button type="button" onClick={() => setIsCalculatorOpen(true)} className="p-1 rounded-full hover:bg-white/10 text-gray-400" aria-label="Abrir calculadora">
                            <Calculator size={16} />
                        </button>
                    </legend>
                     <div>
                        <label htmlFor="cost" className={labelClass}>Custo *</label>
                        <div className={currencyInputWrapper}>
                            <span className={currencySymbol}>R$</span>
                            <input type="number" name="cost" id="cost" value={formData.cost} onChange={handleChange} className={currencyInput} required step="0.01" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="salePrice" className={labelClass}>Preço de venda *</label>
                         <div className={currencyInputWrapper}>
                            <span className={currencySymbol}>R$</span>
                            <input type="number" name="salePrice" id="salePrice" value={formData.salePrice} onChange={handleChange} className={currencyInput} required step="0.01" />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <MarginCalculator cost={formData.cost} price={formData.salePrice} onApply={handleApplyTargetPrice} />
                    </div>
                </fieldset>

                <fieldset className={fieldsetStyles}>
                    <legend className={legendStyles}>Estoque</legend>
                    <div className="md:col-span-2">
                        <label htmlFor="stockType" className={labelClass}>Tipo de Estoque *</label>
                        <select name="stockType" id="stockType" value={formData.stockType} onChange={handleChange} className={inputClass} required disabled={!!product || !!forcedStockType}>
                            <option value={ProductStockType.VendaSemEstoque}>{ProductStockType.VendaSemEstoque}</option>
                            <option value={ProductStockType.Estoque}>{ProductStockType.Estoque}</option>
                        </select>
                    </div>
                    {formData.stockType === ProductStockType.Estoque && (
                       <>
                            <div>
                                <label htmlFor="minStock" className={labelClass}>Ponto de Pedido</label>
                                <input type="number" name="minStock" id="minStock" value={formData.minStock} onChange={handleChange} className={inputClass} min="0" />
                            </div>
                            <div>
                                <label htmlFor="initialQuantity" className={labelClass}>Quantidade de Estoque</label>
                                <input type="number" name="initialQuantity" id="initialQuantity" value={formData.initialQuantity} onChange={handleChange} className={inputClass} min="0" />
                            </div>
                       </>
                    )}
                </fieldset>

                <fieldset className={fieldsetStyles}>
                    <legend className={legendStyles}>Informações Adicionais</legend>
                    <div className="md:col-span-2">
                        <label htmlFor="notes" className={labelClass}>Observações</label>
                        <textarea name="notes" id="notes" value={formData.notes} onChange={handleChange} className={textareaClass} rows={3}></textarea>
                    </div>
                </fieldset>

                 <div className="flex items-center">
                    <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} id="isActive" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                    <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">Ativo para venda?</label>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancelar</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Salvar</button>
                </div>
            </form>
            {isCategoryPickerOpen && (
                <CategoryPicker
                    isOpen={isCategoryPickerOpen}
                    onClose={() => setIsCategoryPickerOpen(false)}
                    onSelect={(category) => {
                        setFormData(prev => ({ ...prev, expenseCategoryId: category.id }));
                        setIsCategoryPickerOpen(false);
                    }}
                    categoryType={CategoryType.Despesa}
                />
            )}
            {isContactPickerOpen && (
                <ContactPicker
                    isOpen={isContactPickerOpen}
                    onClose={() => setIsContactPickerOpen(false)}
                    onSelect={(contact) => {
                        setFormData(prev => ({ ...prev, supplierId: contact.id }));
                        setIsContactPickerOpen(false);
                    }}
                    contactType={ContactType.Fornecedor}
                    allowCreateNew
                    onCreateNewContact={() => {
                        setIsContactPickerOpen(false);
                        setIsNewContactModalOpen(true);
                    }}
                />
            )}
            {isNewContactModalOpen && (
                <ContactFormModal
                    isOpen={isNewContactModalOpen}
                    onClose={() => setIsNewContactModalOpen(false)}
                    contactToEdit={null}
                    initialType={ContactType.Fornecedor}
                />
            )}
        </Modal>
    );
};

export default ProductFormModal;
