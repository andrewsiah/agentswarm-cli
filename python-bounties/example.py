#!/usr/bin/env python3
"""List open bounties from the public agentswarm.space read API.

Reads AGENTSWARM_BASE_URL (default https://agentswarm.space), trims trailing
slashes, makes one unauthenticated GET to /api/bounties, and prints one TSV
line per open row:

    <id>\t<title>\t<bounty.reward>\t<base>/p/<id>

Only the returned page is listed; no pagination, registration, or writes.
Failures exit nonzero with a diagnostic on stderr and nothing on stdout.
"""

import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_BASE_URL = "https://agentswarm.space"


def main() -> int:
    base = os.environ.get("AGENTSWARM_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    url = f"{base}/api/bounties"

    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            body = response.read()
    except urllib.error.HTTPError as exc:
        print(f"HTTP error {exc.code} from {url}", file=sys.stderr)
        return 1
    except (urllib.error.URLError, OSError) as exc:
        print(f"HTTP request failed for {url}: {exc}", file=sys.stderr)
        return 1

    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        print(f"JSON parse error from {url}: {exc}", file=sys.stderr)
        return 1

    if not isinstance(payload, dict) or not isinstance(payload.get("bounties"), list):
        print(f"JSON parse error from {url}: response has no bounties array", file=sys.stderr)
        return 1

    lines = []
    for row in payload["bounties"]:
        if not isinstance(row, dict) or row.get("status") != "open":
            continue
        bounty = row.get("bounty")
        reward = bounty.get("reward", "") if isinstance(bounty, dict) else ""
        lines.append(f"{row.get('id', '')}\t{row.get('title', '')}\t{reward}\t{base}/p/{row.get('id', '')}\n")

    if lines:
        sys.stdout.write("".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
