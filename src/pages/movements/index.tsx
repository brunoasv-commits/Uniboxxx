import React from 'react';
import DataTable from './parts/DataTable';
import CalendarView from './parts/CalendarView';
import CashflowView from './parts/CashflowView';
import { Filters, Movement as UIMovement, Totals, MovementKind as UIMovementKind } from './types';
import NewMovementModal from './NewMovementModal';
import SettleMovementModal from './parts/SettleMovementModal';
import BulkBar from './parts/BulkBar';
import { useData } from '../../../contexts/DataContext';
import { toUIMovement } from './api';
import { Movement, MovementOrigin, MovementStatus, SaleTrackingStatus, MovementKind, Account } from '../../../types';
import { TransactionsHeader } from './parts/TransactionsHeader';
import { startOfToday, subDays, addDays, startOfMonth, endOfMonth, format, differenceInCalendarDays } from 'date-fns';
import { ViewOptionsMenu } from './parts/ViewOptionsMenu';
import AlertModal from '../../../components/AlertModal';
import PageTitle from '../../../components/ui/PageTitle';
import Modal from '../../../components/Modal';
import Button from '../../../components/ui/Button';

const today = new Date();
const defaultStartDate = format(startOfMonth(today), 'yyyy-MM-dd');
const defaultEndDate = format(endOfMonth(today), 'yyyy-MM-dd');

const defaultFilters: Filters = {
  tab: 'lista',
  chip: 'TODOS',
  dateFrom: defaultStartDate,
  dateTo: defaultEndDate,
  includeSettled: true,
  query: '',
  groupBy: 'none',
  density: 'comfortable',
  status: 'ALL',
  kind: 'ALL',
};

