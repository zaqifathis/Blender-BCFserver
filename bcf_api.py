"""TEMPORARY: stopgap until our own Python BCF client replaces it. Keep changes minimal.

BCF API access: OAuth2 login via the server's Foundation API and a BCF 3.0 client.

Built on bcf-client (bcf.v3.bcfapi), with the parts that do not work against our
server replaced:
- the Foundation API version is discovered instead of hardcoded to 1.0 (server serves 1.1)
- the OAuth callback listens on a configurable port, on loopback only, and can be cancelled
- token refresh works and Keycloak's ``refresh_expires_in`` is honoured
- GET requests are sent once, with a timeout, and raise on HTTP errors

No bpy in here, so it can be used and tested outside Blender.
"""

import base64
import hashlib
import http.server
import logging
import secrets
import time
import urllib.parse
import webbrowser

import requests
from bcf.v3.bcfapi import BcfClient, FoundationClient

# Same name as log.LOGGER_NAME; not imported so this module stays usable on its own
logger = logging.getLogger("bcfserver_connect")

TIMEOUT = 15  # seconds, for every HTTP request
LOGIN_TIMEOUT = 120  # seconds to wait for the browser to hit the callback
BCF_VERSION = "3.0"


class BCFConnectError(Exception):
    pass


class _CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if "code" not in query and "error" not in query:
            # favicon.ico and other stray requests
            self.send_response(404)
            self.end_headers()
            return

        self.server.auth_code = query.get("code", [None])[0]
        self.server.auth_state = query.get("state", [None])[0]
        self.server.auth_error = query.get("error_description", query.get("error", [None]))[0]

        self.send_response(200)
        self.send_header("Content-type", "text/plain; charset=utf-8")
        self.end_headers()
        if self.server.auth_error:
            message = f"Login failed: {self.server.auth_error}"
        else:
            message = "You are logged in. You may close this window and return to Blender."
        self.wfile.write(message.encode("utf-8"))

    def log_message(self, format, *args):
        pass  # keep Blender's console clean


def _version_key(version):
    return tuple(int(part) if part.isdigit() else 0 for part in version["version_id"].split("."))


def _pkce_pair():
    verifier = secrets.token_urlsafe(64)
    digest = hashlib.sha256(verifier.encode("ascii")).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    return verifier, challenge


