import { useEffect, useState } from "preact/hooks";

// State that returns to its initial value whenever resetKey changes (e.g. the selected project)
export function useResettableState<T>(resetKey: unknown, initial: T) {
  const [state, setState] = useState(initial);
  useEffect(() => setState(initial), [resetKey]);
  return [state, setState] as const;
}
