import React, { useState, useEffect } from 'react';
import { User, MENU_KEYS, MENU_LABELS, MenuKey } from '../../../lib/access';
import { Checkbox } from '../../../components/form/Field';
import Button from '../../../../components/ui/Button';

interface Props {
    user: User;
    onSave: (user: User) => void;
}

export default function PermissionMatrix({ user, onSave }: Props) {
    const [permissions, setPermissions] = useState(new Set(user.permissions));

    useEffect(() => {
        setPermissions(new Set(user.permissions));
    }, [user]);

    const handleToggle = (key: MenuKey) => {
        setPermissions(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };
    
    const handleSelectAll = () => setPermissions(new Set(MENU_KEYS));
    const handleClearAll = () => setPermissions(new Set());
    
    const handleSave = () => {
        onSave({ ...user, permissions: Array.from(permissions) });
    };

    return (
        <div className="rounded-2xl bg-white/5 border border-white/10">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-semibold text-gray-100">Permissões de Acesso</h3>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleSelectAll}>Selecionar Tudo</Button>
                    <Button variant="ghost" size="sm" onClick={handleClearAll}>Limpar Tudo</Button>
                </div>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4">
                {MENU_KEYS.map(key => (
                    <label key={key} className="flex items-center gap-2 text-sm text-slate-200 p-2 rounded-md hover:bg-white/5 cursor-pointer">
                        <Checkbox
                            checked={permissions.has(key)}
                            onChange={() => handleToggle(key)}
                        />
                        {MENU_LABELS[key]}
                    </label>
                ))}
            </div>
            <div className="p-4 border-t border-white/10 text-right">
                <Button variant="primary" onClick={handleSave}>Salvar Permissões</Button>
            </div>
        </div>
    );
}