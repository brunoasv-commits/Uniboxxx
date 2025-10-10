

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Account, AccountType, Movement, MovementStatus, MovementKind } from '../../../types';
import PageTitle from '../../../components/ui/PageTitle';
import { getInvoiceData, getCardSummary, CardSummary } from '../../lib/creditCard';
import SummaryCards from './components/SummaryCards';
import FiltersBar from './components/FiltersBar';
import ExpensesTable from './components/ExpensesTable';
import PayInvoiceModal from './components/PayInvoiceModal';
import NewExpenseModal from './components/NewExpenseModal';
import Button from '../../../components/ui/Button';
import { Plus, Download } from 'lucide-react';
import { downloadCsv, toCsv } from '../../utils/csv';
import Modal from '../../../components/Modal';

// Fix: Define an explicit type for filters to ensure type safety.
type PageFilters = {
    status: 'ALL' | MovementStatus;
    categoryId: string;
    query: string;
};

const CreditCardExpensesPage: React.FC = () => {
    const { state, dispatch } = useData();
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [modals, setModals] = useState({ payInvoice: false, newExpense: false, confirmDelete: false });
    // Fix: Use the explicit PageFilters type for the state.
    const [filters, setFilters] = useState<PageFilters>({ status: 'ALL', categoryId: 'ALL', query: '' });
    const [expenseToEdit, setExpenseToEdit] = useState<Movement | null>(null);
    const [expenseToDelete, setExpenseToDelete] = useState<Movement | null>(null);

    const cardAccounts = useMemo(() => state.accounts.filter(acc => acc.type === AccountType.Cartao), [state.accounts]);

    useEffect(() => {
        if (cardAccounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(cardAccounts[0].id);
        }
    }, [cardAccounts, selectedAccountId]);

    const selectedAccount = useMemo(() => cardAccounts.find(acc => acc.id === selectedAccountId), [selectedAccountId, cardAccounts]);

    const invoiceData = useMemo(() => {
        if (!selectedAccount) return null;
        return getInvoiceData(state.movements, selectedAccount, currentMonth);
    }, [selectedAccount, currentMonth, state.movements]);
    
    const cardSummary: CardSummary | null = useMemo(() => {
        if (!selectedAccount || !invoiceData) return null;
        
        const currentOpenBalance = state.movements
            .filter(m => m.accountId === selectedAccount.id && m.kind === MovementKind.DESPESA && m.status !== MovementStatus.Baixado)
            .reduce((sum, m) => sum + m.amountNet, 0);

        return getCardSummary(selectedAccount, invoiceData, currentOpenBalance);
    }, [selectedAccount, invoiceData, state.movements]);


    const filteredExpenses = useMemo(() => {
        let expenses = invoiceData?.expenses || [];
        if (filters.status !== 'ALL') {
            // Fix: Simplified filtering logic now that filter state has the correct type.
            expenses = expenses.filter(e => (e.status || MovementStatus.EmAberto) === filters.status);
        }
        if (filters.categoryId !== 'ALL') {
            expenses = expenses.filter(e => e.categoryId === filters.categoryId);
        }
        if (filters.query) {
            const q = filters.query.toLowerCase();
            expenses = expenses.filter(e => e.description.toLowerCase().includes(q));
        }
        return expenses;
    }, [invoiceData, filters]);

    const handleEdit = (expense: Movement) => {
        setExpenseToEdit(expense);
        setModals(m => ({ ...m, newExpense: true }));
    };

    const handleDeleteRequest = (expense: Movement) => {
        setExpenseToDelete(expense);
        setModals(m => ({ ...m, confirmDelete: true }));
    };

    const handleConfirmDelete = () => {
        if (expenseToDelete) {
            dispatch({ type: 'DELETE_ITEM', payload: { id: expenseToDelete.id, collection: 'movements' } });
        }
        setExpenseToDelete(null);
        setModals(m => ({ ...m, confirmDelete: false }));
    };

    const handleCloseNewExpenseModal = () => {
        setExpenseToEdit(null);
        setModals(m => ({ ...m, newExpense: false }));
    }

    const handleExport = () => {
        if (!selectedAccount || filteredExpenses.length === 0) {
            alert("Nenhum dado para exportar.");
            return;
        }
        const accountName = selectedAccount.name.replace(/\s+/g, '_');
        const period = currentMonth.toISOString().slice(0, 7);
        const filename = `fatura_${accountName}_${period}.csv`;

        const dataForCsv = filteredExpenses.map(exp => {
            const category = state.categories.find(c => c.id === exp.categoryId)?.name || 'N/A';
            return {
                Data: exp.transactionDate || exp.dueDate,
                Descrição: exp.description,
                Categoria: category,
                Valor: exp.amountGross.toFixed(2).replace('.',','),
                Status: exp.status || 'Pendente'
            };
        });

        const csv = toCsv(dataForCsv, { Data: 'Data', Descrição: 'Descrição', Categoria: 'Categoria', Valor: 'Valor', Status: 'Status' });
        downloadCsv(filename, csv);
    };

    if (cardAccounts.length === 0) {
        return (
            <div>
                <PageTitle title="Despesas do Cartão" />
                <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <p>Nenhum cartão de crédito cadastrado.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <PageTitle
                title="Despesas do Cartão"
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={handleExport}><Download size={14} className="mr-2"/>Exportar</Button>
                        <Button variant="secondary" onClick={() => setModals(m => ({...m, payInvoice: true}))} disabled={!invoiceData || invoiceData.total <= 0}>Pagar Fatura</Button>
                        <Button variant="primary" onClick={() => setModals(m => ({...m, newExpense: true}))} disabled={!selectedAccount}><Plus size={14} className="mr-2"/>Nova Compra</Button>
                    </div>
                }
            />

            {cardSummary && <SummaryCards summary={cardSummary} />}
            
            <FiltersBar
                cardAccounts={cardAccounts}
                selectedAccountId={selectedAccountId}
                onAccountChange={setSelectedAccountId}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                filters={filters}
                onFiltersChange={setFilters}
                categories={state.categories}
            />

            {invoiceData && selectedAccount ? (
                <>
                    <ExpensesTable
                        expenses={filteredExpenses}
                        invoiceDueDate={invoiceData.dueDate}
                        invoiceClosingDate={invoiceData.closingDate}
                        total={invoiceData.total}
                        onEdit={handleEdit}
                        onDelete={handleDeleteRequest}
                    />
                    <PayInvoiceModal
                        isOpen={modals.payInvoice}
                        onClose={() => setModals(m => ({...m, payInvoice: false}))}
                        invoiceTotal={invoiceData.openTotal}
                        cardAccount={selectedAccount}
                        invoiceDueDate={invoiceData.dueDate}
                        expensesToSettle={invoiceData.expenses.filter(e => e.status !== MovementStatus.Baixado)}
                    />
                </>
            ) : (
                <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg shadow">
                    <p>Selecione um cartão para ver as despesas.</p>
                </div>
            )}
            
            {selectedAccount && <NewExpenseModal
                isOpen={modals.newExpense}
                onClose={handleCloseNewExpenseModal}
                cardAccount={selectedAccount}
                expenseToEdit={expenseToEdit}
            />}

            {expenseToDelete && (
                 <Modal isOpen={modals.confirmDelete} onClose={() => setModals(m => ({...m, confirmDelete: false}))} title="Confirmar Exclusão">
                    <p>Tem certeza que deseja excluir a despesa "<strong>{expenseToDelete.description}</strong>"?</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setModals(m => ({...m, confirmDelete: false}))}>Cancelar</Button>
                        <Button variant="danger" onClick={handleConfirmDelete}>Excluir</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CreditCardExpensesPage;
