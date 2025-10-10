import React from 'react';
import { Page } from '../App';

type NavItemProps = {
    page: Page;
    activePage: Page;
    setActivePage: (page: Page) => void;
    icon: React.ElementType;
    label: string;
    collapsed?: boolean;
    ghost?: boolean;
    badge?: string | number;
    isGroup?: boolean;
    groupPages?: Page[];
};

export function NavItem({ page, activePage, setActivePage, icon: Icon, label, collapsed = false, ghost = false, badge, isGroup = false, groupPages = [] }: NavItemProps) {
  const isActive = isGroup ? groupPages.includes(activePage) : activePage === page;
  
  const base = "group relative flex items-center gap-3 rounded-xl px-3 h-10 text-sm font-medium w-full text-left transition-colors duration-150";
  const tone = ghost
    ? "text-gray-300 hover:bg-white/5"
    : isActive
      ? "bg-sky-600/15 border border-sky-500/30 text-sky-200"
      : "border border-transparent text-gray-300 hover:bg-white/5";

  return (
    <button onClick={() => setActivePage(page)} className={`${base} ${tone}`}>
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate flex-1">{label}</span>}
      {badge !== undefined && !collapsed && (
        <span className="ml-auto text-[11px] px-2 py-0.5 rounded-full bg-white/10">{badge}</span>
      )}
      {collapsed && (
        <span className="pointer-events-none absolute left-14 z-50 rounded-md bg-[#0f1422] text-gray-100 text-xs px-2 py-1 border border-white/10 opacity-0 translate-x-[-4px] group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
          {label}
        </span>
      )}
    </button>
  );
}
