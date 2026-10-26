import type { Ref } from "preact";
import { useState } from "preact/hooks";
import {
  captureViewpointFromBlender,
  deleteViewpoint,
  listComments,
  showViewpointInBlender,
  snapshotUrl,
  updateComment,
} from "../../api/bcf";
import type { Comment, Extensions, Viewpoint } from "../../api/types";
import { RequestError } from "../../api/ws";
import { STRINGS } from "../../config/strings";
import { cx, formatDate } from "../../lib/format";
import { canDeleteViewpoint, canEditComment } from "../../lib/topic";
import { AddViewIcon, DeleteIcon, EyeIcon } from "../common/icons/ActionIcons";
import { IconButton } from "../common/IconButton";
import { ErrorMessage } from "../common/StatusMessage";
import thumbStyles from "./ViewpointThumb.module.css";
import { ViewpointThumb } from "./ViewpointThumb";
import styles from "./ViewpointsSection.module.css";

type Props = {
  projectId: string;
  topicId: string;
  extensions?: Extensions;
  viewpoints: Viewpoint[];
  comments: Comment[];
  // The viewpoint in the large image; undefined shows an empty frame
  shownId?: string;
  // With a comment selected only its viewpoint shows, without the thumbnails, and delete only unlinks it
  selectedComment?: Comment;
  onPick: (viewpointId: string) => void;
  canAdd: boolean;
  onAdded: (viewpointId: string) => void;
  onDeleted: () => void;
  onUnlinked: () => void;
  // Clicks in here keep the selected comment
  containerRef?: Ref<HTMLElement>;
};

// Only errors are shown; while busy the buttons are disabled
type State = { kind: "idle" | "busy" } | { kind: "error"; message: string };

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

const SUMMARY_LENGTH = 60; // characters of a comment's text in the delete confirmation

const summary = (c: Comment) => {
  const text = (c.comment ?? "").trim().replace(/\s+/g, " ");
  return STRINGS.topic.commentSummary(
    c.author ?? STRINGS.common.unknownAuthor,
    formatDate(c.date),
    text.length > SUMMARY_LENGTH ? `${text.slice(0, SUMMARY_LENGTH)}…` : text,
  );
};

