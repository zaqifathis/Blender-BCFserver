"""Local web server for the BCF panel: static files plus a JSON WebSocket on /ws.

Stdlib only, loopback only, no bpy. The browser never sees the OAuth token: requests
come in over the WebSocket and are forwarded to the BCF API with the session's client.

Protocol: request ``{"id", "type", "payload"}``, reply ``{"id", "ok", "data" | "error"}``.
"""

import base64
import hashlib
import http.server
import json
import mimetypes
import os
import socketserver
import struct
import threading
import urllib.parse

from .log import logger

WEB_ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", "dist")
WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
MAX_MESSAGE = 1 << 20  # bytes; the browser only ever sends small JSON requests
DOWNLOAD_CHUNK = 64 * 1024  # bytes per read when streaming a document to the browser


def _quote(value):
    return urllib.parse.quote(str(value), safe="")


# --- request handlers: (client, payload) -> JSON-able ---------------------------------


def _odata(p):
    """OData query options from the payload: {"filter": ..., "orderby": ...} -> {"$filter": ..., ...}."""
    return {f"${key}": p[key] for key in ("filter", "orderby") if p.get(key)}


def _projects(client, p):
    return client.get("/projects")


def _topics(client, p):
    return client.get(f"/projects/{_quote(p['project_id'])}/topics", params=_odata(p))


def _extensions(client, p):
    return client.get(f"/projects/{_quote(p['project_id'])}/extensions")


def _comments(client, p):
    return client.get(f"/projects/{_quote(p['project_id'])}/topics/{_quote(p['topic_id'])}/comments", params=_odata(p))


def _viewpoints(client, p):
    return client.get(f"/projects/{_quote(p['project_id'])}/topics/{_quote(p['topic_id'])}/viewpoints")


def _document_references(client, p):
    return client.get(f"/projects/{_quote(p['project_id'])}/topics/{_quote(p['topic_id'])}/document_references")


def _documents(client, p):
    return client.get(f"/projects/{_quote(p['project_id'])}/documents")


def _files(client, p):
    return client.get(f"/projects/{_quote(p['project_id'])}/topics/{_quote(p['topic_id'])}/files")


HANDLERS = {
    "projects.list": _projects,
    "topics.list": _topics,
    "extensions.get": _extensions,
    "comments.list": _comments,
    "viewpoints.list": _viewpoints,
    "document_references.list": _document_references,
    "documents.list": _documents,
    "files.list": _files,
}


# --- WebSocket framing (RFC 6455, text frames only) -----------------------------------


def _recv_exact(sock, n):
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("closed")
        buf += chunk
    return buf


def _read_frame(sock):
    b1, b2 = _recv_exact(sock, 2)
    fin, opcode = b1 & 0x80, b1 & 0x0F
    length = b2 & 0x7F
    if length == 126:
        length = struct.unpack(">H", _recv_exact(sock, 2))[0]
    elif length == 127:
        length = struct.unpack(">Q", _recv_exact(sock, 8))[0]
    if length > MAX_MESSAGE:
        raise ConnectionError("frame too large")
    mask = _recv_exact(sock, 4) if b2 & 0x80 else None
    data = _recv_exact(sock, length)
    if mask:
        data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
    return bool(fin), opcode, data


def _frame(opcode, data=b""):
    head = bytes([0x80 | opcode])
    n = len(data)
    if n < 126:
        head += bytes([n])
    elif n < 1 << 16:
        head += bytes([126]) + struct.pack(">H", n)
    else:
        head += bytes([127]) + struct.pack(">Q", n)
    return head + data


