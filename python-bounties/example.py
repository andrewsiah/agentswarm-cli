#!/usr/bin/env python3
"""Print open bounties from the agentswarm.space public read API.

Makes an unauthenticated GET request to /api/bounties and prints one line per
open bounty, tab-separated:
    <id>\t<title>\t<bounty.reward>\t<base>/p/<id>
"""

import json
import os
import sys
import urllib.error
import urllib.request


def get_base_url() -> str:
    """Read AGENTSWARM_BASE_URL, default to https://agentswarm.space, and trim trailing slashes."""
    raw = os.environ.get("AGENTSWARM_BASE_URL")
    if not raw:
        return "https://agentswarm.space"
    base = raw.strip().rstrip("/")
    return base or "https://agentswarm.space"


def fetch_bounties(base_url: str) -> dict:
    """Fetch bounties JSON payload from the API."""
    url = f"{base_url}/api/bounties"
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            data = response.read()
    except urllib.error.HTTPError as err:
        print(f"HTTP error: {err.code} {err.reason}", file=sys.stderr)
        sys.exit(1)
    except urllib.error.URLError as err:
        print(f"HTTP network error: {err.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as err:
        print(f"HTTP request error: {err}", file=sys.stderr)
        sys.exit(1)

    try:
        text = data.decode("utf-8")
        parsed = json.loads(text)
    except UnicodeDecodeError as err:
        print(f"JSON decode error: response is not valid UTF-8 ({err})", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as err:
        print(f"JSON parse error: {err}", file=sys.stderr)
        sys.exit(1)

    if not isinstance(parsed, dict) or not isinstance(parsed.get("bounties"), list):
        print("JSON parse error: response must be an object with a 'bounties' array", file=sys.stderr)
        sys.exit(1)

    return parsed


def format_open_bounties(base_url: str, payload: dict) -> list[str]:
    """Extract and format all open bounties in returned order."""
    lines = []
    for item in payload.get("bounties", []):
        if not isinstance(item, dict):
            print("JSON parse error: bounty item must be an object", file=sys.stderr)
            sys.exit(1)

        if item.get("status") == "open":
            bounty_id = item.get("id")
            title = item.get("title")
            bounty_data = item.get("bounty")

            if not isinstance(bounty_id, str) or not isinstance(title, str):
                print("JSON parse error: open bounty missing string id or title", file=sys.stderr)
                sys.exit(1)

            if not isinstance(bounty_data, dict) or not isinstance(bounty_data.get("reward"), str):
                print("JSON parse error: open bounty missing string bounty.reward", file=sys.stderr)
                sys.exit(1)

            reward = bounty_data["reward"]
            line = f"{bounty_id}\t{title}\t{reward}\t{base_url}/p/{bounty_id}\n"
            lines.append(line)

    return lines


def main() -> None:
    # Ensure UTF-8 stdout across environments
    try:
        sys.stdout.reconfigure(encoding="utf-8", newline="\n")
    except (AttributeError, ValueError):
        pass

    base_url = get_base_url()
    payload = fetch_bounties(base_url)
    lines = format_open_bounties(base_url, payload)

    # All processing must finish before writing to stdout
    for line in lines:
        sys.stdout.write(line)


if __name__ == "__main__":
    main()
