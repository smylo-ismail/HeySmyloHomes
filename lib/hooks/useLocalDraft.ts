'use client';

import { useEffect, useState } from 'react';

/**
 * Persists a draft object to localStorage under `key`. The initial render (server and
 * client) always starts from `initial` so hydration never mismatches; the stored draft is
 * merged in via an effect immediately after mount, same as any other client-only state load.
 */
export function useLocalDraft<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) setValue((prev) => ({ ...prev, ...JSON.parse(stored) }));
    } catch {
      // localStorage unavailable (private browsing) — draft simply won't restore.
    }
    // Only run on mount / key change, not on every value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage unavailable (private browsing, quota) — draft simply won't persist.
    }
  }, [key, value]);

  return [value, setValue];
}
