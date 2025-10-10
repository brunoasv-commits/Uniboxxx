import React, { useState, useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Sale, Product, Movement, ID } from '../../../types';
import { format } from 'date-fns';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type SaleAnalysisRow = {
    saleId: ID;
    productName: string;
    productSku: string;
    tax: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    margin: number;
};

const ProductSalesAnalysis: React.FC = () => {
    const { state } = useData();
    const [filters, setFilters] = useState({
        dateFrom: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'),
        dateTo: format(new Date(), 'yyyy-MM-dd'),
        search: '',
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const { data, grandTotals } = useMemo(() => {
        const salesInPeriod = state.sales.filter(s =>
            s.saleDate >= filters.dateFrom && s.saleDate <= filters.dateTo
        );

        const analysisRows: SaleAnalysisRow[] = [];

        for (const sale of salesInPeriod) {
            const product = state.products.find(p => p.id === sale.productId);
            if (!product) continue;

            if (filters.search && 
                !product.name.toLowerCase().includes(filters.search.toLowerCase()) && 
                !product.sku.toLowerCase().includes(filters.search.toLowerCase())) {
                continue;
            }

            const revenue = (sale.quantity * sale.unitPrice) - sale.discount + sale.freight;
            
            const saleUnitCost = (() => {
                if (sale.purchaseMovementId) {
                    const purchaseMovement = state.movements.find(m => m.id === sale.purchaseMovementId);
                    if (purchaseMovement && sale.quantity > 0) {
                        return purchaseMovement.amountGross / sale.quantity;
                    }
                }
                return product?.cost || 0;
            })();

            const cost = (sale.quantity * saleUnitCost) + sale.tax + (sale.additionalCost || 0);
            const profit = revenue - cost;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
            
            analysisRows.push({
                saleId: sale.id,
                productName: product.name,
                productSku: product.sku,
                tax: sale.tax,
                totalRevenue: revenue,
                totalCost: cost,
                totalProfit: profit,
                margin: margin,
            });
        }

        const sortedData = analysisRows.sort((a, b) => b.totalProfit - a.totalProfit);
        
        const grandTotals = sortedData.reduce((acc, item) => ({
            totalTax: acc.totalTax + item.tax,
            totalRevenue: acc.totalRevenue + item.totalRevenue,
            totalCost: acc.totalCost + item.totalCost,
            totalProfit: acc.totalProfit + item.totalProfit,
        }), { totalTax: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 });

        return { data: sortedData, grandTotals };
    }, [state.sales, state.products, state.movements, filters]);

    const inputClass = "h-9 bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 rounded-full px-4 text-sm";

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
                <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} className={inputClass} />
                <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} className={inputClass} />
                <input type="search" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Buscar produto por nome ou SKU..." className={`${inputClass} w-72`} />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300">
                    <thead className="text-xs text-gray-600 uppercase bg-gray-50 dark:bg-gray-700/60 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">Produto</th>
                            <th className="px-6 py-3">SKU</th>
                            <th className="px-6 py-3 text-right">Imposto</th>
                            <th className="px-6 py-3 text-right">Receita Total</th>
                            <th className="px-6 py-3 text-right">Custo Total</th>
                            <th className="px-6 py-3 text-right">Lucro Total</th>
                            <th className="px-6 py-3 text-right">Margem</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map(item => (
                            <tr key={item.saleId} className="border-b dark:border-gray-700 group">
                                <td className="px-6 py-2 font-medium">{item.productName}</td>
                                <td className="px-6 py-2">{item.productSku}</td>
                                <td className="px-6 py-2 text-right">{formatCurrency(item.tax)}</td>
                                <td className="px-6 py-2 text-right">{formatCurrency(item.totalRevenue)}</td>
                                <td className="px-6 py-2 text-right">{formatCurrency(item.totalCost)}</td>
                                <td className={`px-6 py-2 text-right font-bold ${item.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(item.totalProfit)}</td>
                                <td className={`px-6 py-2 text-right font-semibold ${item.margin < 0 ? 'text-red-500' : item.margin < 30 ? 'text-yellow-500' : 'text-green-500'}`}>{item.margin.toFixed(1)}%</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="text-xs uppercase text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/60 font-bold">
                        <tr>
                            <td className="px-6 py-3" colSpan={2}>Totais do Período</td>
                            <td className="px-6 py-3 text-right">{formatCurrency(grandTotals.totalTax)}</td>
                            <td className="px-6 py-3 text-right">{formatCurrency(grandTotals.totalRevenue)}</td>
                            <td className="px-6 py-3 text-right">{formatCurrency(grandTotals.totalCost)}</td>
                            <td className={`px-6 py-3 text-right ${grandTotals.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(grandTotals.totalProfit)}</td>
                            <td className="px-6 py-3 text-right">
                                {
                                    (grandTotals.totalRevenue > 0 
                                        ? (grandTotals.totalProfit / grandTotals.totalRevenue) * 100 
                                        : 0
                                    ).toFixed(1)
                                }%
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default ProductSalesAnalysis;