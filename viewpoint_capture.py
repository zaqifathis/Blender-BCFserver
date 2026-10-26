"""Capture the Blender view as a BCF viewpoint (BCF-API JSON), the reverse of ``viewpoint_apply``.

Main thread only (call through ``blender_bridge.run_on_main``). Reads the largest 3D view: its
camera (or the scene camera when looking through it), its clipping, the loaded models'
visibility, colours and selection by IFC GlobalId, and a PNG snapshot drawn off screen.
Lines and bitmaps are not captured.
"""

import base64
import math
import struct
import zlib

import bpy
import gpu
import numpy as np
from mathutils import Vector

from . import ifc_import, viewpoint_apply
from .log import logger

SNAPSHOT_MAX = 1500  # px, longest side; BCF recommends snapshots no larger
WHITE = (1.0, 1.0, 1.0, 1.0)  # object colour of an object nobody coloured


def _main_view():
    """(area, space, region) of the largest 3D view."""
    views = [
        (area, area.spaces.active, region)
        for window in bpy.context.window_manager.windows
        for area in window.screen.areas
        if area.type == "VIEW_3D"
        for region in area.regions
        if region.type == "WINDOW"
    ]
    if not views:
        raise RuntimeError("Open a 3D view in Blender first")
    return max(views, key=lambda v: v[2].width * v[2].height)


def _xyz(v):
    return {"x": v[0], "y": v[1], "z": v[2]}


# --- camera ---------------------------------------------------------------------------


def _view(region, rv3d):
    """(view matrix, projection matrix, orthographic, width, height) of what the view shows.

    Looking through the camera, the camera's own frame counts, not the view around it.
    """
    scene = bpy.context.scene
    if rv3d.view_perspective == "CAMERA" and scene.camera is not None:
        render = scene.render
        aspect = render.resolution_x * render.pixel_aspect_x / (render.resolution_y * render.pixel_aspect_y)
        longest = min(SNAPSHOT_MAX, max(region.width, region.height))
        width, height = (longest, longest / aspect) if aspect >= 1 else (longest * aspect, longest)
        width, height = max(1, round(width)), max(1, round(height))
        camera = scene.camera
        projection = camera.calc_matrix_camera(bpy.context.evaluated_depsgraph_get(), x=width, y=height)
        return camera.matrix_world.normalized().inverted(), projection, camera.data.type == "ORTHO", width, height
    scale = min(1.0, SNAPSHOT_MAX / max(region.width, region.height))
    width, height = max(1, round(region.width * scale)), max(1, round(region.height * scale))
    return rv3d.view_matrix.copy(), rv3d.window_matrix.copy(), not rv3d.is_perspective, width, height


def _camera(view_matrix, projection, ortho, width, height):
    world = view_matrix.inverted()
    rotation = world.to_3x3()
    camera = {
        # The models were shifted by the offset when loaded
        "camera_view_point": _xyz(world.translation + ifc_import.offset()),
        "camera_direction": _xyz(-rotation.col[2].normalized()),
        "camera_up_vector": _xyz(rotation.col[1].normalized()),
        "aspect_ratio": width / height,
    }
    # BCF gives the vertical extent: the projection's [1][1] is 2 / height (ortho) or 1 / tan(fov / 2)
    if ortho:
        return "orthogonal_camera", {**camera, "view_to_world_scale": 2 / projection[1][1]}
    return "perspective_camera", {**camera, "field_of_view": math.degrees(2 * math.atan(1 / projection[1][1]))}


# --- components -----------------------------------------------------------------------


def _hint(obj):
    """The view setup hint that sets the object's visibility, or None."""
    return next((key for cls, key in viewpoint_apply.VIEW_SETUP_HINTS if viewpoint_apply.is_a(obj, cls)), None)


def _list(guids):
    return [{"ifc_guid": guid} for guid in guids]


def _visibility(objs):
    """Default visibility, hints and exceptions that ``viewpoint_apply`` turns back into this view."""
    # guid -> (hint, visible); a guid shows when any of its objects does
    state = {}
    for obj in objs:
        hint, visible = state.get(obj[ifc_import.GUID], (_hint(obj), False))
        state[obj[ifc_import.GUID]] = (hint, visible or obj.visible_get())
    shown = [guid for guid, (hint, visible) in state.items() if hint is None and visible]
    hidden = [guid for guid, (hint, visible) in state.items() if hint is None and not visible]
    default = len(shown) >= len(hidden)  # the shorter list becomes the exceptions
    exceptions = hidden if default else shown
    hints = {key: any(v for h, v in state.values() if h == key) for _cls, key in viewpoint_apply.VIEW_SETUP_HINTS}
    # A hint shows its whole class; the hidden members are then listed, which hides them on apply
    exceptions += [guid for guid, (hint, visible) in state.items() if hint and hints[hint] and not visible]
    return {"default_visibility": default, "exceptions": _list(exceptions), "view_setup_hints": hints}


def _hex(color):
    """RGBA floats -> hex RGB, or ARGB (alpha first) when not opaque."""
    values = [round(c * 255) for c in color]
    return "".join(f"{v:02X}" for v in (values[:3] if values[3] == 255 else [values[3], *values[:3]]))


