
import React from 'react';
import { Account, Category, MovementStatus } from '../../../../types';
import Button from '../../../../components/ui/Button';

interface FiltersBarProps {
    cardAccounts: Account[];
    selectedAccountId: string;
    onAccountChange: (id: string) => void;
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    filters: { status: 'ALL' | MovementStatus, categoryId: string, query: string };
    onFiltersChange: React.Dispatch<React.SetStateAction<{ status: 'ALL' | MovementStatus, categoryId: string, query: string }>>;
    categories: Category[];
}

const addMonths = (date: Date, months: number): Date => {
    const d = new Date(date);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d;
};

const FiltersBar: React.FC<FiltersBarProps> = ({
    cardAccounts, selectedAccountId, onAccountChange, currentMonth, onMonthChange,
    filters, onFiltersChange, categories
}) => {
    const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
        onFiltersChange(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
                <label htmlFor="card-select" className="text-sm font-medium shrink-0">Cartão:</label>
                <select id="card-select" value={selectedAccountId} onChange={e => onAccountChange(e.target.value)} className="bg-gray-50 border border-gray-300 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600">
                    {cardAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onMonthChange(addMonths(currentMonth, -1))}>{'<'}</Button>
                <span className="font-semibold w-32 text-center text-sm">{currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
                <Button variant="ghost" size="sm" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>{'>'}</Button>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="chip" size="sm" active={filters.status === 'ALL'} onClick={() => handleFilterChange('status', 'ALL')}>Todas</Button>
                {/* Fix: Use correct enum values for comparison and state update. */}
                <Button variant="chip" size="sm" active={filters.status === MovementStatus.EmAberto} onClick={() => handleFilterChange('status', MovementStatus.EmAberto)}>Aberta</Button>
                {/* Fix: Use correct enum values for comparison and state update. */}
                <Button variant="chip" size="sm" active={filters.status === MovementStatus.Baixado} onClick={() => handleFilterChange('status', MovementStatus.Baixado)}>Paga</Button>
            </div>
            <select
                value={filters.categoryId}
                onChange={e => handleFilterChange('categoryId', e.target.value)}
                className="bg-gray-50 border border-gray-300 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 w-48"
            >
                <option value="ALL">Todas as Categorias</option>
                {categories.filter(c => c.type === 'Despesa').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input
                type="search"
                placeholder="Buscar despesa..."
                value={filters.query}
                onChange={e => handleFilterChange('query', e.target.value)}
                className="bg-gray-50 border border-gray-300 text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600"
            />
        </div>
    );
};

export default FiltersBar;
