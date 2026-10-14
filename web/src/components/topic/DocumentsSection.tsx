import { documentUrl } from "../../api/bcf";
import type { Document, DocumentReference } from "../../api/types";
import { STRINGS } from "../../config/strings";
import type { AsyncState } from "../../hooks/useAsync";
import { ErrorMessage } from "../common/StatusMessage";
import styles from "./DocumentsSection.module.css";

type Props = { projectId: string; references: AsyncState<DocumentReference[]>; documents: Document[] };

// Only http(s) links are rendered, so a reference cannot smuggle in a javascript: url
const isWebUrl = (url?: string): url is string => !!url && /^https?:\/\//i.test(url);

// Hidden when the topic references no documents
export function DocumentsSection({ projectId, references, documents }: Props) {
  const { topic } = STRINGS;
  const refs = references.data ?? [];
  if (!refs.length && !references.error) return null;
  const byGuid = new Map(documents.map((d) => [d.guid, d]));

  return (
    <section>
      <h3>
        {topic.documents}
        {topic.documentsCount(refs.length)}
      </h3>
      <ErrorMessage error={references.error} />
      <ul>
        {refs.map((ref) => {
          const doc = ref.document_guid ? byGuid.get(ref.document_guid) : undefined;
          const name = doc?.filename ?? ref.description ?? ref.url ?? ref.document_guid ?? ref.guid;
          const note = ref.description && ref.description !== name ? ref.description : undefined;
          return (
            <li class={styles.document}>
              {ref.document_guid ? (
                <a
                  href={documentUrl(projectId, ref.document_guid, doc?.filename)}
                  download={doc?.filename ?? ""}
                  title={topic.download(name)}
                >
                  {name}
                </a>
              ) : isWebUrl(ref.url) ? (
                <a href={ref.url} target="_blank" rel="noopener noreferrer" title={topic.openLink(ref.url)}>
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
