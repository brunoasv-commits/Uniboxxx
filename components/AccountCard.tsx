import React from 'react';
import { Account, AccountType } from '../types';
import { formatBRL } from '../utils/money';
import { Landmark, Wallet, CreditCard, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import Tip from './Tip';

type Props = {
  account: Account & { balance: number; lastMovementAt?: string };
  onTransfer?: (account: Account) => void;
  onAdjust?: (account: Account) => void;
  onStatement?: (account: Account) => void;
  onEdit?: (account: Account) => void;
  onDelete?: (account: Account) => void;
  isDeletable: boolean;
};

const typeIconMap: Record<AccountType, React.ReactNode> = {
  [AccountType.Banco]: <Landmark className="w-5 h-5" />,
  [AccountType.Caixa]: <Wallet className="w-5 h-5" />,
  [AccountType.Cartao]: <CreditCard className="w-5 h-5" />,
  [AccountType.Investimento]: <TrendingUp className="w-5 h-5" />,
};

const typeColorMap: Record<AccountType, string> = {
    [AccountType.Banco]: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20",
    [AccountType.Caixa]: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/20",
    [AccountType.Cartao]: "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20",
    [AccountType.Investimento]: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20",
};


const AccountCard: React.FC<Props> = ({ account, onTransfer, onAdjust, onStatement, onEdit, onDelete, isDeletable }) => {
  const isCreditCard = account.type === AccountType.Cartao;
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 hover:bg-gray-900 shadow-sm hover:shadow-lg transition-shadow p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-300">
            {typeIconMap[account.type]}
          </div>
          <div>
            <div className="font-semibold text-gray-100 leading-tight">{account.name}</div>
            <div className={`mt-1 inline-flex items-center gap-2 text-xs px-2 py-0.5 rounded-full ${typeColorMap[account.type]}`}>
                {account.type}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0" onClick={() => onEdit?.(account)} aria-label="Editar conta">
              <Pencil className="w-4 h-4" />
          </Button>
          <Tip label={isDeletable ? 'Excluir' : 'Conta em uso'}>
            <div>
              <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 flex-shrink-0 text-rose-400 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:text-gray-600"
                  onClick={() => onDelete?.(account)}
                  disabled={!isDeletable}
                  aria-label="Excluir conta"
              >
                  <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Tip>
        </div>
      </div>

      {/* Body */}
      <div>
        <div className="text-sm text-gray-400">{isCreditCard ? 'Limite' : 'Saldo'}</div>
        <div className="text-2xl font-bold text-gray-100">{formatBRL(isCreditCard ? (account.cardLimit ?? 0) : account.balance)}</div>
        {account.lastMovementAt && !isCreditCard && (
          <div className="text-xs text-gray-500 mt-1">
            Último movimento: {new Date(account.lastMovementAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex items-center gap-2 flex-wrap">
        <Button
          onClick={() => onTransfer?.(account)}
          variant="ghost"
          size="sm"
        >
          Transferir
        </Button>
        <Button
          onClick={() => onAdjust?.(account)}
          variant="ghost"
          size="sm"
        >
          Entrada/Ajuste
        </Button>
        <Button
          onClick={() => onStatement?.(account)}
          variant="secondary"
          size="sm"
          className="ml-auto"
        >
          Extrato
        </Button>
      </div>
    </div>
  )
}

export default AccountCard;