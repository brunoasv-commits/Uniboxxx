
// src/lib/storage.ts
const NS = 'erp_uniboxxx';

export function getJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${NS}:${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setJSON<T>(key: string, value: T) {
  localStorage.setItem(`${NS}:${key}`, JSON.stringify(value));
}
