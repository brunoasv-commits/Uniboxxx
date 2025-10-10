
import React, { useMemo } from 'react';
import { Movement } from '../types';
import Button from '../../../../components/ui/Button';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);

interface Props {
  selectedIds: Set<string>;
  items: Movement[];
  onBulkAction: (action: string, ids: string[]) => void;
  onClear: () => void;
  onEdit: (item: Movement) => void;
}

export default function BulkBar({ selectedIds, items, onBulkAction, onClear, onEdit }: Props) {
  const selectedCount = selectedIds.size;
  const itemMap = useMemo(() => new Map(items.map(item => [item.id, item])), [items]);

  const totalSelected = useMemo(() => {
    let total = 0;
    selectedIds.forEach(id => {
      const item = itemMap.get(id);
      if (item) {
        total += item.kind === 'DESPESA' ? -item.amountNet : item.amountNet;
      }
    });
    return total;
  }, [selectedIds, itemMap]);

  const canSettle = useMemo(() => {
    if (selectedCount === 0) return false;
    for (const id of selectedIds) {
        if (itemMap.get(id)?.status !== 'BAIXADO') {
            return true; // Found at least one item that can be settled
        }
    }
    return false; // All selected items are already settled
  }, [selectedIds, itemMap, selectedCount]);

  const canRevert = useMemo(() => {
    if (selectedCount === 0) return false;
    for (const id of selectedIds) {
        if (itemMap.get(id)?.status === 'BAIXADO') {
            return true; // Found at least one item that can be reverted
        }
    }
    return false;
  }, [selectedIds, itemMap, selectedCount]);

  const handleEdit = () => {
    if (selectedCount !== 1 || !onEdit) return;
    const selectedId = Array.from(selectedIds)[0];
    const item = itemMap.get(selectedId);
    if (item) {
      onEdit(item);
    }
  };
  
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl mx-auto z-40">
      <div className="flex items-center justify-between gap-4 p-3 rounded-full bg-slate-800/80 backdrop-blur-sm border border-slate-700 shadow-2xl">
        <div className="text-sm pl-2">
          <span className="font-semibold">{selectedCount}</span> selecionado(s) <span className="text-slate-400">|</span> <span className="font-semibold">{fmt(totalSelected)}</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedCount === 1 && (
            <Button 
              onClick={handleEdit} 
              variant="secondary"
              size="sm"
            >
              Editar
            </Button>
          )}
          <Button
            onClick={() => onBulkAction('ESTORNAR', Array.from(selectedIds))} 
            variant="warning-ghost"
            size="sm"
            disabled={!canRevert}
          >
            Estornar
          </Button>
          <Button
            onClick={() => onBulkAction('BAIXAR', Array.from(selectedIds))} 
            variant="success"
            size="sm"
            disabled={!canSettle}
          >
            Baixar
          </Button>
          <Button onClick={() => onBulkAction('EXCLUIR', Array.from(selectedIds))} variant="danger" size="sm">Excluir</Button>
          <Button onClick={onClear} variant="ghost" size="sm" className="!px-2 !py-0 !h-8 !w-8">✕</Button>
        </div>
      </div>
    </div>
  );
}