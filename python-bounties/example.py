#!/usr/bin/env python3
"""List open bounties from the agentswarm.space public read API.

Prints one UTF-8 line per open bounty, tab-separated, in returned order:

    <id>\t<title>\t<reward>\t<base>/p/<id>

Base URL: $AGENTSWARM_BASE_URL (default https://agentswarm.space).
No API key, no writes, no pagination.
"""
import json
import os
import sys
import urllib.error
import urllib.request


def _fail(msg):
    sys.stderr.write(msg + "\n")
    return 1


def main():
    base = os.environ.get("AGENTSWARM_BASE_URL", "https://agentswarm.space").rstrip("/")
    url = base + "/api/bounties"
    try:
        with urllib.request.urlopen(url) as resp:
            body = resp.read()
    except urllib.error.HTTPError as exc:
        return _fail("HTTP %s fetching %s" % (exc.code, url))
    except Exception as exc:  # connection refused, timeout, DNS, ...
        return _fail("HTTP request failed for %s: %s" % (url, exc))

    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, ValueError) as exc:
        return _fail("invalid JSON from %s: %s" % (url, exc))

    rows = payload.get("bounties") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        return _fail("malformed JSON from %s: missing 'bounties' array" % url)

    lines = []
    for row in rows:
        if not isinstance(row, dict) or row.get("status") != "open":
            continue
        rid = row.get("id", "")
        title = row.get("title", "")
        bounty = row.get("bounty")
        reward = bounty.get("reward", "") if isinstance(bounty, dict) else ""
        lines.append("%s\t%s\t%s\t%s/p/%s" % (rid, title, reward, base, rid))

    if lines:
        sys.stdout.buffer.write(("\n".join(lines) + "\n").encode("utf-8"))
        sys.stdout.buffer.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
