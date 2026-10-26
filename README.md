# BCFserver-Connect

A Blender extension that connects Blender to a [BCF API](https://github.com/buildingSMART/BCF-API)
server. Browse and edit BCF topics in a web panel served from Blender, show their viewpoints on IFC
models loaded in the scene, and save the current Blender view back to the server as a new viewpoint.

## Features

- **OAuth login** to the BCF server in the browser. The token stays in Blender; the web panel never sees it.
- **Web panel** served by Blender on `localhost` and talking to it over a WebSocket:
  - list, filter (BCF OData queries), sort and search topics
  - add, edit and delete topics and comments
  - related topics, document references and topic files, with downloads
  - viewpoint snapshots, plus downloads of snapshots and bitmaps
- **Show viewpoints in Blender:** camera (perspective and orthographic), visibility with view setup
  hints, colouring, selection, clipping planes, lines and bitmaps. A topic's IFC models stored on the
  server are downloaded and loaded automatically. Reset Viewpoint restores the scene.
- **Several IFC models at once**, each in its own collection. Add or remove them from the
  **BCF** sidebar tab. Models far from the origin are shifted to keep float precision.
- **Add viewpoints from Blender:** capture the current 3D view (camera, visibility, colours, selection,
  clipping and a snapshot) as a new topic viewpoint, optionally attached to a comment.

## Requirements

- Blender 4.2 or newer
- [Bonsai](https://extensions.blender.org/add-ons/bonsai/) (or ifcopenshell) installed as an
  extension. ifcopenshell is not bundled; this add-on uses the copy Bonsai installs.
- A BCF API 3.0 server with an OAuth client whose allowed redirect URIs include
  `http://localhost:<login callback port>/` (default `http://localhost:8081/`)
- To build: Node.js with npm, and Blender on the `PATH` (or passed to the build script)

## Install

1. Build the extension zip (see below), or take one from a release.
2. In Blender: **Edit › Preferences › Get Extensions › ⌄ › Install from Disk…** and pick the zip.
3. In the add-on preferences set the **Client ID**, **Client Secret** and **Login Callback Port** of
   your OAuth client.

## Use

1. Open the **BCF** tab in the 3D view sidebar (`N`).
2. Enter the **BCF Server URL** (default `http://localhost:8181/`) and click **Connect**. Log in in the
   browser that opens.
3. The web panel opens once connected (start it by hand with **Start Server** and **Open BCF Panel**;
   default port `8765`).
4. Pick a project and a topic. Use the eye button on a viewpoint to show it in Blender, and the camera
   button to add the current Blender view as a viewpoint.
5. Add IFC models stored outside the server with **+** in the Viewpoints box. **Reset Viewpoint**
   restores visibility and colours.

The **BCF Log** panel shows progress and errors; copy it with the clipboard button.

## Build

```powershell
./build.ps1                       # uses `blender` from the PATH
./build.ps1 -Blender "C:\Program Files\Blender Foundation\Blender 4.4\blender.exe"
```

The script installs the web dependencies when needed, builds the web panel into `web/dist`, and packs
`bcfserver_connect-<version>.zip` in the repository folder.

### Develop the web panel

```powershell
npm --prefix web ci
npm --prefix web run dev         # Vite dev server
npm --prefix web run typecheck
```

The panel needs the WebSocket server running in Blender to reach the BCF server.

## Project layout

| Path | Purpose |
| --- | --- |
| `__init__.py` | Registers classes and starts the main-thread bridge |
| `bcf_api.py`, `session.py` | OAuth login and BCF API client, connection state on a worker thread |
| `ws_server.py` | Loopback HTTP server for the web panel and its JSON WebSocket (stdlib only) |
| `blender_bridge.py` | Runs WebSocket requests that need `bpy` on Blender's main thread |
| `ifc_loader.py` | Finding a topic's IFC models and downloading them from the server |
| `ifc_import.py` | Loading and removing IFC models with ifcopenshell |
| `viewpoint_service.py` | Fetching a viewpoint and loading its models, or capturing one and posting it |
| `viewpoint_apply.py` | Applying a BCF viewpoint to the scene |
| `viewpoint_capture.py` | Turning the current 3D view into a BCF viewpoint |
| `operators.py`, `panel.py`, `properties.py` | Blender operators, sidebar panels and settings |
| `web/` | The web panel (Preact, TypeScript, Vite) |
| `wheels/` | Bundled Python wheels (`bcf_client`) |

## License

[MIT](LICENSE)
