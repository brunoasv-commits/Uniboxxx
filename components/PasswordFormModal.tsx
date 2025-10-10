import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { PasswordEntry } from '../types';
import ModalShell from '../src/components/modal/ModalShell';
import { Section } from '../src/components/form/Section';
import { Field, Input, Textarea } from '../src/components/form/Field';
import Button from './ui/Button';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    entryToEdit: PasswordEntry | null;
}

const PasswordFormModal: React.FC<PasswordFormModalProps> = ({ isOpen, onClose, entryToEdit }) => {
    const { dispatch, generateId } = useData();
    const [showPassword, setShowPassword] = useState(false);
    
    const getInitialState = () => ({
        site: '',
        email: '',
        password: '',
        notes: '',
    });
    
    const [formData, setFormData] = useState(getInitialState());

    useEffect(() => {
        if (isOpen) {
            setShowPassword(false); // Reset visibility on open
            if (entryToEdit) {
                setFormData({
                    site: entryToEdit.site || '',
                    email: entryToEdit.email || '',
                    password: entryToEdit.password || '',
                    notes: entryToEdit.notes || '',
                });
            } else {
                setFormData(getInitialState());
            }
        }
    }, [entryToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.site) {
            alert('O nome do site é obrigatório.');
            return;
        }

        const payload = {
            id: entryToEdit?.id || generateId(),
            ...formData,
        };

        if (entryToEdit) {
            dispatch({ type: 'UPDATE_ITEM', payload: { item: payload, collection: 'passwords' } });
        } else {
            dispatch({ type: 'ADD_ITEM', payload: { item: payload, collection: 'passwords' } });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalShell
            title={entryToEdit ? 'Editar Senha' : 'Nova Senha'}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
                    <Button variant="primary" type="submit" form="password-form">
                        {entryToEdit ? 'Atualizar' : 'Salvar'}
                    </Button>
                </>
            }
        >
            <form id="password-form" onSubmit={handleSubmit}>
                <Section title="Detalhes da Credencial">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Field label="Site *"><Input name="site" value={formData.site} onChange={handleChange} required /></Field>
                        </div>
                        <div>
                            <Field label="E-mail / Usuário"><Input type="text" name="email" value={formData.email} onChange={handleChange} /></Field>
                        </div>
                        <div className="md:col-span-2">
                             <Field label="Senha">
                                <div className="relative">
                                    <Input 
                                        type={showPassword ? 'text' : 'password'} 
                                        name="password" 
                                        value={formData.password} 
                                        onChange={handleChange}
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-200"
                                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                             </Field>
                        </div>
                        <div className="md:col-span-2">
                            <Field label="Observação"><Textarea name="notes" value={formData.notes} onChange={handleChange} /></Field>
                        </div>
                    </div>
                </Section>
            </form>
        </ModalShell>
    );
};

export default PasswordFormModal;