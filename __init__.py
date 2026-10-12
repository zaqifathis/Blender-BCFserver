if "bpy" in locals():
    import importlib

    importlib.reload(log)
    importlib.reload(bcf_api)
    importlib.reload(ws_server)
    importlib.reload(session)
    importlib.reload(properties)
    importlib.reload(operators)
    importlib.reload(panel)
else:
    from . import log, bcf_api, ws_server, session, properties, operators, panel

import bpy

classes = (
    properties.BCFConnectProperties,
    properties.BCFConnectPreferences,
    operators.BCF_OT_connect,
    operators.BCF_OT_disconnect,
    operators.BCF_OT_log_clear,
    operators.BCF_OT_log_copy,
    operators.BCF_OT_start_ws_server,
    operators.BCF_OT_open_ui,
    panel.BCF_PT_main_panel,
    panel.BCF_PT_log_panel,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.bcf_connect = bpy.props.PointerProperty(type=properties.BCFConnectProperties)


def unregister():
    operators.stop_watching()
    session.current.disconnect()
    del bpy.types.Scene.bcf_connect
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
