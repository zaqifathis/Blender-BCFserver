import { useState } from "preact/hooks";
import { snapshotUrl } from "../../api/bcf";
import { STRINGS } from "../../config/strings";
import styles from "./ViewpointSnapshot.module.css";

type Props = { projectId: string; topicId: string; viewpointId: string; onSettled: (shown: boolean) => void };

// Hidden when the viewpoint has no snapshot; onSettled fires once the image loaded (true) or failed (false)
export function ViewpointSnapshot({ projectId, topicId, viewpointId, onSettled }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const fail = () => {
    setFailed(true);
    onSettled(false);
  };
  return (
    <img
      class={styles.snapshot}
      src={snapshotUrl(projectId, topicId, viewpointId)}
      alt={STRINGS.topic.snapshotAlt}
      onLoad={() => onSettled(true)}
      onError={fail}
    />
  );
}
