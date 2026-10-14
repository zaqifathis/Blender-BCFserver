import type { TopicFile } from "../../api/types";
import { STRINGS } from "../../config/strings";
import type { AsyncState } from "../../hooks/useAsync";
import { isWebUrl } from "../../lib/url";
import { ErrorMessage } from "../common/StatusMessage";
import styles from "./FilesSection.module.css";

type Props = { files: AsyncState<TopicFile[]> };

// Hidden when the topic header lists no files. A server-specific id reference has no generic
// download, so only uri references become links
export function FilesSection({ files }: Props) {
  const { topic } = STRINGS;
  const items = files.data ?? [];
  if (!items.length && !files.error) return null;

  return (
    <section>
      <h3>
        {topic.files}
        {topic.filesCount(items.length)}
      </h3>
      <ErrorMessage error={files.error} />
      <ul>
        {items.map((file) => {
          const name = file.filename ?? file.reference ?? file.ifc_project ?? "";
          const id = !isWebUrl(file.reference) && file.reference !== name ? file.reference : undefined;
          const note = [file.ifc_project !== name && file.ifc_project, id].filter(Boolean).join(" · ");
          return (
            <li class={styles.file}>
              {isWebUrl(file.reference) ? (
                <a href={file.reference} target="_blank" rel="noopener noreferrer" title={topic.openLink(file.reference)}>
                  {name}
                </a>
              ) : (
                <span>{name}</span>
              )}
              {note && <p class={styles.note}>{note}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
