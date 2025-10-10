
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDebounced } from "../../hooks/useDebounced";

type Product = {
  id: string;
  name: string;
  sku: string;
  price?: number;
  stock?: number;
  supplierName?: string;
  stockType?: string;
};

type ProductPickerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (p: Product) => void;
  fetchProducts: (q: string, page: number, pageSize: number) => Promise<{ items: Product[]; total: number }>;
  initialQuery?: string;
  allowCreateNew?: boolean;
  onCreateNewProduct?: () => void;
};

const pageSize = 10;

export default function ProductPicker({
  isOpen,
  onClose,
  onSelect,
  fetchProducts,
  initialQuery = "",
  allowCreateNew,
  onCreateNewProduct,
}: ProductPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const debounced = useDebounced(query, 300);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [showWithStock, setShowWithStock] = useState(true);
  const [showWithoutStock, setShowWithoutStock] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchProducts(debounced.trim(), page, pageSize);
        
        const filteredItems = (res.items || []).filter(item => {
            const hasStockControl = item.stockType === 'Estoque';
            const stockQuantity = item.stock ?? 0;

            const hasPositiveStock = hasStockControl && stockQuantity > 0;
            const hasNoStockOrNoControl = !hasStockControl || (hasStockControl && stockQuantity <= 0);
            
            if (showWithStock === showWithoutStock) return true;

            if (showWithStock) return hasPositiveStock;
            if (showWithoutStock) return hasNoStockOrNoControl;
            
            return false;
        });

        setRows(filteredItems);
        setTotal(filteredItems.length);
        setHighlight(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, debounced, page, showWithStock, showWithoutStock, fetchProducts]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, rows.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter") { const pick = rows[highlight]; if (pick) onSelect(pick); }
  };

  const highlightText = (text: string) => {
    const q = debounced.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-600/40 text-yellow-200 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="product-picker-title">
      <div className="w-full max-w-5xl rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 id="product-picker-title" className="text-lg font-semibold text-gray-100">Selecionar produto</h2>
            <p className="text-xs text-gray-400">Digite para pesquisar por nome ou SKU. ↑/↓ navega, Enter seleciona, ESC fecha.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
        </div>

        {/* Controls */}
        <div className="px-5 pt-4 pb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2 items-center w-full">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              onKeyDown={handleKey}
              placeholder="Buscar por nome ou SKU..."
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input type="checkbox" className="accent-blue-600" checked={showWithStock} onChange={e => setShowWithStock(e.target.checked)} />
              Com estoque
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-300">
              <input type="checkbox" className="accent-blue-600" checked={showWithoutStock} onChange={e => setShowWithoutStock(e.target.checked)} />
              Sem estoque
            </label>
          </div>
          {allowCreateNew && (
            <button
              onClick={onCreateNewProduct}
              className="shrink-0 rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:bg-gray-800"
            >
              + Adicionar novo produto
            </button>
          )}
        </div>

        {/* Table */}
        <div className="px-5 pb-2">
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50 text-gray-300">
                <tr>
                  <th className="text-left px-3 py-2 w-12"></th>
                  <th className="text-left px-3 py-2">Nome</th>
                  <th className="text-left px-3 py-2">SKU</th>
                  <th className="text-right px-3 py-2">Preço</th>
                  <th className="text-right px-3 py-2">Estoque</th>
                  <th className="text-left px-3 py-2">Fornecedor</th>
                </tr>
              </thead>
              <tbody onKeyDown={handleKey}>
                {loading && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Carregando…</td></tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">Nenhum produto encontrado.</td></tr>
                )}
                {!loading && rows.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`cursor-pointer ${i === highlight ? "bg-blue-900/30" : "hover:bg-gray-800/50"}`}
                    onClick={() => onSelect(p)}
                  >
                    <td className="px-3 py-2 text-center">
                        <input
                            type="radio"
                            name="product-picker-selection"
                            readOnly
                            checked={i === highlight}
                            className="h-4 w-4 accent-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 ring-offset-gray-900"
                        />
                    </td>
                    <td className="px-3 py-2 text-gray-100">
                      <div className="max-w-[380px] truncate md:whitespace-normal md:line-clamp-2">
                        {highlightText(p.name)}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-300">{highlightText(p.sku)}</td>
                    <td className="px-3 py-2 text-right text-gray-200">{p.price != null ? p.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</td>
                    <td className={`px-3 py-2 text-right ${((p.stock ?? 0) > 0) ? "text-emerald-400" : "text-gray-400"}`}>{p.stock ?? 'N/A'}</td>
                    <td className="px-3 py-2 text-gray-300">{p.supplierName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer / Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800">
          <div className="text-xs text-gray-400">Página <span className="text-gray-200">{page}</span> de <span className="text-gray-200">{pages}</span></div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-200 disabled:opacity-40 hover:bg-gray-800"
            >
              ⟨ Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-200 disabled:opacity-40 hover:bg-gray-800"
            >
              Próxima ⟩
            </button>
            <button
              onClick={onClose}
              className="rounded-md bg-gray-800 px-4 py-1.5 text-sm text-gray-200 hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={() => { const pick = rows[highlight]; if (pick) onSelect(pick); }}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500"
            >
              Selecionar
            </button>
          </div>
        </div>
      </div>
      {/* Teclado no container principal */}
      <div tabIndex={0} onKeyDown={handleKey} />
    </div>
  );
}