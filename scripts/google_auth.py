#!/usr/bin/env python3
"""One-time OAuth2 setup for Google Calendar integration.

Run this on a machine with a browser, then copy the refresh_token
to config/config.yaml on the HPC cluster.

Usage:
    python3 scripts/google_auth.py --client-id YOUR_ID --client-secret YOUR_SECRET
"""
import argparse
import json
import http.server
import urllib.parse
import webbrowser

import httpx


def main():
    parser = argparse.ArgumentParser(description="Google Calendar OAuth Setup")
    parser.add_argument("--client-id", required=True)
    parser.add_argument("--client-secret", required=True)
    parser.add_argument("--port", type=int, default=8421)
    args = parser.parse_args()

    redirect_uri = f"http://localhost:{args.port}"
    scope = "https://www.googleapis.com/auth/calendar"

    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={args.client_id}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        f"response_type=code&"
        f"scope={urllib.parse.quote(scope)}&"
        f"access_type=offline&"
        f"prompt=consent"
    )

    print(f"Opening browser for authorization...")
    print(f"If browser doesn't open, visit:\n{auth_url}\n")
    webbrowser.open(auth_url)

    # Wait for callback
    auth_code = None

    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            nonlocal auth_code
            query = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(query)
            auth_code = params.get("code", [None])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h1>Authorization successful!</h1><p>You can close this tab.</p>")

        def log_message(self, *args):
            pass

    server = http.server.HTTPServer(("localhost", args.port), Handler)
    server.handle_request()

    if not auth_code:
        print("ERROR: No authorization code received")
        return

    print("Exchanging code for tokens...")
    resp = httpx.post("https://oauth2.googleapis.com/token", data={
        "client_id": args.client_id,
        "client_secret": args.client_secret,
        "code": auth_code,
        "grant_type": "authorization_code",
        "redirect_uri": redirect_uri,
    })

    if resp.status_code != 200:
        print(f"ERROR: Token exchange failed: {resp.text}")
        return

    tokens = resp.json()
    refresh_token = tokens.get("refresh_token")

    print(f"\nSuccess! Add this to your config/config.yaml:\n")
    print(f"google_calendar:")
    print(f"  enabled: true")
    print(f"  client_id: \"{args.client_id}\"")
    print(f"  client_secret: \"{args.client_secret}\"")
    print(f"  refresh_token: \"{refresh_token}\"")
    print(f"  calendar_id: \"primary\"")


if __name__ == "__main__":
    main()
