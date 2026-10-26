"""Load several IFC models into the scene with ifcopenshell, and remove them again.

ifcopenshell is not bundled: it is the copy the Bonsai extension installs, imported lazily so the
add-on loads without it. ``read`` touches no bpy and may run on a worker thread; everything else
runs on the main thread.

What is loaded lives in the .blend, so it survives an add-on reload or reopening the file: the
model list on the scene, one collection per model, and each object's IFC GlobalId and model path.
The opened IFC files are only cached in memory, for decomposition and class lookups.
"""

import multiprocessing
import os

import bpy
from mathutils import Matrix, Vector

from .log import logger

GUID = "bcf_guid"
CLASS = "bcf_class"
MODEL = "bcf_model"
MATERIAL_TAG = "bcf_ifc"  # marks the materials made here, so they can be shared and cleaned up
FAR = 1000.0  # metres; models placed farther from the origin are shifted to keep float precision
HIDDEN_CLASSES = ("IfcSpace",)  # loaded hidden, as Bonsai does

_files = {}  # model key -> opened ifcopenshell.file


class IfcOpenShellMissing(RuntimeError):
    pass


def _ifcopenshell():
    try:
        import ifcopenshell
        import ifcopenshell.geom
    except ImportError as e:
        raise IfcOpenShellMissing("ifcopenshell is required to load IFC models: install the Bonsai extension") from e
    return ifcopenshell


def key(path):
    return os.path.normcase(os.path.abspath(path))


def _props():
    return bpy.context.scene.bcf_connect


def loaded():
    """``(path, name)`` of every loaded model."""
    return [(m.filepath, m.name) for m in _props().models]


def is_loaded(path):
    return any(key(m.filepath) == key(path) for m in _props().models)


def offset():
    return Vector(_props().origin_offset)


def file_for(path):
    """The opened IFC file of a loaded model, or None when it can no longer be read."""
    k = key(path)
    if k not in _files:
        try:
            _files[k] = _ifcopenshell().open(path)
        except Exception as e:
            logger.warning("Cannot read %s: %s", path, e)
            _files[k] = None
    return _files[k]


def element(guid):
    """The IFC element with this GlobalId in any loaded model, or None."""
    for path, _name in loaded():
        f = file_for(path)
        if f is None:
            continue
        try:
            return f.by_guid(guid)
        except RuntimeError:
            pass
    return None


def project_guid(path):
    """GlobalId of a loaded model's IfcProject, or None."""
    f = file_for(path)
    projects = f.by_type("IfcProject") if f is not None else ()
    return projects[0].GlobalId if projects else None


def objects_by_guid():
    """GlobalId -> Blender objects; a GlobalId may be in more than one model."""
    index = {}
    for obj in bpy.data.objects:
        guid = obj.get(GUID)
        if guid:
            index.setdefault(guid, []).append(obj)
    return index


# --- reading (no bpy) -----------------------------------------------------------------


def _color(material):
    r, g, b = material.diffuse.components
    t = material.transparency
    return (r, g, b, 1.0 - (t if t == t else 0.0))  # t != t: NaN, no transparency given


def read(path):
    """Parse ``path`` and triangulate its elements. Returns plain data for ``build``."""
    ifcopenshell = _ifcopenshell()
    logger.info("Reading %s", os.path.basename(path))
    f = ifcopenshell.open(path)
    _files[key(path)] = f

    # Openings and other features are already cut out of their host elements
    features = f.by_type("IfcFeatureElement")
    settings = ifcopenshell.geom.settings()
    it = ifcopenshell.geom.iterator(settings, f, multiprocessing.cpu_count(), exclude=features or None)
    geometries, shapes = {}, []
    if it.initialize():
        while True:
            shape = it.get()
            g = shape.geometry
            if g.id not in geometries:
                geometries[g.id] = {
                    "verts": tuple(g.verts),
                    "faces": tuple(g.faces),
                    "material_ids": tuple(g.material_ids),
                    "colors": [_color(m) for m in g.materials],
                }
            shapes.append((shape.guid, shape.type, shape.name, g.id, tuple(shape.transformation.matrix)))
            if not it.next():
                break
    return {"geometries": geometries, "shapes": shapes}


# --- building (main thread) -----------------------------------------------------------


