
import React from 'react';

// Helper function for deep merging state, ensuring compatibility with new versions.
const deepMerge = (initial: any, stored: any): any => {
    if (typeof stored !== 'object' || stored === null || typeof initial !== 'object' || initial === null) {
        return stored;
    }
    const merged = { ...initial };
    for (const key in stored) {
        if (Object.prototype.hasOwnProperty.call(stored, key)) {
            const initialValue = merged[key];
            const storedValue = stored[key];
            if (typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue) &&
                typeof storedValue === 'object' && storedValue !== null && !Array.isArray(storedValue)) {
                merged[key] = deepMerge(initialValue, storedValue);
            } else if (storedValue !== undefined) {
                merged[key] = storedValue;
            }
        }
    }
    return merged;
};

export function useSavedView(key:string, initial:any){
  const [state, setState] = React.useState(()=> {
    try { 
      const stored = localStorage.getItem(key);
      if (!stored) {
        return initial;
      }
      const parsedStored = JSON.parse(stored);
      // Deep merge to prevent crashes from outdated stored view schemas.
      return deepMerge(initial, parsedStored);
    } catch { 
      return initial; 
    }
  });
  
  React.useEffect(()=> {
    localStorage.setItem(key, JSON.stringify(state))
  }, [key, state]);

  return [state, setState] as const;
}
