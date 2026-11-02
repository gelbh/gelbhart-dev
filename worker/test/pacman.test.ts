import { describe, expect, it } from "vitest";
import { createTestDb } from "./d1";
import {
  globalLeaderboard, insertScore, isGlobalHighScore, playerScores, toJson, validateScore,
} from "../src/pacman";

const at = (iso: string) => new Date(iso);

describe("globalLeaderboard", () => {
  it("returns each player once with their best score, highest first", async () => {
    const db = createTestDb();
    await insertScore(db, { player_name: "tom", score: 100, is_win: false }, at("2026-01-01T00:00:00Z"));
    await insertScore(db, { player_name: "tom", score: 500, is_win: true }, at("2026-01-02T00:00:00Z"));
    await insertScore(db, { player_name: "ada", score: 300, is_win: false }, at("2026-01-03T00:00:00Z"));
    const rows = (await globalLeaderboard(db)).map(toJson);
    expect(rows).toEqual([
      { player_name: "tom", score: 500, is_win: true, played_at: "2026-01-02T00:00:00.000Z" },
      { player_name: "ada", score: 300, is_win: false, played_at: "2026-01-03T00:00:00.000Z" },
    ]);
  });
});

describe("playerScores", () => {
  it("returns all of one player's scores, highest first", async () => {
    const db = createTestDb();
    await insertScore(db, { player_name: "tom", score: 100, is_win: false }, at("2026-01-01T00:00:00Z"));
    await insertScore(db, { player_name: "tom", score: 500, is_win: true }, at("2026-01-02T00:00:00Z"));
    expect((await playerScores(db, "tom")).map((r) => r.score)).toEqual([500, 100]);
  });
});

describe("validateScore", () => {
  it("accepts a valid score", () => {
    expect(validateScore({ player_name: "tom", score: 10, is_win: false }))
      .toEqual({ ok: true, value: { player_name: "tom", score: 10, is_win: false } });
  });

  it.each([
    [{ player_name: "a".repeat(51), score: 1, is_win: false }, "Player name is too long (maximum is 50 characters)"],
    [{ player_name: "", score: 1, is_win: false }, "Player name can't be blank"],
    [{ player_name: "tom", score: -1, is_win: false }, "Score must be greater than or equal to 0"],
    [{ player_name: "tom", score: 2 ** 31, is_win: false }, "Score must be less than or equal to 2147483647"],
    [{ player_name: "tom", score: "abc", is_win: false }, "Score is not a number"],
    [{ player_name: "tom", score: 1 }, "Is win is not included in the list"],
  ])("rejects %j", (input, message) => {
    const result = validateScore(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toContain(message);
  });
});

describe("isGlobalHighScore", () => {
  it("is true while fewer than 100 scores exist", async () => {
    const db = createTestDb();
    expect(await isGlobalHighScore(db, 0)).toBe(true);
  });

  it("compares against the 100th highest score", async () => {
    const db = createTestDb();
    for (let i = 1; i <= 100; i++) {
      await insertScore(db, { player_name: `p${i}`, score: i * 10, is_win: false }, at("2026-01-01T00:00:00Z"));
    }
    expect(await isGlobalHighScore(db, 10)).toBe(true);
    expect(await isGlobalHighScore(db, 9)).toBe(false);
  });
});
