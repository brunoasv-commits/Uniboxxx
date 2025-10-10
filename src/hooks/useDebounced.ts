import { useEffect, useState } from "react";

export function useDebounced<T>(value: T, delay = 300): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setD(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return d;
}