class OAuthFoundationClient(FoundationClient):
    def __init__(self, client_id, client_secret, base_url, redirect_port):
        if not base_url.endswith("/"):
            base_url += "/"
        super().__init__(client_id, client_secret, base_url)
        self.redirect_port = redirect_port
        # Keycloak matches redirect URIs literally, so this must be "localhost", not 127.0.0.1
        self.redirect_uri = f"http://localhost:{redirect_port}/"
        self._versions = None

    def get_versions(self):
        if self._versions is None:
            url = f"{self.baseurl}foundation/versions"
            logger.info("Contacting %s", url)
            try:
                resp = requests.get(url, timeout=TIMEOUT)
            except (requests.ConnectionError, requests.Timeout) as e:
                raise BCFConnectError(f"Cannot reach {self.baseurl} - is the BCF server running?") from e
            resp.raise_for_status()
            self._versions = resp.json()["versions"]
            logger.info("Server offers: %s", ", ".join(f"{v['api_id']} {v['version_id']}" for v in self._versions))
        return self._versions

    def get_auth_info(self):
        foundation = [v for v in self.get_versions() if v["api_id"] == "foundation"]
        if not foundation:
            raise BCFConnectError("Server does not advertise a Foundation API")
        foundation_url = max(foundation, key=_version_key)["api_base_url"].rstrip("/")
        resp = requests.get(f"{foundation_url}/auth", timeout=TIMEOUT)
        resp.raise_for_status()
        info = resp.json()
        logger.info("Auth server: %s", urllib.parse.urlparse(info.get("oauth2_auth_url", "")).netloc or "none")
        return info

    def get_auth_methods(self):
        return self.get_auth_info()["supported_oauth2_flows"]

    def login(self, cancel=None):
        """Log in with the authorization code flow (+ PKCE) in the system browser.

        Blocks until the browser calls back, LOGIN_TIMEOUT passes or ``cancel`` (a
        threading.Event) is set, so call it from a worker thread.
        """
        info = self.get_auth_info()
        flows = info.get("supported_oauth2_flows", [])
        if "authorization_code_grant" not in flows:
            raise BCFConnectError(f"Server does not support authorization_code_grant (supports: {flows})")
        self.token_endpoint = info["oauth2_token_url"]
        auth_url = info["oauth2_auth_url"]

        state = secrets.token_urlsafe(16)
        verifier, challenge = _pkce_pair()

        try:
            server = http.server.HTTPServer(("127.0.0.1", self.redirect_port), _CallbackHandler)
        except OSError as e:
            raise BCFConnectError(f"Cannot listen on port {self.redirect_port} for the login callback: {e}") from e

        with server:
            server.timeout = 0.5  # handle_request() returns this often so cancel/timeout are noticed
            server.auth_code = server.auth_state = server.auth_error = None

            query = urllib.parse.urlencode(
                {
                    "client_id": self.client_id,
                    "response_type": "code",
                    "state": state,
                    "redirect_uri": self.redirect_uri,
                    "code_challenge": challenge,
                    "code_challenge_method": "S256",
                }
            )
            separator = "&" if "?" in auth_url else "?"
            logger.info("Waiting for login callback on %s", self.redirect_uri)
            if not webbrowser.open(f"{auth_url}{separator}{query}"):
                logger.warning("Could not open a browser for the login page")
            logger.info("Log in in the browser window (timeout %d s)", LOGIN_TIMEOUT)

            deadline = time.monotonic() + LOGIN_TIMEOUT
            while server.auth_code is None and server.auth_error is None:
                if cancel is not None and cancel.is_set():
                    raise BCFConnectError("Login cancelled")
                if time.monotonic() > deadline:
                    raise BCFConnectError(f"No login received within {LOGIN_TIMEOUT} s")
                server.handle_request()

        if server.auth_error:
            raise BCFConnectError(f"Login failed: {server.auth_error}")
        if server.auth_state != state:
            raise BCFConnectError("Login rejected: OAuth state mismatch")
        logger.info("Login callback received")

        self._request_tokens(
            {
                "grant_type": "authorization_code",
                "code": server.auth_code,
                "redirect_uri": self.redirect_uri,
                "code_verifier": verifier,
            }
        )

    def get_access_token(self):
        # Unlike upstream, never start an interactive login from inside an API call.
        now = time.time()
        if self.access_token and self.access_token_expires_on > now:
            return self.access_token
        if self.refresh_token and self.refresh_token_expires_on > now:
            self.get_refresh_token()
            return self.access_token
        raise BCFConnectError("Not logged in or session expired, please connect again")

    def get_refresh_token(self):
        self._request_tokens({"grant_type": "refresh_token", "refresh_token": self.refresh_token})

    get_new_access_token = get_refresh_token

    def _request_tokens(self, data):
        logger.info("Requesting access token (%s)", data["grant_type"])
        resp = requests.post(
            self.token_endpoint, data=data, headers=self._get_access_token_headers(), timeout=TIMEOUT
        )
        if not resp.ok:
            raise BCFConnectError(f"Token request failed: HTTP {resp.status_code} {resp.text[:200]}")
        self.set_tokens_from_response(resp)
        logger.info("Access token received, valid for %d s", self.access_token_expires_on - time.time())

    def set_tokens_from_response(self, response):
        tokens = response.json()
        now = time.time()
        self.access_token = tokens["access_token"]
        # renew a little early so a token does not expire in flight
        self.access_token_expires_on = now + tokens.get("expires_in", 300) - 10
        self.refresh_token = tokens.get("refresh_token", "")
        # Keycloak says refresh_expires_in; 0 means the refresh token does not expire
        refresh_expires_in = tokens.get("refresh_token_expires_in", tokens.get("refresh_expires_in"))
        self.refresh_token_expires_on = now + refresh_expires_in if refresh_expires_in else float("inf")


class BCFApiClient(BcfClient):
    def get(self, endpoint, params=None, is_auth_required=False):
        headers = {"Authorization": f"Bearer {self.foundation_client.get_access_token()}"}
        resp = requests.get(f"{self.baseurl}{endpoint}", headers=headers, params=params or None, timeout=TIMEOUT)
        logger.debug("GET %s -> %d", resp.url, resp.status_code)
        resp.raise_for_status()
        return resp.json()

    def get_raw(self, endpoint, stream=False):
        """GET a non-JSON resource (e.g. a snapshot image); returns the requests.Response.

        With ``stream=True`` the body is not read yet; the caller must close the response.
        """
        headers = {"Authorization": f"Bearer {self.foundation_client.get_access_token()}"}
        resp = requests.get(f"{self.baseurl}{endpoint}", headers=headers, timeout=TIMEOUT, stream=stream)
        if not resp.ok:
            resp.close()
        resp.raise_for_status()
        return resp


def connect(server_url, client_id, client_secret, redirect_port, cancel=None):
    """Log in and return a BCFApiClient bound to the server's BCF 3.0 API."""
    foundation = OAuthFoundationClient(client_id, client_secret, server_url, redirect_port)
    foundation.login(cancel)

    client = BCFApiClient(foundation)
    for version in foundation.get_versions():
        if version["api_id"] == "bcf" and version["version_id"] == BCF_VERSION:
            client.set_version(version)
            logger.info("Using BCF API %s at %s", BCF_VERSION, client.baseurl)
            return client
    raise BCFConnectError(f"Server does not offer BCF API {BCF_VERSION}")