def _matrix(m):
    """Column-major 16 floats -> Matrix."""
    return Matrix([[m[i], m[4 + i], m[8 + i], m[12 + i]] for i in range(4)])


def _material(color):
    name = "IFC #" + "".join(f"{round(c * 255):02X}" for c in color)
    mat = bpy.data.materials.get(name)
    if mat is None or not mat.get(MATERIAL_TAG):
        mat = bpy.data.materials.new(name)
        mat[MATERIAL_TAG] = True
        mat.diffuse_color = color
        mat.use_nodes = True
        node = next((n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if node is not None:
            node.inputs["Base Color"].default_value = color
            node.inputs["Alpha"].default_value = color[3]
    return mat


def _mesh(name, geometry):
    verts, faces = geometry["verts"], geometry["faces"]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(
        [verts[i : i + 3] for i in range(0, len(verts), 3)],
        [],
        [faces[i : i + 3] for i in range(0, len(faces), 3)],
    )
    colors = geometry["colors"]
    for color in colors:
        mesh.materials.append(_material(color))
    ids = geometry["material_ids"]
    if colors and len(ids) == len(mesh.polygons):
        # -1: no style on that face, left on the first slot
        mesh.polygons.foreach_set("material_index", [max(i, 0) for i in ids])
    mesh.update()
    return mesh


def _choose_offset(shapes):
    """Shift far-away models (e.g. placed in map coordinates) close to the origin."""
    points = [Vector(m[12:15]) for *_rest, m in shapes]
    if not points or max(p.length for p in points) < FAR:
        return Vector()
    centre = sum(points, Vector()) / len(points)
    return Vector([round(c) for c in centre])


def build(path, name, data):
    """Create the Blender objects of a model read with ``read`` and add it to the list."""
    props = _props()
    name = name or os.path.basename(path)
    if is_loaded(path):
        return False
    if not props.models:
        props.origin_offset = _choose_offset(data["shapes"])
    shift = Matrix.Translation(-offset())

    collection = bpy.data.collections.new(f"IFC {name}")
    bpy.context.scene.collection.children.link(collection)
    meshes = {}
    wm = bpy.context.window_manager
    wm.progress_begin(0, max(1, len(data["shapes"])))
    try:
        for n, (guid, cls, label, gid, matrix) in enumerate(data["shapes"]):
            mesh = meshes.get(gid)
            if mesh is None:
                mesh = meshes[gid] = _mesh(f"{name}/{gid}", data["geometries"][gid])
            obj = bpy.data.objects.new(f"{cls}/{label or guid}", mesh)
            obj[GUID], obj[CLASS], obj[MODEL] = guid, cls, path
            obj.matrix_world = shift @ _matrix(matrix)
            collection.objects.link(obj)
            if cls in HIDDEN_CLASSES:
                obj.hide_set(True)
            wm.progress_update(n)
    finally:
        wm.progress_end()

    model = props.models.add()
    model.filepath, model.name, model.collection = path, name, collection.name
    props.active_model = len(props.models) - 1
    logger.info("Loaded IFC model %s (%d objects)", name, len(data["shapes"]))
    return True


def add(path, name=None):
    """Load ``path`` unless it is loaded already. Returns whether it was added."""
    if is_loaded(path):
        return False
    return build(path, name, read(path))


def remove(index):
    """Remove a model: its objects, the meshes and materials only it used, and its collection."""
    props = _props()
    model = props.models[index]
    path, name = model.filepath, model.name
    collection = bpy.data.collections.get(model.collection)
    objs = [o for o in bpy.data.objects if o.get(MODEL) and key(o[MODEL]) == key(path)]
    meshes = {o.data for o in objs if o.type == "MESH"}
    for obj in objs:
        bpy.data.objects.remove(obj)
    for mesh in meshes:
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)
    for mat in [m for m in bpy.data.materials if m.get(MATERIAL_TAG) and m.users == 0]:
        bpy.data.materials.remove(mat)
    if collection is not None and not collection.all_objects:
        bpy.data.collections.remove(collection)
    bpy.context.view_layer.update()  # else the view layer still lists the removed objects as None

    _files.pop(key(path), None)
    props.models.remove(index)
    props.active_model = max(0, min(props.active_model, len(props.models) - 1))
    if not props.models:
        props.origin_offset = (0.0, 0.0, 0.0)
    logger.info("Removed IFC model %s", name)
