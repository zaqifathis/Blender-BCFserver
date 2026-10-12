import bpy
from bpy.props import IntProperty, StringProperty


class BCFConnectProperties(bpy.types.PropertyGroup):
    server_url: StringProperty(
        name="BCF Server URL",
        description="Base URL of the BCF API server",
        default="http://localhost:8181/",
    )
    ws_port: IntProperty(
        name="WebSocket Port",
        description="Port for the local WebSocket server",
        default=8765,
        min=1024,
        max=65535,
    )


class BCFConnectPreferences(bpy.types.AddonPreferences):
    bl_idname = __package__

    # Stored in user preferences, not in the .blend file
    client_id: StringProperty(
        name="Client ID",
        description="OAuth client ID registered on the BCF server",
        default="bcf-server",
    )
    client_secret: StringProperty(
        name="Client Secret",
        description="OAuth client secret registered on the BCF server",
        subtype="PASSWORD",
    )
    redirect_port: IntProperty(
        name="Login Callback Port",
        description="Local port that receives the OAuth login callback. "
        "http://localhost:<port>/ must be an allowed redirect URI of the OAuth client",
        default=8081,
        min=1024,
        max=65535,
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "client_id")
        layout.prop(self, "client_secret")
        layout.prop(self, "redirect_port")
