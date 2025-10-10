import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Category, CategoryType } from '../types';
import ColorField from './ColorField';
import ModalShell from '../src/components/modal/ModalShell';
import { Section } from '../src/components/form/Section';
import { Field, Input, Select } from '../src/components/form/Field';
import Button from './ui/Button';

interface CategoryFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    category: Partial<Category> | null;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ isOpen, onClose, category }) => {
    const { dispatch, generateId } = useData();
    const [name, setName] = useState("");
    const [type, setType] = useState<CategoryType>(CategoryType.Despesa);
    const [color, setColor] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName(category?.name ?? "");
            setType(category?.type ?? CategoryType.Despesa);
            setColor(category?.color ?? "");
        }
    }, [isOpen, category]);


    const handleSave = () => {
        if (!name.trim()) {
            alert("O nome da categoria é obrigatório.");
            return;
        }

        const payload = { 
            name: name.trim(), 
            type, 
            color: color || undefined
        };

        if (category?.id) {
            dispatch({ type: 'UPDATE_ITEM', payload: { item: { ...category, ...payload }, collection: 'categories' } });
        } else {
            dispatch({ type: 'ADD_ITEM', payload: { item: { ...payload, id: generateId() }, collection: 'categories' } });
        }
        onClose();
    };

    if (!isOpen) return null;
    
    return (
        <ModalShell 
            title={category?.id ? "Editar categoria" : "Nova categoria"}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
                    <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>Salvar</Button>
                </>
            }
        >
            <Section title="Detalhes da Categoria">
                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-8">
                        <Field label="Nome *">
                            <Input placeholder="Ex: Vendas, Aluguel, etc." value={name} onChange={(e)=>setName(e.target.value)} required />
                        </Field>
                    </div>
                     <div className="col-span-12 md:col-span-4">
                        <Field label="Tipo *">
                            <Select value={type} onChange={(e)=>setType(e.target.value as CategoryType)}>
                                <option value={CategoryType.Receita}>Receita</option>
                                <option value={CategoryType.Despesa}>Despesa</option>
                            </Select>
                        </Field>
                    </div>
                    <div className="col-span-12">
                        <Field label="Cor">
                            <ColorField value={color} onChange={setColor} defaultByKind={type} />
                        </Field>
                    </div>
                </div>
            </Section>
        </ModalShell>
    );
};

export default CategoryFormModal;