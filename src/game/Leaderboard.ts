const STORAGE_KEY = 'leaderboard';
const MAX_ENTRIES = 10;

export interface LeaderboardEntry {
  name: string;
  score: number;
  survivalTime: number; // seconds survived
  date: string;
  /** @deprecated kept for backward compat with old localStorage entries */
  wave?: number;
}

export class Leaderboard {
  getEntries(): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const entries: LeaderboardEntry[] = JSON.parse(raw);
      return entries.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
    } catch {
      return [];
    }
  }

  addEntry(name: string, score: number, survivalTime: number): void {
    const entries = this.getEntries();
    entries.push({
      name,
      score,
      survivalTime,
      date: new Date().toISOString(),
    });
    const sorted = entries.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
    this.save(sorted);
  }

  removeEntry(index: number): void {
    const entries = this.getEntries();
    if (index >= 0 && index < entries.length) {
      entries.splice(index, 1);
      this.save(entries);
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  private save(entries: LeaderboardEntry[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}
