
import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { listUsers, saveUsers, getCurrentUser, setCurrentUser, User, MenuKey, can } from "../lib/access";
import { ID } from '../../types';

interface AccessContextType {
  users: User[];
  current: User | null;
  updateUsers: (next: User[]) => void;
  switchUser: (id: ID) => void;
  canSee: (key: MenuKey) => boolean;
  refresh: () => void;
}

const AccessContext = createContext<AccessContextType | undefined>(undefined);

export const AccessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [current, setCurrent] = useState<User | null>(null);

  const refresh = useCallback(() => {
    setUsers(listUsers());
    setCurrent(getCurrentUser());
  }, []);

  useEffect(() => {
    refresh();
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'erp_users' || event.key === 'erp_current_user') {
        refresh();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refresh]);

  const updateUsers = useCallback((next: User[]) => {
    saveUsers(next);
    refresh();
  }, [refresh]);

  const switchUser = useCallback((id: ID) => {
    setCurrentUser(id);
    refresh();
  }, [refresh]);

  const canSee = useCallback((key: MenuKey) => {
    return can(current, key);
  }, [current]);
  
  const value = { users, current, updateUsers, switchUser, canSee, refresh };

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (context === undefined) {
    throw new Error('useAccess must be used within an AccessProvider');
  }
  return context;
}