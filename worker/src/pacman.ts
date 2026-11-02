export type ScoreRow = { player_name: string; score: number; is_win: number; played_at: string };
export type NewScore = { player_name: string; score: number; is_win: boolean };

const COLUMNS = "player_name, score, is_win, played_at";
const MAX_SCORE = 2_147_483_647;

export async function globalLeaderboard(db: D1Database): Promise<ScoreRow[]> {
  const { results } = await db
    .prepare(
      `SELECT ${COLUMNS} FROM (
         SELECT ${COLUMNS},
           ROW_NUMBER() OVER (PARTITION BY player_name ORDER BY score DESC, played_at DESC) AS rn
         FROM pacman_scores
       ) WHERE rn = 1
       ORDER BY score DESC, played_at DESC
       LIMIT 100`,
    )
    .all<ScoreRow>();
  return results;
}

export async function playerScores(db: D1Database, name: string): Promise<ScoreRow[]> {
  const { results } = await db
    .prepare(`SELECT ${COLUMNS} FROM pacman_scores WHERE player_name = ? ORDER BY score DESC`)
    .bind(name)
    .all<ScoreRow>();
  return results;
}

export function validateScore(input: unknown): { ok: true; value: NewScore } | { ok: false; errors: string[] } {
  const o = (input ?? {}) as Record<string, unknown>;
  const errors: string[] = [];
  const name = typeof o.player_name === "string" ? o.player_name.trim() : "";
  if (name === "") errors.push("Player name can't be blank");
  else if (name.length > 50) errors.push("Player name is too long (maximum is 50 characters)");

  const score = typeof o.score === "string" && o.score.trim() !== "" ? Number(o.score) : o.score;
  if (score === undefined || score === null || score === "") errors.push("Score can't be blank");
  else if (typeof score !== "number" || !Number.isFinite(score)) errors.push("Score is not a number");
  else if (score < 0) errors.push("Score must be greater than or equal to 0");
  else if (score > MAX_SCORE) errors.push(`Score must be less than or equal to ${MAX_SCORE}`);

  const isWin = o.is_win === "true" ? true : o.is_win === "false" ? false : o.is_win;
  if (typeof isWin !== "boolean") errors.push("Is win is not included in the list");

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { player_name: name, score: Math.trunc(score as number), is_win: isWin as boolean } };
}

export async function insertScore(db: D1Database, v: NewScore, now: Date): Promise<ScoreRow> {
  const row = await db
    .prepare(`INSERT INTO pacman_scores (${COLUMNS}) VALUES (?, ?, ?, ?) RETURNING ${COLUMNS}`)
    .bind(v.player_name, v.score, v.is_win ? 1 : 0, now.toISOString())
    .first<ScoreRow>();
  if (!row) throw new Error("insert returned no row");
  return row;
}

/** Called after the insert, like Rails, so a score that just entered the top 100 counts. */
export async function isGlobalHighScore(db: D1Database, score: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT score FROM pacman_scores ORDER BY score DESC LIMIT 1 OFFSET 99")
    .first<{ score: number }>();
  return row === null || score >= row.score;
}

export const toJson = (row: ScoreRow) => ({
  player_name: row.player_name,
  score: row.score,
  is_win: row.is_win === 1,
  played_at: row.played_at,
});
