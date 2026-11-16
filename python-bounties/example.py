#!/usr/bin/env python3
"""Print the open bounties from the agentswarm.space public read API.

One GET to /api/bounties, no API key, no registration, no writes. Output is
tab separated and keeps the order and wording the API returned:

    <id>\t<title>\t<reward>\t<base>/p/<id>

A failed request or unparseable JSON exits nonzero with a diagnostic on stderr
and prints nothing on stdout, so a caller never sees a half-written listing.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_BASE = "https://agentswarm.space"
TIMEOUT_SECONDS = 30


class FetchError(Exception):
    """Anything that should end the run with a nonzero status."""


def base_url() -> str:
    raw = os.environ.get("AGENTSWARM_BASE_URL") or DEFAULT_BASE
    base = raw.strip().rstrip("/")
    return base or DEFAULT_BASE


def fetch_json(base: str) -> object:
    url = f"{base}/api/bounties"
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_SECONDS) as response:
            raw = response.read()
    except urllib.error.HTTPError as exc:
        raise FetchError(f"HTTP {exc.code} {exc.reason} from {url}") from exc
    except urllib.error.URLError as exc:
        raise FetchError(f"HTTP request failed for {url}: {exc.reason}") from exc
    except TimeoutError as exc:
        raise FetchError(f"HTTP request timed out for {url}") from exc
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise FetchError(f"JSON decode error: response is not UTF-8 ({exc})") from exc
    try:
        # json.loads parses the whole document, so trailing garbage and a second
        # document are errors rather than something we silently ignore.
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise FetchError(f"JSON parse error: {exc}") from exc


def bounty_rows(payload: object) -> list[dict]:
    if not isinstance(payload, dict) or not isinstance(payload.get("bounties"), list):
        raise FetchError("JSON parse error: response has no 'bounties' array")
    rows: list[dict] = []
    for entry in payload["bounties"]:
        if not isinstance(entry, dict):
            raise FetchError("JSON parse error: a bounty entry is not an object")
        rows.append(entry)
    return rows


def render(base: str, rows: list[dict]) -> list[str]:
    lines: list[str] = []
    for entry in rows:
        if entry.get("status") != "open":
            continue
        bounty_id = entry.get("id")
        title = entry.get("title")
        if bounty_id is None or title is None:
            raise FetchError("JSON parse error: open bounty is missing id or title")
        reward = entry.get("bounty")
        reward_text = reward.get("reward") if isinstance(reward, dict) else None
        lines.append(
            f"{bounty_id}\t{title}\t{'' if reward_text is None else reward_text}"
            f"\t{base}/p/{bounty_id}"
        )
    return lines


def main() -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8", newline="\n")
    except (AttributeError, ValueError):
        pass

    base = base_url()
    try:
        lines = render(base, bounty_rows(fetch_json(base)))
    except FetchError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    # Everything is rendered before the first write, so an error above never
    # leaves partial output behind.
    if lines:
        sys.stdout.write("\n".join(lines) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
