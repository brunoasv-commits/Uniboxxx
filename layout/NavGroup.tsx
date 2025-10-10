import React from 'react';

export function NavGroup({ label, children, collapsed }:{
  label:string; children?:React.ReactNode; collapsed?:boolean;
}) {
  return (
    <div>
      {!collapsed && <div className="px-3 text-[11px] uppercase tracking-wider text-gray-500 mb-1">{label}</div>}
      <div className="space-y-1">{children}</div>
    </div>
  );
}
