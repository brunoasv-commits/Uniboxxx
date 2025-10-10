// src/lib/auth.ts
import { User, MENU_KEYS } from "./access";
import { ID } from "../../types";

export type Session = { userId: string; email: string };

const USERS_KEY = "erp_users";
const CURRENT_USER_KEY = "erp_current_user";


// SHA-256 in browser
export async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// User data helpers
function loadUsers(): User[] {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch { return []; }
}
function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Session management
export function isLogged(): boolean { 
    return !!localStorage.getItem(CURRENT_USER_KEY); 
}
export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

// Login function
export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const users = loadUsers();
  const user = users.find((u: any) => String(u.email).toLowerCase() === String(email).toLowerCase());
  if (!user) return { ok: false, error: "Usuário não encontrado" };
  if (user.active === false) return { ok: false, error: "Usuário inativo" };
  if (!user.passwordHash) return { ok: false, error: "Usuário sem senha configurada." };

  const hash = await sha256(password);
  if (user.passwordHash !== hash) return { ok: false, error: "Senha inválida" };

  localStorage.setItem(CURRENT_USER_KEY, user.id);
  
  return { ok: true };
}

// Reset password with a temporary one
export async function resetPasswordWithTemporary(email: string): Promise<{ ok: boolean; error?: string; temporaryPassword?: string }> {
  const users = loadUsers();
  const userIndex = users.findIndex((u: any) => String(u.email).toLowerCase() === String(email).toLowerCase());

  if (userIndex === -1) {
    return { ok: false, error: "Usuário não encontrado com este e-mail." };
  }

  const temporaryPassword = Math.random().toString(36).substring(2, 8); // 6-char random string
  const newPasswordHash = await sha256(temporaryPassword);
  users[userIndex].passwordHash = newPasswordHash;

  saveUsers(users);
  
  return { ok: true, temporaryPassword };
}

// Change password for a logged-in user
export async function changePassword(userId: ID, currentPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  if (userIndex === -1) {
    return { ok: false, error: "Usuário não encontrado." };
  }

  const user = users[userIndex];
  const currentPasswordHash = await sha256(currentPassword);
  
  if (user.passwordHash !== currentPasswordHash) {
    return { ok: false, error: "A senha atual está incorreta." };
  }

  const newPasswordHash = await sha256(newPassword);
  users[userIndex].passwordHash = newPasswordHash;

  saveUsers(users);
  
  return { ok: true };
}


// Seed admin user on first run
export async function ensureAdminSeed() {
  let users = loadUsers();
  const adminExists = users.some((u:any)=> (u.email||"").toLowerCase()==="admin@admin.com");

  if (!adminExists) {
    const adminId = Date.now().toString(36) + Math.random().toString(36).substring(2);
    const passwordHash = await sha256("admin");
    const admin: User = {
      id: adminId,
      name: "Administrador",
      email: "admin@admin.com",
      active: true,
      permissions: [...MENU_KEYS], // full access
      passwordHash
    };
    users.push(admin);
    saveUsers(users);
  }
}