def _coloring(objs):
    groups = {}
    for obj in objs:
        if tuple(obj.color) != WHITE:
            guids = groups.setdefault(_hex(obj.color), [])
            if obj[ifc_import.GUID] not in guids:
                guids.append(obj[ifc_import.GUID])
    return [{"color": color, "components": _list(guids)} for color, guids in groups.items()]


def _shown_models():
    """``{"path", "name", "ifc_project"}`` of the loaded models with something in view."""
    shown = {ifc_import.key(o[ifc_import.MODEL]) for o in bpy.context.view_layer.objects if o.get(ifc_import.MODEL) and o.visible_get()}
    return [
        {"path": path, "name": name, "ifc_project": ifc_import.project_guid(path)}
        for path, name in ifc_import.loaded()
        if ifc_import.key(path) in shown
    ]


def _components(space):
    objs = [o for o in bpy.context.view_layer.objects if o.get(ifc_import.GUID)]
    # A model with nothing in view is left out, rather than listed object by object as hidden
    shown_models = {o.get(ifc_import.MODEL) for o in objs if o.visible_get()}
    objs = [o for o in objs if o.get(ifc_import.MODEL) in shown_models]
    selection = list(dict.fromkeys(o[ifc_import.GUID] for o in objs if o.select_get()))
    components = {"selection": _list(selection), "visibility": _visibility(objs)}
    # Object colours only show in the viewport with the object colour type
    if space.shading.type == "SOLID" and space.shading.color_type == "OBJECT":
        components["coloring"] = _coloring(o for o in objs if o.visible_get())
    return components


# --- clipping planes and snapshot -----------------------------------------------------


def _clipping(rv3d):
    if not rv3d.use_clip_planes:
        return []
    shift = ifc_import.offset()
    planes = []
    for *n, d in rv3d.clip_planes:
        normal = Vector(n)
        if normal.length < 1e-9 or abs(d) >= viewpoint_apply.NO_CLIP[3] / 2:
            continue  # unused slot
        # Blender keeps where n.p + d > 0; BCF's direction points into the clipped half
        point = -d * normal / normal.length_squared + shift
        planes.append({"location": _xyz(point), "direction": _xyz(-normal.normalized())})
    return planes


def _png(pixels):
    """Encode bottom-up RGBA rows (as OpenGL reads them) as an RGB PNG."""
    height, width = pixels.shape[:2]
    rows = np.ascontiguousarray(pixels[::-1, :, :3])
    raw = b"".join(b"\x00" + rows[y].tobytes() for y in range(height))  # filter type 0 per row

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8 bit RGB
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 6)) + chunk(b"IEND", b"")


def _snapshot(space, region, view_matrix, projection, width, height):
    offscreen = gpu.types.GPUOffScreen(width, height)
    try:
        offscreen.draw_view3d(
            bpy.context.scene,
            bpy.context.view_layer,
            space,
            region,
            view_matrix,
            projection,
            do_color_management=True,
        )
        with offscreen.bind():
            buffer = gpu.state.active_framebuffer_get().read_color(0, 0, width, height, 4, 0, "UBYTE")
    finally:
        offscreen.free()
    buffer.dimensions = width * height * 4
    pixels = np.array(buffer, dtype=np.uint8).reshape(height, width, 4)
    return {"snapshot_type": "png", "snapshot_data": base64.b64encode(_png(pixels)).decode("ascii")}


# --- entry point ----------------------------------------------------------------------


def capture():
    """Viewpoint JSON for a BCF-API POST, warnings for the web UI, and the models in view (``_shown_models``).

    BCF: exactly one camera; a camera, a snapshot or both; visualisation information (components,
    clipping planes, lines, bitmaps) only with a camera. The camera is always there, so the
    snapshot and the visualisation information are each optional.
    """
    _area, space, region = _main_view()
    rv3d = space.region_3d
    view_matrix, projection, ortho, width, height = _view(region, rv3d)
    camera_type, camera = _camera(view_matrix, projection, ortho, width, height)
    vp = {camera_type: camera}
    warnings = []

    if ifc_import.loaded():
        components = vp["components"] = _components(space)
        for label, count in (
            ("selected", len(components["selection"])),
            ("visibility exception", len(components["visibility"]["exceptions"])),
        ):
            if count > viewpoint_apply.LARGE_LIST:
                warnings.append(f"{count} {label} components: BCF asks to keep such lists under {viewpoint_apply.LARGE_LIST}")
    else:
        warnings.append("No IFC model is loaded, so the viewpoint holds no components")
    if planes := _clipping(rv3d):
        vp["clipping_planes"] = planes
    if bpy.data.collections.get(viewpoint_apply.MARKUP_NAME):
        warnings.append("Lines and bitmaps are not saved with the new viewpoint")

    try:
        vp["snapshot"] = _snapshot(space, region, view_matrix, projection, width, height)
    except Exception as e:  # e.g. no GPU; the camera alone still makes a valid viewpoint
        logger.warning("Snapshot failed: %s", e)
        warnings.append("The snapshot could not be drawn, so the viewpoint has none")
    return vp, warnings, _shown_models()
