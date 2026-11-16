import { TextDecoder } from 'node:util';

const base = (process.env.AGENTSWARM_BASE_URL ?? 'https://agentswarm.space').replace(/\/+$/, '');
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

async function main(): Promise<void> {
  let bytes: ArrayBuffer;
  try {
    const response = await fetch(`${base}/api/bounties`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`status ${response.status}`);
    bytes = await response.arrayBuffer();
  } catch (error) {
    throw new Error(`HTTP: ${error instanceof Error ? error.message : String(error)}`);
  }

  let lines: string[];
  try {
    const data: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (!isRecord(data) || !Array.isArray(data.bounties)) {
      throw new Error('expected a bounties array');
    }
    lines = data.bounties.flatMap((row: unknown): string[] => {
      if (!isRecord(row) || typeof row.status !== 'string') {
        throw new Error('expected a bounty row with a status');
      }
      if (row.status !== 'open') return [];
      if (typeof row.id !== 'string' || typeof row.title !== 'string' ||
          !isRecord(row.bounty) || typeof row.bounty.reward !== 'string') {
        throw new Error('expected id, title and bounty.reward strings');
      }
      return [`${row.id}\t${row.title}\t${row.bounty.reward}\t${base}/p/${row.id}\n`];
    });
  } catch (error) {
    throw new Error(`JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  process.stdout.write(lines.join(''));
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
