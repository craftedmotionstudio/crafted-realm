"""serve_git_rev.py -- serve the game exactly as it was at one git revision, straight from the object store.

For before/after captures without checking out a second multi-GB tree: every request is answered from
`git cat-file --batch` at the given revision (one long-lived git process, so a page's ~300 scripts load quickly);
files git does not track (gitignored runtime exports such as .studio-workspaces/**) fall back to the working tree.
Usage: python tools/serve_git_rev.py <port> <rev> [repo-dir]      e.g.  python tools/serve_git_rev.py 8096 bafff7d
"""
import http.server, mimetypes, socketserver, subprocess, sys, threading, urllib.parse, os

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8096
REV = sys.argv[2] if len(sys.argv) > 2 else 'HEAD'
REPO = sys.argv[3] if len(sys.argv) > 3 else os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cat = subprocess.Popen(['git', 'cat-file', '--batch'], cwd=REPO, stdin=subprocess.PIPE, stdout=subprocess.PIPE)
lock = threading.Lock()

def blob(path):
    with lock:
        cat.stdin.write((REV + ':' + path + '\n').encode('utf8')); cat.stdin.flush()
        head = cat.stdout.readline().decode('utf8').split()
        if len(head) < 3 or head[1] != 'blob':
            return None
        size = int(head[2]); data = cat.stdout.read(size); cat.stdout.read(1)
        return data

class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        path = urllib.parse.unquote(urllib.parse.urlparse(self.path).path).lstrip('/') or 'index.html'
        if path.endswith('/'): path += 'index.html'
        data = blob(path)
        if data is None:   # untracked runtime files (e.g. .studio-workspaces exports) come from the working tree
            fp = os.path.join(REPO, *path.split('/'))
            if os.path.isfile(fp) and '..' not in path:
                with open(fp, 'rb') as fh: data = fh.read()
        if data is None:
            self.send_response(404); self.end_headers(); return
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(path)[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(data))); self.send_header('Cache-Control', 'no-store'); self.end_headers()
        self.wfile.write(data)

class S(http.server.ThreadingHTTPServer):
    request_queue_size = 256; daemon_threads = True; allow_reuse_address = True

print('[serve_git_rev] http://127.0.0.1:%d/ at %s from %s' % (PORT, REV, REPO), flush=True)
S(('127.0.0.1', PORT), H).serve_forever()
