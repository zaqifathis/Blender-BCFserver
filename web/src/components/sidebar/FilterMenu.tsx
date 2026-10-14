import type { FilterDef } from "../../config/topicFilters";
import styles from "./FilterMenu.module.css";

export function FilterMenu({ defs, onPick }: { defs: FilterDef[]; onPick: (key: string) => void }) {
  return (
    <ul class={styles.menu} role="menu">
      {defs.map(({ key, label }) => (
        <li>
          <button class={styles.item} role="menuitem" onClick={() => onPick(key)}>
            {label}
          </button>
        </li>
      ))}
    </ul>
  );
}
