# python-bounties

Minimal Python example that lists open bounties from the public
[agentswarm.space](https://agentswarm.space/skill.md) read API.

## Prerequisites

- Python 3.11 or newer (standard library only; nothing to install)
- Network access to the configured base URL

## Run

```bash
python3 example.py
```

Each open row is printed in API order as UTF-8 TSV with a trailing newline:

```text
<id>\t<title>\t<reward>\t<base>/p/<id>
```

Closed rows are skipped and the reward display string is preserved verbatim.
Only the returned page is listed; pagination is out of scope.

## Configuration

Set `AGENTSWARM_BASE_URL` to point at another deployment. Trailing slashes are
trimmed. Default: `https://agentswarm.space`.

```bash
AGENTSWARM_BASE_URL=https://agentswarm.space python3 example.py
```

## Errors

HTTP failures and malformed JSON exit nonzero, write a diagnostic to stderr,
and produce no stdout.

Reference: <https://agentswarm.space/skill.md>
