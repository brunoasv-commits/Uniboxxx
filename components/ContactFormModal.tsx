import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { Contact, ContactType } from '../types';
import ModalShell from '../src/components/modal/ModalShell';
import { Section } from '../src/components/form/Section';
import { Field, Input, Select, Textarea, Checkbox } from '../src/components/form/Field';
import Button from './ui/Button';
import Modal from './Modal';

interface ContactFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    contactToEdit: Contact | null;
    initialType?: ContactType;
}

const ContactFormModal: React.FC<ContactFormModalProps> = ({ isOpen, onClose, contactToEdit, initialType }) => {
    const { state, dispatch, generateId } = useData();
    const [isDirty, setIsDirty] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '', type: initialType || ContactType.Cliente, email: '', phone: '',
        notes: '', document: '', address: '', isActive: true,
    });

    useEffect(() => {
        if (isOpen) {
            if (contactToEdit) {
                setFormData({
                    name: contactToEdit.name, type: contactToEdit.type, email: contactToEdit.email || '',
                    phone: contactToEdit.phone || '', notes: contactToEdit.notes || '',
                    document: contactToEdit.document || (contactToEdit as any).cpf || '',
                    address: contactToEdit.address || '',
                    isActive: contactToEdit.isActive !== undefined ? contactToEdit.isActive : true,
                });
            } else {
                 setFormData({
                    name: '', type: initialType || ContactType.Cliente, email: '', phone: '',
                    notes: '', document: '', address: '', isActive: true,
                });
            }
            setIsDirty(false);
            setEmailError('');
        }
    }, [contactToEdit, initialType, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setIsDirty(true);
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleClose = () => {
        if (isDirty) {
            setIsConfirmCloseOpen(true);
        } else {
            onClose();
        }
    };

    const handleConfirmClose = () => {
        setIsConfirmCloseOpen(false);
        onClose();
    };

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.type) {
            alert('Nome e Tipo são obrigatórios.');
            return;
        }

        const isEmailDuplicate = state.contacts.some(c => 
            c.email && formData.email &&
            c.email.toLowerCase() === formData.email.trim().toLowerCase() && 
            c.id !== contactToEdit?.id
        );
    
        if (isEmailDuplicate) {
            setEmailError('Este e-mail já está em uso.');
            return;
        }
        setEmailError('');

        const payload: Omit<Contact, 'id'> = {
            name: formData.name, type: formData.type, email: formData.email?.trim().toLowerCase(),
            phone: formData.phone?.replace(/\D/g, ''), notes: formData.notes,
            document: formData.document?.replace(/\D/g, ''), address: formData.address, isActive: formData.isActive,
        };

        if (contactToEdit) {
            dispatch({ type: 'UPDATE_ITEM', payload: { item: { ...payload, id: contactToEdit.id }, collection: 'contacts' } });
        } else {
            dispatch({ type: 'ADD_ITEM', payload: { item: { ...payload, id: generateId() }, collection: 'contacts' } });
        }
        onClose();
    }, [formData, state.contacts, contactToEdit, dispatch, generateId, onClose]);

    useEffect(() => {
        const handleSave = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                document.getElementById('submitContact')?.click();
            }
        };
        if (isOpen) { window.addEventListener('keydown', handleSave); }
        return () => window.removeEventListener('keydown', handleSave);
    }, [isOpen, handleSubmit]);

    if (!isOpen) return null;
    
    const valid = !!formData.name;

    return (
       <>
            <ModalShell
                title={contactToEdit ? 'Editar Contato' : 'Novo Contato'}
                footer={
                    <>
                        <Button variant="ghost" onClick={handleClose} type="button">Cancelar</Button>
                        <Button variant="primary" id="submitContact" type="submit" form="contact-form" disabled={!valid}>
                            {contactToEdit ? 'Atualizar' : 'Salvar'}
                        </Button>
                    </>
                }
            >
            <form id="contact-form" onSubmit={handleSubmit} className="space-y-5">
                    <Section title="Informações Básicas">
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-8">
                                <Field label="Nome *"><Input name="name" value={formData.name} onChange={handleChange} required /></Field>
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <Field label="Tipo *">
                                    <Select name="type" value={formData.type} onChange={handleChange} required>
                                        {Object.values(ContactType).map(type => <option key={type} value={type}>{type}</option>)}
                                    </Select>
                                </Field>
                            </div>
                        </div>
                    </Section>

                    <Section title="Contato & Identificação">
                    <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12 md:col-span-6">
                                <Field label="Email">
                                    <Input type="email" name="email" value={formData.email} onChange={handleChange} />
                                    {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                                </Field>
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <Field label="Telefone"><Input type="tel" name="phone" value={formData.phone} onChange={handleChange} /></Field>
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <Field label="CPF"><Input name="document" value={formData.document} onChange={handleChange} /></Field>
                            </div>
                        </div>
                    </Section>
                    
                    <Section title="Endereço & Observações">
                        <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-12">
                                <Field label="Endereço"><Input name="address" value={formData.address} onChange={handleChange} /></Field>
                            </div>
                            <div className="col-span-12">
                                <Field label="Observações"><Textarea name="notes" value={formData.notes} onChange={handleChange} /></Field>
                            </div>
                        </div>
                    </Section>
                    
                    <Section title="Status">
                    <Field label="Ativo">
                            <label className="flex items-center gap-2 text-sm text-slate-200">
                                <Checkbox name="isActive" checked={formData.isActive} onChange={handleChange} /> Ativo
                            </label>
                    </Field>
                    </Section>
                </form>
            </ModalShell>
            <Modal isOpen={isConfirmCloseOpen} onClose={() => setIsConfirmCloseOpen(false)} title="Descartar alterações?">
                <p>Você tem alterações não salvas. Tem certeza de que deseja descartá-las e fechar?</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="ghost" onClick={() => setIsConfirmCloseOpen(false)}>Continuar Editando</Button>
                    <Button variant="danger" onClick={handleConfirmClose}>Descartar</Button>
                </div>
            </Modal>
       </>
    );
};
export default ContactFormModal;