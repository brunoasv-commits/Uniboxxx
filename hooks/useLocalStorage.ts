
import { useState } from 'react';

// Helper function for deep merging state, ensuring compatibility with new versions.
const deepMerge = (initial: any, stored: any): any => {
    if (typeof stored !== 'object' || stored === null || typeof initial !== 'object' || initial === null) {
        return stored;
    }
    // Create a new object based on the initial structure to avoid modifying it.
    const merged = { ...initial };

    for (const key in stored) {
        // Merge only own properties of the stored object.
        if (Object.prototype.hasOwnProperty.call(stored, key)) {
            const initialValue = merged[key];
            const storedValue = stored[key];

            // If both values are objects (and not arrays), recurse. Otherwise, stored value takes precedence.
            if (typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue) && 
                typeof storedValue === 'object' && storedValue !== null && !Array.isArray(storedValue)) {
                merged[key] = deepMerge(initialValue, storedValue);
            } else if (storedValue !== undefined) {
                // Stored value overwrites initial value (or adds new key).
                merged[key] = storedValue;
            }
        }
    }
    return merged;
};

/**
 * A robust useLocalStorage hook that handles initialization errors
 * and deep merges the stored state with the initial state to prevent missing keys.
 * This ensures that if the app is updated with new state properties,
 * the old stored state doesn't cause crashes.
 * @param key The key to use in localStorage.
 * @param initialValue The initial value to use if nothing is stored or if data is corrupt.
 */
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        return initialValue;
      }
      
      const parsedItem = JSON.parse(item);
      // Perform a deep merge to ensure state structure is always valid and complete.
      return deepMerge(initialValue, parsedItem);

    } catch (error) {
      console.error(`Error reading localStorage key “${key}”:`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  };

  return [storedValue, setValue];
}

export default useLocalStorage;
