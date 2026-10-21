import webbrowser

import bpy

from bpy_extras.io_utils import ImportHelper

from . import log, session, viewpoint_apply, ws_server


def _tag_redraw():
    for window in bpy.context.window_manager.windows:
        for area in window.screen.areas:
            if area.type == "VIEW_3D":
                area.tag_redraw()


def _watch_session():
    # Main-thread timer: repaint the panel while the worker thread is logging in
    _tag_redraw()
    if session.current.open_ui_pending:
        session.current.open_ui_pending = False
        webbrowser.open(ws_server.url())
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

        session.current.connect(props.server_url.strip(), prefs.client_id, prefs.client_secret, prefs.redirect_port, props.ws_port)
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
    bl_label = "Start / Stop Web Panel Server"
    bl_description = "Start or stop the local web server that hosts the BCF panel"

    def execute(self, context):
        if ws_server.is_running():
            session.current.stop_web()
        else:
            session.current.start_web(context.scene.bcf_connect.ws_port)
        _tag_redraw()
        return {"FINISHED"}


class BCF_OT_open_ui(bpy.types.Operator):
    bl_idname = "bcf.open_ui"
    bl_label = "Open BCF Panel"
    bl_description = "Open the BCF panel in your web browser"

    @classmethod
    def poll(cls, context):
        return ws_server.is_running()

    def execute(self, context):
        webbrowser.open(ws_server.url())
        return {"FINISHED"}


class BCF_OT_load_ifc(bpy.types.Operator, ImportHelper):
    bl_idname = "bcf.load_ifc"
    bl_label = "Load IFC Model"
    bl_description = "Load the IFC model of a topic by hand, e.g. when it is stored outside the BCF server"

    filter_glob: bpy.props.StringProperty(default="*.ifc;*.ifczip", options={"HIDDEN"})

    def execute(self, context):
        try:
            viewpoint_apply.load_ifc(self.filepath)
        except Exception as e:
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}
        return {"FINISHED"}


class BCF_OT_reset_viewpoint(bpy.types.Operator):
    bl_idname = "bcf.reset_viewpoint"
    bl_label = "Reset Viewpoint"
    bl_description = "Restore the visibility and colours changed by shown viewpoints"

    def execute(self, context):
        viewpoint_apply.reset()
        return {"FINISHED"}
