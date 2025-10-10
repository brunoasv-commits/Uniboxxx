import React, { useState, useRef, useEffect } from 'react';
import { NavItem } from "./NavItem";
import { NavGroup } from "./NavGroup";
import { useSidebar } from "./useSidebar";
import { Page, pageGroups } from '../App';
import ChangePasswordModal from '../src/components/ChangePasswordModal';
import {
  Home, LayoutDashboard, Wallet, CreditCard, ArrowRightLeft,
  LineChart, Boxes, Users, LogOut, ShieldCheck, ChevronDown, KeyRound,
  Building2, ChevronsLeft, ChevronsRight
} from "lucide-react";
import { useAccess } from '../src/contexts/AccessProvider';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  onLogout: () => void;
}

export function Sidebar({ activePage, setActivePage, onLogout }: SidebarProps) {
  const { isCollapsed, toggleSidebar } = useSidebar();
  const { canSee, current } = useAccess();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const userInitial = current?.name?.charAt(0).toUpperCase() || '?';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <aside className={`relative z-20 flex shrink-0 flex-col bg-[#121824] border-r border-white/10 text-gray-200 transition-all duration-300 ${isCollapsed ? "w-[72px]" : "w-[264px]"}`}>
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-16 z-10 h-6 w-6 rounded-full bg-slate-700 text-slate-300 ring-4 ring-[#121824] hover:bg-slate-600 flex items-center justify-center"
          aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </button>

        {/* Topo */}
        <div className={`flex h-16 shrink-0 items-center border-b border-white/10 px-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <button onClick={() => setActivePage("Home")} className="flex items-center gap-2 overflow-hidden">
             <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white font-bold shrink-0">
                {userInitial}
            </div>
            {!isCollapsed && <span className="text-sm font-semibold truncate">{current?.name || 'Usuário'}</span>}
          </button>
           {!isCollapsed && (
            <div className="relative" ref={profileRef}>
              <button onClick={() => setIsProfileOpen(p => !p)} className="rounded-full p-2 hover:bg-white/10" aria-label="Menu do usuário">
                <ChevronDown size={16} className={`transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>
              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#1a2233] p-2 shadow-lg z-50">
                  <div className="px-2 py-1 mb-1">
                    <div className="font-semibold text-sm text-gray-100">{current?.name}</div>
                    <div className="text-xs text-gray-400">{current?.email}</div>
                  </div>
                  <button
                    onClick={() => { setIsChangePasswordModalOpen(true); setIsProfileOpen(false); }}
                    className="w-full text-left rounded-md px-2 py-1.5 text-sm text-gray-200 hover:bg-white/10"
                  >
                    Alterar Senha
                  </button>
                </div>
              )}
            </div>
           )}
        </div>

        {/* Conteúdo scrollável */}
        <nav className={`flex-1 space-y-4 p-3 h-[calc(100vh-112px)] ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
          <NavGroup label="Geral" collapsed={isCollapsed}>
            {canSee("quick_access") && <NavItem page="Acesso Rápido" activePage={activePage} setActivePage={setActivePage} icon={Home} label="Acesso Rápido" collapsed={isCollapsed} />}
            {canSee("dashboard") && <NavItem page="Dashboard" activePage={activePage} setActivePage={setActivePage} icon={LayoutDashboard} label="Dashboard" collapsed={isCollapsed} />}
          </NavGroup>

          <NavGroup label="Finanças" collapsed={isCollapsed}>
              {canSee("accounts") && <NavItem page="Info. Contas" activePage={activePage} setActivePage={setActivePage} icon={Wallet} label="Info. Contas" collapsed={isCollapsed} />}
              {canSee("transactions") && <NavItem page="Transações" activePage={activePage} setActivePage={setActivePage} icon={ArrowRightLeft} label="Transações" collapsed={isCollapsed} />}
              {canSee("cards") && <NavItem page="Despesas do Cartão" activePage={activePage} setActivePage={setActivePage} icon={CreditCard} label="Despesas do Cartão" collapsed={isCollapsed} />}
              {canSee("investments") && <NavItem page="Investimentos" activePage={activePage} setActivePage={setActivePage} icon={LineChart} label="Investimentos" collapsed={isCollapsed} />}
          </NavGroup>

          <NavGroup label="Operações" collapsed={isCollapsed}>
              {canSee("products") && <NavItem page="Todos os Produtos" activePage={activePage} setActivePage={setActivePage} icon={Boxes} label="Produtos" collapsed={isCollapsed} isGroup={true} groupPages={pageGroups['Produtos']} />}
              {canSee("contacts") && <NavItem page="Contatos" activePage={activePage} setActivePage={setActivePage} icon={Users} label="Cadastros" collapsed={isCollapsed} isGroup={true} groupPages={pageGroups['Cadastros']} />}
          </NavGroup>

          {canSee("passwords") && (
            <NavGroup label="Utilitários" collapsed={isCollapsed}>
                <NavItem page="Senhas" activePage={activePage} setActivePage={setActivePage} icon={KeyRound} label="Senhas" collapsed={isCollapsed} />
            </NavGroup>
          )}
          
          {canSee("access") && (
              <NavGroup label="Administração" collapsed={isCollapsed}>
                  {canSee("company_profile") && <NavItem page="Cadastro Empresa" activePage={activePage} setActivePage={setActivePage} icon={Building2} label="Cadastro Empresa" collapsed={isCollapsed} />}
                  <NavItem page="Usuários & Acesso" activePage={activePage} setActivePage={setActivePage} icon={ShieldCheck} label="Usuários & Acesso" collapsed={isCollapsed} />
              </NavGroup>
          )}
        </nav>

        {/* Rodapé */}
        <div className="mt-auto shrink-0 border-t border-white/10 p-3">
          <NavItem page={"Home"} activePage={activePage} setActivePage={onLogout} icon={LogOut} label="Sair" collapsed={isCollapsed} ghost />
        </div>
      </aside>
      <ChangePasswordModal isOpen={isChangePasswordModalOpen} onClose={() => setIsChangePasswordModalOpen(false)} />
    </>
  );
}