class _Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    server_version = "BCFConnect"

    def log_message(self, format, *args):
        logger.debug("web: " + format, *args)

    # Reject foreign Host (DNS rebinding) and foreign Origin (other sites talking to us)
    def _allowed(self, check_origin):
        port = self.server.server_address[1]
        if self.headers.get("Host", "") not in (f"localhost:{port}", f"127.0.0.1:{port}"):
            return False
        origin = self.headers.get("Origin")
        if check_origin and origin not in (f"http://localhost:{port}", f"http://127.0.0.1:{port}"):
            return False
        return True

    def _send(self, status, body=b"", ctype="text/plain; charset=utf-8"):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        is_ws = self.headers.get("Upgrade", "").lower() == "websocket"
        if not self._allowed(check_origin=is_ws):
            return self._send(403, b"Forbidden")
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        if path == "/ws" and is_ws:
            return self._websocket()
        if path.startswith("/api/snapshot/"):
            return self._snapshot(path)
        if path.startswith("/api/document/"):
            return self._document(path, urllib.parse.parse_qs(parsed.query).get("name", [""])[0])
        self._static(path)

    def _static(self, path):
        rel = "index.html" if path in ("", "/") else path.lstrip("/")
        full = os.path.realpath(os.path.join(WEB_ROOT, rel))
        if os.path.commonpath([full, os.path.realpath(WEB_ROOT)]) != os.path.realpath(WEB_ROOT):
            return self._send(403, b"Forbidden")
        if not os.path.isfile(full):
            msg = b"Web UI not built: run `npm run build` in web/" if not os.path.isdir(WEB_ROOT) else b"Not found"
            return self._send(404, msg)
        with open(full, "rb") as f:
            self._send(200, f.read(), mimetypes.guess_type(full)[0] or "application/octet-stream")

    def _snapshot(self, path):
        client = self.server.get_client()
        parts = path.split("/")[3:]  # project, topic, viewpoint
        if client is None or len(parts) != 3:
            return self._send(404, b"Not found")
        try:
            project, topic, viewpoint = (urllib.parse.unquote(p) for p in parts)
            resp = client.get_raw(
                f"/projects/{_quote(project)}/topics/{_quote(topic)}/viewpoints/{_quote(viewpoint)}/snapshot"
            )
        except Exception as e:
            logger.warning("Snapshot failed: %s", e)
            return self._send(502, b"Snapshot unavailable")
        self._send(200, resp.content, resp.headers.get("Content-Type", "image/png"))

    def _document(self, path, name):
        client = self.server.get_client()
        parts = path.split("/")[3:]  # project, document
        if client is None or len(parts) != 2:
            return self._send(404, b"Not found")
        try:
            project, document = (urllib.parse.unquote(p) for p in parts)
            resp = client.get_raw(f"/projects/{_quote(project)}/documents/{_quote(document)}", stream=True)
        except Exception as e:
            logger.warning("Document download failed: %s", e)
            return self._send(502, b"Document unavailable")
        with resp:
            self.send_response(200)
            self.send_header("Content-Type", resp.headers.get("Content-Type", "application/octet-stream"))
            # Always an attachment: never render server-supplied content on this origin, which holds the session
            self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{_quote(name)}" if name else "attachment")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Cache-Control", "no-store")
            # iter_content decodes gzip etc., so the upstream length only holds for an unencoded body
            length = resp.headers.get("Content-Length")
            if length and not resp.headers.get("Content-Encoding"):
                self.send_header("Content-Length", length)
            else:
                self.close_connection = True  # body ends when the connection closes
            self.end_headers()
            try:
                for chunk in resp.iter_content(DOWNLOAD_CHUNK):
                    self.wfile.write(chunk)
            except Exception as e:
                # Headers are out, so the browser can only see a truncated download
                logger.warning("Document download interrupted: %s", e)
                self.close_connection = True

    def _websocket(self):
        key = self.headers.get("Sec-WebSocket-Key")
        if not key:
            return self._send(400, b"Bad request")
        accept = base64.b64encode(hashlib.sha1((key + WS_GUID).encode()).digest()).decode()
        self.wfile.write(
            (
                "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept}\r\n\r\n"
            ).encode()
        )
        self.wfile.flush()
        self.close_connection = True
        logger.info("Web panel connected")
        sock, send_lock = self.connection, threading.Lock()
        self.server.ws_socks.add(sock)

        def send(opcode, data=b""):
            with send_lock:
                sock.sendall(_frame(opcode, data))

        message = b""
        try:
            while True:
                fin, opcode, data = _read_frame(sock)
                if opcode == 0x8:  # close
                    send(0x8)
                    break
                if opcode == 0x9:  # ping
                    send(0xA, data)
                elif opcode in (0x1, 0x0):  # text / continuation
                    message += data
                    if len(message) > MAX_MESSAGE:
                        break
                    if fin:
                        text, message = message, b""
                        send(0x1, json.dumps(self._dispatch(text)).encode())
        except (ConnectionError, OSError):
            pass
        finally:
            self.server.ws_socks.discard(sock)
            logger.info("Web panel disconnected")

    def _dispatch(self, raw):
        req_id = None
        try:
            req = json.loads(raw)
            req_id = req.get("id")
            handler = HANDLERS.get(req.get("type"))
            if handler is None:
                raise ValueError(f"Unknown request type: {req.get('type')}")
            client = self.server.get_client()
            if client is None:
                raise RuntimeError("Not connected to the BCF server")
            return {"id": req_id, "ok": True, "data": handler(client, req.get("payload") or {})}
        except Exception as e:
            logger.warning("Web request failed: %s", e)
            return {"id": req_id, "ok": False, "error": str(e)}


class _Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = False  # fail loudly if the port is taken


_server = None
_thread = None


def is_running():
    return _server is not None


def url():
    return f"http://localhost:{_server.server_address[1]}/" if _server else ""


def start(port, get_client):
    """Start serving on 127.0.0.1:port. ``get_client()`` returns the live BCF client or None."""
    global _server, _thread
    if _server is not None:
        return
    _server = _Server(("127.0.0.1", port), _Handler)
    _server.get_client = get_client
    _server.ws_socks = set()
    _thread = threading.Thread(target=_server.serve_forever, name="BCFWebServer", daemon=True)
    _thread.start()
    logger.info("Web panel server listening on %s", url())


def stop():
    global _server, _thread
    if _server is None:
        return
    logger.info("Web panel server stopped")
    for sock in list(_server.ws_socks):
        try:
            sock.shutdown(2)  # unblock the connection thread
        except OSError:
            pass
    _server.shutdown()
    _server.server_close()
    _server, _thread = None, None
