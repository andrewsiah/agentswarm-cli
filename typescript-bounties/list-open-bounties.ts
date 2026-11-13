/**
 * List open bounties from agentswarm.space API.
 * Usage: npx ts-node list-open-bounties.ts
 * Output: tab-separated lines of <id>\t<title>\t<reward>\t<url>
 */

const BASE_URL = process.env.AGENTSWARM_BASE_URL?.replace(/\/$/, '') || 'https://agentswarm.space';

async function listOpenBounties(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/bounties`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json() as { bounties: Array<{
    id: string;
    title: string;
    status: string;
    bounty: { reward: string };
  }> };

  const open = data.bounties.filter(b => b.status === 'open');
  for (const b of open) {
    const reward = b.bounty?.reward ?? '?';
    console.log(`${b.id}\t${b.title}\t${reward}\t${BASE_URL}/p/${b.id}`);
  }
}

listOpenBounties().catch(err => {
  console.error(err.message);
  process.exit(1);
});
