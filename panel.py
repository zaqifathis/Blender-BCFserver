import bpy


class BCF_PT_main_panel(bpy.types.Panel):
    bl_label = "BCFserver-Connect"
    bl_idname = "BCF_PT_main_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "BCF"

    def draw(self, context):
        layout = self.layout
        props = context.scene.bcf_connect

        box = layout.box()
        box.label(text="BCF Server", icon="URL")
        box.prop(props, "server_url", text="URL")
        box.operator("bcf.connect", icon="LINKED")

        box = layout.box()
        box.label(text="WebSocket Server", icon="NETWORK_DRIVE")
        box.prop(props, "ws_port", text="Port")
        box.operator("bcf.start_ws_server", icon="PLAY")
