
import React from 'react';
import { Movement, Category, MovementStatus } from '../../../../types';
import { useData } from '../../../../contexts/DataContext';
import { Pencil, Paperclip, Trash2 } from 'lucide-react';
import Tip from '../../../../components/Tip';

interface ExpensesTableProps {
    expenses: Movement[];
    invoiceDueDate: Date;
    invoiceClosingDate: Date;
    total: number;
    onEdit: (expense: Movement) => void;
    onDelete: (expense: Movement) => void;
}

const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A';
    // Add timezone hint to prevent date shifts
    const date = new Date(dateString.toString().includes('T') ? dateString : `${dateString}T12:00:00Z`);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ExpensesTable: React.FC<ExpensesTableProps> = ({ expenses, invoiceDueDate, invoiceClosingDate, total, onEdit, onDelete }) => {
    const { state } = useData();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <header className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                <div>
                    <h3 className="font-semibold">Fatura Atual</h3>
                    <p className="text-xs text-gray-500">
                        Fechamento em: {formatDate(invoiceClosingDate)} | Vencimento em: {formatDate(invoiceDueDate)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Total da Fatura</p>
                    <p className="text-xl font-bold text-red-500">{formatCurrency(total)}</p>
                </div>
            </header>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-3 text-left">Data</th>
                            <th className="px-6 py-3 text-left">Descrição</th>
                            <th className="px-6 py-3 text-left">Categoria</th>
                            <th className="px-6 py-3 text-right">Valor</th>
                            <th className="px-6 py-3 text-center">Status</th>
                            <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {expenses.map(exp => {
                            const category = state.categories.find(c => c.id === exp.categoryId);
                            const isSettled = exp.status === MovementStatus.Baixado;
                            return (
                                <tr key={exp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                                    <td className="px-6 py-2 whitespace-nowrap">{formatDate(exp.transactionDate || exp.dueDate)}</td>
                                    <td className="px-6 py-2">{exp.description}</td>
                                    <td className="px-6 py-2 text-gray-500 dark:text-gray-400">{category?.name || 'N/A'}</td>
                                    <td className="px-6 py-2 text-right font-medium">{formatCurrency(exp.amountGross)}</td>
                                    <td className="px-6 py-2 text-center">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${isSettled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                            {isSettled ? 'Paga' : 'Aberta'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-2 text-right">
                                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            {exp.attachmentUrl && <Tip label="Ver Anexo"><a href={exp.attachmentUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><Paperclip size={16}/></a></Tip>}
                                            <Tip label="Editar"><button onClick={() => onEdit(exp)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><Pencil size={16}/></button></Tip>
                                            <Tip label="Excluir"><button onClick={() => onDelete(exp)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><Trash2 size={16}/></button></Tip>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExpensesTable;