// Large snapshot of the shown viewpoint with its actions in the top right corner, the topic's viewpoints as small
// thumbnails below. A viewpoint added here belongs to the topic only; a comment's viewpoint is picked in the comment form.
export function ViewpointsSection(props: Props) {
  const { projectId, topicId, extensions, viewpoints, comments, shownId, selectedComment, onPick, canAdd, onAdded, onDeleted, onUnlinked } = props;
  const commentSelected = Boolean(selectedComment);
  const [state, setState] = useState<State>({ kind: "idle" });
  // Viewpoints whose snapshot failed to load
  const [noSnapshot, setNoSnapshot] = useState<Record<string, boolean>>({});
  const { topic } = STRINGS;
  const busy = state.kind === "busy";
  const shown = viewpoints.find((vp) => vp.guid === shownId);
  // From a comment, delete unlinks, which is editing the comment
  const canDelete = selectedComment ? canEditComment(selectedComment, extensions) : Boolean(shown) && canDeleteViewpoint(shown!, extensions);

  const run = async (action: () => Promise<void>) => {
    setState({ kind: "busy" });
    try {
      await action();
      setState({ kind: "idle" });
    } catch (e) {
      setState({ kind: "error", message: errorText(e) });
    }
  };

  const show = () =>
    run(async () => {
      const result = await showViewpointInBlender(projectId, topicId, shownId!);
      if (result.status === "needs_ifc") throw new Error(topic.needsIfc(result.external?.filename ?? undefined));
    });

  const add = () =>
    run(async () => {
      const { viewpoint } = await captureViewpointFromBlender(projectId, topicId);
      if (viewpoint?.guid) onAdded(viewpoint.guid);
    });

  // Why the comments cannot let go of the viewpoint (a comment needs text or a viewpoint), if they cannot
  const detachBlocker = (users: Comment[]) =>
    users.some((c) => !c.comment?.trim())
      ? topic.viewpointOnlyContent
      : users.some((c) => !canEditComment(c, extensions))
        ? topic.viewpointCommentLocked
        : undefined;

  const detach = async (users: Comment[]) => {
    const blocker = detachBlocker(users);
    if (blocker) throw new Error(blocker);
    for (const c of users) await updateComment(projectId, topicId, c.guid, { comment: c.comment, viewpoint_guid: null });
  };

  // BCF-API 3.5.9: the server may refuse with 409 while a comment refers to the viewpoint, and the client has to
  // disassociate the comment before trying again. The loaded comments let go first; on a 409 anyway (comments
  // this panel had not loaded) the topic's comments are fetched again, detached, and the delete tried once more.
  const remove = () => {
    const users = comments.filter((c) => c.viewpoint_guid === shownId);
    const blocker = detachBlocker(users);
    if (blocker) return setState({ kind: "error", message: blocker });
    if (!confirm(users.length ? topic.confirmDeleteViewpointUsed(users.map(summary)) : topic.confirmDeleteViewpoint)) return;
    run(async () => {
      await detach(users);
      try {
        await deleteViewpoint(projectId, topicId, shownId!);
      } catch (e) {
        if (!(e instanceof RequestError && e.status === 409)) throw e;
        const fresh = (await listComments(projectId, topicId, "")).filter((c) => c.viewpoint_guid === shownId);
        if (!fresh.length) throw e;
        await detach(fresh);
        await deleteViewpoint(projectId, topicId, shownId!);
      }
      onDeleted();
    });
  };

  // From a comment, delete only unlinks: the viewpoint stays in the topic
  const unlink = () => {
    const c = selectedComment!;
    if (!c.comment?.trim()) return setState({ kind: "error", message: topic.unlinkNeedsText });
    run(async () => {
      await updateComment(projectId, topicId, c.guid, { comment: c.comment, viewpoint_guid: null });
      onUnlinked();
    });
  };

  return (
    <section class={styles.section} ref={props.containerRef}>
      <div class={styles.frame}>
        {shownId && !noSnapshot[shownId] ? (
          <img
            key={shownId}
            class={styles.image}
            src={snapshotUrl(projectId, topicId, shownId)}
            alt={topic.snapshotAlt}
            onError={() => setNoSnapshot((s) => ({ ...s, [shownId]: true }))}
          />
        ) : (
          <span class={styles.empty}>
            {shownId ? topic.noSnapshot : commentSelected ? topic.commentWithoutViewpoint : topic.noViewpoints}
          </span>
        )}
        <div class={styles.tools}>
          {shownId && (
            <IconButton label={topic.showInBlender} onClick={show} disabled={busy}>
              <EyeIcon />
            </IconButton>
          )}
          <IconButton
            label={topic.addBlenderView}
            title={canAdd ? topic.addBlenderViewTitle : topic.addViewpointNotAllowed}
            onClick={add}
            disabled={!canAdd || busy}
          >
            <AddViewIcon />
          </IconButton>
          {shownId && (
            <IconButton
              label={commentSelected ? topic.unlinkViewpoint : topic.deleteViewpoint}
              title={
                commentSelected
                  ? canDelete
                    ? topic.unlinkViewpoint
                    : topic.unlinkNotAllowed
                  : canDelete
                    ? topic.deleteViewpoint
                    : topic.deleteViewpointNotAllowed
              }
              variant="danger"
              onClick={commentSelected ? unlink : remove}
              disabled={!canDelete || busy}
            >
              <DeleteIcon />
            </IconButton>
          )}
        </div>
      </div>
      {state.kind === "error" && <ErrorMessage error={state.message} />}
      {!commentSelected && viewpoints.length > 1 && (
        <div class={cx(thumbStyles.strip, styles.thumbs)}>
          {viewpoints.map((vp, i) => (
            <ViewpointThumb
              key={vp.guid}
              projectId={projectId}
              topicId={topicId}
              viewpointId={vp.guid}
              number={i + 1}
              selected={vp.guid === shownId}
              onClick={() => onPick(vp.guid)}
              small
            />
          ))}
        </div>
      )}
    </section>
  );
}
