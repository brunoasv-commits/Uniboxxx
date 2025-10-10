
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../../../contexts/DataContext';
import { Account, Category, Movement, MovementKind, MovementOrigin, MovementStatus, CategoryType } from '../../../../types';
import ModalShell from '../../../components/modal/ModalShell';
import { Section } from '../../../components/form/Section';
import { Field, Input, Select, Textarea } from '../../../components/form/Field';
import Button from '../../../../components/ui/Button';
import CategoryPicker from '../../../components/pickers/CategoryPicker';

interface NewExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardAccount: Account;
    expenseToEdit: Movement | null;
}

const NewExpenseModal: React.FC<NewExpenseModalProps> = ({ isOpen, onClose, cardAccount, expenseToEdit }) => {
    const { state, dispatch, generateId } = useData();
    const isEditing = !!expenseToEdit;

    const getInitialState = () => ({
        transactionDate: new Date().toISOString().split('T')[0],
        description: '',
        categoryId: '',
        amount: '',
    });

    const [formData, setFormData] = useState(getInitialState());
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
    const selectedCategory = useMemo(() => state.categories.find(c => c.id === formData.categoryId), [state.categories, formData.categoryId]);

    useEffect(() => {
        if (isOpen) {
            if (isEditing && expenseToEdit) {
                setFormData({
                    transactionDate: expenseToEdit.transactionDate || expenseToEdit.dueDate,
                    description: expenseToEdit.description,
                    categoryId: expenseToEdit.categoryId || '',
                    amount: expenseToEdit.amountGross.toString(),
                });
            } else {
                setFormData(getInitialState());
            }
        }
    }, [isOpen, expenseToEdit, isEditing]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amountNumber = parseFloat(formData.amount);
        if (!formData.description || !formData.categoryId || !amountNumber || amountNumber <= 0) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }

        const payload: Omit<Movement, 'id'> = {
            kind: MovementKind.DESPESA,
            origin: expenseToEdit?.origin || MovementOrigin.Despesa,
            status: expenseToEdit?.status || MovementStatus.EmAberto,
            description: formData.description,
            amountGross: amountNumber,
            fees: 0,
            amountNet: amountNumber,
            dueDate: formData.transactionDate,
            transactionDate: formData.transactionDate,
            accountId: cardAccount.id,
            categoryId: formData.categoryId,
        };

        if (isEditing && expenseToEdit) {
            dispatch({ type: 'UPDATE_ITEM', payload: { item: { ...payload, id: expenseToEdit.id }, collection: 'movements' } });
        } else {
            dispatch({ type: 'ADD_ITEM', payload: { item: { ...payload, id: generateId() }, collection: 'movements' } });
        }
        
        onClose();
    };

    if (!isOpen) return null;
    
    const title = isEditing ? `Editar Compra - ${cardAccount.name}` : `Nova Compra - ${cardAccount.name}`;

    return (
        <>
            <ModalShell
                title={title}
                footer={
                    <>
                        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button variant="primary" type="submit" form="new-expense-form">{isEditing ? 'Atualizar' : 'Salvar'}</Button>
                    </>
                }
            >
                <form id="new-expense-form" onSubmit={handleSubmit}>
                    <Section title="Detalhes da Compra">
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-8">
                                <Field label="Descrição *"><Input name="description" value={formData.description} onChange={e => setFormData(f => ({...f, description: e.target.value}))} required /></Field>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <Field label="Data da Compra *"><Input type="date" name="transactionDate" value={formData.transactionDate} onChange={e => setFormData(f => ({...f, transactionDate: e.target.value}))} required /></Field>
                            </div>
                            <div className="col-span-12 md:col-span-8">
                                <Field label="Categoria *">
                                    <div className="flex gap-2">
                                        <Input
                                            value={selectedCategory?.name || ''}
                                            readOnly
                                            placeholder="Selecione uma categoria"
                                            onClick={() => setIsCategoryPickerOpen(true)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsCategoryPickerOpen(true)}
                                            className="shrink-0 rounded-xl border border-white/10 px-3 h-10 text-sm text-gray-200 hover:bg-white/5"
                                        >
                                            Pesquisar
                                        </button>
                                    </div>
                                </Field>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <Field label="Valor *"><Input type="number" name="amount" value={formData.amount} onChange={e => setFormData(f => ({...f, amount: e.target.value}))} step="0.01" min="0.01" required /></Field>
                            </div>
                        </div>
                    </Section>
                </form>
            </ModalShell>

            {isCategoryPickerOpen && (
                <CategoryPicker
                    isOpen={isCategoryPickerOpen}
                    onClose={() => setIsCategoryPickerOpen(false)}
                    onSelect={(category) => {
                        setFormData(f => ({ ...f, categoryId: category.id }));
                        setIsCategoryPickerOpen(false);
                    }}
                    categoryType={CategoryType.Despesa}
                />
            )}
        </>
    );
};

export default NewExpenseModal;
