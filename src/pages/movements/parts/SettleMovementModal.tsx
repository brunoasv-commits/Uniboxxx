import React, { useState, useEffect, useMemo } from "react";
import { movementsApi } from "../../../services/movements";
import { useData } from "../../../../contexts/DataContext";
import Button from "../../../../components/ui/Button";
import { MovementOrigin, MovementStatus } from "../../../../types";
import { Field, Input } from "../../../components/form/Field";

type Props = {
  open: boolean;
  onClose: () => void;
  movementId: string;
  defaultPaidDate: string; // yyyy-mm-dd
};

export default function SettleMovementModal({ open, onClose, movementId, defaultPaidDate }: Props) {
  const { state, dispatch } = useData();
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(defaultPaidDate);
  const [loading, setLoading] = useState(false);

  // State for editable sale fields
  const [productValue, setProductValue] = useState(0);
  const [freight, setFreight] = useState(0);
  const [fees, setFees] = useState(0);
  const [interest, setInterest] = useState(0);

  const { movement, sale } = useMemo(() => {
    if (!movementId) return { movement: null, sale: null };
    const mov = state.movements.find(m => m.id === movementId);
    if (!mov) return { movement: null, sale: null };

    const category = state.categories.find(c => c.id === mov.categoryId)?.name || 'N/A';
    const account = state.accounts.find(a => a.id === mov.accountId)?.name || 'N/A';
    
    const associatedSale = (mov.origin === MovementOrigin.Venda && mov.referenceId)
      ? state.sales.find(s => s.id === mov.referenceId)
      : null;

    return { 
        movement: { ...mov, categoryName: category, accountName: account },
        sale: associatedSale || null,
    };
  }, [movementId, state]);

  useEffect(() => {
    if (open) {
        setDate(defaultPaidDate);
        setFile(null);
        if (movement) {
            setFees(movement.fees || 0);
            setInterest(movement.interest || 0);
            if (sale) {
                setProductValue(sale.unitPrice * sale.quantity);
                setFreight(sale.freight);
            }
        }
    }
  }, [open, movement, sale, defaultPaidDate]);
  
  if (!open || !movement) return null;

  const isSale = !!sale;
  const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  const currentAmountGross = isSale ? (productValue + freight) : movement.amountGross;
  const currentAmountNet = currentAmountGross - fees + interest;

  const handleSettle = async () => {
    setLoading(true);
    try {
      const res = await movementsApi.settle(movementId, { file, paidDate: date });
      const originalMovement = state.movements.find(m => m.id === movementId);
      if (!originalMovement) throw new Error("Movement not found");

      let finalPayload: any = {
          ...originalMovement,
          status: MovementStatus.Baixado,
          paidDate: date,
          attachmentUrl: res.attachmentUrl || originalMovement.attachmentUrl,
          fees: fees,
          interest: interest,
      };

      if (isSale) {
          const newAmountGross = productValue + freight;
          finalPayload = {
              ...finalPayload,
              amountGross: newAmountGross,
              // Special property to trigger sale sync in the reducer
              _updatedSaleData: {
                  productValue: productValue,
                  freight: freight,
              }
          };
      }

      dispatch({ type: 'UPDATE_ITEM', payload: { item: finalPayload, collection: 'movements' } });
      onClose();
    } catch (error) {
        console.error("Failed to settle movement", error);
        alert("Falha ao baixar movimento.");
    } finally {
      setLoading(false);
    }
  };

  const Detail: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div>
        <dt className="text-xs text-slate-400">{label}</dt>
        <dd className="text-sm text-slate-200">{value}</dd>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-4">
        <h3 className="text-lg font-semibold text-slate-100">Confirmar baixa</h3>
        
        <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
           {isSale ? (
               <>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                      <Detail label="Descrição" value={movement.description} />
                      <Detail label="Valor Líquido" value={<span className={movement.kind === 'DESPESA' ? 'text-red-400' : 'text-emerald-400'}>{brl(currentAmountNet)}</span>} />
                      <Detail label="Conta" value={movement.accountName} />
                      <Detail label="Categoria" value={movement.categoryName} />
                  </dl>
                  <div className="grid grid-cols-4 gap-3 pt-3 border-t border-slate-700">
                      <Field label="Valor Produto"><Input type="number" step="0.01" value={productValue} onChange={e => setProductValue(Number(e.target.value))} /></Field>
                      <Field label="Frete"><Input type="number" step="0.01" value={freight} onChange={e => setFreight(Number(e.target.value))} /></Field>
                      <Field label="Taxas"><Input type="number" step="0.01" value={fees} onChange={e => setFees(Number(e.target.value))} /></Field>
                      <Field label="Juros"><Input type="number" step="0.01" value={interest} onChange={e => setInterest(Number(e.target.value))} /></Field>
                  </div>
              </>
           ) : (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <Detail label="Descrição" value={movement.description} />
                    <Detail label="Valor" value={<span className={movement.kind === 'DESPESA' ? 'text-red-400' : 'text-emerald-400'}>{brl(movement.amountNet)}</span>} />
                    <Detail label="Conta" value={movement.accountName} />
                    <Detail label="Categoria" value={movement.categoryName} />
                </dl>
           )}
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs text-slate-400">Data de pagamento</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
                   className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-200"/>
          </div>

          <div>
            <label className="text-xs text-slate-400">Anexo (opcional)</label>
            <input type="file" accept="image/*,application/pdf"
                   onChange={e=>setFile(e.target.files?.[0] ?? null)}
                   className="mt-1 w-full text-sm text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"/>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
          <button
            disabled={loading}
            className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
            onClick={handleSettle}
          >
            {loading ? 'Baixando...' : 'Confirmar baixa'}
          </button>
        </div>
      </div>
    </div>
  );
}