import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});
const KEY = 'leaderboard';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (req.method === 'GET') {
      const entries = (await redis.get(KEY)) ?? [];
      return res.status(200).json(entries);
    }

    if (req.method === 'POST') {
      const entries = req.body;
      await redis.set(KEY, JSON.stringify(entries));
      return res.status(200).json(entries);
    }

    if (req.method === 'DELETE') {
      await redis.set(KEY, JSON.stringify([]));
      return res.status(200).json([]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
