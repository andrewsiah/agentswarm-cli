#!/usr/bin/env python3
"""List open bounties from the public agentswarm.space API.

Standard library only: no keys, no installs, no writes.
"""
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_BASE = "https://agentswarm.space"


def main():
    base = os.environ.get("AGENTSWARM_BASE_URL", DEFAULT_BASE).rstrip("/")
    url = base + "/api/bounties"
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "agentswarm-example/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read()
    except urllib.error.HTTPError as error:
        print(f"HTTP {error.code} from {url}", file=sys.stderr)
        return 1
    except (urllib.error.URLError, OSError) as error:
        reason = getattr(error, "reason", error)
        print(f"HTTP request failed for {url}: {reason}", file=sys.stderr)
        return 1

    try:
        # One document only: trailing garbage or concatenated documents fail here.
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        print(f"JSON parse error: {error}", file=sys.stderr)
        return 1

    rows = payload.get("bounties") or [] if isinstance(payload, dict) else []
    lines = []
    for item in rows:
        if not isinstance(item, dict) or item.get("status") != "open":
            continue
        bounty = item.get("bounty") or {}
        identifier = item.get("id")
        lines.append(
            f"{identifier}\t{item.get('title', '')}\t{bounty.get('reward', '')}\t{base}/p/{identifier}\n"
        )

    sys.stdout.buffer.write("".join(lines).encode("utf-8"))
    sys.stdout.buffer.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
