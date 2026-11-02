import { describe, expect, it } from "vitest";
import { createTestDb } from "./d1";
import { playerScores } from "../src/pacman";
import { toSql } from "../scripts/seed-pacman.mjs";

describe("seed-pacman", () => {
  it("reads offset-less timestamps as UTC and escapes quotes", async () => {
    const sql = toSql([
      { player_name: " O'Brien ", score: 7, is_win: true, played_at: "2025-07-04T12:34:56.123456" },
      { player_name: "O'Brien", score: 3, is_win: false, played_at: "2025-01-02T03:04:05+00:00" },
    ]);
    const db = createTestDb();
    for (const statement of sql) await db.prepare(statement).run();
    expect(await playerScores(db, "O'Brien")).toEqual([
      { player_name: "O'Brien", score: 7, is_win: true, played_at: "2025-07-04T12:34:56.123Z" },
      { player_name: "O'Brien", score: 3, is_win: false, played_at: "2025-01-02T03:04:05.000Z" },
    ]);
  });

  it.each([
    [{ player_name: null, score: 1, is_win: false, played_at: "2025-01-01T00:00:00" }],
    [{ player_name: "tom", score: null, is_win: false, played_at: "2025-01-01T00:00:00" }],
    [{ player_name: "tom", score: 1, is_win: false, played_at: "not a date" }],
  ])("throws on a bad row %j", (row) => {
    expect(() => toSql([row])).toThrow();
  });
});
