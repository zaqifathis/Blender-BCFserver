"""Apply a BCF viewpoint (BCF-API JSON) to the Blender scene.

Main thread only (call through ``blender_bridge.run_on_main``). The IFC model is
loaded and queried through Bonsai, imported lazily so the add-on loads without it.
"""

import math

import bpy
from mathutils import Matrix, Vector

from .log import logger

CAMERA_NAME = "BCF Viewpoint"
LARGE_LIST = 1000  # spec: alert the user above this many listed components


class BonsaiMissing(RuntimeError):
    pass


def _bonsai():
    try:
        from bonsai import tool
    except ImportError as e:
        raise BonsaiMissing("Bonsai is required to show viewpoints: install the Bonsai extension") from e
    return tool


# Original state of the objects a viewpoint touched, kept on the objects themselves so
# reset() still works after the add-on (and its module state) is reloaded
SAVED_HIDE = "bcf_saved_hide"
SAVED_COLOR = "bcf_saved_color"
# Viewport shading is not an ID, so it can only be remembered in memory
_saved_shading = {}


def _view3d_spaces():
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                for space in area.spaces:
                    if space.type == "VIEW_3D":
                        yield area, space


def _viewport_override():
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                region = next((r for r in area.regions if r.type == "WINDOW"), None)
                if region:
                    return {"window": window, "screen": window.screen, "area": area, "region": region}
    return {}


def loaded_path():
    """Path of the IFC file Bonsai has loaded, or None."""
    tool = _bonsai()
    return (tool.Ifc.get_path() or "") if tool.Ifc.get() is not None else None


def unload_model():
    """Remove the loaded model: its Blender objects and Bonsai's IFC data."""
    tool = _bonsai()
    if tool.Ifc.get() is None:
        return
    for obj in [o for o in bpy.data.objects if tool.Ifc.get_entity(o) is not None]:
        bpy.data.objects.remove(obj)
    bpy.ops.bim.convert_to_blender()
    _saved_shading.clear()
    logger.info("Unloaded the previous IFC model")


def load_ifc(path):
    """Load ``path`` into Bonsai, replacing any model already loaded."""
    tool = _bonsai()
    unload_model()
    with bpy.context.temp_override(**_viewport_override()):
        bpy.ops.bim.load_project(filepath=path, should_start_fresh_session=False)
    if tool.Ifc.get() is None:
        raise RuntimeError("Bonsai could not load the IFC file; see the Blender console")
    logger.info("Loaded IFC model %s", path)


# --- camera ---------------------------------------------------------------------------


def _vec(p):
    return Vector((p["x"], p["y"], p["z"]))


def _to_local(matrix, tool):
    """Undo Bonsai's georeference offset, as Bonsai does for its own BCF viewpoints."""
    props = tool.Georeference.get_georeference_props()
    if not props.has_blender_offset:
        return matrix
    import ifcopenshell.util.geolocation
    import ifcopenshell.util.unit
    import numpy as np

    scale = ifcopenshell.util.unit.calculate_unit_scale(tool.Ifc.get())
    local = ifcopenshell.util.geolocation.global2local(
        np.array(matrix),
        float(props.blender_offset_x) * scale,
        float(props.blender_offset_y) * scale,
        float(props.blender_offset_z) * scale,
        float(props.blender_x_axis_abscissa),
        float(props.blender_x_axis_ordinate),
    )
    return local.tolist()


