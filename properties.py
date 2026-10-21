import bpy
from bpy.props import CollectionProperty, FloatVectorProperty, IntProperty, StringProperty


class BCFModel(bpy.types.PropertyGroup):
    """An IFC model loaded into the scene (see ifc_import)."""

    filepath: StringProperty(name="File", subtype="FILE_PATH")
    collection: StringProperty(name="Collection", description="Collection holding the model's objects")


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
    models: CollectionProperty(type=BCFModel)
    active_model: IntProperty(name="Active Model", default=0)
    origin_offset: FloatVectorProperty(
        name="Origin Offset",
        description="Metres the loaded models were shifted by, so far-away coordinates keep their precision",
        size=3,
        subtype="TRANSLATION",
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
