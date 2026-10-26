"""Apply a BCF viewpoint (BCF-API JSON) to the Blender scene.

Main thread only (call through ``blender_bridge.run_on_main``). Works on the models
loaded by ``ifc_import``, matched to the viewpoint's components by IFC GlobalId. Clipping
planes cut the viewports; lines and bitmaps go into their own collection, replaced by the next
viewpoint. Bitmaps are read from the local file the caller put in each bitmap's ``"file"``.
"""

import math

import bpy
from mathutils import Matrix, Vector

from . import ifc_import

CAMERA_NAME = "BCF Viewpoint"
MARKUP_NAME = "BCF Markup"  # collection of the viewpoint's lines and bitmaps
LINES_NAME = "BCF Lines"
LINE_COLOR = (1.0, 0.0, 0.0, 1.0)  # BCF gives lines no colour or width
LINE_RADIUS = 0.03  # metres
MAX_CLIP_PLANES = 6  # what a Blender viewport holds
NO_CLIP = (0.0, 0.0, 1.0, 1e9)  # fills unused clip planes: keeps everything
LARGE_LIST = 1000  # spec: alert the user above this many listed components


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


def _view3d_overrides():
    """Context overrides for running operators in each 3D view."""
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                region = next((r for r in area.regions if r.type == "WINDOW"), None)
                if region:
                    yield {"window": window, "screen": window.screen, "area": area, "region": region}


# --- camera ---------------------------------------------------------------------------


def _vec(p):
    return Vector((p["x"], p["y"], p["z"]))


def _apply_camera(vp):
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
    # The models were shifted by the same offset when loaded
    loc = _vec(cam["camera_view_point"]) - ifc_import.offset()
    obj.matrix_world = Matrix([[right[i], up[i], back[i], loc[i]] for i in range(3)] + [[0, 0, 0, 1]])

    scene.camera = obj
    for _area, space in _view3d_spaces():
        space.region_3d.view_perspective = "CAMERA"
    return True


# --- components -----------------------------------------------------------------------


def _objects_for(guid, index):
    """The guid's objects in the current view layer (one per model that holds it)."""
    layer = bpy.context.view_layer.objects
    return [o for o in index.get(guid, ()) if layer.get(o.name)]


def _parts(element):
    """Decomposed parts of ``element``, recursively (e.g. a curtain wall's plates and members).

    Only decomposition counts: the spec says spatial containment is ignored for visibility.
    """
    for rel in getattr(element, "IsDecomposedBy", None) or ():
        for part in rel.RelatedObjects:
            yield part
            yield from _parts(part)


def _objects(components, index, missing):
    """Blender objects of the components, plus those of their decomposed parts."""
    objs, seen = [], set()

    def add(obj):
        if obj.name not in seen:
            seen.add(obj.name)
            objs.append(obj)

    for c in components or []:
        guid = c.get("ifc_guid")
        element = ifc_import.element(guid) if guid else None
        own = _objects_for(guid, index) if guid else []
        for obj in own:
            add(obj)
        found = bool(own)
        for part in _parts(element) if element is not None else ():
            for part_obj in _objects_for(part.GlobalId, index):
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


def _is_a(obj, cls):
    element = ifc_import.element(obj[ifc_import.GUID])
    # The stored class stands in when the model's file can no longer be read
    return element.is_a(cls) if element is not None else obj.get(ifc_import.CLASS) == cls


def _apply_visibility(vis, index, missing):
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
    exceptions = {o.name for o in _objects(vis.get("exceptions"), index, missing)}

    for obj in bpy.context.view_layer.objects:
        if not obj.get(ifc_import.GUID):
            continue
        visible = next((v for cls, v in class_defaults if _is_a(obj, cls)), default)
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


def _apply_coloring(coloring, index, missing):
    count = 0
    for group in coloring:
        color = _parse_color(group["color"])
        for obj in _objects(group.get("components"), index, missing):
            if SAVED_COLOR not in obj:
                obj[SAVED_COLOR] = list(obj.color)
            obj.color = color
            count += 1
    if count:
        for _area, space in _view3d_spaces():
            _saved_shading.setdefault(id(space), (space, space.shading.color_type))
            space.shading.color_type = "OBJECT"
    return count


def _apply_selection(selection, index, missing):
    objs = _objects(selection, index, missing)
    for obj in bpy.context.view_layer.objects:
        obj.select_set(False)
    for obj in objs:
        obj.select_set(True)
    if objs:
        bpy.context.view_layer.objects.active = objs[0]
    return len(objs)


# --- clipping planes, lines and bitmaps -----------------------------------------------


def _apply_clipping(planes):
    """Cut the viewports with the planes, as Alt+B does. Returns how many were left out."""
    shift = ifc_import.offset()
    clip = []
    for plane in planes:
        direction = _vec(plane["direction"])
        if direction.length < 1e-9 or len(clip) == MAX_CLIP_PLANES:
            continue  # a zero direction would clip everything
        direction.normalize()
        # BCF's direction points into the clipped half; Blender keeps where n.p + d > 0
        clip.append((*-direction, direction.dot(_vec(plane["location"]) - shift)))
    if clip:
        for override in _view3d_overrides():
            rv3d = override["area"].spaces.active.region_3d
            if not rv3d.use_clip_planes:
                # Setting the planes alone does not cut solid shading: Alt+B over the whole view
                # sets up the clipping state the draw engines need, then the planes are replaced
                region = override["region"]
                with bpy.context.temp_override(**override):
                    bpy.ops.view3d.clip_border(
                        xmin=0, xmax=region.width, ymin=0, ymax=region.height, wait_for_input=False
                    )
            rv3d.clip_planes = clip + [NO_CLIP] * (MAX_CLIP_PLANES - len(clip))
    return len(planes) - len(clip)


