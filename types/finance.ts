// types/finance.ts
export type MovementKind = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
export type MovementStatus = 'PENDENTE' | 'BAIXADO' | 'CANCELADO';

export interface Movement {
  id: string;
  description: string;
  kind: MovementKind;
  status: MovementStatus;
  dueDate: string;      // YYYY-MM-DD
  paidDate?: string;    // YYYY-MM-DD
  accountId: string;
  counterAccountId?: string;
  categoryId?: string;
  contactId?: string;
  amountGross: number;  // sempre positivo
  fees?: number;        // sempre positivo
  amountNet: number;    // sempre positivo
  createdAt: string;
  updatedAt: string;
}

export interface MovementsQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  kind?: MovementKind[];
  status?: MovementStatus[];
  accountId?: string[];
  categoryId?: string[];
  dateFrom?: string;
  dateTo?: string;
  withTotals?: 0 | 1;
}
