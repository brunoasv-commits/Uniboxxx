

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Account, ID, Movement, MovementKind, AccountType, Settlement, MovementStatus } from '../../../types';
import PageTitle from '../../../components/ui/PageTitle';
import { AccountFiltersBar, FiltersState } from '../../components/accounts/AccountFilters';
import AccountSummaryCards, { SummaryTotals } from '../../components/accounts/AccountSummaryCards';
import StatementTable, { StatementRow } from '../../components/accounts/StatementTable';
import ChartsTab from '../../components/accounts/ChartsTab';
import { downloadCsv, toCsv } from '../../utils/csv';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import SummaryTab from './SummaryTab';

type Tab = 'extrato' | 'graficos' | 'resumo';

const InfoContasPage: React.FC = () => {
    const { state } = useData();
    const [activeTab, setActiveTab] = useState<Tab>('extrato');
    
    const availableAccounts = useMemo(() => state.accounts.filter(acc => acc.type !== AccountType.Cartao), [state.accounts]);

    const [filters, setFilters] = useState<FiltersState>(() => {
        const today = new Date();
        return {
            accountId: availableAccounts[0]?.id || '',
            dateFrom: format(startOfMonth(today), 'yyyy-MM-dd'),
            dateTo: format(endOfMonth(today), 'yyyy-MM-dd'),
            status: 'ALL',
            type: 'ALL',
            query: '',
        };
    });
    
    useEffect(() => {
        const preselectedAccountId = localStorage.getItem('selectedAccountId');
        if (preselectedAccountId && availableAccounts.some(a => a.id === preselectedAccountId)) {
            setFilters(f => ({ ...f, accountId: preselectedAccountId }));
            localStorage.removeItem('selectedAccountId');
        } else if (availableAccounts.length > 0 && !filters.accountId) {
            setFilters(f => ({ ...f, accountId: availableAccounts[0].id }));
        }
    }, [availableAccounts]);

    const handleRangePreset = (preset: "today" | "7d" | "30d" | "month") => {
        const today = new Date();
        let from = today, to = today;

        switch(preset) {
            case 'today': break;
            case '7d': from.setDate(today.getDate() - 6); break;
            case '30d': from.setDate(today.getDate() - 29); break;
            case 'month': from = startOfMonth(today); to = endOfMonth(today); break;
        }
        setFilters(f => ({ ...f, dateFrom: format(from, 'yyyy-MM-dd'), dateTo: format(to, 'yyyy-MM-dd') }));
    };

    const clearFilters = () => {
        const today = new Date();
        setFilters(f => ({
            ...f,
            dateFrom: format(startOfMonth(today), 'yyyy-MM-dd'),
            dateTo: format(endOfMonth(today), 'yyyy-MM-dd'),
            status: 'ALL',
            type: 'ALL',
            query: '',
        }));
    };

    const financialData = useMemo(() => {
        if (!filters.accountId) return null;
        const account = state.accounts.find(a => a.id === filters.accountId);
        if (!account) return null;

        const dateForMovement = (m: Movement): string => {
            return m.status === MovementStatus.Baixado ? (m.paidDate || m.dueDate) : m.dueDate;
        };

        const valueForAccount = (m: Movement): number => {
            if (m.accountId !== filters.accountId && m.destinationAccountId !== filters.accountId) return 0;
            
            const value = m.amountGross - (m.fees || 0);
            if (m.kind === MovementKind.DESPESA) {
                return m.accountId === filters.accountId ? -value : 0;
            }
            if (m.kind === MovementKind.TRANSFERENCIA) {
                if (m.accountId === filters.accountId) return -value; // Source
                if (m.destinationAccountId === filters.accountId) return value; // Destination
                return 0;
            }
            return m.accountId === filters.accountId ? value : 0; // RECEITA
        };

        const allAccountMovements = state.movements.filter(m => 
            m.accountId === filters.accountId || m.destinationAccountId === filters.accountId
        );

        const balanceBeforePeriod = account.initialBalance + allAccountMovements
            .filter(m => m.status === MovementStatus.Baixado && dateForMovement(m) < filters.dateFrom)
            .reduce((sum, m) => sum + valueForAccount(m), 0);
        
        const currentBalance = account.initialBalance + allAccountMovements
            .filter(m => m.status === MovementStatus.Baixado && dateForMovement(m) <= new Date().toISOString().split('T')[0])
            .reduce((sum, m) => sum + valueForAccount(m), 0);

        const transactionsInPeriodSource = allAccountMovements
            .filter(m => {
                const effectiveDate = dateForMovement(m);
                return effectiveDate >= filters.dateFrom && effectiveDate <= filters.dateTo;
            });
        
        const filteredTransactions = transactionsInPeriodSource.filter(t => { // Further filtering from UI
            const status = t.status || MovementStatus.EmAberto;
            const isOverdue = status === MovementStatus.EmAberto && dateForMovement(t) < new Date().toISOString().split('T')[0];
            const effectiveStatus = isOverdue ? MovementStatus.Vencido : status;

            if (filters.status !== 'ALL' && effectiveStatus !== filters.status) return false;
            
            if (filters.type !== 'ALL') {
                if (Object.values(MovementKind).includes(filters.type as MovementKind)) {
                    if (t.kind !== filters.type) return false;
                } else { // It's a category ID
                    if (t.categoryId !== filters.type) return false;
                }
            }

            if (filters.query && !t.description.toLowerCase().includes(filters.query.toLowerCase())) return false;
            return true;
        });
        
        const transactionsInPeriod = filteredTransactions
            .map(m => ({
                ...m,
                effectiveDate: dateForMovement(m),
                realizedValue: valueForAccount(m),
            }))
            .sort((a,b) => a.effectiveDate.localeCompare(b.effectiveDate) || a.description.localeCompare(b.description));

        let runningBalance = balanceBeforePeriod;
        const statementRows: StatementRow[] = transactionsInPeriod.map(t => {
            const valueBefore = runningBalance;
            if (t.status === MovementStatus.Baixado) {
                runningBalance += t.realizedValue;
            }
            
            const contact = state.contacts.find(c => c.id === t.contactId);
            const category = state.categories.find(c => c.id === t.categoryId);
            
            let status = t.status || MovementStatus.EmAberto;
            if (status === MovementStatus.EmAberto && t.effectiveDate < new Date().toISOString().split('T')[0]) {
                status = MovementStatus.Vencido;
            }

            return {
                id: t.id + (t.status === MovementStatus.Baixado ? `-s-${t.effectiveDate}` : '-p'),
                effectiveDate: t.effectiveDate,
                description: t.description,
                kind: t.kind,
                status: status,
                categoryName: t.kind === MovementKind.TRANSFERENCIA ? 'Transferência' : (category?.name || 'N/A'),
                contactName: contact?.name || 'N/A',
                value: t.realizedValue,
                runningBalance: t.status === MovementStatus.Baixado ? runningBalance : valueBefore,
            };
        });

        const settledInPeriod = transactionsInPeriodSource.filter(m => m.status === MovementStatus.Baixado);

        const inflow = settledInPeriod.filter(r => valueForAccount(r) > 0).reduce((s, r) => s + valueForAccount(r), 0);
        const outflow = settledInPeriod.filter(r => valueForAccount(r) < 0).reduce((s, r) => s + valueForAccount(r), 0);
        
        const totals: SummaryTotals = {
            initialBalance: balanceBeforePeriod,
            inflow: inflow,
            outflow: outflow,
            net: inflow + outflow,
            currentBalance: currentBalance,
            projectedBalance: balanceBeforePeriod + transactionsInPeriodSource.reduce((s,r)=>s+valueForAccount(r),0),
            deltas: {},
        };

        return { account, totals, filteredMovements: transactionsInPeriodSource, statementRows };
    }, [filters, state]);


    const handleExport = useCallback(() => {
        if (!financialData) return;
        const accountName = financialData.account.name.replace(/\s+/g, '_');
        const period = `${filters.dateFrom}_a_${filters.dateTo}`;
        const filename = `Extrato_${accountName}_${period}.csv`;

        const headers = { effectiveDate: 'Data', description: 'Descrição', categoryName: 'Categoria', contactName: 'Contato', value: 'Valor (R$)', status: 'Status' };
        
        const dataForCsv = financialData.statementRows.map(row => ({
             ...row,
             value: row.value.toFixed(2).replace('.', ','),
        }));

        const csv = toCsv(dataForCsv, headers);
        downloadCsv(filename, csv);

    }, [financialData, filters.dateFrom, filters.dateTo]);

    return (
        <div className="space-y-4">
            <PageTitle title="Informações de Contas" />

            <AccountFiltersBar 
                status={filters.status}
                type={filters.type}
                from={filters.dateFrom}
                to={filters.dateTo}
                query={filters.query}
                onChangeStatus={(status) => setFilters(f => ({ ...f, status }))}
                onChangeType={(type) => setFilters(f => ({ ...f, type }))}
                onChangeFrom={(dateFrom) => setFilters(f => ({ ...f, dateFrom }))}
                onChangeTo={(dateTo) => setFilters(f => ({ ...f, dateTo }))}
                onChangeQuery={(query) => setFilters(f => ({ ...f, query }))}
                onPreset={handleRangePreset}
                onClear={clearFilters}
                onExportCsv={handleExport}
                accounts={availableAccounts}
                accountId={filters.accountId}
                onChangeAccount={(accountId) => setFilters(f => ({ ...f, accountId }))}
                // Fix: Pass required 'categories' prop
                categories={state.categories}
            />

            {financialData && <AccountSummaryCards totals={financialData.totals} />}
            
            <div className="tabs-container">
                 <button 
                    role="tab"
                    aria-selected={activeTab === 'extrato'}
                    onClick={() => setActiveTab('extrato')}
                    className="tab-button"
                >
                    Extrato
                </button>
                 <button 
                    role="tab"
                    aria-selected={activeTab === 'resumo'}
                    onClick={() => setActiveTab('resumo')}
                    className="tab-button"
                >
                    Resumo
                </button>
                <button 
                    role="tab"
                    aria-selected={activeTab === 'graficos'}
                    onClick={() => setActiveTab('graficos')}
                    className="tab-button"
                >
                    Gráficos
                </button>
            </div>


            <div className="bg-white dark:bg-gray-800/50 p-4 rounded-lg shadow-inner min-h-[400px]">
                {activeTab === 'extrato' && financialData && (
                    <StatementTable 
                        items={financialData.statementRows}
                        initialBalance={financialData.totals.initialBalance}
                        statusFilter={filters.status}
                    />
                )}
                 {activeTab === 'resumo' && financialData && (
                    <SummaryTab
                        accountId={filters.accountId}
                        movements={financialData.filteredMovements}
                        openingBalance={financialData.totals.initialBalance}
                        state={state}
                    />
                 )}
                 {activeTab === 'graficos' && financialData && <ChartsTab movements={financialData.filteredMovements} state={state} />}
            </div>
        </div>
    );
};

export default InfoContasPage;