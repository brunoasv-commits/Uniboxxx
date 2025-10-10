
import { useEffect, useMemo, useState, useCallback } from 'react';
import SummaryCards from '../components/movements/SummaryCards';
import FiltersBar from '../components/movements/FiltersBar';
import MovementsTable from '../components/movements/MovementsTable';
import { toNumber } from '../utils/num';

type ApiTotals = { inflow: number; outflow: number; net: number; projectedBalance: number };
type Movement = {
  id: string; description: string;
  kind: 'RECEITA'|'DESPESA'|'TRANSFERENCIA';
  status: 'PENDENTE'|'BAIXADO'|'CANCELADO';
  dueDate: string; amountNet: number;
};

export default function MovementsPage() {
  const [filters, setFilters] = useState({
    tab: 'TODOS' as 'TODOS'|'RECEBER'|'PAGAR',
    includePaid: false, origin: 'Todas' as 'Todas'|'Receita'|'Despesa'|'Transferência',
    dateFrom: undefined as string|undefined,
    dateTo:   undefined as string|undefined,
    q: ''
  });

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Movement[]>([]);
  const [totals, setTotals] = useState<ApiTotals>({ inflow:0, outflow:0, net:0, projectedBalance:0 });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set('page','1'); p.set('pageSize','100'); p.set('withTotals','1');
    if (filters.q) p.set('q', filters.q);
    if (filters.dateFrom) p.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) p.set('dateTo', filters.dateTo);

    // origem e chips
    if (filters.tab === 'RECEBER') p.set('kind','RECEITA');
    if (filters.tab === 'PAGAR')   p.set('kind','DESPESA');
    if (filters.origin === 'Receita') p.set('kind','RECEITA');
    if (filters.origin === 'Despesa') p.set('kind','DESPESA');
    if (filters.origin === 'Transferência') p.set('kind','TRANSFERENCIA');

    if (!filters.includePaid) p.set('status','PENDENTE'); // só pendentes quando não marcado
    return p.toString();
  }, [filters]);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/movements?${query}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json(); 
      })
      .then((data) => {
        const items = (data && Array.isArray(data.items)) ? data.items : [];
        const totalsData = (data && typeof data.totals === 'object' && data.totals !== null) ? data.totals : {};
        
        setItems(items);
        setTotals({
          inflow: toNumber(totalsData.inflow),
          outflow: toNumber(totalsData.outflow),
          net: toNumber(totalsData.net),
          projectedBalance: toNumber(totalsData.projectedBalance),
        });
      })
      .catch(e => {
        console.error("Falha ao buscar ou processar movimentos:", e);
        setItems([]);
        setTotals({ inflow:0, outflow:0, net:0, projectedBalance:0 });
      })
      .finally(()=> setLoading(false));
  }, [query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function resetFilters() {
    setFilters({ tab:'TODOS', includePaid:false, origin:'Todas', dateFrom:undefined, dateTo:undefined, q:'' });
  }

  const handleBulkAction = useCallback(async (action: 'EXCLUIR' | 'BAIXAR', ids: string[]) => {
    try {
      const response = await fetch('/api/movements/bulk', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ action, ids }) 
      });

      if (!response.ok) {
        throw new Error(`Ação em massa falhou: ${response.statusText}`);
      }
      
      await response.text();

      fetchData();
    } catch (error) {
      console.error(`Falha ao executar a ação em massa ${action}:`, error);
    }
  }, [fetchData]);

  const onDelete = (ids: string[]) => handleBulkAction('EXCLUIR', ids);
  const onSettle = (ids: string[]) => handleBulkAction('BAIXAR', ids);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-200">Transações</h1>
        <a href="#novo" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-500">
          Nova Transação
        </a>
      </div>

      <SummaryCards
        inflow={totals.inflow} outflow={totals.outflow} net={totals.net}
        projectedBalance={totals.projectedBalance} loading={loading}
      />

      <FiltersBar
        value={filters}
        onChange={(v)=> setFilters(s => ({ ...s, ...v }))}
        onReset={resetFilters}
      />

      <MovementsTable
        items={items}
        loading={loading}
        onEdit={(id)=> console.log('edit', id)}
        onDelete={onDelete}
        onSettle={onSettle}
      />
    </div>
  );
}