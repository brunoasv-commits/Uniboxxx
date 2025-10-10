// services/movements.mock.ts
import { getJSON, setJSON } from '../lib/storage';
import { Movement, MovementsQuery } from '../types/finance';

const KEY = 'movements';

function seedIfEmpty() {
  // Seeding disabled to start with a clean state.
}
seedIfEmpty();

type ListResponse = {
  items: Movement[];
  page: number;
  pageSize: number;
  total: number;
  totals?: { inflow: number; outflow: number; net: number; };
};

export const MovementsMockService = {
  async list(q: MovementsQuery): Promise<ListResponse> {
    const all = getJSON<Movement[]>(KEY, []);
    let items = [...all];

    // filtros básicos
    if (q.q) {
      const s = q.q.toLowerCase().trim();
      items = items.filter(m => m.description.toLowerCase().includes(s));
    }
    if (q.kind && q.kind.length) {
      items = items.filter(m => q.kind!.includes(m.kind));
    }
    if (q.status && q.status.length) {
      items = items.filter(m => q.status!.includes(m.status));
    }
    if (q.accountId && q.accountId.length) {
      items = items.filter(m => q.accountId!.includes(m.accountId));
    }
    if (q.dateFrom) {
      items = items.filter(m => m.dueDate >= q.dateFrom!);
    }
    if (q.dateTo) {
      items = items.filter(m => m.dueDate <= q.dateTo!);
    }

    // ordenação simples por dueDate desc
    items.sort((a,b) => b.dueDate.localeCompare(a.dueDate));

    // paginação
    const page = q.page || 1;
    const pageSize = q.pageSize || 50;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    const res: ListResponse = {
      items: paged,
      page,
      pageSize,
      total: items.length,
    };

    if (q.withTotals) {
      const inflow = items
        .filter(m => m.kind === 'RECEITA')
        .reduce((s, m) => s + m.amountNet, 0);
      const outflow = items
        .filter(m => m.kind === 'DESPESA')
        .reduce((s, m) => s + m.amountNet, 0);
      res.totals = { inflow, outflow, net: inflow - outflow };
    }

    // Simulate network delay
    await new Promise(res => setTimeout(res, 300));

    return Promise.resolve(res);
  },

  async create(m: Omit<Movement, 'id' | 'createdAt' | 'updatedAt'>) {
    const all = getJSON<Movement[]>(KEY, []);
    const now = new Date().toISOString();
    const row: Movement = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...m,
    };
    all.push(row);
    setJSON(KEY, all);
    return row;
  },

  async update(id: string, patch: Partial<Movement>) {
    const all = getJSON<Movement[]>(KEY, []);
    const i = all.findIndex(m => m.id === id);
    if (i === -1) throw new Error('Movement not found');
    all[i] = { ...all[i], ...patch, updatedAt: new Date().toISOString() };
    setJSON(KEY, all);
    return all[i];
  },

  async remove(id: string) {
    const all = getJSON<Movement[]>(KEY, []);
    const next = all.filter(m => m.id !== id);
    setJSON(KEY, next);
  }
};