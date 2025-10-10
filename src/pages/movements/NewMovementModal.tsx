import React, { useMemo } from 'react';
import { Movement as UIMovement } from './types';
import { useData } from '../../../contexts/DataContext';
import { CategoryType, Movement, MovementKind, MovementOrigin, MovementStatus, PartnerInvestment, PartnerInvestmentTxnType } from '../../../types';
import { addMonths, addWeeks, addDays, format } from 'date-fns';
import ModalShell from '../../components/modal/ModalShell';
import { Section } from '../../components/form/Section';
import { Field, Input, Select, Checkbox } from '../../components/form/Field';
import Button from '../../../components/ui/Button';
import CategoryPicker from '../../components/pickers/CategoryPicker';
import { toUIMovement } from './api';

const brl = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

// --- Helper Functions for Installments ---
type Frequency = 'MENSAL'|'SEMANAL'|'QUINZENAL'|'NDIAS';

function addFreq(dateISO: string, freq: Frequency, nDays: number, step: number): string {
    const baseDate = new Date(dateISO + 'T00:00:00Z');
    let newDate: Date;
    switch(freq) {
        case 'MENSAL': newDate = addMonths(baseDate, step); break;
        case 'SEMANAL': newDate = addWeeks(baseDate, step); break;
        case 'QUINZENAL': newDate = addDays(baseDate, step * 15); break;
        case 'NDIAS': newDate = addDays(baseDate, step * nDays); break;
    }
    return format(newDate, 'yyyy-MM-dd');
}

function splitRounded(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const totalInCents = Math.round(total * 100);
  const baseInCents = Math.floor(totalInCents / parts);
  const remainder = totalInCents % parts;
  const arrInCents = Array(parts).fill(baseInCents);
  for (let i = 0; i < remainder; i++) {
    arrInCents[i]++;
  }
  return arrInCents.map(cents => cents / 100);
}

function generateInstallments(params: {
  installments: number;
  frequency: Frequency;
  nDays: number;
  firstDate: string; // YYYY-MM-DD
  totalGross: number;
  totalFees: number;
}) {
  const { installments, frequency, nDays, firstDate, totalGross, totalFees } = params;
  if (installments < 2) return null;
  
  const grossArr = splitRounded(totalGross, installments);
  const feesArr = splitRounded(totalFees, installments);

  const items = Array.from({ length: installments }).map((_, i) => {
    const index = i + 1;
    const dueDate = i === 0 ? firstDate : addFreq(firstDate, frequency, nDays, i);
    const gross = grossArr[i];
    const fees = feesArr[i];
    const net = Number((gross - fees).toFixed(2));
    return { index, dueDate, gross, fees, net };
  });

  const finalTotalGross = Number(items.reduce((s, it) => s + it.gross, 0).toFixed(2));
  const finalTotalFees = Number(items.reduce((s, it) => s + it.fees, 0).toFixed(2));
  const totalNet = Number(items.reduce((s, it) => s + it.net, 0).toFixed(2));

  return { items, totalGross: finalTotalGross, totalFees: finalTotalFees, totalNet };
}

// --- Component ---
type Props = { 
  open: boolean; 
  onClose: () => void; 
  onSaved: () => void;
  movementToEdit: UIMovement | null;
  initialKind?: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
  prefilledAccountId?: string;
};


