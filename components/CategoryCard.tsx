import React from 'react';
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Edit2, Archive, GitMerge } from "lucide-react";
import { CategoryType } from '../types';

export type CategoryWithUsage = { 
  id: string; 
  name: string; 
  type: CategoryType; 
  usageCount: number; 
  color?: string; 
};

type Props = {
    category: CategoryWithUsage;
    onEdit: () => void;
    density?: "comfortable" | "compact";
}

export const CategoryCard: React.FC<Props> = ({ category, onEdit, density = "comfortable" }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li ref={setNodeRef} style={style}
      className={`group flex items-center gap-3 rounded-xl border border-white/10 bg-gray-900/70 hover:bg-gray-900 px-3 ${density === "compact" ? "py-1.5" : "py-2.5"}`}
      {...listeners} {...attributes}
      onDoubleClick={onEdit}
    >
      <span className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color || (category.type === "Despesa" ? "#f43f5e" : category.type === "Receita" ? "#10b981" : "#38bdf8") }}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-gray-100">{category.name}</div>
        <div className="text-[11px] text-gray-500">
          Uso: <span className="text-gray-300">{category.usageCount}</span>
        </div>
      </div>
      <div className="hidden items-center gap-1 group-hover:flex">
        <button className="p-1.5 rounded-lg hover:bg-white/5" onClick={onEdit} title="Editar">
          <Edit2 size={14} />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-white/5" title="Mesclar">
          <GitMerge size={14} />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-white/5" title="Arquivar">
          <Archive size={14} />
        </button>
      </div>
    </li>
  );
}
