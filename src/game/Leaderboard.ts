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

  /** Load entries from the server-side JSON file. Call once at startup. */
  async init(): Promise<void> {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const entries: LeaderboardEntry[] = await res.json();
        this.cache = Leaderboard.dedup(entries);
      }
    } catch {
      // If the API is unreachable (e.g. static hosting), cache stays empty.
    }
  }

  getEntries(): LeaderboardEntry[] {
    return this.cache;
  }

  async addEntry(name: string, score: number, survivalTime: number): Promise<void> {
    const existing = this.cache.find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
      // Only update if the player beat their previous score or survival time
      if (score > existing.score || survivalTime > existing.survivalTime) {
        existing.score = Math.max(existing.score, score);
        existing.survivalTime = Math.max(existing.survivalTime, survivalTime);
        existing.date = new Date().toISOString();
      } else {
        return; // nothing to update
      }
    } else {
      this.cache.push({
        name,
        score,
        survivalTime,
        date: new Date().toISOString(),
      });
    }

    this.cache.sort((a, b) => b.score - a.score);
    await this.persist();
  }

  async removeEntry(index: number): Promise<void> {
    if (index >= 0 && index < this.cache.length) {
      this.cache.splice(index, 1);
      await this.persist();
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

  /**
   * Keep only one entry per name (case-insensitive), preserving the best
   * score and the best survival time across duplicates.
   */
  private static dedup(entries: LeaderboardEntry[]): LeaderboardEntry[] {
    const map = new Map<string, LeaderboardEntry>();
    for (const e of entries) {
      const key = e.name.toLowerCase();
      const prev = map.get(key);
      if (prev) {
        if (e.score > prev.score || e.survivalTime > prev.survivalTime) {
          prev.score = Math.max(prev.score, e.score);
          prev.survivalTime = Math.max(prev.survivalTime, e.survivalTime);
          prev.date = e.date > prev.date ? e.date : prev.date;
        }
      } else {
        map.set(key, { ...e });
      }
    }
    return [...map.values()].sort((a, b) => b.score - a.score);
  }

  /** Write the current cache to the server-side JSON file. */
  private async persist(): Promise<void> {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.cache),
      });
    } catch {
      // silent – cache is still up-to-date in memory
    }
  }
}
