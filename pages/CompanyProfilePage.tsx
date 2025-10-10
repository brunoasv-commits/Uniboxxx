import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { CompanyProfile } from '../types';
import PageTitle from '../components/ui/PageTitle';
import Button from '../components/ui/Button';
import { Section } from '../src/components/form/Section';
import { Field, Input } from '../src/components/form/Field';
import { Trash2, Plus, Edit, FileText } from 'lucide-react';
import Modal from '../components/Modal';

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

const CompanyProfilePage: React.FC = () => {
    const { state, dispatch, generateId } = useData();
    const existingProfile = state.companyProfile?.[0] || null;

    const [isEditing, setIsEditing] = useState(!existingProfile);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const [formData, setFormData] = useState<Omit<CompanyProfile, 'id'>>({
        tradeName: '',
        legalName: '',
        address: '',
        cnpj: '',
        socialContractUrl: '',
        partners: [],
    });

    useEffect(() => {
        if (existingProfile) {
            setFormData(existingProfile);
            setIsEditing(false);
        } else {
            setFormData({
                tradeName: '',
                legalName: '',
                address: '',
                cnpj: '',
                socialContractUrl: '',
                partners: [],
            });
            setIsEditing(true);
        }
    }, [existingProfile]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            try {
                const dataUrl = await fileToDataUrl(file);
                setFormData(prev => ({ ...prev, socialContractUrl: dataUrl }));
            } catch (error) {
                console.error("Error converting file to data URL", error);
                alert("Não foi possível carregar o arquivo.");
            }
        }
    };

    const handlePartnerChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newPartners = [...formData.partners];
        (newPartners[index] as any)[name] = value;
        setFormData(prev => ({ ...prev, partners: newPartners }));
    };

    const addPartner = () => {
        setFormData(prev => ({
            ...prev,
            partners: [...prev.partners, { id: generateId(), name: '', rg: '', cpf: '', email: '' }]
        }));
    };

    const removePartner = (index: number) => {
        setFormData(prev => ({
            ...prev,
            partners: formData.partners.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: CompanyProfile = {
            id: existingProfile?.id || generateId(),
            ...formData,
        };
        
        if (existingProfile) {
            dispatch({ type: 'UPDATE_ITEM', payload: { item: payload, collection: 'companyProfile' } });
        } else {
            dispatch({ type: 'ADD_ITEM', payload: { item: payload, collection: 'companyProfile' } });
        }
        setIsEditing(false);
    };
    
    const handleDelete = () => {
        if (existingProfile) {
            dispatch({ type: 'DELETE_ITEM', payload: { id: existingProfile.id, collection: 'companyProfile' } });
        }
        setIsDeleteConfirmOpen(false);
    };
    
    const renderEditMode = () => (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PageTitle title={existingProfile ? 'Editar Cadastro da Empresa' : 'Cadastrar Empresa'} />
            <Section title="Dados Gerais">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Nome Fantasia"><Input name="tradeName" value={formData.tradeName} onChange={handleChange} required /></Field>
                    <Field label="Razão Social"><Input name="legalName" value={formData.legalName} onChange={handleChange} required /></Field>
                    <Field label="CNPJ"><Input name="cnpj" value={formData.cnpj} onChange={handleChange} required /></Field>
                    <Field label="Endereço"><Input name="address" value={formData.address} onChange={handleChange} /></Field>
                </div>
            </Section>
            <Section title="Documentos">
                <div>
                    <Field label="Contrato Social"><Input type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,image/*" /></Field>
                    {formData.socialContractUrl && (
                        <div className="mt-2"><a href={formData.socialContractUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-400 hover:underline">Ver Contrato Social salvo</a></div>
                    )}
                </div>
            </Section>
            <Section title="Sócios">
                <div className="space-y-3">
                    {formData.partners.map((partner, index) => (
                        <div key={partner.id || index} className="relative p-3 border rounded-lg border-white/10">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <Field label="Nome do Sócio"><Input name="name" value={partner.name} onChange={e => handlePartnerChange(index, e)} /></Field>
                                <Field label="RG"><Input name="rg" value={partner.rg} onChange={e => handlePartnerChange(index, e)} /></Field>
                                <Field label="CPF"><Input name="cpf" value={partner.cpf} onChange={e => handlePartnerChange(index, e)} /></Field>
                                <Field label="E-mail"><Input type="email" name="email" value={partner.email} onChange={e => handlePartnerChange(index, e)} /></Field>
                            </div>
                            <button type="button" onClick={() => removePartner(index)} className="absolute top-2 right-2 p-1 text-rose-400 hover:bg-rose-500/10 rounded-full"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
                <div className="mt-4"><Button type="button" variant="secondary" onClick={addPartner}><Plus size={16} className="mr-2" /> Adicionar Sócio</Button></div>
            </Section>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                {existingProfile && <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>}
                <Button type="submit" variant="primary">Salvar Dados da Empresa</Button>
            </div>
        </form>
    );

    const renderViewMode = () => (
        <div className="space-y-6">
            <PageTitle 
                title={formData.tradeName || "Empresa"}
                subtitle={formData.legalName}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="danger-ghost" onClick={() => setIsDeleteConfirmOpen(true)}>Excluir</Button>
                        <Button variant="primary" onClick={() => setIsEditing(true)}><Edit size={14} className="mr-2"/>Editar</Button>
                    </div>
                }
            />
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><h4 className="text-xs text-gray-400">CNPJ</h4><p>{formData.cnpj}</p></div>
                    <div><h4 className="text-xs text-gray-400">Endereço</h4><p>{formData.address}</p></div>
                </div>
                {formData.socialContractUrl && (
                    <div>
                        <h4 className="text-xs text-gray-400 mb-1">Documentos</h4>
                        <a href={formData.socialContractUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-sky-400 hover:underline">
                           <FileText size={16}/> Ver Contrato Social
                        </a>
                    </div>
                )}
            </div>
            <h3 className="text-lg font-semibold">Sócios</h3>
            {formData.partners.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.partners.map((partner, index) => (
                        <div key={partner.id || index} className="rounded-xl bg-white/5 border border-white/10 p-4">
                            <h4 className="font-semibold">{partner.name}</h4>
                            <div className="text-sm text-gray-400 space-y-1 mt-2">
                                <p><strong>Email:</strong> {partner.email}</p>
                                <p><strong>CPF:</strong> {partner.cpf}</p>
                                <p><strong>RG:</strong> {partner.rg}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : <p className="text-sm text-gray-500">Nenhum sócio cadastrado.</p>}

             <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)} title="Confirmar Exclusão">
                <p>Tem certeza que deseja excluir os dados da empresa? Esta ação não pode ser desfeita.</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="ghost" onClick={() => setIsDeleteConfirmOpen(false)}>Cancelar</Button>
                    <Button variant="danger" onClick={handleDelete}>Excluir</Button>
                </div>
            </Modal>
        </div>
    );
    
    return isEditing ? renderEditMode() : renderViewMode();
};

export default CompanyProfilePage;