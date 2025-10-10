import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import { useData } from '../../contexts/DataContext';
import { WarehouseStock } from '../../types';

interface AdjustStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    stockItem: (WarehouseStock & { productName: string }) | null;
}

const StockAdjustModal: React.FC<AdjustStockModalProps> = ({ isOpen, onClose, stockItem }) => {
    const { dispatch } = useData();
    const [newQuantity, setNewQuantity] = useState(0);
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (stockItem) {
            setNewQuantity(stockItem.quantity);
        }
    }, [stockItem]);

    if (!stockItem) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const updatedStockItem = { ...stockItem, quantity: newQuantity };
        // In a real app, you'd log the reason for the adjustment.
        // For now, we'll just update the quantity.
        dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedStockItem, collection: 'warehouseStock' } });
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Ajustar Estoque de ${stockItem.productName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Quantidade Atual</label>
                    <p className="text-lg font-bold">{stockItem.quantity}</p>
                </div>
                <div>
                    <label htmlFor="newQuantity" className="block text-sm font-medium">Nova Quantidade*</label>
                    <input
                        type="number"
                        id="newQuantity"
                        value={newQuantity}
                        onChange={e => setNewQuantity(parseInt(e.target.value, 10) || 0)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium">Motivo (Opcional)</label>
                    <input
                        type="text"
                        id="reason"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Ex: Contagem de ciclo, perda, etc."
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>
                 <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500">Cancelar</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Salvar Ajuste</button>
                </div>
            </form>
        </Modal>
    );
};

export default StockAdjustModal;
