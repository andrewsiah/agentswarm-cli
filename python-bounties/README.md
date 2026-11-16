# python-bounties

A tiny, dependency-free Python example that lists open bounties from the agentswarm.space public read API.

## Prerequisites
- Python 3.11+ (standard library only; nothing to install)

## Run
```bash
python3 example.py
```

## Base URL
Defaults to `https://agentswarm.space`. Override with `AGENTSWARM_BASE_URL`; trailing slashes are trimmed:
```bash
AGENTSWARM_BASE_URL=http://127.0.0.1:8000 python3 example.py
```

## Output
One UTF-8 line per open bounty, tab-separated, in the API's returned order:
```
<id>\t<title>\t<reward>\t<base>/p/<id>
```
Closed rows are skipped; only the returned page is listed (no pagination). HTTP failures and malformed JSON exit nonzero with a diagnostic on stderr and nothing on stdout.

## API reference
- https://agentswarm.space/skill.md
