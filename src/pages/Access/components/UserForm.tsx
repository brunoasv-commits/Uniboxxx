
import React, { useState, useEffect } from 'react';
import { User } from '../../../lib/access';
import { ID } from '../../../../types';
import { Section } from '../../../components/form/Section';
import { Field, Input, Checkbox } from '../../../components/form/Field';
import Button from '../../../../components/ui/Button';

interface Props {
    user: User;
    onSave: (user: User, password?: string) => void;
    onDelete: (id: ID) => void;
}

export default function UserForm({ user, onSave, onDelete }: Props) {
    const [form, setForm] = useState(user);
    const [password, setPassword] = useState('');

    useEffect(() => {
        setForm(user);
        setPassword('');
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleSave = () => onSave(form, password);

    return (
        <div className="rounded-2xl bg-white/5 border border-white/10">
            <div className="p-4 border-b border-white/10">
                <h3 className="font-semibold text-gray-100">Dados do Usuário</h3>
            </div>
            <div className="p-4 space-y-4">
                <Field label="Nome"><Input name="name" value={form.name} onChange={handleChange} /></Field>
                <Field label="Email"><Input type="email" name="email" value={form.email} onChange={handleChange} /></Field>
                <Field label="Senha (deixe em branco para não alterar)">
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                </Field>
                <Field label="Status">
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                        <Checkbox name="active" checked={form.active} onChange={handleChange} /> Ativo
                    </label>
                </Field>
            </div>
            <div className="p-4 border-t border-white/10 flex justify-between">
                <Button variant="danger" onClick={() => onDelete(user.id)}>Excluir</Button>
                <Button variant="primary" onClick={handleSave}>Salvar Alterações</Button>
            </div>
        </div>
    );
}