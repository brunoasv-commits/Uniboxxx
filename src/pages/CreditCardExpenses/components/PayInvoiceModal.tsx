

import React, { useState, useEffect } from 'react';
import { useData } from '../../../../contexts/DataContext';
import { Account, Movement, Settlement, MovementStatus, MovementKind, CategoryType, MovementOrigin, PaymentMethod, AccountType } from '../../../../types';
import ModalShell from '../../../components/modal/ModalShell';
import { Section } from '../../../components/form/Section';
import { Field, Input, Select } from '../../../components/form/Field';
import Button from '../../../../components/ui/Button';

interface PayInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoiceTotal: number;
    cardAccount: Account;
    invoiceDueDate: Date;
    expensesToSettle: Movement[];
}

const PayInvoiceModal: React.FC<PayInvoiceModalProps> = ({ isOpen, onClose, invoiceTotal, cardAccount, invoiceDueDate, expensesToSettle }) => {
    const { state, dispatch, generateId } = useData();
    const [paymentData, setPaymentData] = useState({
        paymentDate: new Date().toISOString().split('T')[0],
        sourceAccountId: '',
        value: invoiceTotal,
    });

    useEffect(() => {
        if (isOpen) {
            setPaymentData(prev => ({
                ...prev,
                value: invoiceTotal,
                paymentDate: new Date().toISOString().split('T')[0],
            }));
        }
    }, [isOpen, invoiceTotal]);

    const sourceAccounts = state.accounts.filter(a => a.type === AccountType.Banco || a.type === AccountType.Caixa);
    const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentData.sourceAccountId || paymentData.value <= 0) {
            alert('Selecione uma conta de origem e um valor válido.');
            return;
        }

        let faturaCategory = state.categories.find(c => c.name.toLowerCase() === 'pagamento de fatura' && c.type === CategoryType.Despesa);
        if (!faturaCategory) {
            faturaCategory = { id: generateId(), name: 'Pagamento de Fatura', type: CategoryType.Despesa, color: '#6b7280' };
            dispatch({ type: 'ADD_ITEM', payload: { item: faturaCategory, collection: 'categories' } });
        }

        const groupId = generateId(); // Group all related transactions

        const paymentMovement: Movement = {
            id: generateId(),
            kind: MovementKind.DESPESA,
            origin: MovementOrigin.Despesa,
            description: `Pagamento Fatura ${cardAccount.name} - Venc. ${formatDate(invoiceDueDate)}`,
            amountGross: paymentData.value,
            fees: 0,
            amountNet: paymentData.value,
            dueDate: paymentData.paymentDate,
            accountId: paymentData.sourceAccountId,
            categoryId: faturaCategory.id,
            status: MovementStatus.Baixado,
            paidDate: paymentData.paymentDate,
            groupId, // Link payment to expenses
            referenceId: cardAccount.id, // Reference the card account for easier lookups
        };
        dispatch({ type: 'ADD_ITEM', payload: { item: paymentMovement, collection: 'movements' } });
        
        expensesToSettle.forEach(expense => {
            const updatedExpense = { ...expense, status: MovementStatus.Baixado, paidDate: paymentData.paymentDate, groupId };
            dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedExpense, collection: 'movements' } });
        });

        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalShell
            title={`Pagar Fatura - ${cardAccount.name}`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" type="submit" form="pay-invoice-form">Confirmar Pagamento</Button>
                </>
            }
        >
            <form id="pay-invoice-form" onSubmit={handleSubmit}>
                <Section title="Detalhes do Pagamento">
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-6">
                            <Field label="Valor a Pagar *"><Input type="number" value={paymentData.value} onChange={e => setPaymentData(p => ({...p, value: parseFloat(e.target.value)}))} step="0.01" required /></Field>
                        </div>
                        <div className="col-span-12 md:col-span-6">
                            <Field label="Data do Pagamento *"><Input type="date" value={paymentData.paymentDate} onChange={e => setPaymentData(p => ({...p, paymentDate: e.target.value}))} required /></Field>
                        </div>
                        <div className="col-span-12">
                            <Field label="Pagar com a conta *">
                                <Select value={paymentData.sourceAccountId} onChange={e => setPaymentData(p => ({...p, sourceAccountId: e.target.value}))} required>
                                    <option value="">Selecione...</option>
                                    {sourceAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </Select>
                            </Field>
                        </div>
                    </div>
                </Section>
            </form>
        </ModalShell>
    );
};

export default PayInvoiceModal;