#!/usr/bin/env sh
echo "Starting E-Paper WYSIWYG web server"
echo "Python: $(python3 --version 2>&1)"
echo "SUPERVISOR_TOKEN present: $([ -n "$SUPERVISOR_TOKEN" ] && echo yes || echo NO)"

exec python3 2>&1 - << 'PYEOF'
import os, json, mimetypes, urllib.request, urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime

SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN", "")
WEB_DIR = "/web"
PORT = 8099

try:
    with open("/data/options.json") as f:
        OPTIONS = json.load(f)
except Exception:
    OPTIONS = {}

VERBOSE = OPTIONS.get("verbose_logging", False)

def ts():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def log(msg):
    print(f"{ts()} {msg}", flush=True)

def vlog(msg):
    if VERBOSE:
        log(msg)

log(f"[server] Starting on port {PORT}")
log(f"[server] SUPERVISOR_TOKEN present: {bool(SUPERVISOR_TOKEN)}")
if VERBOSE:
    log("*** VERBOSE LOGGING IS ACTIVE ***")
else:
    log("[server] Verbose logging: False")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0]
        log(f"[req] GET {path}")
        if path == "/ha-states":
            self._serve_ha_states()
        elif path == "/addon-config":
            self._serve_addon_config()
        else:
            self._serve_static()

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/log":
            self._handle_ui_log()
        else:
            self.send_response(404)
            self.end_headers()

    def _handle_ui_log(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8", errors="replace") if length else ""
        try:
            msg = json.loads(body).get("msg", body)
        except Exception:
            msg = body
        log(f"[ui] {msg}")
        self.send_response(204)
        self.end_headers()

    def _serve_ha_states(self):
        if not SUPERVISOR_TOKEN:
            log("[ha-states] ERROR: SUPERVISOR_TOKEN is not set")
            self.send_response(503)
            self.end_headers()
            return
        try:
            log("[ha-states] Fetching from supervisor...")
            req = urllib.request.Request(
                "http://supervisor/core/api/states",
                headers={
                    "Authorization": f"Bearer {SUPERVISOR_TOKEN}",
                    "Content-Type": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
            log(f"[ha-states] OK — {len(data)} bytes")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
        except urllib.error.HTTPError as e:
            log(f"[ha-states] HTTP error {e.code}: {e.reason}")
            self.send_response(502)
            self.end_headers()
        except Exception as e:
            log(f"[ha-states] ERROR: {e}")
            self.send_response(502)
            self.end_headers()

    def _serve_addon_config(self):
        payload = json.dumps({"verbose_logging": VERBOSE}).encode()
        vlog(f"[addon-config] verbose_logging={VERBOSE}")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(payload)

    def _serve_static(self):
        path = self.path.split("?")[0]
        if path == "/":
            path = "/index.html"
        try:
            with open(WEB_DIR + path, "rb") as f:
                data = f.read()
            mime = mimetypes.guess_type(path)[0] or "application/octet-stream"
            vlog(f"[static] 200 {path}")
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.end_headers()
            self.wfile.write(data)
        except FileNotFoundError:
            log(f"[static] 404 {path}")
            self.send_response(404)
            self.end_headers()

    def log_message(self, *_):
        pass


HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
PYEOF
