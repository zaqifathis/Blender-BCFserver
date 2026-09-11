import bpy

from . import log, session


def _tag_redraw():
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                area.tag_redraw()


def _watch_session():
    # Main-thread timer: repaint the panel while the worker thread is logging in
    _tag_redraw()
    return 0.25 if session.current.busy else None


def stop_watching():
    if bpy.app.timers.is_registered(_watch_session):
        bpy.app.timers.unregister(_watch_session)


class BCF_OT_connect(bpy.types.Operator):
    bl_idname = "bcf.connect"
    bl_label = "Connect"
    bl_description = "Log in to the BCF server in the browser and load its projects"

    @classmethod
    def poll(cls, context):
        return not session.current.busy

    def execute(self, context):
        props = context.scene.bcf_connect
        prefs = context.preferences.addons[__package__].preferences
        if not props.server_url.strip():
            self.report({"ERROR"}, "Set the BCF server URL first")
            return {"CANCELLED"}
        if not prefs.client_secret:
            log.logger.warning("No client secret set in the add-on preferences")

        session.current.connect(props.server_url.strip(), prefs.client_id, prefs.client_secret, prefs.redirect_port)
        if not bpy.app.timers.is_registered(_watch_session):
            bpy.app.timers.register(_watch_session, first_interval=0.25)
        self.report({"INFO"}, "Log in to the BCF server in your browser")
        return {"FINISHED"}


class BCF_OT_disconnect(bpy.types.Operator):
    bl_idname = "bcf.disconnect"
    bl_label = "Disconnect"
    bl_description = "Cancel the login or drop the connection to the BCF server"

    def execute(self, context):
        session.current.disconnect()
        _tag_redraw()
        return {"FINISHED"}


class BCF_OT_log_clear(bpy.types.Operator):
    bl_idname = "bcf.log_clear"
    bl_label = "Clear Log"
    bl_description = "Clear the BCF log"

    def execute(self, context):
        log.records.clear()
        _tag_redraw()
        return {"FINISHED"}


class BCF_OT_log_copy(bpy.types.Operator):
    bl_idname = "bcf.log_copy"
    bl_label = "Copy Log"
    bl_description = "Copy the whole BCF log to the clipboard"

    def execute(self, context):
        context.window_manager.clipboard = log.as_text()
        self.report({"INFO"}, f"Copied {len(log.records)} log lines")
        return {"FINISHED"}


class BCF_OT_start_ws_server(bpy.types.Operator):
    bl_idname = "bcf.start_ws_server"
    bl_label = "Start WebSocket Server"
    bl_description = "Start the local WebSocket server"

    def execute(self, context):
        props = context.scene.bcf_connect
        self.report({"INFO"}, f"Start WebSocket server on port {props.ws_port}: not implemented yet")
        return {"FINISHED"}
