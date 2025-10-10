import { ID } from '../../types';

export const MENU_KEYS = [
  "quick_access", "dashboard",
  "accounts", "transactions", "cards", "investments",
  "products", "contacts",
  "passwords",
  "company_profile",
  "access"
] as const;
export type MenuKey = typeof MENU_KEYS[number];

export type User = {
  id: ID;
  name: string;
  email: string;
  active: boolean;
  permissions: MenuKey[];
  passwordHash?: string;
};

export const MENU_LABELS: Record<MenuKey, string> = {
  quick_access: "Acesso Rápido",
  dashboard: "Dashboard",
  accounts: "Info. Contas",
  transactions: "Transações",
  cards: "Despesas do Cartão",
  investments: "Investimentos",
  products: "Produtos & Vendas",
  contacts: "Cadastros",
  passwords: "Senhas",
  company_profile: "Cadastro Empresa",
  access: "Usuários & Acesso"
};

const UKEY = "erp_users";
const CKEY = "erp_current_user";

export function listUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(UKEY) || "[]");
  } catch {
    return [];
  }
}

export function saveUsers(users: User[]) {
  localStorage.setItem(UKEY, JSON.stringify(users));
}

export function getCurrentUserId(): string | null {
    return localStorage.getItem(CKEY);
}

export function getCurrentUser(): User | null {
  const id = getCurrentUserId();
  if (!id) return null;
  return listUsers().find(u => u.id === id) || null;
}

export function setCurrentUser(id: string) {
  localStorage.setItem(CKEY, id);
}

export function can(user: User | null, key: MenuKey): boolean {
  if (!user || !user.active) return false;
  return user.permissions?.includes(key);
}