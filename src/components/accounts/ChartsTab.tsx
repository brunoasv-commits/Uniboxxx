
import React, { useMemo } from 'react';
import { Movement, CategoryType, AppState } from '../../../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#22d3ee", "#a3e635"];

interface ChartsTabProps {
  movements: Movement[];
  state: AppState;
}

const CustomTooltip: React.FC<any> = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-2 rounded-lg text-sm">
                <p className="text-gray-200">{`${payload[0].name} : ${formatCurrency(payload[0].value)}`}</p>
            </div>
        );
    }
    return null;
};

const ChartsTab: React.FC<ChartsTabProps> = ({ movements, state }) => {
    const { incomeByCategory, expenseByCategory } = useMemo(() => {
        const incomeMap = new Map<string, number>();
        const expenseMap = new Map<string, number>();

        movements.forEach(m => {
            const categoryName = state.categories.find(c => c.id === m.categoryId)?.name || 'Sem Categoria';
            if (m.kind === 'RECEITA') {
                incomeMap.set(categoryName, (incomeMap.get(categoryName) || 0) + m.amountNet);
            } else if (m.kind === 'DESPESA') {
                expenseMap.set(categoryName, (expenseMap.get(categoryName) || 0) + m.amountNet);
            }
        });

        const incomeData = Array.from(incomeMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
        const expenseData = Array.from(expenseMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

        return { incomeByCategory: incomeData, expenseByCategory: expenseData };
    }, [movements, state.categories]);

    const ChartCard: React.FC<{ title: string; data: {name: string, value: number}[] }> = ({ title, data }) => (
        <div className="bg-gray-900/50 rounded-lg p-4 h-[400px] flex flex-col">
            <h3 className="text-lg font-semibold text-center mb-4">{title}</h3>
            {data.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex-grow flex items-center justify-center text-gray-500">Sem dados para exibir.</div>
            )}
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Entradas por Categoria" data={incomeByCategory} />
            <ChartCard title="Saídas por Categoria" data={expenseByCategory} />
        </div>
    );
};

export default ChartsTab;