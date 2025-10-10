import React, { useEffect, useMemo, useState } from 'react';
import ErrorBoundary from '../../components/ErrorBoundary';
import MovementRow from './MovementRow';
import { normalizeMovement, UIMovement } from './adapters';
import { MovementsMockService } from '../../services/movements.mock';
import { MovementsQuery, MovementKind } from '../../types/finance';

export default function MovementsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<UIMovement[]>([]);
  const [error, setError] = useState<string | null>(null);

  // filtros (simples; ajuste conforme seu estado global)
  const [kind, setKind] = useState<string>('TODOS');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [includeSettled, setIncludeSettled] = useState<boolean>(false);

  useEffect(() => {
    const loadMovements = async () => {
      setLoading(true);
      setError(null);
      try {
        const query: MovementsQuery = { withTotals: 0 };
        if (kind !== 'TODOS') query.kind = [kind as MovementKind];
        if (dateFrom) query.dateFrom = dateFrom;
        if (dateTo) query.dateTo = dateTo;
        if (!includeSettled) {
            query.status = ['PENDENTE'];
        }

        const data = await MovementsMockService.list(query);
        const normalized = data.items.map(normalizeMovement);
        setRows(normalized);

      } catch (err: any) {
        console.error('Movements fetch error:', err);
        const msg = err?.message?.includes('File not found')
            ? 'A API de movimentos não está configurada (modo offline ativo).'
            : 'Falha ao obter movimentos.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    
    loadMovements();
  }, [kind, dateFrom, dateTo, includeSettled]);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-gray-200">Movimentos</h1>
        {/* Filtros (simplificados) */}
        <div className="flex flex-wrap gap-2 items-center p-3 rounded-lg bg-gray-800/50 border border-gray-700">
          <select className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100"
                  value={kind} onChange={e => setKind(e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="RECEITA">Receitas</option>
            <option value="DESPESA">Despesas</option>
            <option value="TRANSFERENCIA">Transferências</option>
          </select>

          <input type="date" className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100"
                 value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-gray-400 text-sm">até</span>
          <input type="date" className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-100"
                 value={dateTo} onChange={e => setDateTo(e.target.value)} />

          <label className="inline-flex items-center gap-2 text-sm text-gray-300 ml-auto">
            <input type="checkbox" checked={includeSettled} onChange={e => setIncludeSettled(e.target.checked)} />
            Incluir baixados
          </label>
        </div>

        {/* Erro amigável */}
        {error && (
          <div className="rounded border border-yellow-700 bg-yellow-900/30 text-yellow-100 p-3 text-sm">
            Houve um problema ao carregar os movimentos: {error}
          </div>
        )}

        {/* Tabela */}
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="min-w-full text-sm text-gray-200">
            <thead className="bg-gray-900/40 text-gray-400">
              <tr>
                <th className="px-3 py-2 text-left">Vencimento</th>
                <th className="px-3 py-2 text-left">Descrição</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Categoria</th>
                <th className="px-3 py-2 text-left">Conta</th>
                <th className="px-3 py-2 text-right">Valor Líquido</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                    Carregando movimentos…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && !error && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                    Nenhum movimento encontrado.
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.map(row => <MovementRow key={row.id} row={row} />)}
            </tbody>
          </table>
        </div>
      </div>
    </ErrorBoundary>
  );
}
