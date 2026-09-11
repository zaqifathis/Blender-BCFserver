import bpy


class BCF_OT_connect(bpy.types.Operator):
    bl_idname = "bcf.connect"
    bl_label = "Connect"
    bl_description = "Connect to the BCF server"

    def execute(self, context):
        props = context.scene.bcf_connect
        self.report({"INFO"}, f"Connect to {props.server_url}: not implemented yet")
        return {"FINISHED"}


class BCF_OT_start_ws_server(bpy.types.Operator):
    bl_idname = "bcf.start_ws_server"
    bl_label = "Start WebSocket Server"
    bl_description = "Start the local WebSocket server"

    def execute(self, context):
        props = context.scene.bcf_connect
        self.report({"INFO"}, f"Start WebSocket server on port {props.ws_port}: not implemented yet")
        return {"FINISHED"}
