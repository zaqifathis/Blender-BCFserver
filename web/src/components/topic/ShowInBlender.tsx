import { useState } from "preact/hooks";
import { showViewpointInBlender } from "../../api/bcf";
import { STRINGS } from "../../config/strings";
import { Button } from "../common/Button";
import { ErrorMessage, StatusMessage } from "../common/StatusMessage";
import styles from "./ShowInBlender.module.css";

type Props = { projectId: string; topicId: string; viewpointId: string };

type State = { kind: "idle" | "busy" } | { kind: "done"; message: string } | { kind: "error"; message: string };

// Applies the viewpoint to the Blender scene; the model is loaded first when it is stored on the server
export function ShowInBlender({ projectId, topicId, viewpointId }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const { topic } = STRINGS;

  const show = async () => {
    setState({ kind: "busy" });
    try {
      const result = await showViewpointInBlender(projectId, topicId, viewpointId);
      if (result.status === "needs_ifc") setState({ kind: "error", message: topic.needsIfc(result.external?.filename ?? undefined) });
      else setState({ kind: "done", message: [topic.shownInBlender(result.missing), ...result.warnings].join(". ") });
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div class={styles.wrap}>
      <Button onClick={show} disabled={state.kind === "busy"}>
        {state.kind === "busy" ? topic.showingInBlender : topic.showInBlender}
      </Button>
      {state.kind === "done" && <StatusMessage>{state.message}</StatusMessage>}
      {state.kind === "error" && <ErrorMessage error={state.message} />}
    </div>
  );
}
