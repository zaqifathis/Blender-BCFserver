import { useEffect, useState } from "preact/hooks";

export type AsyncState<T> = { data?: T; error?: string; loading: boolean };

// True once a first result or error arrived; refetches keep it true
export const isSettled = (s: AsyncState<unknown>) => s.data !== undefined || s.error !== undefined;

export function useAsync<T>(fn: (() => Promise<T>) | null, deps: unknown[]): AsyncState<T> {
  const [state, set] = useState<AsyncState<T>>({ loading: false });
  useEffect(() => {
    if (!fn) return set({ loading: false });
    let live = true;
    set((s) => ({ ...s, loading: true, error: undefined }));
    fn().then(
      (data) => live && set({ data, loading: false }),
      (e: Error) => live && set({ error: e.message, loading: false }),
    );
    return () => {
      live = false;
    };
  }, deps);
  return state;
}
