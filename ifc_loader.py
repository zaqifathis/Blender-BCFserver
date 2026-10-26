"""Find the IFC model a topic refers to and fetch it from the BCF server.

No bpy. Only files stored on the server are downloaded; an external url is reported
back so the user can fetch and add the model by hand.
"""

import os
import re
import tempfile
import urllib.parse

from .log import logger

CACHE_DIR = os.path.join(tempfile.gettempdir(), "bcf_connect")
IFC_EXTENSIONS = (".ifc", ".ifczip")
CHUNK = 256 * 1024  # bytes per read when downloading a model


def _quote(value):
    return urllib.parse.quote(str(value), safe="")


def _is_ifc(name):
    return bool(name) and name.lower().endswith(IFC_EXTENSIONS)


def _web_url(value):
    return bool(value) and urllib.parse.urlparse(value).scheme in ("http", "https")


def locate(client, project_id, topic_id):
    """Where the topic's models live: ``{"documents": [{guid, filename}, ...]}`` for files on the
    server and ``{"external": {filenames, filename, url}}`` for files elsewhere, plus the GlobalIds
    of their IfcProjects as ``"projects"``. Each key is left out when empty, so ``{}`` means the
    topic names no model."""
    base = f"/projects/{_quote(project_id)}"
    files = client.get(f"{base}/topics/{_quote(topic_id)}/files") or []
    refs = client.get(f"{base}/topics/{_quote(topic_id)}/document_references") or []
    try:
        documents = {d["guid"]: d for d in client.get(f"{base}/documents") or []}
    except Exception:  # server without the Documents API
        documents = {}

    found, names, url = {}, [], None

    def stored(doc):
        if doc and _is_ifc(doc.get("filename")):
            found.setdefault(doc["guid"], doc)
            return True
        return False

    # A header file may point at a stored document by guid or by file name; the ones that don't
    # are stored elsewhere
    for f in files:
        ref, name = f.get("reference"), f.get("filename")
        doc = documents.get(ref) or next((d for d in documents.values() if name and d.get("filename") == name), None)
        if not stored(doc):
            if name:
                names.append(name)
            if _web_url(ref):
                url = url or ref
    for r in refs:
        if not stored(documents.get(r.get("document_guid"))):
            # An external reference counts when it points at an IFC file
            ref_name = os.path.basename(urllib.parse.urlparse(r.get("url") or "").path)
            if _is_ifc(ref_name):
                names.append(ref_name)
                url = url or r["url"]

    result = {}
    if found:
        result["documents"] = list(found.values())
    if names or url:
        result["external"] = {"filenames": names, "filename": ", ".join(names) or None, "url": url}
    if projects := [f["ifc_project"] for f in files if f.get("ifc_project")]:
        result["projects"] = projects
    return result


def download(client, project_id, document):
    """Download a stored document into the cache and return its path (reused if present)."""
    guid = str(document["guid"])
    ext = os.path.splitext(document.get("filename") or "")[1].lower()
    ext = ext if ext in IFC_EXTENSIONS else ".ifc"
    folder = os.path.join(CACHE_DIR, re.sub(r"[^\w.-]", "_", str(project_id)))
    path = os.path.join(folder, re.sub(r"[^\w.-]", "_", guid) + ext)
    if os.path.isfile(path):
        return path
    os.makedirs(folder, exist_ok=True)
    logger.info("Downloading %s", document.get("filename") or guid)
    part = path + ".part"
    try:
        with client.get_raw(f"/projects/{_quote(project_id)}/documents/{_quote(guid)}", stream=True) as resp:
            with open(part, "wb") as f:
                for chunk in resp.iter_content(CHUNK):
                    f.write(chunk)
        os.replace(part, path)
    finally:
        if os.path.exists(part):
            os.remove(part)
    return path
