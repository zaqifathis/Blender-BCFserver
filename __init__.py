if "bpy" in locals():
    import importlib

    importlib.reload(log)
    importlib.reload(bcf_api)
    importlib.reload(blender_bridge)
    importlib.reload(ifc_loader)
    importlib.reload(ifc_import)
    importlib.reload(viewpoint_apply)
    importlib.reload(viewpoint_service)
    importlib.reload(ws_server)
    importlib.reload(session)
    importlib.reload(properties)
    importlib.reload(operators)
    importlib.reload(panel)
else:
    from . import (
        log,
        bcf_api,
        blender_bridge,
        ifc_loader,
        ifc_import,
        viewpoint_apply,
        viewpoint_service,
        ws_server,
        session,
        properties,
        operators,
        panel,
    )

import bpy

classes = (
    properties.BCFModel,
    properties.BCFConnectProperties,
    properties.BCFConnectPreferences,
    operators.BCF_OT_connect,
    operators.BCF_OT_disconnect,
    operators.BCF_OT_log_clear,
    operators.BCF_OT_log_copy,
    operators.BCF_OT_start_ws_server,
    operators.BCF_OT_open_ui,
    operators.BCF_OT_load_ifc,
    operators.BCF_OT_remove_ifc,
    operators.BCF_OT_reset_viewpoint,
    panel.BCF_UL_models,
    panel.BCF_PT_main_panel,
    panel.BCF_PT_log_panel,
)


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.bcf_connect = bpy.props.PointerProperty(type=properties.BCFConnectProperties)
    blender_bridge.start()


def unregister():
    blender_bridge.stop()
    operators.stop_watching()
    session.current.disconnect()
    del bpy.types.Scene.bcf_connect
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)
