
import React, { useState, useMemo, FC, PropsWithChildren, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { PartnerAccount, PartnerInvestment, PartnerInvestmentTxnType, ID, Contact, Account, AccountType, Movement, MovementKind, MovementOrigin, MovementStatus, ContactType, CategoryType } from '../types';
import PageTitle from '../components/ui/PageTitle';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import ModalShell from '../src/components/modal/ModalShell';
import { Section } from '../src/components/form/Section';
import { Field, Input, Select, Checkbox, Textarea } from '../src/components/form/Field';
import Button from '../components/ui/Button';
import { KpiCard } from '../src/components/KpiCard';
import { format } from 'date-fns';
import ContactPicker from '../src/components/pickers/ContactPicker';
import ContactFormModal from '../components/ContactFormModal';
import { Pencil, Trash2 } from 'lucide-react';


// --- HELPER FUNCTIONS ---
const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatDate = (dateString: string) => new Date(dateString + 'T12:00:00Z').toLocaleDateString('pt-BR', {timeZone: 'UTC'});

// Fix: Define a type that includes the dynamically added `partnerName`.
type PartnerInvestmentWithDetails = PartnerInvestment & { partnerName: string; partnerId?: string; };

// --- HOOK FOR DATA CALCULATION ---
const useInvestmentCalculations = () => {
    const { state } = useData();
    
    return useMemo(() => {
        const accountsWithBalance = state.partnerAccounts.map(acc => {
            const balance = state.partnerInvestments
                .filter(inv => inv.partnerAccountId === acc.id)
                .reduce((sum, inv) => {
                    if (inv.type === PartnerInvestmentTxnType.Resgate) {
                        return sum - inv.amount;
                    }
                    return sum + inv.amount; // Aporte, Rendimento, Transferencia are positive
                }, 0);
            const partner = state.contacts.find(c => c.id === acc.contactId);
            return { ...acc, balance, partnerName: partner?.name || 'N/A' };
        });

        const totalAportes = state.partnerInvestments.filter(i => i.type === 'APORTE' || i.type === 'TRANSFERENCIA').reduce((sum, i) => sum + i.amount, 0);
        const totalRendimentos = state.partnerInvestments.filter(i => i.type === 'RENDIMENTO').reduce((sum, i) => sum + i.amount, 0);
        const totalSaldo = accountsWithBalance.reduce((sum, acc) => sum + acc.balance, 0);
        
        const topSocios = [...accountsWithBalance].sort((a,b) => b.balance - a.balance).slice(0, 3).map(acc => ({ name: acc.partnerName, value: acc.balance }));
        
        const partnersWithData = state.contacts.filter(c => c.type === ContactType.Socio).map(socio => {
            const partnerAccounts = state.partnerAccounts.filter(pa => pa.contactId === socio.id);
            const balance = partnerAccounts.reduce((sum, pa) => {
                const accWithBal = accountsWithBalance.find(awb => awb.id === pa.id);
                return sum + (accWithBal?.balance || 0);
            }, 0);
            return { ...socio, balance, totalInvested: balance, accountCount: partnerAccounts.length };
        });

        const transactions: PartnerInvestmentWithDetails[] = state.partnerInvestments.map(inv => {
            const account = accountsWithBalance.find(a => a.id === inv.partnerAccountId);
            return { ...inv, partnerName: account?.partnerName || 'N/A', partnerId: account?.contactId };
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            accountsWithBalance,
            totalAportes,
            totalRendimentos,
            totalSaldo,
            topSocios,
            partnersWithData,
            transactions
        };
    }, [state.partnerAccounts, state.partnerInvestments, state.contacts]);
};


// --- UI COMPONENTS ---
const TopMetrics: FC<{
  totalSaldo:number; totalAportes:number; totalRendimentos:number;
  top: Array<{ name:string; value:number }>
}> = ({ totalSaldo, totalAportes, totalRendimentos, top }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard title="Saldo Total Investido" value={formatCurrency(totalSaldo)} tone="positive" />
        <KpiCard title="Total de Aportes" value={formatCurrency(totalAportes)} />
        <KpiCard title="Total de Rendimentos" value={formatCurrency(totalRendimentos)} />
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
            <div className="text-xs text-gray-400 mb-1">Top Sócios (Saldo)</div>
            <div className="flex flex-wrap gap-2">
            {top.map(t=>(
                <span key={t.name} className="px-2 py-1 rounded-lg bg-white/10 text-sm text-gray-200">
                {t.name}: {formatCurrency(t.value)}
                </span>
            ))}
            </div>
        </div>
    </div>
);

const AccountsSidebar: FC<{
  accounts: Array<{id:string; name:string; balance:number; status: string}>;
  selectedId?:string; onSelect:(id:string)=>void; onNew: () => void;
}> = ({ accounts, selectedId, onSelect, onNew }) => (
    <aside className="w-full lg:w-72 xl:w-80 shrink-0 space-y-2">
        <div className="flex items-center gap-2">
            <input placeholder="Buscar conta..." className="rounded-full bg-white/5 border border-white/10 px-4 h-9 text-sm text-gray-200 w-full" />
        </div>
        <Button variant="secondary" onClick={onNew} className="w-full">
            + Conta de Sócio
        </Button>
        <div className="space-y-2 max-h-96 overflow-y-auto">
            {accounts.length === 0 && (
                <div className="text-center text-sm text-gray-400 py-4">Nenhuma conta de sócio cadastrada.</div>
            )}
            {accounts.map(a=>(
            <button key={a.id}
                onClick={()=>onSelect(a.id)}
                className={`w-full text-left rounded-2xl p-3 border ${selectedId===a.id?'bg-white/10 border-white/20':'bg-white/5 border-white/10'} ${a.status !== 'Ativo' ?'opacity-60':''}`}>
                <div className="text-sm text-gray-100 font-medium">{a.name}</div>
                <div className="text-xs text-gray-400">{formatCurrency(a.balance)}</div>
            </button>
            ))}
      </div>
    </aside>
);


// --- TAB COMPONENTS ---
const ExtractTab: FC<{
    transactions: PartnerInvestmentWithDetails[],
    accountId?: string,
    onEdit: (inv: PartnerInvestment) => void,
    onDelete: (inv: PartnerInvestment) => void,
}> = ({ transactions, accountId, onEdit, onDelete }) => {
    const transactionsByPartner = useMemo(() => {
        if (!accountId) return [];
        const filtered = transactions.filter(t => t.partnerAccountId === accountId);
        const grouped = new Map<string, PartnerInvestmentWithDetails[]>();
        filtered.forEach(t => {
            const key = t.partnerName;
            if(!grouped.has(key)) grouped.set(key, []);
            grouped.get(key)!.push(t);
        });
        return Array.from(grouped.entries());
    }, [transactions, accountId]);
    
    if (!accountId) return <div className="text-center p-8 text-gray-400">Selecione uma conta na barra lateral para ver o extrato.</div>

    return (
        <div className="space-y-3">
            {transactionsByPartner.map(([partnerName, txns]) => (
                 <details key={partnerName} className="rounded-xl bg-white/5 border border-white/10" open>
                    <summary className="p-3 font-medium cursor-pointer">{partnerName}</summary>
                    <div className="border-t border-white/10">
                        <table className="w-full text-sm text-gray-200">
                            <thead className="text-xs text-gray-400">
                                <tr className="[&>th]:py-2 [&>th]:px-3 [&>th]:font-medium text-left">
                                <th>Data</th><th>Descrição</th><th>Tipo</th><th className="text-right">Valor</th><th className="w-20 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="[&>tr>td]:py-2 [&>tr>td]:px-3 border-t border-white/10 divide-y divide-white/5">
                                {txns.map(t => {
                                    const isNegative = t.type === PartnerInvestmentTxnType.Resgate;
                                    return (
                                        <tr key={t.id} className="group">
                                            <td>{formatDate(t.date)}</td>
                                            <td>{t.note || '—'}</td>
                                            <td>{t.type}</td>
                                            <td className={`text-right font-medium ${isNegative ? 'text-red-400' : 'text-green-400'}`}>{!isNegative ? '+' : '-'}{formatCurrency(t.amount)}</td>
                                            <td className="text-right">
                                                <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => onEdit(t)} className="p-2 rounded-full hover:bg-white/10 text-gray-300"><Pencil size={14} /></button>
                                                    <button onClick={() => onDelete(t)} className="p-2 rounded-full hover:bg-white/10 text-rose-400"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </details>
            ))}
        </div>
    );
};

const PartnersTab: FC<{ partners: (Contact & {balance: number, totalInvested: number, accountCount: number})[] }> = ({ partners }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.map(p => (
            <div key={p.id} className="rounded-xl bg-white/5 border border-white/10 p-4">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-gray-400 text-sm">Saldo Total</p>
                <p className="text-xl font-bold">{formatCurrency(p.balance)}</p>
            </div>
        ))}
    </div>
);

const ReportsTab: FC<{ accounts: any[], investments: any[], partners: any[] }> = ({ accounts, investments, partners }) => {
    const pieData = useMemo(() => accounts.map(a => ({ name: a.partnerName, value: a.balance })).filter(d => d.value > 0), [accounts]);
    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#22d3ee', '#a3e635'];
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-lg h-80 flex flex-col">
                <h3 className="font-semibold mb-4 text-center">Participação no Saldo Total</h3>
                {pieData.length === 0 ? <div className="flex-grow flex items-center justify-center text-gray-500">Sem dados para exibir.</div> :
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>}
            </div>
        </div>
    );
};

const SettingsTab: FC<{ onNewAccount: ()=>void, accounts: any[] }> = ({ onNewAccount, accounts }) => (
    <div>
        <div className="flex justify-end mb-4"><Button variant="primary" onClick={onNewAccount}>+ Conta de Sócio</Button></div>
        <div className="bg-gray-800/50 rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-gray-700/50 text-xs uppercase text-gray-400">
                    <tr><th className="px-6 py-3 text-left">Nome da Conta</th><th className="px-6 py-3 text-left">Sócio Vinculado</th><th className="px-6 py-3 text-left">Status</th></tr>
                </thead>
                <tbody>
                    {accounts.map(acc => (
                         <tr key={acc.id} className="border-b border-gray-700 hover:bg-gray-800">
                            <td className="px-6 py-4 font-medium">{acc.name}</td><td className="px-6 py-4">{acc.partnerName}</td><td className="px-6 py-4"><span className={`px-2 py-0.5 rounded-full text-xs ${acc.status === 'Ativo' ? 'bg-green-500/15 text-green-300' : 'bg-gray-600/30 text-gray-400'}`}>{acc.status}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);


// --- MODAL COMPONENTS ---
const InvestmentEditModal: FC<{
    isOpen: boolean;
    onClose: () => void;
    investment: PartnerInvestment;
    onSave: (data: { date: string, amount: number, note: string }) => void;
}> = ({ isOpen, onClose, investment, onSave }) => {
    const [formData, setFormData] = useState({
        date: investment.date,
        amount: investment.amount,
        note: investment.note || ''
    });

    useEffect(() => {
        setFormData({
            date: investment.date,
            amount: investment.amount,
            note: investment.note || ''
        });
    }, [investment]);

    const handleSave = () => {
        if (formData.amount <= 0) {
            alert("O valor deve ser positivo.");
            return;
        }
        onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <ModalShell title={`Editar Movimentação - ${investment.type}`} footer={<><Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={handleSave}>Salvar Alterações</Button></>}>
            <Section title="Detalhes da Movimentação">
                <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-6">
                        <Field label="Data *"><Input type="date" value={formData.date} onChange={e => setFormData(f => ({...f, date: e.target.value}))} /></Field>
                    </div>
                    <div className="col-span-12 md:col-span-6">
                        <Field label="Valor *"><Input type="number" value={formData.amount} onChange={e => setFormData(f => ({...f, amount: Number(e.target.value)}))} /></Field>
                    </div>
                    <div className="col-span-12">
                        <Field label="Observação"><Input value={formData.note} onChange={e => setFormData(f => ({...f, note: e.target.value}))} /></Field>
                    </div>
                </div>
            </Section>
        </ModalShell>
    );
};

const NewPartnerAccountModal: FC<{ isOpen: boolean, onClose: ()=>void }> = ({ isOpen, onClose }) => {
    const { state, dispatch, generateId } = useData();
    const [name, setName] = useState('');
    const [contactId, setContactId] = useState('');
    const [status, setStatus] = useState<'Ativo'|'Inativo'>('Ativo');
    const [isContactPickerOpen, setIsContactPickerOpen] = useState(false);
    const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);

    const selectedSocio = useMemo(() => state.contacts.find(c => c.id === contactId), [state.contacts, contactId]);
    const socioLabel = selectedSocio ? selectedSocio.name : '';
    
    useEffect(() => {
        if(isOpen) {
            setName('');
            setContactId('');
            setStatus('Ativo');
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!name || !contactId) { alert("Preencha todos os campos"); return; }
        const payload: PartnerAccount = { id: generateId(), name, contactId, status, createdAt: new Date().toISOString() };
        dispatch({ type: 'ADD_ITEM', payload: { item: payload, collection: 'partnerAccounts' }});
        onClose();
    };

    if (!isOpen) return null;
    
    return (
        <>
            <ModalShell title="Adicionar Conta de Sócio" footer={<><Button variant="ghost" onClick={onClose} type="button">Cancelar</Button><Button variant="primary" onClick={handleSave}>Salvar</Button></>}>
                <Section title="Detalhes da Conta"><div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 md:col-span-6"><Field label="Nome da Conta *"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Conta Capital XP"/></Field></div>
                    <div className="col-span-12 md:col-span-6">
                        <Field label="Sócio Vinculado *">
                            <div className="flex gap-2">
                                <Input
                                    value={socioLabel}
                                    readOnly
                                    placeholder="Selecione um sócio"
                                    onClick={() => setIsContactPickerOpen(true)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsContactPickerOpen(true)}
                                    className="shrink-0 rounded-xl border border-white/10 px-3 h-10 text-sm text-gray-200 hover:bg-white/5"
                                >
                                    Pesquisar
                                </button>
                            </div>
                        </Field>
                    </div>
                </div></Section>
            </ModalShell>

            <ContactPicker
                isOpen={isContactPickerOpen}
                onClose={() => setIsContactPickerOpen(false)}
                onSelect={(contact) => {
                    setContactId(contact.id);
                    setIsContactPickerOpen(false);
                }}
                contactType={ContactType.Socio}
                allowCreateNew
                onCreateNewContact={() => {
                    setIsContactPickerOpen(false);
                    setIsNewContactModalOpen(true);
                }}
            />
            
            {isNewContactModalOpen && (
                <ContactFormModal
                    isOpen={isNewContactModalOpen}
                    onClose={() => setIsNewContactModalOpen(false)}
                    contactToEdit={null}
                    initialType={ContactType.Socio}
                />
            )}
        </>
    );
};

const NewAporteModal: FC<{ isOpen: boolean, onClose: ()=>void }> = ({ isOpen, onClose }) => {
    const { state, dispatch, generateId } = useData();
    const [accountId, setAccountId] = useState('');
    const [amount, setAmount] = useState<number | string>('');
    const [date, setDate] = useState(new Date().toISOString().slice(0,10));
    const [note, setNote] = useState('');
    
    const [createMovement, setCreateMovement] = useState(false);
    const [contraAccountId, setContraAccountId] = useState('');
    const companyAccounts = state.accounts.filter(a => a.type === AccountType.Banco || a.type === AccountType.Caixa);

    useEffect(() => {
        if(isOpen) {
            setAccountId(''); setAmount(''); setDate(new Date().toISOString().slice(0,10)); setNote('');
            setCreateMovement(false);
            setContraAccountId('');
        }
    }, [isOpen]);

    const handleSave = () => {
        if (!accountId || Number(amount) <= 0) { alert("Preencha os campos de conta e valor."); return; }
        
        if (createMovement) {
            // Logic for Aporte registered in company's cash flow
            if (!contraAccountId) { alert("Selecione a conta da empresa para o crédito."); return; }
            
            const groupId = generateId();
            const partnerAccount = state.partnerAccounts.find(pa => pa.id === accountId);
            const partner = partnerAccount ? state.contacts.find(c => c.id === partnerAccount.contactId) : null;
            
            // 1. Create Company's RECEITA movement
            let aporteCategory = state.categories.find(c => c.name === 'Aporte de Sócio' && c.type === CategoryType.Receita);
            if (!aporteCategory) {
                aporteCategory = { id: generateId(), name: 'Aporte de Sócio', type: CategoryType.Receita, color: '#10b981' };
                dispatch({ type: 'ADD_ITEM', payload: { item: aporteCategory, collection: 'categories' } });
            }
            const movement: Movement = { 
                id: generateId(), kind: MovementKind.RECEITA, status: MovementStatus.Baixado, paidDate: date, origin: MovementOrigin.Investimento, 
                description: `Aporte de sócio: ${partner?.name || 'Sócio'}${note ? ` - ${note}` : ''}`,
                amountGross: Number(amount), fees: 0, amountNet: Number(amount), dueDate: date, accountId: contraAccountId,
                categoryId: aporteCategory.id,
                groupId: groupId,
            };
            dispatch({ type: 'ADD_ITEM', payload: { item: movement, collection: 'movements' } });

            // 2. Create Partner's APORTE investment
            const aporte: PartnerInvestment = { 
                id: generateId(), partnerAccountId: accountId, date, amount: Number(amount), 
                type: PartnerInvestmentTxnType.Aporte, note,
                groupId: groupId,
                linkedMovementId: movement.id,
                contraAccountId: contraAccountId,
            };
            dispatch({ type: 'ADD_ITEM', payload: { item: aporte, collection: 'partnerInvestments' }});

        } else {
            // Logic for simple Aporte (book entry)
            const payload: PartnerInvestment = { 
                id: generateId(), 
                partnerAccountId: accountId, 
                date, 
                amount: Number(amount), 
                type: PartnerInvestmentTxnType.Aporte, 
                note,
            };
            dispatch({ type: 'ADD_ITEM', payload: { item: payload, collection: 'partnerInvestments' }});
        }
        
        onClose();
    }
    if (!isOpen) return null;
    return (
         <ModalShell title="Novo Aporte de Sócio" footer={<><Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={handleSave}>Salvar</Button></>}>
            <Section title="Detalhes do Aporte"><div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-6"><Field label="Conta do Sócio *"><Select value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Selecione...</option>{state.partnerAccounts.map(pa => <option key={pa.id} value={pa.id}>{pa.name}</option>)}</Select></Field></div>
                <div className="col-span-12 md:col-span-3"><Field label="Valor do Aporte *"><Input type="number" value={amount} onChange={e=>setAmount(e.target.value)} /></Field></div>
                <div className="col-span-12 md:col-span-3"><Field label="Data *"><Input type="date" value={date} onChange={e=>setDate(e.target.value)} /></Field></div>
                <div className="col-span-12"><Field label="Observação"><Input value={note} onChange={e=>setNote(e.target.value)} /></Field></div>
            </div></Section>
            
            <Section title="Registro na Empresa (Opcional)">
                <div className="flex items-center gap-3">
                    <Checkbox checked={createMovement} onChange={e => setCreateMovement(e.target.checked)} />
                    <span className="text-sm text-gray-200">Registrar entrada no caixa da empresa</span>
                </div>
                {createMovement && (
                    <div className="grid grid-cols-12 gap-3 mt-3">
                        <div className="col-span-12 md:col-span-6">
                            <Field label="Conta da Empresa (Crédito) *">
                                <Select value={contraAccountId} onChange={e=>setContraAccountId(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {companyAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </Select>
                            </Field>
                        </div>
                    </div>
                )}
            </Section>
        </ModalShell>
    );
};

const NewWithdrawalModal: FC<{ isOpen: boolean, onClose: ()=>void }> = ({ isOpen, onClose }) => {
    const { state, dispatch, generateId } = useData();
    const [formData, setFormData] = useState({ partnerAccountId: '', contraAccountId: '', amount: 0, date: new Date().toISOString().slice(0,10), note: '' });
    
    useEffect(() => {
        if(isOpen) setFormData({ partnerAccountId: '', contraAccountId: '', amount: 0, date: new Date().toISOString().slice(0,10), note: '' });
    }, [isOpen]);

    const companyAccounts = state.accounts.filter(a => a.type === AccountType.Banco || a.type === AccountType.Caixa);
    const handleSave = () => {
        const { partnerAccountId, contraAccountId, amount, date, note } = formData;
        if (!partnerAccountId || !contraAccountId || amount <= 0) { alert("Preencha todos os campos"); return; }
        const partnerAccount = state.partnerAccounts.find(pa => pa.id === partnerAccountId), partner = partnerAccount ? state.contacts.find(c => c.id === partnerAccount.contactId) : null;
        
        let resgateCategory = state.categories.find(c => c.name === 'Resgate de Sócio' && c.type === CategoryType.Despesa);
        if (!resgateCategory) {
            resgateCategory = {
                id: generateId(),
                name: 'Resgate de Sócio',
                type: CategoryType.Despesa,
                color: '#ef4444'
            };
            dispatch({ type: 'ADD_ITEM', payload: { item: resgateCategory, collection: 'categories' } });
        }
        
        const movement: Movement = { 
            id: generateId(), 
            kind: MovementKind.DESPESA, 
            status: MovementStatus.Baixado, 
            paidDate: date, 
            origin: MovementOrigin.Resgate, 
            description: `Resgate de sócio: ${partner?.name || 'Sócio'}${note ? ` - ${note}` : ''}`,
            amountGross: amount, 
            fees: 0, 
            amountNet: amount, 
            dueDate: date, 
            accountId: contraAccountId,
            categoryId: resgateCategory.id
        };
        dispatch({ type: 'ADD_ITEM', payload: { item: movement, collection: 'movements' } });
        
        const investment: PartnerInvestment = { 
            id: generateId(), 
            partnerAccountId, 
            contraAccountId, 
            amount, 
            date, 
            note,
            type: PartnerInvestmentTxnType.Resgate, 
            linkedMovementId: movement.id, 
        };
        dispatch({ type: 'ADD_ITEM', payload: { item: investment, collection: 'partnerInvestments' } });
        onClose();
    };
    if (!isOpen) return null;
    return (
         <ModalShell title="Resgatar Capital do Sócio" footer={<><Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={handleSave}>Confirmar</Button></>}>
            <Section title="Detalhes do Resgate"><div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-6">
                    <Field label="Conta da Empresa (Origem) *">
                        <Select value={formData.contraAccountId} onChange={e=>setFormData(f=>({...f, contraAccountId:e.target.value}))}><option value="">Selecione...</option>{companyAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select>
                    </Field>
                </div>
                <div className="col-span-12 md:col-span-6">
                    <Field label="Conta do Sócio (Destino) *">
                        <Select value={formData.partnerAccountId} onChange={e=>setFormData(f=>({...f, partnerAccountId:e.target.value}))}><option value="">Selecione...</option>{state.partnerAccounts.map(pa => <option key={pa.id} value={pa.id}>{pa.name}</option>)}</Select>
                    </Field>
                </div>
                <div className="col-span-12 md:col-span-6"><Field label="Valor *"><Input type="number" value={formData.amount} onChange={e=>setFormData(f=>({...f, amount: Number(e.target.value)}))} /></Field></div>
                <div className="col-span-12 md:col-span-6"><Field label="Data *"><Input type="date" value={formData.date} onChange={e=>setFormData(f=>({...f, date: e.target.value}))} /></Field></div>
                <div className="col-span-12"><Field label="Observação"><Input value={formData.note} onChange={e=>setFormData(f=>({...f, note: e.target.value}))} /></Field></div>
            </div></Section>
        </ModalShell>
    );
}

const NewYieldModal: FC<{ isOpen: boolean, onClose: ()=>void }> = ({ isOpen, onClose }) => {
    const { state, dispatch, generateId } = useData();
    const [formData, setFormData] = useState({ partnerAccountId: '', contraAccountId: '', amount: 0, date: new Date().toISOString().slice(0,10), note: '' });
    
    useEffect(() => {
        if(isOpen) setFormData({ partnerAccountId: '', contraAccountId: '', amount: 0, date: new Date().toISOString().slice(0,10), note: '' });
    }, [isOpen]);

    const companyAccounts = state.accounts.filter(a => a.type === AccountType.Banco || a.type === AccountType.Caixa);
    const handleSave = () => {
        const { partnerAccountId, contraAccountId, amount, date, note } = formData;
        if (!partnerAccountId || !contraAccountId || amount <= 0) { alert("Preencha todos os campos"); return; }
        const partnerAccount = state.partnerAccounts.find(pa => pa.id === partnerAccountId), partner = partnerAccount ? state.contacts.find(c => c.id === partnerAccount.contactId) : null;
        
        let rendimentoCategory = state.categories.find(c => c.name === 'Rendimento de Sócio' && c.type === CategoryType.Despesa);
        if (!rendimentoCategory) {
            rendimentoCategory = {
                id: generateId(),
                name: 'Rendimento de Sócio',
                type: CategoryType.Despesa,
                color: '#f59e0b'
            };
            dispatch({ type: 'ADD_ITEM', payload: { item: rendimentoCategory, collection: 'categories' } });
        }
        
        const movement: Movement = { 
            id: generateId(), 
            kind: MovementKind.DESPESA, 
            status: MovementStatus.Baixado, 
            paidDate: date, 
            origin: MovementOrigin.Investimento, 
            description: `Rendimento para sócio: ${partner?.name || 'Sócio'}${note ? ` - ${note}` : ''}`,
            amountGross: amount, 
            fees: 0, 
            amountNet: amount, 
            dueDate: date, 
            accountId: contraAccountId,
            categoryId: rendimentoCategory.id
        };
        dispatch({ type: 'ADD_ITEM', payload: { item: movement, collection: 'movements' } });
        
        const investment: PartnerInvestment = { 
            id: generateId(), 
            partnerAccountId, 
            contraAccountId, 
            amount, 
            date, 
            note,
            type: PartnerInvestmentTxnType.Rendimento, 
            linkedMovementId: movement.id, 
        };
        dispatch({ type: 'ADD_ITEM', payload: { item: investment, collection: 'partnerInvestments' } });
        onClose();
    };
    if (!isOpen) return null;
    return (
         <ModalShell title="Distribuir Rendimento para Sócio" footer={<><Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button><Button variant="primary" onClick={handleSave}>Confirmar</Button></>}>
            <Section title="Detalhes da Distribuição"><div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-6"><Field label="Conta da Empresa (Origem) *"><Select value={formData.contraAccountId} onChange={e=>setFormData(f=>({...f, contraAccountId:e.target.value}))}><option value="">Selecione...</option>{companyAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field></div>
                <div className="col-span-12 md:col-span-6"><Field label="Conta do Sócio (Destino) *"><Select value={formData.partnerAccountId} onChange={e=>setFormData(f=>({...f, partnerAccountId:e.target.value}))}><option value="">Selecione...</option>{state.partnerAccounts.map(pa => <option key={pa.id} value={pa.id}>{pa.name}</option>)}</Select></Field></div>
                <div className="col-span-12 md:col-span-6"><Field label="Valor *"><Input type="number" value={formData.amount} onChange={e=>setFormData(f=>({...f, amount: Number(e.target.value)}))} /></Field></div>
                <div className="col-span-12 md:col-span-6"><Field label="Data *"><Input type="date" value={formData.date} onChange={e=>setFormData(f=>({...f, date: e.target.value}))} /></Field></div>
                <div className="col-span-12"><Field label="Observação"><Input value={formData.note} onChange={e=>setFormData(f=>({...f, note: e.target.value}))} /></Field></div>
            </div></Section>
        </ModalShell>
    );
}


// --- MAIN PAGE COMPONENT ---
export default function InvestmentsPage() {
    const { state, dispatch } = useData();
    const { accountsWithBalance, totalAportes, totalRendimentos, totalSaldo, topSocios, partnersWithData, transactions } = useInvestmentCalculations();

    const [activeTab, setActiveTab] = useState<'extrato' | 'socios' | 'relatorios' | 'configuracoes'>('extrato');
    const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
    const [modals, setModals] = useState({ newAccount: false, newAporte: false, newWithdrawal: false, newYield: false });
    const [investmentToEdit, setInvestmentToEdit] = useState<PartnerInvestment | null>(null);
    const [investmentToDelete, setInvestmentToDelete] = useState<PartnerInvestment | null>(null);
    
    const openModal = (modal: keyof typeof modals) => setModals(prev => ({...prev, [modal]: true}));
    const closeModal = (modal: keyof typeof modals) => setModals(prev => ({...prev, [modal]: false}));
    
    useEffect(() => {
        if (!selectedAccountId && accountsWithBalance.length > 0) {
            setSelectedAccountId(accountsWithBalance[0].id);
        }
    }, [accountsWithBalance, selectedAccountId]);

    const handleConfirmDelete = () => {
      if (!investmentToDelete) return;
      dispatch({ type: 'DELETE_ITEM', payload: { id: investmentToDelete.id, collection: 'partnerInvestments' } });
      setInvestmentToDelete(null);
    };

    const handleUpdateInvestment = (updatedData: { date: string, amount: number, note: string }) => {
        if (!investmentToEdit) return;

        const updatedInvestment = { ...investmentToEdit, ...updatedData };
        dispatch({ type: 'UPDATE_ITEM', payload: { item: updatedInvestment, collection: 'partnerInvestments' } });
        
        setInvestmentToEdit(null);
    };

    const TabButton: React.FC<PropsWithChildren<{tabId: typeof activeTab}>> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`-mb-px mr-4 rounded-t-md px-3 py-2 text-sm transition-colors ${activeTab===tabId?'border-b-2 border-blue-500 text-blue-400 font-medium':'text-slate-400 hover:text-slate-200'}`}
        >{children}</button>
    );

    return (
        <div className="space-y-4">
            <header className="bg-[#0e1422]/80 backdrop-blur-sm -mx-6 -mt-6 lg:-mx-10 lg:-mt-10 p-6 lg:p-10 mb-0">
                <PageTitle title="Investimentos de Sócios" />
                <div className="mt-4 flex flex-wrap gap-4 items-center">
                    <div className="flex-grow">
                        <TopMetrics totalSaldo={totalSaldo} totalAportes={totalAportes} totalRendimentos={totalRendimentos} top={topSocios} />
                    </div>
                     <div className="flex flex-col gap-2">
                        <Button variant="primary" onClick={()=>openModal('newAporte')}>Novo Aporte</Button>
                        <Button variant="secondary" onClick={()=>openModal('newYield')}>Distribuir Rendimento</Button>
                        <Button variant="secondary" onClick={()=>openModal('newWithdrawal')}>Resgatar Capital</Button>
                    </div>
                </div>
                 <div className="mt-6 border-b border-white/10">
                    <TabButton tabId="extrato">Extrato</TabButton>
                    <TabButton tabId="socios">Sócios</TabButton>
                    <TabButton tabId="relatorios">Relatórios</TabButton>
                    <TabButton tabId="configuracoes">Configurações</TabButton>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <AccountsSidebar accounts={accountsWithBalance} selectedId={selectedAccountId} onSelect={setSelectedAccountId} onNew={()=>openModal('newAccount')} />

                <main className="flex-1 w-full">
                    <div className="bg-gray-800/20 p-4 rounded-lg">
                        {activeTab === 'extrato' && <ExtractTab transactions={transactions} accountId={selectedAccountId} onEdit={setInvestmentToEdit} onDelete={setInvestmentToDelete} />}
                        {activeTab === 'socios' && <PartnersTab partners={partnersWithData} />}
                        {activeTab === 'relatorios' && <ReportsTab accounts={accountsWithBalance} investments={transactions} partners={partnersWithData} />}
                        {activeTab === 'configuracoes' && <SettingsTab accounts={accountsWithBalance} onNewAccount={()=>openModal('newAccount')} />}
                    </div>
                </main>
            </div>

            {modals.newAccount && <NewPartnerAccountModal isOpen={modals.newAccount} onClose={() => closeModal('newAccount')} />}
            {modals.newAporte && <NewAporteModal isOpen={modals.newAporte} onClose={() => closeModal('newAporte')} />}
            {modals.newWithdrawal && <NewWithdrawalModal isOpen={modals.newWithdrawal} onClose={() => closeModal('newWithdrawal')} />}
            {modals.newYield && <NewYieldModal isOpen={modals.newYield} onClose={() => closeModal('newYield')} />}
            
            {investmentToEdit && <InvestmentEditModal isOpen={!!investmentToEdit} onClose={() => setInvestmentToEdit(null)} investment={investmentToEdit} onSave={handleUpdateInvestment} />}
            {investmentToDelete && (
                <ModalShell title="Confirmar Exclusão" footer={<><Button variant="ghost" onClick={() => setInvestmentToDelete(null)}>Cancelar</Button><Button variant="danger" onClick={handleConfirmDelete}>Excluir</Button></>}>
                    <p>Tem certeza que deseja excluir esta movimentação? Se houver um lançamento financeiro vinculado na empresa, ele também será excluído.</p>
                </ModalShell>
            )}
        </div>
    );
}
