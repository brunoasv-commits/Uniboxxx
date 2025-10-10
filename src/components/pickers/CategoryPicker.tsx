
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Category, CategoryType } from '../../../types';
import CategoryFormModal from '../../../components/CategoryFormModal';
import Button from '../../../components/ui/Button';
import { Plus } from 'lucide-react';
import { useDebounced } from '../../hooks/useDebounced';

interface CategoryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
  categoryType: CategoryType;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({ isOpen, onClose, onSelect, categoryType }) => {
  const { state } = useData();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 300);
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const filteredCategories = useMemo(() => {
    return state.categories.filter(c => 
      c.type === categoryType && 
      c.name.toLowerCase().includes(debounced.toLowerCase())
    );
  }, [state.categories, categoryType, debounced]);
  
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSelect = (category: Category) => {
    onSelect(category);
  };
  
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, filteredCategories.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    if (e.key === "Enter") { const pick = filteredCategories[highlight]; if (pick) onSelect(pick); }
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
    <>
      <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="category-picker-title">
        <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div>
              <h2 id="category-picker-title" className="text-lg font-semibold text-gray-100">{`Selecionar Categoria de ${categoryType}`}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200">✕</button>
          </div>
          
          {/* Controls */}
          <div className="px-5 pt-4 pb-2 flex items-center gap-3">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Buscar categoria..."
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              autoFocus
            />
            <Button variant="secondary" onClick={() => setIsNewCategoryModalOpen(true)}>
              <Plus size={16} className="mr-2" /> Nova
            </Button>
          </div>

          {/* Table */}
          <div className="px-5 pb-2">
            <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-800/50 text-gray-300">
                  <tr>
                    <th className="text-left px-3 py-2 w-12"></th>
                    <th className="text-left px-3 py-2">Nome</th>
                  </tr>
                </thead>
                <tbody onKeyDown={handleKey}>
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((category, i) => (
                      <tr
                        key={category.id}
                        className={`cursor-pointer ${i === highlight ? "bg-blue-900/30" : "hover:bg-gray-800/50"}`}
                        onClick={() => handleSelect(category)}
                      >
                        <td className="px-3 py-2 text-center">
                            <input
                                type="radio"
                                name="category-picker-selection"
                                readOnly
                                checked={i === highlight}
                                className="h-4 w-4 accent-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600 ring-offset-gray-900"
                            />
                        </td>
                        <td className="px-3 py-2 text-gray-100">
                            <div className="flex items-center gap-3">
                                <span 
                                  className="h-2 w-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: category.color || (category.type === "Despesa" ? "#f43f5e" : "#10b981") }}
                                />
                                <span>{highlightText(category.name)}</span>
                            </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={2} className="px-3 py-6 text-center text-gray-500">Nenhuma categoria encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-end px-5 py-4 border-t border-gray-800 gap-2">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={() => { const pick = filteredCategories[highlight]; if (pick) handleSelect(pick); }}
              >
                Selecionar
              </Button>
          </div>
        </div>
      </div>

      {isNewCategoryModalOpen && (
        <CategoryFormModal 
          isOpen={isNewCategoryModalOpen}
          onClose={() => setIsNewCategoryModalOpen(false)}
          category={{ type: categoryType }}
        />
      )}
    </>
  );
};

export default CategoryPicker;