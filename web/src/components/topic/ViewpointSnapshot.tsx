import { useState } from "preact/hooks";
import { snapshotUrl } from "../../api/bcf";
import { STRINGS } from "../../config/strings";
import styles from "./ViewpointSnapshot.module.css";

type Props = { projectId: string; topicId: string; viewpointId: string; onSettled: () => void };

// Hidden when the viewpoint has no snapshot; onSettled fires once the image loaded or failed
export function ViewpointSnapshot({ projectId, topicId, viewpointId, onSettled }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const fail = () => {
    setFailed(true);
    onSettled();
  };
  return (
    <img
      class={styles.snapshot}
      src={snapshotUrl(projectId, topicId, viewpointId)}
      alt={STRINGS.topic.snapshotAlt}
      onLoad={onSettled}
      onError={fail}
    />
  );
}
