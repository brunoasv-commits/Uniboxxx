import React from 'react';
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo } from "react";
import { CategoryCard } from "./CategoryCard";
import { Category, CategoryType } from '../types';

export type CategoryWithUsage = Category & { usageCount: number };

type Props = {
  items: CategoryWithUsage[];
  onReorder: (ordered: CategoryWithUsage[]) => void;
  onMoveType: (id: string, to: CategoryType) => void;
  onEdit: (c: Partial<Category>) => void;
  density: "comfortable" | "compact";
  query: string;
};

const columns: { key: CategoryType; title: string; tone: string }[] = [
  { key: CategoryType.Receita,      title: "Receitas",      tone: "text-emerald-400" },
  { key: CategoryType.Despesa,      title: "Despesas",      tone: "text-rose-400" },
];

export function CategoryBoard({ items, onReorder, onMoveType, onEdit, density, query }: Props) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter(i => i.name.toLowerCase().includes(q)) : items;
  }, [items, query]);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeContainer = active.data.current?.sortable.containerId;
    const overContainer = over.data.current?.sortable.containerId;
    const catId = active.id as string;
    
    if (activeContainer !== overContainer) {
      onMoveType(catId, overContainer as CategoryType);
    } else {
      const itemsInColumn = items.filter(i => i.type === activeContainer);
      const oldIndex = itemsInColumn.findIndex(item => item.id === catId);
      const newIndex = itemsInColumn.findIndex(item => item.id === (over.id as string));
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(itemsInColumn, oldIndex, newIndex);
        onReorder(reordered);
      }
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 md:grid-cols-2">
        {columns.map(col => {
          const data = filtered.filter(i => i.type === col.key);
          return (
            <div key={col.key} className="rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <div className="text-sm font-medium text-gray-200">
                  {col.title} <span className={`ml-2 ${col.tone}`}>{data.length}</span>
                </div>
                <button className="text-xs text-gray-400 hover:text-gray-200" onClick={() => onEdit({type: col.key})}>
                  + Nova
                </button>
              </div>
              <SortableContext items={data.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <ul className="p-2 space-y-2 min-h-[80px]">
                  {data.length === 0 && (
                    <li className="text-xs text-gray-500 px-2 py-4">Sem categorias</li>
                  )}
                  {data.map(categoryItem => (
                    <CategoryCard
                      key={categoryItem.id}
                      category={categoryItem}
                      density={density}
                      onEdit={() => onEdit(categoryItem)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
