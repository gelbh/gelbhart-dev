// Usage: node scripts/seed-pacman.mjs seed/pacman_scores.json > seed/pacman_scores.sql
import { readFileSync } from "node:fs";

const rows = JSON.parse(readFileSync(process.argv[2], "utf8"));
const q = (s) => `'${String(s).replaceAll("'", "''")}'`;
for (const r of rows) {
  const playedAt = new Date(r.played_at).toISOString();
  console.log(
    `INSERT INTO pacman_scores (player_name, score, is_win, played_at) VALUES (${q(r.player_name)}, ${Number(r.score)}, ${r.is_win ? 1 : 0}, ${q(playedAt)});`,
  );
}
