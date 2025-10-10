
import React from 'react';
import Button from '../../../components/ui/Button';

interface QuickActionsProps {
  onNewSale: () => void;
  onNewTxn: () => void;
  onNewProduct: () => void;
  onNewContact: () => void;
}

export function QuickActions({ onNewSale, onNewTxn, onNewProduct, onNewContact }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Button variant="primary" onClick={onNewSale}>+ Nova Venda</Button>
      <Button variant="primary" onClick={onNewTxn}>+ Nova Transação</Button>
      <Button variant="primary" onClick={onNewProduct}>+ Novo Produto</Button>
      <Button variant="primary" onClick={onNewContact}>+ Novo Contato</Button>
    </div>
  );
}
