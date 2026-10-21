"""Show a server viewpoint in Blender: fetch it, make sure its IFC models are loaded, apply it.

Runs on a web server thread; everything touching bpy goes through the main-thread bridge.
"""

import os
import urllib.parse

from . import blender_bridge, ifc_import, ifc_loader, viewpoint_apply
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

    # The topic's models stored on the server are added to the ones already loaded
    found = ifc_loader.locate(client, project_id, topic_id)
    documents = found.get("documents", [])
    for doc in documents:
        path = ifc_loader.download(client, project_id, doc)
        if not blender_bridge.run_on_main(ifc_import.is_loaded, path):
            data = ifc_import.read(path)  # parsing is the slow part, so it stays off the main thread
            blender_bridge.run_on_main(ifc_import.build, path, doc.get("filename"), data, timeout=LOAD_TIMEOUT)

    # Stored elsewhere: a model the user loaded by hand will do if it carries one of the topic's
    # file names, or else holds components of the viewpoint (file names are often logical
    # names, e.g. "BCF-ARK" for a model saved as Architectural.ifc)
    names = {n.lower(): n for n in (found.get("external") or {}).get("filenames", [])}
    loaded = blender_bridge.run_on_main(ifc_import.loaded)
    if not loaded:
        return {"status": "needs_ifc", **found}
    loaded_names = {n.lower() for path, name in loaded for n in (name, os.path.basename(path))}
    matched_by_guid = False
    if not documents and not names.keys() & loaded_names:
        if not blender_bridge.run_on_main(viewpoint_apply.model_matches, vp):
            return {"status": "needs_ifc", **found}
        matched_by_guid = True

    summary = blender_bridge.run_on_main(viewpoint_apply.apply, vp)
    if matched_by_guid:
        summary["warnings"].insert(0, "Shown on the loaded models, which the topic does not name")
    elif unloaded := sorted(n for k, n in names.items() if k not in loaded_names):
        summary["warnings"].insert(0, f"Not loaded: {', '.join(unloaded)}")
    logger.info("Viewpoint applied: %s", ", ".join(summary["applied"]) or "nothing")
    return {"status": "applied", **summary}
