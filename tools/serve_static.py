"""Static dev/QA server for Crafted Realm with a deep connection queue.

`python -m http.server` listens with a backlog of 5; a fresh game page requests ~300 scripts at once, and under load the
extra connections are refused, so a random script never loads (`HolmArrivalQA is not defined`, boot timeouts).
Usage: python tools/serve_static.py <port> [directory]
"""
import functools
import http.server
import socketserver
import sys


class DeepQueueServer(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True
    allow_reuse_address = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8088
    directory = sys.argv[2] if len(sys.argv) > 2 else '.'
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=directory)
    handler.log_message = lambda *a, **k: None  # quiet: thousands of asset requests per page
    with DeepQueueServer(('127.0.0.1', port), handler) as httpd:
        print(f'[serve_static] http://127.0.0.1:{port}/ from {directory} (queue {DeepQueueServer.request_queue_size})', flush=True)
        httpd.serve_forever()


if __name__ == '__main__':
    main()
