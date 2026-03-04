import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});
const KEY = 'leaderboard';

interface Entry {
  name: string;
  score: number;
  survivalTime: number;
  date: string;
}

async function getEntries(): Promise<Entry[]> {
  return ((await redis.get(KEY)) as Entry[] | null) ?? [];
}

async function saveEntries(entries: Entry[]): Promise<void> {
  await redis.set(KEY, JSON.stringify(entries));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await getEntries());
    }

    // POST — upsert a single entry, keeping best score/time per player
    if (req.method === 'POST') {
      const { name, score, survivalTime } = req.body as Entry;
      if (!name || score == null || survivalTime == null) {
        return res.status(400).json({ error: 'name, score, survivalTime required' });
      }

      const entries = await getEntries();
      const key = name.toLowerCase();
      const existing = entries.find((e) => e.name.toLowerCase() === key);

      if (existing) {
        if (score > existing.score || survivalTime > existing.survivalTime) {
          existing.score = Math.max(existing.score, score);
          existing.survivalTime = Math.max(existing.survivalTime, survivalTime);
          existing.date = new Date().toISOString();
        } else {
          return res.status(200).json(entries);
        }
      } else {
        entries.push({ name, score, survivalTime, date: new Date().toISOString() });
      }

      entries.sort((a, b) => b.score - a.score);
      await saveEntries(entries);
      return res.status(200).json(entries);
    }

    if (req.method === 'DELETE') {
      await saveEntries([]);
      return res.status(200).json([]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