export default function NewMovementModal({ open, onClose, onSaved, movementToEdit, initialKind, prefilledAccountId }: Props) {
  const { state, dispatch, generateId } = useData();
  const isEditing = !!movementToEdit;

  const [kind, setKind] = React.useState<MovementKind>((initialKind || MovementKind.DESPESA) as MovementKind);
  const [description, setDescription] = React.useState('');
  const [accountId, setAccountId] = React.useState('');
  const [counterAccountId, setCounterAccountId] = React.useState('');
  const [categoryId, setCategoryId] = React.useState('');
  const [amountGross, setAmountGross] = React.useState<number>(0);
  const [fees, setFees] = React.useState<number>(0);
  const [interest, setInterest] = React.useState<number>(0);
  const [saving, setSaving] = React.useState(false);
  
  // Sale-specific fields
  const [productValue, setProductValue] = React.useState(0);
  const [freight, setFreight] = React.useState(0);

  // Installment State
  const [isInstallment, setIsInstallment] = React.useState(false);
  const [installments, setInstallments] = React.useState(2);
  const [freq, setFreq] = React.useState<Frequency>('MENSAL');
  const [nDays, setNDays] = React.useState(30);
  const [dueDate, setDueDate] = React.useState<string>(new Date().toISOString().slice(0,10));
  const [firstDate, setFirstDate] = React.useState(dueDate);
  const [modeValue, setModeValue] = React.useState<'TOTAL' | 'PORPARCELA'>('TOTAL');
  const [valuePerInstallment, setValuePerInstallment] = React.useState<number>(0);

  // Recurrence State
  const [isRecurrence, setIsRecurrence] = React.useState(false);
  const [recurrences, setRecurrences] = React.useState(2);

  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = React.useState(false);
  const selectedCategory = React.useMemo(() => state.categories.find(c => c.id === categoryId), [state.categories, categoryId]);

  const isSaleMovement = React.useMemo(() => {
    if (!movementToEdit) return false;
    const originalMovement = state.movements.find(m => m.id === movementToEdit.id);
    return originalMovement?.origin === MovementOrigin.Venda;
  }, [movementToEdit, state.movements]);

  const sale = React.useMemo(() => {
      if (!isSaleMovement || !movementToEdit?.referenceId) return null;
      return state.sales.find(s => s.id === movementToEdit.referenceId);
  }, [isSaleMovement, movementToEdit, state.sales]);
  
  React.useEffect(() => {
    if (isSaleMovement) {
        setAmountGross(Number((productValue + freight).toFixed(2)));
    }
  }, [isSaleMovement, productValue, freight]);


  const amountNet = Math.max(0, Number((amountGross - (fees||0) + (interest || 0)).toFixed(2)));
  const totalGrossForInstallment = modeValue === 'TOTAL' ? amountGross : valuePerInstallment * installments;

  const installmentPreview = useMemo(() => {
    if (!isInstallment) return null;
    return generateInstallments({
      installments, frequency: freq, nDays, firstDate, totalGross: totalGrossForInstallment, totalFees: fees,
    });
  }, [isInstallment, installments, freq, nDays, firstDate, totalGrossForInstallment, fees]);

  const recurrencePreview = useMemo(() => {
    if (!isRecurrence || recurrences < 2) return null;

    const items = Array.from({ length: recurrences }).map((_, i) => {
        const index = i + 1;
        const dueDateRecurrence = format(addMonths(new Date(dueDate + 'T00:00:00Z'), i), 'yyyy-MM-dd');
        return { index, dueDate: dueDateRecurrence, amount: amountNet };
    });

    return { items };
  }, [isRecurrence, recurrences, dueDate, amountNet]);

  const accounts = state.accounts.filter(a => a.type !== 'Investimento');
  const partnerAccounts = state.partnerAccounts;

  React.useEffect(() => {
    if (open) {
      const originalMov = isEditing ? state.movements.find(m => m.id === movementToEdit.id) : null;
      const mov = toUIMovement(originalMov || {} as Movement, state);
      
      setKind((initialKind || (mov?.kind as MovementKind) || 'DESPESA') as MovementKind);
      setDescription(mov?.description || '');
      setAccountId(prefilledAccountId || mov?.accountId || '');
      setCounterAccountId(mov?.counterAccountId || '');
      setCategoryId(mov?.categoryId || '');
      setAmountGross(mov?.amountGross || 0);
      setFees(mov?.fees || 0);
      setInterest(originalMov?.interest || 0);
      const effectiveDueDate = mov?.dueDate || new Date().toISOString().slice(0, 10);
      setDueDate(effectiveDueDate);
      setFirstDate(effectiveDueDate);
      setIsInstallment(false);
      setIsRecurrence(false);
      
      if (isSaleMovement && sale) {
          setFreight(sale.freight);
          setProductValue(sale.unitPrice * sale.quantity);
      }
    }
  }, [open, movementToEdit, initialKind, prefilledAccountId, isSaleMovement, sale, state, isEditing]);
  
  React.useEffect(() => { setFirstDate(dueDate); }, [dueDate]);


  const canSave = description && accountId && (kind!=='TRANSFERENCIA' || counterAccountId) && amountGross>=0 && dueDate && (!isInstallment || (installments >= 2 && totalGrossForInstallment > 0)) && (!isRecurrence || recurrences >= 2);

  async function save() {
    if (!canSave || saving) return;

    setSaving(true);
    try {
        const getOrigin = (k: MovementKind): MovementOrigin => {
            switch(k) {
                case MovementKind.RECEITA: return MovementOrigin.ReceitaAvulsa;
                case MovementKind.DESPESA: return MovementOrigin.Despesa;
                case MovementKind.TRANSFERENCIA: return MovementOrigin.Transferencia;
                default: return MovementOrigin.Outro;
            }
        }
        
        if (isInstallment && !isEditing) {
            const plan = installmentPreview;
            if (!plan) throw new Error("Plano de parcelamento inválido.");

            const groupId = generateId();
            const payloads: Movement[] = plan.items.map(it => ({
                id: generateId(),
                kind, 
                status: MovementStatus.EmAberto,
                origin: getOrigin(kind),
                accountId,
                categoryId: kind !== 'TRANSFERENCIA' ? categoryId : undefined,
                description: `${description} (${it.index}/${installments})`,
                dueDate: it.dueDate,
                amountGross: it.gross,
                fees: it.fees,
                amountNet: it.net,
                installmentNumber: it.index,
                totalInstallments: installments,
                groupId,
            }));
            dispatch({ type: 'ADD_MULTIPLE_ITEMS', payload: { items: payloads, collection: 'movements' } });
        } else {
            const existingMovement = isEditing ? state.movements.find(m => m.id === movementToEdit.id) : null;
            
            const payload: Movement = {
                id: isEditing && movementToEdit ? movementToEdit.id : generateId(),
                kind,
                origin: existingMovement?.origin || getOrigin(kind),
                description,
                accountId,
                status: existingMovement?.status || MovementStatus.EmAberto,
                destinationAccountId: kind === 'TRANSFERENCIA' ? counterAccountId : undefined,
                categoryId: kind !== 'TRANSFERENCIA' ? categoryId : undefined,
                amountGross, fees, interest, amountNet, dueDate,
                referenceId: existingMovement?.referenceId
            };
            
             if (isSaleMovement) {
                (payload as any)._updatedSaleData = {
                    freight: freight,
                    productValue: productValue,
                };
            }

            if (isEditing) {
                dispatch({ type: 'UPDATE_ITEM', payload: { item: payload, collection: 'movements' } });
            } else {
                dispatch({ type: 'ADD_ITEM', payload: { item: payload, collection: 'movements' } });
            }
        }
        onSaved();
        onClose();
    } catch(e) {
      alert('Erro ao salvar.');
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <ModalShell
        title={isEditing ? 'Editar Transação' : 'Nova Transação'}
        footer={
            <>
                <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                <Button variant="primary" onClick={save} disabled={!canSave || saving}>
                    {saving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Salvar')}
                </Button>
            </>
        }
    >
          <Section title="Informações Básicas">
            <div className="grid grid-cols-12 gap-3">
                <div className="col-span-12 md:col-span-4">
                    <Field label="Tipo *">
                        <Select value={kind} onChange={(e) => setKind(e.target.value as MovementKind)}>
                            <option value={MovementKind.DESPESA}>Pagar</option>
                            <option value={MovementKind.RECEITA}>Receber</option>
                            <option value={MovementKind.TRANSFERENCIA}>Transferência</option>
                        </Select>
                    </Field>
                </div>
                <div className="col-span-12 md:col-span-4">
                    <Field label="Vencimento *"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required /></Field>
                </div>
                <div className="col-span-12">
                    <Field label="Descrição"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descreva o movimento..." /></Field>
                </div>
                {kind !== 'TRANSFERENCIA' && (
                    <div className="col-span-12 md:col-span-6">
                        <Field label="Categoria">
                            <div className="flex gap-2">
                                <Input
                                    value={selectedCategory?.name || ''}
                                    readOnly
                                    placeholder="Selecione uma categoria"
                                    onClick={() => setIsCategoryPickerOpen(true)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsCategoryPickerOpen(true)}
                                    className="shrink-0 rounded-xl border border-white/10 px-3 h-10 text-sm text-gray-200 hover:bg-white/5"
                                >
                                    Pesquisar
                                </button>
                            </div>
                        </Field>
                    </div>
                )}
            </div>
          </Section>

          <Section title="Conta & Valores">
              <div className="grid grid-cols-12 gap-3">
                  <div className={kind === 'TRANSFERENCIA' ? "col-span-12 md:col-span-6" : "col-span-12"}>
                      <Field label={kind === 'TRANSFERENCIA' ? 'Conta de Origem *' : 'Conta *'}>
                           <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                              <option value="">Selecione a conta</option>
                              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </Select>
                      </Field>
                  </div>
                   {kind === 'TRANSFERENCIA' && (
                       <div className="col-span-12 md:col-span-6">
                          <Field label="Conta de Destino *">
                              <Select value={counterAccountId} onChange={(e)=>setCounterAccountId(e.target.value)}>
                                  <option value="">Selecione a conta</option>
                                  <optgroup label="Contas da Empresa">
                                      {accounts.filter(a => a.id !== accountId).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                  </optgroup>
                                  <optgroup label="Contas de Sócio">
                                      {partnerAccounts.map(pa => <option key={pa.id} value={`partner:${pa.id}`}>{pa.name}</option>)}
                                  </optgroup>
                              </Select>
                          </Field>
                      </div>
                   )}
                   
                    {isSaleMovement ? (
                        <>
                            <div className="col-span-12 md:col-span-3">
                                <Field label="Valor do produto *"><Input type="number" step="0.01" value={productValue} onChange={e => setProductValue(Number(e.target.value))} required /></Field>
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <Field label="Frete"><Input type="number" step="0.01" value={freight} onChange={e => setFreight(Number(e.target.value))} /></Field>
                            </div>
                             <div className="col-span-12 md:col-span-3">
                                <Field label="Taxas"><Input type="number" step="0.01" value={fees} onChange={e => setFees(Number(e.target.value))} /></Field>
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <Field label="Juros"><Input type="number" step="0.01" value={interest} onChange={e => setInterest(Number(e.target.value))} /></Field>
                            </div>
                            <div className="col-span-12">
                                <Field label="Valor Líquido">
                                    <Input type="text" value={brl.format(productValue + freight - fees + interest)} readOnly className="!bg-slate-800/50" />
                                </Field>
                            </div>
                        </>
                    ) : (
                        <div className="col-span-12 grid grid-cols-4 gap-3">
                            <div><Field label="Valor bruto *"><Input type="number" step="0.01" value={amountGross} onChange={e => setAmountGross(Number(e.target.value))} required /></Field></div>
                            <div><Field label="Taxas"><Input type="number" step="0.01" value={fees} onChange={e => setFees(Number(e.target.value))} /></Field></div>
                            <div><Field label="Juros"><Input type="number" step="0.01" value={interest} onChange={e => setInterest(Number(e.target.value))} /></Field></div>
                            <div><Field label="Valor Líquido"><Input type="text" value={brl.format(amountNet)} readOnly className="!bg-slate-800/50" /></Field></div>
                        </div>
                    )}
              </div>
          </Section>

          {kind === MovementKind.DESPESA && !isEditing && (
            <Section title="Recorrência">
                <div className="flex items-center gap-3">
                    <Checkbox checked={isRecurrence} onChange={(e) => setIsRecurrence(e.target.checked)} disabled={isInstallment} />
                    <span className="text-sm text-gray-200">É um movimento recorrente?</span>
                </div>
                {isRecurrence && (
                    <div className="grid grid-cols-12 gap-3 mt-3">
                        <div className="col-span-6 md:col-span-3">
                            <Field label="Qtd. de meses"><Input type="number" value={recurrences} onChange={(e) => setRecurrences(Number(e.target.value || 0))} min="2" /></Field>
                        </div>
                         {recurrencePreview && (
                            <div className="col-span-12 border border-slate-700 rounded-xl bg-slate-800/50 p-3 mt-2">
                                <div className="text-sm text-slate-400 mb-2">Serão criadas {recurrences} recorrências mensais</div>
                                <table className="w-full text-sm">
                                    <thead><tr className="text-slate-400"><th className="text-left py-1">#</th><th className="text-left py-1">Venc.</th><th className="text-right py-1">Valor</th></tr></thead>
                                    <tbody className="text-slate-200">{recurrencePreview.items.map((p, idx) => (
                                        <tr key={idx}><td>{p.index}/{recurrences}</td><td>{format(new Date(p.dueDate + 'T00:00:00Z'), 'dd/MM/yy')}</td><td className="text-right">{brl.format(p.amount)}</td></tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </Section>
          )}

          {kind !== 'TRANSFERENCIA' && !isEditing && (
            <Section title="Parcelamento">
                <div className="flex items-center gap-3">
                    <Checkbox checked={isInstallment} onChange={(e) => setIsInstallment(e.target.checked)} disabled={isRecurrence} />
                    <span className="text-sm text-gray-200">Parcelado?</span>
                </div>
                {isInstallment && (
                    <div className="grid grid-cols-12 gap-3 mt-3">
                        <div className="col-span-6 md:col-span-3">
                            <Field label="Qtd. parcelas"><Input type="number" value={installments} onChange={(e) => setInstallments(Number(e.target.value || 0))} /></Field>
                        </div>
                        <div className="col-span-6 md:col-span-3">
                            <Field label="Valor/parcela"><Input type="number" step="0.01" value={valuePerInstallment} onChange={(e) => setValuePerInstallment(Number(e.target.value || 0))} /></Field>
                        </div>
                         {installmentPreview && (
                            <div className="col-span-12 border border-slate-700 rounded-xl bg-slate-800/50 p-3 mt-2">
                                <div className="text-sm text-slate-400 mb-2">Serão criadas {installments} parcelas</div>
                                <table className="w-full text-sm">
                                    <thead><tr className="text-slate-400"><th className="text-left py-1">#</th><th className="text-left py-1">Venc.</th><th className="text-right py-1">Bruto</th><th className="text-right py-1">Taxas</th><th className="text-right py-1">Líquido</th></tr></thead>
                                    <tbody className="text-slate-200">{installmentPreview.items.map((p, idx) => (
                                        <tr key={idx}><td>{p.index}/{installments}</td><td>{format(new Date(p.dueDate + 'T00:00:00Z'), 'dd/MM/yy')}</td><td className="text-right">{brl.format(p.gross)}</td><td className="text-right">{brl.format(p.fees)}</td><td className="text-right">{brl.format(p.net)}</td></tr>
                                    ))}</tbody>
                                </table>
                                <div className="mt-2 text-right text-xs text-slate-400">Total: {brl.format(installmentPreview.totalNet)}</div>
                            </div>
                        )}
                    </div>
                )}
            </Section>
          )}

        {isCategoryPickerOpen && (
            <CategoryPicker
                isOpen={isCategoryPickerOpen}
                onClose={() => setIsCategoryPickerOpen(false)}
                onSelect={(category) => {
                    setCategoryId(category.id);
                    setIsCategoryPickerOpen(false);
                }}
                categoryType={kind === 'RECEITA' ? CategoryType.Receita : CategoryType.Despesa}
            />
        )}
    </ModalShell>
  );
}