def _apply_camera(vp, tool):
    ortho, persp = vp.get("orthogonal_camera"), vp.get("perspective_camera")
    cam = ortho or persp
    if not cam:
        return False

    obj = bpy.data.objects.get(CAMERA_NAME)
    if obj is None or obj.type != "CAMERA":
        obj = bpy.data.objects.new(CAMERA_NAME, bpy.data.cameras.new(CAMERA_NAME))
        bpy.context.scene.collection.objects.link(obj)
    data = obj.data
    # BCF gives the vertical extent (field of view or view-to-world scale) and width / height
    data.sensor_fit = "VERTICAL"
    data.shift_x = data.shift_y = 0.0
    scene = bpy.context.scene
    aspect = cam.get("aspect_ratio") or 1.0  # spec: assume 1.0 when missing (older BCF)
    scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1.0
    scene.render.resolution_x = max(1, round(scene.render.resolution_y * aspect))
    if ortho:
        data.type = "ORTHO"
        data.ortho_scale = ortho["view_to_world_scale"]
    else:
        data.type = "PERSP"
        data.angle_y = math.radians(persp["field_of_view"])

    back = -_vec(cam["camera_direction"]).normalized()
    up = _vec(cam["camera_up_vector"]).normalized()
    right = up.cross(back)
    if right.length < 1e-9:
        # Spec: the vectors may be neither zero length nor parallel
        raise ValueError("The viewpoint camera direction and up vector are zero or parallel")
    right.normalize()
    up = back.cross(right)
    loc = _vec(cam["camera_view_point"])
    matrix = [[right[i], up[i], back[i], loc[i]] for i in range(3)] + [[0, 0, 0, 1]]
    obj.matrix_world = Matrix(_to_local(matrix, tool))

    scene.camera = obj
    for _area, space in _view3d_spaces():
        space.region_3d.view_perspective = "CAMERA"
    return True


# --- components -----------------------------------------------------------------------


def _object_for(guid, tool):
    obj = tool.Ifc.get_object_by_identifier(guid)
    if obj is not None and bpy.context.view_layer.objects.get(obj.name):
        return obj
    return None


def _element_for(guid, tool):
    try:
        return tool.Ifc.get().by_guid(guid)
    except RuntimeError:
        return None


def _parts(element):
    """Decomposed parts of ``element``, recursively (e.g. a curtain wall's plates and members).

    Only decomposition counts: the spec says spatial containment is ignored for visibility.
    """
    for rel in getattr(element, "IsDecomposedBy", None) or ():
        for part in rel.RelatedObjects:
            yield part
            yield from _parts(part)


def _objects(components, tool, missing):
    """Blender objects of the components, plus those of their decomposed parts."""
    objs, seen = [], set()

    def add(obj):
        if obj.name not in seen:
            seen.add(obj.name)
            objs.append(obj)

    for c in components or []:
        guid = c.get("ifc_guid")
        element = _element_for(guid, tool) if guid else None
        obj = _object_for(guid, tool) if guid else None
        if obj is not None:
            add(obj)
        found = obj is not None
        for part in _parts(element) if element is not None else ():
            part_obj = tool.Ifc.get_object(part)
            if part_obj is not None and bpy.context.view_layer.objects.get(part_obj.name):
                add(part_obj)
                found = True
        if not found:
            missing.append(guid or c.get("authoring_tool_id") or "?")
    return objs


def _remember_hide(obj):
    if SAVED_HIDE not in obj:
        obj[SAVED_HIDE] = [int(obj.hide_get()), int(obj.hide_viewport)]


def _set_hidden(obj, hidden):
    _remember_hide(obj)
    obj.hide_set(hidden)
    if not hidden:
        obj.hide_viewport = False  # Bonsai loads spaces (and openings) disabled in viewports


def _apply_visibility(vis, tool, missing):
    """Spec order: default visibility, then the category hints, then the exceptions."""
    default = bool(vis.get("default_visibility", False))
    hints = vis.get("view_setup_hints") or {}
    # Each hint acts as the default visibility for its own class only
    class_defaults = [
        (cls, bool(hints.get(key, False)))
        for cls, key in (
            ("IfcSpace", "spaces_visible"),
            ("IfcRelSpaceBoundary", "space_boundaries_visible"),
            ("IfcOpeningElement", "openings_visible"),
        )
    ]
    exceptions = {o.name for o in _objects(vis.get("exceptions"), tool, missing)}

    for obj in bpy.context.view_layer.objects:
        element = tool.Ifc.get_entity(obj)
        if element is None:
            continue
        visible = next((v for cls, v in class_defaults if element.is_a(cls)), default)
        if obj.name in exceptions:
            # Exceptions invert what the default and the hints decided (see the spec's example:
            # with SpacesVisible a listed space is hidden, even though DefaultVisibility is false)
            visible = not visible
        _set_hidden(obj, not visible)