export default function MovementsPage() {
  const [filters, setFilters] = React.useState<Filters>(() => {
    try { 
      const stored = JSON.parse(localStorage.getItem('mov.filters.v2') || '{}');
      return { 
        ...defaultFilters, 
        ...stored,
        dateFrom: stored.dateFrom || defaultFilters.dateFrom,
        dateTo: stored.dateTo || defaultFilters.dateTo,
      };
    }
    catch { return defaultFilters; }
  });

  const { state, dispatch } = useData();
  const [isNewModalOpen, setIsNewModalOpen] = React.useState(false);
  const [movementToEdit, setMovementToEdit] = React.useState<UIMovement | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [settleModalInfo, setSettleModalInfo] = React.useState<{ open: boolean; movement?: UIMovement }>({ open: false });
  const [error, setError] = React.useState<string | null>(null);
  const [alertModal, setAlertModal] = React.useState({ open: false, title: '', message: '' });
  const [revertConfirmModal, setRevertConfirmModal] = React.useState<{ open: boolean; movements: UIMovement[] }>({ open: false, movements: [] });


  React.useEffect(()=>{ localStorage.setItem('mov.filters.v2', JSON.stringify(filters)); },[filters]);

  const { currentPeriodMovements, previousPeriodMovements } = React.useMemo(() => {
    const allMovements = state.movements || [];
    
    // Current period
    const currentStart = new Date(filters.dateFrom + 'T00:00:00');
    const currentEnd = new Date(filters.dateTo + 'T23:59:59');
    
    const current = allMovements.filter(m => {
        const d = new Date(m.dueDate + 'T00:00:00');
        return d >= currentStart && d <= currentEnd;
    });

    // Previous period
    const durationDays = differenceInCalendarDays(currentEnd, currentStart);
    const prevEnd = subDays(currentStart, 1);
    const prevStart = subDays(prevEnd, durationDays);

    const previous = allMovements.filter(m => {
        const d = new Date(m.dueDate + 'T00:00:00');
        return d >= prevStart && d <= prevEnd;
    });
    
    return { currentPeriodMovements: current, previousPeriodMovements: previous };
}, [state.movements, filters.dateFrom, filters.dateTo]);


  const displayedItems = React.useMemo(() => {
    let baseItems = currentPeriodMovements;

    if (filters.query) {
      const q = filters.query.toLowerCase();
      baseItems = baseItems.filter(m => m.description.toLowerCase().includes(q));
    }
    if (filters.chip === 'RECEBER') {
      baseItems = baseItems.filter(m => m.kind === 'RECEITA');
    }
    if (filters.chip === 'PAGAR') {
      baseItems = baseItems.filter(m => m.kind === 'DESPESA');
    }
    if (filters.kind && filters.kind !== 'ALL') {
      baseItems = baseItems.filter(m => m.kind === filters.kind);
    }
    if (!filters.includeSettled) {
      baseItems = baseItems.filter(m => m.status !== MovementStatus.Baixado);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    let finalItems = baseItems.map(m => {
        const uiMov = toUIMovement(m, state);
        if (uiMov.status === 'PENDENTE' && uiMov.dueDate && uiMov.dueDate < todayStr) {
            return { ...uiMov, status: 'VENCIDO' as const };
        }
        return uiMov;
    });

    if (filters.status && filters.status !== 'ALL') {
        finalItems = finalItems.filter(item => item.status === filters.status);
    }
    
    finalItems.sort((a, b) => {
        const dateA = a.status === 'BAIXADO' && a.paidDate ? a.paidDate : a.dueDate;
        const dateB = b.status === 'BAIXADO' && b.paidDate ? b.paidDate : b.dueDate;
        return (dateB || '').localeCompare(dateA || '');
    });
    return finalItems;

  }, [currentPeriodMovements, state, filters]);

  function onChange(patch: Partial<Filters>) { 
    setFilters(f=>({ ...f, ...patch })); 
    setSelectedIds(new Set());
  }
  
  const onSaved = React.useCallback(() => {
    // Data will re-render automatically due to state change in context
  }, []);
  
  function handleEdit(movement: UIMovement) {
    if (movement.status === 'BAIXADO') {
      setAlertModal({
        open: true,
        title: 'Transação Baixada',
        message: 'Não é possível editar uma transação que já foi baixada. Por favor, estorne a transação primeiro para poder editá-la.',
      });
      return;
    }
    setMovementToEdit(movement);
    setIsNewModalOpen(true);
  }

  function handleOpenNewModal() {
    setIsNewModalOpen(true);
  }

  function handleCloseModal() {
    setIsNewModalOpen(false);
    setMovementToEdit(null);
  }
  
  const onBulk = React.useCallback(async (action: 'EXCLUIR' | 'BAIXAR' | 'ESTORNAR', ids: string[]) => {
    if (ids.length === 0) return;

    if (action === 'ESTORNAR') {
        const movementsToRevert = displayedItems.filter(m => ids.includes(m.id) && m.status === 'BAIXADO');
        if (movementsToRevert.length === 0) {
            setAlertModal({ open: true, title: 'Aviso', message: 'Nenhum dos movimentos selecionados pode ser estornado (apenas movimentos "Baixado").' });
            return;
        }
        setRevertConfirmModal({ open: true, movements: movementsToRevert });
        return;
    }

    if (action === 'BAIXAR') {
        const movementsToSettle = displayedItems.filter(m => ids.includes(m.id) && m.status !== 'BAIXADO');
        if (movementsToSettle.length === 1) {
            setSettleModalInfo({ open: true, movement: movementsToSettle[0] });
        } else {
            setAlertModal({ open: true, title: 'Atenção', message: 'A baixa em massa ainda não foi implementada.' });
        }
        return;
    }

    if (action === 'EXCLUIR') {
        const deletable = ids.filter(id => {
            const mov = state.movements.find(m => m.id === id);
            if (!mov) return false;
            if (mov.origin === MovementOrigin.Venda && mov.referenceId) {
                const sale = state.sales.find(s => s.id === mov.referenceId);
                if (sale && sale.status !== SaleTrackingStatus.VendaRealizada) return false;
            }
            return true;
        });

        if (deletable.length < ids.length) {
            setAlertModal({ open: true, title: 'Exclusão Parcial', message: 'Alguns movimentos não puderam ser excluídos pois estão vinculados a vendas em andamento.' });
        }

        if (deletable.length > 0) {
            dispatch({ type: 'DELETE_MULTIPLE_ITEMS', payload: { ids: deletable, collection: 'movements' } });
            setSelectedIds(new Set());
        }
    }
  }, [dispatch, state.movements, state.sales, displayedItems]);

  const handleConfirmRevert = () => {
    const movements = revertConfirmModal.movements;
    if (movements.length === 0) {
        setRevertConfirmModal({ open: false, movements: [] });
        return;
    }

    const updates: { item: Partial<Movement> & { id: string }, collection: 'movements' }[] = [];
    
    movements.forEach(uiMov => {
        const mov = state.movements.find(m => m.id === uiMov.id);
        if (mov) {
            // Revert the main movement
            updates.push({
                item: { ...mov, status: MovementStatus.EmAberto, paidDate: undefined, groupId: undefined },
                collection: 'movements'
            });

            // If it's a credit card invoice payment with a groupId, revert associated expenses
            const description = mov.description.toLowerCase();
            if (description.includes('pagamento fatura') && mov.groupId && mov.referenceId) {
                const cardAccountId = mov.referenceId;
                const expensesToRevert = state.movements.filter(m => 
                    m.groupId === mov.groupId && 
                    m.id !== mov.id &&
                    m.accountId === cardAccountId
                );
                
                expensesToRevert.forEach(exp => {
                    updates.push({
                        item: { ...exp, status: MovementStatus.EmAberto, paidDate: undefined, groupId: undefined },
                        collection: 'movements'
                    });
                });
            }
        }
    });

    updates.forEach(update => {
        dispatch({ type: 'UPDATE_ITEM', payload: update });
    });
    
    setSelectedIds(new Set());
    setRevertConfirmModal({ open: false, movements: [] });
  };


  const totals: Totals | null = React.useMemo(() => {
    const periodItems = filters.includeSettled 
        ? currentPeriodMovements 
        : currentPeriodMovements.filter(m => m.status !== MovementStatus.Baixado);

    const inflow = periodItems.filter(m => m.kind === MovementKind.RECEITA).reduce((sum, m) => sum + m.amountNet, 0);
    const outflow = periodItems.filter(m => m.kind === MovementKind.DESPESA).reduce((sum, m) => sum + m.amountNet, 0);

    const todayStr = format(startOfToday(), 'yyyy-MM-dd');
    const pendingToday = periodItems
        .filter(m => m.dueDate === todayStr && m.status !== MovementStatus.Baixado)
        .reduce((sum, m) => sum + (m.kind === 'RECEITA' ? m.amountNet : -m.amountNet), 0);
    
    const projectedBalance = periodItems.reduce((sum, m) => sum + (m.kind === 'RECEITA' ? m.amountNet : -m.amountNet), 0);

    return { inflow, outflow, net: inflow - outflow, pendingToday, projectedBalance };
  }, [currentPeriodMovements, filters.includeSettled]);
  

  const renderContent = () => {
    switch(filters.tab) {
      case 'calendario': return <CalendarView items={displayedItems} />;
      case 'fluxo': return <CashflowView items={displayedItems} />;
      case 'lista':
      default:
        return <DataTable
          items={displayedItems}
          density={filters.density}
          groupBy={filters.groupBy}
          onEdit={handleEdit}
          onSettleRequest={(m) => setSettleModalInfo({ open: true, movement: m })}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />;
    }
  };

  return (
    <div className="space-y-4">
      <TransactionsHeader 
          movs={currentPeriodMovements}
          prevMovs={previousPeriodMovements}
          dateFrom={filters.dateFrom || ''}
          dateTo={filters.dateTo || ''}
          onRangePreset={(p) => console.log(p)}
          onOpenNew={handleOpenNewModal}
          filters={filters}
          onFiltersChange={onChange}
      />
      
      <div className="px-6 lg:px-10">
        <div className="flex items-center gap-2 border-b border-white/10 mb-4">
          <PageTitle title="Transações" />
          <div className="ml-auto">
            <ViewOptionsMenu filters={filters} onFiltersChange={onChange} />
          </div>
        </div>

        <div className="tabs-container mb-4">
          <button className="tab-button" role="tab" aria-selected={filters.tab === 'lista'} onClick={() => onChange({ tab: 'lista' })}>Lista</button>
          <button className="tab-button" role="tab" aria-selected={filters.tab === 'calendario'} onClick={() => onChange({ tab: 'calendario' })}>Calendário</button>
          <button className="tab-button" role="tab" aria-selected={filters.tab === 'fluxo'} onClick={() => onChange({ tab: 'fluxo' })}>Fluxo</button>
        </div>

        {renderContent()}
      </div>

      <BulkBar 
        selectedIds={selectedIds}
        items={displayedItems}
        onBulkAction={onBulk}
        onClear={() => setSelectedIds(new Set())}
        onEdit={(item) => handleEdit(item)}
      />

      <NewMovementModal
        open={isNewModalOpen}
        onClose={handleCloseModal}
        onSaved={onSaved}
        movementToEdit={movementToEdit}
      />

      {settleModalInfo.movement && (
        <SettleMovementModal
          open={settleModalInfo.open}
          onClose={() => setSettleModalInfo({ open: false })}
          movementId={settleModalInfo.movement.id}
          defaultPaidDate={format(startOfToday(), 'yyyy-MM-dd')}
        />
      )}

      <AlertModal 
        isOpen={alertModal.open}
        onClose={() => setAlertModal({ open: false, title: '', message: '' })}
        title={alertModal.title}
        message={alertModal.message}
      />
      
      <Modal
        isOpen={revertConfirmModal.open}
        onClose={() => setRevertConfirmModal({ open: false, movements: [] })}
        title="Confirmar Estorno"
      >
        <p>
            Tem certeza que deseja estornar {revertConfirmModal.movements.length} transação(ões)? Elas voltarão ao status "Pendente".
            <br />
            <strong className="text-amber-400">Atenção:</strong> Se um pagamento de fatura de cartão for estornado, todas as despesas daquela fatura também serão estornadas.
        </p>
        <div className="mt-6 flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setRevertConfirmModal({ open: false, movements: [] })}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmRevert}>Estornar</Button>
        </div>
      </Modal>

    </div>
  );
}