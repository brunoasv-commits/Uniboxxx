

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import { useData } from '../contexts/DataContext';
import { Account, AccountType, ID, MovementKind } from '../types';
import AccountFormModal from '../components/AccountFormModal';
import { useHotkeys } from '../hooks/useHotkeys';
import Tip from '../components/Tip';
import PageTitle from '../components/ui/PageTitle';
import { formatBRL } from '../utils/money';
import AccountCard from '../components/AccountCard';
import { List, Grid3X3, Copy, Edit, Trash2 } from "lucide-react";
import Button from '../components/ui/Button';
import NewMovementModal from '../src/pages/movements/NewMovementModal';
import { Page } from '../App';

const accountTypeColors: Record<AccountType, string> = {
    [AccountType.Banco]: '#3b82f6', // blue
    [AccountType.Caixa]: '#6b7280', // gray
    [AccountType.Cartao]: '#a855f7', // purple
    [AccountType.Investimento]: '#f59e0b', // amber
};

const TypeBadge: React.FC<{ type: AccountType }> = ({ type }) => (
    <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: `${accountTypeColors[type]}1A`, color: accountTypeColors[type]}}>
        {type}
    </span>
);

const bestPurchaseDay = (closingDay: number) => ((closingDay % 31) + 1);

interface AccountsPageProps {
  setActivePage: (page: Page) => void;
}

