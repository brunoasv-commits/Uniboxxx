
export type MovementKind = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
export type MovementStatus = 'PENDENTE' | 'BAIXADO' | 'CANCELADO' | 'VENCIDO';

export type Movement = {
  id: string;
  referenceId?: string;
  description: string;
  kind: MovementKind;
  status: MovementStatus;
  dueDate: string;        // YYYY-MM-DD
  paidDate?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  counterAccountId?: string | null;
  counterAccountName?: string | null;
  amountGross: number;
  fees: number;
  amountNet: number;
  installmentNumber?: number;
  totalInstallments?: number;
  groupId?: string;
};

export type Totals = {
  inflow: number;
  outflow: number;
  net: number;
  pendingToday: number;
  projectedBalance: number;
};

export type MovementsResponse = {
  items: Movement[];
  total: number;
  totals: Totals;
};

export type Filters = {
  tab: 'lista' | 'calendario' | 'fluxo' | 'conciliacao';
  chip: 'TODOS' | 'RECEBER' | 'PAGAR';
  dateFrom?: string;
  dateTo?: string;
  includeSettled: boolean;
  query: string;
  groupBy: 'none' | 'category' | 'account' | 'contact' | 'date';
  density: 'comfortable' | 'compact';
  transfer?: boolean;
  status?: 'ALL' | 'PENDENTE' | 'VENCIDO' | 'BAIXADO';
  kind?: 'ALL' | MovementKind;
};