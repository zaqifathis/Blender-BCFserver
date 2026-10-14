import type { RefObject } from "preact";
import { useEffect } from "preact/hooks";

// Calls onOutside for clicks outside ref while active
export function useClickOutside(ref: RefObject<Element>, active: boolean, onOutside: () => void) {
  useEffect(() => {
    if (!active) return;
    const handle = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onOutside();
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, [active]);
}
