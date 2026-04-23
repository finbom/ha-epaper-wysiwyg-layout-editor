#!/usr/bin/env sh
echo "Starting E-Paper WYSIWYG web server"
echo "Python: $(python3 --version 2>&1)"
echo "SUPERVISOR_TOKEN present: $([ -n "$SUPERVISOR_TOKEN" ] && echo yes || echo NO)"

exec python3 2>&1 - << 'PYEOF'
import os, json, mimetypes, urllib.request, urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN", "")
WEB_DIR = "/web"
PORT = 8099

# Read addon options written by HA Supervisor to /data/options.json
try:
    with open("/data/options.json") as f:
        OPTIONS = json.load(f)
except Exception:
    OPTIONS = {}

VERBOSE = OPTIONS.get("verbose_logging", False)

def vlog(msg):
    if VERBOSE:
        print(msg, flush=True)

print(f"[server] Starting on port {PORT}", flush=True)
print(f"[server] SUPERVISOR_TOKEN present: {bool(SUPERVISOR_TOKEN)}", flush=True)
if VERBOSE:
    print("*** VERBOSE LOGGING IS ACTIVE ***", flush=True)
else:
    print(f"[server] Verbose logging: False", flush=True)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0]
        print(f"[req] GET {path}", flush=True)  # always log every request
        vlog(f"[req] full: {self.path} from {self.client_address[0]}")
        if path == "/ha-states":
            self._serve_ha_states()
        elif path == "/addon-config":
            self._serve_addon_config()
        else:
            self._serve_static()

    def _serve_ha_states(self):
        if not SUPERVISOR_TOKEN:
            print("[ha-states] ERROR: SUPERVISOR_TOKEN is not set", flush=True)
            self.send_response(503)
            self.end_headers()
            return
        try:
            print("[ha-states] Fetching from supervisor...", flush=True)
            req = urllib.request.Request(
                "http://supervisor/core/api/states",
                headers={
                    "Authorization": f"Bearer {SUPERVISOR_TOKEN}",
                    "Content-Type": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
            print(f"[ha-states] OK — {len(data)} bytes", flush=True)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
        except urllib.error.HTTPError as e:
            print(f"[ha-states] HTTP error {e.code}: {e.reason}", flush=True)
            self.send_response(502)
            self.end_headers()
        except Exception as e:
            print(f"[ha-states] ERROR: {e}", flush=True)
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
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.end_headers()
            self.wfile.write(data)
        except FileNotFoundError:
            print(f"[static] 404 {path}", flush=True)
            self.send_response(404)
            self.end_headers()

    def log_message(self, *_):
        pass


HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
PYEOF
