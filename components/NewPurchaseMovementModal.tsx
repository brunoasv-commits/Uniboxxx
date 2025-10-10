
import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { Product, Account, Category, WarehouseStock, ID, AccountType, CategoryType, ContactType, Movement, MovementKind, MovementStatus, MovementOrigin } from '../types';
import CategoryPicker from '../src/components/pickers/CategoryPicker';

interface NewPurchaseMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: {
        product: Product;
        quantity: number;
    };
}

const NewPurchaseMovementModal: React.FC<NewPurchaseMovementModalProps> = ({ isOpen, onClose, data }) => {
    const { state, dispatch, generateId } = useData();
    const { product, quantity: initialQuantity } = data;

    const [formData, setFormData] = useState({
        accountId: '',
        categoryId: product.expenseCategoryId || '',
        dueDate: new Date().toISOString().split('T')[0],
        unitCost: product.cost || 0,
    });
    
    const [saving, setSaving] = useState(false);
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

    const accounts = useMemo(() => state.accounts.filter(a => a.type !== AccountType.Investimento), [state.accounts]);
    const selectedCategory = useMemo(() => state.categories.find(c => c.id === formData.categoryId), [state.categories, formData.categoryId]);
    
    const description = `Compra: SKU ${product.sku} - Qtd: ${initialQuantity}`;
    const totalValue = initialQuantity * formData.unitCost;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if(!formData.accountId || !formData.categoryId || initialQuantity <= 0 || formData.unitCost <= 0) {
            alert("Preencha todos os campos obrigatórios com valores válidos.");
            return;
        }
        
        setSaving(true);

        try {
            // FIX: Replaced non-existent `createMovement` with `dispatch` from `useData` context.
            const newMovement: Movement = {
                id: generateId(),
                kind: MovementKind.DESPESA,
                status: MovementStatus.EmAberto,
                origin: MovementOrigin.Produto,
                description: description,
                amountGross: totalValue,
                fees: 0,
                amountNet: totalValue,
                dueDate: formData.dueDate,
                accountId: formData.accountId,
                categoryId: formData.categoryId,
                referenceId: product.id,
            };

            dispatch({ type: 'ADD_ITEM', payload: { item: newMovement, collection: 'movements' } });
            onClose();

        } catch (error) {
            console.error("Failed to create purchase movement:", error);
            alert("Falha ao criar movimento de compra.");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(p => ({...p, [name]: (e.target.type === 'number' ? parseFloat(value) : value) || '' }));
    };

    const inputClass = "h-11 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 block w-full p-2.5 dark:bg-gray-800/60 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-blue-500";
    const disabledInputClass = "bg-gray-100 dark:bg-gray-800 cursor-not-allowed " + inputClass;
    const labelClass = "block mb-1 text-sm font-medium text-gray-900 dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Compra do Produto">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="p-4 rounded-lg bg-gray-700/50">
                    <p className="font-bold text-lg">{product.name}</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Tipo</label>
                        <input type="text" value="Pagar" className={disabledInputClass} disabled />
                    </div>
                    <div>
                        <label className={labelClass}>Status</label>
                        <input type="text" value="Pendente" className={disabledInputClass} disabled />
                    </div>
                </div>
                 <div>
                    <label className={labelClass}>Descrição</label>
                    <input type="text" value={description} className={disabledInputClass} disabled />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>Quantidade</label>
                        <input type="number" name="quantity" value={initialQuantity} className={disabledInputClass} disabled />
                    </div>
                    <div>
                        <label className={labelClass}>Custo Unitário *</label>
                        <input type="number" name="unitCost" value={formData.unitCost} onChange={handleChange} className={inputClass} step="0.01" required min="0.01"/>
                    </div>
                     <div>
                        <label className={labelClass}>Valor Total</label>
                        <input type="text" value={totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} className={disabledInputClass} disabled />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className={labelClass}>Data de Vencimento *</label>
                        <input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className={inputClass} required />
                     </div>
                     <div>
                        <label className={labelClass}>Conta de Débito *</label>
                        <select name="accountId" value={formData.accountId} onChange={handleChange} className={inputClass} required>
                            <option value="">Selecione...</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                 </div>
                  <div>
                        <label className={labelClass}>Categoria da Despesa *</label>
                        <div className="flex gap-2">
                            <input
                                value={selectedCategory?.name || ''}
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
                 <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancelar</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700" disabled={saving}>
                        {saving ? 'Salvando...' : 'Criar Movimento'}
                    </button>
                </div>
            </form>
            {isCategoryPickerOpen && (
                <CategoryPicker
                    isOpen={isCategoryPickerOpen}
                    onClose={() => setIsCategoryPickerOpen(false)}
                    onSelect={(category) => {
                        setFormData(p => ({ ...p, categoryId: category.id }));
                        setIsCategoryPickerOpen(false);
                    }}
                    categoryType={CategoryType.Despesa}
                />
            )}
        </Modal>
    )
}

export default NewPurchaseMovementModal;
