import { useState } from "preact/hooks";
import { snapshotUrl } from "../../api/bcf";
import { STRINGS } from "../../config/strings";
import { cx } from "../../lib/format";
import styles from "./ViewpointThumb.module.css";

type Props = {
  projectId: string;
  topicId: string;
  viewpointId: string;
  number: number;
  selected: boolean;
  onClick: () => void;
  // Half size, for the strip below the large snapshot
  small?: boolean;
};

// A viewpoint's snapshot as a fixed-size tile, so the layout does not shift as images arrive; "No snapshot" when it has none
export function ViewpointThumb({ projectId, topicId, viewpointId, number, selected, onClick, small }: Props) {
  const [failed, setFailed] = useState(false);
  const { topic } = STRINGS;
  return (
    <button
      type="button"
      class={cx(styles.tile, small && styles.small, selected && styles.selected)}
      aria-pressed={selected}
      title={topic.selectViewpoint(number)}
      onClick={onClick}
    >
      {failed ? (
        <span class={styles.empty}>{topic.noSnapshot}</span>
      ) : (
        <img
          class={styles.image}
          src={snapshotUrl(projectId, topicId, viewpointId)}
          alt={topic.viewpointLabel(number)}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </button>
  );
}

// Same size as a thumbnail, for the picker's text choices
export function ViewpointTile({ selected, title, onClick, children }: { selected: boolean; title?: string; onClick: () => void; children: string }) {
  return (
    <button type="button" class={cx(styles.tile, selected && styles.selected)} aria-pressed={selected} title={title} onClick={onClick}>
      <span class={styles.empty}>{children}</span>
    </button>
  );
}