def _markup_collection():
    collection = bpy.data.collections.get(MARKUP_NAME)
    if collection is None:
        collection = bpy.data.collections.new(MARKUP_NAME)
    if collection.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(collection)
    return collection


def _apply_lines(lines):
    shift = ifc_import.offset()
    curve = bpy.data.curves.new(LINES_NAME, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = LINE_RADIUS
    for line in lines:
        spline = curve.splines.new("POLY")
        spline.points.add(1)
        for point, key in zip(spline.points, ("start_point", "end_point")):
            point.co = (*(_vec(line[key]) - shift), 1.0)
    mat = bpy.data.materials.get(LINES_NAME) or bpy.data.materials.new(LINES_NAME)
    mat.diffuse_color = LINE_COLOR
    curve.materials.append(mat)
    obj = bpy.data.objects.new(LINES_NAME, curve)
    obj.color = LINE_COLOR  # shown when colouring switched the viewport to object colours
    _markup_collection().objects.link(obj)


def _apply_bitmaps(bitmaps):
    """Show each bitmap as an image empty. Returns how many could not be shown."""
    shift = ifc_import.offset()
    skipped = 0
    for bitmap in bitmaps:
        path = bitmap.get("file")
        try:
            image = bpy.data.images.load(path, check_existing=False) if path else None
        except RuntimeError:
            image = None
        if image is None or not image.size[1]:
            skipped += 1
            continue
        image.pack()  # the downloaded file is only cached, the .blend keeps the image

        normal = _vec(bitmap["normal"]).normalized()
        right = _vec(bitmap["up"]).cross(normal)
        if right.length < 1e-9:
            bpy.data.images.remove(image)
            skipped += 1
            continue
        right.normalize()
        up = normal.cross(right)
        loc = _vec(bitmap["location"]) - shift

        obj = bpy.data.objects.new(f"BCF Bitmap {bitmap.get('guid', '')}".strip(), None)
        obj.empty_display_type = "IMAGE"
        obj.data = image
        obj.use_empty_image_alpha = True
        # The empty's size is the image's longer side; BCF gives the height
        width, height = image.size
        obj.empty_display_size = bitmap["height"] * max(width, height) / height
        obj.matrix_world = Matrix([[right[i], up[i], normal[i], loc[i]] for i in range(3)] + [[0, 0, 0, 1]])
        _markup_collection().objects.link(obj)
    return skipped


def _clear_markup():
    """Remove the lines, bitmaps and clipping a viewpoint added."""
    collection = bpy.data.collections.get(MARKUP_NAME)
    if collection is not None:
        for obj in list(collection.objects):
            data = obj.data
            bpy.data.objects.remove(obj)
            if isinstance(data, bpy.types.Curve) and data.users == 0:
                bpy.data.curves.remove(data)
            elif isinstance(data, bpy.types.Image) and data.users == 0:
                bpy.data.images.remove(data)
        bpy.data.collections.remove(collection)
    for override in _view3d_overrides():
        if override["area"].spaces.active.region_3d.use_clip_planes:
            # Alt+B again: clearing use_clip_planes alone leaves the view cut
            with bpy.context.temp_override(**override):
                bpy.ops.view3d.clip_border("INVOKE_DEFAULT")


# --- entry points ---------------------------------------------------------------------


def _guids(vp):
    components = vp.get("components") or {}
    groups = [components.get("selection"), (components.get("visibility") or {}).get("exceptions")]
    groups += [c.get("components") for c in components.get("coloring") or []]
    return {c["ifc_guid"] for group in groups for c in group or [] if c.get("ifc_guid")}


def model_matches(vp):
    """Whether the loaded models hold any component the viewpoint refers to."""
    index = ifc_import.objects_by_guid()
    # Elements without geometry of their own (e.g. a curtain wall made of its parts) have no object
    return any(guid in index or ifc_import.element(guid) is not None for guid in _guids(vp))


def apply(vp):
    """Apply viewpoint JSON to the loaded models. Returns a summary for the web UI."""
    if not ifc_import.loaded():
        raise RuntimeError("No IFC model is loaded")
    index = ifc_import.objects_by_guid()
    warnings, applied, missing = [], [], []

    try:
        if _apply_camera(vp):
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
        _apply_visibility(components["visibility"], index, missing)
        applied.append("visibility")
    if components.get("coloring"):
        _apply_coloring(components["coloring"], index, missing)
        applied.append("coloring")
    if components.get("selection") is not None:
        _apply_selection(components["selection"], index, missing)
        applied.append("selection")

    _clear_markup()  # what the previous viewpoint drew
    if planes := vp.get("clipping_planes"):
        if left_out := _apply_clipping(planes):
            warnings.append(
                f"{left_out} clipping plane(s) left out: Blender shows at most {MAX_CLIP_PLANES}, "
                "and a plane needs a direction"
            )
        if left_out < len(planes):
            applied.append("clipping planes")
    if lines := vp.get("lines"):
        _apply_lines(lines)
        applied.append("lines")
    if bitmaps := vp.get("bitmaps"):
        skipped = _apply_bitmaps(bitmaps)
        if skipped:
            warnings.append(f"{skipped} bitmap(s) could not be shown")
        if skipped < len(bitmaps):
            applied.append("bitmaps")
    if missing:
        warnings.append(f"{len(set(missing))} component(s) not found in the loaded models")
    for _area, space in _view3d_spaces():
        space.region_3d.update()
    return {"applied": applied, "missing": len(set(missing)), "warnings": warnings}


def reset():
    """Undo the visibility, colours, clipping, lines and bitmaps set by viewpoints (the camera
    object stays)."""
    _clear_markup()
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