const AccountsPage: React.FC<AccountsPageProps> = ({ setActivePage }) => {
    const { state, dispatch } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
    const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
    const [accountsToDelete, setAccountsToDelete] = useState<ID[]>([]);
    
    // New state for advanced features
    const [view, setView] = useState<'list' | 'cards'>(() => (localStorage.getItem('accounts.viewMode') as any) || 'cards');
    const [sort, setSort] = useState<{ by: 'name' | 'type', dir: 'asc' | 'desc' }>({ by: 'type', dir: 'asc' });
    const [dense, setDense] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<ID>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // State for New Movement Modal
    const [isNewMovementModalOpen, setIsNewMovementModalOpen] = useState(false);
    const [prefilledModalData, setPrefilledModalData] = useState<{ accountId: string; kind: MovementKind } | null>(null);

    useEffect(() => localStorage.setItem('accounts.viewMode', view), [view]);

    const openModal = (account: Account | null = null, isDuplicating = false) => {
        let accountData = account;
        if (isDuplicating && account) {
            accountData = { ...account, id: '', name: `${account.name} (Cópia)` };
        }
        setCurrentAccount(accountData);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setCurrentAccount(null);
        setIsModalOpen(false);
    };
    
    const isAccountInUse = (accountId: string): boolean => {
        return state.sales.some(s => s.creditAccountId === accountId)
            || state.movements.some(m => m.accountId === accountId || m.destinationAccountId === accountId)
            || state.settlements.some(s => s.accountId === accountId)
            || state.stockPurchases.some(sp => state.movements.find(m => m.id === sp.movementId)?.accountId === accountId);
    };

    const openConfirmDeleteModal = (accounts: Account[]) => {
        if (accounts.length === 1) {
            setAccountToDelete(accounts[0]);
        }
        setAccountsToDelete(accounts.map(a => a.id));
        setIsConfirmModalOpen(true);
    };

    const closeConfirmModal = () => {
        setAccountToDelete(null);
        setAccountsToDelete([]);
        setIsConfirmModalOpen(false);
    };
    
    const handleConfirmDelete = () => {
        if (accountsToDelete.length === 0) {
            closeConfirmModal();
            return;
        }

        const deletableIds = accountsToDelete.filter(id => !isAccountInUse(id));

        if (deletableIds.length < accountsToDelete.length) {
            const nonDeletableCount = accountsToDelete.length - deletableIds.length;
            alert(`${nonDeletableCount} conta(s) não pode(m) ser excluída(s) por estar(em) em uso.`);
        }

        if (deletableIds.length > 0) {
            dispatch({ type: 'DELETE_MULTIPLE_ITEMS', payload: { ids: deletableIds, collection: 'accounts' } });
        }

        setSelectedIds(new Set());
        closeConfirmModal();
    };

    const accountDetails = useMemo(() => {
        const details: Record<ID, { balance: number, lastMovementAt?: string }> = {};
        state.accounts.forEach(acc => {
            const settlements = state.settlements.filter(s => s.accountId === acc.id);
            // FIX: Use `kind` instead of `type` and `MovementKind` enum.
            const income = settlements.reduce((sum, s) => state.movements.find(m => m.id === s.movementId)?.kind === MovementKind.RECEITA ? sum + s.value : sum, 0);
            // FIX: Use `kind` instead of `type` and `MovementKind` enum.
            const outcome = settlements.reduce((sum, s) => state.movements.find(m => m.id === s.movementId)?.kind === MovementKind.DESPESA ? sum + s.value : sum, 0);
            const lastMovement = settlements.sort((a,b) => new Date(b.settlementDate).getTime() - new Date(a.settlementDate).getTime())[0];
            details[acc.id] = {
                balance: acc.initialBalance + income - outcome,
                lastMovementAt: lastMovement?.settlementDate,
            };
        });
        return details;
    }, [state.accounts, state.settlements, state.movements]);
    
    const summaryData = useMemo(() => {
        const summary = {
            [AccountType.Banco]: { count: 0, balance: 0 },
            [AccountType.Caixa]: { count: 0, balance: 0 },
            [AccountType.Cartao]: { count: 0, usedLimit: 0, totalLimit: 0 },
            [AccountType.Investimento]: { count: 0, balance: 0 },
        };

        state.accounts.forEach(acc => {
            summary[acc.type].count++;
            if (acc.type === AccountType.Cartao) {
                summary[acc.type].totalLimit += acc.cardLimit || 0;
            } else {
                summary[acc.type].balance += accountDetails[acc.id]?.balance || 0;
            }
        });
        return summary;
    }, [state.accounts, accountDetails]);

    const filteredAndSortedAccounts = useMemo(() => {
        return [...state.accounts]
            .map(acc => ({...acc, ...accountDetails[acc.id]}))
            .filter(acc => acc.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                if (sort.by === 'type' && a.type !== b.type) {
                    return sort.dir === 'asc' ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
                }
                return sort.dir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            });
    }, [state.accounts, searchTerm, sort, accountDetails]);
    
    const handleSort = (column: 'name' | 'type') => {
        setSort(prev => ({
            by: column,
            dir: prev.by === column && prev.dir === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = new Set(filteredAndSortedAccounts.map(acc => acc.id));
            setSelectedIds(allIds);
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handleSelectOne = (accountId: ID) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(accountId)) {
                newSet.delete(accountId);
            } else {
                newSet.add(accountId);
            }
            return newSet;
        });
    };
    
    useHotkeys({
        '/': () => searchInputRef.current?.focus(),
        'n': () => openModal(null),
    });

    const handleStatement = (account: Account) => {
      localStorage.setItem('selectedAccountId', account.id);
      setActivePage('Info. Contas');
    };

    const handleAdjust = (account: Account) => {
      setPrefilledModalData({ accountId: account.id, kind: MovementKind.RECEITA });
      setIsNewMovementModalOpen(true);
    };
    
    const handleTransfer = (account: Account) => {
      setPrefilledModalData({ accountId: account.id, kind: MovementKind.TRANSFERENCIA });
      setIsNewMovementModalOpen(true);
    };

    const isAllSelected = selectedIds.size > 0 && selectedIds.size === filteredAndSortedAccounts.length;

    return (
        <div>
            <PageTitle title="Contas" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Bancos ({summaryData[AccountType.Banco].count})</p><p className="text-xl font-bold">{formatBRL(summaryData[AccountType.Banco].balance)}</p></div>
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Caixa ({summaryData[AccountType.Caixa].count})</p><p className="text-xl font-bold">{formatBRL(summaryData[AccountType.Caixa].balance)}</p></div>
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Cartões ({summaryData[AccountType.Cartao].count})</p><p className="text-xl font-bold">{formatBRL(summaryData[AccountType.Cartao].totalLimit)} <span className="text-sm font-normal text-gray-400">em limite</span></p></div>
                 <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><p className="text-sm text-gray-500">Investimentos ({summaryData[AccountType.Investimento].count})</p><p className="text-xl font-bold">{formatBRL(summaryData[AccountType.Investimento].balance)}</p></div>
            </div>

            <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2">
                    <input ref={searchInputRef} type="search" placeholder="Buscar conta..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-9 w-48 rounded-full bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 px-3 text-sm" />
                    {selectedIds.size > 0 && (
                         <Button variant="danger-ghost" size="sm" onClick={() => openConfirmDeleteModal(state.accounts.filter(a => selectedIds.has(a.id)))}>
                            Excluir ({selectedIds.size})
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="inline-flex rounded-full border border-gray-700 p-1 bg-gray-900">
                        <Button
                            variant="chip"
                            size="sm"
                            active={view === "list"}
                            onClick={() => setView("list")}
                        >
                            <List className="h-4 w-4 mr-2" /> Lista
                        </Button>
                        <Button
                            variant="chip"
                            size="sm"
                            active={view === "cards"}
                            onClick={() => setView("cards")}
                        >
                            <Grid3X3 className="h-4 w-4 mr-2" /> Cartão
                        </Button>
                    </div>
                    <Button variant="primary" onClick={() => openModal()}>
                        Nova Conta
                    </Button>
                </div>
            </div>
            
            {view === 'list' ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/60 dark:text-gray-400 sticky top-0 z-10 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700/60">
                            <tr>
                                <th scope="col" className="p-4 w-4"><input type="checkbox" checked={isAllSelected} onChange={handleSelectAll} className="w-4 h-4 rounded" /></th>
                                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('name')}>Nome {sort.by === 'name' && (sort.dir === 'asc' ? '↑' : '↓')}</th>
                                <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => handleSort('type')}>Tipo {sort.by === 'type' && (sort.dir === 'asc' ? '↑' : '↓')}</th>
                                <th scope="col" className="px-6 py-3">Informações</th>
                                <th scope="col" className="px-6 py-3 text-right w-32">Ações</th>
                            </tr>
                        </thead>
                        <tbody className={`[&_tr:nth-child(even)]:bg-gray-50 dark:[&_tr:nth-child(even)]:bg-gray-800/40 ${dense ? '[&_tr]:h-[44px]' : '[&_tr]:h-[56px]'}`}>
                            {filteredAndSortedAccounts.map(acc => {
                                const isInUse = isAccountInUse(acc.id);
                                return (
                                    <tr key={acc.id} className="border-b dark:border-gray-700 group">
                                        <td className="p-4 w-4"><input type="checkbox" checked={selectedIds.has(acc.id)} onChange={() => handleSelectOne(acc.id)} className="w-4 h-4 rounded" /></td>
                                        <td className="px-6 py-2 font-medium text-gray-900 whitespace-nowrap dark:text-white">{acc.name}</td>
                                        <td className="px-6 py-2"><TypeBadge type={acc.type} /></td>
                                        <td className="px-6 py-2 text-xs text-gray-500 dark:text-gray-400">
                                            {acc.type === AccountType.Cartao ? `Fech: ${acc.cardClosingDay} · Venc: ${acc.cardDueDate} · Melhor dia: ${bestPurchaseDay(acc.cardClosingDay || 1)}` : `Saldo: ${formatBRL(acc.balance || 0)}`}
                                        </td>
                                        <td className="px-6 py-2 text-right">
                                            <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tip label="Duplicar"><button onClick={() => openModal(acc, true)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><Copy size={16}/></button></Tip>
                                                <Tip label="Editar"><button onClick={() => openModal(acc)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><Edit size={16}/></button></Tip>
                                                <Tip label={isInUse ? "Conta em uso" : "Excluir"}><button onClick={() => openConfirmDeleteModal([acc])} disabled={isInUse} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 size={16}/></button></Tip>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {filteredAndSortedAccounts.map(acc => (
                        <AccountCard 
                            key={acc.id} 
                            account={acc} 
                            onTransfer={handleTransfer}
                            onAdjust={handleAdjust}
                            onStatement={handleStatement}
                            onEdit={openModal}
                            onDelete={(account) => openConfirmDeleteModal([account])}
                            isDeletable={!isAccountInUse(acc.id)}
                        />
                    ))}
                </div>
            )}


            {isModalOpen && <AccountFormModal isOpen={isModalOpen} onClose={closeModal} account={currentAccount}/>}

            {isNewMovementModalOpen && (
                <NewMovementModal 
                    open={isNewMovementModalOpen}
                    onClose={() => setIsNewMovementModalOpen(false)}
                    onSaved={() => setIsNewMovementModalOpen(false)}
                    movementToEdit={null}
                    initialKind={prefilledModalData?.kind}
                    prefilledAccountId={prefilledModalData?.accountId}
                />
            )}

            {isConfirmModalOpen && (
                <Modal isOpen={isConfirmModalOpen} onClose={closeConfirmModal} title="Confirmar Exclusão">
                    <div>
                        <p className="text-gray-700 dark:text-gray-300">
                            Tem certeza que deseja excluir {accountsToDelete.length > 1 ? `${accountsToDelete.length} contas` : `a conta "${accountToDelete?.name}"`}?
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Contas em uso não serão excluídas. Esta ação não pode ser desfeita para as contas elegíveis.
                        </p>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button variant="ghost" type="button" onClick={closeConfirmModal}>
                            Cancelar
                        </Button>
                        <Button variant="danger" type="button" onClick={handleConfirmDelete}>
                            Excluir
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default AccountsPage;
