import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { PasswordEntry, ID } from '../types';
import PageTitle from '../components/ui/PageTitle';
import Button from '../components/ui/Button';
import { Plus, Eye, EyeOff, Copy, Edit, Trash2 } from 'lucide-react';
import PasswordFormModal from '../components/PasswordFormModal';
import Modal from '../components/Modal';
import Tip from '../components/Tip';

const PasswordsPage: React.FC = () => {
    const { state, dispatch } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<PasswordEntry | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<PasswordEntry | null>(null);
    const [visibility, setVisibility] = useState<Record<ID, boolean>>({});

    const openFormModal = (entry: PasswordEntry | null = null) => {
        setEntryToEdit(entry);
        setIsFormModalOpen(true);
    };

    const closeFormModal = () => {
        setEntryToEdit(null);
        setIsFormModalOpen(false);
    };

    const handleDelete = () => {
        if (entryToDelete) {
            dispatch({ type: 'DELETE_ITEM', payload: { id: entryToDelete.id, collection: 'passwords' } });
            setEntryToDelete(null);
        }
    };
    
    const toggleVisibility = (id: ID) => {
        setVisibility(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text?: string) => {
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                // You could add a toast notification here for better UX
                console.log('Password copied to clipboard');
            });
        }
    };

    const filteredEntries = useMemo(() => {
        if (!searchTerm) return state.passwords;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return state.passwords.filter(entry =>
            entry.site.toLowerCase().includes(lowerCaseSearch) ||
            entry.email.toLowerCase().includes(lowerCaseSearch)
        );
    }, [state.passwords, searchTerm]);

    return (
        <div className="space-y-4">
            <PageTitle
                title="Senhas"
                actions={
                    <Button variant="primary" onClick={() => openFormModal()}>
                        <Plus className="mr-2" size={16} />
                        Nova Senha
                    </Button>
                }
            />

            <div className="flex items-center">
                <input
                    type="search"
                    placeholder="Buscar por site ou e-mail..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="h-9 w-full md:w-80 rounded-full bg-white dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700 px-4 text-sm"
                />
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-300">
                    <thead className="text-xs text-gray-600 uppercase bg-gray-50 dark:bg-gray-700/60 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3">Site</th>
                            <th className="px-6 py-3">E-mail</th>
                            <th className="px-6 py-3">Senha</th>
                            <th className="px-6 py-3">Observação</th>
                            <th className="px-6 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEntries.map(entry => (
                            <tr key={entry.id} className="border-b dark:border-gray-700 group">
                                <td className="px-6 py-2 font-medium">{entry.site}</td>
                                <td className="px-6 py-2">{entry.email}</td>
                                <td className="px-6 py-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono">{visibility[entry.id] ? entry.password : '••••••••'}</span>
                                        <Tip label={visibility[entry.id] ? 'Ocultar' : 'Mostrar'}>
                                            <button onClick={() => toggleVisibility(entry.id)} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">
                                                {visibility[entry.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </Tip>
                                        <Tip label="Copiar">
                                            <button onClick={() => copyToClipboard(entry.password)} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">
                                                <Copy size={16} />
                                            </button>
                                        </Tip>
                                    </div>
                                </td>
                                <td className="px-6 py-2 truncate max-w-xs">{entry.notes}</td>
                                <td className="px-6 py-2 text-right">
                                    <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Tip label="Editar"><button onClick={() => openFormModal(entry)} className="p-2 rounded-full text-gray-500 hover:bg-gray-700"><Edit size={16} /></button></Tip>
                                        <Tip label="Excluir"><button onClick={() => setEntryToDelete(entry)} className="p-2 rounded-full text-gray-500 hover:bg-gray-700"><Trash2 size={16} /></button></Tip>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isFormModalOpen && <PasswordFormModal isOpen={isFormModalOpen} onClose={closeFormModal} entryToEdit={entryToEdit} />}

            {entryToDelete && (
                <Modal isOpen={!!entryToDelete} onClose={() => setEntryToDelete(null)} title="Confirmar Exclusão">
                    <p>Tem certeza que deseja excluir a senha do site "<strong>{entryToDelete.site}</strong>"?</p>
                    <div className="mt-6 flex justify-end space-x-3">
                        <Button variant="ghost" onClick={() => setEntryToDelete(null)}>Cancelar</Button>
                        <Button variant="danger" onClick={handleDelete}>Excluir</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default PasswordsPage;
