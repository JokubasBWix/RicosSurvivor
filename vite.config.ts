import { defineConfig, Plugin } from 'vite';
import { resolve } from 'node:path';
import fs from 'node:fs';
import path from 'node:path';

const LEADERBOARD_FILE = path.resolve(__dirname, 'leaderboard.json');

function readEntries(): any[] {
  try {
    return fs.existsSync(LEADERBOARD_FILE)
      ? JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf-8'))
      : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: any[]): void {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

/** Vite plugin that serves a tiny JSON-file–backed leaderboard API. */
function leaderboardApi(): Plugin {
  return {
    name: 'leaderboard-api',
    configureServer(server) {
      server.middlewares.use('/api/leaderboard', (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          res.end(JSON.stringify(readEntries()));
          return;
        }

        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            if (req.method === 'DELETE') {
              writeEntries([]);
              res.end('[]');
              return;
            }

            if (req.method === 'POST') {
              const { name, score, survivalTime } = JSON.parse(body);
              const entries = readEntries();
              const key = name.toLowerCase();
              const existing = entries.find((e: any) => e.name.toLowerCase() === key);

              if (existing) {
                if (score > existing.score || survivalTime > existing.survivalTime) {
                  existing.score = Math.max(existing.score, score);
                  existing.survivalTime = Math.max(existing.survivalTime, survivalTime);
                  existing.date = new Date().toISOString();
                }
              } else {
                entries.push({ name, score, survivalTime, date: new Date().toISOString() });
              }

              entries.sort((a: any, b: any) => b.score - a.score);
              writeEntries(entries);
              res.end(JSON.stringify(entries));
              return;
            }

            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed' }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: String(err) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [leaderboardApi()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tutorial: resolve(__dirname, 'tutorial.html'),
      },
    },
  },
});
