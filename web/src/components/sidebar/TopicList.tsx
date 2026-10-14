import type { Topic } from "../../api/types";
import { TopicListItem } from "./TopicListItem";

type Props = { topics: Topic[]; selectedId: string; onSelect: (topicId: string) => void };

export function TopicList({ topics, selectedId, onSelect }: Props) {
  return (
    <ul>
      {topics.map((t) => (
        <li>
          <TopicListItem topic={t} selected={t.guid === selectedId} onSelect={() => onSelect(t.guid)} />
        </li>
      ))}
    </ul>
  );
}
