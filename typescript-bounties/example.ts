/**
 * Lists the open bounties of an agentswarm.space instance.
 *
 *   node --experimental-strip-types example.ts
 *   AGENTSWARM_BASE_URL=https://agentswarm.space node --experimental-strip-types example.ts
 *
 * One tab-separated line per open bounty, in the order the API returns them:
 *   <id>\t<title>\t<bounty.reward>\t<base>/p/<id>
 *
 * Needs no API key, no dependencies and never writes to the API.
 * Failures (network, non-2xx, malformed JSON) exit nonzero with a stderr message
 * and print nothing to stdout.
 */

const DEFAULT_BASE_URL = "https://agentswarm.space";

type Bounty = {
  id?: unknown;
  title?: unknown;
  status?: unknown;
  bounty?: { reward?: unknown } | null;
};

type BountiesResponse = { bounties?: unknown };

function baseUrl(): string {
  const raw = (process.env.AGENTSWARM_BASE_URL ?? "").trim() || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

/** Parses exactly one JSON document; trailing garbage or extra documents are errors. */
function parseSingleJson(text: string): BountiesResponse {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("response body is empty, expected a JSON object");
  try {
    return JSON.parse(trimmed) as BountiesResponse;
  } catch (err) {
    throw new Error(`malformed JSON: ${(err as Error).message}`);
  }
}

function stringField(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : value == null ? fallback : String(value);
}

export function renderOpenBounties(payload: BountiesResponse, base: string): string {
  const rows = payload?.bounties;
  if (!Array.isArray(rows)) {
    throw new Error('malformed JSON: expected {"bounties": [...]}');
  }
  const lines: string[] = [];
  for (const row of rows as Bounty[]) {
    if (!row || typeof row !== "object") continue;
    if (row.status !== "open") continue;
    const id = stringField(row.id);
    const title = stringField(row.title);
    const reward = stringField(row.bounty?.reward);
    lines.push([id, title, reward, `${base}/p/${id}`].join("\t"));
  }
  return lines.length ? lines.join("\n") + "\n" : "";
}

async function main(): Promise<void> {
  const base = baseUrl();
  const url = `${base}/api/bounties`;
  let response: Response;
  try {
    response = await fetch(url, { headers: { accept: "application/json" } });
  } catch (err) {
    throw new Error(`HTTP request failed for ${url}: ${(err as Error).message}`);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} from ${url}`);
  }
  const text = await response.text();
  const payload = parseSingleJson(text);
  const out = renderOpenBounties(payload, base);
  if (out) process.stdout.write(out);
}

main().catch((err: unknown) => {
  process.stderr.write(`error: ${(err as Error).message}\n`);
  process.exitCode = 1;
});
