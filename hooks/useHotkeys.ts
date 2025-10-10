
import { useEffect } from 'react';

export function useHotkeys(map:{[k:string]:()=>void}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Do not trigger hotkeys if the user is typing in an input, textarea, or select field.
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }

      const k = [];
      if (e.ctrlKey||e.metaKey) k.push('ctrl');
      if (e.shiftKey) k.push('shift');
      k.push(e.key.toLowerCase());
      const key = k.join('+');
      
      if (map[key]) { 
        e.preventDefault(); 
        map[key](); 
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [map]);
}
