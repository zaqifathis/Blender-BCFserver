"""Process-wide BCF connection state, shared by the operators and the panel.

Network calls run on a worker thread so Blender stays responsive while the user logs
in through the browser. The worker only writes plain Python attributes here; the UI
reads them on the main thread.
"""

import threading

from . import bcf_api
from .log import logger

DISCONNECTED = "DISCONNECTED"
CONNECTING = "CONNECTING"
CONNECTED = "CONNECTED"
ERROR = "ERROR"


class Session:
    def __init__(self):
        self.status = DISCONNECTED
        self.message = ""
        self.client = None  # bcf_api.BCFApiClient once connected
        self.projects = []  # fetched on connect, for the WebSocket side
        self._worker = None
        self._cancel = threading.Event()
        self._lock = threading.Lock()

    @property
    def busy(self):
        return self._worker is not None and self._worker.is_alive()

    def connect(self, server_url, client_id, client_secret, redirect_port):
        self.disconnect()
        cancel = self._cancel
        self.status, self.message = CONNECTING, "Log in in your browser..."
        logger.info("Connecting to %s as client '%s'", server_url, client_id)

        def work():
            try:
                client = bcf_api.connect(server_url, client_id, client_secret, redirect_port, cancel)
                projects = client.get_projects() or []
            except Exception as e:
                with self._lock:
                    if not cancel.is_set():
                        self.status, self.message = ERROR, str(e)
                        # full traceback (console only) for anything we did not raise on purpose
                        logger.error("Connection failed: %s", e, exc_info=not isinstance(e, bcf_api.BCFConnectError))
                return
            with self._lock:
                if cancel.is_set():
                    return
                self.client = client
                self.projects = projects
                self.status, self.message = CONNECTED, ""
                logger.info("Connected, %d project(s) available", len(projects))

        self._worker = threading.Thread(target=work, name="BCFConnect", daemon=True)
        self._worker.start()

    def disconnect(self):
        with self._lock:
            if self.status == CONNECTED:
                logger.info("Disconnected")
            elif self.status == CONNECTING:
                logger.info("Login cancelled")
            self._cancel.set()
            self._cancel = threading.Event()
            self.client = None
            self.projects = []
            self.status, self.message = DISCONNECTED, ""


current = Session()
