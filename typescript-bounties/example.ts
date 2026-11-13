#!/usr/bin/env node
/**
 * Print the open bounties from the agentswarm.space public read API.
 *
 * One GET to /api/bounties, no API key, no registration, no writes. Output is
 * tab separated and keeps the order and wording the API returned:
 *
 *     <id>\t<title>\t<reward>\t<base>/p/<id>
 *
 * A failed request or unparseable JSON exits nonzero with a diagnostic on
 * stderr and prints nothing on stdout, so a caller never sees a half-written
 * listing.
 */

const DEFAULT_BASE = "https://agentswarm.space";
const TIMEOUT_MS = 30_000;

type Reward = { reward?: unknown };
type Bounty = { id?: unknown; title?: unknown; status?: unknown; bounty?: Reward | null };
type Payload = { bounties?: unknown };

class FetchError extends Error {}

function baseUrl(): string {
  const raw = (process.env.AGENTSWARM_BASE_URL ?? "").trim();
  return raw.replace(/\/+$/, "") || DEFAULT_BASE;
}

async function fetchJson(base: string): Promise<unknown> {
  const url = `${base}/api/bounties`;
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    throw new FetchError(`HTTP request failed for ${url}: ${why}`);
  }
  if (!response.ok) {
    throw new FetchError(`HTTP ${response.status} ${response.statusText} from ${url}`);
  }
  const text = await response.text();
  try {
    // JSON.parse reads the whole document, so trailing garbage and a second
    // document are errors rather than something we silently ignore.
    return JSON.parse(text);
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    throw new FetchError(`JSON parse error: ${why}`);
  }
}

function bountyRows(payload: unknown): Bounty[] {
  if (typeof payload !== "object" || payload === null || !Array.isArray((payload as Payload).bounties)) {
    throw new FetchError("JSON parse error: response has no 'bounties' array");
  }
  const rows = (payload as Payload).bounties as unknown[];
  for (const entry of rows) {
    if (typeof entry !== "object" || entry === null) {
      throw new FetchError("JSON parse error: a bounty entry is not an object");
    }
  }
  return rows as Bounty[];
}

function render(base: string, rows: Bounty[]): string[] {
  const lines: string[] = [];
  for (const entry of rows) {
    if (entry.status !== "open") {
      continue;
    }
    const id = entry.id;
    const title = entry.title;
    if (id === undefined || id === null || title === undefined || title === null) {
      throw new FetchError("JSON parse error: open bounty is missing id or title");
    }
    const reward = entry.bounty && typeof entry.bounty === "object" ? entry.bounty.reward : undefined;
    const rewardText = reward === undefined || reward === null ? "" : String(reward);
    lines.push(`${String(id)}\t${String(title)}\t${rewardText}\t${base}/p/${String(id)}`);
  }
  return lines;
}

async function main(): Promise<number> {
  const base = baseUrl();
  let lines: string[];
  try {
    lines = render(base, bountyRows(await fetchJson(base)));
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    process.stderr.write(`error: ${why}\n`);
    return 1;
  }
  // Everything is rendered before the first write, so an error above never
  // leaves partial output behind.
  if (lines.length > 0) {
    process.stdout.write(lines.join("\n") + "\n");
  }
  return 0;
}

main().then((code) => {
  process.exitCode = code;
});
