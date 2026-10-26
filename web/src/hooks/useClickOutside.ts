import type { RefObject } from "preact";
import { useEffect } from "preact/hooks";

// Calls onOutside for clicks outside ref (or all of several refs) while active
export function useClickOutside(ref: RefObject<Element> | RefObject<Element>[], active: boolean, onOutside: () => void) {
  useEffect(() => {
    if (!active) return;
    const refs = Array.isArray(ref) ? ref : [ref];
    const handle = (e: MouseEvent) => !refs.some((r) => r.current?.contains(e.target as Node)) && onOutside();
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [active]);
}
