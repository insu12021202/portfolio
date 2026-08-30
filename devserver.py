#!/usr/bin/env python3
"""Static file server for local preview.

Same as ``python -m http.server``, with two differences:

* every response carries no-cache headers. The stock server sends none, so a
  browser keeps serving the previous ``styles.css`` after an edit and the page
  looks unchanged until a hard refresh.
* it binds to localhost only, so the preview is not exposed on the network.

Usage::

    python devserver.py [port]      # port defaults to 4321
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_PORT = 4321


class NoCacheHandler(SimpleHTTPRequestHandler):
    """Serve files, but tell the browser never to keep them."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_header(self, keyword, value):
        # Last-Modified is what lets a browser revalidate and receive a 304,
        # which would defeat the headers above. Drop it.
        if keyword.lower() == "last-modified":
            return
        super().send_header(keyword, value)

    def send_head(self):
        # The stock handler answers 304 to a conditional request before any of
        # the above runs. Drop the validator so every request gets fresh bytes.
        del self.headers["If-Modified-Since"]
        return super().send_head()

    def log_message(self, fmt, *args):
        # One line per request, without the timestamp noise.
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    with ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler) as httpd:
        print("serving http://localhost:%d (no-cache)" % port, flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
