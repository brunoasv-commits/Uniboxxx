import React, { useState, useMemo, useRef, useEffect } from 'react';
import Modal from '../components/Modal';
import { useData } from '../contexts/DataContext';
import { Contact, ContactType, ID } from '../types';
import ContactFormModal from '../components/ContactFormModal';
import { useHotkeys } from '../hooks/useHotkeys';
import Tip from '../components/Tip';
import StatusBadge from '../components/StatusBadge';
import PageTitle from '../components/ui/PageTitle';
import ContactCard from '../components/ContactCard';
// Fix: Import `Edit` icon from lucide-react.
import { List, Grid3X3, Plus, Trash2, Power, Copy, Edit } from "lucide-react";
import { useSavedView } from '../hooks/useSavedView';
import Button from '../components/ui/Button';

const EmptyState: React.FC<{ onCreate?: () => void, message?: string }> = ({ onCreate, message }) => (
  <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
    <p className="mb-4 text-gray-500 dark:text-gray-400">{message || "Nenhum contato encontrado."}</p>
    {onCreate && (
      <Button variant="primary" onClick={onCreate}>
        <Plus className="inline-block -ml-1 mr-2 h-4 w-4" />
        Criar Contato
      </Button>
    )}
  </div>
);


const ContactsPage: React.FC = () => {
    const { state, dispatch, generateId } = useData();
    // Fix: `useSavedView` does not take generic type arguments.
    const [view, setView] = useSavedView('contacts:view', 'cards');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
    const [contactsToDelete, setContactsToDelete] = useState<ID[]>([]);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
    const [typeFilter, setTypeFilter] = useState<'all' | ContactType>('all');
    const [selectedIds, setSelectedIds] = useState<Set<ID>>(new Set());

    const searchInputRef = useRef<HTMLInputElement>(null);
    
    const isContactInUse = (contactId: ID): boolean => {
      return state.sales.some(s => s.customerId === contactId) ||
             state.products.some(p => p.supplierId === contactId) ||
             state.partnerAccounts.some(pa => pa.contactId === contactId) ||
             state.warehouseStock.some(ws => ws.warehouseId === contactId);
    };

    const openFormModal = (contact: Contact | null = null) => {
        setContactToEdit(contact);
        setIsFormModalOpen(true);
    };
    const closeFormModal = () => setIsFormModalOpen(false);
    
    const openConfirmModal = (contactIds: ID[]) => {
        setContactsToDelete(contactIds);
        setIsConfirmModalOpen(true);
    };
    const closeConfirmModal = () => setIsConfirmModalOpen(false);

    const handleDelete = () => {
        if (contactsToDelete.length === 0) return;
        
        const deletableIds = contactsToDelete.filter(id => !isContactInUse(id));
        if (deletableIds.length !== contactsToDelete.length) {
            alert('Alguns contatos selecionados estão em uso e não podem ser excluídos.');
        }

        if (deletableIds.length > 0) {
            dispatch({ type: 'DELETE_MULTIPLE_ITEMS', payload: { ids: deletableIds, collection: 'contacts' } });
        }
        setSelectedIds(new Set());
        closeConfirmModal();
    };

    const handleDuplicate = (contact: Contact) => {
        const newContact: Contact = {
            ...contact,
            id: generateId(),
            name: `${contact.name} (Cópia)`,
        };
        dispatch({ type: 'ADD_ITEM', payload: { item: newContact, collection: 'contacts' } });
    };

    const handleToggleActive = (contact: Contact) => {
        const updatedContact = { ...contact, isActive: contact.isActive === false };
        dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedContact, collection: 'contacts' } });
    };

    const handleBulkToggleActive = (activate: boolean) => {
        selectedIds.forEach(id => {
            const contact = state.contacts.find(c => c.id === id);
            if (contact) {
                const updated = { ...contact, isActive: activate };
                dispatch({ type: 'UPDATE_ITEM', payload: { item: updated, collection: 'contacts' } });
            }
        });
        setSelectedIds(new Set());
    };

    const filteredContacts = useMemo(() => {
        return state.contacts.filter(contact => {
            if (statusFilter !== 'all') {
                const isActive = contact.isActive !== false;
                if (statusFilter === 'active' && !isActive) return false;
                if (statusFilter === 'inactive' && isActive) return false;
            }
            if (typeFilter !== 'all' && contact.type !== typeFilter) return false;
            if (searchTerm && !contact.name.toLowerCase().includes(searchTerm.toLowerCase()) && !contact.email?.toLowerCase().includes(searchTerm.toLowerCase())) {
                return false;
            }
            return true;
        });
    }, [state.contacts, searchTerm, statusFilter, typeFilter]);
    
    const isAllSelected = selectedIds.size > 0 && selectedIds.size === filteredContacts.length;

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedIds(e.target.checked ? new Set(filteredContacts.map(c => c.id)) : new Set());
    };
    const handleSelectOne = (id: ID) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            newSet.has(id) ? newSet.delete(id) : newSet.add(id);
            return newSet;
        });
    };

    useHotkeys({
      '/': () => searchInputRef.current?.focus(),
      'n': () => openFormModal(),
    });

    return (
        <div className="space-y-4">
            <PageTitle 
                title="Contatos" 
                actions={<Button variant="primary" onClick={() => openFormModal()}><Plus className="mr-2" size={16}/>Novo Contato</Button>} 
            />

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <input ref={searchInputRef} type="search" placeholder="Buscar por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-9 w-48 rounded-full bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 px-4 text-sm" />
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="h-9 rounded-full bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 px-3 text-sm">
                        <option value="all">Todos os Tipos</option>
                        {Object.values(ContactType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div className="inline-flex rounded-full border border-gray-300 dark:border-gray-700 p-1 bg-gray-100 dark:bg-gray-800/60">
                        <Button variant="chip" size="sm" active={statusFilter==='all'} onClick={() => setStatusFilter('all')}>Todos</Button>
                        <Button variant="chip" size="sm" active={statusFilter==='active'} onClick={() => setStatusFilter('active')}>Ativos</Button>
                        <Button variant="chip" size="sm" active={statusFilter==='inactive'} onClick={() => setStatusFilter('inactive')}>Inativos</Button>
                    </div>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-slate-800/60 p-1 ring-1 ring-white/10">
                    <Button variant="chip" size="sm" active={view === 'list'} onClick={() => setView('list')}><List size={16}/>Lista</Button>
                    <Button variant="chip" size="sm" active={view === 'cards'} onClick={() => setView('cards')}><Grid3X3 size={16}/>Cards</Button>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 border dark:border-gray-700">
                    <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
                    <Button variant="success-ghost" size="sm" onClick={() => handleBulkToggleActive(true)}><Power size={14}/>Ativar</Button>
                    <Button variant="warning-ghost" size="sm" onClick={() => handleBulkToggleActive(false)}><Power size={14}/>Inativar</Button>
                    <Button variant="danger-ghost" size="sm" onClick={() => openConfirmModal(Array.from(selectedIds))}><Trash2 size={14}/>Excluir</Button>
                </div>
            )}
            
            {filteredContacts.length > 0 ? (
                view === 'cards' ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
                        {filteredContacts.map(contact => (
                            <ContactCard
                                key={contact.id}
                                contact={contact}
                                onEdit={openFormModal}
                                onDuplicate={handleDuplicate}
                                onToggleActive={handleToggleActive}
                                onDelete={(c) => openConfirmModal([c.id])}
                                isDeletable={!isContactInUse(contact.id)}
                            />
                        ))}
                    </div>
                ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300">
                        <thead className="text-xs text-gray-600 uppercase bg-gray-50 dark:bg-gray-700/60 dark:text-gray-300">
                            <tr>
                                <th className="p-4 w-4"><input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} /></th>
                                <th className="px-6 py-3">Nome</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Telefone</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredContacts.map(c => (
                                <tr key={c.id} className="border-b dark:border-gray-700 group">
                                    <td className="p-4 w-4"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => handleSelectOne(c.id)} /></td>
                                    <td className="px-6 py-2 font-medium">{c.name}</td>
                                    <td className="px-6 py-2">{c.type}</td>
                                    <td className="px-6 py-2">{c.email}</td>
                                    <td className="px-6 py-2">{c.phone}</td>
                                    <td className="px-6 py-2"><StatusBadge active={c.isActive !== false} /></td>
                                    <td className="px-6 py-2 text-right">
                                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tip label="Editar"><button onClick={() => openFormModal(c)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><Edit size={16}/></button></Tip>
                                            <Tip label="Copiar"><button onClick={() => handleDuplicate(c)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><Copy size={16}/></button></Tip>
                                            <Tip label="Excluir"><button onClick={() => openConfirmModal([c.id])} disabled={isContactInUse(c.id)} className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"><Trash2 size={16}/></button></Tip>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                )
            ) : (
                <EmptyState onCreate={() => openFormModal()} message="Nenhum contato corresponde aos filtros." />
            )}

            {isFormModalOpen && <ContactFormModal isOpen={isFormModalOpen} onClose={closeFormModal} contactToEdit={contactToEdit} />}
            <Modal isOpen={isConfirmModalOpen} onClose={closeConfirmModal} title="Confirmar Exclusão">
                <p>Tem certeza que deseja excluir {contactsToDelete.length} contato(s)? Contatos em uso não serão excluídos.</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="ghost" onClick={closeConfirmModal}>Cancelar</Button>
                    <Button variant="danger" onClick={handleDelete}>Excluir</Button>
                </div>
            </Modal>
        </div>
    );
};

export default ContactsPage;