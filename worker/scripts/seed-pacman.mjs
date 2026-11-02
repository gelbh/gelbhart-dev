// Usage: node scripts/seed-pacman.mjs seed/pacman_scores.json > seed/pacman_scores.sql
import { readFileSync } from "node:fs";

const q = (s) => `'${String(s).replaceAll("'", "''")}'`;

// Postgres `timestamp` columns hold UTC with no offset; Date would read that as local time.
const utc = (value) => {
  const s = String(value).replace(" ", "T");
  const d = new Date(/(Z|[+-]\d\d:?\d\d)$/i.test(s) ? s : `${s}Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`bad played_at: ${value}`);
  return d.toISOString();
};

export function toSql(rows) {
  return rows.map((r) => {
    const name = typeof r.player_name === "string" ? r.player_name.trim() : "";
    if (name === "" || !Number.isFinite(r.score)) throw new Error(`bad row: ${JSON.stringify(r)}`);
    return `INSERT INTO pacman_scores (player_name, score, is_win, played_at) VALUES (${q(name)}, ${r.score}, ${r.is_win ? 1 : 0}, ${q(utc(r.played_at))});`;
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(toSql(JSON.parse(readFileSync(process.argv[2], "utf8"))).join("\n"));
}
