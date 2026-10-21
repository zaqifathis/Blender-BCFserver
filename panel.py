import textwrap

import bpy

from . import log, session, ws_server

LOG_LINES = 15
LOG_ICONS = {"INFO": "INFO", "WARNING": "ERROR", "ERROR": "CANCEL", "CRITICAL": "CANCEL"}

STATUS_ICONS = {
    session.DISCONNECTED: "UNLINKED",
    session.CONNECTING: "SORTTIME",
    session.CONNECTED: "LINKED",
    session.ERROR: "ERROR",
}


class BCF_UL_models(bpy.types.UIList):
    """The IFC models loaded for showing viewpoints."""

    def draw_item(self, context, layout, data, item, icon, active_data, active_propname, index):
        layout.label(text=item.name, icon="FILE_3D")


class BCF_PT_main_panel(bpy.types.Panel):
    bl_label = "BCFserver-Connect"
    bl_idname = "BCF_PT_main_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "BCF"

    def draw(self, context):
        layout = self.layout
        props = context.scene.bcf_connect
        current = session.current

        box = layout.box()
        box.label(text="BCF Server", icon="URL")
        row = box.row()
        row.enabled = current.status in (session.DISCONNECTED, session.ERROR)
        row.prop(props, "server_url", text="URL")

        status = current.status.capitalize()
        if current.message:
            status += f": {current.message}"
        box.label(text=status, icon=STATUS_ICONS[current.status])

        if current.status == session.CONNECTED:
            box.operator("bcf.disconnect", icon="UNLINKED")
        elif current.status == session.CONNECTING:
            box.operator("bcf.disconnect", text="Cancel", icon="CANCEL")
        else:
            box.operator("bcf.connect", icon="LINKED")

        box = layout.box()
        box.label(text="WebSocket Server", icon="NETWORK_DRIVE")
        running = ws_server.is_running()
        row = box.row()
        row.enabled = not running
        row.prop(props, "ws_port", text="Port")
        if running:
            box.label(text=ws_server.url(), icon="LINKED")
            box.operator("bcf.open_ui", icon="URL")
            box.operator("bcf.start_ws_server", text="Stop Server", icon="PAUSE")
        else:
            box.operator("bcf.start_ws_server", text="Start Server", icon="PLAY")

        box = layout.box()
        box.label(text="Viewpoints", icon="CAMERA_DATA")
        if not props.models:
            box.label(text="No IFC models loaded", icon="INFO")
        row = box.row()
        row.template_list("BCF_UL_models", "", props, "models", props, "active_model", rows=3)
        col = row.column(align=True)
        col.operator("bcf.load_ifc", text="", icon="ADD")
        col.operator("bcf.remove_ifc", text="", icon="REMOVE")
        box.operator("bcf.reset_viewpoint", icon="LOOP_BACK")


class BCF_PT_log_panel(bpy.types.Panel):
    bl_label = "BCF Log"
    bl_idname = "BCF_PT_log_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "BCF"

    def draw_header_preset(self, context):
        row = self.layout.row(align=True)
        row.operator("bcf.log_copy", text="", icon="COPYDOWN", emboss=False)
        row.operator("bcf.log_clear", text="", icon="TRASH", emboss=False)

    def draw(self, context):
        layout = self.layout
        if not log.records:
            layout.label(text="Nothing logged yet")
            return

        # rough characters per line, so long messages wrap instead of being cut off
        width = max(20, int(context.region.width / (7 * context.preferences.system.ui_scale)) - 6)
        col = layout.column(align=True)
        for t, level, message in list(log.records)[-LOG_LINES:]:
            lines = textwrap.wrap(f"{t} {message}", width) or [t]
            col.label(text=lines[0], icon=LOG_ICONS.get(level, "INFO"))
            for line in lines[1:]:
                col.label(text=line, icon="BLANK1")
        if len(log.records) > LOG_LINES:
            layout.label(text=f"{len(log.records) - LOG_LINES} older lines: use Copy Log", icon="DOCUMENTS")
