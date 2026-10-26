"""Show a server viewpoint in Blender: fetch it, make sure its IFC models are loaded, apply it.
Or the other way: capture the Blender view and add it to a topic.

Runs on a web server thread; everything touching bpy goes through the main-thread bridge.
"""

import os
import re
import urllib.parse

from . import blender_bridge, ifc_import, ifc_loader, viewpoint_apply, viewpoint_capture
from .log import logger

LOAD_TIMEOUT = 300  # seconds; loading a large model takes a while


def _quote(value):
    return urllib.parse.quote(str(value), safe="")


def _fetch_bitmaps(client, vp_url, vp):
    """Download the viewpoint's bitmap images into the cache, noting each path as ``"file"``."""
    folder = os.path.join(ifc_loader.CACHE_DIR, "bitmaps")
    for bitmap in vp.get("bitmaps") or []:
        guid = bitmap.get("guid")
        if not guid:
            continue
        ext = "png" if bitmap.get("bitmap_type") == "png" else "jpg"
        path = os.path.join(folder, re.sub(r"[^\w.-]", "_", str(guid)) + "." + ext)
        try:
            if not os.path.isfile(path):
                resp = client.get_raw(f"{vp_url}/bitmaps/{_quote(guid)}")
                os.makedirs(folder, exist_ok=True)
                with open(path, "wb") as f:
                    f.write(resp.content)
            bitmap["file"] = path
        except Exception as e:
            logger.warning("Bitmap %s unavailable: %s", guid, e)


def show(client, p):
    """Reply ``{"status": "applied", ...summary}`` or ``{"status": "needs_ifc", "external": {...}}``."""
    project_id, topic_id = p["project_id"], p["topic_id"]
    logger.info("Showing viewpoint %s in Blender", p["viewpoint_id"])
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
    _fetch_bitmaps(client, vp_url, vp)

    # The topic's models stored on the server are added to the ones already loaded
    found = ifc_loader.locate(client, project_id, topic_id)
    documents = found.get("documents", [])
    topic_paths = []
    for doc in documents:
        path = ifc_loader.download(client, project_id, doc)
        topic_paths.append(path)
        if not blender_bridge.run_on_main(ifc_import.is_loaded, path):
            data = ifc_import.read(path)  # parsing is the slow part, so it stays off the main thread
            blender_bridge.run_on_main(ifc_import.build, path, doc.get("filename"), data, timeout=LOAD_TIMEOUT)

    # Stored elsewhere: a model the user loaded by hand will do if it carries one of the topic's
    # file names or IfcProjects, or else holds components of the viewpoint (file names are often
    # logical names, e.g. "BCF-ARK" for a model saved as Architectural.ifc)
    names = {n.lower(): n for n in (found.get("external") or {}).get("filenames", [])}
    projects = set(found.get("projects", []))
    loaded = blender_bridge.run_on_main(ifc_import.loaded)
    if not loaded:
        return {"status": "needs_ifc", **found}
    loaded_names = {n.lower() for path, name in loaded for n in (name, os.path.basename(path))}
    topic_paths += [
        path
        for path, name in loaded
        if {name.lower(), os.path.basename(path).lower()} & names.keys()
        or (projects and blender_bridge.run_on_main(ifc_import.project_guid, path) in projects)
    ]
    if not topic_paths and not blender_bridge.run_on_main(viewpoint_apply.model_matches, vp):
        return {"status": "needs_ifc", **found}
    if topic_paths:
        # A model holding what the viewpoint selects, colours or shows is the topic's too, even when the
        # header does not name it (e.g. an element selected in another model)
        keys = {ifc_import.key(path) for path in topic_paths}
        topic_paths += [
            path for path in blender_bridge.run_on_main(viewpoint_apply.models_holding, vp) if ifc_import.key(path) not in keys
        ]

    # The other loaded models are hidden, unless the topic's own could not be told apart
    summary = blender_bridge.run_on_main(viewpoint_apply.apply, vp, topic_paths or None)
    if not topic_paths:
        summary["warnings"].insert(0, "Shown on the loaded models, which the topic does not name")
    elif unloaded := sorted(n for k, n in names.items() if k not in loaded_names):
        summary["warnings"].insert(0, f"Not loaded: {', '.join(unloaded)}")
    # The web panel only shows errors, so progress and results go to the BCF Log
    logger.info("Viewpoint applied: %s", ", ".join(summary["applied"]) or "nothing")
    for warning in summary["warnings"]:
        logger.warning(warning)
    return {"status": "applied", **summary}


def _add_topic_files(client, topic_url, models):
    """Name the models in view in the topic's header files, where BCF keeps the models a topic uses; showing
    a viewpoint hides the loaded models the header does not name. Returns messages for the web UI.

    The header belongs to the whole topic, so its other viewpoints show these models too.
    """
    header = client.get(f"{topic_url}/files") or []
    names = {(f.get("filename") or "").lower() for f in header}
    projects = {f.get("ifc_project") for f in header if f.get("ifc_project")}
    missing = [
        m
        for m in models
        if not ({m["name"].lower(), os.path.basename(m["path"]).lower()} & names or m["ifc_project"] in projects)
    ]
    if not missing:
        return []
    added = ", ".join(m["name"] for m in missing)
    entries = [{"filename": m["name"], **({"ifc_project": m["ifc_project"]} if m["ifc_project"] else {})} for m in missing]
    try:
        client.send("PUT", f"{topic_url}/files", header + entries)  # PUT replaces the list, so the old entries go along
    except Exception as e:
        logger.warning("Topic files not updated: %s", e)
        return [f"{added} could not be added to the topic's files, so showing this viewpoint will hide it"]
    logger.info("Added to the topic files: %s", added)
    return [f"Added {added} to the topic's files"]


def create(client, p):
    """Add the Blender view to the topic; reply ``{"viewpoint": <server's viewpoint>, "warnings": [...]}``."""
    logger.info("Capturing the Blender view")
    vp, warnings, models = blender_bridge.run_on_main(viewpoint_capture.capture)
    topic_url = f"/projects/{_quote(p['project_id'])}/topics/{_quote(p['topic_id'])}"
    created = client.send("POST", f"{topic_url}/viewpoints", vp)
    logger.info("Viewpoint added from Blender: %s", (created or {}).get("guid"))
    warnings += _add_topic_files(client, topic_url, models)
    for warning in warnings:
        logger.warning(warning)  # the web panel only shows errors; this goes to the BCF Log
    return {"viewpoint": created, "warnings": warnings}
