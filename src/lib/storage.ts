/**
 * Local persistence. Everything a user types stays on their device —
 * nothing here ever leaves the browser.
 * Every access is guarded: private windows and blocked site-data throw.
 */

const PREFIX = 'finora:';

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the app keeps working in memory */
  }
}

export function removeLocal(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    /* no-op */
  }
}
