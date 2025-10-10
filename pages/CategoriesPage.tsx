import React, { useMemo, useState } from "react";
import { CategoryBoard } from "../components/CategoryBoard";
import { useData } from "../contexts/DataContext";
import { Category, CategoryType, ID } from "../types";
import CategoryFormModal from "../components/CategoryFormModal";
import Button from "../components/ui/Button";

export default function CategoriesPage() {
  const { state, dispatch, generateId } = useData();
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [query, setQuery] = useState("");
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category> | undefined>(undefined);

  const usageCounts = useMemo(() => {
    const counts: Record<ID, number> = {};
    state.categories.forEach(cat => counts[cat.id] = 0);
    state.products.forEach(p => { if(p.expenseCategoryId) counts[p.expenseCategoryId]++; });
    state.movements.forEach(m => { if(m.categoryId) counts[m.categoryId]++; });
    return counts;
  }, [state.products, state.movements, state.categories]);

  const itemsWithUsage: (Category & { usageCount: number})[] = useMemo(() => {
    return (state.categories || []).map(cat => ({
        ...cat,
        usageCount: usageCounts[cat.id] || 0
    }));
  }, [state.categories, usageCounts]);

  const handleMoveType = (id: string, to: CategoryType) => {
    const category = state.categories.find(c => c.id === id);
    if (category) {
        dispatch({ type: 'UPDATE_ITEM', payload: { item: { ...category, type: to }, collection: 'categories' }});
    }
  };

  const handleReorder = (reorderedColumn: (Category & { usageCount: number })[]) => {
      if (!reorderedColumn || reorderedColumn.length === 0) return;
      
      const columnType = reorderedColumn[0].type;
      const finalOrderedList: Category[] = [];
      const columnOrder: CategoryType[] = [CategoryType.Receita, CategoryType.Despesa];
      
      for(const type of columnOrder) {
          if (type === columnType) {
              finalOrderedList.push(...reorderedColumn);
          } else {
              finalOrderedList.push(...state.categories.filter(c => c.type === type));
          }
      }
      dispatch({ type: 'REPLACE_COLLECTION', payload: { collection: 'categories', items: finalOrderedList } });
  };
  
  const handleSave = (payload: { name: string; type: CategoryType; color?: string }) => {
    if (editing) {
        dispatch({ type: 'UPDATE_ITEM', payload: { item: { ...editing, ...payload }, collection: 'categories' } });
    } else {
        dispatch({ type: 'ADD_ITEM', payload: { item: { ...payload, id: generateId() }, collection: 'categories' }});
    }
    setModalOpen(false);
  };
  
  const openModal = (category?: Partial<Category>) => {
    setEditing(category);
    setModalOpen(true);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input className="rounded-full bg-white/5 border border-white/10 px-4 h-9 text-sm text-gray-200"
               placeholder="Buscar categoria…" value={query} onChange={(e)=>setQuery(e.target.value)} />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" active={density==='comfortable'} onClick={()=>setDensity('comfortable')}>Confortável</Button>
          <Button variant="ghost" size="sm" active={density==='compact'} onClick={()=>setDensity('compact')}>Compacto</Button>
          <Button variant="primary" onClick={() => openModal()}>Nova categoria</Button>
        </div>
      </div>

      <CategoryBoard
        items={itemsWithUsage}
        density={density}
        query={query}
        onEdit={openModal}
        onReorder={handleReorder}
        onMoveType={handleMoveType}
      />

      {modalOpen && (
        <CategoryFormModal
          isOpen={modalOpen}
          category={editing || null}
          onClose={()=>setModalOpen(false)}
        />
      )}
    </div>
  );
}