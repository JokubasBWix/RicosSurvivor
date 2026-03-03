import { defineConfig, Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const LEADERBOARD_FILE = path.resolve(__dirname, 'leaderboard.json');

/** Vite plugin that serves a tiny JSON-file–backed leaderboard API. */
function leaderboardApi(): Plugin {
  return {
    name: 'leaderboard-api',
    configureServer(server) {
      server.middlewares.use('/api/leaderboard', (req, res) => {
        res.setHeader('Content-Type', 'application/json');

        // --- GET: return current entries ---
        if (req.method === 'GET') {
          try {
            const data = fs.existsSync(LEADERBOARD_FILE)
              ? fs.readFileSync(LEADERBOARD_FILE, 'utf-8')
              : '[]';
            res.end(data);
          } catch {
            res.end('[]');
          }
          return;
        }

        // --- POST / PUT / DELETE: read body then act ---
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            if (req.method === 'DELETE') {
              fs.writeFileSync(LEADERBOARD_FILE, '[]', 'utf-8');
              res.end('[]');
              return;
            }

            // POST – replace entire leaderboard with the payload
            if (req.method === 'POST') {
              const entries = JSON.parse(body);
              const json = JSON.stringify(entries, null, 2);
              fs.writeFileSync(LEADERBOARD_FILE, json, 'utf-8');
              res.end(json);
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
});
