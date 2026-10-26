import type { Viewpoint } from "../../api/types";
import { STRINGS } from "../../config/strings";
import { NEW_VIEWPOINT, type ViewpointChoice } from "../../hooks/useCommentEditing";
import thumbStyles from "./ViewpointThumb.module.css";
import { ViewpointThumb, ViewpointTile } from "./ViewpointThumb";
import styles from "./ViewpointPicker.module.css";

type Props = {
  projectId: string;
  topicId: string;
  viewpoints: Viewpoint[];
  value: ViewpointChoice;
  onChange: (value: ViewpointChoice) => void;
  canCreate: boolean;
};

// The comment's viewpoint: none, one of the topic's, or a new one captured from Blender on save
export function ViewpointPicker({ projectId, topicId, viewpoints, value, onChange, canCreate }: Props) {
  const { topic } = STRINGS;
  return (
    <fieldset class={styles.picker}>
      <legend class={styles.legend}>{topic.commentViewpoint}</legend>
      <div class={thumbStyles.strip}>
        <ViewpointTile selected={value === null} onClick={() => onChange(null)}>
          {topic.noViewpoint}
        </ViewpointTile>
        {viewpoints.map((vp, i) => (
          <ViewpointThumb
            key={vp.guid}
            projectId={projectId}
            topicId={topicId}
            viewpointId={vp.guid}
            number={i + 1}
            selected={value === vp.guid}
            onClick={() => onChange(vp.guid)}
          />
        ))}
        {canCreate && (
          <ViewpointTile selected={value === NEW_VIEWPOINT} title={topic.newViewpointTitle} onClick={() => onChange(NEW_VIEWPOINT)}>
            {topic.newViewpoint}
          </ViewpointTile>
        )}
      </div>
    </fieldset>
  );
}
