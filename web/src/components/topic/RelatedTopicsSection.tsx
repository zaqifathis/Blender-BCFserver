import type { RelatedTopic, Topic } from "../../api/types";
import { STRINGS } from "../../config/strings";
import type { AsyncState } from "../../hooks/useAsync";
import { topicLabel } from "../../lib/topic";
import { MetaRow } from "../common/MetaRow";
import { ErrorMessage } from "../common/StatusMessage";
import styles from "./RelatedTopicsSection.module.css";
import { TopicKindBadges } from "./TopicKindBadges";

type Props = { related: AsyncState<RelatedTopic[]>; topics: Topic[]; onSelect: (topicId: string) => void };

// Hidden when the topic has no related topics. topics is every topic of the project, so a related topic
// hidden by the sidebar filters can still be opened; one not among them shows its guid only
export function RelatedTopicsSection({ related, topics, onSelect }: Props) {
  const { topic: strings } = STRINGS;
  const items = related.data ?? [];
  if (!items.length && !related.error) return null;
  const byGuid = new Map(topics.map((t) => [t.guid, t]));

  return (
    <section>
      <h3>
        {strings.relatedTopics}
        {strings.relatedCount(items.length)}
      </h3>
      <ErrorMessage error={related.error} />
      <ul>
        {items.map(({ related_topic_guid: guid }) => {
          const topic = byGuid.get(guid);
          return (
            <li class={styles.related}>
              {topic ? (
                <button type="button" class={styles.link} onClick={() => onSelect(guid)} title={strings.openRelated(topic.title)}>
                  {topicLabel(topic)}
                </button>
              ) : (
                <span>{guid}</span>
              )}
              {topic && (
                <MetaRow>
                  <TopicKindBadges topic={topic} />
                </MetaRow>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
