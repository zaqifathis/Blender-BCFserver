import { useRef, useState } from "preact/hooks";
import { bitmapUrl, snapshotUrl } from "../../api/bcf";
import type { Viewpoint } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { useClickOutside } from "../../hooks/useClickOutside";
import { DownloadIcon } from "../common/icons/ActionIcons";
import { IconButton } from "../common/IconButton";
import styles from "./ViewpointDownloadButton.module.css";

type Props = {
  projectId: string;
  topicId: string;
  viewpoint: Viewpoint;
  // Viewpoint number in the topic, for the file names
  number: number;
  hasSnapshot: boolean;
  disabled?: boolean;
};

// Starts a download without leaving the page: the server sends the image as an attachment
const download = (url: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.click();
};

// Downloads the snapshot directly; with bitmaps opens a menu of the snapshot and each bitmap
export function ViewpointDownloadButton({ projectId, topicId, viewpoint, number, hasSnapshot, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  const { topic } = STRINGS;
  const bitmaps = viewpoint.bitmaps ?? [];
  const snapshot = snapshotUrl(projectId, topicId, viewpoint.guid, topic.snapshotFile(number));

  if (!bitmaps.length)
    return (
      <IconButton
        label={topic.downloadSnapshot}
        title={hasSnapshot ? topic.downloadSnapshot : topic.noSnapshot}
        onClick={() => download(snapshot)}
        disabled={!hasSnapshot || disabled}
      >
        <DownloadIcon />
      </IconButton>
    );

  return (
    <div class={styles.anchor} ref={ref}>
      <IconButton label={topic.downloadImages} onClick={() => setOpen((o) => !o)} disabled={disabled} expanded={open}>
        <DownloadIcon />
      </IconButton>
      {open && (
        <ul class={styles.menu} role="menu">
          {hasSnapshot && (
            <li>
              <a class={styles.item} role="menuitem" href={snapshot} onClick={() => setOpen(false)}>
                {topic.downloadSnapshotItem}
              </a>
            </li>
          )}
          {bitmaps.map((b, i) => (
            <li key={b.guid}>
              <a
                class={styles.item}
                role="menuitem"
                href={bitmapUrl(projectId, topicId, viewpoint.guid, b.guid, topic.bitmapFile(number, i + 1))}
                onClick={() => setOpen(false)}
              >
                {topic.downloadBitmapItem(i + 1)}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
