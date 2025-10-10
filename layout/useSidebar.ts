import { useState, useEffect, useCallback } from 'react';

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const storedValue = localStorage.getItem("sidebar_collapsed");
      return storedValue === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = useCallback(() => {
    setIsCollapsed(prev => {
      const newState = !prev;
      try {
        localStorage.setItem("sidebar_collapsed", String(newState));
      } catch (error) {
        console.error("Failed to save sidebar state:", error);
      }
      return newState;
    });
  }, []);

  return { isCollapsed, toggleSidebar };
}
