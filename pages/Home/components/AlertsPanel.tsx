

import React from 'react';
import { Eye } from 'lucide-react';

export type Alert = {
  kind: 'payOverdue' | 'recvOverdue' | 'noStock' | 'cardPending';
  text: string;
  onClick?: () => void;
};

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const badge = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
  const tone: Record<Alert['kind'], string> = {
    payOverdue: "bg-rose-500/15 text-rose-400",
    recvOverdue: "bg-amber-500/15 text-amber-400",
    noStock: "bg-yellow-500/15 text-yellow-400",
    cardPending: "bg-sky-500/15 text-sky-400",
  };

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
      <div className="text-sm text-gray-200 font-medium mb-3">Alertas</div>
      <div className="flex flex-wrap gap-2">
        {alerts.length ? alerts.map((a, i) => (
          <div key={i} className={`${badge} ${tone[a.kind]} flex items-center gap-2`}>
            <span>{a.text}</span>
            {a.onClick && (
                <button onClick={a.onClick} className="hover:text-white transition-colors">
                    <Eye size={14} />
                </button>
            )}
          </div>
        )) : <div className="text-xs text-gray-500">Sem alertas no momento.</div>}
      </div>
    </div>
  );
}