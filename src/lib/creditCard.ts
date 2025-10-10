
import { Movement, Account, MovementKind, MovementStatus } from '../../types';

export interface InvoiceData {
    expenses: Movement[];
    total: number; // Total value of all expenses in the period
    openTotal: number; // Total value of only open expenses, for payment
    period: string;
    dueDate: Date;
    closingDate: Date;
}

export interface CardSummary {
    limit: number;
    usedInPeriod: number;
    available: number;
    nextInvoiceTotal: number;
    nextDueDate: Date;
}

const addMonths = (date: Date, months: number): Date => {
    const d = new Date(date);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d;
};

export function getInvoiceData(movements: Movement[], cardAccount: Account, referenceMonth: Date): InvoiceData | null {
    if (!cardAccount.cardClosingDay) return null;

    const year = referenceMonth.getUTCFullYear();
    const month = referenceMonth.getUTCMonth();

    const closingDate = new Date(Date.UTC(year, month, cardAccount.cardClosingDay));
    const startDate = addMonths(closingDate, -1);
    startDate.setUTCDate(startDate.getUTCDate() + 1);

    const expenses = movements.filter(m => {
        if (m.accountId !== cardAccount.id || m.kind !== MovementKind.DESPESA) {
            return false;
        }
        const effectiveDateStr = m.transactionDate || m.dueDate;
        if (!effectiveDateStr) {
            return false;
        }
        
        const transactionDate = new Date(effectiveDateStr + 'T12:00:00Z');
        return transactionDate >= startDate && transactionDate <= closingDate;
    });

    const total = expenses.reduce((sum, m) => sum + m.amountGross, 0);
    const openTotal = expenses
        .filter(m => m.status !== MovementStatus.Baixado)
        .reduce((sum, m) => sum + m.amountGross, 0);

    const dueDate = new Date(Date.UTC(year, month, cardAccount.cardDueDate!));
    if (cardAccount.cardDueDate! < cardAccount.cardClosingDay) {
        dueDate.setUTCMonth(dueDate.getUTCMonth() + 1);
    }

    return {
        expenses,
        total,
        openTotal,
        period: `Fatura de ${referenceMonth.toLocaleString('pt-BR', { timeZone: 'UTC', month: 'long', year: 'numeric' })}`,
        dueDate,
        closingDate,
    };
}

export function getCardSummary(cardAccount: Account, invoiceData: InvoiceData, currentOpenBalance: number): CardSummary {
    const limit = cardAccount.cardLimit || 0;
    
    return {
        limit,
        usedInPeriod: invoiceData.total, // Changed to reflect the invoice total, which is more intuitive
        available: limit - currentOpenBalance,
        nextInvoiceTotal: invoiceData.total,
        nextDueDate: invoiceData.dueDate,
    };
}
