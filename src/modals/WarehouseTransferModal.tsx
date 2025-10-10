import React from 'react';
import Modal from '../../components/Modal';

interface WarehouseTransferModalProps {
  open: boolean;
  onClose: () => void;
}

const WarehouseTransferModal: React.FC<WarehouseTransferModalProps> = ({ open, onClose }) => {
  return (
    <Modal isOpen={open} onClose={onClose} title="Transferir Estoque entre Armazéns">
      <div className="space-y-4">
        <p className="text-gray-400">A funcionalidade de transferência de estoque está em desenvolvimento.</p>
        
        {/* Placeholder form fields */}
        <div>
            <label className="block text-sm font-medium text-gray-300">Armazém de Origem</label>
            <select disabled className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed">
                <option>Armazém Principal</option>
            </select>
        </div>
         <div>
            <label className="block text-sm font-medium text-gray-300">Armazém de Destino</label>
            <select disabled className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-400 cursor-not-allowed">
                <option>Selecione...</option>
            </select>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-600 px-4 py-2 text-sm text-white hover:bg-gray-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default WarehouseTransferModal;
