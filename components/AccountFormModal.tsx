import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { Account, AccountType } from '../types';
import ModalShell from '../src/components/modal/ModalShell';
import { Section } from '../src/components/form/Section';
import { Field, Input, Select } from '../src/components/form/Field';
import Button from './ui/Button';

interface AccountFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: Account | null;
}

const AccountFormModal: React.FC<AccountFormModalProps> = ({ isOpen, onClose, account }) => {
    const { dispatch, generateId } = useData();
    
    const getInitialState = () => ({
        name: '',
        type: AccountType.Banco,
        initialBalance: 0,
        cardClosingDay: 1,
        cardDueDate: 10,
        cardLimit: 0,
        bankName: '',
        agency: '',
        accountNumber: ''
    });

    const [formData, setFormData] = useState(getInitialState());

    useEffect(() => {
        if (isOpen) {
            if (account) {
                setFormData({ ...getInitialState(), ...account });
            } else {
                setFormData(getInitialState());
            }
        }
    }, [account, isOpen]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            alert('Nome da conta é obrigatório.');
            return;
        }
        
        const payload: Partial<Account> = {
            name: formData.name,
            type: formData.type,
            initialBalance: formData.type === AccountType.Cartao ? 0 : formData.initialBalance,
        };
        
        if (formData.type === AccountType.Cartao) {
            payload.cardClosingDay = formData.cardClosingDay;
            payload.cardDueDate = formData.cardDueDate;
            payload.cardLimit = formData.cardLimit;
        }
        
        if (account && account.id) {
            dispatch({ type: 'UPDATE_ITEM', payload: { item: { ...payload, id: account.id }, collection: 'accounts' } });
        } else {
            dispatch({ type: 'ADD_ITEM', payload: { item: { ...payload, id: generateId() }, collection: 'accounts' } });
        }
        onClose();
    }, [account, dispatch, formData, generateId, onClose]);
    
     useEffect(() => {
        const handleSave = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                document.getElementById('submit-account')?.click();
            }
        };
        if(isOpen) {
            window.addEventListener('keydown', handleSave);
        }
        return () => window.removeEventListener('keydown', handleSave);
    }, [isOpen, handleSubmit]);

    if (!isOpen) return null;

    return (
        <ModalShell 
            title={account?.id ? 'Editar Conta' : 'Nova Conta'}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
                    <Button variant="primary" id="submit-account" type="submit" form="account-form">Salvar</Button>
                </>
            }
        >
            <form id="account-form" onSubmit={handleSubmit}>
                <Section title="Informações da Conta">
                    <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12">
                            <Field label="Nome da conta *"><Input type="text" name="name" value={formData.name} onChange={handleChange} required /></Field>
                        </div>
                        <div className="col-span-12 md:col-span-6">
                            <Field label="Tipo *">
                                <Select name="type" value={formData.type} onChange={handleChange} required>
                                    {Object.values(AccountType).filter(t => t !== AccountType.Investimento).map(type => <option key={type} value={type}>{type}</option>)}
                                </Select>
                            </Field>
                        </div>
                        {formData.type !== AccountType.Cartao && (
                             <div className="col-span-12 md:col-span-6">
                                <Field label="Saldo inicial"><Input type="number" name="initialBalance" value={formData.initialBalance} onChange={handleChange} step="0.01" /></Field>
                            </div>
                        )}
                    </div>
                     {formData.type === AccountType.Banco && (
                        <div className="grid grid-cols-12 gap-3 mt-3">
                            <div className="col-span-12 md:col-span-6"><Field label="Banco"><Input name="bankName" value={formData.bankName} onChange={handleChange} /></Field></div>
                            <div className="col-span-6 md:col-span-3"><Field label="Agência"><Input name="agency" value={formData.agency} onChange={handleChange} /></Field></div>
                            <div className="col-span-6 md:col-span-3"><Field label="Conta"><Input name="accountNumber" value={formData.accountNumber} onChange={handleChange} /></Field></div>
                        </div>
                    )}
                </Section>

                {formData.type === AccountType.Cartao && (
                    <Section title="Detalhes do Cartão de Crédito">
                         <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-4">
                                <Field label="Dia de Fechamento *"><Input type="number" name="cardClosingDay" value={formData.cardClosingDay} onChange={handleChange} required min="1" max="31" /></Field>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <Field label="Dia de Vencimento *"><Input type="number" name="cardDueDate" value={formData.cardDueDate} onChange={handleChange} required min="1" max="31" /></Field>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <Field label="Limite do Cartão"><Input type="number" name="cardLimit" value={formData.cardLimit} onChange={handleChange} step="0.01" /></Field>
                            </div>
                            <div className="col-span-12">
                                <p className="text-xs text-slate-400 mt-1">
                                    Melhor dia de compra: <strong>{((Number(formData.cardClosingDay || 1) % 31) + 1)}</strong>
                                </p>
                            </div>
                        </div>
                    </Section>
                )}
            </form>
        </ModalShell>
    );
};

export default AccountFormModal;