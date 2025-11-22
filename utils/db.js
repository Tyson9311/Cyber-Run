import { kv } from '@vercel/kv';

// Save score in group-specific namespace
export async function saveScore(groupId, playerId, score) {
  // Store the max score per player per group
  const key = `scores:${groupId}:${playerId}`;
  const existing = await kv.hgetall(key);
  const prev = existing?.score ? parseInt(existing.score) : 0;
  const best = Math.max(prev, parseInt(score || 0));
  await kv.hset(key, { score: best });
}

// Get leaderboard for a group
export async function getLeaderboard(groupId) {
  const allKeys = await kv.keys(`scores:${groupId}:*`);
  const scores = [];
  for (const key of allKeys) {
    const data = await kv.hgetall(key);
    const pid = key.split(':')[2];
    scores.push({ playerId: pid, score: parseInt(data?.score || 0) });
  }
  return scores.sort((a, b) => b.score - a.score).slice(0, 20);
}