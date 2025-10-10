import React from 'react';
import { User } from '../../../lib/access';
import { ID } from '../../../../types';
import Button from '../../../../components/ui/Button';
import { User as UserIcon, CheckCircle } from 'lucide-react';

interface Props {
    users: User[];
    currentUser: User | null;
    selectedUserId: ID | null;
    onSelectUser: (id: ID) => void;
    onSwitchUser: (id: ID) => void;
    onCreateUser: () => void;
}

export default function UserList({ users, currentUser, selectedUserId, onSelectUser, onSwitchUser, onCreateUser }: Props) {
    return (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-100">Usuários</h3>
                <Button variant="secondary" size="sm" onClick={onCreateUser}>+ Novo</Button>
            </div>
            <ul className="space-y-2">
                {users.map(user => {
                    const isSelected = user.id === selectedUserId;
                    const isCurrent = user.id === currentUser?.id;
                    return (
                        <li key={user.id}>
                            <button
                                onClick={() => onSelectUser(user.id)}
                                className={`w-full text-left rounded-lg p-3 transition-colors flex items-start gap-3 ${isSelected ? 'bg-sky-500/10 ring-1 ring-sky-500' : 'hover:bg-white/5'}`}
                            >
                                <div className="mt-1 h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
                                    <UserIcon size={16} className="text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-100 truncate">{user.name}</div>
                                    <div className="text-xs text-gray-400 truncate">{user.email}</div>
                                </div>
                                {isCurrent && (
                                    <div className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                                        <CheckCircle size={14} /> Ativo
                                    </div>
                                )}
                            </button>
                            {isSelected && !isCurrent && (
                                <div className="p-2 text-right">
                                    <Button variant="ghost" size="sm" onClick={() => onSwitchUser(user.id)}>Tornar usuário atual</Button>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}