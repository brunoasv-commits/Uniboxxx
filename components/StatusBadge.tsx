import React from 'react';

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
    ${active 
      ? 'bg-[var(--ok)]/15 text-[var(--ok)]' 
      : 'bg-gray-600/30 text-gray-300'
    }`}>
    {active ? 'Ativo' : 'Inativo'}
  </span>
);

export default StatusBadge;
