/**
 * List the open bounties on the current page of the agentswarm.space API.
 *
 * Run it with Node's built-in type stripping (no build step, no dependencies):
 *
 *   node --experimental-strip-types example.ts
 *
 * Environment:
 *   AGENTSWARM_BASE_URL  API origin, default https://agentswarm.space.
 *                        Trailing slashes are stripped; a path prefix
 *                        (e.g. https://host/gw) is kept.
 *
 * Output: one line per open bounty, in API order, columns separated by a real
 * tab character and every line ending in "\n":
 *
 *   <id>\t<title>\t<bounty.reward>\t<base>/p/<id>
 *
 * Nothing is written to stdout unless the whole page is valid, so a failed run
 * prints diagnostics on stderr only and exits non-zero.
 */

const DEFAULT_BASE_URL = 'https://agentswarm.space';
const BOUNTIES_PATH = '/api/bounties';

/** A fatal, expected error: reported on stderr and turned into exit code 1. */
class CliError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliError';
  }
}

/** The base URL to talk to: the env var when set, else the public origin. */
function resolveBaseUrl(): string {
  const raw = process.env.AGENTSWARM_BASE_URL;
  const configured = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : DEFAULT_BASE_URL;
  // Strip every trailing slash but keep any path prefix: "http://h:1/gw///" -> "http://h:1/gw".
  return configured.replace(/\/+$/, '');
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CliError(`malformed JSON: ${field} must be a JSON object`);
  }
  return value as Record<string, unknown>;
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new CliError(`malformed JSON: ${field} is missing or is not a string on an open bounty`);
  }
  return value;
}

function requireReward(bounty: unknown, field: string): string {
  if (typeof bounty !== 'object' || bounty === null || Array.isArray(bounty)) {
    throw new CliError(`malformed JSON: ${field} is missing: the open bounty has no "bounty" object`);
  }
  const reward = (bounty as Record<string, unknown>).reward;
  if (typeof reward === 'string') return reward;
  // A JSON number is printed as its JSON text; no conversion, no unit added.
  if (typeof reward === 'number' && Number.isFinite(reward)) return String(reward);
  throw new CliError(`malformed JSON: ${field} is missing or is not a string or number`);
}

/** One unauthenticated GET of the first page of bounties, parsed as JSON. */
async function fetchBounties(base: string): Promise<unknown> {
  const url = `${base}${BOUNTIES_PATH}`;
  let response: Response;
  try {
    response = await fetch(url, { headers: { accept: 'application/json' } });
  } catch (error) {
    throw new CliError(`network error: GET ${url} failed: ${describe(error)}`);
  }

  if (!response.ok) {
    throw new CliError(`HTTP ${response.status} ${response.statusText} for GET ${url}`);
  }

  let text: string;
  try {
    text = await response.text();
  } catch (error) {
    throw new CliError(`could not read the response body from ${url}: ${describe(error)}`);
  }
  if (text.trim() === '') {
    throw new CliError(`empty response body from ${url}: expected a JSON document`);
  }

  try {
    // JSON.parse rejects trailing garbage and multiple documents on its own.
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new CliError(
      `malformed JSON from ${url}: ${describe(error)}; body starts with ${JSON.stringify(text.slice(0, 80))}`,
    );
  }
}

/** Render the whole page in memory; throws before anything reaches stdout. */
function renderPage(payload: unknown, base: string): string {
  const page = asObject(payload, 'the response body');
  const rows = page.bounties;
  if (!Array.isArray(rows)) {
    throw new CliError('malformed JSON: "bounties" must be an array');
  }

  const lines: string[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = asObject(rows[index], `bounties[${index}]`);
    // Anything that is not open is skipped without inspecting it further; a
    // closed row is allowed to have no "bounty" at all.
    if (row.status !== 'open') continue;

    const id = requireText(row.id, `bounties[${index}].id`);
    const title = requireText(row.title, `bounties[${index}].title`);
    const reward = requireReward(row.bounty, `bounties[${index}].bounty.reward`);
    lines.push(`${id}\t${title}\t${reward}\t${base}/p/${id}`);
  }

  return lines.length === 0 ? '' : `${lines.join('\n')}\n`;
}

async function main(): Promise<void> {
  const base = resolveBaseUrl();
  const payload = await fetchBounties(base);
  const output = renderPage(payload, base);
  if (output !== '') process.stdout.write(output);
}

main().catch((error: unknown) => {
  process.stderr.write(`error: ${describe(error)}\n`);
  process.exitCode = 1;
});
