if "bpy" in locals():
    import importlib

    importlib.reload(properties)
    importlib.reload(operators)
    importlib.reload(panel)
else:
    from . import properties, operators, panel

import bpy

classes = (
    properties.BCFConnectProperties,
    properties.BCFConnectPreferences,
    operators.BCF_OT_connect,
    operators.BCF_OT_start_ws_server,
    panel.BCF_PT_main_panel,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.bcf_connect = bpy.props.PointerProperty(type=properties.BCFConnectProperties)


def unregister():
    del bpy.types.Scene.bcf_connect
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