def _parse_color(value):
    """Hex ARGB (8 digits, alpha first) or RGB (6 digits) -> linear-ish RGBA floats."""
    value = value.lstrip("#")
    if len(value) == 6:
        value = "FF" + value
    a, r, g, b = (int(value[i : i + 2], 16) / 255 for i in (0, 2, 4, 6))
    return (r, g, b, a)


def _apply_coloring(coloring, tool, missing):
    count = 0
    for group in coloring:
        color = _parse_color(group["color"])
        for obj in _objects(group.get("components"), tool, missing):
            if SAVED_COLOR not in obj:
                obj[SAVED_COLOR] = list(obj.color)
            obj.color = color
            count += 1
    if count:
        for _area, space in _view3d_spaces():
            _saved_shading.setdefault(id(space), (space, space.shading.color_type))
            space.shading.color_type = "OBJECT"
    return count


def _apply_selection(selection, tool, missing):
    objs = _objects(selection, tool, missing)
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    for obj in objs:
        obj.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]
    return len(objs)


# --- entry points ---------------------------------------------------------------------


def _guids(vp):
    components = vp.get("components") or {}
    groups = [components.get("selection"), (components.get("visibility") or {}).get("exceptions")]
    groups += [c.get("components") for c in components.get("coloring") or []]
    return {c["ifc_guid"] for group in groups for c in group or [] if c.get("ifc_guid")}


def model_matches(vp):
    """Whether the loaded model holds any component the viewpoint refers to."""
    tool = _bonsai()
    if tool.Ifc.get() is None:
        return False
    return any(_element_for(guid, tool) is not None for guid in _guids(vp))


def apply(vp):
    """Apply viewpoint JSON to the loaded model. Returns a summary for the web UI."""
    tool = _bonsai()
    if tool.Ifc.get() is None:
        raise RuntimeError("No IFC model is loaded in Bonsai")
    warnings, applied, missing = [], [], []

    try:
        if _apply_camera(vp, tool):
            applied.append("camera")
        else:
            warnings.append("The server sent no camera for this viewpoint, so the view was not moved")
    except ValueError as e:
        warnings.append(f"{e}, so the view was not moved")

    components = vp.get("components") or {}
    for label, count in (
        ("selected", len(components.get("selection") or [])),
        ("visibility exception", len((components.get("visibility") or {}).get("exceptions") or [])),
        ("coloured", sum(len(c.get("components") or []) for c in components.get("coloring") or [])),
    ):
        if count > LARGE_LIST:
            warnings.append(f"{count} {label} components: BCF asks to keep such lists under {LARGE_LIST}")
    if components.get("visibility") is not None:
        _apply_visibility(components["visibility"], tool, missing)
        applied.append("visibility")
    if components.get("coloring"):
        _apply_coloring(components["coloring"], tool, missing)
        applied.append("coloring")
    if components.get("selection") is not None:
        _apply_selection(components["selection"], tool, missing)
        applied.append("selection")

    for key, label in (("clipping_planes", "clipping planes"), ("lines", "lines"), ("bitmaps", "bitmaps")):
        if vp.get(key):
            warnings.append(f"Viewpoint {label} are not shown yet")
    if missing:
        warnings.append(f"{len(set(missing))} component(s) not found in the loaded model")
    for _area, space in _view3d_spaces():
        space.region_3d.update()
    return {"applied": applied, "missing": len(set(missing)), "warnings": warnings}


def reset():
    """Undo the visibility and colours set by viewpoints (the camera object stays)."""
    for obj in bpy.data.objects:
        if SAVED_HIDE in obj:
            hidden, hide_viewport = obj[SAVED_HIDE]
            if bpy.context.view_layer.objects.get(obj.name):
                obj.hide_set(bool(hidden))
            obj.hide_viewport = bool(hide_viewport)
            del obj[SAVED_HIDE]
        if SAVED_COLOR in obj:
            obj.color = tuple(obj[SAVED_COLOR])
            del obj[SAVED_COLOR]
    for space, color_type in _saved_shading.values():
        try:
            space.shading.color_type = color_type
        except ReferenceError:
            pass
    _saved_shading.clear()
