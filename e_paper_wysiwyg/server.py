#!/usr/bin/env python3
import os
import mimetypes
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

SUPERVISOR_TOKEN = os.environ.get("SUPERVISOR_TOKEN", "")
WEB_DIR = "/web"
PORT = 8099


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/ha-states":
            self._serve_ha_states()
        else:
            self._serve_static()

    def _serve_ha_states(self):
        try:
            req = urllib.request.Request(
                "http://supervisor/core/api/states",
                headers={"Authorization": f"Bearer {SUPERVISOR_TOKEN}"},
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = resp.read()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_response(502)
            self.end_headers()

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
            self.end_headers()
            self.wfile.write(data)
        except FileNotFoundError:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *_):
        pass


if __name__ == "__main__":
    print(f"Starting E-Paper WYSIWYG server on port {PORT}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
