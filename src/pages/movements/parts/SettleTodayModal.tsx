import React, { useEffect, useState } from 'react';
import { Movement } from '../types';
import { useData } from '../../../../contexts/DataContext';
import { Movement as GlobalMovement, MovementOrigin, MovementStatus, SaleTrackingStatus } from '../../../../types';
import { toUIMovement } from '../api';
import Button from '../../../../components/ui/Button';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSettled: () => void;
}

export default function SettleTodayModal({ isOpen, onClose, onSettled }: Props) {
  const { state, dispatch } = useData();
  const [items, setItems] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const pendingTodayMovements = state.movements
        .filter(m => m.status !== MovementStatus.Baixado && m.dueDate === today)
        .map(m => toUIMovement(m, state));
      
      setItems(pendingTodayMovements);
      setSelectedIds(new Set(pendingTodayMovements.map(i => i.id))); // Pre-select all
      setLoading(false);
    }
  }, [isOpen, state]);

  const handleSettle = async () => {
    if (selectedIds.size === 0 || saving) return;
    setSaving(true);
    try {
      const movementsToSettle = state.movements.filter(m => selectedIds.has(m.id));
      
      const validToSettle: GlobalMovement[] = [];
      const invalidSales: GlobalMovement[] = [];

      for (const mov of movementsToSettle) {
          if (mov.origin === MovementOrigin.Venda && mov.referenceId) {
              const sale = state.sales.find(s => s.id === mov.referenceId);
              if (sale && sale.status !== SaleTrackingStatus.Entregue) {
                  invalidSales.push(mov);
              } else {
                  validToSettle.push(mov);
              }
          } else {
              validToSettle.push(mov);
          }
      }

      if (invalidSales.length > 0) {
          alert(`Não é possível baixar ${invalidSales.length} transação(ões) de vendas que ainda não foram entregues.`);
      }

      if (validToSettle.length > 0) {
        validToSettle.forEach(mov => {
          dispatch({ type: 'UPDATE_ITEM', payload: { item: { ...mov, status: MovementStatus.Baixado }, collection: 'movements' } });
        });
        onSettled();
      }
    } catch (e) {
      alert('Falha ao baixar os movimentos.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const totalSelected = items
    .filter(i => selectedIds.has(i.id))
    .reduce((sum, item) => sum + (item.kind === 'DESPESA' ? -item.amountNet : item.amountNet), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h3 className="text-slate-100 font-semibold">Baixar Pendentes de Hoje</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        <div className="p-5 overflow-y-auto">
          {loading && <p>Carregando...</p>}
          {!loading && items.length === 0 && <p className="text-slate-400 text-center py-4">Nenhum movimento pendente para hoje.</p>}
          {!loading && items.length > 0 && (
            <div className="space-y-2">
              {items.map(item => (
                <label key={item.id} className="flex items-center gap-3 p-3 rounded-md bg-slate-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => {
                      setSelectedIds(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(item.id)) newSet.delete(item.id);
                        else newSet.add(item.id);
                        return newSet;
                      });
                    }}
                  />
                  <span className="flex-1 text-sm">{item.description}</span>
                  <span className={`font-medium text-sm ${item.kind === 'DESPESA' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {fmt(item.amountNet * (item.kind === 'DESPESA' ? -1 : 1))}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-800 px-5 py-4 mt-auto">
          <div className="text-sm text-slate-400">
            Total selecionado: <span className="font-semibold text-slate-200">{fmt(totalSelected)}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
            <Button variant="success" onClick={handleSettle} disabled={selectedIds.size === 0 || saving}>
              {saving ? 'Baixando...' : `Baixar (${selectedIds.size})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}