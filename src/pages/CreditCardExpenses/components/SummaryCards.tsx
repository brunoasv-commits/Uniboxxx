import React from 'react';
import { KpiCard } from '../../../components/KpiCard';
import { CardSummary } from '../../../lib/creditCard';

const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface SummaryCardsProps {
    summary: CardSummary;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
    const nextInvoiceValue = `Venc. ${summary.nextDueDate.toLocaleDateString('pt-BR', {timeZone: 'UTC'})} - ${formatCurrency(summary.nextInvoiceTotal)}`;
    
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Limite do Cartão" value={formatCurrency(summary.limit)} />
            <KpiCard title="Utilizado no Período" value={formatCurrency(summary.usedInPeriod)} tone={summary.usedInPeriod > 0 ? "negative" : "default"} />
            <KpiCard title="Próxima Fatura" value={nextInvoiceValue} />
            <KpiCard title="Disponível" value={formatCurrency(summary.available)} tone={summary.available > 0 ? "positive" : "negative"} />
        </div>
    );
};

export default SummaryCards;
