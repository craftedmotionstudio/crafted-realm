#!/usr/bin/env python3
"""recv2.py -- in-page canvas capture receiver for the visual-QA gate.
Listens on 127.0.0.1:9098. POST a JSON body {"name": "<file>", "data": "<dataURL>"}
(or raw dataURL text) and it decodes the base64 image and writes it into this
scratchpad folder. Used by the reference-inventory loop to pull clean CraftedRealms
screenshots out of the running game for side-by-side gating vs the OSRS reference.
"""
import base64, json, os, re
from http.server import BaseHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))

class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        raw = self.rfile.read(n).decode('utf-8', 'replace')
        name, data = 'shot.jpg', raw
        try:
            obj = json.loads(raw)
            name = obj.get('name', name)
            data = obj.get('data', '')
        except Exception:
            pass
        m = re.match(r'data:image/\w+;base64,(.*)', data, re.S)
        b64 = m.group(1) if m else data
        name = os.path.basename(name)  # no path escape
        out = os.path.join(HERE, name)
        try:
            with open(out, 'wb') as f:
                f.write(base64.b64decode(b64))
            msg = f'wrote {out} ({os.path.getsize(out)} bytes)'
            print(msg)
            self.send_response(200)
        except Exception as e:
            msg = f'ERR {e}'; print(msg)
            self.send_response(500)
        self._cors(); self.send_header('Content-Type', 'text/plain'); self.end_headers()
        self.wfile.write(msg.encode())

    def log_message(self, *a):
        pass

if __name__ == '__main__':
    print('recv2 listening on http://127.0.0.1:9098  -> writes into', HERE)
    HTTPServer(('127.0.0.1', 9098), H).serve_forever()
