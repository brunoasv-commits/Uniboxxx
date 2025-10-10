import React, { useState, useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import { format } from 'date-fns';
import { MovementOrigin, MovementStatus } from '../../../types';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    // Add timezone to prevent date from shifting
    return new Date(dateString + 'T00:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

type AmazonPaymentRow = {
    saleId: string;
    orderCode?: string;
    productName: string;
    status: 'Pago' | 'Pendente';
    unitPrice: number;
    tax: number;
    freight: number;
    total: number;
    paymentDate: string;
    isOverdue: boolean;
};

const StatusBadge: React.FC<{ status: 'Pago' | 'Pendente' }> = ({ status }) => {
    const isPaid = status === 'Pago';
    const classes = isPaid
        ? 'bg-green-500/10 text-green-400'
        : 'bg-amber-500/10 text-amber-400';
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
            {status}
        </span>
    );
};

const AmazonPaymentsTab: React.FC = () => {
    const { state } = useData();
    const [filters, setFilters] = useState({
        dateFrom: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
        dateTo: format(new Date(), 'yyyy-MM-dd'),
        search: '',
    });
    const [sort, setSort] = useState<{ by: 'orderCode' | 'paymentDate', dir: 'asc' | 'desc' }>({ by: 'paymentDate', dir: 'desc' });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSort = (column: 'paymentDate' | 'orderCode') => {
        setSort(prev => ({
            by: column,
            dir: prev.by === column && prev.dir === 'asc' ? 'desc' : 'asc'
        }));
    };

    const { data, grandTotal } = useMemo(() => {
        const rows: AmazonPaymentRow[] = [];

        const salesInPeriod = state.sales.filter(s =>
            s.saleDate >= filters.dateFrom && s.saleDate <= filters.dateTo
        );

        for (const sale of salesInPeriod) {
            const product = state.products.find(p => p.id === sale.productId);
            if (!product) continue;

            if (filters.search && 
                !product.name.toLowerCase().includes(filters.search.toLowerCase()) && 
                !(sale.orderCode && sale.orderCode.toLowerCase().includes(filters.search.toLowerCase()))
            ) {
                continue;
            }
            
            const saleMovement = state.movements.find(m => m.referenceId === sale.id && m.origin === MovementOrigin.Venda);
            const isPaid = saleMovement?.status === MovementStatus.Baixado;
            const paymentDate = (isPaid && saleMovement.paidDate) ? saleMovement.paidDate : (saleMovement?.dueDate || sale.estimatedPaymentDate);
            const today = format(new Date(), 'yyyy-MM-dd');
            const isOverdue = !isPaid && paymentDate < today;
            const status = isPaid ? 'Pago' : 'Pendente';

            const total = (sale.unitPrice * sale.quantity) + sale.freight - sale.tax;

            rows.push({
                saleId: sale.id,
                orderCode: sale.orderCode,
                productName: product.name,
                status: status,
                unitPrice: sale.unitPrice,
                tax: sale.tax,
                freight: sale.freight,
                total: total,
                paymentDate: paymentDate,
                isOverdue: isOverdue,
            });
        }
        
        const sortedData = rows.sort((a, b) => {
            if (sort.by === 'paymentDate') {
                const dateA = a.paymentDate || '0';
                const dateB = b.paymentDate || '0';
                return sort.dir === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
            }
            const codeA = a.orderCode || '';
            const codeB = b.orderCode || '';
            return sort.dir === 'asc' ? codeA.localeCompare(codeB) : codeB.localeCompare(codeA);
        });
        
        const grandTotal = sortedData.reduce((acc, item) => acc + item.total, 0);

        return { data: sortedData, grandTotal };
        
    }, [state.sales, state.products, state.movements, filters, sort]);

    const inputClass = "h-9 bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 rounded-full px-4 text-sm";

    return (
        <div className="space-y-4">
             <div className="flex flex-wrap items-center gap-4">
                <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className={inputClass} />
                <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} className={inputClass} />
                <input type="search" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Buscar por produto ou cód. ordem..." className={`${inputClass} w-72`} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300">
                    <thead className="text-xs text-gray-600 uppercase bg-gray-50 dark:bg-gray-700/60 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('orderCode')}>
                                Código da Ordem {sort.by === 'orderCode' && (sort.dir === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="px-6 py-3">Nome do Produto</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 cursor-pointer" onClick={() => handleSort('paymentDate')}>
                                Data Pagamento {sort.by === 'paymentDate' && (sort.dir === 'asc' ? '↑' : '↓')}
                            </th>
                            <th className="px-6 py-3 text-right">Valor Unitário</th>
                            <th className="px-6 py-3 text-right">Imposto</th>
                            <th className="px-6 py-3 text-right">Frete</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => {
                            const dateCellStyle = item.isOverdue ? 'bg-amber-500/10 text-amber-300' : '';
                            return (
                                <tr key={item.saleId} className="border-b dark:border-gray-700 group">
                                    <td className="px-6 py-2 font-mono text-xs">{item.orderCode || '—'}</td>
                                    <td className="px-6 py-2 font-medium">{item.productName}</td>
                                    <td className="px-6 py-2"><StatusBadge status={item.status} /></td>
                                    <td className={`px-6 py-2 ${dateCellStyle}`}>{formatDate(item.paymentDate)}</td>
                                    <td className="px-6 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="px-6 py-2 text-right">{formatCurrency(item.tax)}</td>
                                    <td className="px-6 py-2 text-right">{formatCurrency(item.freight)}</td>
                                    <td className="px-6 py-2 text-right font-bold">{formatCurrency(item.total)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                     <tfoot className="text-xs uppercase text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/60 font-bold">
                        <tr>
                            <td className="px-6 py-3" colSpan={7}>Total Geral</td>
                            <td className="px-6 py-3 text-right">{formatCurrency(grandTotal)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default AmazonPaymentsTab;