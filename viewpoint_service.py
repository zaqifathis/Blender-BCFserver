"""Show a server viewpoint in Blender: fetch it, make sure its IFC model is loaded, apply it.

Runs on a web server thread; everything touching bpy goes through the main-thread bridge.
"""

import os
import urllib.parse

from . import blender_bridge, ifc_loader, viewpoint_apply
from .log import logger

LOAD_TIMEOUT = 300  # seconds; loading a large model takes a while


def _quote(value):
    return urllib.parse.quote(str(value), safe="")


def show(client, p):
    """Reply ``{"status": "applied", ...summary}`` or ``{"status": "needs_ifc", "external": {...}}``."""
    project_id, topic_id = p["project_id"], p["topic_id"]
    vp_url = f"/projects/{_quote(project_id)}/topics/{_quote(topic_id)}/viewpoints/{_quote(p['viewpoint_id'])}"
    vp = client.get(vp_url)
    if "components" not in vp:
        # Some servers only serve the components through their own endpoints (BCF-API 3.5.6 - 3.5.8)
        vp["components"] = {}
        for part in ("selection", "coloring", "visibility"):
            try:
                vp["components"].update(client.get(f"{vp_url}/{part}") or {})
            except Exception as e:
                logger.warning("Viewpoint %s unavailable: %s", part, e)

    # The topic's own model is always the one shown: a different loaded model is replaced
    found = ifc_loader.locate(client, project_id, topic_id)
    loaded = blender_bridge.run_on_main(viewpoint_apply.loaded_path)
    ifc_path, matched_by_guid = None, False
    if "document" in found:
        wanted = ifc_loader.download(client, project_id, found["document"])
        if loaded is None or os.path.normcase(os.path.abspath(loaded)) != os.path.normcase(wanted):
            ifc_path = wanted
    else:
        # Stored elsewhere: a model the user loaded by hand will do if it carries one of the topic's
        # file names, or else holds components of the viewpoint (file names are often logical
        # names, e.g. "BCF-ARK" for a model saved as Architectural.ifc)
        names = {n.lower() for n in (found.get("external") or {}).get("filenames", [])}
        if loaded is None:
            return {"status": "needs_ifc", **found}
        if os.path.basename(loaded).lower() not in names:
            if not blender_bridge.run_on_main(lambda: viewpoint_apply.model_matches(vp)):
                return {"status": "needs_ifc", **found}
            matched_by_guid = True

    def run():
        if ifc_path:
            viewpoint_apply.load_ifc(ifc_path)
        return viewpoint_apply.apply(vp)

    summary = blender_bridge.run_on_main(run, timeout=LOAD_TIMEOUT)
    if matched_by_guid:
        summary["warnings"].insert(
            0, f"Shown on the loaded model {os.path.basename(loaded)}, which the topic does not name"
        )
    logger.info("Viewpoint applied: %s", ", ".join(summary["applied"]) or "nothing")
    return {"status": "applied", **summary}
