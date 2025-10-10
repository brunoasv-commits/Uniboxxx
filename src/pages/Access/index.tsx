

import React, { useState, useCallback } from 'react';
import PageTitle from '../../../components/ui/PageTitle';
import { useAccess } from '../../contexts/AccessProvider';
import { User, MENU_KEYS } from '../../lib/access';
import { ID } from '../../../types';
import UserList from './components/UserList';
import UserForm from './components/UserForm';
import PermissionMatrix from './components/PermissionMatrix';
import { sha256 } from '../../lib/auth';

export default function AccessPage() {
    const { users, current, updateUsers, switchUser } = useAccess();
    const [selectedUserId, setSelectedUserId] = useState<ID | null>(current?.id || null);

    const selectedUser = users.find(u => u.id === selectedUserId) || null;

    const handleSelectUser = (id: ID) => {
        setSelectedUserId(id);
    };

    const handleCreateUser = async () => {
        const id = crypto.randomUUID();
        const passwordHash = await sha256('123456');
        const newUser: User = {
            id,
            name: 'Novo Usuário',
            email: '',
            active: true,
            permissions: [],
            passwordHash,
        };
        updateUsers([...users, newUser]);
        setSelectedUserId(id);
    };

    const handleSaveUser = async (updatedUser: User, password?: string) => {
        let userToSave = { ...updatedUser };
        if (password && password.trim()) {
            userToSave.passwordHash = await sha256(password.trim());
        }
        const nextUsers = users.map(u => u.id === userToSave.id ? userToSave : u);
        updateUsers(nextUsers);
    };
    
    const handleDeleteUser = (id: ID) => {
        if (users.length <= 1) {
            alert("Não é possível excluir o único usuário.");
            return;
        }
        if (window.confirm("Tem certeza que deseja excluir este usuário?")) {
            const nextUsers = users.filter(u => u.id !== id);
            updateUsers(nextUsers);
            if (selectedUserId === id) {
                setSelectedUserId(nextUsers[0]?.id || null);
            }
            if (current?.id === id) {
                switchUser(nextUsers[0]?.id);
            }
        }
    };


    return (
        <div className="space-y-6">
            <PageTitle title="Usuários & Acesso" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-1">
                    <UserList
                        users={users}
                        currentUser={current}
                        selectedUserId={selectedUserId}
                        onSelectUser={handleSelectUser}
                        onSwitchUser={switchUser}
                        onCreateUser={handleCreateUser}
                    />
                </div>

                <div className="md:col-span-2 space-y-6">
                    {selectedUser ? (
                        <>
                            <UserForm 
                                user={selectedUser} 
                                onSave={handleSaveUser} 
                                onDelete={handleDeleteUser}
                            />
                            <PermissionMatrix 
                                user={selectedUser} 
                                onSave={handleSaveUser}
                            />
                        </>
                    ) : (
                        <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-400">
                            Selecione um usuário para editar ou crie um novo.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}