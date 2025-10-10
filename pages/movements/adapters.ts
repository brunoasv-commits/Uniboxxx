// Funções utilitárias e adapter para normalizar movimentos vindos da API

export type RawMovement = any;

export type UIMovement = {
  id: string;
  description: string;
  kind: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA' | string;
  status: 'PENDENTE' | 'BAIXADO' | 'CANCELADO' | string;
  dueDate: string | null;
  paidDate?: string | null;
  accountName: string;
  categoryName: string;
  contactName: string;
  gross: number;
  fees: number;
  net: number;
};

const toNumber = (v: unknown): number => {
  const n = Number(v);
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return Math.max(0, Number(n.toFixed(2)));
};
const uc = (s: unknown) => String(s ?? '').toUpperCase();

export function normalizeMovement(m: RawMovement): UIMovement {
  const gross = toNumber(m?.amountGross ?? m?.amount ?? 0);
  const fees  = toNumber(m?.fees ?? 0);
  const net   = toNumber(m?.amountNet ?? (gross - fees));

  return {
    id: String(m?.id ?? cryptoRandomId()),
    description: String(m?.description ?? m?.descricao ?? ''),
    kind: uc(m?.kind ?? m?.tipo),
    status: uc(m?.status ?? 'PENDENTE'),
    dueDate: (m?.dueDate ?? m?.vencimento ?? m?.date ?? null) as string | null,
    paidDate: (m?.paidDate ?? null) as string | null,
    accountName: m?.account?.name ?? m?.conta?.name ?? '—',
    categoryName: m?.category?.name ?? m?.categoria?.name ?? '—',
    contactName: m?.contact?.name ?? m?.contato?.name ?? '—',
    gross,
    fees,
    net,
  };
}

function cryptoRandomId() {
  // fallback simples caso não venha id
  return 'tmp_' + Math.random().toString(36).slice(2);
}
