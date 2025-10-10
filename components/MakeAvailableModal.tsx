

import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { useData } from '../contexts/DataContext';
import { Product, ContactType, WarehouseStock } from '../types';

interface MakeAvailableModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
}

const MakeAvailableModal: React.FC<MakeAvailableModalProps> = ({ isOpen, onClose, product }) => {
    const { state, dispatch, generateId } = useData();

    const warehouses = useMemo(() => state.contacts.filter(c => c.type === ContactType.ParceiroArmazem && c.isActive !== false), [state.contacts]);
    
    const [warehouseId, setWarehouseId] = useState('');
    
    useEffect(() => {
        if (isOpen && product) {
            setWarehouseId(product.defaultWarehouseId || (warehouses.length > 0 ? warehouses[0].id : ''));
        }
    }, [isOpen, product, warehouses]);

    if (!product) return null;

    const quantityToMove = product.pendingStock || 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (quantityToMove <= 0) {
            alert("Não há estoque pendente para alocar.");
            const updatedProductJustActivate = { ...product, availableForSale: true };
            dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedProductJustActivate, collection: 'products' } });
            onClose();
            return;
        }

        if (!warehouseId) {
            alert("Selecione um armazém de destino.");
            return;
        }
        
        const existingStock = state.warehouseStock.find(ws => ws.productId === product.id && ws.warehouseId === warehouseId);
        
        if (existingStock) {
            const updatedStock = { ...existingStock, quantity: existingStock.quantity + quantityToMove };
            dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedStock, collection: 'warehouseStock' } });
        } else {
            const newStock: WarehouseStock = { 
                id: generateId(), 
                productId: product.id, 
                warehouseId: warehouseId, 
                quantity: quantityToMove 
            };
            dispatch({ type: 'ADD_ITEM', payload: { item: newStock, collection: 'warehouseStock' } });
        }

        const updatedProduct = { 
            ...product, 
            availableForSale: true, 
            pendingStock: 0,
            defaultWarehouseId: product.defaultWarehouseId || warehouseId,
        };
        dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedProduct, collection: 'products' } });

        onClose();
    };

    const inputClass = "h-11 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 block w-full p-2.5 dark:bg-gray-800/60 dark:border-gray-700 dark:placeholder-gray-400 dark:text-gray-100 dark:focus:ring-blue-500";
    const labelClass = "block mb-1 text-sm font-medium text-gray-900 dark:text-gray-300";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Alocar Estoque para "${product.name}"`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Selecione o armazém para alocar o estoque pendente deste produto. Se não houver estoque pendente, o produto será apenas ativado para venda.
                </p>

                <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Quantidade para Alocar</label>
                        <div className={`${inputClass} bg-gray-200 dark:bg-gray-800 flex items-center`}>
                            {quantityToMove}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="warehouseId" className={labelClass}>Armazém de Destino *</label>
                        <select 
                            id="warehouseId" 
                            value={warehouseId} 
                            onChange={e => setWarehouseId(e.target.value)} 
                            className={inputClass} 
                            required={quantityToMove > 0}
                            disabled={quantityToMove <= 0}
                        >
                            <option value="">Selecione um armazém</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <div className="flex space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancelar</button>
                        <button 
                            type="submit" 
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            Confirmar Alocação
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
};

export default MakeAvailableModal;