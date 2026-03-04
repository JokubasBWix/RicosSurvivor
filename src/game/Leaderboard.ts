const API_URL = '/api/leaderboard';

export interface LeaderboardEntry {
  name: string;
  score: number;
  survivalTime: number; // seconds survived
  date: string;
  /** @deprecated kept for backward compat with old localStorage entries */
  wave?: number;
}

export class Leaderboard {
  /** In-memory cache so getEntries() stays synchronous for the render loop. */
  private cache: LeaderboardEntry[] = [];

  /** Load entries from the server. Call once at startup. */
  async init(): Promise<void> {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        this.cache = await res.json();
      }
    } catch {
      // If the API is unreachable, cache stays empty.
    }
  }

  getEntries(): LeaderboardEntry[] {
    return this.cache;
  }

  /** Send a single entry to the server; it handles dedup/merge and returns the full list. */
  async addEntry(name: string, score: number, survivalTime: number): Promise<void> {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score, survivalTime }),
      });
      if (res.ok) {
        this.cache = await res.json();
      }
    } catch {
      // silent
    }
  }

  async removeEntry(index: number): Promise<void> {
    if (index >= 0 && index < this.cache.length) {
      this.cache.splice(index, 1);
    }
  }

  async clear(): Promise<void> {
    this.cache = [];
    try {
      await fetch(API_URL, { method: 'DELETE' });
    } catch {
      // silent
    }
  }
}
