import type { Topic } from "../../api/types";
import { Badge } from "../common/Badge";
import { MetaRow } from "../common/MetaRow";
import { TopicKindBadges } from "./TopicKindBadges";

export function TopicBadges({ topic }: { topic: Topic }) {
  return (
    <MetaRow>
      <TopicKindBadges topic={topic} />
      {(topic.labels ?? []).map((l) => (
        <Badge kind="label" value={l} />
      ))}
    </MetaRow>
  );
}
